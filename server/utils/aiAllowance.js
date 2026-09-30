// When the Gemini free allowance comes back.
//
// Google resets it at midnight Pacific time. The panel used to say "12:30 PM
// IST", which is right only while California is on daylight time; from
// November to March the reset is an hour later, 1:30 PM IST, and a queue told
// to wait until 12:30 would have woken an hour early into an empty allowance.
// So it is worked out from the clock rather than written down.

const LA = "America/Los_Angeles";

function partsIn(timeZone, date) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  // Some engines write midnight as "24".
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute };
}

/** The next midnight in California, as a UTC instant. */
function nextAllowanceReset(now = new Date()) {
  const { y, m, d } = partsIn(LA, now);
  // That midnight is 07:00 UTC in summer and 08:00 UTC in winter. Try both
  // and keep the one that really is midnight there.
  for (const hourUtc of [7, 8]) {
    const candidate = new Date(Date.UTC(y, m - 1, d + 1, hourUtc, 0));
    const at = partsIn(LA, candidate);
    if (at.h === 0 && at.min === 0) return candidate;
  }
  return new Date(Date.UTC(y, m - 1, d + 1, 8, 0));
}

// A few minutes after the reset, not on it: a request sent in the first
// seconds can still be counted against the old day.
const AFTER_RESET_MS = 5 * 60 * 1000;

/** The earliest a queue stopped by a spent allowance can usefully resume. */
function resumeTime(now = new Date()) {
  return new Date(nextAllowanceReset(now).getTime() + AFTER_RESET_MS);
}

/** "12:35 pm" in India, for messages people read. */
function istTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
}

module.exports = { nextAllowanceReset, resumeTime, istTime };
