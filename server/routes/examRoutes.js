const express = require("express");
const router = express.Router();
const {
  listExamPatterns,
  upsertExamPattern,
  listUpcomingLiveExams,
} = require("../controllers/examController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", protect, listExamPatterns);
router.post("/", protect, adminOnly, upsertExamPattern);
router.get("/live/upcoming", protect, listUpcomingLiveExams);

module.exports = router;
