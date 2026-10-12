const express = require("express");
const router = express.Router();
const {
  queueStatus,
  activity,
  listGaps,
  enqueue,
  enqueueShort,
  enqueuePractice,
  pause,
  resume,
  retryFailed,
  clearHistory,
  cancelQueued,
} = require("../controllers/generationController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Everything here is admin-only: this is the machinery that fills the bank.
router.get("/status", protect, adminOnly, asyncRoute(queueStatus));
router.get("/activity", protect, adminOnly, asyncRoute(activity));
router.get("/gaps", protect, adminOnly, asyncRoute(listGaps));
router.post("/enqueue", protect, adminOnly, asyncRoute(enqueue));
router.post("/enqueue-short", protect, adminOnly, asyncRoute(enqueueShort));
router.post("/enqueue-practice", protect, adminOnly, asyncRoute(enqueuePractice));
router.post("/pause", protect, adminOnly, asyncRoute(pause));
router.post("/resume", protect, adminOnly, asyncRoute(resume));
router.post("/retry-failed", protect, adminOnly, asyncRoute(retryFailed));
router.delete("/history", protect, adminOnly, asyncRoute(clearHistory));
router.delete("/queue", protect, adminOnly, asyncRoute(cancelQueued));

module.exports = router;
