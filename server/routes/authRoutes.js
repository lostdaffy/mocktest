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
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/signup/request-otp", sendSignupOtp); // SMS OTP - verify phone BEFORE the account exists (only SMS in the app)
router.post("/signup", signup);
router.post("/login", login); // phone + password
router.post("/forgot-password", forgotPassword); // reset code by EMAIL
router.post("/reset-password", resetPassword); // reset password using the emailed code
router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);
router.post("/push-token", protect, registerPushToken);

module.exports = router;
