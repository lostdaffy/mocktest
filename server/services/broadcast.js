// The admin's own message to many students at once: "new SSC mocks are up",
// "UPSSSC PET form closes on Friday". One admin, so no approvals - but the
// panel shows how many it will reach before it goes, and the same message
// cannot go out twice in ten minutes (a double click, a retry).
//
// Each message goes two ways:
//   - a push notification to every phone in the audience with a token;
//   - an item in the app's Notifications list for 14 days
//     (forStudent, used by services/engagement.js notificationFeed), so a
//     student whose phone missed the push still sees it.
//
// Never to an admin, never to a blocked student.
const User = require("../models/User");
const Broadcast = require("../models/Broadcast");
const { sendPushNotifications } = require("./pushService");

const FEED_DAYS = 14;
const SAME_MESSAGE_GAP_MS = 10 * 60 * 1000;
const TOKENS_PER_ROUND = 500;
const SCREENS = ["", "HomeTab", "LiveTab", "Subscription", "ExamSeries"];

// Mongo filter for an audience.
function audienceFilter(audience = {}, now = new Date()) {
  const f = { role: { $ne: "admin" }, blockedAt: null };
  const paid = { subscriptionStatus: "active", subscriptionExpiresAt: { $gt: now } };
  if (audience.kind === "exam") f.examGoals = audience.exam;
  else if (audience.kind === "paid") Object.assign(f, paid);
  else if (audience.kind === "free") f.$nor = [paid];
  return f;
}

// Does this message belong in this student's Notifications list?
function isFor(audience = {}, user, now = new Date()) {
  if (!user || user.role === "admin" || user.blockedAt) return false;
  const paid = user.subscriptionStatus === "active" && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now;
  if (audience.kind === "exam") return (user.examGoals || []).includes(audience.exam);
  if (audience.kind === "paid") return Boolean(paid);
  if (audience.kind === "free") return !paid;
  return true;
}

function cleanAudience(a = {}) {
  const kind = ["all", "exam", "paid", "free"].includes(a.kind) ? a.kind : "all";
  return kind === "exam" ? { kind, exam: String(a.exam || "").trim() } : { kind };
}

/** How many students an audience reaches, and the exams to choose from. */
async function preview(audience) {
  const aud = cleanAudience(audience);
  const f = audienceFilter(aud);
  const [students, phones, exams] = await Promise.all([
    User.countDocuments(f),
    User.countDocuments({ ...f, pushToken: { $exists: true, $nin: [null, ""] } }),
    User.aggregate([
      { $match: { role: { $ne: "admin" }, blockedAt: null } },
      { $unwind: "$examGoals" },
      { $group: { _id: "$examGoals", students: { $sum: 1 } } },
      { $sort: { students: -1, _id: 1 } },
    ]),
  ]);
  return { audience: aud, students, phones, exams: exams.map((e) => ({ exam: e._id, students: e.students })) };
}

/**
 * Checks the message, saves it and starts sending. Returns the saved
 * broadcast at once; the push goes out in the background and the counts
 * fill in as it does. Throws an Error with .status for a message that
 * cannot go.
 */
async function startBroadcast({ title, body, audience, screen }, { wait = false } = {}) {
  const t = String(title || "").trim();
  const b = String(body || "").trim();
  const fail = (status, message) => Object.assign(new Error(message), { status });
  if (!t || !b) throw fail(400, "Write both a title and a message");
  if (t.length > 65) throw fail(400, "Keep the title within 65 characters - longer is cut off on the phone");
  if (b.length > 240) throw fail(400, "Keep the message within 240 characters");
  const aud = cleanAudience(audience);
  if (aud.kind === "exam" && !aud.exam) throw fail(400, "Choose the exam");
  const scr = SCREENS.includes(screen) ? screen : "";
  if (scr === "ExamSeries" && aud.kind !== "exam") throw fail(400, "Mock series opens one exam's mocks - choose an exam audience for it");

  const recent = await Broadcast.findOne({ title: t, body: b, createdAt: { $gt: new Date(Date.now() - SAME_MESSAGE_GAP_MS) } }).lean();
  if (recent) throw fail(409, "This exact message went out less than 10 minutes ago");

  const filter = audienceFilter(aud);
  const students = await User.countDocuments(filter);
  if (!students) throw fail(400, "No student is in this audience");

  const doc = await Broadcast.create({ title: t, body: b, audience: aud, screen: scr, students });
  const run = deliver(doc._id, filter, { title: t, body: b, scr, aud });
  if (wait) await run;
  else run.catch(() => {});
  return doc;
}

async function deliver(id, filter, { title, body, scr, aud }) {
  const data = { kind: "announcement", broadcastId: String(id), ...(scr ? { screen: scr } : {}), ...(scr === "ExamSeries" ? { examStage: aud.exam } : {}) };
  let phones = 0, delivered = 0, failed = 0;
  const errors = [];
  try {
    const cursor = User.find({ ...filter, pushToken: { $exists: true, $nin: [null, ""] } }).select("pushToken").lean().cursor();
    let batch = [];
    const flush = async () => {
      if (!batch.length) return;
      phones += batch.length;
      const r = await sendPushNotifications(batch, { title, body, data });
      delivered += r.sent;
      failed += batch.length - r.sent;
      for (const e of r.errors || []) if (errors.length < 5 && !errors.includes(e)) errors.push(e);
      batch = [];
      await Broadcast.updateOne({ _id: id }, { $set: { phones, delivered, failed } });
    };
    for await (const u of cursor) {
      batch.push(u.pushToken);
      if (batch.length >= TOKENS_PER_ROUND) await flush();
    }
    await flush();
    await Broadcast.updateOne({ _id: id }, { $set: { status: "done", phones, delivered, failed, problems: errors, finishedAt: new Date() } });
  } catch (err) {
    await Broadcast.updateOne({ _id: id }, { $set: { status: "failed", phones, delivered, failed, problems: [...errors, err.message].slice(0, 5), finishedAt: new Date() } });
  }
}

/** The last 14 days' messages that belong in this student's Notifications list. */
async function forStudent(user, now = new Date()) {
  const since = new Date(now.getTime() - FEED_DAYS * 24 * 60 * 60 * 1000);
  const recent = await Broadcast.find({ createdAt: { $gte: since }, status: { $ne: "failed" } }).sort({ createdAt: -1 }).limit(20).lean();
  return recent
    .filter((b) => isFor(b.audience, user, now))
    .map((b) => ({
      id: `broadcast-${b._id}`,
      kind: "announcement",
      title: b.title,
      body: b.body,
      at: b.createdAt,
      ...(b.screen ? { action: b.screen === "ExamSeries" ? { screen: "ExamSeries", params: { examStage: b.audience.exam } } : { screen: b.screen } } : {}),
    }));
}

module.exports = { preview, startBroadcast, forStudent, audienceFilter, isFor, FEED_DAYS };
