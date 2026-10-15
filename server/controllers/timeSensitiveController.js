const Question = require("../models/Question");
const Test = require("../models/Test");

// Facts that go out of date. A question that asks for the current Chief
// Election Commissioner was right the day it was written and wrong a few
// months later - the Super TET mocks carried two such, both already stale.
// No check in code can know today's answer, so these are listed for a person
// to confirm every six months, or to reject (which replaces them).

const DATED = /(हाल\s*ही|वर्तमान|अभी\s*तक|नवीनतम|current(ly)?\b|recent(ly)?\b|latest|present\b|incumbent|\b20(?:2\d|3\d)\b)/i;
const RECHECK_AFTER_DAYS = 180;
// "वर्तमान आयु" / "present age" is a sum, not a fact that changes.
const TIMELESS_SUBJECTS = /^(math|reason|गणित|तर्क)/i;

// GET /api/questions/time-sensitive?limit= (admin)
async function listTimeSensitive(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const since = new Date(Date.now() - RECHECK_AFTER_DAYS * 86400000);
  const candidates = await Question.find({
    status: "published",
    subject: { $not: TIMELESS_SUBJECTS },
    $or: [{ factCheckedAt: { $exists: false } }, { factCheckedAt: null }, { factCheckedAt: { $lt: since } }],
    $and: [{ $or: [{ text: { $regex: DATED.source, $options: "i" } }, { textHi: { $regex: DATED.source, $options: "i" } }] }],
  })
    .select("text textHi options correctIndex subject topic factCheckedAt createdAt")
    .sort({ createdAt: 1 })
    .lean();

  // Only those a student can meet: inside a published test.
  const ids = candidates.map((q) => q._id);
  const tests = await Test.find({ questions: { $in: ids }, publishStatus: "published" }).select("title questions").lean();
  const holding = new Map();
  for (const t of tests) for (const id of t.questions) {
    const k = String(id);
    if (!holding.has(k)) holding.set(k, []);
    holding.get(k).push(t.title);
  }
  const live = candidates.filter((q) => holding.has(String(q._id)));
  res.json({
    count: live.length,
    questions: live.slice(0, limit).map((q) => ({ ...q, tests: holding.get(String(q._id)) })),
  });
}

// PATCH /api/questions/:id/fact-checked (admin) -> still true today
async function markFactChecked(req, res) {
  const q = await Question.findByIdAndUpdate(req.params.id, { $set: { factCheckedAt: new Date() } }, { new: true }).select("_id factCheckedAt");
  if (!q) return res.status(404).json({ message: "Question not found" });
  res.json({ message: "Marked as still correct", question: q });
}

module.exports = { listTimeSensitive, markFactChecked, DATED };
