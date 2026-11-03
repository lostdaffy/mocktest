// GET /api/admin/analytics?days=30 (admin)
//
// What the dashboard charts: day by day (in IST) for the chosen range -
// sign-ups, students who submitted a test, tests submitted, and money taken -
// plus the same totals for the range before it, so every headline number can
// say whether it went up or down. Read-only; nothing here writes.
//
// "Revenue" counts real Razorpay payments only - a plan the admin granted
// for free is not money (the same rule as the Payments page).
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Attempt = require("../models/Attempt");
const Test = require("../models/Test");
const Question = require("../models/Question");

const TZ = "+05:30";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const GRANT = /^manual_/;
const PAID = { status: "paid", razorpayOrderId: { $not: GRANT } };
const SUBMITTED = { $in: ["submitted", "auto_submitted"] };

// Midnight IST, `daysAgo` days before today.
function istMidnight(daysAgo = 0) {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - daysAgo) - IST_OFFSET_MS);
}
const dayKey = (d) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
const day = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: field, timezone: TZ } });

async function analytics(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 180);
  const start = istMidnight(days - 1); // today is the last of `days` days
  const prevStart = istMidnight(2 * days - 1);
  const now = new Date();
  const students = { role: { $ne: "admin" } };

  const [
    signupsByDay, revenueByDay, attemptsByDay, activeByDay,
    totals, prev, examGoals, planMix, testTypes, funnel, content,
  ] = await Promise.all([
    User.aggregate([{ $match: { ...students, createdAt: { $gte: start } } }, { $group: { _id: day("$createdAt"), n: { $sum: 1 } } }]),
    Subscription.aggregate([{ $match: { ...PAID, createdAt: { $gte: start } } }, { $group: { _id: day("$createdAt"), amount: { $sum: "$amount" }, n: { $sum: 1 } } }]),
    Attempt.aggregate([{ $match: { status: SUBMITTED, submittedAt: { $gte: start } } }, { $group: { _id: day("$submittedAt"), n: { $sum: 1 } } }]),
    Attempt.aggregate([
      { $match: { status: SUBMITTED, submittedAt: { $gte: start } } },
      { $group: { _id: { d: day("$submittedAt"), u: "$user" } } },
      { $group: { _id: "$_id.d", n: { $sum: 1 } } },
    ]),
    (async () => {
      const [students_, premium, revenueAll, activeRange] = await Promise.all([
        User.countDocuments(students),
        User.countDocuments({ ...students, subscriptionStatus: "active", subscriptionExpiresAt: { $gt: now } }),
        Subscription.aggregate([{ $match: PAID }, { $group: { _id: null, amount: { $sum: "$amount" }, n: { $sum: 1 } } }]),
        Attempt.distinct("user", { status: SUBMITTED, submittedAt: { $gte: start } }),
      ]);
      return { students: students_, premium, revenueAll: revenueAll[0]?.amount || 0, paymentsAll: revenueAll[0]?.n || 0, activeRange: activeRange.length };
    })(),
    // The range before this one, for the up/down on each headline number.
    (async () => {
      const range = { $gte: prevStart, $lt: start };
      const [signups, revenue, attempts, active] = await Promise.all([
        User.countDocuments({ ...students, createdAt: range }),
        Subscription.aggregate([{ $match: { ...PAID, createdAt: range } }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
        Attempt.countDocuments({ status: SUBMITTED, submittedAt: range }),
        Attempt.distinct("user", { status: SUBMITTED, submittedAt: range }),
      ]);
      return { signups, revenue: revenue[0]?.amount || 0, attempts, active: active.length };
    })(),
    User.aggregate([
      { $match: students },
      { $unwind: "$examGoals" },
      { $group: { _id: "$examGoals", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 12 },
    ]),
    Subscription.aggregate([{ $match: PAID }, { $group: { _id: "$plan", n: { $sum: 1 }, amount: { $sum: "$amount" } } }, { $sort: { amount: -1 } }]),
    Attempt.aggregate([
      { $match: { status: SUBMITTED, submittedAt: { $gte: start } } },
      { $lookup: { from: "tests", localField: "test", foreignField: "_id", as: "t", pipeline: [{ $project: { type: 1 } }] } },
      { $group: { _id: { $ifNull: [{ $first: "$t.type" }, "other"] }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    // Of the students who joined in this range: how many took a test, how many paid.
    (async () => {
      const joined = await User.find({ ...students, createdAt: { $gte: start } }).select("_id").lean();
      const ids = joined.map((u) => u._id);
      const [tookTest, paid] = await Promise.all([
        Attempt.distinct("user", { user: { $in: ids }, status: SUBMITTED }),
        Subscription.distinct("user", { ...PAID, user: { $in: ids } }),
      ]);
      return { joined: ids.length, tookTest: tookTest.length, paid: paid.length };
    })(),
    (async () => {
      const [questions, practice, mocks] = await Promise.all([
        Question.countDocuments({ status: "published" }),
        Test.countDocuments({ type: "practice", publishStatus: "published" }),
        Test.countDocuments({ type: "full_mock", publishStatus: "published" }),
      ]);
      return { questions, practice, mocks };
    })(),
  ]);

  // Every day of the range, zero where nothing happened.
  const map = (rows, f = "n") => Object.fromEntries(rows.map((r) => [r._id, r[f]]));
  const s = map(signupsByDay), r = map(revenueByDay, "amount"), p = map(revenueByDay), a = map(attemptsByDay), act = map(activeByDay);
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(istMidnight(i));
    daily.push({ date: k, signups: s[k] || 0, revenue: r[k] || 0, payments: p[k] || 0, attempts: a[k] || 0, active: act[k] || 0 });
  }
  const sum = (f) => daily.reduce((x, d) => x + d[f], 0);

  res.json({
    days,
    daily,
    range: { signups: sum("signups"), revenue: sum("revenue"), payments: sum("payments"), attempts: sum("attempts"), active: totals.activeRange },
    previous: prev,
    totals,
    examGoals: examGoals.map((e) => ({ exam: e._id, students: e.n })),
    planMix: planMix.map((x) => ({ plan: x._id, count: x.n, amount: x.amount })),
    testTypes: testTypes.map((x) => ({ type: x._id, attempts: x.n })),
    funnel,
    content,
  });
}

module.exports = { analytics };
