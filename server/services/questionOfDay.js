const Question = require("../models/Question");
const { QuestionOfDay, QotdAnswer } = require("../models/QuestionOfDay");
const { istDateKey } = require("./dailyQuiz");
const { refersToAPassage } = require("../utils/comprehension");

// Question of the Day: one short question a day for everyone, answered
// right on Home. A small daily habit - ten seconds, and a reason to open the
// app. Picked once per day from the published bank:
//  - no chart or figure, no reading passage, nothing a student reported;
//  - short enough for a card (question and options);
//  - not one used in the last 90 days.
// The answer key is only sent after the student has answered.

const SUBJECTS = ["GK", "Science", "Reasoning", "Maths", "English", "Current Affairs"];
const MAX_TEXT = 220;
const MAX_OPTION = 60;

function fits(q) {
  if (!q?.text || q.text.length > MAX_TEXT) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (q.options.some((o) => !o || String(o).length > MAX_OPTION)) return false;
  return !refersToAPassage(q.text);
}

async function pickQuestion(date) {
  const recent = await QuestionOfDay.find({}).sort({ date: -1 }).limit(90).select("question").lean();
  const used = recent.map((r) => r.question);
  const pool = await Question.aggregate([
    {
      $match: {
        status: "published",
        subject: { $in: SUBJECTS },
        $or: [{ visual: { $exists: false } }, { visual: null }],
        reportCount: { $in: [0, null] },
        _id: { $nin: used },
      },
    },
    { $sample: { size: 40 } },
    { $project: { text: 1, options: 1 } },
  ]);
  const choice = pool.find(fits);
  if (!choice) return null;
  try {
    return await QuestionOfDay.create({ date, question: choice._id });
  } catch (err) {
    // Two requests at midnight: the other one already picked today's.
    if (err.code === 11000) return QuestionOfDay.findOne({ date }).lean();
    throw err;
  }
}

async function todayEntry(now = new Date()) {
  const date = istDateKey(now);
  return (await QuestionOfDay.findOne({ date }).lean()) || (await pickQuestion(date));
}

async function statsFor(date) {
  const [answered, correct] = await Promise.all([
    QotdAnswer.countDocuments({ date }),
    QotdAnswer.countDocuments({ date, correct: true }),
  ]);
  return { answered, correctPct: answered ? Math.round((correct / answered) * 100) : 0 };
}

/** What the app shows: the question, and - once answered - the key and the day's stats. */
async function questionOfDay(userId, now = new Date()) {
  const entry = await todayEntry(now);
  if (!entry) return { date: istDateKey(now), question: null };
  const q = await Question.findById(entry.question)
    .select("text textHi options optionsHi correctIndex solution solutionHi subject topic")
    .lean();
  if (!q) return { date: entry.date, question: null };
  const mine = await QotdAnswer.findOne({ user: userId, date: entry.date }).lean();
  return {
    date: entry.date,
    question: {
      _id: q._id,
      text: q.text,
      textHi: q.textHi || null,
      options: q.options,
      optionsHi: q.optionsHi?.length === 4 ? q.optionsHi : null,
      subject: q.subject,
      topic: q.topic,
    },
    answer: mine
      ? {
          selectedIndex: mine.selectedIndex,
          correct: mine.correct,
          correctIndex: q.correctIndex,
          solution: q.solution || null,
          solutionHi: q.solutionHi || null,
        }
      : null,
    stats: mine ? await statsFor(entry.date) : null,
  };
}

/** The first answer of the day counts; asking again returns that first one. */
async function answerQuestionOfDay(userId, selectedIndex, now = new Date()) {
  const entry = await todayEntry(now);
  if (!entry) return { error: "There is no question today" };
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) return { error: "Pick one of the four options" };
  const q = await Question.findById(entry.question).select("correctIndex").lean();
  if (!q) return { error: "There is no question today" };
  try {
    await QotdAnswer.create({
      user: userId,
      date: entry.date,
      question: entry.question,
      selectedIndex,
      correct: selectedIndex === q.correctIndex,
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // already answered - keep the first
  }
  return questionOfDay(userId, now);
}

module.exports = { questionOfDay, answerQuestionOfDay };
