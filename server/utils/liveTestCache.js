const Test = require("../models/Test");
const Question = require("../models/Question");

// A live exam's QUESTIONS, held in memory while everyone is sitting it.
//
// Every student opening the exam, and every student submitting it, used to
// read the same 100 questions out of the database again - 340 students meant
// 340 identical reads at the start and 340 more at the closing bell, the two
// moments the server can least afford them.
//
// Only the questions are held. The test itself - its start time, its status -
// is read fresh on every request: the first version held the whole test, and
// an exam rescheduled by the admin went on answering "hasn't started yet" to
// students for up to a minute after it had started. A cheap indexed read of
// one small document buys that correctness; the 100-question read is the
// expensive part, and that is the part shared.
//
// Only a published live exam is shared this way. Every other test is loaded
// exactly as it always was.

const TTL_MS = 60 * 1000;
const cache = new Map(); // key -> { value, expires }
const inFlight = new Map(); // key -> promise, so a crowd arriving together shares one read

// What a student is shown: no answer key, no solution.
const STUDENT_FIELDS = "text textHi options optionsHi subject topic difficulty";

async function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (inFlight.has(key)) return inFlight.get(key);
  const p = loader()
    .then((value) => {
      cache.set(key, { value, expires: Date.now() + TTL_MS });
      return value;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

// $in returns documents in whatever order the database likes; a paper has to
// come back in its own order.
async function questionsInOrder(ids, select) {
  const q = Question.find({ _id: { $in: ids } });
  if (select) q.select(select);
  const docs = await q;
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return ids.map((id) => byId.get(String(id))).filter(Boolean);
}

async function load(testId, which) {
  const test = await Test.findById(testId);
  if (!test) return null;
  const select = which === "student" ? STUDENT_FIELDS : null;

  if (!(test.type === "live" && test.publishStatus === "published")) {
    // Exactly as before for everything that is not a live exam in progress.
    await test.populate(select ? { path: "questions", select } : "questions");
    return test;
  }

  const ids = test.questions;
  const questions = await cached(`${testId}:${which}:${ids.length}`, () => questionsInOrder(ids, select));
  return { ...test.toObject(), questions };
}

/** The test as a student may see it - no answer key. */
const testForStudent = (testId) => load(testId, "student");

/** The test with its answer key, for grading. Never sent to a phone. */
const testForGrading = (testId) => load(testId, "grading");

function forget(testId) {
  for (const key of cache.keys()) if (key.startsWith(`${testId}:`)) cache.delete(key);
}

module.exports = { testForStudent, testForGrading, forget, TTL_MS };
