const express = require("express");
const router = express.Router();
const {
  listSubjects,
  upsertSubject,
  getMySubjects,
  updateMySubjects,
  generateChapterTest,
} = require("../controllers/subjectController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", protect, listSubjects);
router.get("/my", protect, getMySubjects);
router.patch("/my", protect, updateMySubjects);
router.post("/chapter-test", protect, generateChapterTest);
router.post("/", protect, adminOnly, upsertSubject);

module.exports = router;