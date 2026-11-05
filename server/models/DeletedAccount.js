const mongoose = require("mongoose");

// Left behind when a student deletes their account. Holds NO personal data:
// phoneHash is a keyed HMAC of the number (see hashPhone in
// authController.js), so it can't be turned back into the number, or even
// checked against a guess, without the server secret. It only lets signup
// recognise "this number had an account before", which stops a
// delete-and-sign-up-again loop from re-claiming the referral reward and a
// fresh set of free tests. Purged automatically after a year.
const deletedAccountSchema = new mongoose.Schema({
  phoneHash: { type: String, required: true, unique: true },
  freeUsage: {
    mockTestsUsed: { type: Number, default: 0 },
    liveExamsUsed: { type: Number, default: 0 },
    pyqUsed: { type: Number, default: 0 },
  },
  // Coupons this number already used, so deleting the account and signing
  // up again doesn't make a one-time coupon usable a second time.
  usedCoupons: { type: [String], default: [] },
  deletedAt: { type: Date, default: Date.now },
});

deletedAccountSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model("DeletedAccount", deletedAccountSchema);
