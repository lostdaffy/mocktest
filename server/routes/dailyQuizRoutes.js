const express = require("express");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");
const c = require("../controllers/dailyQuizController");

// Admin only. Students get the quiz through GET /api/tests/today, the
// endpoint every installed app already calls for the daily test.
const router = express.Router();
router.use(protect, adminOnly);

router.get("/", asyncRoute(c.listQuizzes));
router.patch("/settings", asyncRoute(c.updateSettings));
router.get("/:date", asyncRoute(c.getQuiz));
router.post("/:date/fill-bank", asyncRoute(c.fillFromBank));
router.post("/:date/generate-ai", asyncRoute(c.generateAI));
router.post("/:date/replace", asyncRoute(c.replaceQuestion));
router.patch("/:date/status", asyncRoute(c.setStatus));

module.exports = router;
