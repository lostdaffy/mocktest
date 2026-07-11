const Test = require("../models/Test");
const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const User = require("../models/User");
const {
  generateFullMock,
  generateTopicTest,
  generatePersonalizedDailyTest,
  generateWeeklyRevisionTest,
} = require("../services/testGenerator");
const { FREE_MOCK_TESTS, FREE_LIVE_EXAMS, FREE_PYQ_PAPERS, FREE_TRIAL_DAYS } = require("../config/freeLimits");
const { updateChapterMastery } = require("./subjectController");

function hasActiveSubscription(user) {
  return (
    user.subscriptionStatus === "active" &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > new Date()
  );
}

// GET /api/tests?examType=&type=
async function listTests(req, res) {
  const { examType, type } = req.query;
  const filter = {};
  if (examType) filter.examType = examType;
  if (type) filter.type = type;

  // Students only ever see:
  //  - admin-published tests (publishStatus: "published"), OR
  //  - tests personally generated for them (their own "Aaj Ka Test" etc.)
  // Drafts and archived tests are hidden.
  filter.$or = [
    { publishStatus: "published" },
    { generatedForUser: req.user._id },
  ];

  const tests = await Test.find(filter).sort({ seriesNumber: 1, createdAt: -1 }).limit(100).select("-questions");
  res.json({ tests });
}

// GET /api/tests/exam-series/:examStage -> published mock series for one exam (student-facing)
async function getExamSeries(req, res) {
  const { examStage } = req.params;
  const tests = await Test.find({
    examStage,
    type: "full_mock",
    publishStatus: "published",
  })
    .sort({ seriesNumber: 1 })
    .select("-questions");
  res.json({ tests });
}

// GET /api/tests/practice-series/:subject/:chapter -> published practice series for a chapter
async function getPracticeSeries(req, res) {
  const { subject, chapter } = req.params;
  const tests = await Test.find({
    type: "practice",
    subject,
    topic: chapter,
    publishStatus: "published",
  })
    .sort({ difficultyLevel: 1, seriesNumber: 1 })
    .select("-questions");

  // Free tier: first 2 practice tests per chapter are free, rest locked
  const withAccess = tests.map((t, idx) => ({
    ...t.toObject(),
    isFreeTest: idx < 2, // first 2 free
  }));

  res.json({ tests: withAccess });
}

// GET /api/tests/:id  -> full test with questions (without revealing correct answers)
async function getTest(req, res) {
  const test = await Test.findById(req.params.id).populate({
    path: "questions",
    select: "text textHi options optionsHi subject topic difficulty", // correctIndex & solution withheld until submit
  });
  if (!test) return res.status(404).json({ message: "Test not found" });

  // Free-tier gating for live exams and PYQs. Revisiting a test the student
  // already started (e.g. resuming, or reviewing after submit) never counts
  // again - only a genuinely NEW live exam or PYQ paper uses up a free slot.
  if ((test.type === "live" || test.type === "pyq") && !hasActiveSubscription(req.user)) {
    const alreadyStarted = await Attempt.exists({ user: req.user._id, test: test._id });

    if (!alreadyStarted) {
      const usageField = test.type === "live" ? "liveExamsUsed" : "pyqUsed";
      const limit = test.type === "live" ? FREE_LIVE_EXAMS : FREE_PYQ_PAPERS;
      const used = req.user.freeUsage[usageField];

      if (used >= limit) {
        return res.status(402).json({
          message:
            test.type === "live"
              ? `Aapke ${FREE_LIVE_EXAMS} free live exams khatam ho gaye. Unlimited live exams ke liye subscribe karo.`
              : `Aapke ${FREE_PYQ_PAPERS} free PYQ papers khatam ho gaye. Poora PYQ bank unlock karne ke liye subscribe karo.`,
          code: "SUBSCRIPTION_REQUIRED",
        });
      }

      await User.findByIdAndUpdate(req.user._id, { $inc: { [`freeUsage.${usageField}`]: 1 } });
    }
  }

  res.json({ test });
}

// POST /api/tests/generate/full-mock  { examType }
async function createFullMock(req, res) {
  try {
    const { examType } = req.body;

    if (!hasActiveSubscription(req.user)) {
      if (req.user.freeUsage.mockTestsUsed >= FREE_MOCK_TESTS) {
        return res.status(402).json({
          message: `Aapke ${FREE_MOCK_TESTS} free mock tests khatam ho gaye. Unlimited mocks ke liye subscribe karo.`,
          code: "SUBSCRIPTION_REQUIRED",
        });
      }
      await User.findByIdAndUpdate(req.user._id, { $inc: { "freeUsage.mockTestsUsed": 1 } });
    }

    const test = await generateFullMock(examType);
    res.status(201).json({ test });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/tests/generate/topic  { examType, subject, topic, count }
async function createTopicTest(req, res) {
  try {
    const { examType, subject, topic, count } = req.body;
    const test = await generateTopicTest({ examType, subject, topic, count });
    res.status(201).json({ test });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// GET /api/tests/today  -> personalized "Aaj Ka Test" for logged-in user
async function getTodayTest(req, res) {
  try {
    if (!hasActiveSubscription(req.user)) {
      const daysSinceSignup = (Date.now() - new Date(req.user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSignup > FREE_TRIAL_DAYS) {
        return res.status(402).json({
          message: `Aapka ${FREE_TRIAL_DAYS}-din ka free trial khatam ho gaya. Daily personalized test unlimited paane ke liye subscribe karo.`,
          code: "SUBSCRIPTION_REQUIRED",
        });
      }
    }

    const test = await generatePersonalizedDailyTest(req.user._id);
    res.json({ test });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/tests/generate/weekly-revision -> built from user's own wrong answers
async function createWeeklyRevision(req, res) {
  try {
    if (!hasActiveSubscription(req.user)) {
      return res.status(402).json({
        message: "Weekly weak-topic revision premium feature hai. Subscribe karke unlock karo.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    // Find questions this user got wrong across recent attempts
    const wrongAttempts = await Attempt.find({ user: req.user._id, status: { $ne: "in_progress" } })
      .sort({ createdAt: -1 })
      .limit(10);

    const wrongQuestionIds = [];
    wrongAttempts.forEach((att) => {
      att.answers.forEach((a) => {
        if (!a.isCorrect) wrongQuestionIds.push(a.question);
      });
    });

    const test = await generateWeeklyRevisionTest(req.user._id, wrongQuestionIds);
    res.status(201).json({ test });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/tests/:id/submit
// body: { answers: [{ questionId, selectedIndex, timeTakenSeconds }] }
async function submitTest(req, res) {
  try {
    const test = await Test.findById(req.params.id).populate("questions");
    if (!test) return res.status(404).json({ message: "Test not found" });

    const { answers } = req.body;
    const answerMap = new Map(answers.map((a) => [String(a.questionId), a]));

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let totalTime = 0;
    const evaluatedAnswers = [];
    const topicUpdates = {}; // for updating user.topicStats

    for (const q of test.questions) {
      const given = answerMap.get(String(q._id));
      const selectedIndex = given?.selectedIndex ?? null;
      const timeTaken = given?.timeTakenSeconds || 0;
      totalTime += timeTaken;

      let isCorrect = false;
      if (selectedIndex === null || selectedIndex === undefined) {
        skippedCount++;
      } else if (selectedIndex === q.correctIndex) {
        isCorrect = true;
        correctCount++;
      } else {
        wrongCount++;
      }

      evaluatedAnswers.push({
        question: q._id,
        selectedIndex,
        isCorrect,
        timeTakenSeconds: timeTaken,
        markedForReview: given?.markedForReview || false,
      });

      // Track per-topic stats for the recommendation engine
      const key = `${q.subject}|${q.topic}`;
      if (!topicUpdates[key]) topicUpdates[key] = { subject: q.subject, topic: q.topic, attempted: 0, correct: 0 };
      if (selectedIndex !== null && selectedIndex !== undefined) {
        topicUpdates[key].attempted++;
        if (isCorrect) topicUpdates[key].correct++;
      }

      // Update global question stats (used to auto-flag confusing questions)
      q.timesAttempted++;
      if (isCorrect) q.timesCorrect++;
      q.wrongAnswerRate = q.timesAttempted > 0 ? 1 - q.timesCorrect / q.timesAttempted : 0;
      if (q.wrongAnswerRate >= 0.8 && q.timesAttempted >= 20 && q.status === "published") {
        q.status = "under_review";
        q.flagReason = `High wrong-answer rate (${Math.round(q.wrongAnswerRate * 100)}%) - possible error or genuinely hard`;
      }
      await q.save();
    }

    const marksPerQ = test.marksPerQuestion || 1;
    const negMark = test.negativeMarking ?? 0.25;
    const totalMarks = test.questions.length * marksPerQ;
    const score = correctCount * marksPerQ - wrongCount * negMark;
    const accuracy = correctCount + wrongCount > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;

    const attempt = await Attempt.create({
      user: req.user._id,
      test: test._id,
      answers: evaluatedAnswers,
      score,
      totalMarks,
      correctCount,
      wrongCount,
      skippedCount,
      accuracy,
      totalTimeTakenSeconds: totalTime,
      status: "submitted",
      submittedAt: new Date(),
    });

    // Update user's per-topic accuracy stats (drives "Aaj Ka Test" + weak topic detection)
    const user = await User.findById(req.user._id);
    for (const key in topicUpdates) {
      const upd = topicUpdates[key];
      if (upd.attempted === 0) continue;
      let stat = user.topicStats.find((t) => t.subject === upd.subject && t.topic === upd.topic);
      if (!stat) {
        stat = { subject: upd.subject, topic: upd.topic, examType: test.examType, attempted: 0, correct: 0, accuracy: 0 };
        user.topicStats.push(stat);
      }
      stat.attempted += upd.attempted;
      stat.correct += upd.correct;
      stat.accuracy = Math.round((stat.correct / stat.attempted) * 100);
    }
    // Streak update
    const today = new Date().toDateString();
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : null;
    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      user.streakCount = lastActive === yesterday ? user.streakCount + 1 : 1;
      user.lastActiveDate = new Date();
    }
    await user.save();

    // Live exam rank calculation (if applicable)
    if (test.type === "live") {
      const better = await Attempt.countDocuments({ test: test._id, score: { $gt: score } });
      attempt.rank = better + 1;
      const totalParticipants = await Attempt.countDocuments({ test: test._id });
      attempt.percentile = Math.round(((totalParticipants - attempt.rank) / totalParticipants) * 100);
      await attempt.save();
    }

    // Adaptive difficulty: if this was a chapter-practice test, update the
    // student's mastery for that chapter and possibly promote them a level.
    let levelUpdate = null;
    if (test.examType === "CHAPTER_PRACTICE" && test.subject && test.topic) {
      levelUpdate = await updateChapterMastery(req.user._id, test.subject, test.topic, accuracy);
    }

    res.json({
      attemptId: attempt._id,
      score,
      totalMarks,
      correctCount,
      wrongCount,
      skippedCount,
      accuracy,
      rank: attempt.rank,
      percentile: attempt.percentile,
      levelUpdate, // { newLevel, isCompleted } when a chapter test promoted the student
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit test", error: err.message });
  }
}

// GET /api/tests/attempts/:attemptId  -> full result with Why-Wrong analysis
async function getAttemptResult(req, res) {
  const attempt = await Attempt.findById(req.params.attemptId)
    .populate({
      path: "answers.question",
      select: "text textHi options optionsHi correctIndex solution solutionHi subject topic",
    })
    .populate("test", "title type examType");

  if (!attempt) return res.status(404).json({ message: "Attempt not found" });
  if (String(attempt.user) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not your attempt" });
  }

  // Speed vs accuracy breakdown
  const slowWrong = attempt.answers.filter((a) => !a.isCorrect && a.timeTakenSeconds > 60).length;
  const fastWrong = attempt.answers.filter((a) => !a.isCorrect && a.timeTakenSeconds <= 60).length;

  res.json({
    attempt,
    insight: {
      slowAndWrong: slowWrong,
      fastAndWrong: fastWrong,
      note:
        slowWrong > fastWrong
          ? "Aap zyada time lekar bhi galat kar rahe hain - concept clarity pe kaam karo"
          : "Aap jaldi mein galti kar rahe hain - speed thodi kam karke accuracy badhao",
    },
  });
}

// GET /api/tests/my-attempts -> list logged-in user's past test attempts (history)
async function listMyAttempts(req, res) {
  const attempts = await Attempt.find({ user: req.user._id, status: { $ne: "in_progress" } })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("test", "title type examType");

  const history = attempts.map((a) => ({
    attemptId: a._id,
    testTitle: a.test?.title || "Test",
    testType: a.test?.type,
    examType: a.test?.examType,
    score: a.score,
    totalMarks: a.totalMarks,
    accuracy: a.accuracy,
    correctCount: a.correctCount,
    wrongCount: a.wrongCount,
    date: a.submittedAt || a.createdAt,
  }));

  res.json({ history });
}

// GET /api/tests/free-limits -> usage + remaining counts for the logged-in user
async function getFreeLimits(req, res) {
  const isActive = hasActiveSubscription(req.user);
  const daysSinceSignup = (Date.now() - new Date(req.user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const trialDaysLeft = Math.max(0, Math.ceil(FREE_TRIAL_DAYS - daysSinceSignup));

  res.json({
    isSubscribed: isActive,
    mock: { limit: FREE_MOCK_TESTS, used: req.user.freeUsage.mockTestsUsed, remaining: isActive ? null : Math.max(0, FREE_MOCK_TESTS - req.user.freeUsage.mockTestsUsed) },
    live: { limit: FREE_LIVE_EXAMS, used: req.user.freeUsage.liveExamsUsed, remaining: isActive ? null : Math.max(0, FREE_LIVE_EXAMS - req.user.freeUsage.liveExamsUsed) },
    pyq: { limit: FREE_PYQ_PAPERS, used: req.user.freeUsage.pyqUsed, remaining: isActive ? null : Math.max(0, FREE_PYQ_PAPERS - req.user.freeUsage.pyqUsed) },
    dailyTest: { trialDays: FREE_TRIAL_DAYS, daysLeft: isActive ? null : trialDaysLeft },
  });
}

module.exports = {
  listTests,
  getTest,
  createFullMock,
  createTopicTest,
  getTodayTest,
  createWeeklyRevision,
  submitTest,
  getAttemptResult,
  listMyAttempts,
  getFreeLimits,
  getExamSeries,
  getPracticeSeries,
};