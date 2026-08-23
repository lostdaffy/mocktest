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

    // A datetime string with no timezone marker (no "Z", no "+05:30") is
    // ambiguous - `new Date()` would parse it in whatever timezone THIS
    // server happens to run in, not the IST the admin actually meant. That
    // silent 5.5-hour shift is exactly what made scheduled times look like
    // they were "changing themselves". Reject it here rather than let a
    // future caller (a new admin form, a script, a direct API call)
    // reintroduce the same bug silently.
    const hasExplicitOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(scheduledAt);
    if (!hasExplicitOffset) {
      return res.status(400).json({
        message: "scheduledAt must include an explicit timezone offset (e.g. +05:30 or Z) - a bare local time is ambiguous and will schedule the wrong time.",
      });
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
  scheduleLiveExam,
  listUpcomingLiveExams,
  getLeaderboard,
};