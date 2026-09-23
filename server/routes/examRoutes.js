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

router.get("/", protect, listExamPatterns);
router.post("/", protect, adminOnly, upsertExamPattern);
router.patch("/:id", protect, adminOnly, updateExamPattern);
router.delete("/:id", protect, adminOnly, deleteExamPattern); // ?permanent=1 to remove for good
router.get("/live/upcoming", protect, listUpcomingLiveExams);

module.exports = router;
