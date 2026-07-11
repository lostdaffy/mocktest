// OTP service for mobile-number-based login and password reset.
//
// IMPORTANT - HOW OTP DELIVERY WORKS RIGHT NOW:
// Sending a real SMS requires a paid SMS gateway (MSG91, Fast2SMS, Twilio, etc.).
// Until you set one up, this service runs in "dev mode": it does NOT send an
// SMS. Instead, generateOtp() returns the OTP so it can be shown on screen /
// logged, which is enough for demos and testing.
//
// TO GO LIVE WITH REAL SMS LATER:
//   1. Create an account with an SMS provider (e.g. Fast2SMS - cheap for India).
//   2. Put its API key in .env, e.g. SMS_API_KEY=...
//   3. Fill in the sendSms() function below with the provider's API call.
//   4. Set SMS_ENABLED=true in .env.
// No other code changes are needed - the login/reset flow already calls this.

const fetch = require("node-fetch");

const SMS_ENABLED = process.env.SMS_ENABLED === "true";

// Generates a 6-digit OTP.
function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Sends the OTP to a phone number. In dev mode (no SMS gateway configured),
// it simply logs to the server console and reports that it wasn't actually sent.
// Returns { sent: boolean } so the caller can decide whether to surface the OTP
// to the client for testing.
async function sendOtp(phone, otp) {
  if (!SMS_ENABLED) {
    console.log(`[DEV OTP] Phone ${phone} -> OTP ${otp} (SMS not sent; SMS_ENABLED is false)`);
    return { sent: false };
  }

  // ---- REAL SMS SENDING (example for Fast2SMS; adjust to your provider) ----
  try {
    await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: process.env.SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: otp,
        numbers: phone,
      }),
    });
    return { sent: true };
  } catch (err) {
    console.error("SMS send failed:", err.message);
    return { sent: false };
  }
}

module.exports = { generateOtpCode, sendOtp, SMS_ENABLED };