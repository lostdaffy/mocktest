const express = require("express");
const router = express.Router();
const {
  listLiveExams,
  createLiveExam,
  getLiveExamForReview,
  getLiveExamSectionStatus,
  addQuestionsToLiveExam,
  removeQuestionFromLiveExam,
  updateLiveExam,
  publishLiveExam,
  cancelLiveExam,
  deleteLiveExam,
  getLiveExamAttempts,
} = require("../controllers/liveExamController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Admin-only: building and managing live exam papers, kept fully separate
// from the Mock Tests series (server/routes/examSeriesRoutes.js).
router.get("/", protect, adminOnly, asyncRoute(listLiveExams));
router.post("/", protect, adminOnly, asyncRoute(createLiveExam));
router.get("/:id", protect, adminOnly, asyncRoute(getLiveExamForReview));
router.patch("/:id", protect, adminOnly, asyncRoute(updateLiveExam));
router.delete("/:id", protect, adminOnly, asyncRoute(deleteLiveExam));
router.get("/:id/section-status", protect, adminOnly, asyncRoute(getLiveExamSectionStatus));
router.get("/:id/attempts", protect, adminOnly, asyncRoute(getLiveExamAttempts));
router.post("/:id/add-questions", protect, adminOnly, asyncRoute(addQuestionsToLiveExam));
router.delete("/:id/question/:questionId", protect, adminOnly, asyncRoute(removeQuestionFromLiveExam));
router.patch("/:id/publish", protect, adminOnly, asyncRoute(publishLiveExam));
router.patch("/:id/cancel", protect, adminOnly, asyncRoute(cancelLiveExam));

module.exports = router;
