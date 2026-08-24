const ExamPattern = require("../models/ExamPattern");
const Test = require("../models/Test");
const Attempt = require("../models/Attempt");
const {
  POST_EXAM_VISIBLE_DAYS,
  liveWindow,
  liveState,
} = require("../utils/liveExam");


// GET /api/exams -> list all configured exams
async function listExamPatterns(req, res) {
  const patterns = await ExamPattern.find({ isActive: true });
  res.json({ patterns });
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
  listUpcomingLiveExams,
  getLeaderboard,
};