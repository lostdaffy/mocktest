const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const c = require("../controllers/qualityController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Everything here is the admin's: signed in, and an admin.
router.use(protect, adminOnly);

// The routes that call the AI spend the day's allowance, so even a signed-in
// admin is held to a pace - a script or a stuck button cannot burn it all.
const aiPace = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => `quality-ai:${req.user?._id || req.ip}`,
  message: { message: "Too many AI requests - wait a few minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/settings", asyncRoute(c.getSettings));
router.put("/settings", asyncRoute(c.putSettings));
router.get("/fixes", asyncRoute(c.listFixes));
router.post("/fixes/:id/apply", asyncRoute(c.applyFix));
router.post("/fixes/:id/dismiss", asyncRoute(c.dismissFix));
router.post("/check", aiPace, asyncRoute(c.checkNow));
router.post("/questions/:id/improve", aiPace, asyncRoute(c.improve));
router.post("/questions/:id/regenerate", aiPace, asyncRoute(c.regenerate));
router.get("/questions/:id/history", asyncRoute(c.getHistory));
router.post("/questions/:id/restore", asyncRoute(c.restore));
router.get("/deleted", asyncRoute(c.listDeleted));
router.post("/audit-bank", asyncRoute(c.auditBank));
router.get("/export", asyncRoute(c.exportQuestions));

module.exports = router;
