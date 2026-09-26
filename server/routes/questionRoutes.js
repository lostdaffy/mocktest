const express = require("express");
const router = express.Router();
const {
  listQuestions,
  approveQuestion,
  rejectQuestion,
  createQuestion,
  reportQuestion,
  toggleBookmark,
  listBookmarked,
  updateQuestion,
  deleteQuestion,
  listReports,
  resolveReport,
  getStats,
  recheckReviewQueue,
} = require("../controllers/questionController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Student routes
router.post("/:id/report", protect, asyncRoute(reportQuestion));
router.post("/:id/bookmark", protect, asyncRoute(toggleBookmark));
router.get("/bookmarked", protect, asyncRoute(listBookmarked));

// Admin routes - specific paths BEFORE "/:id" style so they don't get shadowed
router.get("/stats", protect, adminOnly, asyncRoute(getStats));
router.post("/recheck", protect, adminOnly, asyncRoute(recheckReviewQueue));
router.get("/reports", protect, adminOnly, asyncRoute(listReports));
router.patch("/reports/:id/resolve", protect, adminOnly, asyncRoute(resolveReport));
router.get("/", protect, adminOnly, asyncRoute(listQuestions));
router.post("/", protect, adminOnly, asyncRoute(createQuestion));
router.patch("/:id/approve", protect, adminOnly, asyncRoute(approveQuestion));
router.patch("/:id/reject", protect, adminOnly, asyncRoute(rejectQuestion));
router.put("/:id", protect, adminOnly, asyncRoute(updateQuestion));
router.delete("/:id", protect, adminOnly, asyncRoute(deleteQuestion));

module.exports = router;