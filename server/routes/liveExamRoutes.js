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

// Admin-only: building and managing live exam papers, kept fully separate
// from the Mock Tests series (server/routes/examSeriesRoutes.js).
router.get("/", protect, adminOnly, listLiveExams);
router.post("/", protect, adminOnly, createLiveExam);
router.get("/:id", protect, adminOnly, getLiveExamForReview);
router.patch("/:id", protect, adminOnly, updateLiveExam);
router.delete("/:id", protect, adminOnly, deleteLiveExam);
router.get("/:id/section-status", protect, adminOnly, getLiveExamSectionStatus);
router.get("/:id/attempts", protect, adminOnly, getLiveExamAttempts);
router.post("/:id/add-questions", protect, adminOnly, addQuestionsToLiveExam);
router.delete("/:id/question/:questionId", protect, adminOnly, removeQuestionFromLiveExam);
router.patch("/:id/publish", protect, adminOnly, publishLiveExam);
router.patch("/:id/cancel", protect, adminOnly, cancelLiveExam);

module.exports = router;
