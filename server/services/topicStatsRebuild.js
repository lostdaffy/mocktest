const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const User = require("../models/User");

// Recounts each student's topic analysis (user.topicStats) from their
// finished attempts.
//
// Until 2026-10-14 a topic's first test was saved as 0 of 0 - the counts
// were added to a copy, not the stored entry - so every student's analysis
// was missing their first test of every topic. This rebuilds it from the
// source of truth, with the same rule as submitting a test: an answered
// question counts as attempted, a right one as correct; skipped ones do not
// count. Running it twice gives the same result.

const DONE = ["submitted", "auto_submitted"];

async function rebuildForUser(userId) {
  const attempts = await Attempt.find({ user: userId, status: { $in: DONE } })
    .select("test answers submittedAt createdAt")
    .populate({ path: "test", select: "examType" })
    .lean();
  if (!attempts.length) return 0;

  const qIds = [...new Set(attempts.flatMap((a) => (a.answers || []).map((x) => String(x.question))))];
  const questions = await Question.find({ _id: { $in: qIds } }).select("subject topic").lean();
  const byId = new Map(questions.map((q) => [String(q._id), q]));

  const stats = new Map();
  for (const a of attempts) {
    const when = a.submittedAt || a.createdAt;
    for (const ans of a.answers || []) {
      if (ans.selectedIndex === null || ans.selectedIndex === undefined) continue;
      const q = byId.get(String(ans.question));
      if (!q || !q.subject || !q.topic) continue;
      const key = `${q.subject}|${q.topic}`;
      let s = stats.get(key);
      if (!s) {
        s = { subject: q.subject, topic: q.topic, examType: a.test?.examType || null, attempted: 0, correct: 0, lastAttemptedAt: when };
        stats.set(key, s);
      }
      s.attempted += 1;
      if (ans.isCorrect) s.correct += 1;
      if (when && (!s.lastAttemptedAt || when > s.lastAttemptedAt)) s.lastAttemptedAt = when;
    }
  }

  const topicStats = [...stats.values()].map((s) => ({ ...s, accuracy: Math.round((s.correct / s.attempted) * 100) }));
  await User.updateOne({ _id: userId }, { $set: { topicStats } });
  return topicStats.length;
}

/** Every student who has finished at least one test. */
async function rebuildAll() {
  const userIds = await Attempt.distinct("user", { status: { $in: DONE } });
  let topics = 0;
  for (const id of userIds) topics += await rebuildForUser(id);
  return { users: userIds.length, topics };
}

module.exports = { rebuildForUser, rebuildAll };
