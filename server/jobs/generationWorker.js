const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");
const { resumeTime, istTime } = require("../utils/aiAllowance");

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

// ---- the AI quality desk (services/qualityDesk.js)

const AUDIT_BATCH = 20;
const qualityNote = (r) =>
  [`Checked ${r.checked}`, `${r.sound} sound`, r.proposed && `${r.proposed} fixed or proposed`, r.applied && `${r.applied} applied`, r.flagged && `${r.flagged} flagged for the admin`]
    .filter(Boolean)
    .join(", ");

// A spreadsheet's new questions, checked by the AI. When the allowance runs
// out part-way the job keeps only the questions not yet judged and goes back
// in the queue, so nothing is checked twice and nothing is skipped.
async function runQualityCheckJob(job) {
  const { checkQuestions } = require("../services/qualityDesk");
  const r = await checkQuestions(job.questionIds || [], { source: job.source || "csv" });
  if (r.unjudged.length) {
    job.questionIds = r.unjudged;
    await job.save();
    throw new Error(`Every model has used its allowance for today - ${r.unjudged.length} question(s) still to check.`);
  }
  return qualityNote(r);
}

// Every chapter's practice tests checked the way the chapter-health screen
// checks them; each fault gets a replacement through the quality desk
// (services/nightlyHealth.js). Queued once a night by the reminders tick.
async function runChapterHealthJob() {
  const { runNightlyHealth, healthNote } = require("../services/nightlyHealth");
  const r = await runNightlyHealth();
  if (r.aiOut) throw new Error(`Every model has used its allowance for today - ${healthNote(r)}`);
  return healthNote(r);
}

// The whole bank, a batch at a time, from where the last batch stopped
// (QualitySettings.auditCursor). Each batch queues the next.
async function runQualityAuditJob(job) {
  const QualitySettings = require("../models/QualitySettings");
  const Question = require("../models/Question");
  const { checkQuestions } = require("../services/qualityDesk");
  const settings = await QualitySettings.get();
  const filter = { status: "published", ...(settings.auditCursor ? { _id: { $gt: settings.auditCursor } } : {}) };
  const batch = (await Question.find(filter).sort({ _id: 1 }).limit(AUDIT_BATCH).select("_id").lean()).map((q) => q._id);
  if (!batch.length) {
    await QualitySettings.updateOne({ key: "quality" }, { $set: { auditFinishedAt: new Date() }, $unset: { auditCursor: "" } });
    return `The whole bank has been audited (${settings.auditChecked} questions)`;
  }
  const r = await checkQuestions(batch, { source: "audit" });
  // The cursor moves past every question judged, and stops before the first
  // one the AI could not reach.
  const unjudged = new Set(r.unjudged.map(String));
  const firstOpen = batch.findIndex((id) => unjudged.has(String(id)));
  const done = firstOpen === -1 ? batch : batch.slice(0, firstOpen);
  if (done.length) {
    await QualitySettings.updateOne({ key: "quality" }, { $set: { auditCursor: done[done.length - 1] }, $inc: { auditChecked: done.length } });
  }
  if (firstOpen !== -1) throw new Error("Every model has used its allowance for today - the bank audit carries on after the reset.");
  await GenerationJob.create({ kind: "quality_audit", label: "AI audit of the question bank", status: "queued", batch: job.batch });
  return qualityNote(r);
}

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
    subtopic: job.subtopic,
    difficulty: job.difficulty,
  });
  return built.message;
}

// Fills one practice test up to its size - the old 12-question tests to 20.
async function runTopUpJob(job) {
  const { refillTest } = require("../services/testTopUp");
  const r = await refillTest(job.testId);
  if (r.filled) return r.added ? `${r.title}: ${r.from} → ${r.to} questions` : `${r.title} was already full`;
  if (r.why === "test not found") return "The test was deleted before it could be topped up";
  // Whatever was added stays; another go picks up from there. Worded so the
  // checks below the tick recognise an allowance stop or a passing failure.
  const where = `${r.title} is at ${r.to} of ${r.target}`;
  if (isDailyAllowanceGone(r.why)) throw new Error(`Every model has used its allowance for today - ${where}.`);
  throw new Error(`${where} (${r.why || "the generator came up short"}) - try again in a minute to finish it.`);
}

// Reads an uploaded past paper. A last failure marks the upload failed with
// its reason, so the PYQ page says so instead of showing it stuck at reading.
// The day's lessons from rejected questions (services/lessons.js).
async function runLessonsJob() {
  const done = await require("../services/lessons").refreshLessons();
  return done.length ? done.map((d) => `${d.subject}: ${d.lessons} lesson(s) from ${d.mistakes} mistake(s)`).join("; ") : "Too few rejected questions to learn from yet";
}

// Reads one of the admin's reference papers (services/referenceLearning.js).
async function runReferenceJob(job) {
  const { readReference } = require("../services/referenceLearning");
  const ReferenceGuide = require("../models/ReferenceGuide");
  try {
    return await readReference(job.reference);
  } catch (err) {
    const message = err.message || String(err);
    const goesBack = isDailyAllowanceGone(message) || (isWorthRetrying(message) && job.attempts < MAX_ATTEMPTS);
    await ReferenceGuide.updateOne(
      { _id: job.reference },
      { $set: goesBack ? { status: "queued", error: message.slice(0, 300) } : { status: "failed", error: message.slice(0, 300) } }
    );
    throw err;
  }
}

async function runPyqJob(job) {
  const { runImport } = require("../services/pyqImport");
  const PyqImport = require("../models/PyqImport");
  try {
    return await runImport(job.pyqImport);
  } catch (err) {
    const message = err.message || String(err);
    const goesBack = isDailyAllowanceGone(message) || (isWorthRetrying(message) && job.attempts < MAX_ATTEMPTS);
    await PyqImport.updateOne(
      { _id: job.pyqImport },
      { $set: goesBack ? { error: message.slice(0, 300) } : { status: "failed", error: message.slice(0, 300) } }
    );
    throw err;
  }
}

async function runDailyQuizJob(job) {
  const { generateQuizWithAI } = require("../services/dailyQuiz");
  return generateQuizWithAI(job.quizDate, { by: job.requestedBy || "auto" });
}

async function runMockJob(job) {
  // The mock builder already knows how to assemble a paper section by
  // section from its pattern; the worker only has to call it and record what
  // came back, so there is one implementation of "build a mock", not two.
  const { buildMockForExam } = require("../controllers/examSeriesController");
  const built = await buildMockForExam(job.examType, { vacancyId: job.vacancy });
  if (built.full) return built.message;

  // A short mock is not done. SSC CHSL was marked done at 9 of 100 and
  // dropped out of sight, because this returned whatever came back. The
  // builder now picks up the same draft where it stopped, so sending the job
  // round again finishes that mock instead of starting another.
  const where = `${built.test.title} is ${built.have} of ${built.paperSize}`;
  if (built.allowanceGone) {
    // Worded so isDailyAllowanceGone matches: the queue pauses, and the job
    // goes back in without spending an attempt.
    throw new Error(`Every model has used its allowance for today - ${where}; it will be finished from there.`);
  }
  // Worded so isWorthRetrying matches: a few batches were refused for a
  // passing reason, and another go usually closes the gap.
  throw new Error(`${where} so far - try again in a minute to finish it.`);
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

  // A pause for the allowance made before the queue kept a time - the one
  // live when this was deployed, for instance - is given the time it would
  // have had, so the panel can say when a Resume will work.
  if (state.paused && state.pausedBy === "worker" && !state.resumableAfter && /allowance/i.test(state.pausedReason || "")) {
    const at = resumeTime(state.pausedAt || new Date());
    await QueueState.updateOne(
      { key: "generation" },
      {
        $set: { resumableAfter: at, pausedReason: `The day's AI allowance is used up. You can resume after ${istTime(at)} IST.` },
        $unset: { resumeAfter: "" },
      }
    );
    return;
  }

  // Paused stays paused until a person resumes it - including after the
  // allowance has reset. The team chose to press Resume themselves.
  if (state.paused) return;

  // Repairs first: a top-up is a test students may be sitting short right
  // now, and it waits behind no new mock. Then everything in the order queued.
  const claim = (filter) =>
    GenerationJob.findOneAndUpdate(
      filter,
      { $set: { status: "running", startedAt: new Date() }, $inc: { attempts: 1 } },
      { sort: { queuedAt: 1 }, new: true }
    );
  const job =
    // what the admin asked to come first
    (await GenerationJob.findOneAndUpdate(
      { status: "queued", priority: { $gt: 0 } },
      { $set: { status: "running", startedAt: new Date() }, $inc: { attempts: 1 } },
      { sort: { priority: -1, queuedAt: 1 }, new: true }
    )) ||
    (await claim({ status: "queued", kind: "top_up" })) ||
    // then a past paper an admin is waiting to review
    (await claim({ status: "queued", kind: "pyq_extract" })) ||
    (await claim({ status: "queued" }));
  if (!job) return;

  running = true;
  currentJobId = job._id;
  try {
    const result =
      job.kind === "practice" ? await runPracticeJob(job)
      : job.kind === "daily_quiz" ? await runDailyQuizJob(job)
      : job.kind === "top_up" ? await runTopUpJob(job)
      : job.kind === "pyq_extract" ? await runPyqJob(job)
      : job.kind === "reference_read" ? await runReferenceJob(job)
      : job.kind === "lessons" ? await runLessonsJob()
      : job.kind === "quality_check" ? await runQualityCheckJob(job)
      : job.kind === "quality_audit" ? await runQualityAuditJob(job)
      : job.kind === "chapter_health" ? await runChapterHealthJob(job)
      : await runMockJob(job);
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
            resumableAfter: resumeTime(),
            pausedReason: `The day's AI allowance is used up. You can resume after ${istTime(resumeTime())} IST.`,
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
