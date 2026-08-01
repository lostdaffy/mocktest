// Real SMS OTP delivery via 2Factor.in (https://2factor.in).
//
// Why 2Factor instead of Fast2SMS: Fast2SMS's OTP route requires an
// account-level "website verification" step (or full DLT registration)
// before it'll send anything - a real blocker while getting started.
// 2Factor's custom-OTP send route works with a free trial account with no
// such gate, and matches our exact flow: WE generate and hash the OTP
// ourselves (see authController.js), 2Factor just has to deliver the exact
// code we hand it - no AUTOGEN, no session IDs to track.
//
// SETUP (required before OTP flows will work):
//   1. Sign up at 2factor.in - free trial credits are issued immediately,
//      no lengthy verification required to start sending test OTPs.
//   2. Copy your API key from the 2Factor dashboard.
//   3. In server/.env, set:
//        SMS_API_KEY=your_2factor_api_key_here
//
// No dev-mode fallback: if SMS_API_KEY isn't set, sendOtp() throws instead
// of silently succeeding, so a misconfigured server fails loudly at request
// time instead of pretending an OTP went out when it didn't.
//
// Later, once you've done DLT registration and have a custom sender/template
// approved with 2Factor, their dashboard lets you attach that template to
// this same API key - no code change needed here to pick it up.

const fetch = require("node-fetch");

const SMS_API_KEY = process.env.SMS_API_KEY;

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Sends a real OTP SMS. Throws on any failure (missing config, network
// error, or the gateway itself reporting failure) - callers must handle
// this and tell the user honestly rather than assuming delivery.
async function sendOtp(phone, otp) {
  if (!SMS_API_KEY) {
    throw new Error(
      "SMS_API_KEY is not configured on the server. Add it to .env (see services/otpService.js for setup steps)."
    );
  }

  const url = `https://2factor.in/API/V1/${SMS_API_KEY}/SMS/${phone}/${otp}`;

  let response;
  try {
    response = await fetch(url, { method: "POST" });
  } catch (err) {
    throw new Error("Couldn't reach the SMS gateway - check server internet access.");
  }

  const data = await response.json().catch(() => null);
  if (!data || data.Status !== "Success") {
    const reason = data?.Details || "unknown error";
    throw new Error(`SMS gateway rejected the request: ${reason}`);
  }

  return { sent: true };
}

module.exports = { generateOtpCode, sendOtp };