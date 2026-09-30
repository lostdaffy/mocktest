const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");
const { findGaps, coverage } = require("../services/generationGaps");
const { GEMINI_MODELS, currentModel } = require("../services/geminiService");
const { nextAllowanceReset } = require("../utils/aiAllowance");

// GET /api/generation/status (admin)
//
// Everything the panel needs in one call: how much is done, what is running,
// what failed and why, and whether the queue has stopped itself.
async function queueStatus(req, res) {
  const [counts, current, recentFailures, state, cover] = await Promise.all([
    GenerationJob.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    GenerationJob.findOne({ status: "running" }).select("label kind startedAt attempts").lean(),
    GenerationJob.find({ status: "failed" }).sort({ finishedAt: -1 }).limit(20).select("label lastError attempts finishedAt").lean(),
    QueueState.get(),
    coverage(),
  ]);

  const by = { queued: 0, running: 0, done: 0, failed: 0, cancelled: 0 };
  counts.forEach((c) => (by[c._id] = c.n));
  const total = by.queued + by.running + by.done + by.failed;

  // What is waiting, in the order it will be built, so the panel can say
  // "4 waiting: SSC MTS mock, SSC CHSL mock..." rather than just "4".
  const waiting = await GenerationJob.find({ status: "queued" })
    .sort({ queuedAt: 1 })
    .limit(12)
    .select("label kind queuedAt")
    .lean();

  const recentDone = await GenerationJob.find({ status: "done" })
    .sort({ finishedAt: -1 })
    .limit(8)
    .select("label result finishedAt")
    .lean();

  res.json({
    counts: by,
    total,
    // What a progress bar needs, without the panel having to work it out.
    percentDone: total ? Math.round(((by.done + by.failed) / total) * 100) : 0,
    current,
    recentDone,
    recentFailures,
    paused: state.paused,
    pausedReason: state.pausedReason,
    pausedBy: state.pausedBy,
    pausedAt: state.pausedAt,
    // When a queue stopped by the allowance starts again on its own; null
    // for a pause by the admin, which waits for a person.
    resumeAfter: state.paused && state.pausedBy === "worker" ? state.resumeAfter || null : null,
    nextAllowanceReset: nextAllowanceReset(),
    serverTime: new Date(),
    waiting,
    coverage: cover,
    ai: { models: GEMINI_MODELS, inUse: currentModel() },
  });
}

// GET /api/generation/gaps (admin) -> what the catalog is still missing
async function listGaps(req, res) {
  const excludeSubjects = String(req.query.exclude || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const mocksPerExam = Math.min(Math.max(Number(req.query.mocksPerExam) || 1, 0), 5);

  const gaps = await findGaps({ excludeSubjects, mocksPerExam });
  res.json({
    practice: gaps.practice,
    mocks: gaps.mocks,
    short: gaps.short,
    totals: { practice: gaps.practice.length, mocks: gaps.mocks.length, short: gaps.short.length },
  });
}

// POST /api/generation/enqueue (admin)
//
// Queues everything that is missing. The admin should not have to name 113
// chapter-and-level pairs; the system already knows which exist.
async function enqueue(req, res) {
  const { practice = true, mocks = false, exclude = [], mocksPerExam = 1, limit } = req.body || {};

  const gaps = await findGaps({
    excludeSubjects: Array.isArray(exclude) ? exclude : String(exclude).split(",").map((s) => s.trim()).filter(Boolean),
    mocksPerExam: Math.min(Math.max(Number(mocksPerExam) || 1, 0), 5),
  });

  let wanted = [];
  if (practice) wanted.push(...gaps.practice);
  if (mocks) wanted.push(...gaps.mocks);
  if (limit) wanted = wanted.slice(0, Math.max(1, Number(limit)));

  if (!wanted.length) {
    return res.json({ message: "Nothing is missing - the catalog is complete", queued: 0 });
  }

  const batch = new Date().toISOString();
  let queued = 0;
  let alreadyThere = 0;

  for (const job of wanted) {
    // Two presses of the button leave one job per gap, not two.
    if (await GenerationJob.isAlreadyQueued(job)) {
      alreadyThere++;
      continue;
    }
    await GenerationJob.create({ ...job, batch, status: "queued" });
    queued++;
  }

  // Queueing work implies wanting it done: an admin who presses this after a
  // pause should not have to press resume as well.
  await QueueState.updateOne(
    { key: "generation" },
    { $set: { paused: false, pausedReason: "", pausedBy: "admin" }, $unset: { resumeAfter: "" } }
  );

  res.status(201).json({
    message:
      `${queued} queued` +
      (alreadyThere ? `, ${alreadyThere} were already waiting` : "") +
      ". The queue runs one at a time and keeps going if you close this page.",
    queued,
    alreadyThere,
    batch,
  });
}

// POST /api/generation/pause and /resume (admin)
async function pause(req, res) {
  await QueueState.updateOne(
    { key: "generation" },
    { $set: { paused: true, pausedBy: "admin", pausedAt: new Date(), pausedReason: "Paused by the admin" }, $unset: { resumeAfter: "" } }
  );
  const waiting = await GenerationJob.countDocuments({ status: "queued" });
  res.json({ message: `Paused. ${waiting} job(s) are still waiting and will carry on when you resume.`, paused: true });
}

async function resume(req, res) {
  await QueueState.updateOne(
    { key: "generation" },
    { $set: { paused: false, pausedReason: "", pausedBy: "admin" }, $unset: { resumeAfter: "" } }
  );
  const waiting = await GenerationJob.countDocuments({ status: "queued" });
  res.json({ message: waiting ? `Resumed - ${waiting} job(s) to go.` : "Resumed. Nothing is waiting.", paused: false });
}

// POST /api/generation/retry-failed (admin)
async function retryFailed(req, res) {
  const r = await GenerationJob.updateMany(
    { status: "failed" },
    { $set: { status: "queued", attempts: 0, lastError: "", startedAt: null, finishedAt: null } }
  );
  await QueueState.updateOne({ key: "generation" }, { $set: { paused: false, pausedReason: "" }, $unset: { resumeAfter: "" } });
  res.json({ message: `${r.modifiedCount} failed job(s) put back in the queue.`, requeued: r.modifiedCount });
}

// DELETE /api/generation/history (admin) -> clears finished rows, keeps work
async function clearHistory(req, res) {
  const r = await GenerationJob.deleteMany({ status: { $in: ["done", "cancelled"] } });
  res.json({ message: `${r.deletedCount} finished job(s) cleared.`, cleared: r.deletedCount });
}

// DELETE /api/generation/queue (admin) -> drops what has not started yet
async function cancelQueued(req, res) {
  const r = await GenerationJob.updateMany({ status: "queued" }, { $set: { status: "cancelled", finishedAt: new Date() } });
  res.json({ message: `${r.modifiedCount} waiting job(s) cancelled. Anything already built is untouched.`, cancelled: r.modifiedCount });
}

module.exports = { queueStatus, listGaps, enqueue, pause, resume, retryFailed, clearHistory, cancelQueued };
