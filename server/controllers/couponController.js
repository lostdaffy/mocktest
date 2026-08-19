const Coupon = require("../models/Coupon");

// Shared by the payment flow's validate/apply calls. Returns the final
// price a coupon results in for a given base price, or throws with a
// clear reason if it can't be used - callers turn that into a 400.
async function resolveCoupon(code, basePrice) {
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) throw new Error("Invalid coupon code");
  if (!coupon.isActive) throw new Error("This coupon is no longer active");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("This coupon has expired");
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new Error("This coupon has reached its usage limit");
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

  return { coupon, finalAmount };
}

// GET /api/payments/validate-coupon?code=&plan= - lets the app show the
// discounted price BEFORE the student commits to paying. The real,
// authoritative check happens again in createOrder - this is just for
// instant UI feedback, never trusted on its own.
async function validateCoupon(req, res) {
  try {
    const { code, plan } = req.query;
    const PLAN_PRICES = require("./paymentController").PLAN_PRICES;
    const basePrice = PLAN_PRICES[plan];
    if (!basePrice) return res.status(400).json({ valid: false, message: "Invalid plan" });

    const { finalAmount } = await resolveCoupon(code, basePrice);
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
    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      type,
      value,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      note,
    });
    res.status(201).json({ coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "This coupon code already exists" });
    res.status(500).json({ message: "Couldn't create coupon", error: err.message });
  }
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

module.exports = { resolveCoupon, validateCoupon, listCoupons, createCoupon, toggleCoupon, deleteCoupon };