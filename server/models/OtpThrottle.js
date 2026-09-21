const mongoose = require("mongoose");

// Send-rate bookkeeping for anything that costs money or can be abused to
// spam a person: SMS OTPs at signup, password-reset emails.
//
// Deliberately separate from PhoneOtp / the User reset fields: those hold a
// *code* and are deleted as soon as it expires (10-15 min), which would also
// wipe the counter and quietly reset a 24-hour limit every few minutes.
// These documents live for a day after their last send instead.
const otpThrottleSchema = new mongoose.Schema({
  // e.g. "sms:signup:9876543210" or "email:reset:<userId>"
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, required: true },
  lastSentAt: { type: Date, required: true },
  // Mongo deletes the document at this time (TTL index below), so idle keys
  // clean themselves up. Pushed forward on every send.
  purgeAt: { type: Date, required: true },
});

otpThrottleSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpThrottle", otpThrottleSchema);
