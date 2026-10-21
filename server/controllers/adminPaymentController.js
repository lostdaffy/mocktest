// The admin's view of money: every order a student started, what it came
// to, and the totals. Razorpay stays the place for refunds; this is where
// the admin sees who paid, who started and did not finish, and what came
// in today, this month and in all.
//
// What an order can be:
//   paid      - Razorpay confirmed the payment
//   grant     - the admin gave the plan by hand (Users page); ₹0, order id manual_…
//   pending   - an order was opened and never paid (closed, failed, abandoned)
const User = require("../models/User");
const Subscription = require("../models/Subscription");

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istStart = (when, unit) => {
  const ist = new Date(when.getTime() + IST_OFFSET_MS);
  const d = unit === "month" ? Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) : Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return new Date(d - IST_OFFSET_MS);
};

const GRANT = /^manual_/;
const kindOf = (s) => (s.status === "paid" ? (GRANT.test(s.razorpayOrderId || "") ? "grant" : "paid") : "pending");
const KIND_FILTER = {
  paid: { status: "paid", razorpayOrderId: { $not: GRANT } },
  grant: { status: "paid", razorpayOrderId: GRANT },
  pending: { status: { $ne: "paid" } },
};

async function buildFilter(query) {
  const f = { ...(KIND_FILTER[query.kind] || {}) };
  const from = query.from ? new Date(`${query.from}T00:00:00+05:30`) : null;
  const to = query.to ? new Date(new Date(`${query.to}T00:00:00+05:30`).getTime() + 24 * 60 * 60 * 1000) : null;
  if ((from && !isNaN(from)) || (to && !isNaN(to))) f.createdAt = { ...(from && !isNaN(from) ? { $gte: from } : {}), ...(to && !isNaN(to) ? { $lt: to } : {}) };
  if (query.plan) f.plan = query.plan;
  const q = String(query.q || "").trim();
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (/^(order|pay)_/i.test(q)) f.$or = [{ razorpayOrderId: q }, { razorpayPaymentId: q }];
    else if (/^[A-Z0-9]{3,}$/.test(q) && !/^\d+$/.test(q)) f.couponCode = q.toUpperCase();
    else {
      const users = await User.find({ $or: [{ phone: { $regex: `^${safe}` } }, { name: { $regex: safe, $options: "i" } }] }).select("_id").limit(200).lean();
      f.user = { $in: users.map((u) => u._id) };
    }
  }
  return f;
}

const row = (s) => ({
  _id: s._id,
  kind: kindOf(s),
  plan: s.plan,
  amount: s.amount,
  creditsUsed: s.creditsUsed || 0,
  couponCode: s.couponCode || null,
  startDate: s.startDate,
  endDate: s.endDate,
  createdAt: s.createdAt,
  razorpayOrderId: GRANT.test(s.razorpayOrderId || "") ? null : s.razorpayOrderId || null,
  razorpayPaymentId: s.razorpayPaymentId || null,
  user: s.user ? { _id: s.user._id, name: s.user.name, phone: s.user.phone, email: s.user.email } : null,
});

// GET /api/admin/payments?kind=paid|grant|pending&q=&plan=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=
async function listPayments(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 30));
  const filter = await buildFilter(req.query);
  const [total, items, sums] = await Promise.all([
    Subscription.countDocuments(filter),
    Subscription.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name phone email").lean(),
    // Real payments only: a free grant is "paid" with ₹0 and is not money in.
    Subscription.aggregate([{ $match: { $and: [filter, KIND_FILTER.paid] } }, { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
  ]);
  res.json({ items: items.map(row), total, page, pages: Math.max(1, Math.ceil(total / limit)), paidInView: { amount: sums[0]?.amount || 0, count: sums[0]?.count || 0 } });
}

// GET /api/admin/payments/summary -> today, this month and all time (IST)
async function paymentSummary(req, res) {
  const now = new Date();
  const real = KIND_FILTER.paid;
  const sum = async (extra) => {
    const [r] = await Subscription.aggregate([{ $match: { ...real, ...extra } }, { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } }]);
    return { amount: r?.amount || 0, count: r?.count || 0 };
  };
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [today, month, all, pendingWeek, grants, byPlan, coupons] = await Promise.all([
    sum({ createdAt: { $gte: istStart(now, "day") } }),
    sum({ createdAt: { $gte: istStart(now, "month") } }),
    sum({}),
    Subscription.countDocuments({ ...KIND_FILTER.pending, createdAt: { $gte: weekAgo } }),
    Subscription.countDocuments(KIND_FILTER.grant),
    Subscription.aggregate([{ $match: real }, { $group: { _id: "$plan", amount: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),
    Subscription.aggregate([{ $match: { ...real, couponCode: { $nin: [null, ""] } } }, { $group: { _id: "$couponCode", count: { $sum: 1 }, amount: { $sum: "$amount" } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
  ]);
  res.json({
    today, month, all, pendingWeek, grants,
    byPlan: byPlan.map((p) => ({ plan: p._id, amount: p.amount, count: p.count })),
    coupons: coupons.map((c) => ({ code: c._id, count: c.count, amount: c.amount })),
  });
}

// GET /api/admin/payments/export -> CSV of the same filter as the list
async function exportPayments(req, res) {
  const filter = await buildFilter(req.query);
  const items = await Subscription.find(filter).sort({ createdAt: -1 }).limit(20000).populate("user", "name phone email").lean();
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    // A cell starting with = + - @ would run as a formula in Excel.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const ist = (d) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "");
  const lines = [["Date (IST)", "Status", "Name", "Phone", "Email", "Plan", "Amount (₹)", "Credits used", "Coupon", "Valid till", "Razorpay order", "Razorpay payment"].join(",")];
  for (const s of items.map(row)) {
    lines.push([ist(s.createdAt), { paid: "Paid", grant: "Free grant (admin)", pending: "Not completed" }[s.kind], s.user?.name, s.user?.phone, s.user?.email, s.plan, s.amount, s.creditsUsed, s.couponCode, ist(s.endDate), s.razorpayOrderId, s.razorpayPaymentId].map(esc).join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="rankveer-payments-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send("﻿" + lines.join("\n"));
}

module.exports = { listPayments, paymentSummary, exportPayments, kindOf, buildFilter };
