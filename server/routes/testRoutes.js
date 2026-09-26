const express = require("express");
const router = express.Router();
const {
  listTests,
  getTest,
  createFullMock,
  createTopicTest,
  getTodayTest,
  getDailyStatus,
  setDailyGoal,
  createWeeklyRevision,
  submitTest,
  saveLiveProgress,
  getAttemptResult,
  listMyAttempts,
  getFreeLimits,
  getAnalysis,
  getExamSeries,
  getPracticeSeries,
  getPyqList,
  getPyqYears,
  getPyqPapersByYear,
} = require("../controllers/testController");
const { getLeaderboard } = require("../controllers/examController");
const { protect, requireActiveSubscription } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

router.get("/today", protect, asyncRoute(getTodayTest));
router.get("/daily", protect, asyncRoute(getDailyStatus)); // streak + today's progress for the home screen
router.patch("/daily/goal", protect, asyncRoute(setDailyGoal));
router.get("/my-attempts", protect, asyncRoute(listMyAttempts));
router.get("/analysis", protect, asyncRoute(getAnalysis));
router.get("/free-limits", protect, asyncRoute(getFreeLimits));
router.get("/exam-series/:examStage", protect, asyncRoute(getExamSeries));
router.get("/practice-series/:subject/:chapter", protect, asyncRoute(getPracticeSeries));
router.get("/pyq", protect, asyncRoute(getPyqList));
router.get("/pyq/:examStage/years", protect, asyncRoute(getPyqYears));
router.get("/pyq/:examStage/papers/:year", protect, asyncRoute(getPyqPapersByYear));
router.get("/", protect, asyncRoute(listTests));
router.get("/:id", protect, asyncRoute(getTest));
router.get("/:id/leaderboard", protect, asyncRoute(getLeaderboard));
router.post("/generate/full-mock", protect, asyncRoute(createFullMock));
router.post("/generate/topic", protect, asyncRoute(createTopicTest)); // topic-wise: always free, unlimited
router.post("/generate/weekly-revision", protect, asyncRoute(createWeeklyRevision));
router.post("/:id/submit", protect, asyncRoute(submitTest));
router.patch("/:id/progress", protect, asyncRoute(saveLiveProgress));
router.get("/attempts/:attemptId", protect, asyncRoute(getAttemptResult));

module.exports = router;