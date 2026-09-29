const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");

// One job at a time, on purpose.
//
// The free tier allows about fifteen requests a minute and one test costs
// several, so two jobs at once would spend the first minute being refused.
// Sequential is also what makes the panel's "now building X" honest.
let running = false;

// Which job this process is actually working on. Without it, the watchdog
// below cannot tell a job that is genuinely taking a while from one whose
// worker died, and would pull a live job out from under itself.
let currentJobId = null;

// How many times a job that failed for a reason that might clear is put back
// before it is left as failed for someone to look at.
const MAX_ATTEMPTS = 3;

// How long a job may sit marked "running" with nobody working on it before
// it is assumed orphaned. Generous: a mock of 150 questions is slow.
const STUCK_AFTER_MS = 25 * 60 * 1000;

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

/**
 * Puts back jobs left marked "running" by a worker that is no longer there.
 *
 * Called with { all: true } at startup, where it is unambiguous: this process
 * has only just begun, so every running job belongs to a dead one. On the
 * regular tick it only touches jobs older than STUCK_AFTER_MS that this
 * process does not own, which covers a build that hung rather than crashed.
 *
 * A job reclaimed MAX_ATTEMPTS times is failed rather than put back, so
 * something that hangs every time cannot loop for ever.
 */
async function reclaimStuckJobs({ all = false } = {}) {
  const orphans = await GenerationJob.find({
    status: "running",
    ...(all ? {} : { startedAt: { $lt: new Date(Date.now() - STUCK_AFTER_MS) } }),
    ...(currentJobId ? { _id: { $ne: currentJobId } } : {}),
  }).select("_id attempts label");

  for (const job of orphans) {
    const giveUp = job.attempts >= MAX_ATTEMPTS;
    await GenerationJob.updateOne(
      { _id: job._id },
      giveUp
        ? {
            $set: {
              status: "failed",
              finishedAt: new Date(),
              lastError: `Stopped part-way through ${job.attempts} times - the server restarts when nobody is using it. Press retry to try again.`,
            },
          }
        : { $set: { status: "queued", lastError: "The server restarted mid-build; put back in the queue." }, $unset: { startedAt: "" } }
    );
    console.log(`Generation: reclaimed "${job.label}" (${giveUp ? "failed" : "requeued"})`);
  }
  return orphans.length;
}

/**
 * Hands the current job back on the way out.
 *
 * Render sends SIGTERM on every deploy. Without this the job in flight waits
 * out STUCK_AFTER_MS before anyone picks it up again.
 */
async function releaseCurrentJob() {
  if (!currentJobId) return;
  await GenerationJob.updateOne(
    { _id: currentJobId, status: "running" },
    { $set: { status: "queued", lastError: "The server was restarted mid-build; put back in the queue." }, $unset: { startedAt: "" } }
  );
  currentJobId = null;
}

/** One tick: take the oldest queued job and see it through. */
async function runGenerationTick() {
  // Outside the running guard on purpose: a stuck job is exactly the case
  // where this process is NOT busy but a row still says it is.
  await reclaimStuckJobs();

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
  currentJobId = job._id;
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
    currentJobId = null;
  }
}

module.exports = {
  runGenerationTick,
  reclaimStuckJobs,
  releaseCurrentJob,
  isDailyAllowanceGone,
  isWorthRetrying,
  MAX_ATTEMPTS,
  STUCK_AFTER_MS,
};
