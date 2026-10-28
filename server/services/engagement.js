const Attempt = require("../models/Attempt");
const Test = require("../models/Test");
const User = require("../models/User");
const Subject = require("../models/Subject");
const ExamPattern = require("../models/ExamPattern");
const ReminderLog = require("../models/ReminderLog");
const { ensureTodayQuiz, istDateKey } = require("./dailyQuiz");
const { subjectsForExams, chaptersForExams } = require("./catalog");
const { sendPushNotifications } = require("./pushService");

// What brings a student back every day, and tells a new one where to start.
//
//  - todayPlan(): one card on Home - today's GK quiz, one practice test, the
//    week's mock - each with the exact place to go, so nobody has to work out
//    what to do next.
//  - quizBoard(): everyone gets the same 20 quiz questions, so the day has a
//    rank. "You came 12th of 340" is the reason to come back tomorrow.
//  - runReminders(): 7 AM "today's quiz is live", 8 PM "your streak ends
//    tonight" to the students whose streak is actually at risk. Each goes out
//    once a day however many times it is asked for.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DONE = ["submitted", "auto_submitted"];

const startOfIstDay = (when = new Date()) => {
  const ist = new Date(when.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
};
const istHour = (when = new Date()) => new Date(when.getTime() + IST_OFFSET_MS).getUTCHours();

// "Satya Prakash" -> "Satya P." - a leaderboard is public to every student.
function shortName(name) {
  const parts = String(name || "Student").trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

function streakOf(user) {
  const today = istDateKey();
  const yesterday = istDateKey(new Date(), -1);
  const last = user.lastActiveDate ? istDateKey(user.lastActiveDate) : null;
  const alive = last === today || last === yesterday;
  return {
    current: alive ? user.streakCount || 0 : 0,
    best: Math.max(user.bestStreak || 0, alive ? user.streakCount || 0 : 0),
    practisedToday: last === today,
    atRiskToday: alive && last !== today,
  };
}

/**
 * Today's quiz ranking. A student's FIRST finished attempt counts - taking
 * it again after seeing the answers would otherwise top the board. Ties go
 * to whoever was quicker.
 */
async function quizBoard(testId, userId, { top = 10 } = {}) {
  if (!testId) return { participants: 0, top: [], me: null };
  const rows = await Attempt.aggregate([
    { $match: { test: testId, status: { $in: DONE } } },
    { $sort: { submittedAt: 1, createdAt: 1 } },
    {
      $group: {
        _id: "$user",
        attemptId: { $first: "$_id" },
        score: { $first: "$score" },
        correct: { $first: "$correctCount" },
        seconds: { $first: "$totalTimeTakenSeconds" },
        at: { $first: "$submittedAt" },
      },
    },
    // Ties go to the quicker student, then to whoever finished first.
    { $sort: { score: -1, correct: -1, seconds: 1, at: 1 } },
  ]);
  const users = await User.find({ _id: { $in: rows.slice(0, top).map((r) => r._id) } })
    .select("name")
    .lean();
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));
  const mine = userId ? rows.findIndex((r) => String(r._id) === String(userId)) : -1;
  return {
    participants: rows.length,
    top: rows.slice(0, top).map((r, i) => ({
      rank: i + 1,
      name: shortName(nameOf.get(String(r._id))),
      correct: r.correct,
      seconds: r.seconds,
      isMe: String(r._id) === String(userId),
    })),
    me:
      mine >= 0
        ? { rank: mine + 1, correct: rows[mine].correct, seconds: rows[mine].seconds, attemptId: rows[mine].attemptId }
        : null,
  };
}

// The chapter to suggest: the one they last practised, else the first
// chapter of their exam's first subject.
async function practiceSuggestion(user) {
  const last = await Attempt.findOne({ user: user._id })
    .sort({ createdAt: -1 })
    .populate({ path: "test", select: "type subject topic" })
    .select("test createdAt")
    .lean();
  if (last?.test && ["practice", "topic_wise"].includes(last.test.type) && last.test.subject && last.test.topic) {
    return { subject: last.test.subject, chapter: last.test.topic, reason: "continue" };
  }
  const names = await subjectsForExams(user.examGoals || []);
  const subject = names.length
    ? await Subject.findOne({ name: names[0], isActive: true }).lean()
    : await Subject.findOne({ isActive: true }).sort({ displayOrder: 1 }).lean();
  const chapter = chaptersForExams(subject?.chapters || [], user.examGoals || [])[0];
  return subject && chapter ? { subject: subject.name, chapter: chapter.name, reason: "start" } : null;
}

/** The Home screen's "Today's plan". */
async function todayPlan(user) {
  const dayStart = startOfIstDay();
  const weekStart = new Date(dayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const quizTest = await ensureTodayQuiz().catch(() => null);
  const recent = await Attempt.find({ user: user._id, createdAt: { $gte: weekStart } })
    .populate({ path: "test", select: "type dailyQuizDate examStage" })
    .select("test status createdAt score correctCount")
    .lean();
  const today = recent.filter((a) => a.createdAt >= dayStart);

  const quizAttempt = quizTest
    ? recent.filter((a) => String(a.test?._id) === String(quizTest._id) && DONE.includes(a.status)).sort((a, b) => a.createdAt - b.createdAt)[0]
    : null;
  const practisedToday = today.some((a) => ["practice", "topic_wise"].includes(a.test?.type) && DONE.includes(a.status));
  const mockThisWeek = recent.some((a) => a.test?.type === "full_mock" && DONE.includes(a.status));

  const board = quizAttempt ? await quizBoard(quizTest._id, user._id, { top: 0 }) : null;
  const examType = user.examGoals?.[0] || null;
  const pattern = examType ? await ExamPattern.findOne({ examType }).select("displayName").lean() : null;

  const steps = [
    {
      key: "quiz",
      title: "Daily GK Quiz",
      subtitle: quizTest ? `${quizTest.questions.length} questions · everyone gets the same quiz` : "Today's quiz is being prepared",
      done: !!quizAttempt,
      available: !!quizTest,
      testId: quizTest?._id || null,
      result: quizAttempt
        ? { attemptId: quizAttempt._id, correct: quizAttempt.correctCount, rank: board?.me?.rank || null, participants: board?.participants || 0 }
        : null,
    },
    {
      key: "practice",
      title: "Practice one test",
      done: practisedToday,
      available: true,
      suggestion: await practiceSuggestion(user),
    },
    {
      key: "mock",
      title: "Mock test of the week",
      subtitle: pattern ? `A full ${pattern.displayName} paper, timed like the real exam` : "A full paper, timed like the real exam",
      done: mockThisWeek,
      available: !!examType,
      examStage: examType,
      examName: pattern?.displayName || examType,
    },
  ];
  steps[1].subtitle = steps[1].suggestion
    ? `${steps[1].suggestion.reason === "continue" ? "Continue" : "Start with"} ${steps[1].suggestion.chapter} · ${steps[1].suggestion.subject}`
    : "Pick any chapter";

  const doneCount = steps.filter((s) => s.done).length;
  return {
    date: istDateKey(),
    streak: streakOf(user),
    steps,
    done: doneCount,
    total: steps.length,
    // The one thing to do next, so the card can lead with a single button.
    next: steps.find((s) => !s.done && s.available)?.key || null,
  };
}

/**
 * "Continue learning" on Home: the one thing to pick up again.
 *
 *  - a test left half-way (practice, mock, PYQ) -> resume it;
 *  - else the last practice test finished -> its score, and the next test
 *    of the same series not yet taken (the next level when the series is
 *    done), so one tap starts it;
 *  - else nothing - the Today's plan card already says where to begin.
 *
 * showVisuals: false for an app that cannot draw charts or figures.
 */
const LEVEL_ORDER = ["easy", "medium", "hard", "advanced"];
const RESUMABLE = ["practice", "topic_wise", "full_mock", "pyq", "sectional", "revision"];
async function continueLearning(user, { showVisuals = true } = {}) {
  const testFields = "title type subject topic subtopic difficultyLevel seriesNumber isFree questions publishStatus";
  const open = await Attempt.findOne({ user: user._id, status: "in_progress" })
    .sort({ updatedAt: -1 })
    .populate({ path: "test", select: testFields })
    .select("test answers updatedAt")
    .lean();
  if (open?.test && RESUMABLE.includes(open.test.type) && open.test.publishStatus !== "draft") {
    return {
      kind: "resume",
      testId: open.test._id,
      title: open.test.title,
      type: open.test.type,
      answered: (open.answers || []).filter((a) => a.selectedIndex !== null && a.selectedIndex !== undefined).length,
      total: (open.test.questions || []).length,
      isFree: !!open.test.isFree,
    };
  }

  const recent = await Attempt.find({ user: user._id, status: { $in: DONE } })
    .sort({ createdAt: -1 })
    .limit(15)
    .populate({ path: "test", select: testFields })
    .select("test accuracy createdAt")
    .lean();
  const last = recent.find((a) => a.test && a.test.type === "practice" && a.test.subject && a.test.topic);
  if (!last) return null;

  const t = last.test;
  const taken = await Attempt.distinct("test", { user: user._id });
  const base = {
    type: "practice",
    subject: t.subject,
    topic: t.topic,
    subtopic: t.subtopic || null,
    publishStatus: "published",
    liveExclusive: { $ne: true },
    _id: { $nin: taken },
    ...(showVisuals ? {} : { hasVisuals: { $ne: true } }),
  };
  // The same level first; once that series is done, the next level up.
  let next = null;
  const from = Math.max(LEVEL_ORDER.indexOf(t.difficultyLevel), 0);
  for (const level of LEVEL_ORDER.slice(from)) {
    next = await Test.findOne({ ...base, difficultyLevel: level }).sort({ seriesNumber: 1, createdAt: 1 }).select("title isFree difficultyLevel").lean();
    if (next) break;
  }
  return {
    kind: "next",
    subject: t.subject,
    chapter: t.topic,
    subtopic: t.subtopic || null,
    lastTitle: t.title,
    lastAttemptId: last._id,
    lastAccuracy: Math.round(last.accuracy || 0),
    next: next ? { testId: next._id, title: next.title, isFree: !!next.isFree, level: next.difficultyLevel } : null,
  };
}

/**
 * The tests a student used most recently, for Home's Continue learning:
 * one line per test (its latest attempt), newest first - a half-done one to
 * resume, a finished one to review. Live exams are left out: they cannot
 * be resumed once their window closes.
 */
const shareOf = (a) => {
  const total = (a.correctCount || 0) + (a.wrongCount || 0) + (a.skippedCount || 0);
  return total > 0 ? Math.round(((a.correctCount || 0) / total) * 100) : Math.round(a.accuracy || 0);
};

async function recentTests(user, { limit = 3 } = {}) {
  const rows = await Attempt.find({ user: user._id })
    .sort({ updatedAt: -1 })
    .limit(25)
    .populate({ path: "test", select: "title type examType isFree questions publishStatus" })
    .select("test status accuracy answers updatedAt correctCount wrongCount skippedCount")
    .lean();
  const seen = new Set();
  const out = [];
  for (const a of rows) {
    const t = a.test;
    if (!t || t.type === "live" || seen.has(String(t._id))) continue;
    seen.add(String(t._id));
    const inProgress = a.status === "in_progress";
    if (inProgress && t.publishStatus === "draft") continue;
    out.push({
      testId: t._id,
      title: t.title,
      type: t.type,
      dailyQuiz: t.examType === "DAILY_GK",
      inProgress,
      attemptId: a._id,
      // Right answers out of every question (1 right, 19 skipped is 5%, not
      // the 100% of right / attempted).
      accuracy: inProgress ? null : shareOf(a),
      answered: inProgress ? (a.answers || []).filter((x) => x.selectedIndex !== null && x.selectedIndex !== undefined).length : null,
      total: (t.questions || []).length,
      isFree: !!t.isFree,
      at: a.updatedAt,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * The app's Notifications screen: what is new for this student, newest
 * first. Built on the spot from what already exists - today's quiz (or the
 * rank they got in it), a streak that ends tonight, live exams coming up,
 * and mocks newly published for their exam - so nothing has to be stored
 * per student. Each item has a stable id and an `at` time; the app keeps the
 * time it last opened the screen and shows a dot on Home for anything newer.
 */
async function notificationFeed(user, { showVisuals = true } = {}) {
  const now = new Date();
  const dayStart = startOfIstDay(now);
  const items = [];

  const quiz = await ensureTodayQuiz().catch(() => null);
  if (quiz) {
    const board = await quizBoard(quiz._id, user._id, { top: 0 });
    if (board.me) {
      items.push({
        id: `quiz-rank-${istDateKey(now)}`,
        kind: "quiz_rank",
        title: `You ranked #${board.me.rank} of ${board.participants} in today's quiz`,
        body: `${board.me.correct} correct. See who is on top today.`,
        at: dayStart,
        action: { screen: "QuizBoard" },
      });
    } else {
      items.push({
        id: `quiz-${istDateKey(now)}`,
        kind: "quiz",
        title: "Today's GK quiz is live",
        body: "20 questions, the same for everyone. Play and see your rank.",
        at: dayStart,
        action: { screen: "QuizBoard" },
      });
    }
  }

  const streak = streakOf(user);
  if (streak.atRiskToday && streak.current > 0) {
    items.push({
      id: `streak-${istDateKey(now)}`,
      kind: "streak",
      title: `Keep your ${streak.current}-day streak 🔥`,
      body: "Finish any one test today - it ends at midnight.",
      at: dayStart,
      action: { screen: "HomeTab" },
    });
  }

  const goals = user.examGoals || [];
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const visuals = showVisuals ? {} : { hasVisuals: { $ne: true } };
  const [live, mocks] = await Promise.all([
    Test.find({ type: "live", publishStatus: "published", scheduledAt: { $gte: now, $lte: weekAhead }, ...visuals })
      .sort({ scheduledAt: 1 })
      .limit(5)
      .select("title scheduledAt publishedAt createdAt")
      .lean(),
    goals.length
      ? Test.find({
          type: "full_mock",
          examStage: { $in: goals },
          publishStatus: "published",
          liveExclusive: { $ne: true },
          publishedAt: { $gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
          ...visuals,
        })
          .sort({ publishedAt: -1 })
          .limit(5)
          .select("title examStage publishedAt")
          .lean()
      : [],
  ]);
  for (const t of live) {
    items.push({
      id: `live-${t._id}`,
      kind: "live",
      title: `Live exam: ${t.title}`,
      body: `Starts ${new Date(t.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. Same paper, same clock, all-India rank.`,
      at: t.publishedAt || t.createdAt,
      action: { screen: "LiveTab" },
    });
  }
  for (const t of mocks) {
    items.push({
      id: `mock-${t._id}`,
      kind: "mock",
      title: "New mock test added",
      body: t.title,
      at: t.publishedAt,
      action: { screen: "ExamSeries", params: { examStage: t.examStage } },
    });
  }

  // The admin's own messages of the last 14 days (services/broadcast.js).
  items.push(...(await require("./broadcast").forStudent(user, now).catch(() => [])));

  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  return { items, serverTime: now };
}

/** Sends a round once: the key is claimed first, so a second caller does nothing. */
async function sendOnce(key, build) {
  try {
    await ReminderLog.create({ key });
  } catch (err) {
    if (err.code === 11000) return { key, skipped: true };
    throw err;
  }
  const { tokens, title, body, data } = await build();
  const { sent } = await sendPushNotifications(tokens, { title, body, data });
  await ReminderLog.updateOne({ key }, { $set: { sent } });
  return { key, sent };
}

/**
 * The day's reminders, each at most once. Safe to call as often as anyone
 * likes - the server's own timer does every few minutes, and an outside
 * scheduler wakes the free Render instance at 7 AM and 8 PM to call it.
 */
async function runReminders(now = new Date()) {
  const day = istDateKey(now);
  const hour = istHour(now);
  const out = [];

  // 7 AM - 11 AM: today's quiz is live. Not sent later than that: a "your
  // morning quiz is live" at 3 PM reads like a bug.
  if (hour >= 7 && hour < 11) {
    const quiz = await ensureTodayQuiz().catch(() => null);
    if (quiz) {
      out.push(
        await sendOnce(`quiz-live:${day}`, async () => ({
          tokens: (await User.find({ pushToken: { $exists: true, $ne: null }, role: { $ne: "admin" } }).select("pushToken").lean()).map((u) => u.pushToken),
          title: "Today's GK Quiz is live",
          body: "20 questions, same for everyone. See where you rank today.",
          data: { screen: "Home", kind: "daily_quiz" },
        }))
      );
    }
  }

  // 8 PM - 10 PM: only to students who practised yesterday and not yet
  // today - the ones whose streak actually ends at midnight.
  if (hour >= 20 && hour < 22) {
    out.push(
      await sendOnce(`streak-risk:${day}`, async () => {
        const yesterday = startOfIstDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
        const todayStart = startOfIstDay(now);
        const users = await User.find({
          pushToken: { $exists: true, $ne: null },
          role: { $ne: "admin" },
          streakCount: { $gte: 1 },
          lastActiveDate: { $gte: yesterday, $lt: todayStart },
        })
          .select("pushToken streakCount")
          .lean();
        return {
          tokens: users.map((u) => u.pushToken),
          title: "Your streak ends at midnight",
          body: "One quick test keeps it going. The daily quiz takes 10 minutes.",
          data: { screen: "Home", kind: "streak" },
        };
      })
    );
  }
  return { day, hour, rounds: out };
}

module.exports = { todayPlan, quizBoard, runReminders, shortName, streakOf, continueLearning, notificationFeed, recentTests };
