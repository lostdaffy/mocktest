const OtpThrottle = require("../models/OtpThrottle");

const DAY_MS = 24 * 60 * 60 * 1000;

// Atomically claims one "send" for `key`, enforcing both a cooldown between
// sends and a rolling 24-hour cap.
//
// Atomic because at bulk traffic two requests for the same number can land
// in the same millisecond - a read-then-write check would let both through
// and send two paid SMS. Here the database only lets a send through if the
// document still satisfies the limits at the moment it's updated.
//
// Returns { ok: true } or { ok: false, reason: "cooldown" | "daily", retryAfterSec }.
async function claimSend(key, { cooldownSec, dailyMax }) {
  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - cooldownSec * 1000);
  const purgeAt = new Date(now.getTime() + DAY_MS + 60 * 60 * 1000);

  // Roll the 24h window over if it's expired.
  await OtpThrottle.updateOne(
    { key, windowStart: { $lte: new Date(now.getTime() - DAY_MS) } },
    { $set: { count: 0, windowStart: now } }
  );

  const claimed = await OtpThrottle.findOneAndUpdate(
    { key, lastSentAt: { $lte: cooldownCutoff }, count: { $lt: dailyMax } },
    { $inc: { count: 1 }, $set: { lastSentAt: now, purgeAt } },
    { new: true }
  );
  if (claimed) return { ok: true };

  const existing = await OtpThrottle.findOne({ key });
  if (!existing) {
    try {
      await OtpThrottle.create({ key, count: 1, windowStart: now, lastSentAt: now, purgeAt });
      return { ok: true };
    } catch (err) {
      // Another request created it between our findOne and create - treat
      // this one as the duplicate it is.
      if (err.code === 11000) return { ok: false, reason: "cooldown", retryAfterSec: cooldownSec };
      throw err;
    }
  }

  if (existing.count >= dailyMax) {
    const resetAt = existing.windowStart.getTime() + DAY_MS;
    return { ok: false, reason: "daily", retryAfterSec: Math.max(60, Math.ceil((resetAt - now.getTime()) / 1000)) };
  }
  const readyAt = existing.lastSentAt.getTime() + cooldownSec * 1000;
  return { ok: false, reason: "cooldown", retryAfterSec: Math.max(1, Math.ceil((readyAt - now.getTime()) / 1000)) };
}

// Gives a send back when delivery itself failed (provider down, bad config),
// so a user isn't locked out of retrying by an error that wasn't theirs.
async function releaseSend(key) {
  await OtpThrottle.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 }, $set: { lastSentAt: new Date(0) } });
}

function throttleMessage(result) {
  if (result.reason === "daily") {
    const hours = Math.ceil(result.retryAfterSec / 3600);
    return `Aaj ke liye limit poori ho gayi. ${hours} ghante baad dobara try karo.`;
  }
  return `Thoda ruko - ${result.retryAfterSec} second baad dobara try karo.`;
}

module.exports = { claimSend, releaseSend, throttleMessage };
