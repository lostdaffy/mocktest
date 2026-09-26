const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Attempt = require("../models/Attempt");
const Report = require("../models/Report");
const ExamPattern = require("../models/ExamPattern");
const { deleteAccountData } = require("../services/accountDeletion");
const PLAN_DURATION_MONTHS = { quarterly: 3, half_yearly: 6, yearly: 12 };

// Builds the Mongo filter shared by list/stats/export, so the three stay
// in sync - a filter combination always means the same thing everywhere.
function buildFilter(query) {
  const { phone, name, email, subscription, examGoal, authProvider, expiringDays } = query;
  const filter = {};

  if (phone) filter.phone = { $regex: `^${phone.trim()}`, $options: "i" };
  if (email) filter.email = { $regex: `^${email.trim()}`, $options: "i" };
  if (name) filter.name = { $regex: name.trim(), $options: "i" };
  if (examGoal) filter.examGoals = examGoal;
  if (authProvider) filter.authProvider = authProvider;

  const now = new Date();
  if (subscription === "premium") {
    filter.subscriptionStatus = "active";
  } else if (subscription === "free") {
    filter.subscriptionStatus = { $ne: "active" };
  } else if (subscription === "expiring") {
    const days = Math.max(1, parseInt(expiringDays, 10) || 7);
    const windowEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    filter.subscriptionStatus = "active";
    filter.subscriptionExpiresAt = { $gte: now, $lte: windowEnd };
  } else if (subscription === "expired") {
    // Status may still say "active" if nothing has re-checked it since it
    // lapsed (there's no cron flipping this) - so "expired" means the date
    // has passed, regardless of what the status field currently says.
    filter.subscriptionExpiresAt = { $lt: now };
  }

  return filter;
}

function buildSort(sortBy) {
  switch (sortBy) {
    case "oldest":
      return { createdAt: 1 };
    case "expirySoon":
      return { subscriptionExpiresAt: 1 };
    case "nameAsc":
      return { name: 1 };
    default:
      return { createdAt: -1 };
  }
}

const LIST_FIELDS =
  "name phone email subscriptionStatus subscriptionExpiresAt subscriptionPlan authProvider examGoals streakCount referralCount referralCredits createdAt role";

// GET /api/admin/users?phone=&name=&email=&subscription=&examGoal=&authProvider=&expiringDays=&sortBy=&page=&limit=
async function searchUsers(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const filter = buildFilter(req.query);
  const sort = buildSort(req.query.sortBy);

  const [users, total] = await Promise.all([
    User.find(filter).select(LIST_FIELDS).sort(sort).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);

  // Read from the exam patterns instead of a hardcoded list, so an exam or
  // post added in admin appears in this filter without a code change.
  const examOptions = await ExamPattern.distinct("examType", { isActive: true });
  res.json({ users, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), examOptions: examOptions.sort() });
}

// GET /api/admin/users/stats -> summary counts for the dashboard cards.
// Runs as one aggregation pass instead of 4 separate countDocuments calls,
// so it stays fast even once the collection is large.
async function getUserStats(req, res) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, premium, expiringSoon, expired, newThisWeek] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ subscriptionStatus: "active" }),
    User.countDocuments({ subscriptionStatus: "active", subscriptionExpiresAt: { $gte: now, $lte: in7Days } }),
    User.countDocuments({ subscriptionExpiresAt: { $lt: now } }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
  ]);

  res.json({
    total,
    premium,
    free: total - premium,
    expiringSoon,
    expired,
    newThisWeek,
  });
}

// GET /api/admin/users/export?...same filters as searchUsers... -> CSV
// Exports everything matching the current filter (not just the current
// page) - this is what makes "message everyone expiring this week" a
// realistic thing to do. Capped so a runaway filter (or none at all, at
// real scale) can't freeze the server generating a multi-million-row file.
const EXPORT_CAP = 10000;
async function exportUsersCsv(req, res) {
  const filter = buildFilter(req.query);
  const sort = buildSort(req.query.sortBy);

  const users = await User.find(filter).select(LIST_FIELDS).sort(sort).limit(EXPORT_CAP);

  const header = ["Name", "Phone", "Email", "Status", "Plan", "Expires", "Exams", "Streak", "Referrals", "Joined"];
  const rows = users.map((u) => [
    u.name,
    u.phone || "",
    u.email || "",
    u.subscriptionStatus,
    u.subscriptionPlan || "",
    u.subscriptionExpiresAt ? u.subscriptionExpiresAt.toISOString().slice(0, 10) : "",
    (u.examGoals || []).join("; "),
    u.streakCount || 0,
    u.referralCount || 0,
    u.createdAt.toISOString().slice(0, 10),
  ]);

  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="users-export-${Date.now()}.csv"`);
  res.send(csv);
}

// PATCH /api/admin/users/:id/reset-password (admin only)
async function adminResetPassword(req, res) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "The new password must be at least 6 characters" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { passwordHash }, { new: true }).select("name phone");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: `Password reset for ${user.name} (${user.phone})`, user });
  } catch (err) {
    res.status(500).json({ message: "Reset failed", error: err.message });
  }
}

// PATCH /api/admin/users/:id/subscription  { action: "grant"|"extend"|"revoke", plan, months, reason }
// Manual override - for offline/UPI payments taken outside Razorpay,
// promotional access, or reversing a subscription after a refund/dispute.
// Every manual change is logged to the Subscription collection too (best
// effort - a schema mismatch there won't block the actual User update)
// so there's an audit trail of who got what and why, not just a silent
// field change.
async function manageSubscription(req, res) {
  try {
    const { action, plan, months, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (action === "revoke") {
      user.subscriptionStatus = "expired";
      user.subscriptionExpiresAt = new Date();
      await user.save();
      return res.json({ message: `${user.name}'s subscription has been revoked`, user });
    }

    if (action === "grant" || action === "extend") {
      const durationMonths = months ? parseInt(months, 10) : PLAN_DURATION_MONTHS[plan] || 1;
      if (!durationMonths || durationMonths <= 0) {
        return res.status(400).json({ message: "Valid plan ya months chuno" });
      }

      // Extend from current expiry if it's still active and in the future,
      // otherwise start fresh from today.
      const base =
        action === "extend" && user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()
          ? user.subscriptionExpiresAt
          : new Date();
      const newExpiry = new Date(base);
      newExpiry.setMonth(newExpiry.getMonth() + durationMonths);

      user.subscriptionStatus = "active";
      user.subscriptionExpiresAt = newExpiry;
      if (plan) user.subscriptionPlan = plan;
      await user.save();

      try {
        await Subscription.create({
          user: user._id,
          plan: plan || "manual",
          amount: 0,
          creditsUsed: 0,
          startDate: base,
          endDate: newExpiry,
          razorpayOrderId: `manual_${Date.now()}_${user._id}`,
          status: "paid",
          adminNote: reason || `Manual ${action} by admin`,
        });
      } catch (subErr) {
        // Don't fail the whole request over the audit-log write - the
        // user's access is what actually matters here.
        console.error("Manual subscription log failed (user was still updated):", subErr.message);
      }

      return res.json({ message: `Subscription ${action === "grant" ? "activated" : "extended"} for ${user.name}`, user });
    }

    res.status(400).json({ message: "Invalid action - use grant, extend, or revoke" });
  } catch (err) {
    res.status(500).json({ message: "Subscription update failed", error: err.message });
  }
}


// GET /api/admin/users/:id -> everything support needs about ONE account,
// in one call: who they are, what state the account is in, what they paid,
// and what they've actually been doing. Built for the "a user says X isn't
// working" conversation, where hunting through four screens loses time.
async function getUserDetail(req, res) {
  try {
    // The three auth fields are select:false on the schema (they must never
    // leak to students) - support genuinely needs them, so ask explicitly.
    const user = await User.findById(req.params.id).select("+failedLoginAttempts +lockUntil +activeSessionId +passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const [subscriptions, attemptCount, recentAttempts, reportCount, referrer, referredCount] = await Promise.all([
      Subscription.find({ user: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Attempt.countDocuments({ user: user._id }),
      Attempt.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("test", "title type examStage")
        .select("test score totalMarks correctCount wrongCount skippedCount accuracy status rank submittedAt createdAt")
        .lean(),
      Report.countDocuments({ reportedBy: user._id }),
      user.referredBy ? User.findById(user.referredBy).select("name phone").lean() : null,
      User.countDocuments({ referredBy: user._id }),
    ]);

    const lockedUntil = user.lockUntil && user.lockUntil > now ? user.lockUntil : null;
    const expiresAt = user.subscriptionExpiresAt;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        examGoals: user.examGoals,
        preferredLanguage: user.preferredLanguage,
        streakCount: user.streakCount,
        lastActiveDate: user.lastActiveDate,
        createdAt: user.createdAt,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: expiresAt,
        daysLeft: expiresAt ? Math.ceil((new Date(expiresAt) - now) / 86400000) : null,
        freeUsage: user.freeUsage,
        referralCode: user.referralCode,
        referralCredits: user.referralCredits,
        referredBy: referrer ? { name: referrer.name, phone: referrer.phone } : null,
        referredCount,
      },
      // Each flag is a specific "this is why they're stuck" answer.
      flags: {
        locked: !!lockedUntil,
        lockedUntil,
        lockMinutesLeft: lockedUntil ? Math.ceil((lockedUntil - now) / 60000) : 0,
        failedLoginAttempts: user.failedLoginAttempts || 0,
        hasEmail: !!user.email, // no email = "forgot password" can't work for them
        hasPassword: !!user.passwordHash, // legacy Google account, can only get in via email reset
        loggedInSomewhere: !!user.activeSessionId, // single-device: a stale session logs them out elsewhere
        hasPushToken: !!user.pushToken,
      },
      activity: { attemptCount, recentAttempts, reportCount },
      subscriptions,
    });
  } catch (err) {
    res.status(500).json({ message: "Couldn't load the user", error: err.message });
  }
}

// PATCH /api/admin/users/:id/unlock
// Clears the login lockout after the "I'm typing the right password and it
// says wait 15 minutes" call, without touching their password.
async function unlockUser(req, res) {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } },
    { new: true }
  ).select("name phone");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ message: `${user.name}'s account is unlocked`, user });
}

// PATCH /api/admin/users/:id/logout
// Ends the session on whatever device holds it. This is the fix for "I
// changed my phone and it says I'm logged in somewhere else" - only one
// device can be signed in at a time (see middleware/auth.js).
async function forceLogout(req, res) {
  const user = await User.findByIdAndUpdate(req.params.id, { $unset: { activeSessionId: 1 } }, { new: true }).select("name phone");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ message: `${user.name} has been signed out of every device and can now sign in on a new one.`, user });
}

// PATCH /api/admin/users/:id/profile  { name, email, examGoals }
// Support-side corrections. The email matters most: a student who typed it
// wrong at signup can never receive a password-reset code until it's fixed,
// and they can't fix it themselves without logging in first.
async function updateUserProfile(req, res) {
  try {
    const { name, email, examGoals } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: "Name cannot be empty" });
      user.name = String(name).trim();
    }

    if (email !== undefined) {
      const clean = String(email).trim().toLowerCase();
      if (clean) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
          return res.status(400).json({ message: "That email address is not valid" });
        }
        const taken = await User.findOne({ email: clean, _id: { $ne: user._id } }).select("_id");
        if (taken) return res.status(409).json({ message: "That email is already used by another account" });
        user.email = clean;
      } else {
        user.email = undefined; // clearing it is allowed; unset keeps the sparse index happy
      }
    }

    if (Array.isArray(examGoals)) user.examGoals = examGoals.filter(Boolean);

    await user.save();
    res.json({ message: "Profile updated", user: { _id: user._id, name: user.name, email: user.email, examGoals: user.examGoals } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "That email is already used by another account" });
    res.status(500).json({ message: "Update failed", error: err.message });
  }
}

// DELETE /api/admin/users/:id
// For the deletion requests that arrive by email (rankveer.com/delete-account
// promises this route for people who can't sign in). Runs the exact same
// deletion the app's own button runs - see services/accountDeletion.js.
async function deleteUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(403).json({ message: "An admin account cannot be deleted" });
    }

    await deleteAccountData(user);
    res.json({ message: `The account and data for ${user.name} (${user.phone}) have been deleted` });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
}

module.exports = {
  searchUsers,
  getUserStats,
  exportUsersCsv,
  adminResetPassword,
  manageSubscription,
  getUserDetail,
  unlockUser,
  forceLogout,
  updateUserProfile,
  deleteUser,
};