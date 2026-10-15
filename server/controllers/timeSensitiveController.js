const Question = require("../models/Question");
const Test = require("../models/Test");

// Facts that go out of date. A question that asks for the current Chief
// Election Commissioner was right the day it was written and wrong a few
// months later - the Super TET mocks carried two such, both already stale.
// No check in code can know today's answer, so these are listed for a person
// to confirm every six months, or to reject (which replaces them).

// Narrow on purpose. A bare "current" is electric current, a bare "present"
// is "Neither ... was present", "वर्तमान भारतीय राज्य" is a place on a map, and
// "NEP 2020" is the name of a policy - the first version listed all of these.
const OFFICE = "(chief|president|prime|governor|secretary|ceo|chairman|chairperson|head|captain|minister|director|commissioner|speaker|cji|cec)";
const PAD = "(मुख्य|अध्यक्ष|राष्ट्रपति|प्रधान|राज्यपाल|महासचिव|गवर्नर|कप्तान|मंत्री|सचिव|निदेशक|आयुक्त|न्यायाधीश|सेनाध्यक्ष|प्रमुख)";
const DATED = new RegExp(
  [
    "हाल\\s*(ही|के\\s*वर्षों)", "वर्तमान\\s*में", `वर्तमान\\s*${PAD}`, "अभी\\s*तक", "नवीनतम",
    "currently", "at\\s*present", "presently", `current\\s*${OFFICE}`, "recent(ly)?\\b", "latest", "incumbent",
    "\\b20(2[2-9]|3\\d)\\b",
  ].join("|"),
  "i"
);
const RECHECK_AFTER_DAYS = 180;
// "वर्तमान आयु" / "present age" is a sum, not a fact that changes; an
// English question is grammar.
const TIMELESS_SUBJECTS = /^(math|reason|english|गणित|तर्क|अंग्रेज)/i;

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
