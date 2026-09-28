const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");

// One job at a time, on purpose.
//
// The free tier allows about fifteen requests a minute and one test costs
// several, so two jobs at once would spend the first minute being refused.
// Sequential is also what makes the panel's "now building X" honest.
let running = false;

// How many times a job that failed for a reason that might clear is put back
// before it is left as failed for someone to look at.
const MAX_ATTEMPTS = 3;

// A failure that will not clear by retrying: the day's allowance for every
// model is gone. Retrying only spends tomorrow's, so the queue stops.
const isDailyAllowanceGone = (message) =>
  /every model has used its allowance|PerDay|per day|quota exceeded/i.test(String(message || ""));

// A failure that usually clears on its own: the instance was asleep, the
// per-minute limit was hit, or the model was briefly busy.
const isWorthRetrying = (message) =>
  /failed to fetch|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|503|502|504|high demand|rate limit|try again in a minute/i.test(
    String(message || "")
  );

async function runPracticeJob(job) {
  // Required late: the controller pulls in the whole generation stack, and
  // requiring it at module load would put the worker in every import chain.
  //
  // Calling the same function the admin panel calls, deliberately. The first
  // version of this worker built the Test document itself and left out
  // examType, which the model requires - two implementations of "build a
  // practice test" had already drifted apart within the hour.
  const { buildPracticeTest } = require("../controllers/examSeriesController");
  const built = await buildPracticeTest({
    subject: job.subject,
    chapter: job.chapter,
    difficulty: job.difficulty,
  });
  return built.message;
}

async function runMockJob(job) {
  // The mock builder already knows how to assemble a paper section by
  // section from its pattern; the worker only has to call it and record what
  // came back, so there is one implementation of "build a mock", not two.
  const { buildMockForExam } = require("../controllers/examSeriesController");
  const built = await buildMockForExam(job.examType);
  return built.message;
}

/** One tick: take the oldest queued job and see it through. */
async function runGenerationTick() {
  if (running) return;

  const state = await QueueState.get();
  if (state.paused) return;

  const job = await GenerationJob.findOneAndUpdate(
    { status: "queued" },
    { $set: { status: "running", startedAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { queuedAt: 1 }, new: true }
  );
  if (!job) return;

  running = true;
  try {
    const result = job.kind === "practice" ? await runPracticeJob(job) : await runMockJob(job);
    job.status = "done";
    job.result = String(result).slice(0, 300);
    job.finishedAt = new Date();
    await job.save();
  } catch (err) {
    const message = err.message || String(err);
    job.lastError = message.slice(0, 300);

    if (isDailyAllowanceGone(message)) {
      // Put it back - it was never really attempted - and stop the queue so
      // the rest of the run is still there tomorrow instead of failing in a
      // row the way 29 jobs did before this existed.
      job.status = "queued";
      job.attempts = Math.max(0, job.attempts - 1);
      job.startedAt = undefined;
      await job.save();
      await QueueState.updateOne(
        { key: "generation" },
        {
          $set: {
            paused: true,
            pausedBy: "worker",
            pausedAt: new Date(),
            pausedReason: "The day's AI allowance is spent. The queue will carry on when you resume it - the allowance resets at 12:30 PM IST.",
          },
        }
      );
    } else if (isWorthRetrying(message) && job.attempts < MAX_ATTEMPTS) {
      job.status = "queued";
      job.startedAt = undefined;
      await job.save();
    } else {
      job.status = "failed";
      job.finishedAt = new Date();
      await job.save();
    }
  } finally {
    running = false;
  }
}

module.exports = { runGenerationTick, isDailyAllowanceGone, isWorthRetrying, MAX_ATTEMPTS };
