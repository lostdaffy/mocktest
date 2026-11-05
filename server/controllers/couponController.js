const Coupon = require("../models/Coupon");

// Shared by the payment flow's validate/apply calls. Returns the final
// price a coupon results in for a given plan, or throws with a clear reason
// if it can't be used - callers turn that into a 400.
async function resolveCoupon(code, basePrice, planKey) {
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) throw new Error("Invalid coupon code");
  if (!coupon.isActive) throw new Error("This coupon is no longer active");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("This coupon has expired");
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new Error("This coupon has reached its usage limit");
  }
  // A coupon made for some plans only (the ₹1 Diwali offer on 1 Month) is
  // refused on every other plan, even one that takes coupons.
  if (coupon.plans?.length && !coupon.plans.includes(planKey)) {
    throw new Error("This coupon is not valid for this plan");
  }

  let finalAmount;
  if (coupon.type === "fixed_price") {
    finalAmount = coupon.value;
  } else if (coupon.type === "flat_discount") {
    finalAmount = Math.max(1, basePrice - coupon.value); // never let it hit ₹0 - Razorpay requires a positive amount
  } else {
    // percent
    finalAmount = Math.max(1, Math.round(basePrice - (basePrice * coupon.value) / 100));
  }

  // A coupon never raises the price: a ₹99 fixed-price coupon on the ₹59
  // plan leaves it at ₹59.
  finalAmount = Math.min(basePrice, finalAmount);
  return { coupon, finalAmount };
}

// GET /api/payments/validate-coupon?code=&plan= - lets the app show the
// discounted price BEFORE the student commits to paying. The real,
// authoritative check happens again in createOrder - this is just for
// instant UI feedback, never trusted on its own.
async function validateCoupon(req, res) {
  try {
    const { code, plan } = req.query;
    const planDoc = await require("../services/plans").getPlanByKey(plan);
    if (!planDoc || !planDoc.active || planDoc.archivedAt) return res.status(400).json({ valid: false, message: "Invalid plan" });
    const basePrice = planDoc.price;
    if (!planDoc.couponsAllowed) {
      return res.json({ valid: false, message: "Coupons do not apply to this plan" });
    }

    const { finalAmount } = await resolveCoupon(code, basePrice, planDoc.key);
    res.json({ valid: true, basePrice, finalAmount, discount: basePrice - finalAmount });
  } catch (err) {
    res.json({ valid: false, message: err.message });
  }
}

// ---- Admin coupon management ----

async function listCoupons(req, res) {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  res.json({ coupons });
}

async function createCoupon(req, res) {
  try {
    const { code, type, value, maxUses, expiresAt, note } = req.body;
    if (!code || !type || value === undefined) {
      return res.status(400).json({ message: "Code, type, and value are required" });
    }
    const plans = await checkPlanKeys(req.body.plans);
    if (plans.error) return res.status(400).json({ message: plans.error });
    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      type,
      value,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      note,
      plans: plans.keys,
    });
    res.status(201).json({ coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "This coupon code already exists" });
    res.status(500).json({ message: "Couldn't create coupon", error: err.message });
  }
}

// The plans a coupon may be used on: known plan keys only, no repeats.
// Missing or empty = every plan that takes coupons.
async function checkPlanKeys(input) {
  if (input === undefined || input === null) return { keys: [] };
  if (!Array.isArray(input)) return { error: "Plans must be a list" };
  const keys = [...new Set(input.map((k) => String(k).trim()).filter(Boolean))];
  if (!keys.length) return { keys };
  const Plan = require("../models/Plan");
  const found = await Plan.find({ key: { $in: keys } }).select("key").lean();
  const unknown = keys.filter((k) => !found.some((p) => p.key === k));
  if (unknown.length) return { error: `Unknown plan: ${unknown.join(", ")}` };
  return { keys };
}

// PATCH /api/admin/coupons/:id/plans  { plans: ["monthly"] }
async function setCouponPlans(req, res) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  const plans = await checkPlanKeys(req.body.plans);
  if (plans.error) return res.status(400).json({ message: plans.error });
  coupon.plans = plans.keys;
  await coupon.save();
  res.json({ coupon });
}

async function toggleCoupon(req, res) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  res.json({ coupon });
}

async function deleteCoupon(req, res) {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  res.json({ message: "Coupon deleted" });
}

module.exports = { resolveCoupon, validateCoupon, listCoupons, createCoupon, setCouponPlans, toggleCoupon, deleteCoupon };