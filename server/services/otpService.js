// Real SMS OTP delivery via Fast2SMS (https://fast2sms.com).
//
// SETUP (required before OTP flows will work):
//   1. Sign up at fast2sms.com (comes with ₹50 free credit to start).
//   2. Copy your API key from the Dev API section of the dashboard.
//   3. In server/.env, set:
//        SMS_API_KEY=your_key_here
//   4. Optional but recommended once you have DLT-approved templates:
//        SMS_SENDER_ID=your_6_char_sender_id
//        SMS_DLT_TEMPLATE_ID=your_approved_template_id
//      Without these, Fast2SMS sends via its default OTP route, which
//      works but shows a generic sender rather than your brand name.
//
// No dev-mode fallback: if SMS_API_KEY isn't set, sendOtp() throws instead
// of silently succeeding, so a misconfigured server fails loudly at request
// time instead of pretending an OTP went out when it didn't.

const fetch = require("node-fetch");

const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID;
const SMS_DLT_TEMPLATE_ID = process.env.SMS_DLT_TEMPLATE_ID;

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

  const params = new URLSearchParams({
    authorization: SMS_API_KEY,
    route: SMS_DLT_TEMPLATE_ID ? "dlt" : "otp",
    variables_values: otp,
    numbers: phone,
  });
  if (SMS_SENDER_ID) params.set("sender_id", SMS_SENDER_ID);
  if (SMS_DLT_TEMPLATE_ID) params.set("template_id", SMS_DLT_TEMPLATE_ID);

  let response;
  try {
    response = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
      method: "GET",
    });
  } catch (err) {
    throw new Error("Couldn't reach the SMS gateway - check server internet access.");
  }

  const data = await response.json().catch(() => null);
  if (!data || data.return !== true) {
    const reason = Array.isArray(data?.message) ? data.message.join(", ") : data?.message || "unknown error";
    throw new Error(`SMS gateway rejected the request: ${reason}`);
  }

  return { sent: true };
}

module.exports = { generateOtpCode, sendOtp };