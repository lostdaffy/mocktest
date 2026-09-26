const express = require("express");
const router = express.Router();
const {
  listSubjects,
  upsertSubject,
  getMySubjects,
  updateMySubjects,
  generateChapterTest,
  catalogHealth,
} = require("../controllers/subjectController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

router.get("/", protect, asyncRoute(listSubjects));
router.get("/my", protect, asyncRoute(getMySubjects));
router.patch("/my", protect, asyncRoute(updateMySubjects));
router.post("/chapter-test", protect, asyncRoute(generateChapterTest));
router.get("/health", protect, adminOnly, asyncRoute(catalogHealth));
router.post("/", protect, adminOnly, asyncRoute(upsertSubject));

module.exports = router;