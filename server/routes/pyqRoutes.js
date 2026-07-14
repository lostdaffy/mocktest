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
} = require("../controllers/pyqController");

router.post("/upload", protect, adminOnly, uploadPyqPdf);
router.get("/paper/:testId", protect, adminOnly, getPyqForReview);
router.patch("/paper/:testId/publish", protect, adminOnly, publishPyqPaper);
router.patch("/paper/:testId/archive", protect, adminOnly, archivePyqPaper);
router.delete("/paper/:testId/question/:questionId", protect, adminOnly, removePyqQuestion);
router.delete("/paper/:testId", protect, adminOnly, deletePyqPaper);
router.patch("/question/:questionId", protect, adminOnly, updatePyqQuestion);
router.get("/:examStage", protect, adminOnly, listPyqPapers);

module.exports = router;