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
const asyncRoute = require("../utils/asyncRoute");

// Exam mock series (admin-only content management)
router.get("/exams", protect, adminOnly, asyncRoute(listExams));
router.get("/:examStage/sections", protect, adminOnly, asyncRoute(getExamSections));
router.get("/mock/:testId/section-status", protect, adminOnly, asyncRoute(getMockSectionStatus));
router.get("/subjects/list", protect, adminOnly, asyncRoute(listSubjectsForAdmin));
router.post("/practice/generate", protect, adminOnly, asyncRoute(generatePracticeTest));
router.patch("/practice/:testId/publish", protect, adminOnly, asyncRoute(publishPracticeTest));
router.get("/practice/:subject/:chapter", protect, adminOnly, asyncRoute(listPracticeTests));
router.get("/:examStage/mocks", protect, adminOnly, asyncRoute(listExamMocks));
router.post("/:examStage/generate-mock", protect, adminOnly, asyncRoute(generateExamMock));
router.post("/:examStage/create-empty-mock", protect, adminOnly, asyncRoute(createEmptyMock));
router.get("/mock/:testId", protect, adminOnly, asyncRoute(getMockForReview));
router.post("/mock/:testId/add-questions", protect, adminOnly, asyncRoute(addQuestionsToMock));
router.patch("/mock/:testId/publish", protect, adminOnly, asyncRoute(publishMock));
router.patch("/mock/:testId/archive", protect, adminOnly, asyncRoute(archiveMock));
router.delete("/mock/:testId", protect, adminOnly, asyncRoute(deleteMock));
router.delete("/mock/:testId/question/:questionId", protect, adminOnly, asyncRoute(removeQuestionFromMock));

module.exports = router;