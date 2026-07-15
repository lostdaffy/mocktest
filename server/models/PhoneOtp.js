const mongoose = require("mongoose");

// Short-lived OTP records for verifying a phone number BEFORE an account
// exists (signup) - can't reuse the User-based OTP fields the login/reset
// flow uses, since there's no User document yet at this point.
const phoneOtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index - Mongo auto-deletes the document once expiresAt passes, so
// expired/unused OTPs don't pile up and never need manual cleanup.
phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PhoneOtp", phoneOtpSchema);