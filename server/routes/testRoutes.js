const express = require("express");
const router = express.Router();
const {
  listTests,
  getTest,
  createFullMock,
  createTopicTest,
  getTodayTest,
  createWeeklyRevision,
  submitTest,
  getAttemptResult,
  listMyAttempts,
  getFreeLimits,
  getExamSeries,
  getPracticeSeries,
} = require("../controllers/testController");
const { getLeaderboard } = require("../controllers/examController");
const { protect, requireActiveSubscription } = require("../middleware/auth");

router.get("/today", protect, getTodayTest);
router.get("/my-attempts", protect, listMyAttempts);
router.get("/free-limits", protect, getFreeLimits);
router.get("/exam-series/:examStage", protect, getExamSeries);
router.get("/practice-series/:subject/:chapter", protect, getPracticeSeries);
router.get("/", protect, listTests);
router.get("/:id", protect, getTest);
router.get("/:id/leaderboard", protect, getLeaderboard);
router.post("/generate/full-mock", protect, createFullMock);
router.post("/generate/topic", protect, createTopicTest); // topic-wise: always free, unlimited
router.post("/generate/weekly-revision", protect, createWeeklyRevision);
router.post("/:id/submit", protect, submitTest);
router.get("/attempts/:attemptId", protect, getAttemptResult);

module.exports = router;