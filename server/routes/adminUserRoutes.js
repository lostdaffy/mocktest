const express = require("express");
const router = express.Router();
const {
  searchUsers,
  getUserStats,
  exportUsersCsv,
  adminResetPassword,
  manageSubscription,
  getUserDetail,
  unlockUser,
  forceLogout,
  updateUserProfile,
  deleteUser,
} = require("../controllers/adminUserController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Order matters - "/stats" and "/export" must be registered before "/:id"
// routes elsewhere would even matter, though none collide here currently.
router.get("/stats", protect, adminOnly, asyncRoute(getUserStats));
router.get("/export", protect, adminOnly, asyncRoute(exportUsersCsv));
router.get("/", protect, adminOnly, asyncRoute(searchUsers));
router.patch("/:id/reset-password", protect, adminOnly, asyncRoute(adminResetPassword));
router.patch("/:id/subscription", protect, adminOnly, asyncRoute(manageSubscription));
router.get("/:id", protect, adminOnly, asyncRoute(getUserDetail)); // full support view of one account
router.patch("/:id/unlock", protect, adminOnly, asyncRoute(unlockUser)); // clear the login lockout
router.patch("/:id/logout", protect, adminOnly, asyncRoute(forceLogout)); // free a stuck single-device session
router.patch("/:id/profile", protect, adminOnly, asyncRoute(updateUserProfile)); // fix a wrong email/name
router.delete("/:id", protect, adminOnly, asyncRoute(deleteUser)); // deletion requested by email

module.exports = router;