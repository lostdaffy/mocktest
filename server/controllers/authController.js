const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const PhoneOtp = require("../models/PhoneOtp");
const Attempt = require("../models/Attempt");
const Report = require("../models/Report");
const Test = require("../models/Test");
const Subscription = require("../models/Subscription");
const DeletedAccount = require("../models/DeletedAccount");
const { generateOtpCode, sendOtp } = require("../services/otpService");
const { isEmailConfigured, sendPasswordResetCode } = require("../services/emailService");
const { claimSend, releaseSend, throttleMessage } = require("../utils/sendThrottle");
const { REFERRAL_SIGNUP_REWARD, REFERRAL_OFFER_ACTIVE } = require("../config/referral");

// How the auth system uses each channel:
//   SMS OTP  - ONLY to prove a phone number is real, once, at signup. It's
//              the one step that costs money per use, so nothing else uses it.
//   Password - every login.
//   Email    - password reset (free).
//
// Limits, tuned for bulk signups while keeping paid SMS and account
// takeover attempts in check:
const SIGNUP_SMS = { cooldownSec: 60, dailyMax: 5 }; // per phone number
// Hard ceiling on paid SMS across the WHOLE app per 24h. Per-number and
// per-IP limits stop one bot; this is what stops a distributed attack
// (thousands of IPs, thousands of numbers) from draining the SMS balance
// overnight. Raise SMS_DAILY_LIMIT in Render as real signups grow.
const GLOBAL_SMS = { cooldownSec: 0, dailyMax: Number(process.env.SMS_DAILY_LIMIT) || 500 };
const RESET_EMAIL = { cooldownSec: 60, dailyMax: 5 }; // per account
const MAX_CODE_ATTEMPTS = 5; // wrong guesses before a code is discarded
const MAX_LOGIN_FAILURES = 5; // wrong passwords before the account locks
const LOCK_MINUTES = 15;
const RESET_CODE_MINUTES = 15;

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Compared against when a login names a phone number that doesn't exist, so
// the response takes about as long as a real wrong-password check and
// timing alone can't reveal which numbers are registered.
const DUMMY_HASH = bcrypt.hashSync("rankveer-timing-guard", 10);

// Starts a fresh session for a user: generates a new random sessionId,
// saves it as the ONLY valid one on the User document, and returns a JWT
// carrying it. Any token issued before this call stops working the moment
// this save() completes - that's the entire single-device mechanism, no
// device tracking needed.
async function startSession(user) {
  const sessionId = crypto.randomBytes(24).toString("hex");
  user.activeSessionId = sessionId;
  await user.save();
  const token = jwt.sign({ id: user._id, sessionId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
  return token;
}

// Shape returned to the client after any successful login/signup - kept in
// one place so every entry point returns exactly the same fields.
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    examGoals: user.examGoals,
    preferredLanguage: user.preferredLanguage,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    streakCount: user.streakCount,
    topicStats: user.topicStats,
    referralCode: user.referralCode,
  };
}

// "satyaprakash@gmail.com" -> "s**********h@gmail.com": enough for the
// student to recognise which inbox to check, not enough to hand out their
// address to anyone who types in their phone number.
function maskEmail(email) {
  const [local, domain] = String(email).split("@");
  if (!domain) return "your email";
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 10))}${local[local.length - 1]}@${domain}`;
}

const isDuplicateKey = (err, field) => err && err.code === 11000 && (!field || JSON.stringify(err.keyPattern || {}).includes(field));

// Deleting an account is also something an admin can do on request (see
// adminUserController), so both paths share one implementation.
const { deleteAccountData, hashPhone } = require("../services/accountDeletion");

// Asks an already-logged-in student for their password again before a
// sensitive action (changing the recovery email, deleting the account).
// Shares the login lockout counter, so a stolen, unlocked phone can't be
// used to brute-force the password through these screens either.
// Returns null when the password is right, otherwise the response to send.
async function recheckPassword(userId, password, wrongMessage) {
  const me = await User.findById(userId).select("+passwordHash +failedLoginAttempts +lockUntil");
  if (!me.passwordHash) return null; // legacy account - there's no password to check

  if (me.lockUntil && me.lockUntil > new Date()) {
    const minutes = Math.ceil((me.lockUntil - Date.now()) / 60000);
    return {
      status: 423,
      body: { message: `Bahut baar galat password daala gaya. ${minutes} minute baad try karo.`, code: "ACCOUNT_LOCKED" },
    };
  }

  if (!password || !(await bcrypt.compare(String(password), me.passwordHash))) {
    if (password) {
      const failed = await User.findByIdAndUpdate(
        me._id,
        { $inc: { failedLoginAttempts: 1 } },
        { new: true, select: "+failedLoginAttempts" }
      );
      if (failed.failedLoginAttempts >= MAX_LOGIN_FAILURES) {
        await User.updateOne(
          { _id: me._id },
          { $set: { lockUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000), failedLoginAttempts: 0 } }
        );
      }
    }
    return { status: 401, body: { message: wrongMessage, code: "PASSWORD_REQUIRED" } };
  }

  if (me.failedLoginAttempts) {
    await User.updateOne({ _id: me._id }, { failedLoginAttempts: 0 });
  }
  return null;
}

// Generates a short, human-friendly referral code (e.g. "SATYA4K2"). Retries
// on the rare chance of a collision.
async function generateUniqueReferralCode(name) {
  const base = (name || "USER").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4) || "USER";
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${base}${suffix}`;
    const exists = await User.findOne({ referralCode: code });
    if (!exists) return code;
  }
  // Fallback: timestamp-based, effectively collision-proof
  return `U${Date.now().toString(36).toUpperCase()}`;
}

// POST /api/auth/signup/request-otp  { phone, email? }
// The ONLY place the app sends an SMS: proves the student owns the number
// before an account exists.
async function sendSignupOtp(req, res) {
  const phone = String(req.body.phone || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const throttleKey = `sms:signup:${phone}`;

  try {
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ message: "Valid 10-digit Indian mobile number daalo" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "Is number se account pehle se bana hua hai. Login karo." });
    }

    // Every SMS costs money - catch a signup that's going to fail anyway
    // (bad or already-used email) BEFORE paying to send the code.
    if (email) {
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Email format valid nahi hai" });
      }
      if (await User.exists({ email })) {
        return res.status(409).json({ message: "Ye email pehle se kisi aur account mein use ho raha hai", code: "EMAIL_TAKEN" });
      }
    }

    const slot = await claimSend(throttleKey, SIGNUP_SMS);
    if (!slot.ok) {
      return res.status(429).json({ message: throttleMessage(slot), retryAfterSec: slot.retryAfterSec });
    }

    const budget = await claimSend("sms:global", GLOBAL_SMS);
    if (!budget.ok) {
      await releaseSend(throttleKey);
      console.error(`SMS daily budget of ${GLOBAL_SMS.dailyMax} reached - signup OTPs paused. Raise SMS_DAILY_LIMIT if this is real traffic.`);
      return res.status(503).json({ message: "Abhi bahut zyada signups ho rahe hain. Kuch der baad dobara try karo.", code: "SMS_BUDGET" });
    }

    const otp = generateOtpCode();
    const otpHash = await bcrypt.hash(otp, 10);
    await PhoneOtp.findOneAndUpdate(
      { phone },
      { otpHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendOtp(phone, otp);
    } catch (err) {
      // The SMS never left - give the attempt back so the student can retry.
      await releaseSend(throttleKey);
      await releaseSend("sms:global");
      console.error("Signup OTP SMS failed:", err.message);
      return res.status(502).json({ message: "OTP bhejne mein problem hui. Thodi der baad dobara try karo." });
    }

    res.json({ message: "OTP aapke mobile number pe bhej diya gaya hai" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OTP bhejne mein problem hui, thodi der baad try karo" });
  }
}

// POST /api/auth/signup - phone (verified via OTP above) + email + password
async function signup(req, res) {
  try {
    const { name, password, preferredLanguage, examGoals, referralCode, otp } = req.body;
    const phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name || !phone || !password || !email) {
      return res.status(400).json({ message: "Naam, phone, email aur password - sab zaroori hain" });
    }
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ message: "Valid 10-digit Indian mobile number daalo" });
    }
    // Email is required because it's the only way to reset a forgotten
    // password - an account without one could be lost for good.
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Email format valid nahi hai" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password kam se kam 6 characters ka hona chahiye" });
    }

    // Phone must have been verified via /auth/signup/request-otp first -
    // this is what actually stops fake/typo'd numbers from creating accounts.
    if (!otp) {
      return res.status(400).json({ message: "Phone verification zaroori hai. Pehle OTP bhejo." });
    }
    const otpRecord = await PhoneOtp.findOne({ phone });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expire ho gaya hai. Naya OTP mangwao." });
    }
    const otpOk = await bcrypt.compare(String(otp), otpRecord.otpHash);
    if (!otpOk) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      if (otpRecord.attempts >= MAX_CODE_ATTEMPTS) {
        await PhoneOtp.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ message: "Bahut baar galat OTP daala. Naya OTP mangwao.", code: "OTP_ATTEMPTS_EXCEEDED" });
      }
      await otpRecord.save();
      return res.status(400).json({ message: `OTP galat hai. ${MAX_CODE_ATTEMPTS - otpRecord.attempts} try baaki.` });
    }

    if (await User.findOne({ phone })) {
      return res.status(409).json({ message: "Is number se account pehle se bana hua hai. Login karo." });
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "Ye email pehle se kisi aur account mein use ho raha hai", code: "EMAIL_TAKEN" });
    }

    // Resolve referrer if a referral code was entered
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: String(referralCode).trim().toUpperCase() });
      if (referrer) referredBy = referrer._id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const myReferralCode = await generateUniqueReferralCode(name);

    // Has this number deleted an account before? Then it doesn't get a
    // second referral payout or a fresh set of free tests - otherwise
    // delete-and-sign-up-again would be a free, repeatable loop.
    const priorAccount = await DeletedAccount.findOne({ phoneHash: hashPhone(phone) }).lean();

    let user;
    try {
      user = await User.create({
        name,
        phone,
        email,
        passwordHash,
        authProvider: "password",
        preferredLanguage: preferredLanguage || "hi",
        examGoals: examGoals || [],
        referralCode: myReferralCode,
        referredBy,
        ...(priorAccount?.freeUsage ? { freeUsage: priorAccount.freeUsage } : {}),
      });
    } catch (err) {
      // Two signups racing for the same phone/email - the unique indexes
      // catch what the checks above couldn't.
      if (isDuplicateKey(err, "email")) {
        return res.status(409).json({ message: "Ye email pehle se kisi aur account mein use ho raha hai", code: "EMAIL_TAKEN" });
      }
      if (isDuplicateKey(err, "phone")) {
        return res.status(409).json({ message: "Is number se account pehle se bana hua hai. Login karo." });
      }
      throw err;
    }

    // Referral payout happens HERE, at signup - see config/referral.js for
    // why it's on install rather than on the friend's eventual purchase.
    // Signup happens exactly once per account, so this can't double-pay;
    // rewardedReferral is still set as an explicit audit trail.
    if (referredBy && REFERRAL_OFFER_ACTIVE && !priorAccount) {
      await User.findByIdAndUpdate(referredBy, {
        $inc: { referralCredits: REFERRAL_SIGNUP_REWARD, referralCount: 1 },
      });
      user.rewardedReferral = true;
      await user.save();
    }

    // OTP can't be reused for another signup attempt now that it's done its job.
    await PhoneOtp.deleteOne({ phone });

    const token = await startSession(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
}

// POST /api/auth/login  { phone, password }
async function login(req, res) {
  try {
    const phone = String(req.body.phone || "").trim();
    const { password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone aur password dono daalo" });
    }

    const user = await User.findOne({ phone }).select("+passwordHash +failedLoginAttempts +lockUntil");
    if (!user) {
      await bcrypt.compare(String(password), DUMMY_HASH);
      return res.status(401).json({ message: "Phone number ya password galat hai" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Bahut baar galat password daala gaya. ${minutes} minute baad try karo, ya "Forgot password" se naya password bana lo.`,
        code: "ACCOUNT_LOCKED",
        retryAfterSec: minutes * 60,
      });
    }

    // Accounts created before Google Sign-In was removed have no password.
    // They all have an email (Google provided it), so the email reset flow
    // gets them in.
    if (!user.passwordHash) {
      return res.status(400).json({
        message: 'Is account pe password set nahi hai. "Forgot password" se email pe code mangwao aur password bana lo.',
        code: "NO_PASSWORD_SET",
      });
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      // Atomic increment - two wrong attempts landing together both count.
      const updated = await User.findByIdAndUpdate(
        user._id,
        { $inc: { failedLoginAttempts: 1 } },
        { new: true, select: "+failedLoginAttempts" }
      );
      if (updated.failedLoginAttempts >= MAX_LOGIN_FAILURES) {
        await User.updateOne(
          { _id: user._id },
          { $set: { lockUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000), failedLoginAttempts: 0 } }
        );
        return res.status(423).json({
          message: `Bahut baar galat password daala gaya. Account ${LOCK_MINUTES} minute ke liye lock hai. "Forgot password" se naya password bana sakte ho.`,
          code: "ACCOUNT_LOCKED",
          retryAfterSec: LOCK_MINUTES * 60,
        });
      }
      const left = MAX_LOGIN_FAILURES - updated.failedLoginAttempts;
      return res.status(401).json({
        message: left <= 2 ? `Phone number ya password galat hai. ${left} try baaki, phir account kuch der ke liye lock ho jayega.` : "Phone number ya password galat hai",
      });
    }

    if (user.failedLoginAttempts || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
    }

    const token = await startSession(user); // also saves the cleared counters
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  // req.user comes from the auth middleware, which explicitly re-selects
  // activeSessionId to run the single-device check - strip it back out
  // before it goes anywhere near the client.
  const user = req.user.toObject();
  delete user.activeSessionId;
  res.json({ user });
}

// PATCH /api/auth/profile - update name, exam goals, preferred language or email
async function updateProfile(req, res) {
  try {
    const { name, examGoals, preferredLanguage, email, currentPassword } = req.body;
    const updates = {};
    if (name) updates.name = String(name).trim();
    if (examGoals) updates.examGoals = examGoals;
    if (preferredLanguage && ["hi", "en"].includes(preferredLanguage)) updates.preferredLanguage = preferredLanguage;

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!EMAIL_RE.test(cleanEmail)) {
        return res.status(400).json({ message: "Email format valid nahi hai" });
      }

      if (cleanEmail !== (req.user.email || "")) {
        // The email is where password-reset codes go, so changing it is
        // effectively changing who can take over the account. Anyone
        // holding an unlocked phone shouldn't be able to do that silently -
        // ask for the password first.
        const denied = await recheckPassword(
          req.user._id,
          currentPassword,
          "Email badalne ke liye apna current password sahi daalo"
        );
        if (denied) return res.status(denied.status).json(denied.body);
        if (await User.findOne({ email: cleanEmail, _id: { $ne: req.user._id } })) {
          return res.status(409).json({ message: "Ye email pehle se kisi aur account mein use ho raha hai", code: "EMAIL_TAKEN" });
        }
        updates.email = cleanEmail;
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) {
    if (isDuplicateKey(err, "email")) {
      return res.status(409).json({ message: "Ye email pehle se kisi aur account mein use ho raha hai", code: "EMAIL_TAKEN" });
    }
    res.status(500).json({ message: "Profile update failed", error: err.message });
  }
}

// POST /api/auth/push-token  { token }
// Registers this device's Expo push token, used for live-exam start
// reminders. Overwritten on every call - always reflects whichever device
// the student most recently logged in on.
async function registerPushToken(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "token chahiye" });

  await User.findByIdAndUpdate(req.user._id, { pushToken: token });
  res.json({ message: "Push token saved" });
}

// POST /api/auth/forgot-password  { phone }
// Emails a reset code to the address on the account. Email, not SMS, so a
// forgotten password costs nothing to recover.
async function forgotPassword(req, res) {
  try {
    const phone = String(req.body.phone || "").trim();
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ message: "Valid 10-digit mobile number daalo" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "Is number se koi account nahi mila. Pehle signup karo." });
    }
    if (!user.email) {
      return res.status(400).json({
        message: "Is account mein email add nahi hai, isliye reset code nahi bheja ja sakta. Support se sampark karo.",
        code: "NO_EMAIL",
      });
    }
    if (!isEmailConfigured()) {
      console.error("forgotPassword: EMAIL_USER / EMAIL_APP_PASSWORD are not set");
      return res.status(503).json({ message: "Password reset abhi available nahi hai. Thodi der baad try karo.", code: "EMAIL_NOT_CONFIGURED" });
    }

    const throttleKey = `email:reset:${user._id}`;
    const slot = await claimSend(throttleKey, RESET_EMAIL);
    if (!slot.ok) {
      return res.status(429).json({ message: throttleMessage(slot), retryAfterSec: slot.retryAfterSec });
    }

    const code = generateOtpCode();
    user.passwordResetOTPHash = await bcrypt.hash(code, 10);
    user.passwordResetExpires = new Date(Date.now() + RESET_CODE_MINUTES * 60 * 1000);
    user.passwordResetAttempts = 0;
    await user.save();

    try {
      await sendPasswordResetCode(user.email, code, user.name);
    } catch (err) {
      await releaseSend(throttleKey);
      console.error("Password reset email failed:", err.message);
      return res.status(502).json({ message: "Email bhejne mein problem hui. Thodi der baad dobara try karo." });
    }

    const maskedEmail = maskEmail(user.email);
    res.json({ message: `Reset code ${maskedEmail} pe bhej diya gaya hai`, maskedEmail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reset code bhejne mein problem hui, thodi der baad try karo" });
  }
}

// POST /api/auth/reset-password  { phone, code, newPassword }
// (`otp` is still accepted in place of `code` for older app builds.)
async function resetPassword(req, res) {
  try {
    const phone = String(req.body.phone || "").trim();
    const code = String(req.body.code || req.body.otp || "").trim();
    const { newPassword } = req.body;

    if (!phone || !code || !newPassword) {
      return res.status(400).json({ message: "Phone, reset code aur naya password chahiye" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password kam se kam 6 characters ka hona chahiye" });
    }

    const user = await User.findOne({ phone }).select("+passwordResetOTPHash +passwordResetExpires +passwordResetAttempts");
    if (!user || !user.passwordResetOTPHash || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: "Code expire ho gaya ya galat hai. Naya code mangwao." });
    }

    const ok = await bcrypt.compare(code, user.passwordResetOTPHash);
    if (!ok) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
      if (user.passwordResetAttempts >= MAX_CODE_ATTEMPTS) {
        user.passwordResetOTPHash = undefined;
        user.passwordResetExpires = undefined;
        user.passwordResetAttempts = 0;
        await user.save();
        return res.status(400).json({ message: "Bahut baar galat code daala. Naya code mangwao.", code: "CODE_ATTEMPTS_EXCEEDED" });
      }
      await user.save();
      return res.status(400).json({ message: `Code galat hai. ${MAX_CODE_ATTEMPTS - user.passwordResetAttempts} try baaki.` });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    user.passwordResetOTPHash = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;
    // A successful reset proves ownership, so it also lifts any login lock.
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    // Resetting the password also ends every existing session (including
    // wherever the account is currently logged in) - standard practice,
    // since a password reset often means "I think someone else has access."
    user.activeSessionId = null;
    await user.save();

    res.json({ message: "Password reset ho gaya. Ab naye password se login karo." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Password reset fail hua", error: err.message });
  }
}

// POST /api/auth/delete-account  { password }
// In-app account deletion (a Play Store requirement). Removes everything
// rankveer.com/delete-account says is removed. Paid subscription records
// are kept, as Indian tax/accounting law requires, but they only point at
// an account id that no longer exists - no name, phone or email is left
// in them.
async function deleteAccount(req, res) {
  try {
    // The admin account runs the platform - losing it by a stray tap in the
    // student app would lock everyone out of the admin panel.
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admin account app se delete nahi ho sakta.", code: "ADMIN_ACCOUNT" });
    }

    const denied = await recheckPassword(req.user._id, req.body.password, "Account delete karne ke liye apna password sahi daalo");
    if (denied) return res.status(denied.status).json(denied.body);

    await deleteAccountData(req.user);

    res.json({ message: "Aapka account aur uska data delete ho gaya hai." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Account delete nahi ho paaya, thodi der baad try karo" });
  }
}

module.exports = {
  signup,
  sendSignupOtp,
  login,
  getMe,
  updateProfile,
  registerPushToken,
  forgotPassword,
  resetPassword,
  deleteAccount,
};
