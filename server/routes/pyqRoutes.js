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
const asyncRoute = require("../utils/asyncRoute");

router.post("/upload", protect, adminOnly, asyncRoute(uploadPyqPdf));
router.get("/paper/:testId", protect, adminOnly, asyncRoute(getPyqForReview));
router.patch("/paper/:testId/publish", protect, adminOnly, asyncRoute(publishPyqPaper));
router.patch("/paper/:testId/archive", protect, adminOnly, asyncRoute(archivePyqPaper));
router.delete("/paper/:testId/question/:questionId", protect, adminOnly, asyncRoute(removePyqQuestion));
router.delete("/paper/:testId", protect, adminOnly, asyncRoute(deletePyqPaper));
router.patch("/question/:questionId", protect, adminOnly, asyncRoute(updatePyqQuestion));
router.get("/:examStage", protect, adminOnly, asyncRoute(listPyqPapers));

module.exports = router;