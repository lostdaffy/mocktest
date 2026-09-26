const express = require("express");
const router = express.Router();
const {
  listExamPatterns,
  upsertExamPattern,
  updateExamPattern,
  deleteExamPattern,
  listUpcomingLiveExams,
} = require("../controllers/examController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

router.get("/", protect, asyncRoute(listExamPatterns));
router.post("/", protect, adminOnly, asyncRoute(upsertExamPattern));
router.patch("/:id", protect, adminOnly, asyncRoute(updateExamPattern));
router.delete("/:id", protect, adminOnly, asyncRoute(deleteExamPattern)); // ?permanent=1 to remove for good
router.get("/live/upcoming", protect, asyncRoute(listUpcomingLiveExams));

module.exports = router;
