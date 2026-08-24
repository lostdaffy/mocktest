const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Signup is phone-only now, so every new account has one. Kept sparse
    // rather than required because accounts created back when Google
    // Sign-In existed may have no phone at all.
    phone: { type: String, unique: true, sparse: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true, default: null },
    // Every phone-signup account has this. Optional only for the legacy
    // Google-created accounts described above, which log in via OTP.
    passwordHash: { type: String, select: false },
    passwordResetOTPHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    // Google Sign-In has been removed. These two stay on the schema so
    // pre-existing documents still load and validate - nothing writes them
    // any more.
    googleId: { type: String, unique: true, sparse: true, index: true },
    authProvider: { type: String, enum: ["password", "google"], default: "password" },

    // Bumped (a fresh random value) on every successful login, regardless of
    // method. The JWT issued at login embeds this value; the auth
    // middleware rejects any token whose embedded value doesn't match the
    // CURRENT value here. That's what makes "only one device at a time"
    // work - logging in elsewhere invalidates every previously-issued token
    // without needing to track device IDs or push a logout signal.
    activeSessionId: { type: String, select: false },

    preferredLanguage: { type: String, enum: ["hi", "en"], default: "hi" },
    examGoals: [{ type: String }], // e.g. ["SSC", "UP_POLICE"]
    targetExamDate: { type: Date },

    // Subscription snapshot (source of truth is Subscription collection, this is a fast-read cache)
    subscriptionStatus: { type: String, enum: ["free", "active", "expired"], default: "free" },
    subscriptionExpiresAt: { type: Date },
    subscriptionPlan: { type: String, enum: ["half_yearly", "yearly"] }, // mirrors the Subscription doc, for quick display in admin

    // Gamification
    streakCount: { type: Number, default: 0 },
    lastActiveDate: { type: Date },
    badges: [{ type: String }],

    // Aggregated performance (updated after each attempt, used by recommendation engine)
    topicStats: [
      {
        topic: String,
        subject: String,
        examType: String,
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 }, // 0-100
        lastAttemptedAt: { type: Date }, // lets Analysis distinguish stale weak-topic data from recent
      },
    ],

    // Free-tier usage counters (topic-wise practice is intentionally not
    // tracked here - it stays free forever)
    freeUsage: {
      mockTestsUsed: { type: Number, default: 0 },
      liveExamsUsed: { type: Number, default: 0 },
      pyqUsed: { type: Number, default: 0 },
    },

    // Bookmarked questions for later revision (separate from "marked for
    // review" which is a per-attempt, in-exam-only flag)
    bookmarkedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],

    // Expo push token for this device, used for live-exam start reminders.
    // Overwritten on every login/signup, so it always reflects the device
    // the student most recently used.
    pushToken: { type: String },

    // Referral system
    referralCode: { type: String, unique: true, sparse: true, index: true }, // this user's own code to share
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // who referred this user
    referralCredits: { type: Number, default: 0 }, // ₹ credit balance, usable as discount on next purchase
    referralCount: { type: Number, default: 0 }, // how many people this user successfully referred (who bought a plan)
    rewardedReferral: { type: Boolean, default: false }, // has the referrer already been rewarded for THIS user's purchase (prevents double-reward)

    // Per-chapter progress & mastery level, drives adaptive difficulty.
    // Each chapter starts at "easy" and the student is promoted to harder
    // levels as their accuracy improves. This is what powers the
    // easy -> medium -> hard -> advanced progression.
    chapterProgress: [
      {
        subject: String,
        chapter: String,
        currentLevel: { type: String, enum: ["easy", "medium", "hard", "advanced"], default: "easy" },
        testsCompleted: { type: Number, default: 0 },
        bestAccuracy: { type: Number, default: 0 },
        lastAccuracy: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false }, // true once they've cleared "advanced"
      },
    ],

    // Referral system
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referralCredits: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 },

    selectedSubjects: [{ type: String }],

    role: { type: String, enum: ["student", "admin"], default: "student" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);