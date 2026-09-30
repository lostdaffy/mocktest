// Keeps the instance up for as long as there is generation work left.
//
// The free plan stops this service whenever no request has arrived for a
// while, and it does not care that something is running inside it. A full
// run is thirty-odd tests at several minutes each, so it is almost entirely
// made of time when nobody is visiting the site - the instance would sleep
// part-way through nearly every time, and stay asleep until somebody opened
// the panel, because the worker cannot run in a process that isn't there.
//
// So while the queue has work, the service asks itself for /api/health. That
// is an ordinary inbound request and the inactivity clock starts again. It
// stops the moment the queue is empty or paused: this exists to finish a run
// that is already under way, not to hold a free instance open all day.
const PING_EVERY_MS = 10 * 60 * 1000;

// Set by Render itself. Absent locally and in the tests, where this whole
// file should do nothing at all. Read when it is needed rather than at
// import: read once at load, the module cannot be reasoned about without
// knowing which env var was set before which require, and a missing one
// made the ping throw instead of doing nothing.
const publicUrl = () => process.env.RENDER_EXTERNAL_URL || "";

let timer = null;

async function thereIsWorkLeft() {
  const GenerationJob = require("../models/GenerationJob");
  const QueueState = require("../models/QueueState");
  const state = await QueueState.get();
  // Waiting for the allowance counts as work left: asleep at half past
  // twelve, the server could not start the queue again by itself. A pause
  // by the admin does not - that one is a person's decision to stop.
  const waitingForAllowance = state.paused && state.pausedBy === "worker" && !!state.resumeAfter;
  if (state.paused && !waitingForAllowance) return false;
  return (await GenerationJob.countDocuments({ status: { $in: ["queued", "running"] } })) > 0;
}

async function pingIfBuilding() {
  const base = publicUrl();
  if (!base) return;
  try {
    if (!(await thereIsWorkLeft())) return;
    await fetch(`${base.replace(/\/$/, "")}/api/health`).catch(() => {});
  } catch (err) {
    // A missed ping costs one sleep, not correctness: the queue survives in
    // the database either way and picks up where it left off.
    console.error("Keep-awake ping failed:", err.message);
  }
}

function startKeepAwake() {
  if (!publicUrl() || timer) return false;
  timer = setInterval(pingIfBuilding, PING_EVERY_MS);
  timer.unref?.();
  return true;
}

function stopKeepAwake() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startKeepAwake, stopKeepAwake, pingIfBuilding, PING_EVERY_MS };
