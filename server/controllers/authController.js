const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendPasswordResetOTP } = require("../services/emailService");

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
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

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { name, phone, email, password, preferredLanguage, examGoals, referralCode } = req.body;

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
      preferredLanguage: preferredLanguage || "hi",
      examGoals: examGoals || [],
      referralCode: myReferralCode,
      referredBy,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        examGoals: user.examGoals,
        subscriptionStatus: user.subscriptionStatus,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ message: "Invalid phone number or password" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid phone number or password" });

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        examGoals: user.examGoals,
        preferredLanguage: user.preferredLanguage,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        streakCount: user.streakCount,
        topicStats: user.topicStats,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  res.json({ user: req.user });
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

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-passwordHash");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Profile update failed", error: err.message });
  }
}

// POST /api/auth/forgot-password  { phone }
// Sends a 6-digit OTP to the user's registered email (if they have one on file).
async function forgotPassword(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number chahiye" });

    const user = await User.findOne({ phone });
    // Always return a generic message even if user not found, so this
    // endpoint can't be used to check which phone numbers are registered.
    if (!user || !user.email) {
      return res.json({
        message:
          "Agar ye phone number registered hai aur email set hai, to OTP bhej diya gaya hai. Agar email set nahi hai, admin se contact karo.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const otpHash = await bcrypt.hash(otp, 10);

    user.passwordResetOTPHash = otpHash;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    await sendPasswordResetOTP(user.email, otp, user.name);

    res.json({ message: "OTP aapke registered email pe bhej diya gaya hai" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kuch galat ho gaya, thodi der baad try karo" });
  }
}

// POST /api/auth/reset-password  { phone, otp, newPassword }
async function resetPassword(req, res) {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: "Phone, OTP, aur naya password chahiye" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password kam se kam 6 characters ka hona chahiye" });
    }

    const user = await User.findOne({ phone }).select("+passwordResetOTPHash +passwordResetExpires");
    if (!user || !user.passwordResetOTPHash || !user.passwordResetExpires) {
      return res.status(400).json({ message: "Pehle OTP request karo" });
    }
    if (new Date() > user.passwordResetExpires) {
      return res.status(400).json({ message: "OTP expire ho gaya, naya OTP mangao" });
    }

    const isValidOTP = await bcrypt.compare(otp, user.passwordResetOTPHash);
    if (!isValidOTP) {
      return res.status(400).json({ message: "OTP galat hai" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetOTPHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password successfully reset ho gaya. Ab login karo." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Password reset fail hua", error: err.message });
  }
}

module.exports = { signup, login, getMe, updateProfile, forgotPassword, resetPassword };