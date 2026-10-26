const Question = require("../models/Question");
const Test = require("../models/Test");
const Report = require("../models/Report");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const { runValidationPipeline } = require("../services/validationPipeline");
const { recheckQuestions, auditPublished } = require("../services/questionFactory");
const { refillTests, refillNote } = require("../services/testTopUp");
const { chapterHealth } = require("../services/chapterHealth");
const history = require("../services/questionHistory");
const mongoose = require("mongoose");

const isId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v) && mongoose.Types.ObjectId.isValid(v);

// GET /api/questions?examType=&subject=&topic=&status=  (admin/browse use)
async function listQuestions(req, res) {
  // Only plain text reaches the query: "status[$ne]=x" arrives as an object
  // and would otherwise become a database operator.
  const str = (v) => (typeof v === "string" && v ? v.slice(0, 100) : undefined);
  const filter = {};
  for (const k of ["examType", "subject", "topic", "status", "chapter"]) {
    if (str(req.query[k])) filter[k] = str(req.query[k]);
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 20000);

  const questions = await Question.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Question.countDocuments(filter);
  res.json({ questions, total, page });
}

// PATCH /api/questions/:id/approve (admin only)
//
// Only a question that passes the quality gate is published: approving one
// that fails is refused, with the reasons, so it is fixed first.
async function approveQuestion(req, res) {
  if (!isId(req.params.id)) return res.status(400).json({ message: "Not a valid id" });
  const current = await Question.findById(req.params.id).lean();
  if (!current) return res.status(404).json({ message: "Question not found" });
  const { ruleBasedCheck } = require("../services/validationPipeline");
  const { passed, issues } = ruleBasedCheck(current);
  if (!passed) {
    return res.status(409).json({ message: `It fails the quality check - fix it before publishing: ${issues.join(", ")}`, issues });
  }
  const q = await history.change(current._id, { status: "published", flagReason: "" }, { action: "status", note: "Approved by the admin" });
  res.json({ message: "Question approved and published", question: q });
}

// PATCH /api/questions/:id/reject (admin only)
//
// Rejecting used to change the question's status and nothing else. A test
// holds its questions by id and serves them without looking at status, so a
// question rejected here carried on being handed to students in every test
// that already contained it. The admin had pressed Reject and been told it
// was done.
async function rejectQuestion(req, res) {
  if (!isId(req.params.id)) return res.status(400).json({ message: "Not a valid id" });
  const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined;
  // Out of every test that was using it, and a replacement in its place -
  // see services/questionRejection.js. Recorded in its history.
  const { rejectAndHeal } = require("../services/questionRejection");
  const done = await rejectAndHeal(req.params.id, reason);
  if (!done) return res.status(404).json({ message: "Question not found" });
  const { question: q, affected, refilled } = done;

  // A test that is now short is worth saying out loud - it is live, a
  // student can open it, and it has one question fewer than it claims.
  // Every test we pulled from qualifies: comparing against a practice test's
  // twelve hid a mock sitting at 99 of 100.
  const nowShort = affected.map((t) => ({
    title: t.title,
    left: t.questions.length - 1,
    live: t.publishStatus === `published`,
  }));

  // (Another takes its place - saying "now short - regenerate to fill" and
  // leaving it there is how 26 live tests ended up serving fewer questions
  // than they promised.)

  res.json({
    message:
      "Question rejected" +
      (affected.length ? ` and removed from ${affected.length} test(s)` : "") +
      refillNote(refilled),
    question: q,
    removedFromTests: affected.length,
    testsNowShort: refilled.filter((r) => !r.filled).map((r) => ({ title: r.title, left: r.to, target: r.target })),
    refilled,
  });
}

// POST /api/questions/recheck (admin) -> clear the review queue automatically
//
// The queue used to be cleared by hand, one question at a time, with the admin
// solving each one to decide. The gate already knows how to make that
// judgement, so it makes it.
async function recheckReviewQueue(req, res) {
  const limit = Math.min(Math.max(Number(req.body?.limit) || 20, 1), 50);
  const { subject, topic } = req.body || {};

  const r = await recheckQuestions({ limit, subject, topic });
  if (!r.looked) return res.json({ message: "Nothing in the review queue", ...r });

  // Whatever left circulation leaves a hole; fill it before answering.
  const refilled = r.testsNowShort.length
    ? await refillTests(r.testsNowShort.map((t) => t._id).filter(Boolean))
    : [];

  const parts = [`Checked ${r.looked}`];
  if (r.published) parts.push(`${r.published} published${r.repaired ? ` (${r.repaired} after a repair)` : ""}`);
  if (r.deleted) parts.push(`${r.deleted} deleted`);
  if (r.keptForHistory) parts.push(`${r.keptForHistory} marked rejected but kept, students had already answered them`);

  res.json({ message: parts.join(", ") + refillNote(refilled), ...r, refilled });
}

// POST /api/questions/audit { chapter, after?, limit? } - AI re-check of the
// live questions of one chapter, a batch per call. Whatever is retired is
// replaced in its tests before answering; `next` is where to carry on.
async function auditChapter(req, res) {
  const chapter = String(req.body?.chapter || "").trim();
  if (!chapter) return res.status(400).json({ message: "Choose a chapter to audit" });
  const limit = Math.min(Math.max(Number(req.body?.limit) || 12, 1), 30);
  const after = req.body?.after || undefined;

  const r = await auditPublished({ chapter, after, limit });
  const refilled = r.testsNowShort.length
    ? await refillTests(r.testsNowShort.map((t) => t._id).filter(Boolean))
    : [];

  const parts = [`Checked ${r.looked}`, `${r.kept} sound`];
  if (r.repaired) parts.push(`${r.repaired} mended`);
  if (r.secondOpinionKept) parts.push(`${r.secondOpinionKept} kept after a second check`);
  if (r.deleted) parts.push(`${r.deleted} deleted`);
  if (r.keptForHistory) parts.push(`${r.keptForHistory} marked rejected but kept for students' history`);
  if (r.stopped) parts.push(`stopped: ${r.stopped}`);
  if (r.done) parts.push("chapter finished");

  res.json({ message: parts.join(", ") + refillNote(refilled), ...r, refilled });
}

// GET /api/questions/chapter-health?chapter= - the chapter's tests and live
// questions against the whole architecture: tests per subtopic and level,
// full and live, no repeats, every question through the rule gate again.
async function getChapterHealth(req, res) {
  const chapter = String(req.query.chapter || "").trim();
  if (!chapter) return res.status(400).json({ message: "Choose a chapter" });
  res.json(await chapterHealth(chapter));
}

// POST /api/questions (admin manual add, or used internally after AI generation)
async function createQuestion(req, res) {
  try {
    const validated = await runValidationPipeline(req.body);
    const q = await Question.create(validated);
    res.status(201).json({ question: q });
  } catch (err) {
    res.status(500).json({ message: "Failed to create question", error: err.message });
  }
}

// POST /api/questions/:id/report (student flags an error)
async function reportQuestion(req, res) {
  const { reason, note } = req.body;
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ message: "Question not found" });

  await Report.create({
    question: question._id,
    reportedBy: req.user._id,
    reason,
    note,
  });

  question.reportCount += 1;

  // Auto-hide safety net: 3+ reports pulls it from students automatically
  if (question.reportCount >= 3 && question.status === "published") {
    question.status = "under_review";
    question.flagReason = `Auto-flagged after ${question.reportCount} student reports`;
  }

  await question.save();
  res.json({ message: "Report submitted, thank you", reportCount: question.reportCount });
}

// POST /api/questions/:id/bookmark - toggle bookmark on/off for the logged-in student
async function toggleBookmark(req, res) {
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ message: "Question not found" });

  const user = await User.findById(req.user._id);
  const idx = user.bookmarkedQuestions.findIndex((qId) => String(qId) === String(question._id));

  let bookmarked;
  if (idx >= 0) {
    user.bookmarkedQuestions.splice(idx, 1);
    bookmarked = false;
  } else {
    user.bookmarkedQuestions.push(question._id);
    bookmarked = true;
  }
  await user.save();

  res.json({ bookmarked });
}

// GET /api/questions/bookmarked - list the logged-in student's bookmarked questions
async function listBookmarked(req, res) {
  const user = await User.findById(req.user._id).populate({
    path: "bookmarkedQuestions",
    select: "text textHi options optionsHi correctIndex solution solutionHi subject topic",
  });
  res.json({ questions: user.bookmarkedQuestions });
}

// PUT /api/questions/:id (admin) - edit a question fully
//
// Every edit is kept in the question's history (before and after), so any
// version can be restored. The edited question goes through the rule gate
// again: if it is (or is being made) live and fails, it is saved but held for
// review with the reasons, never left live broken. If the AI desk is on, the
// AI checks it too, in the background.
const STATUSES = ["draft", "under_review", "published", "rejected", "hidden"];
const LEVELS = ["easy", "medium", "hard", "exam"];

function readEdit(b) {
  const updates = {};
  const text = (k, max = 5000) => {
    if (b[k] === undefined || b[k] === null) return;
    if (typeof b[k] !== "string") throw new Error(`${k} must be text`);
    updates[k] = b[k].slice(0, max);
  };
  const four = (k) => {
    if (b[k] === undefined || (b[k] === null && k === "optionsHi")) return;
    if (k === "optionsHi" && Array.isArray(b[k]) && b[k].length === 0) return (updates[k] = []);
    if (!Array.isArray(b[k]) || b[k].length !== 4 || b[k].some((x) => typeof x !== "string")) {
      throw new Error(`${k} must be four pieces of text`);
    }
    updates[k] = b[k].map((x) => x.slice(0, 1000));
  };
  ["text", "textHi", "solution", "solutionHi", "subject", "topic", "chapter"].forEach((k) => text(k));
  four("options");
  four("optionsHi");
  if (b.correctIndex !== undefined) {
    if (![0, 1, 2, 3].includes(b.correctIndex)) throw new Error("correctIndex must be 0, 1, 2 or 3");
    updates.correctIndex = b.correctIndex;
  }
  if (b.difficulty !== undefined) {
    if (!LEVELS.includes(b.difficulty)) throw new Error("difficulty must be easy, medium, hard or exam");
    updates.difficulty = b.difficulty;
  }
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) throw new Error("status is not a known status");
    updates.status = b.status;
  }
  if (b.examType !== undefined) {
    if (!Array.isArray(b.examType) || b.examType.some((x) => typeof x !== "string")) throw new Error("examType must be a list of text");
    updates.examType = b.examType.slice(0, 30).map((x) => x.slice(0, 100));
  }
  // The sum the gate runs for a maths question (services/mathCheck.js).
  // Rewriting a question with new numbers needs a new one - or "" to drop
  // it; otherwise the old sum is checked against the new options and the
  // edit is held (2026-10-26: two UPTET rewrites were held for exactly this).
  if (b.formula !== undefined) {
    if (b.formula !== null && typeof b.formula !== "string") throw new Error("formula must be text");
    updates.formula = String(b.formula || "").slice(0, 500);
  }
  return updates;
}

async function updateQuestion(req, res) {
  if (!isId(req.params.id)) return res.status(400).json({ message: "Not a valid id" });
  let updates;
  try {
    updates = readEdit(req.body || {});
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  const before = await Question.findById(req.params.id).lean();
  if (!before) return res.status(404).json({ message: "Question not found" });

  const { ruleBasedCheck } = require("../services/validationPipeline");
  const { plainMathsUpdate } = require("../services/mathNotation");
  Object.assign(updates, plainMathsUpdate({ ...before, ...updates }) || {});
  const { passed, issues } = ruleBasedCheck({ ...before, ...updates });
  const wantsLive = (updates.status || before.status) === "published";
  const held = wantsLive && !passed;
  if (held) {
    updates.status = "under_review";
    updates.flagReason = `Rule check failed after an edit: ${issues.join(", ")}`;
  }
  const q = await history.change(before._id, updates, { action: "edit", note: held ? "Held for review: fails the quality check" : undefined });

  try {
    const QualitySettings = require("../models/QualitySettings");
    const GenerationJob = require("../models/GenerationJob");
    if ((await QualitySettings.get()).checkCsvUploads && q.status === "published") {
      await GenerationJob.create({ kind: "quality_check", questionIds: [q._id], source: "edit", label: "AI check of an edited question", status: "queued" });
    }
  } catch (_) {
    // The edit is saved either way; the bank audit reaches it later.
  }

  // The commonest hand-edit is changing which option is correct, and the
  // solution still works through to the old answer - these warnings say so.
  const { checkEditedQuestion } = require("../utils/questionWarnings");
  res.json({
    question: q,
    warnings: checkEditedQuestion(q),
    ...(held ? { held: true, issues, message: `Saved, but it fails the quality check, so it is moved to Needs review until fixed: ${issues.join(", ")}` } : {}),
  });
}

// DELETE /api/questions/:id (admin)
//
// A question that is live, sits in a test, or has been answered by a student
// is not deleted on a plain request: it is retired - taken out of its tests,
// a replacement put in, and kept with its history so it can be restored.
// Deleting it for good needs { permanent: true, confirm: "DELETE" } in the
// body, and its content is still kept in the history.
async function deleteQuestion(req, res) {
  if (!isId(req.params.id)) return res.status(400).json({ message: "Not a valid id" });
  const q = await Question.findById(req.params.id).lean();
  if (!q) return res.status(404).json({ message: "Question not found" });
  const Attempt = require("../models/Attempt");
  const inUse =
    q.status === "published" ||
    !!(await Test.exists({ questions: q._id })) ||
    !!(await Attempt.exists({ "answers.question": q._id }));
  const permanent = req.body?.permanent === true && req.body?.confirm === "DELETE";

  if (inUse && !permanent) {
    const { rejectAndHeal } = require("../services/questionRejection");
    const done = await rejectAndHeal(q._id, "Removed by the admin");
    return res.json({
      retired: true,
      message:
        "It is in use, so it was retired, not deleted: taken out of its tests, a replacement put in, and kept in the history" +
        refillNote(done?.refilled || []),
    });
  }

  let refilled = [];
  if (inUse) {
    const affected = await Test.find({ questions: q._id }).select("_id").lean();
    await Test.updateMany({ questions: q._id }, { $pull: { questions: q._id } });
    if (affected.length) refilled = await refillTests(affected.map((t) => t._id));
  }
  const how = await history.deleteForGood(q._id, { note: inUse ? "Deleted for good, confirmed by the admin" : "Deleted (never used)" });
  res.json({
    message:
      (how === "retired"
        ? "Students have answered it, so it was retired instead of deleted (their results still show it)"
        : "Question deleted. A copy is kept in the history.") + refillNote(refilled),
  });
}

// GET /api/questions/reports (admin) - list open student error-reports with the question
async function listReports(req, res) {
  const reports = await Report.find({ status: "open" })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("question", "text options correctIndex solution subject topic status")
    .populate("reportedBy", "name phone");
  res.json({ reports });
}

// PATCH /api/questions/reports/:id/resolve (admin)
async function resolveReport(req, res) {
  const report = await Report.findByIdAndUpdate(req.params.id, { status: "resolved" }, { new: true });
  if (!report) return res.status(404).json({ message: "Report not found" });
  res.json({ message: "Report resolved", report });
}

// GET /api/questions/stats (admin) - dashboard numbers
async function getStats(req, res) {
  const [
    totalQuestions,
    publishedQuestions,
    reviewQueue,
    openReports,
    totalUsers,
    activeSubscribers,
    paidSubscriptions,
  ] = await Promise.all([
    Question.countDocuments({}),
    Question.countDocuments({ status: "published" }),
    Question.countDocuments({ status: "under_review" }),
    Report.countDocuments({ status: "open" }),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ subscriptionStatus: "active", subscriptionExpiresAt: { $gt: new Date() } }),
    Subscription.countDocuments({ status: "paid" }),
  ]);

  // Total revenue from paid subscriptions
  const revenueAgg = await Subscription.aggregate([
    { $match: { status: "paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total || 0;

  res.json({
    totalQuestions,
    publishedQuestions,
    reviewQueue,
    openReports,
    totalUsers,
    activeSubscribers,
    paidSubscriptions,
    totalRevenue,
  });
}

module.exports = {
  recheckReviewQueue,
  auditChapter,
  getChapterHealth,
  listQuestions,
  approveQuestion,
  rejectQuestion,
  createQuestion,
  reportQuestion,
  toggleBookmark,
  listBookmarked,
  updateQuestion,
  deleteQuestion,
  listReports,
  resolveReport,
  getStats,
};