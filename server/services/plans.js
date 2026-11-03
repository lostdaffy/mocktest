const Plan = require("../models/Plan");

// The plans the app has always sold, used once to fill an empty collection so
// nothing changes for students the day this ships.
const DEFAULT_PLANS = [
  { key: "monthly", name: "1 Month", months: 1, price: 59, mrp: null, badge: "", creditPercent: 0, couponsAllowed: false, sortOrder: 1 },
  { key: "quarterly", name: "3 Months", months: 3, price: 149, mrp: 449, badge: "67% OFF", creditPercent: 50, couponsAllowed: true, sortOrder: 2 },
  { key: "half_yearly", name: "6 Months", months: 6, price: 249, mrp: 899, badge: "72% OFF", creditPercent: 50, couponsAllowed: true, sortOrder: 3, highlight: true },
  { key: "yearly", name: "12 Months", months: 12, price: 449, mrp: 1799, badge: "75% OFF", creditPercent: 50, couponsAllowed: true, sortOrder: 4 },
];

let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  if ((await Plan.estimatedDocumentCount()) === 0) {
    await Plan.insertMany(DEFAULT_PLANS.map((p) => ({ ...p, active: true })), { ordered: false }).catch(() => {});
  }
  seeded = true;
}

// Plan reads happen on every order and every Subscription screen open, so
// they are cached for a few seconds; every admin write clears the cache.
let cache = null;
let cachedAt = 0;
const TTL_MS = 10 * 1000;

async function loadAll() {
  await ensureSeeded();
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  cache = await Plan.find({}).sort({ sortOrder: 1, months: 1 }).lean();
  cachedAt = Date.now();
  return cache;
}

function clearPlanCache() {
  cache = null;
}

// On sale right now: what students see and what createOrder accepts.
async function getActivePlans() {
  return (await loadAll()).filter((p) => p.active && !p.archivedAt);
}

// Any plan, on sale or not: activation and admin screens need the length of a
// plan that has since been switched off or archived.
async function getPlanByKey(key) {
  if (typeof key !== "string") return null;
  return (await loadAll()).find((p) => p.key === key) || null;
}

// What the app is told about a plan (no internal ids or audit fields).
function publicPlan(p) {
  return {
    id: p.key,
    label: p.name,
    price: p.price,
    mrp: p.mrp || undefined,
    days: Math.round(p.months * 30.4),
    months: p.months,
    off: p.badge || undefined,
    best: !!p.highlight,
    creditPercent: p.creditPercent,
    coupons: !!p.couponsAllowed,
  };
}

module.exports = { DEFAULT_PLANS, getActivePlans, getPlanByKey, clearPlanCache, publicPlan, ensureSeeded };
