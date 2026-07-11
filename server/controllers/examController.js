const ExamPattern = require("../models/ExamPattern");
const Test = require("../models/Test");
const Attempt = require("../models/Attempt");
const { generateFullMock } = require("../services/testGenerator");

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

// POST /api/exams/live/schedule (admin only) { examType, scheduledAt }
// The paper itself is auto-assembled at creation time from the pattern -
// admin only picks date/time, doesn't build the test.
async function scheduleLiveExam(req, res) {
  try {
    const { examType, scheduledAt } = req.body;
    const test = await generateFullMock(examType);

    test.type = "live";
    test.scheduledAt = new Date(scheduledAt);
    test.liveStatus = "upcoming";
    test.title = `Live Mock - ${test.title}`;
    await test.save();

    res.status(201).json({ message: "Live exam scheduled", test });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// GET /api/exams/live/upcoming
async function listUpcomingLiveExams(req, res) {
  const exams = await Test.find({ type: "live", scheduledAt: { $gte: new Date() } })
    .sort({ scheduledAt: 1 })
    .select("-questions");
  res.json({ exams });
}

// GET /api/tests/:id/leaderboard
async function getLeaderboard(req, res) {
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
  scheduleLiveExam,
  listUpcomingLiveExams,
  getLeaderboard,
};
