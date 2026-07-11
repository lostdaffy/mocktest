const Question = require("../models/Question");
const Report = require("../models/Report");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const { runValidationPipeline } = require("../services/validationPipeline");

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
async function rejectQuestion(req, res) {
  const { reason } = req.body;
  const q = await Question.findByIdAndUpdate(
    req.params.id,
    { status: "rejected", flagReason: reason || "Rejected by admin" },
    { new: true }
  );
  if (!q) return res.status(404).json({ message: "Question not found" });
  res.json({ message: "Question rejected", question: q });
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
    res.json({ question: q });
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