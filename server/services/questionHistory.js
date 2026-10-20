// The history of each question (see models/QuestionRevision): every change
// recorded with its before and after, and any version restorable.
const Question = require("../models/Question");
const QuestionRevision = require("../models/QuestionRevision");

const FIELDS = ["text", "textHi", "options", "optionsHi", "correctIndex", "solution", "solutionHi", "formula", "status", "difficulty", "topic", "chapter", "flagReason"];

function snapshot(q) {
  if (!q) return undefined;
  const out = {};
  for (const f of FIELDS) if (q[f] !== undefined && q[f] !== null) out[f] = Array.isArray(q[f]) ? [...q[f]] : q[f];
  return out;
}

// Records one change. Never throws: losing a history row must not undo the
// change it describes, so a failure is logged and the caller carries on.
async function record(questionId, action, { before, after, by = "admin", note, replacedBy } = {}) {
  try {
    let whole;
    if (action === "delete" && before) {
      const { embedding, __v, ...rest } = typeof before.toObject === "function" ? before.toObject() : before;
      whole = rest;
    }
    await QuestionRevision.create({
      question: questionId,
      action,
      by,
      note: note ? String(note).slice(0, 500) : undefined,
      before: snapshot(before),
      after: snapshot(after),
      replacedBy,
      whole,
    });
  } catch (err) {
    console.error("Question history:", err.message);
  }
}

// Changes a question and records it in one step. Returns the updated question.
async function change(questionId, set, { action = "edit", by = "admin", note, replacedBy } = {}) {
  const before = await Question.findById(questionId).lean();
  if (!before) return null;
  const after = await Question.findByIdAndUpdate(questionId, { $set: set }, { new: true }).lean();
  await record(questionId, action, { before, after, by, note, replacedBy });
  return after;
}

// The one way a question leaves the bank for good: a full copy is kept in its
// history first, so even a deletion can be undone (see restore). A question a
// student has answered is never deleted - their result still points at it -
// it is retired instead. Returns "deleted", "retired" or null (not found).
async function deleteForGood(questionId, { by = "admin", note } = {}) {
  const q = await Question.findById(questionId).lean();
  if (!q) return null;
  const Attempt = require("../models/Attempt");
  if (await Attempt.exists({ "answers.question": q._id })) {
    if (q.status !== "rejected") await change(q._id, { status: "rejected", flagReason: note || "Removed" }, { action: "retire", by, note });
    return "retired";
  }
  await record(q._id, "delete", { before: q, by, note });
  await Question.deleteOne({ _id: q._id });
  await require("../models/QuestionImage").deleteMany({ question: q._id });
  return "deleted";
}

async function historyOf(questionId) {
  return QuestionRevision.find({ question: questionId }).sort({ createdAt: -1 }).lean();
}

// Undoes the given change: puts the question back the way it was just before
// it (a creation record, which has no before, gives the version it was
// created as). The restore is a change too, and is recorded - so a restore
// can itself be undone.
async function restore(questionId, revisionId, { by = "admin" } = {}) {
  const rev = await QuestionRevision.findOne({ _id: revisionId, question: questionId }).lean();
  if (!rev) return null;

  // A question deleted for good comes back from the copy kept at deletion -
  // held for review, not straight to students.
  if (rev.action === "delete" && rev.whole && !(await Question.exists({ _id: questionId }))) {
    const back = await Question.create({ ...rev.whole, _id: questionId, status: "under_review", flagReason: "Brought back after a deletion" });
    await record(questionId, "restore", { after: back, by, note: "Brought back after a deletion" });
    return back.toObject();
  }
  const target = rev.before || rev.after;
  if (!target) return null;
  const set = {};
  for (const f of FIELDS) if (target[f] !== undefined) set[f] = target[f];
  return change(questionId, set, { action: "restore", by, note: `Undid the change of ${new Date(rev.createdAt).toISOString()} (${rev.action})` });
}

module.exports = { snapshot, record, change, historyOf, restore, deleteForGood, FIELDS };
