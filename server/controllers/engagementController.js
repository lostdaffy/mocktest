const { todayPlan, quizBoard, runReminders, continueLearning, notificationFeed, recentTests } = require("../services/engagement");
const { showsVisuals } = require("../utils/appVersion");
const { questionOfDay, answerQuestionOfDay } = require("../services/questionOfDay");
const { ensureTodayQuiz } = require("../services/dailyQuiz");
const DailyQuiz = require("../models/DailyQuiz");

// GET /api/tests/today-plan -> the Home screen's "Today's plan" card
async function getTodayPlan(req, res) {
  res.json(await todayPlan(req.user));
}

// GET /api/tests/continue -> Home's "Continue learning": resume a test, or the next one
async function getContinue(req, res) {
  const [item, recent] = await Promise.all([
    continueLearning(req.user, { showVisuals: showsVisuals(req) }),
    recentTests(req.user, { limit: 3 }),
  ]);
  res.json({ item, recent });
}

// GET /api/tests/notifications -> the Notifications screen: what is new for this student
async function getNotifications(req, res) {
  res.json(await notificationFeed(req.user, { showVisuals: showsVisuals(req) }));
}

// GET /api/tests/question-of-day -> Home's Question of the Day (key only once answered)
async function getQuestionOfDay(req, res) {
  res.json(await questionOfDay(req.user._id));
}

// POST /api/tests/question-of-day/answer { selectedIndex } -> the first answer counts
async function postQuestionOfDay(req, res) {
  const r = await answerQuestionOfDay(req.user._id, Number(req.body?.selectedIndex));
  if (r.error) return res.status(400).json({ message: r.error });
  res.json(r);
}

// GET /api/tests/daily-quiz/board?date=YYYY-MM-DD -> the day's quiz ranking
// (today when no date is given)
async function getQuizBoard(req, res) {
  let testId = null;
  if (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
    testId = (await DailyQuiz.findOne({ date: req.query.date }).select("test").lean())?.test || null;
  } else {
    testId = (await ensureTodayQuiz().catch(() => null))?._id || null;
  }
  res.json(await quizBoard(testId, req.user._id, { top: 10 }));
}

// POST /api/jobs/tick (public)
//
// Wakes the free Render instance and sends any reminder that is due. Called
// by the GitHub Actions schedule in .github/workflows/reminders.yml. Public
// on purpose and harmless: every reminder goes out at most once a day, so
// calling it again does nothing.
async function jobsTick(req, res) {
  // The wake-up call is also when the coming days' quizzes are checked:
  // a sleeping free instance may have missed the 5-minute timer for hours.
  await require("../services/dailyQuiz").runDailyQuizTick().catch((e) => console.error("Daily quiz tick:", e.message));
  const result = await runReminders();
  // The night one: every chapter checked, faults sent to the quality desk.
  const health = await require("../services/nightlyHealth").queueNightlyHealth().catch(() => null);
  res.json({ ok: true, ...result, healthQueued: Boolean(health) });
}

module.exports = { getTodayPlan, getQuizBoard, jobsTick, getContinue, getNotifications, getQuestionOfDay, postQuestionOfDay };
