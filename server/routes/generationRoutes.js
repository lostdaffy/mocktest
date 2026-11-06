const express = require("express");
const router = express.Router();
const {
  queueStatus,
  activity,
  listGaps,
  enqueue,
  enqueueShort,
  enqueuePractice,
  enqueueSeries,
  pause,
  resume,
  retryFailed,
  clearHistory,
  cancelQueued,
  prioritize,
} = require("../controllers/generationController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Everything here is admin-only: this is the machinery that fills the bank.
router.get("/status", protect, adminOnly, asyncRoute(queueStatus));
// The waiting work by kind, and the AI quality checks cleared without the AI
// (services/offlineChecks.js): list them with their questions, then send the
// verdicts - rules and repeats still run here, anything wrong is flagged.
const offline = require("../services/offlineChecks");
router.get("/queue-summary", protect, adminOnly, asyncRoute(async (req, res) => res.json({ summary: await offline.summary() })));
router.get("/quality-checks", protect, adminOnly, asyncRoute(async (req, res) => res.json({ jobs: await offline.listChecks({ limit: Number(req.query.limit) || 50, after: /^[a-f0-9]{24}$/i.test(String(req.query.after || "")) ? req.query.after : null }) })));
router.post("/quality-checks/resolve", protect, adminOnly, asyncRoute(async (req, res) => {
  const verdicts = Array.isArray(req.body?.verdicts) ? req.body.verdicts.slice(0, 200) : [];
  res.json({ results: await offline.resolveChecks(verdicts, { by: "admin" }) });
}));
router.get("/activity", protect, adminOnly, asyncRoute(activity));
router.get("/gaps", protect, adminOnly, asyncRoute(listGaps));
router.post("/enqueue", protect, adminOnly, asyncRoute(enqueue));
router.post("/enqueue-short", protect, adminOnly, asyncRoute(enqueueShort));
router.post("/prioritize", protect, adminOnly, asyncRoute(prioritize)); // one exam's waiting work first
router.post("/enqueue-practice", protect, adminOnly, asyncRoute(enqueuePractice));
router.post("/enqueue-series", protect, adminOnly, asyncRoute(enqueueSeries)); // fill a practice series to 10 tests, unattended
router.post("/pause", protect, adminOnly, asyncRoute(pause));
router.post("/resume", protect, adminOnly, asyncRoute(resume));
router.post("/retry-failed", protect, adminOnly, asyncRoute(retryFailed));
router.delete("/history", protect, adminOnly, asyncRoute(clearHistory));
router.delete("/queue", protect, adminOnly, asyncRoute(cancelQueued));

module.exports = router;
