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

// A past paper from PDF: uploaded, read by a queue job, reviewed, published.
const imp = require("../controllers/pyqImportController");
router.post("/import", protect, adminOnly, asyncRoute(imp.createImport));
router.get("/imports", protect, adminOnly, asyncRoute(imp.listImports));
router.get("/import/:id", protect, adminOnly, asyncRoute(imp.getImport));
router.patch("/import/:id", protect, adminOnly, asyncRoute(imp.updateImport));
router.patch("/import/:id/row/:rowId", protect, adminOnly, asyncRoute(imp.updateRow));
router.post("/import/:id/row/:rowId/image", protect, adminOnly, asyncRoute(imp.uploadRowImage));
router.post("/import/:id/confirm", protect, adminOnly, asyncRoute(imp.confirm));
router.get("/import/:id/csv", protect, adminOnly, asyncRoute(imp.downloadCsv));
router.post("/import/:id/csv", protect, adminOnly, asyncRoute(imp.uploadCsv));
router.post("/import/:id/retry", protect, adminOnly, asyncRoute(imp.retry));
router.post("/import/:id/publish", protect, adminOnly, asyncRoute(imp.publish));
router.delete("/import/:id", protect, adminOnly, asyncRoute(imp.remove));

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