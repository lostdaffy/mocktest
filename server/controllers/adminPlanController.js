const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const AdminAudit = require("../models/AdminAudit");
const { audit } = require("../services/audit");
const { clearPlanCache, ensureSeeded } = require("../services/plans");

// Only these fields can be set from a request body. Anything else (_id, key
// on update, createdBy, archivedAt, a nested operator...) is ignored, so a
// crafted body can't write fields it was never meant to.
const EDITABLE = ["name", "months", "price", "mrp", "badge", "highlight", "creditPercent", "couponsAllowed", "sortOrder"];

const isInt = (v) => typeof v === "number" && Number.isInteger(v);
const clean = (s) => String(s).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();

// Returns { value } or { error } for the editable fields that are present.
function validate(body, { partial }) {
  const out = {};
  const need = (k) => !partial || body[k] !== undefined;

  if (need("name")) {
    if (typeof body.name !== "string" || !clean(body.name)) return { error: "Plan name is required" };
    out.name = clean(body.name).slice(0, 40);
  }
  if (need("months")) {
    if (!isInt(body.months) || body.months < 1 || body.months > 36) return { error: "Length must be a whole number of months from 1 to 36" };
    out.months = body.months;
  }
  if (need("price")) {
    if (!isInt(body.price) || body.price < 1 || body.price > 100000) return { error: "Price must be a whole number of rupees from 1 to 1,00,000" };
    out.price = body.price;
  }
  if (body.mrp !== undefined) {
    if (body.mrp === null || body.mrp === "") out.mrp = null;
    else if (!isInt(body.mrp) || body.mrp < 1 || body.mrp > 1000000) return { error: "Original price must be a whole number of rupees" };
    else out.mrp = body.mrp;
  }
  if (body.badge !== undefined) out.badge = clean(body.badge).slice(0, 24);
  if (body.highlight !== undefined) out.highlight = body.highlight === true;
  if (body.couponsAllowed !== undefined) out.couponsAllowed = body.couponsAllowed === true;
  if (body.creditPercent !== undefined) {
    if (!isInt(body.creditPercent) || body.creditPercent < 0 || body.creditPercent > 100) return { error: "Referral credit share must be 0 to 100" };
    out.creditPercent = body.creditPercent;
  }
  if (body.sortOrder !== undefined) {
    if (!isInt(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 1000) return { error: "Order must be a whole number from 0 to 1000" };
    out.sortOrder = body.sortOrder;
  }
  if (out.mrp != null && out.price != null && out.mrp < out.price) return { error: "Original price can't be lower than the selling price" };
  return { value: out };
}

const snapshot = (p) => p && Object.fromEntries([...EDITABLE, "active", "archivedAt"].map((k) => [k, p[k] ?? null]));

// A price move this large is more often a typo (or a hijacked session) than
// a decision, so it needs an explicit second acknowledgement.
function isBigPriceChange(oldPrice, newPrice) {
  if (newPrice == null) return false;
  if (newPrice < 10) return true;
  if (oldPrice == null) return false;
  return newPrice <= oldPrice / 2 || newPrice >= oldPrice * 2;
}

async function activeCount(exceptId) {
  return Plan.countDocuments({ active: true, archivedAt: null, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
}

// GET /api/admin/plans
async function listPlans(req, res) {
  await ensureSeeded();
  const [plans, sold] = await Promise.all([
    Plan.find({}).sort({ archivedAt: 1, sortOrder: 1, months: 1 }).lean(),
    Subscription.aggregate([
      { $match: { status: "paid", amount: { $gt: 0 } } },
      { $group: { _id: "$plan", count: { $sum: 1 }, revenue: { $sum: "$amount" } } },
    ]),
  ]);
  const soldBy = Object.fromEntries(sold.map((s) => [s._id, s]));
  res.json({
    plans: plans.map((p) => ({ ...p, sold: soldBy[p.key]?.count || 0, revenue: soldBy[p.key]?.revenue || 0 })),
  });
}

// GET /api/admin/plans/audit - the last changes, newest first
async function listAudit(req, res) {
  const rows = await AdminAudit.find({ action: /^(plan\.|auth\.confirm)/ }).sort({ at: -1 }).limit(60).lean();
  res.json({ rows });
}

// POST /api/admin/plans - always created OFF sale; the admin switches it on
async function createPlan(req, res) {
  const { value, error } = validate(req.body || {}, { partial: false });
  if (error) return res.status(400).json({ message: error });

  const key = String(req.body.key || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,31}$/.test(key)) {
    return res.status(400).json({ message: "Plan id must be 3-32 characters: lowercase letters, numbers and underscores, starting with a letter" });
  }
  if (value.price < 10 && req.body.acknowledge !== true) {
    return res.status(409).json({ message: `₹${value.price} looks very low. Confirm it is intended.`, code: "NEEDS_ACK" });
  }

  try {
    if (value.highlight) await Plan.updateMany({}, { highlight: false });
    const plan = await Plan.create({ ...value, key, active: false, createdBy: req.user._id, updatedBy: req.user._id });
    clearPlanCache();
    await audit(req, "plan.create", { target: key, after: snapshot(plan) });
    res.status(201).json({ plan });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "A plan with this id already exists (it may be archived)." });
    throw err;
  }
}

// PATCH /api/admin/plans/:id
async function updatePlan(req, res) {
  const plan = await Plan.findById(req.params.id);
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  const { value, error } = validate(req.body || {}, { partial: true });
  if (error) return res.status(400).json({ message: error });
  if (!Object.keys(value).length) return res.status(400).json({ message: "Nothing to change" });

  if (value.price !== undefined && isBigPriceChange(plan.price, value.price) && req.body.acknowledge !== true) {
    return res.status(409).json({
      message: `Price changes from ₹${plan.price} to ₹${value.price}. That is a big change - confirm it is intended.`,
      code: "NEEDS_ACK",
    });
  }
  const newPrice = value.price ?? plan.price;
  const mrp = value.mrp !== undefined ? value.mrp : plan.mrp;
  if (mrp != null && mrp < newPrice) return res.status(400).json({ message: "Original price can't be lower than the selling price" });

  const before = snapshot(plan);
  if (value.highlight) await Plan.updateMany({ _id: { $ne: plan._id } }, { highlight: false });
  Object.assign(plan, value, { updatedBy: req.user._id });
  await plan.save();
  clearPlanCache();
  await audit(req, "plan.update", { target: plan.key, before, after: snapshot(plan) });
  res.json({ plan });
}

// PATCH /api/admin/plans/:id/active  { active: boolean } - put on / take off sale
async function setActive(req, res) {
  const plan = await Plan.findById(req.params.id);
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  const active = req.body?.active === true;
  if (active && plan.archivedAt) return res.status(400).json({ message: "Restore this plan before putting it on sale" });
  if (!active && plan.active && (await activeCount(plan._id)) === 0) {
    return res.status(409).json({ message: "This is the only plan on sale. Put another plan on sale first, or students won't be able to buy." });
  }
  const before = snapshot(plan);
  plan.active = active;
  plan.updatedBy = req.user._id;
  await plan.save();
  clearPlanCache();
  await audit(req, active ? "plan.activate" : "plan.deactivate", { target: plan.key, before, after: snapshot(plan) });
  res.json({ plan });
}

// POST /api/admin/plans/:id/archive  { archive: boolean }
async function archivePlan(req, res) {
  const plan = await Plan.findById(req.params.id);
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  const archive = req.body?.archive !== false;
  if (archive && plan.active && (await activeCount(plan._id)) === 0) {
    return res.status(409).json({ message: "This is the only plan on sale. Put another plan on sale first." });
  }
  const before = snapshot(plan);
  plan.archivedAt = archive ? new Date() : null;
  if (archive) plan.active = false;
  plan.updatedBy = req.user._id;
  await plan.save();
  clearPlanCache();
  await audit(req, archive ? "plan.archive" : "plan.restore", { target: plan.key, before, after: snapshot(plan) });
  res.json({ plan });
}

// DELETE /api/admin/plans/:id - only a plan nobody ever bought or was granted
async function deletePlan(req, res) {
  const plan = await Plan.findById(req.params.id);
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  if (plan.active && (await activeCount(plan._id)) === 0) {
    return res.status(409).json({ message: "This is the only plan on sale. Put another plan on sale first." });
  }
  const used = await Subscription.countDocuments({ plan: plan.key });
  if (used > 0) {
    return res.status(409).json({
      message: `${used} payment(s) used this plan, so it can't be deleted - old receipts depend on it. Archive it instead.`,
      code: "IN_USE",
    });
  }
  const before = snapshot(plan);
  await plan.deleteOne();
  clearPlanCache();
  await audit(req, "plan.delete", { target: plan.key, before });
  res.json({ ok: true });
}

module.exports = { listPlans, listAudit, createPlan, updatePlan, setActive, archivePlan, deletePlan };
