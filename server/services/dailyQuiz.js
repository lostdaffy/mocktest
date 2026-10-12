const mongoose = require("mongoose");
const Question = require("../models/Question");
const Test = require("../models/Test");
const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");
const { DailyQuiz, DailyQuizSettings } = require("../models/DailyQuiz");

// The Daily GK Quiz: 20 General Knowledge questions, the same for every
// student, a new one each day at 12:00 AM India time.

const QUIZ_SIZE = 20;
const BATCH = 10; // AI questions are made 10 at a time, like a mock section
const GK_SUBJECTS = ["GK", "Current Affairs"];
// A question used in a daily quiz is not used again for this long.
const NO_REPEAT_DAYS = 60;

// What the AI is asked to cover. Static GK only: current-affairs questions
// written from a model's memory go stale or are simply wrong, and a wrong
// "fact" in a daily quiz is worse than none. Current affairs still reach the
// quiz from the bank, where the team has checked them.
const AI_TOPICS = [
  "Ancient, medieval and modern Indian history",
  "Indian and world geography",
  "Indian polity and constitution",
  "Indian economy and government schemes",
  "General science in daily life",
  "Static GK: books and authors, awards, important days, firsts in India",
  "Uttar Pradesh GK",
  "Sports GK",
  "Indian art, culture and festivals",
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Two GK questions that ask the same fact in different words. The bank's
// own repeat check (validationPipeline.looksLikeRepeat) is tuned for maths
// and misses "Who was the founder of X?" against "Who among the following
// founded X?" - the first daily quiz on production had exactly that pair.
// Words are cut to their first six letters so founder/founded match, and two
// questions with the same correct answer need far less overlap to count.
const STOP = new Set(["which", "among", "following", "these", "those", "about", "known", "called", "there", "their", "where", "while", "what", "with", "from", "that", "this", "were", "have", "been", "into", "also", "when", "whom", "whose", "does", "correct", "statement"]);
function stems(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9ऀ-ॿ ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
      .map((w) => w.slice(0, 6))
  );
}
function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let both = 0;
  for (const w of a) if (b.has(w)) both++;
  return both / Math.min(a.size, b.size);
}
const answerOf = (q) => String(q?.options?.[q?.correctIndex] ?? "").trim().toLowerCase();
// The names a question is about - Plassey, Buxar, Bihar, Bengal. Two
// questions worded alike but about different names ("Battle of Plassey" /
// "Battle of Buxar") ask different facts.
function names(text) {
  const words = String(text || "").match(/[A-Za-z][A-Za-z-]+/g) || [];
  return new Set(
    words
      .slice(1) // the first word is capitalised because it starts the sentence
      .filter((w) => /^[A-Z]/.test(w) && !STOP.has(w.toLowerCase()))
      .map((w) => w.toLowerCase().slice(0, 6))
  );
}
function sameFact(q1, q2) {
  const o = overlap(stems(q1.text), stems(q2.text));
  const a1 = answerOf(q1);
  if (a1 && a1 === answerOf(q2) && o >= 0.3) return true;
  if (o < 0.75) return false;
  const n1 = names(q1.text);
  const n2 = names(q2.text);
  return !n1.size || !n2.size || overlap(n1, n2) >= 0.75;
}

// "2026-10-13" for the India date of `when`, or `days` after it.
function istDateKey(when = new Date(), days = 0) {
  const d = new Date(when.getTime() + IST_OFFSET_MS + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

async function getSettings() {
  return (
    (await DailyQuizSettings.findOne({ key: "dailyQuiz" })) ||
    (await DailyQuizSettings.findOneAndUpdate(
      { key: "dailyQuiz" },
      { $setOnInsert: { key: "dailyQuiz" } },
      { upsert: true, new: true }
    ))
  );
}

// Question ids used by daily quizzes in the last NO_REPEAT_DAYS days,
// leaving out one date (the quiz being edited may keep its own questions).
async function recentlyUsedIds(exceptDate) {
  const since = istDateKey(new Date(), -NO_REPEAT_DAYS);
  const tests = await Test.find({ dailyQuizDate: { $gte: since, ...(exceptDate ? { $ne: exceptDate } : {}) } })
    .select("questions")
    .lean();
  return new Set(tests.flatMap((t) => (t.questions || []).map(String)));
}

// `count` published GK/Current Affairs questions nobody has had in a daily
// quiz lately, spread across topics so a quiz is not 20 history questions.
async function pickFromBank(count, { exclude = new Set(), exceptDate } = {}) {
  if (count <= 0) return [];
  const used = await recentlyUsedIds(exceptDate);
  const skip = [...new Set([...used, ...exclude])].map((id) => new mongoose.Types.ObjectId(id));

  const pool = await Question.aggregate([
    { $match: { subject: { $in: GK_SUBJECTS }, status: "published", _id: { $nin: skip } } },
    { $sample: { size: Math.max(count * 15, 120) } },
    { $project: { _id: 1, topic: 1, textKey: 1, options: 1, text: 1, correctIndex: 1 } },
  ]);

  // Round-robin over topics; never two questions with the same text.
  const byTopic = new Map();
  for (const q of pool) {
    if (!q.text || !Array.isArray(q.options) || q.options.length !== 4) continue;
    const key = q.topic || "";
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key).push(q);
  }
  const picked = [];
  const texts = new Set();
  // What is already in the quiz counts too, so a top-up never adds a twin.
  const taken = exclude.size
    ? await Question.find({ _id: { $in: [...exclude] } }).select("text options correctIndex").lean()
    : [];
  const lists = [...byTopic.values()];
  while (picked.length < count && lists.some((l) => l.length)) {
    for (const list of lists) {
      if (picked.length >= count) break;
      while (list.length) {
        const q = list.shift();
        const t = q.textKey || q.text;
        if (texts.has(t) || taken.some((x) => sameFact(x, q))) continue;
        texts.add(t);
        taken.push(q);
        picked.push(q._id);
        break;
      }
    }
  }
  return picked;
}

// Everything that would make a quiz unfit to go live. Empty means fine.
async function quizProblems(test, date) {
  const problems = [];
  if (!test) return ["The quiz has no questions yet."];
  // Ids or populated questions - quizDetail hands over the populated test.
  const ids = (test.questions || []).map((q) => String(q?._id || q));
  if (ids.length !== QUIZ_SIZE) problems.push(`It has ${ids.length} questions; a daily quiz has exactly ${QUIZ_SIZE}.`);
  if (new Set(ids).size !== ids.length) problems.push("The same question appears twice.");

  const qs = await Question.find({ _id: { $in: ids } }).select("subject status text options correctIndex textKey").lean();
  if (qs.length !== new Set(ids).size) problems.push(`${new Set(ids).size - qs.length} question(s) no longer exist.`);
  const notGK = qs.filter((q) => !GK_SUBJECTS.includes(q.subject));
  if (notGK.length) problems.push(`${notGK.length} question(s) are not General Knowledge.`);
  const notPublished = qs.filter((q) => q.status !== "published");
  if (notPublished.length) problems.push(`${notPublished.length} question(s) are not published (still in review or rejected).`);
  const broken = qs.filter(
    (q) => !q.text || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !String(o || "").trim()) || !(q.correctIndex >= 0 && q.correctIndex <= 3)
  );
  if (broken.length) problems.push(`${broken.length} question(s) are incomplete (text, four options or the answer missing).`);
  const keys = qs.map((q) => q.textKey || q.text);
  if (new Set(keys).size !== keys.length) problems.push("Two questions have the same wording.");
  const twins = [];
  for (let i = 0; i < qs.length; i++)
    for (let j = i + 1; j < qs.length; j++) if (sameFact(qs[i], qs[j])) twins.push(i);
  if (twins.length) problems.push(`${twins.length} pair(s) of questions ask the same thing in different words - replace one of each.`);

  const used = await recentlyUsedIds(date);
  const repeats = ids.filter((id) => used.has(id));
  if (repeats.length) problems.push(`${repeats.length} question(s) were in another daily quiz in the last ${NO_REPEAT_DAYS} days.`);
  return problems;
}

// The Test document for a date, created or rewritten with these questions.
async function saveQuizTest(date, questionIds, existingTestId) {
  const fields = {
    title: `Daily GK Quiz - ${prettyDate(date)}`,
    type: "revision",
    examType: "DAILY_GK",
    subject: "GK",
    questions: questionIds,
    durationMinutes: QUIZ_SIZE, // a minute a question
    marksPerQuestion: 1,
    negativeMarking: 0,
    isFree: true,
    publishStatus: "published",
    dailyQuizDate: date,
  };
  if (existingTestId) {
    const t = await Test.findByIdAndUpdate(existingTestId, { $set: fields }, { new: true });
    if (t) return t;
  }
  return Test.create(fields);
}

async function quizWithTest(date) {
  const quiz = await DailyQuiz.findOne({ date });
  const test = quiz?.test ? await Test.findById(quiz.test) : null;
  return { quiz, test };
}

// Make (or complete) the quiz for a date from the published bank: keeps the
// questions it already has, adds what is missing.
async function fillFromBank(date, { status = "ready", by = "auto" } = {}) {
  const { quiz, test } = await quizWithTest(date);
  // Keep only what can stay: published GK, not repeated from a recent quiz,
  // each once. Anything else is dropped and replaced.
  const used = await recentlyUsedIds(date);
  const have = (test?.questions || []).map(String);
  const fit = new Map(
    (await Question.find({ _id: { $in: have }, subject: { $in: GK_SUBJECTS }, status: "published" }).select("text options correctIndex").lean()).map((q) => [String(q._id), q])
  );
  // ...and only the first of two questions that ask the same thing.
  const keep = [];
  for (const id of new Set(have)) {
    const q = fit.get(id);
    if (!q || used.has(id) || keep.some((k) => sameFact(fit.get(k), q))) continue;
    keep.push(id);
    if (keep.length === QUIZ_SIZE) break;
  }
  const add = await pickFromBank(QUIZ_SIZE - keep.length, { exclude: new Set(keep), exceptDate: date });
  const ids = [...keep, ...add.map(String)];
  if (ids.length < QUIZ_SIZE) {
    const err = new Error(
      `Only ${ids.length} unused published GK questions are available - ${QUIZ_SIZE} are needed. Publish more GK questions or turn on AI generation.`
    );
    err.code = "BANK_TOO_SMALL";
    throw err;
  }
  const saved = await saveQuizTest(date, ids, test?._id);
  const source = keep.length ? quiz?.source || "bank" : "bank";
  return DailyQuiz.findOneAndUpdate(
    { date },
    { $set: { test: saved._id, status, source, preparedBy: by }, $unset: { lastError: "" } },
    { upsert: true, new: true }
  );
}

// The quiz students get today. Never returns an incomplete one: a missing or
// short quiz is completed from the bank first (when the team allows it), and
// a draft whose date has arrived goes live if it is complete.
async function ensureTodayQuiz() {
  const date = istDateKey();
  const settings = await getSettings();
  let { quiz, test } = await quizWithTest(date);

  if (quiz?.status === "ready" && test && !(await quizProblems(test, date)).length) return test;

  if (quiz && quiz.status !== "generating" && test && !(await quizProblems(test, date)).length) {
    await DailyQuiz.updateOne({ _id: quiz._id }, { $set: { status: "ready" } });
    return test;
  }

  if (!settings.autoFromBank) return null;
  try {
    quiz = await fillFromBank(date, { status: "ready", by: quiz?.preparedBy || "auto" });
  } catch (err) {
    if (err.code === 11000) quiz = await DailyQuiz.findOne({ date }); // two requests at 12:00 AM
    else {
      await DailyQuiz.updateOne({ date }, { $set: { lastError: err.message } }, { upsert: true });
      return null;
    }
  }
  test = quiz?.test ? await Test.findById(quiz.test) : null;
  return test && !(await quizProblems(test, date)).length ? test : null;
}

// Make 20 new GK questions with AI, in two batches of 10, and turn them into
// the quiz for `date`. Short of 20 after the quality gate, the rest come from
// the bank - an incomplete quiz never goes live.
async function generateQuizWithAI(date, { by = "auto" } = {}) {
  const { createVerifiedQuestions } = require("./questionFactory");
  await DailyQuiz.findOneAndUpdate(
    { date },
    { $set: { status: "generating", source: "ai", preparedBy: by }, $unset: { lastError: "" } },
    { upsert: true }
  );

  const ids = [];
  try {
    for (let b = 0; b < QUIZ_SIZE / BATCH; b++) {
      const offset = (b * 4) % AI_TOPICS.length;
      const topics = [...AI_TOPICS.slice(offset), ...AI_TOPICS.slice(0, offset)];
      const built = await createVerifiedQuestions({
        needed: BATCH,
        tag: {},
        generateParams: {
          examType: "DAILY_GK",
          examDisplayName: "Daily GK Quiz for Indian government exams",
          subject: "GK",
          topic: "General Knowledge",
          difficulty: "medium",
          examLevel:
            "Daily general knowledge quiz for students preparing for Indian government exams (SSC, Railway, UP Police, Banking, TET). Factual, unambiguous, exam-relevant static GK at 10th-12th level. No current affairs from after 2024.",
          syllabusTopics: topics,
        },
      });
      ids.push(...built.ids.map(String));
    }
  } catch (err) {
    await DailyQuiz.updateOne({ date }, { $set: { status: "draft", lastError: err.message } });
    throw err;
  }

  const { test } = await quizWithTest(date);
  const extra = await pickFromBank(QUIZ_SIZE - ids.length, { exclude: new Set(ids), exceptDate: date });
  const all = [...ids, ...extra.map(String)].slice(0, QUIZ_SIZE);
  const saved = await saveQuizTest(date, all, test?._id);
  // The scheduler's quiz goes live by itself; one an admin asked for waits
  // for them to look at it.
  const status = by === "auto" ? "ready" : "draft";
  await DailyQuiz.updateOne({ date }, { $set: { test: saved._id, status, source: "ai" } });
  const problems = await quizProblems(saved, date);
  if (problems.length && status === "ready") {
    await DailyQuiz.updateOne({ date }, { $set: { status: "draft", lastError: problems.join(" ") } });
  }
  return `${prettyDate(date)}: ${ids.length} new AI questions${extra.length ? ` + ${extra.length} from the bank` : ""}${problems.length ? ` - not live: ${problems.join(" ")}` : ""}`;
}

// Put a quiz date on the generation queue (one job per date).
async function queueAIQuiz(date, by = "auto") {
  const waiting = await GenerationJob.findOne({ kind: "daily_quiz", quizDate: date, status: { $in: ["queued", "running"] } });
  if (waiting) return waiting;
  await DailyQuiz.findOneAndUpdate({ date }, { $set: { status: "generating", source: "ai", preparedBy: by } }, { upsert: true });
  return GenerationJob.create({
    kind: "daily_quiz",
    quizDate: date,
    requestedBy: by,
    label: `Daily GK Quiz - ${prettyDate(date)}`,
    batch: `daily-${date}`,
  });
}

// Swap one question for another: a chosen one, or the next fitting one from
// the bank. Removing a question always puts one back, so a quiz is never
// left short.
async function replaceQuestion(date, questionId, withId) {
  const { quiz, test } = await quizWithTest(date);
  if (!quiz || !test) throw Object.assign(new Error("There is no quiz for this date yet."), { status: 404 });
  const ids = test.questions.map(String);
  const at = ids.indexOf(String(questionId));
  if (at < 0) throw Object.assign(new Error("That question is not in this quiz."), { status: 404 });

  let next = withId ? String(withId) : null;
  if (next) {
    const q = await Question.findById(next).select("subject status").lean();
    if (!q) throw Object.assign(new Error("Question not found."), { status: 404 });
    if (!GK_SUBJECTS.includes(q.subject)) throw Object.assign(new Error("Only General Knowledge questions can go in the daily quiz."), { status: 400 });
    if (q.status !== "published") throw Object.assign(new Error("Only published questions can go in the daily quiz."), { status: 400 });
    if (ids.includes(next)) throw Object.assign(new Error("That question is already in this quiz."), { status: 400 });
  } else {
    const [pick] = await pickFromBank(1, { exclude: new Set(ids), exceptDate: date });
    if (!pick) throw Object.assign(new Error("No unused published GK question is left to put in its place."), { status: 409 });
    next = String(pick);
  }
  ids[at] = next;
  await saveQuizTest(date, ids, test._id);
  return quizDetail(date);
}

async function setStatus(date, status) {
  const { quiz, test } = await quizWithTest(date);
  if (!quiz) throw Object.assign(new Error("There is no quiz for this date yet."), { status: 404 });
  if (status === "ready") {
    const problems = await quizProblems(test, date);
    if (problems.length) throw Object.assign(new Error(`Not ready: ${problems.join(" ")}`), { status: 400 });
  }
  await DailyQuiz.updateOne({ date }, { $set: { status } });
  return quizDetail(date);
}

async function quizDetail(date) {
  const quiz = await DailyQuiz.findOne({ date }).lean();
  const test = quiz?.test
    ? await Test.findById(quiz.test).populate("questions", "text textHi options optionsHi correctIndex solution solutionHi subject topic status").lean()
    : null;
  const job = await GenerationJob.findOne({ kind: "daily_quiz", quizDate: date }).sort({ createdAt: -1 }).lean();
  return {
    date,
    label: prettyDate(date),
    today: date === istDateKey(),
    quiz: quiz || null,
    questions: test?.questions || [],
    problems: test ? await quizProblems(test, date) : quiz ? ["The quiz has no questions yet."] : [],
    job: job ? { status: job.status, lastError: job.lastError, result: job.result } : null,
  };
}

// The scheduler's share, run every few minutes: today is always covered from
// the bank, and with AI on, the coming days are queued for generation.
async function runDailyQuizTick() {
  const settings = await getSettings();
  if (settings.autoFromBank) await ensureTodayQuiz().catch((e) => console.error("Daily quiz (today):", e.message));
  if (!settings.autoAI) return;
  const state = await QueueState.findOne({ key: "generation" }).lean();
  if (state?.paused) return; // nothing would run anyway
  for (let d = 1; d <= settings.daysAhead; d++) {
    const date = istDateKey(new Date(), d);
    const quiz = await DailyQuiz.findOne({ date }).lean();
    if (quiz && (quiz.status === "ready" || quiz.test)) continue; // done, or someone is working on it
    await queueAIQuiz(date, "auto");
  }
}

module.exports = {
  sameFact,
  QUIZ_SIZE,
  GK_SUBJECTS,
  NO_REPEAT_DAYS,
  istDateKey,
  getSettings,
  pickFromBank,
  quizProblems,
  fillFromBank,
  ensureTodayQuiz,
  generateQuizWithAI,
  queueAIQuiz,
  replaceQuestion,
  setStatus,
  quizDetail,
  runDailyQuizTick,
};
