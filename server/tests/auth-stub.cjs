// Preloaded into the server under test (node -r). Replaces real SMS/email
// delivery with a file log, so the test never contacts Twilio or Gmail.
// Must patch the module exports BEFORE authController.js destructures them.
const path = require("path");
const fs = require("fs");
const SERVER = require("path").resolve(__dirname, "..");
const OUT = path.join(__dirname, "captured.jsonl");

const otp = require(path.join(SERVER, "services/otpService.js"));
otp.sendOtp = async (phone, code) => {
  if (process.env.FAIL_SMS_FOR === phone) throw new Error("simulated provider failure");
  fs.appendFileSync(OUT, JSON.stringify({ ch: "sms", to: phone, code }) + "\n");
};

const email = require(path.join(SERVER, "services/emailService.js"));
email.isEmailConfigured = () => true;
email.sendPasswordResetCode = async (to, code) => {
  fs.appendFileSync(OUT, JSON.stringify({ ch: "email", to, code }) + "\n");
};

console.log("[stub] SMS + email delivery stubbed");
