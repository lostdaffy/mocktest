const express = require("express");
const router = express.Router();
const {
  signup,
  sendSignupOtp,
  login,
  googleAuth,
  getMe,
  updateProfile,
  requestOtp,
  loginWithOtp,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/signup/request-otp", sendSignupOtp); // verify phone BEFORE account exists
router.post("/signup", signup);
router.post("/login", login); // mobile + password
router.post("/google", googleAuth); // Google Sign-In (signup on first use, login after)
router.post("/request-otp", requestOtp); // send OTP (for OTP login OR password reset)
router.post("/login-otp", loginWithOtp); // mobile + OTP login
router.post("/reset-password", resetPassword); // reset password using OTP
router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);

module.exports = router;