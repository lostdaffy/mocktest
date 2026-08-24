const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const PhoneOtp = require("../models/PhoneOtp");
const { generateOtpCode, sendOtp } = require("../services/otpService");
const { REFERRAL_SIGNUP_REWARD, REFERRAL_OFFER_ACTIVE } = require("../config/referral");

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
// one place so every entry point (password, OTP, signup) returns
// exactly the same fields.
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

// POST /api/auth/signup/request-otp  { phone }
// Verifies phone ownership BEFORE an account exists. Rate-limited to one
// send per phone per 60 seconds (via checking the existing record's age)
// so a signup form can't be used to spam a number with SMS.
async function sendSignupOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone.trim())) {
      return res.status(400).json({ message: "Valid 10-digit Indian mobile number daalo" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "An account with this phone number already exists" });
    }

    const recent = await PhoneOtp.findOne({ phone }).sort({ createdAt: -1 });
    if (recent && Date.now() - recent.createdAt.getTime() < 60 * 1000) {
      return res.status(429).json({ message: "Thoda ruko, dobara OTP bhejne se pehle 1 minute wait karo" });
    }

    const otp = generateOtpCode();
    const otpHash = await bcrypt.hash(otp, 10);
    await PhoneOtp.findOneAndUpdate(
      { phone },
      { otpHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtp(phone, otp);

    res.json({ message: "OTP aapke mobile number pe bhej diya gaya hai" });
  } catch (err) {
    res.status(500).json({ message: err.message || "OTP bhejne mein problem hui, thodi der baad try karo" });
  }
}

// POST /api/auth/signup - phone + password path (verified via OTP above)
async function signup(req, res) {
  try {
    const { name, phone, email, password, preferredLanguage, examGoals, referralCode, otp } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: "Name, phone, and password are required" });
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      return res.status(400).json({ message: "Valid 10-digit Indian mobile number daalo" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Email format valid nahi hai" });
    }

    // Phone must have been verified via /auth/signup/request-otp first -
    // this is what actually stops fake/typo'd numbers from creating accounts.
    if (!otp) {
      return res.status(400).json({ message: "Phone verification zaroori hai. Pehle OTP bhejo." });
    }
    const otpRecord = await PhoneOtp.findOne({ phone: phone.trim() });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expire ho gaya hai. Naya OTP mangwao." });
    }
    const otpOk = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!otpOk) {
      return res.status(400).json({ message: "OTP galat hai" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "An account with this phone number already exists" });
    }

    // Resolve referrer if a referral code was entered
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
      if (referrer) referredBy = referrer._id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const myReferralCode = await generateUniqueReferralCode(name);

    const user = await User.create({
      name,
      phone,
      email: email ? email.trim().toLowerCase() : null,
      passwordHash,
      authProvider: "password",
      preferredLanguage: preferredLanguage || "hi",
      examGoals: examGoals || [],
      referralCode: myReferralCode,
      referredBy,
    });

    // Referral payout happens HERE, at signup - see config/referral.js for
    // why it's on install rather than on the friend's eventual purchase.
    // Signup happens exactly once per account, so this can't double-pay;
    // rewardedReferral is still set as an explicit audit trail.
    if (referredBy && REFERRAL_OFFER_ACTIVE) {
      await User.findByIdAndUpdate(referredBy, {
        $inc: { referralCredits: REFERRAL_SIGNUP_REWARD, referralCount: 1 },
      });
      user.rewardedReferral = true;
      await user.save();
    }

    // OTP can't be reused for another signup attempt now that it's done its job.
    await PhoneOtp.deleteOne({ phone: phone.trim() });

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
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    const user = await User.findOne({ phone }).select("+passwordHash");
    if (!user) return res.status(401).json({ message: "Invalid phone number or password" });

    // Legacy accounts created before Google Sign-In was removed have no
    // password. OTP login still works for them (it only needs the phone),
    // so point them there rather than leaving them stuck.
    if (!user.passwordHash) {
      return res.status(400).json({
        message: "Is account pe password set nahi hai. OTP se login karo, phir Profile mein password bana lo.",
        code: "NO_PASSWORD_SET",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid phone number or password" });

    const token = await startSession(user);
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

// PATCH /api/auth/profile - update name, exam goals, or preferred language
async function updateProfile(req, res) {
  try {
    const { name, examGoals, preferredLanguage, email } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (examGoals) updates.examGoals = examGoals;
    if (preferredLanguage && ["hi", "en"].includes(preferredLanguage)) updates.preferredLanguage = preferredLanguage;
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ message: "Email format valid nahi hai" });
      }
      updates.email = email.trim().toLowerCase();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) {
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

// POST /api/auth/request-otp  { phone }
// Used for BOTH "login with OTP" and "forgot password". Generates a 6-digit
// OTP tied to the phone number and delivers it via real SMS.
async function requestOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!/^[6-9]\d{9}$/.test((phone || "").trim())) {
      return res.status(400).json({ message: "Valid 10-digit mobile number daalo" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "Is number se koi account nahi mila. Pehle signup karo." });
    }

    const otp = generateOtpCode();
    user.passwordResetOTPHash = await bcrypt.hash(otp, 10);
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    await sendOtp(phone, otp);

    res.json({ message: "OTP aapke mobile number pe bhej diya gaya hai" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "OTP bhejne mein problem hui, thodi der baad try karo" });
  }
}

// Internal helper: validates an OTP for a phone number. Returns the user if
// valid, otherwise null.
async function validateOtp(phone, otp) {
  const user = await User.findOne({ phone }).select("+passwordResetOTPHash +passwordResetExpires");
  if (!user || !user.passwordResetOTPHash || !user.passwordResetExpires) return null;
  if (new Date() > user.passwordResetExpires) return null;
  const ok = await bcrypt.compare(otp, user.passwordResetOTPHash);
  return ok ? user : null;
}

// POST /api/auth/login-otp  { phone, otp }
// Logs a user in using a mobile OTP instead of a password.
async function loginWithOtp(req, res) {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: "Phone aur OTP dono chahiye" });

    const user = await validateOtp(phone, otp);
    if (!user) return res.status(400).json({ message: "OTP galat ya expire ho gaya hai" });

    // Consume the OTP so it can't be reused
    user.passwordResetOTPHash = undefined;
    user.passwordResetExpires = undefined;

    const token = await startSession(user); // also saves the user
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OTP login fail hua", error: err.message });
  }
}

// POST /api/auth/reset-password  { phone, otp, newPassword }
// Resets password after verifying the OTP sent via request-otp.
async function resetPassword(req, res) {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: "Phone, OTP, aur naya password chahiye" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password kam se kam 6 characters ka hona chahiye" });
    }

    const user = await validateOtp(phone, otp);
    if (!user) return res.status(400).json({ message: "OTP galat ya expire ho gaya hai" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetOTPHash = undefined;
    user.passwordResetExpires = undefined;
    // Resetting the password also ends every existing session (including
    // wherever the account is currently logged in) - standard practice,
    // since a password reset often means "I think someone else has access."
    user.activeSessionId = null;
    await user.save();

    res.json({ message: "Password reset ho gaya. Ab login karo." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Password reset fail hua", error: err.message });
  }
}

module.exports = {
  signup,
  sendSignupOtp,
  login,
  getMe,
  updateProfile,
  registerPushToken,
  requestOtp,
  loginWithOtp,
  resetPassword,
};