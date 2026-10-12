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

module.exports = { todayPlan, quizBoard, runReminders, shortName, streakOf };
