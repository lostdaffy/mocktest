const express = require("express");
const router = express.Router();
const {
  searchUsers,
  getUserStats,
  exportUsersCsv,
  adminResetPassword,
  manageSubscription,
} = require("../controllers/adminUserController");
const { protect, adminOnly } = require("../middleware/auth");

// Order matters - "/stats" and "/export" must be registered before "/:id"
// routes elsewhere would even matter, though none collide here currently.
router.get("/stats", protect, adminOnly, getUserStats);
router.get("/export", protect, adminOnly, exportUsersCsv);
router.get("/", protect, adminOnly, searchUsers);
router.patch("/:id/reset-password", protect, adminOnly, adminResetPassword);
router.patch("/:id/subscription", protect, adminOnly, manageSubscription);

module.exports = router;