// Fills one practice series (a chapter's topic at one level - "Percentage ·
// Income and Expenditure · Easy") up to its 10 tests, on the server, with no
// one at the panel. The admin presses Generate once; the queue does the rest
// one step per job, so it carries on through the night and across days:
//
//   1. a test of the series that is short (the AI came up short, or a
//      question was removed) is filled to its 20 first;
//   2. otherwise, while the series has fewer than `target` tests, the next
//      one is built;
//   3. every full test that is still a draft goes live if it is sound: 20
//      questions, all published, no picture missing, no two asking the same
//      thing (the chapter-health rule);
//   4. if the series is not complete, the next step is queued.
//
// A step that runs out of the day's AI allowance throws the queue's own
// allowance message, so the job is put back and resumes after the reset.
const Test = require("../models/Test");
const Question = require("../models/Question");
const GenerationJob = require("../models/GenerationJob");
const { PRACTICE_TEST_SIZE } = require("../utils/practice");
const { looksLikeRepeat } = require("./validationPipeline");
const { plainMaths } = require("./mathNotation");

const DEFAULT_TARGET = 10;
const LEVELS = ["easy", "medium", "hard", "advanced"];

const seriesFilter = ({ subject, chapter, subtopic, difficulty }) => ({
  type: "practice",
  subject,
  topic: chapter,
  subtopic: subtopic || null,
  difficultyLevel: difficulty,
});

const label = ({ subject, chapter, subtopic, difficulty, target = DEFAULT_TARGET }) =>
  `Fill ${subject} · ${chapter}${subtopic ? ` · ${subtopic}` : " · Mixed Practice"} · ${difficulty} to ${target} tests`;

// Why a full test cannot go live yet ("" when it can).
async function notReady(test) {
  if (test.questions.length < PRACTICE_TEST_SIZE) return `${test.questions.length} of ${PRACTICE_TEST_SIZE} questions`;
  const qs = await Question.find({ _id: { $in: test.questions } }).select("text status").lean();
  if (qs.length !== test.questions.length) return "a question no longer exists";
  if (qs.some((q) => q.status !== "published")) return "a question is not published";
  const { imagesPendingIn } = require("./visuals");
  if (await imagesPendingIn(test.questions)) return "a picture is still missing";
  for (let i = 0; i < qs.length; i++)
    for (let j = i + 1; j < qs.length; j++)
      if (looksLikeRepeat(plainMaths(qs[i].text), [plainMaths(qs[j].text)]).repeat) return "two questions ask the same thing";
  return "";
}

async function publishIfReady(test) {
  if (test.publishStatus === "published") return false;
  if (await notReady(test)) return false;
  const { hasVisuals } = require("./visuals");
  await Test.updateOne({ _id: test._id }, { $set: { publishStatus: "published", publishedAt: new Date(), hasVisuals: await hasVisuals(test.questions) } });
  return true;
}

/** One step of filling a series. Returns a line for the job log. */
async function fillSeriesStep(params) {
  const target = params.target || DEFAULT_TARGET;
  const notes = [];
  const listTests = () => Test.find(seriesFilter(params)).sort({ seriesNumber: 1 });
  let tests = await listTests();

  // Full drafts that are sound go live first - nothing to generate for them.
  for (const t of tests) if (await publishIfReady(t)) notes.push(`${t.title} is live`);

  const short = tests.find((t) => t.questions.length < PRACTICE_TEST_SIZE);
  if (short) {
    const { refillTest } = require("./testTopUp");
    const r = await refillTest(short._id);
    if (!r.filled) {
      const where = `${short.title} is at ${r.to} of ${r.target || PRACTICE_TEST_SIZE}`;
      if (/allowance|quota|per day|PerDay/i.test(r.why || "")) throw new Error(`Every model has used its allowance for today - ${where}.`);
      // Nothing added and not the allowance: stop rather than loop on it -
      // the job fails with the reason, and the series waits for the admin.
      if (!r.added) throw new Error(`Could not fill ${where}: ${r.why || "the generator came up short"}`);
      notes.push(`${where} (${r.why || "came up short"})`);
    } else notes.push(`${short.title}: ${r.from} → ${r.to} questions`);
  } else if (tests.length < target) {
    const { buildPracticeTest } = require("../controllers/examSeriesController");
    const built = await buildPracticeTest({ subject: params.subject, chapter: params.chapter, subtopic: params.subtopic, difficulty: params.difficulty });
    notes.push(built.message);
  }

  tests = await listTests();
  for (const t of tests) if (await publishIfReady(t)) notes.push(`${t.title} is live`);
  tests = await listTests(); // as they are now, published ones included

  const live = tests.filter((t) => t.publishStatus === "published" && t.questions.length >= PRACTICE_TEST_SIZE).length;
  const done = tests.length >= target && tests.every((t) => t.questions.length >= PRACTICE_TEST_SIZE);
  if (!done) await queueSeries(params, { next: true });
  notes.push(done ? `Series complete: ${live} of ${tests.length} tests live` : `${live} of ${target} tests live - next step queued`);
  return notes.join(". ");
}

/**
 * Puts a series on the queue (one waiting job per series). `next` is the
 * job queuing its own next step while it is still running.
 */
async function queueSeries({ subject, chapter, subtopic, difficulty, target = DEFAULT_TARGET }, { next = false } = {}) {
  if (!LEVELS.includes(difficulty)) throw new Error(`difficulty must be one of ${LEVELS.join(", ")}`);
  const job = { kind: "practice_series", subject, chapter, subtopic: subtopic || null, difficulty, target };
  const waiting = await GenerationJob.exists({ ...job, status: next ? "queued" : { $in: ["queued", "running"] } });
  if (waiting) return null;
  return GenerationJob.create({ ...job, label: label(job), batch: `series-${subject}-${chapter}-${subtopic || "mixed"}-${difficulty}`, status: "queued" });
}

module.exports = { fillSeriesStep, queueSeries, notReady, publishIfReady, seriesFilter, DEFAULT_TARGET };
