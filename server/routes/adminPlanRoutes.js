const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const c = require("../controllers/adminPlanController");
const { protect, adminOnly } = require("../middleware/auth");
const { requireConfirmPassword } = require("../middleware/confirmPassword");
const asyncRoute = require("../utils/asyncRoute");

// Every route: signed-in admin. Every write: also the admin's password again
// (middleware/confirmPassword.js), a tight per-admin rate limit, and a row in
// the audit log (controllers/adminPlanController.js).
const writeLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyGenerator: (req) => `plan-write:${req.user?._id || req.ip}`,
  message: { message: "Too many plan changes. Try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect, adminOnly);

router.get("/", asyncRoute(c.listPlans));
router.get("/audit", asyncRoute(c.listAudit));

const write = [writeLimit, asyncRoute(requireConfirmPassword)];
router.post("/", ...write, asyncRoute(c.createPlan));
router.patch("/:id", ...write, asyncRoute(c.updatePlan));
router.patch("/:id/active", ...write, asyncRoute(c.setActive));
router.post("/:id/archive", ...write, asyncRoute(c.archivePlan));
router.delete("/:id", ...write, asyncRoute(c.deletePlan));

module.exports = router;
