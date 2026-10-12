const { DailyQuiz, DailyQuizSettings } = require("../models/DailyQuiz");
const dq = require("../services/dailyQuiz");

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fail = (res, err) => res.status(err.status || 400).json({ message: err.message });
const who = (req) => req.user?.name || "admin";

// GET /api/daily-quiz -> the last week and the coming fortnight, one row a day
async function listQuizzes(req, res) {
  const from = dq.istDateKey(new Date(), -7);
  const to = dq.istDateKey(new Date(), 14);
  const rows = await DailyQuiz.find({ date: { $gte: from, $lte: to } }).lean();
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const days = [];
  for (let d = -7; d <= 14; d++) {
    const date = dq.istDateKey(new Date(), d);
    const r = byDate.get(date);
    days.push({
      date,
      today: d === 0,
      past: d < 0,
      status: r?.status || "none",
      source: r?.source || null,
      preparedBy: r?.preparedBy || null,
      lastError: r?.lastError || null,
    });
  }
  const settings = await dq.getSettings();
  res.json({ today: dq.istDateKey(), days, settings, quizSize: dq.QUIZ_SIZE });
}

// GET /api/daily-quiz/:date -> one quiz with its questions and anything wrong with it
async function getQuiz(req, res) {
  if (!DATE.test(req.params.date)) return res.status(400).json({ message: "Dates look like 2026-10-13." });
  res.json(await dq.quizDetail(req.params.date));
}

// POST /api/daily-quiz/:date/fill-bank -> 20 (or the missing ones) from the published GK bank, as a draft
async function fillFromBank(req, res) {
  try {
    await dq.fillFromBank(req.params.date, { status: "draft", by: who(req) });
    res.json({ message: "Filled from the question bank. Review it, then mark it ready.", ...(await dq.quizDetail(req.params.date)) });
  } catch (err) {
    fail(res, err);
  }
}

// POST /api/daily-quiz/:date/generate-ai -> queue 20 new AI questions (2 batches of 10)
async function generateAI(req, res) {
  try {
    if (req.params.date < dq.istDateKey()) return res.status(400).json({ message: "That day has already passed." });
    await dq.queueAIQuiz(req.params.date, who(req));
    res.json({
      message: "Queued on the Generation page. It is made in two batches of 10 and left as a draft for you to review.",
      ...(await dq.quizDetail(req.params.date)),
    });
  } catch (err) {
    fail(res, err);
  }
}

// POST /api/daily-quiz/:date/replace { questionId, withId? } -> swap one question
async function replaceQuestion(req, res) {
  try {
    const { questionId, withId } = req.body || {};
    if (!questionId) return res.status(400).json({ message: "Which question?" });
    res.json(await dq.replaceQuestion(req.params.date, questionId, withId));
  } catch (err) {
    fail(res, err);
  }
}

// PATCH /api/daily-quiz/:date/status { status: "ready" | "draft" }
async function setStatus(req, res) {
  try {
    const { status } = req.body || {};
    if (!["ready", "draft"].includes(status)) return res.status(400).json({ message: "Status is ready or draft." });
    res.json(await dq.setStatus(req.params.date, status));
  } catch (err) {
    fail(res, err);
  }
}

// PATCH /api/daily-quiz/settings { autoFromBank?, autoAI?, daysAhead? }
async function updateSettings(req, res) {
  const { autoFromBank, autoAI, daysAhead } = req.body || {};
  const set = {};
  if (typeof autoFromBank === "boolean") set.autoFromBank = autoFromBank;
  if (typeof autoAI === "boolean") set.autoAI = autoAI;
  if (daysAhead !== undefined) {
    const n = parseInt(daysAhead, 10);
    if (!(n >= 1 && n <= 7)) return res.status(400).json({ message: "Days ahead is between 1 and 7." });
    set.daysAhead = n;
  }
  const settings = await DailyQuizSettings.findOneAndUpdate({ key: "dailyQuiz" }, { $set: set }, { upsert: true, new: true });
  res.json({ message: "Saved", settings });
}

module.exports = { listQuizzes, getQuiz, fillFromBank, generateAI, replaceQuestion, setStatus, updateSettings };
