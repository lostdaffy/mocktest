const express = require("express");
const router = express.Router();
const {
  signup,
  sendSignupOtp,
  login,
  getMe,
  updateProfile,
  registerPushToken,
  forgotPassword,
  resetPassword,
  deleteAccount,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

router.post("/signup/request-otp", asyncRoute(sendSignupOtp)); // SMS OTP - verify phone BEFORE the account exists (only SMS in the app)
router.post("/signup", asyncRoute(signup));
router.post("/login", asyncRoute(login)); // phone + password
router.post("/forgot-password", asyncRoute(forgotPassword)); // reset code by EMAIL
router.post("/reset-password", asyncRoute(resetPassword)); // reset password using the emailed code
router.get("/me", protect, asyncRoute(getMe));
router.patch("/profile", protect, asyncRoute(updateProfile));
router.post("/push-token", protect, asyncRoute(registerPushToken));
router.post("/delete-account", protect, asyncRoute(deleteAccount)); // in-app account deletion (Play Store requirement)

// Where this account is signed in, and how to end a session you do not recognise
router.post("/logout", protect, asyncRoute(logout));
router.get("/sessions", protect, asyncRoute(listSessions));
router.delete("/sessions/:id", protect, asyncRoute(revokeSession));
router.post("/sessions/revoke-others", protect, asyncRoute(revokeOtherSessions));

module.exports = router;
