const User = require("../models/User");
const Attempt = require("../models/Attempt");
const Report = require("../models/Report");
const Test = require("../models/Test");
const Subscription = require("../models/Subscription");
const PhoneOtp = require("../models/PhoneOtp");
const DeletedAccount = require("../models/DeletedAccount");
const crypto = require("crypto");

// Keyed with the server secret so the stored value can't be reversed, or
// matched against a guessed number, by anyone who only has the database.
// (Rotating JWT_SECRET just means older records stop matching - harmless.)
const hashPhone = (phone) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(`deleted-phone:${phone}`).digest("hex");

// Deletes an account and everything tied to it. ONE implementation, used
// both by the student deleting their own account in the app and by an admin
// doing it for someone who asked by email - the website promises the same
// outcome either way, so they must not drift apart.
//
// Paid subscription records are kept, as Indian tax/accounting law requires,
// but they only point at an account id that no longer exists - no name,
// phone or email is left in them.
async function deleteAccountData(user) {
  const userId = user._id;
  const phone = user.phone;
  const usage = user.freeUsage || {};

  // Recorded first: if anything below fails, the account still exists and
  // the deletion can simply be retried.
  if (phone) {
    await DeletedAccount.findOneAndUpdate(
      { phoneHash: hashPhone(phone) },
      {
        freeUsage: {
          mockTestsUsed: usage.mockTestsUsed || 0,
          liveExamsUsed: usage.liveExamsUsed || 0,
          pyqUsed: usage.pyqUsed || 0,
        },
        deletedAt: new Date(),
      },
      { upsert: true }
    );
  }

  await Promise.all([
    Attempt.deleteMany({ user: userId }), // results, answers, live-exam ranks
    Report.deleteMany({ reportedBy: userId }),
    Test.deleteMany({ generatedForUser: userId }), // their personal practice tests
    Subscription.deleteMany({ user: userId, status: { $ne: "paid" } }), // unpaid orders aren't tax records
    phone ? PhoneOtp.deleteMany({ phone }) : null,
  ]);

  // Last - this also ends every session, since the auth middleware rejects
  // tokens for users that no longer exist.
  await User.deleteOne({ _id: userId });
}

module.exports = { deleteAccountData, hashPhone };
