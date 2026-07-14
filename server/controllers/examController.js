const ExamPattern = require("../models/ExamPattern");
const Test = require("../models/Test");
const Attempt = require("../models/Attempt");


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

// POST /api/exams/live/schedule (admin only) { mockTestId, scheduledAt }
//
// A live exam is a COPY of an already-published, already-reviewed mock -
// not a fresh Gemini/random-pool assembly. This matters for two reasons:
// 1. Reliability - published mocks are guaranteed to meet the 100-question
//    minimum and have passed the admin review workflow. A fresh random pull
//    from the standalone question pool has no such guarantee and can come
//    back thin or empty, which is why scheduling used to fail silently.
// 2. Fairness - every student in a live exam must get the IDENTICAL paper
//    for the leaderboard/ranking to mean anything.
async function scheduleLiveExam(req, res) {
  try {
    const { mockTestId, scheduledAt } = req.body;
    if (!mockTestId || !scheduledAt) {
      return res.status(400).json({ message: "Pick a mock and a date/time" });
    }

    const source = await Test.findById(mockTestId);
    if (!source) return res.status(404).json({ message: "Mock test not found" });
    if (source.type !== "full_mock") {
      return res.status(400).json({ message: "Only a full mock can be scheduled as a live exam" });
    }
    if (source.publishStatus !== "published") {
      return res.status(400).json({ message: "This mock isn't published yet - publish it first" });
    }
    if (!source.liveExclusive) {
      return res.status(400).json({
        message:
          "This mock is part of the regular Mock Tests series and students may already have taken it. Build a Live Exam Exclusive mock instead.",
      });
    }

    // Clone, don't mutate - the original stays in its exam series untouched.
    const test = await Test.create({
      title: `Live Exam - ${source.title}`,
      type: "live",
      examType: source.examType,
      examStage: source.examStage,
      questions: source.questions,
      durationMinutes: source.durationMinutes,
      marksPerQuestion: source.marksPerQuestion,
      negativeMarking: source.negativeMarking,
      scheduledAt: new Date(scheduledAt),
      liveStatus: "upcoming",
      publishStatus: "published",
      isFree: source.isFree,
      createdBy: "admin",
    });

    res.status(201).json({ message: "Live exam scheduled", test });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// GET /api/exams/live/upcoming
async function listUpcomingLiveExams(req, res) {
  const exams = await Test.find({
    type: "live",
    publishStatus: "published",
    scheduledAt: { $gte: new Date() },
  })
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