const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Subscription = require("../models/Subscription");

const EXAM_OPTIONS = ["SSC_CGL", "UP_POLICE", "RAILWAY", "BANKING", "CTET"];
const PLAN_DURATION_MONTHS = { half_yearly: 6, yearly: 12 };

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

  res.json({ users, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), examOptions: EXAM_OPTIONS });
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
      return res.status(400).json({ message: "Naya password kam se kam 6 characters ka hona chahiye" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { passwordHash }, { new: true }).select("name phone");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: `Password reset ho gaya ${user.name} (${user.phone}) ke liye`, user });
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
      return res.json({ message: `${user.name} ka subscription revoke kar diya`, user });
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

      return res.json({ message: `${user.name} ka subscription ${action === "grant" ? "activate" : "extend"} ho gaya`, user });
    }

    res.status(400).json({ message: "Invalid action - use grant, extend, or revoke" });
  } catch (err) {
    res.status(500).json({ message: "Subscription update failed", error: err.message });
  }
}

module.exports = { searchUsers, getUserStats, exportUsersCsv, adminResetPassword, manageSubscription };