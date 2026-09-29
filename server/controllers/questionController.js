const Question = require("../models/Question");
const Test = require("../models/Test");
const Report = require("../models/Report");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const { runValidationPipeline } = require("../services/validationPipeline");
const { recheckQuestions } = require("../services/questionFactory");
const { refillTests, refillNote } = require("../services/testTopUp");

// GET /api/questions?examType=&subject=&topic=&status=  (admin/browse use)
async function listQuestions(req, res) {
  const { examType, subject, topic, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (examType) filter.examType = examType;
  if (subject) filter.subject = subject;
  if (topic) filter.topic = topic;
  if (status) filter.status = status;

  const questions = await Question.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Question.countDocuments(filter);
  res.json({ questions, total, page: Number(page) });
}

// PATCH /api/questions/:id/approve (admin only)
async function approveQuestion(req, res) {
  const q = await Question.findByIdAndUpdate(
    req.params.id,
    { status: "published", flagReason: null },
    { new: true }
  );
  if (!q) return res.status(404).json({ message: "Question not found" });
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
  const { reason } = req.body;
  const q = await Question.findByIdAndUpdate(
    req.params.id,
    { status: "rejected", flagReason: reason || "Rejected by admin" },
    { new: true }
  );
  if (!q) return res.status(404).json({ message: "Question not found" });

  // Out of every test that was using it.
  const affected = await Test.find({ questions: q._id }).select(`title questions publishStatus`).lean();
  if (affected.length) {
    await Test.updateMany({ questions: q._id }, { $pull: { questions: q._id } });
  }

  // A test that is now short is worth saying out loud - it is live, a
  // student can open it, and it has one question fewer than it claims.
  // Every test we pulled from qualifies: comparing against a practice test's
  // twelve hid a mock sitting at 99 of 100.
  const nowShort = affected.map((t) => ({
    title: t.title,
    left: t.questions.length - 1,
    live: t.publishStatus === `published`,
  }));

  // ...and another takes its place. Saying "now short - regenerate to fill"
  // and leaving it there is how 26 live tests ended up serving fewer
  // questions than they promised.
  const refilled = affected.length ? await refillTests(affected.map((t) => t._id)) : [];

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
async function updateQuestion(req, res) {
  try {
    const allowed = [
      "text", "textHi", "options", "optionsHi", "correctIndex",
      "solution", "solutionHi", "examType", "subject", "topic",
      "chapter", "difficulty", "status",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const q = await Question.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!q) return res.status(404).json({ message: "Question not found" });

    // An edited question skips the quality gate, deliberately - an admin
    // looking straight at it should be able to overrule a rule. But the
    // commonest hand-edit is changing which option is correct, and that is
    // the one mistake re-reading never catches: the solution still works
    // through to the old answer. So the save goes through and the checks
    // come back with it.
    const { checkEditedQuestion } = require("../utils/questionWarnings");
    res.json({ question: q, warnings: checkEditedQuestion(q) });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
}

// DELETE /api/questions/:id (admin)
async function deleteQuestion(req, res) {
  const q = await Question.findByIdAndDelete(req.params.id);
  if (!q) return res.status(404).json({ message: "Question not found" });
  res.json({ message: "Question deleted" });
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