const Test = require("../models/Test");
const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const User = require("../models/User");
const Subject = require("../models/Subject");
const ExamPattern = require("../models/ExamPattern");
const {
  generateFullMock,
  generateTopicTest,
  generatePersonalizedDailyTest,
  generateWeeklyRevisionTest,
} = require("../services/testGenerator");
const { FREE_MOCK_TESTS, FREE_LIVE_EXAMS, FREE_TRIAL_DAYS } = require("../config/freeLimits");
const { liveWindow, liveState, secondsRemaining } = require("../utils/liveExam");
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

// A PYQ paper from this year or last year is free to build trust in the
// content upfront (this is what genuinely-real, verified papers are for) -
// older years are the depth that's worth paying for. Computed from the
// paper's real exam year, not a per-paper flag admin has to set manually.
function isPyqFree(test) {
  const currentYear = new Date().getFullYear();
  return !test.pyqYear || test.pyqYear >= currentYear - 1;
}

// GET /api/tests/pyq -> published, real previous-year papers for the student's exam
async function getPyqList(req, res) {
  const examStage = req.user.examGoals?.[0] || "SSC_CGL";
  const tests = await Test.find({
    examStage,
    type: "pyq",
    publishStatus: "published",
  })
    .sort({ pyqYear: -1, pyqShift: 1 })
    .select("-questions");

  const withFreeFlag = tests.map((t) => {
    const obj = t.toObject();
    obj.isFree = isPyqFree(t);
    return obj;
  });

  res.json({ tests: withFreeFlag });
}

// GET /api/tests/pyq/:examStage/years -> distinct years with paper counts,
// newest first. Powers the "pick a year" screen once a student has picked
// an exam - students can browse ANY exam's PYQs, not just their own goal.
async function getPyqYears(req, res) {
  const { examStage } = req.params;
  const years = await Test.aggregate([
    { $match: { examStage, type: "pyq", publishStatus: "published" } },
    { $group: { _id: "$pyqYear", count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);
  res.json({ years: years.map((y) => ({ year: y._id, count: y.count })) });
}

// GET /api/tests/pyq/:examStage/papers/:year -> papers for one exam+year
async function getPyqPapersByYear(req, res) {
  const { examStage, year } = req.params;
  const tests = await Test.find({
    examStage,
    type: "pyq",
    pyqYear: Number(year),
    publishStatus: "published",
  })
    .sort({ pyqShift: 1 })
    .select("-questions");

  const withFreeFlag = tests.map((t) => {
    const obj = t.toObject ? t.toObject() : t;
    obj.isFree = isPyqFree(t);
    return obj;
  });

  res.json({ tests: await withAttemptStatus(withFreeFlag, req.user._id) });
}

// Attaches the CURRENT student's attempt status to a list of tests, so the
// UI can show "Completed 82%" / "Resume" instead of every card looking
// identical regardless of history. One batch query, not N+1.
async function withAttemptStatus(tests, userId) {
  const testIds = tests.map((t) => t._id);
  const attempts = await Attempt.find({ user: userId, test: { $in: testIds } })
    .sort({ createdAt: -1 })
    .select("test status accuracy score totalMarks");

  const byTest = {};
  for (const a of attempts) {
    const key = String(a.test);
    if (!byTest[key]) byTest[key] = []; // most recent first, since we sorted above
    byTest[key].push(a);
  }

  return tests.map((t) => {
    const obj = t.toObject ? t.toObject() : t;
    const list = byTest[String(t._id)] || [];
    const completed = list.find((a) => a.status === "submitted" || a.status === "auto_submitted");
    const inProgress = list.find((a) => a.status === "in_progress");

    return {
      ...obj,
      attemptStatus: completed ? "completed" : inProgress ? "in_progress" : "not_started",
      bestAccuracy: completed ? Math.round(completed.accuracy) : null,
    };
  });
}

// GET /api/tests/exam-series/:examStage -> published mock series for one exam (student-facing)
async function getExamSeries(req, res) {
  const { examStage } = req.params;
  const tests = await Test.find({
    examStage,
    type: "full_mock",
    publishStatus: "published",
    liveExclusive: { $ne: true }, // exclusive content only surfaces via a scheduled live exam
  })
    .sort({ seriesNumber: 1 })
    .select("-questions");
  res.json({ tests: await withAttemptStatus(tests, req.user._id) });
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

  // isFree is the admin's own choice made at publish time (see
  // publishPracticeTest) - it must not be recomputed here.
  res.json({ tests: await withAttemptStatus(tests, req.user._id) });
}

// GET /api/tests/:id  -> full test with questions (without revealing correct answers)
async function getTest(req, res) {
  const test = await Test.findById(req.params.id).populate({
    path: "questions",
    select: "text textHi options optionsHi subject topic difficulty", // correctIndex & solution withheld until submit
  });
  if (!test) return res.status(404).json({ message: "Test not found" });

  // PYQ: free-by-recency, not a usage counter - a paper from this year or
  // last year is always free (see isPyqFree above); older years need a
  // subscription, checked fresh every time rather than "used up" like the
  // live-exam trial below.
  if (test.type === "pyq" && !isPyqFree(test) && !hasActiveSubscription(req.user)) {
    return res.status(402).json({
      message: `This is one of our older PYQ papers - unlock the full archive with a subscription. This year's and last year's papers are always free.`,
      code: "SUBSCRIPTION_REQUIRED",
    });
  }

  // ---- Live exam: the exam-hall rules ----
  //
  // A live exam only opens at its scheduled moment and closes at the same
  // wall-clock moment for everyone. Without this check the "live" exam was
  // live in name only - any student could open it days early, take it
  // alone, and land on a leaderboard against people who hadn't sat it yet.
  //
  // One Attempt lookup is reused for everything below (already-attempted
  // check, free-trial accounting, and creating the in-progress record) -
  // it used to be two separate queries for the same fact.
  let liveAttempt = null;
  if (test.type === "live") {
    const state = liveState(test);
    const { startsAt, endsAt } = liveWindow(test);

    if (state === "upcoming") {
      return res.status(403).json({
        message: "This live exam hasn't started yet. Come back at the scheduled time.",
        code: "LIVE_NOT_STARTED",
        startsAt,
        endsAt,
      });
    }

    if (state === "ended") {
      return res.status(403).json({
        message: "This live exam has ended. Check the rankings to see how you did.",
        code: "LIVE_ENDED",
        startsAt,
        endsAt,
      });
    }

    // One shot only - a live exam can't be re-entered after submitting,
    // the way a practice test can.
    liveAttempt = await Attempt.findOne({ user: req.user._id, test: test._id });
    if (liveAttempt && liveAttempt.status !== "in_progress") {
      return res.status(403).json({
        message: "You've already submitted this live exam.",
        code: "LIVE_ALREADY_ATTEMPTED",
        attemptId: liveAttempt._id,
      });
    }

    // Live exams: a genuine "N free tries, then subscribe" trial. Revisiting
    // a test the student already started (e.g. resuming, or reviewing after
    // submit) never counts again - only a genuinely NEW live exam uses up a
    // free slot.
    if (!liveAttempt && !hasActiveSubscription(req.user)) {
      const used = req.user.freeUsage.liveExamsUsed;

      if (used >= FREE_LIVE_EXAMS) {
        return res.status(402).json({
          message: `Aapke ${FREE_LIVE_EXAMS} free live exams khatam ho gaye. Unlimited live exams ke liye subscribe karo.`,
          code: "SUBSCRIPTION_REQUIRED",
        });
      }

      await User.findByIdAndUpdate(req.user._id, { $inc: { "freeUsage.liveExamsUsed": 1 } });
    }

    // Create the in-progress record right at entry, not at submit. This is
    // what makes synchronized submission possible: without an Attempt
    // existing from the moment the student walks in, a student who never
    // taps submit leaves absolutely no trace, and nothing can ever
    // auto-finalize them when the shared window closes (see
    // server/jobs/liveExamScheduler.js).
    if (!liveAttempt) {
      liveAttempt = await Attempt.create({ user: req.user._id, test: test._id, status: "in_progress", answers: [] });
    }
  }

  // Full mocks and practice tests use a per-test isFree flag the admin sets
  // at publish time - this was never actually enforced here, meaning any
  // "Premium" mock or practice test was fully playable without a
  // subscription as long as the test ID was known. The mobile lock icon was
  // cosmetic only.
  if ((test.type === "full_mock" || test.type === "practice") && !test.isFree && !hasActiveSubscription(req.user)) {
    return res.status(402).json({
      message: "This is a Premium test. Subscribe to unlock it.",
      code: "SUBSCRIPTION_REQUIRED",
    });
  }

  if (test.type === "live") {
    const { startsAt, endsAt } = liveWindow(test);
    // The client must run its countdown on THIS, not on durationMinutes -
    // a student joining 10 minutes late gets the 50 minutes that are left,
    // not a fresh 60, so everyone still finishes together.
    return res.json({
      test,
      live: {
        startsAt,
        endsAt,
        secondsRemaining: secondsRemaining(test),
        serverTime: new Date(),
      },
    });
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
// Grades a set of raw answers against a (questions-populated) test and
// writes the result to an Attempt - either updating one that already
// exists (a live exam's in-progress record, created at entry - see
// getTest) or creating a fresh one (every other test type still creates
// its Attempt at submit time, same as before).
//
// Shared by the manual submit endpoint AND server/jobs/liveExamScheduler.js
// (which finalizes anyone still "in_progress" once a live exam's shared
// window closes) - one grading implementation, so a scheduler-finalized
// result is scored identically to a manually-submitted one.
async function finalizeAttempt(test, userId, answers, options = {}) {
  const { attemptDoc, autoSubmitted, integrityFlags, language } = options;
  const answerMap = new Map((answers || []).map((a) => [String(a.questionId), a]));

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let totalTime = 0;
  const evaluatedAnswers = [];
  const topicUpdates = {}; // for updating user.topicStats

  // Per-question stat updates are collected here and flushed as ONE
  // bulkWrite after the loop. Saving each question individually meant a
  // 100-question mock did 100 sequential round-trips to MongoDB before the
  // student saw their result - several seconds of pure network latency on
  // a hosted DB, and the single biggest cause of slow submits.
  const questionOps = [];

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
    const timesAttempted = (q.timesAttempted || 0) + 1;
    const timesCorrect = (q.timesCorrect || 0) + (isCorrect ? 1 : 0);
    const wrongAnswerRate = timesAttempted > 0 ? 1 - timesCorrect / timesAttempted : 0;

    const update = {
      $set: { wrongAnswerRate },
      $inc: { timesAttempted: 1, ...(isCorrect ? { timesCorrect: 1 } : {}) },
    };

    if (wrongAnswerRate >= 0.8 && timesAttempted >= 20 && q.status === "published") {
      update.$set.status = "under_review";
      update.$set.flagReason = `High wrong-answer rate (${Math.round(
        wrongAnswerRate * 100
      )}%) - possible error or genuinely hard`;
    }

    questionOps.push({ updateOne: { filter: { _id: q._id }, update } });
  }

  // Fire-and-forget relative to the student: these counters feed admin
  // dashboards, not the result the student is waiting on, so a failure here
  // must never turn a successfully-graded attempt into an error.
  if (questionOps.length > 0) {
    try {
      await Question.bulkWrite(questionOps, { ordered: false });
    } catch (err) {
      console.error("Question stat bulkWrite failed (attempt still graded):", err.message);
    }
  }

  const marksPerQ = test.marksPerQuestion || 1;
  const negMark = test.negativeMarking ?? 0.25;
  const totalMarks = test.questions.length * marksPerQ;
  const score = correctCount * marksPerQ - wrongCount * negMark;
  const accuracy = correctCount + wrongCount > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;

  const attemptData = {
    answers: evaluatedAnswers,
    score,
    totalMarks,
    correctCount,
    wrongCount,
    skippedCount,
    accuracy,
    totalTimeTakenSeconds: totalTime,
    status: autoSubmitted ? "auto_submitted" : "submitted",
    submittedAt: new Date(),
    language: language === "hi" ? "hi" : "en",
  };
  if (integrityFlags) attemptData.integrityFlags = integrityFlags;

  let attempt;
  if (attemptDoc) {
    Object.assign(attemptDoc, attemptData);
    attempt = attemptDoc;
    await attempt.save();
  } else {
    attempt = await Attempt.create({ user: userId, test: test._id, ...attemptData });
  }

  // Update user's per-topic accuracy stats (drives "Aaj Ka Test" + weak topic detection)
  const user = await User.findById(userId);
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
    stat.lastAttemptedAt = new Date();
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

  // Live exam rank calculation (if applicable). Excludes still-in-progress
  // attempts - once a live exam creates an Attempt at entry (not just at
  // submit), a mid-exam attempt sitting at its default score:0 would
  // otherwise pollute the rank of anyone who has already finished with a
  // negative (negative-marking) score.
  if (test.type === "live") {
    const better = await Attempt.countDocuments({ test: test._id, status: { $ne: "in_progress" }, score: { $gt: score } });
    attempt.rank = better + 1;
    const totalParticipants = await Attempt.countDocuments({ test: test._id, status: { $ne: "in_progress" } });
    attempt.percentile = totalParticipants > 0 ? Math.round(((totalParticipants - attempt.rank) / totalParticipants) * 100) : null;
    await attempt.save();
  }

  // Adaptive difficulty: if this was a chapter-practice test, update the
  // student's mastery for that chapter and possibly promote them a level.
  let levelUpdate = null;
  if (test.examType === "CHAPTER_PRACTICE" && test.subject && test.topic) {
    levelUpdate = await updateChapterMastery(userId, test.subject, test.topic, accuracy);
  }

  return { attempt, score, totalMarks, correctCount, wrongCount, skippedCount, accuracy, levelUpdate };
}

async function submitTest(req, res) {
  try {
    const test = await Test.findById(req.params.id).populate("questions");
    if (!test) return res.status(404).json({ message: "Test not found" });

    const { answers, language, integrityFlags } = req.body;

    // Live exams already have an in-progress Attempt from the moment the
    // student entered (see getTest). Reuse it instead of creating a second
    // record, and treat an already-finalized one as "nothing to do" rather
    // than an error - the scheduler in server/jobs/liveExamScheduler.js can
    // legitimately finalize a straggler moments before their own submit
    // request lands.
    let attemptDoc = null;
    if (test.type === "live") {
      attemptDoc = await Attempt.findOne({ user: req.user._id, test: test._id });
      if (attemptDoc && attemptDoc.status !== "in_progress") {
        return res.json({
          attemptId: attemptDoc._id,
          score: attemptDoc.score,
          totalMarks: attemptDoc.totalMarks,
          correctCount: attemptDoc.correctCount,
          wrongCount: attemptDoc.wrongCount,
          skippedCount: attemptDoc.skippedCount,
          accuracy: attemptDoc.accuracy,
          rank: attemptDoc.rank,
          percentile: attemptDoc.percentile,
          levelUpdate: null,
          alreadyFinalized: true,
        });
      }
    }

    const result = await finalizeAttempt(test, req.user._id, answers, {
      attemptDoc,
      language,
      integrityFlags,
    });

    res.json({
      attemptId: result.attempt._id,
      score: result.score,
      totalMarks: result.totalMarks,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      skippedCount: result.skippedCount,
      accuracy: result.accuracy,
      rank: result.attempt.rank,
      percentile: result.attempt.percentile,
      levelUpdate: result.levelUpdate, // { newLevel, isCompleted } when a chapter test promoted the student
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit test", error: err.message });
  }
}

// PATCH /api/tests/:id/progress -> periodic autosave during a live exam
// Persists raw (ungraded) answers onto the in-progress Attempt created at
// entry, so a student who never taps submit still has their real progress
// on record for the scheduler to finalize when the shared window closes.
async function saveLiveProgress(req, res) {
  try {
    const { answers, integrityFlags } = req.body;
    const attempt = await Attempt.findOne({ user: req.user._id, test: req.params.id, status: "in_progress" });
    // Nothing to save against - either the student never entered (shouldn't
    // happen, getTest creates it) or it's already been finalized. Either
    // way, silently no-op rather than error - autosave must never interrupt
    // the student.
    if (!attempt) return res.json({ saved: false });

    attempt.answers = (answers || []).map((a) => ({
      question: a.questionId,
      selectedIndex: a.selectedIndex ?? null,
      isCorrect: false, // graded only at finalize time
      timeTakenSeconds: a.timeTakenSeconds || 0,
      markedForReview: a.markedForReview || false,
    }));
    // Keep the integrity snapshot current too, so a straggler the scheduler
    // has to finalize (see server/jobs/liveExamScheduler.js) still carries
    // an accurate background-app count instead of whatever was true at entry.
    if (integrityFlags) attempt.integrityFlags = integrityFlags;
    await attempt.save();

    res.json({ saved: true });
  } catch (err) {
    // Same reasoning as above - autosave failing silently beats surfacing
    // an error mid-exam over something the student can't act on.
    res.json({ saved: false });
  }
}

// GET /api/tests/attempts/:attemptId  -> full result with Why-Wrong analysis
async function getAttemptResult(req, res) {
  const attempt = await Attempt.findById(req.params.attemptId)
    .populate({
      path: "answers.question",
      select: "text textHi options optionsHi correctIndex solution solutionHi subject topic",
    })
    .populate("test", "title type examType scheduledAt durationMinutes");

  if (!attempt) return res.status(404).json({ message: "Attempt not found" });
  if (String(attempt.user) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not your attempt" });
  }

  // Speed vs accuracy breakdown
  const slowWrong = attempt.answers.filter((a) => !a.isCorrect && a.timeTakenSeconds > 60).length;
  const fastWrong = attempt.answers.filter((a) => !a.isCorrect && a.timeTakenSeconds <= 60).length;

  // Rank: only meaningful for a live exam, and only once the shared window
  // has closed (before that most people haven't submitted, so any "rank"
  // would be against a fraction of the field and would keep changing).
  const attemptObj = attempt.toObject();
  attemptObj.testTitle = attempt.test?.title || "Test";

  if (attempt.test?.type === "live") {
    const ended = liveState(attempt.test) === "ended";

    if (ended) {
      const [better, total] = await Promise.all([
        Attempt.countDocuments({
          test: attempt.test._id,
          status: { $ne: "in_progress" },
          score: { $gt: attempt.score },
        }),
        Attempt.countDocuments({
          test: attempt.test._id,
          status: { $ne: "in_progress" },
        }),
      ]);

      attemptObj.rank = better + 1;
      attemptObj.totalParticipants = total;
      attemptObj.resultsReleased = true;
    } else {
      attemptObj.rank = null;
      attemptObj.totalParticipants = null;
      attemptObj.resultsReleased = false;
      attemptObj.rankAvailableAt = liveWindow(attempt.test).endsAt;
    }
  }

  res.json({
    attempt: attemptObj,
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

// GET /api/tests/my-attempts?page=&limit=&types= -> paginated attempt history
//
// Two things this fixes vs. the old version:
// 1. It was hard-capped at the 50 most recent attempts with no way to see
//    older ones, and the "Average/Best" summary the app showed was silently
//    computed over just that capped page - misleading for anyone who had
//    taken more than 50 tests.
// 2. It dropped skippedCount entirely even though Attempt already stores it,
//    forcing the app to *guess* skipped questions from totalMarks (only
//    correct when marksPerQuestion is exactly 1 - wrong for any test worth
//    more/less per question).
async function listMyAttempts(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const types = req.query.types ? String(req.query.types).split(",").filter(Boolean) : null;

  const pipeline = [
    { $match: { user: req.user._id, status: { $ne: "in_progress" } } },
    { $lookup: { from: "tests", localField: "test", foreignField: "_id", as: "testDoc" } },
    { $unwind: { path: "$testDoc", preserveNullAndEmptyArrays: true } },
  ];
  if (types && types.length) {
    pipeline.push({ $match: { "testDoc.type": { $in: types } } });
  }
  // Percentage clamped to 0-100 so a negative-marking-heavy bad attempt
  // doesn't drag the displayed average into confusing negative numbers.
  pipeline.push({
    $addFields: {
      pct: {
        $max: [
          0,
          {
            $min: [
              100,
              { $cond: [{ $gt: ["$totalMarks", 0] }, { $multiply: [{ $divide: ["$score", "$totalMarks"] }, 100] }, 0] },
            ],
          },
        ],
      },
    },
  });
  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({
    $facet: {
      page: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            attemptId: "$_id",
            testTitle: { $ifNull: ["$testDoc.title", "Test"] },
            testType: "$testDoc.type",
            examType: "$testDoc.examType",
            score: 1,
            totalMarks: 1,
            accuracy: 1,
            correctCount: 1,
            wrongCount: 1,
            skippedCount: 1,
            totalQuestions: { $add: ["$correctCount", "$wrongCount", "$skippedCount"] },
            totalTimeTakenSeconds: 1,
            rank: 1,
            percentile: 1,
            date: { $ifNull: ["$submittedAt", "$createdAt"] },
          },
        },
      ],
      summary: [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            average: { $avg: "$pct" },
            best: { $max: "$pct" },
            recent: { $push: "$pct" }, // already sorted newest-first
          },
        },
      ],
    },
  });

  const [result] = await Attempt.aggregate(pipeline);
  const summaryRow = result?.summary?.[0];

  let summary = { total: 0, average: 0, best: 0, trend: "flat" };
  if (summaryRow) {
    const recentFive = summaryRow.recent.slice(0, 5);
    const recentAverage = recentFive.reduce((s, v) => s + v, 0) / recentFive.length;
    const overallAverage = summaryRow.average;
    // Only call it a trend once there's enough history on both sides to mean
    // something - otherwise a single great/bad recent test would swing an
    // arrow that looks more confident than the data actually is.
    let trend = "flat";
    if (summaryRow.total >= 6) {
      if (recentAverage - overallAverage >= 4) trend = "up";
      else if (overallAverage - recentAverage >= 4) trend = "down";
    }
    summary = {
      total: summaryRow.total,
      average: Math.round(overallAverage),
      best: Math.round(summaryRow.best),
      recentAverage: Math.round(recentAverage),
      trend,
    };
  }

  res.json({
    history: result?.page || [],
    page,
    limit,
    hasMore: summary.total > page * limit,
    summary,
  });
}

// GET /api/tests/analysis -> topic + subject performance breakdown
//
// The mobile Analysis screen used to just read `user.topicStats` straight
// out of the cached AuthContext user object - stale until the next login
// or an explicit refreshUser() call, so a student could take 10 tests and
// still see yesterday's numbers. This endpoint is fetched fresh on every
// screen focus instead.
async function getAnalysis(req, res) {
  const user = await User.findById(req.user._id).select("topicStats examGoals");
  const topicStats = user.topicStats || [];

  if (topicStats.length === 0) {
    return res.json({ overall: { accuracy: 0, topicsCount: 0, strongCount: 0, weakCount: 0 }, subjects: [], topics: [], focus: null });
  }

  // Pick the exam whose pattern should drive weighting: the exam type this
  // student has practiced the most (ignoring the pseudo exam types used for
  // subject-wise/chapter practice, which have no real section weights).
  const examTypeCounts = {};
  for (const t of topicStats) {
    if (!t.examType || t.examType === "PRACTICE" || t.examType === "CHAPTER_PRACTICE") continue;
    examTypeCounts[t.examType] = (examTypeCounts[t.examType] || 0) + 1;
  }
  const primaryExamType =
    Object.keys(examTypeCounts).sort((a, b) => examTypeCounts[b] - examTypeCounts[a])[0] || user.examGoals?.[0] || null;

  const pattern = primaryExamType ? await ExamPattern.findOne({ examType: primaryExamType }) : null;
  const weightBySubject = {};
  if (pattern) {
    for (const s of pattern.sections) weightBySubject[s.subject] = s.questionCount;
  }

  // Resolve topic -> chapter using the Subject catalog, so a weak topic can
  // deep-link straight into ChapterPracticeScreen. Question docs generated
  // for mocks/live exams don't carry a chapter (only practice-generated
  // ones do), so this is the only reliable way to recover it.
  const subjectDocs = await Subject.find({ isActive: true }).select("name chapters");
  const chapterByKey = {};
  for (const s of subjectDocs) {
    for (const ch of s.chapters || []) {
      for (const topic of ch.topics || []) {
        chapterByKey[`${s.name}|${topic}`] = ch.name;
      }
    }
  }

  const topics = topicStats
    .map((t) => ({
      subject: t.subject,
      topic: t.topic,
      chapter: chapterByKey[`${t.subject}|${t.topic}`] || null,
      accuracy: t.accuracy,
      attempted: t.attempted,
      correct: t.correct,
      lastAttemptedAt: t.lastAttemptedAt || null,
      examWeight: weightBySubject[t.subject] || null,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const weak = topics.filter((t) => t.accuracy < 60);
  const strong = topics.filter((t) => t.accuracy >= 60);

  // Subject-level rollup: attempt-weighted accuracy across that subject's topics.
  // Uses the raw correct/attempted counts (not accuracy%) so the rollup
  // doesn't compound each topic's independent rounding error.
  const bySubject = {};
  for (const t of topics) {
    if (!bySubject[t.subject]) bySubject[t.subject] = { subject: t.subject, correctSum: 0, attempted: 0, topicsCount: 0, examWeight: t.examWeight };
    const s = bySubject[t.subject];
    s.correctSum += t.correct;
    s.attempted += t.attempted;
    s.topicsCount += 1;
  }
  const subjects = Object.values(bySubject)
    .map((s) => ({
      subject: s.subject,
      accuracy: s.attempted > 0 ? Math.round((s.correctSum / s.attempted) * 100) : 0,
      attempted: s.attempted,
      topicsCount: s.topicsCount,
      examWeight: s.examWeight,
    }))
    // Weakest-and-heaviest-in-the-real-exam first - that's the subject worth fixing first.
    .sort((a, b) => (100 - b.accuracy) * (b.examWeight || 1) - (100 - a.accuracy) * (a.examWeight || 1));

  // Single weakest topic to recommend, weighted by how much it's actually
  // worth in the real exam (a weak topic in a 25-question section matters
  // more than an equally-weak one in a 5-question section).
  let focus = null;
  if (weak.length > 0) {
    focus = [...weak].sort(
      (a, b) => (100 - b.accuracy) * (b.examWeight || 1) - (100 - a.accuracy) * (a.examWeight || 1)
    )[0];
  }

  const overallAccuracy = Math.round(topics.reduce((sum, t) => sum + t.accuracy, 0) / topics.length);

  res.json({
    overall: { accuracy: overallAccuracy, topicsCount: topics.length, strongCount: strong.length, weakCount: weak.length },
    subjects,
    topics,
    focus,
  });
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
    // PYQ is no longer a usage counter - papers from this year and last
    // year are always free, older years need a subscription. Reporting
    // this as a year cutoff instead of a remaining-count, since there's
    // nothing to "use up" anymore.
    pyq: { freeSinceYear: new Date().getFullYear() - 1 },
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
  saveLiveProgress,
  finalizeAttempt,
  getAttemptResult,
  getPyqList,
  getPyqYears,
  getPyqPapersByYear,
  listMyAttempts,
  getAnalysis,
  getFreeLimits,
  getExamSeries,
  getPracticeSeries,
};