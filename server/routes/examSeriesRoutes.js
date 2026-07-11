const express = require("express");
const router = express.Router();
const {
  listExams,
  listExamMocks,
  generateExamMock,
  getMockForReview,
  publishMock,
  archiveMock,
  deleteMock,
  removeQuestionFromMock,
  listSubjectsForAdmin,
  generatePracticeTest,
  listPracticeTests,
  addQuestionsToMock,
  createEmptyMock,
  getExamSections,
  getMockSectionStatus,
  publishPracticeTest,
} = require("../controllers/examSeriesController");
const { protect, adminOnly } = require("../middleware/auth");

// Exam mock series (admin-only content management)
router.get("/exams", protect, adminOnly, listExams);
router.get("/:examStage/sections", protect, adminOnly, getExamSections);
router.get("/mock/:testId/section-status", protect, adminOnly, getMockSectionStatus);
router.get("/subjects/list", protect, adminOnly, listSubjectsForAdmin);
router.post("/practice/generate", protect, adminOnly, generatePracticeTest);
router.patch("/practice/:testId/publish", protect, adminOnly, publishPracticeTest);
router.get("/practice/:subject/:chapter", protect, adminOnly, listPracticeTests);
router.get("/:examStage/mocks", protect, adminOnly, listExamMocks);
router.post("/:examStage/generate-mock", protect, adminOnly, generateExamMock);
router.post("/:examStage/create-empty-mock", protect, adminOnly, createEmptyMock);
router.get("/mock/:testId", protect, adminOnly, getMockForReview);
router.post("/mock/:testId/add-questions", protect, adminOnly, addQuestionsToMock);
router.patch("/mock/:testId/publish", protect, adminOnly, publishMock);
router.patch("/mock/:testId/archive", protect, adminOnly, archiveMock);
router.delete("/mock/:testId", protect, adminOnly, deleteMock);
router.delete("/mock/:testId/question/:questionId", protect, adminOnly, removeQuestionFromMock);

module.exports = router;