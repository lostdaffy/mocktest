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
} = require("../controllers/questionController");
const { protect, adminOnly } = require("../middleware/auth");

// Student routes
router.post("/:id/report", protect, reportQuestion);
router.post("/:id/bookmark", protect, toggleBookmark);
router.get("/bookmarked", protect, listBookmarked);

// Admin routes - specific paths BEFORE "/:id" style so they don't get shadowed
router.get("/stats", protect, adminOnly, getStats);
router.get("/reports", protect, adminOnly, listReports);
router.patch("/reports/:id/resolve", protect, adminOnly, resolveReport);
router.get("/", protect, adminOnly, listQuestions);
router.post("/", protect, adminOnly, createQuestion);
router.patch("/:id/approve", protect, adminOnly, approveQuestion);
router.patch("/:id/reject", protect, adminOnly, rejectQuestion);
router.put("/:id", protect, adminOnly, updateQuestion);
router.delete("/:id", protect, adminOnly, deleteQuestion);

module.exports = router;