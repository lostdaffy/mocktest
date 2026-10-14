const { todayPlan, quizBoard, runReminders, continueLearning } = require("../services/engagement");
const { showsVisuals } = require("../utils/appVersion");
const { ensureTodayQuiz } = require("../services/dailyQuiz");
const DailyQuiz = require("../models/DailyQuiz");

// GET /api/tests/today-plan -> the Home screen's "Today's plan" card
async function getTodayPlan(req, res) {
  res.json(await todayPlan(req.user));
}

// GET /api/tests/continue -> Home's "Continue learning": resume a test, or the next one
async function getContinue(req, res) {
  res.json({ item: await continueLearning(req.user, { showVisuals: showsVisuals(req) }) });
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
  const result = await runReminders();
  res.json({ ok: true, ...result });
}

module.exports = { getTodayPlan, getQuizBoard, jobsTick, getContinue };
