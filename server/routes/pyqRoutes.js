const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  uploadPyqPdf,
  listPyqPapers,
  getPyqForReview,
  updatePyqQuestion,
  removePyqQuestion,
  publishPyqPaper,
  archivePyqPaper,
  deletePyqPaper,
  createPyqPaper,
  addManualQuestionsToPyq,
} = require("../controllers/pyqController");
const asyncRoute = require("../utils/asyncRoute");

router.post("/upload", protect, adminOnly, asyncRoute(uploadPyqPdf));
// Typed in by hand, for papers the PDF extractor cannot read.
router.post("/paper", protect, adminOnly, asyncRoute(createPyqPaper));
router.post("/paper/:testId/manual-questions", protect, adminOnly, asyncRoute(addManualQuestionsToPyq));
router.get("/paper/:testId", protect, adminOnly, asyncRoute(getPyqForReview));
router.patch("/paper/:testId/publish", protect, adminOnly, asyncRoute(publishPyqPaper));
router.patch("/paper/:testId/archive", protect, adminOnly, asyncRoute(archivePyqPaper));
router.delete("/paper/:testId/question/:questionId", protect, adminOnly, asyncRoute(removePyqQuestion));
router.delete("/paper/:testId", protect, adminOnly, asyncRoute(deletePyqPaper));
router.patch("/question/:questionId", protect, adminOnly, asyncRoute(updatePyqQuestion));
router.get("/:examStage", protect, adminOnly, asyncRoute(listPyqPapers));

module.exports = router;