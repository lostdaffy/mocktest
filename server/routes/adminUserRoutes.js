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

// Order matters - "/stats" and "/export" must be registered before "/:id"
// routes elsewhere would even matter, though none collide here currently.
router.get("/stats", protect, adminOnly, getUserStats);
router.get("/export", protect, adminOnly, exportUsersCsv);
router.get("/", protect, adminOnly, searchUsers);
router.patch("/:id/reset-password", protect, adminOnly, adminResetPassword);
router.patch("/:id/subscription", protect, adminOnly, manageSubscription);
router.get("/:id", protect, adminOnly, getUserDetail); // full support view of one account
router.patch("/:id/unlock", protect, adminOnly, unlockUser); // clear the login lockout
router.patch("/:id/logout", protect, adminOnly, forceLogout); // free a stuck single-device session
router.patch("/:id/profile", protect, adminOnly, updateUserProfile); // fix a wrong email/name
router.delete("/:id", protect, adminOnly, deleteUser); // deletion requested by email

module.exports = router;