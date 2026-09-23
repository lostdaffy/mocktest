const ExamPattern = require("../models/ExamPattern");
const Test = require("../models/Test");
const Attempt = require("../models/Attempt");
const {
  POST_EXAM_VISIBLE_DAYS,
  liveWindow,
  liveState,
} = require("../utils/liveExam");


// GET /api/exams -> list configured exams
// ?includeInactive=1 also returns archived patterns (admin screen), each one
// carrying how many tests already exist for it, so deleting a pattern that
// real papers depend on is a decision made with the number in front of you.
async function listExamPatterns(req, res) {
  const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";
  const patterns = await ExamPattern.find(includeInactive ? {} : { isActive: true })
    .sort({ isActive: -1, displayName: 1 })
    .lean();

  if (!includeInactive) return res.json({ patterns });

  // One grouped count for every exam type, instead of a query per pattern.
  const usage = await Test.aggregate([{ $group: { _id: "$examType", n: { $sum: 1 } } }]);
  const usageByType = new Map(usage.map((u) => [u._id, u.n]));

  res.json({
    patterns: patterns.map((p) => ({ ...p, testCount: usageByType.get(p.examType) || 0 })),
  });
}

// PATCH /api/exams/:id (admin) -> edit an existing pattern.
// Kept separate from the upsert above: that one is keyed on examType, so
// using it to rename an exam would quietly create a SECOND pattern instead
// of renaming the one you were editing.
async function updateExamPattern(req, res) {
  try {
    const { examType, displayName, durationMinutes, negativeMarking, marksPerQuestion, sections, isActive } = req.body;

    const pattern = await ExamPattern.findById(req.params.id);
    if (!pattern) return res.status(404).json({ message: "Exam pattern not found" });

    if (examType && examType !== pattern.examType) {
      const clash = await ExamPattern.findOne({ examType, _id: { $ne: pattern._id } });
      if (clash) return res.status(409).json({ message: `Exam code "${examType}" already exists` });
      pattern.examType = examType;
    }
    if (displayName !== undefined) pattern.displayName = displayName;
    if (durationMinutes !== undefined) pattern.durationMinutes = durationMinutes;
    if (negativeMarking !== undefined) pattern.negativeMarking = negativeMarking;
    if (marksPerQuestion !== undefined) pattern.marksPerQuestion = marksPerQuestion;
    if (Array.isArray(sections)) pattern.sections = sections;
    if (isActive !== undefined) pattern.isActive = !!isActive;

    await pattern.save();
    res.json({ message: "Exam pattern updated", pattern });
  } catch (err) {
    res.status(500).json({ message: "Couldn't update the exam pattern", error: err.message });
  }
}

// DELETE /api/exams/:id (admin)
// Archives by default - the pattern disappears from the app and from test
// generation but can be brought back, and any papers already built from it
// keep working. ?permanent=1 removes the document for good; existing tests
// are never touched either way.
async function deleteExamPattern(req, res) {
  try {
    const pattern = await ExamPattern.findById(req.params.id);
    if (!pattern) return res.status(404).json({ message: "Exam pattern not found" });

    const permanent = req.query.permanent === "1" || req.query.permanent === "true";
    if (!permanent) {
      pattern.isActive = false;
      await pattern.save();
      return res.json({ message: `"${pattern.displayName}" archived`, pattern });
    }

    await ExamPattern.deleteOne({ _id: pattern._id });
    const testCount = await Test.countDocuments({ examType: pattern.examType });
    res.json({
      message: `"${pattern.displayName}" deleted permanently`,
      keptTests: testCount, // papers already built from it stay as they are
    });
  } catch (err) {
    res.status(500).json({ message: "Couldn't delete the exam pattern", error: err.message });
  }
}

// POST /api/exams (admin only) -> define/update a new exam pattern once.
// After this, mock tests for this exam auto-generate forever - no manual work.
async function upsertExamPattern(req, res) {
  const { examType, displayName, durationMinutes, negativeMarking, marksPerQuestion, sections } = req.body;

  const pattern = await ExamPattern.findOneAndUpdate(
    { examType },
    { displayName, durationMinutes, negativeMarking, marksPerQuestion, sections, isActive: true },
    { upsert: true, new: true }
  );

  res.json({ message: "Exam pattern saved", pattern });
}

// Live exam papers are built and scheduled through their own dedicated
// pipeline now - see server/controllers/liveExamController.js and
// server/routes/liveExamRoutes.js (mounted at /api/live-exams). That flow
// generates a fresh question set directly for the live event instead of
// cloning an existing Mock Tests series paper, so a live exam never
// depends on a mock having been built/published first.

// GET /api/exams/live/upcoming
//
// Returns live exams that are upcoming, happening RIGHT NOW, or recently
// finished. The old version filtered on scheduledAt >= now, which meant an
// exam vanished from the app the instant it started - students literally
// could not find the exam during the only window they were allowed to take
// it in. It also hid finished exams, so there was no way to get back to a
// result/rank afterwards.
async function listUpcomingLiveExams(req, res) {
  const now = new Date();
  const visibleFrom = new Date(
    now.getTime() - POST_EXAM_VISIBLE_DAYS * 24 * 60 * 60 * 1000
  );

  const exams = await Test.find({
    type: "live",
    publishStatus: "published",
    scheduledAt: { $gte: visibleFrom },
  })
    .sort({ scheduledAt: 1 })
    .select("-questions");

  // Which of these has this student already attempted? One batch query so
  // the app can show "Completed / View Result" instead of offering a
  // second entry into an exam they already sat.
  const attempts = await Attempt.find({
    user: req.user._id,
    test: { $in: exams.map((e) => e._id) },
  }).select("test status");

  const attemptByTest = new Map(
    attempts.map((a) => [String(a.test), a])
  );

  const withState = exams.map((exam) => {
    const { startsAt, endsAt } = liveWindow(exam);
    const state = liveState(exam, now);
    const attempt = attemptByTest.get(String(exam._id));

    const obj = exam.toObject();
    obj.liveState = state;
    obj.startsAt = startsAt;
    obj.endsAt = endsAt;
    obj.attemptStatus = attempt ? attempt.status : null;
    obj.attemptId = attempt ? attempt._id : null;
    // Rank is only meaningful once everyone has finished.
    obj.resultsReleased = state === "ended";
    return obj;
  });

  res.json({ exams: withState, tests: withState, serverTime: now });
}

// GET /api/tests/:id/leaderboard
//
// For a live exam the leaderboard stays sealed until the shared window
// closes - releasing it mid-exam would let a student who finished early
// see the paper's difficulty/answers reflected in others' scores, and
// makes the rank meaningless since most people haven't submitted yet.
async function getLeaderboard(req, res) {
  const test = await Test.findById(req.params.id).select(
    "type scheduledAt durationMinutes"
  );
  if (!test) return res.status(404).json({ message: "Test not found" });

  if (test.type === "live" && liveState(test) !== "ended") {
    const { endsAt } = liveWindow(test);
    return res.status(403).json({
      message: "Rankings are released once the live exam finishes.",
      code: "RESULTS_NOT_RELEASED",
      endsAt,
    });
  }

  const attempts = await Attempt.find({ test: req.params.id, status: { $ne: "in_progress" } })
    .sort({ score: -1 })
    .limit(100)
    .populate("user", "name");

  const leaderboard = attempts.map((a, idx) => ({
    rank: idx + 1,
    name: a.user?.name || "Anonymous",
    score: a.score,
    accuracy: a.accuracy,
  }));

  res.json({ leaderboard });
}

module.exports = {
  listExamPatterns,
  upsertExamPattern,
  updateExamPattern,
  deleteExamPattern,
  listUpcomingLiveExams,
  getLeaderboard,
};