// Real SMS OTP delivery via Twilio (https://twilio.com).
//
// Why Twilio for now: it's the fastest path to genuinely testing OTP end
// to end - signup gives ~100 free trial SMS credits immediately, no DLT
// registration or account-verification wait like the domestic providers
// require. The one thing to know: a TRIAL Twilio account can only send to
// phone numbers you've explicitly "verified" in the Twilio console (Phone
// Numbers -> Verified Caller IDs) - up to 5 numbers. That's fine for
// testing (verify your own number + a couple of testers' numbers) but
// isn't meant for real users at launch - swap to a domestic provider
// (2Factor, MSG91) before going live with real signups, since Twilio's
// per-SMS cost in India is notably higher and non-DLT delivery isn't
// guaranteed at scale.
//
// SETUP (required before OTP flows will work):
//   1. Sign up at twilio.com - trial credits are issued immediately.
//   2. From the Twilio Console dashboard, copy your Account SID and Auth
//      Token, and note the trial phone number Twilio assigns you.
//   3. Under Phone Numbers -> Verified Caller IDs, add and verify every
//      number you want to be able to receive test OTPs on (your own
//      number, any testers).
//   4. In server/.env, set:
//        TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//        TWILIO_AUTH_TOKEN=your_auth_token
//        TWILIO_PHONE_NUMBER=+1xxxxxxxxxx   (the number Twilio gave you)
//
// No dev-mode fallback: if these aren't set, sendOtp() throws instead of
// silently succeeding, so a misconfigured server fails loudly at request
// time instead of pretending an OTP went out when it didn't.

const twilio = require("twilio");

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Sends a real OTP SMS. Throws on any failure (missing config, network
// error, or Twilio itself rejecting the request) - callers must handle
// this and tell the user honestly rather than assuming delivery.
async function sendOtp(phone, otp) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error(
      "Twilio isn't configured on the server. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env (see services/otpService.js for setup steps)."
    );
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const toNumber = phone.startsWith("+") ? phone : `+91${phone}`;

  try {
    await client.messages.create({
      body: `${otp} is your Rankveer verification code. Valid for 10 minutes. Don't share this with anyone.`,
      from: TWILIO_PHONE_NUMBER,
      to: toNumber,
    });
  } catch (err) {
    // Twilio error 21608 = "unverified number" - the single most common
    // trial-account issue, worth a specific message instead of a generic one.
    if (err.code === 21608) {
      throw new Error(
        `${phone} isn't a verified number in your Twilio trial yet. Add it under Phone Numbers -> Verified Caller IDs in the Twilio console, then try again.`
      );
    }
    throw new Error(`SMS gateway rejected the request: ${err.message}`);
  }

  return { sent: true };
}

module.exports = { generateOtpCode, sendOtp };