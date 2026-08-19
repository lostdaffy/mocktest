const crypto = require("crypto");
const Razorpay = require("razorpay");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { resolveCoupon } = require("./couponController");

const PLAN_PRICES = {
  half_yearly: 149,
  yearly: 249,
};

const PLAN_DURATION_MONTHS = {
  half_yearly: 6,
  yearly: 12,
};

// Credit a referrer earns when someone they referred completes a purchase.
const REFERRAL_REWARD = {
  half_yearly: 30,
  yearly: 50,
};

// Cap how much of a purchase can be paid with referral credits, so a plan
// is never fully free (protects revenue and discourages fraud rings).
const MAX_CREDIT_DISCOUNT_PERCENT = 50;

function getRazorpayInstance() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /api/payments/create-order  { plan: "half_yearly" | "yearly", useCredits: boolean }
async function createOrder(req, res) {
  try {
    const { plan, useCredits, couponCode } = req.body;
    const basePrice = PLAN_PRICES[plan];
    if (!basePrice) return res.status(400).json({ message: "Invalid plan" });

    const user = await User.findById(req.user._id);

    let discount = 0;
    let finalAmount = basePrice;
    let appliedCoupon = null;

    if (couponCode) {
      // A coupon replaces the referral-credit discount rather than
      // stacking with it - keeps the pricing unambiguous instead of
      // needing rules for how two discounts combine.
      try {
        const result = await resolveCoupon(couponCode, basePrice);
        appliedCoupon = result.coupon;
        finalAmount = result.finalAmount;
        discount = basePrice - finalAmount;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    } else if (useCredits && user.referralCredits > 0) {
      const maxDiscount = Math.floor((basePrice * MAX_CREDIT_DISCOUNT_PERCENT) / 100);
      discount = Math.min(user.referralCredits, maxDiscount);
      finalAmount = basePrice - discount;
    }

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: finalAmount * 100, // paise
      currency: "INR",
      receipt: `rcpt_${req.user._id}_${Date.now()}`.slice(0, 40),
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + PLAN_DURATION_MONTHS[plan]);

    const subscription = await Subscription.create({
      user: req.user._id,
      plan,
      amount: finalAmount,
      creditsUsed: discount,
      couponCode: appliedCoupon?.code, // harmless if the schema doesn't declare this field - just won't persist
      startDate,
      endDate,
      razorpayOrderId: order.id,
      status: "created",
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      subscriptionId: subscription._id,
      basePrice,
      discount,
      finalAmount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create order", error: err.message });
  }
}

// Shared by both the app's own /verify call and the Razorpay webhook below.
// Idempotent - calling this twice for the same order (once from each path,
// whichever arrives first) only activates the subscription once.
async function activateSubscription({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const subscription = await Subscription.findOne({ razorpayOrderId });
  if (!subscription) return { ok: false, reason: "Subscription record not found" };
  if (subscription.status === "paid") return { ok: true, subscription, alreadyDone: true };

  subscription.razorpayPaymentId = razorpayPaymentId;
  if (razorpaySignature) subscription.razorpaySignature = razorpaySignature;
  subscription.status = "paid";
  await subscription.save();

  const buyer = await User.findById(subscription.user);

  if (subscription.creditsUsed > 0) {
    buyer.referralCredits = Math.max(0, buyer.referralCredits - subscription.creditsUsed);
  }

  buyer.subscriptionStatus = "active";
  buyer.subscriptionExpiresAt = subscription.endDate;
  buyer.subscriptionPlan = subscription.plan;
  await buyer.save();

  if (buyer.referredBy) {
    const priorPaid = await Subscription.countDocuments({ user: buyer._id, status: "paid" });
    if (priorPaid === 1) {
      const reward = REFERRAL_REWARD[subscription.plan] || 0;
      await User.findByIdAndUpdate(buyer.referredBy, {
        $inc: { referralCredits: reward, referralCount: 1 },
      });
    }
  }

  if (subscription.couponCode) {
    try {
      const Coupon = require("../models/Coupon");
      await Coupon.updateOne({ code: subscription.couponCode }, { $inc: { usedCount: 1 } });
    } catch (err) {
      console.error("Coupon usage count update failed (subscription still activated):", err.message);
    }
  }

  return { ok: true, subscription };
}

// POST /api/payments/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId }
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed - signature mismatch" });
    }

    const result = await activateSubscription({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });
    if (!result.ok) return res.status(404).json({ message: result.reason });

    res.json({ message: "Payment verified, subscription activated", subscription: result.subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
}

// POST /api/payments/webhook - called by Razorpay's servers directly, not
// the app. This is the safety net: if a student's payment succeeds but the
// app never gets to call /verify (killed mid-flow, network drops right
// after paying, etc.), Razorpay's own server-to-server notification still
// activates the subscription. Without this, that failure mode means money
// taken with nothing granted - a real support/refund problem, not a
// hypothetical one, once real payments are flowing.
// Setup: Razorpay Dashboard -> Settings -> Webhooks -> add this URL,
// subscribe to "payment.captured", set a webhook secret, and put that
// secret in RAZORPAY_WEBHOOK_SECRET in .env.
async function razorpayWebhook(req, res) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not set - webhook received but ignored");
      return res.status(200).json({ received: true });
    }
    if (!req.rawBody) {
      console.error("Webhook raw body missing - check server.js json() verify config");
      return res.status(200).json({ received: true });
    }

    const expected = crypto.createHmac("sha256", webhookSecret).update(req.rawBody).digest("hex");
    if (expected !== signature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body.event;
    if (event === "payment.captured") {
      const payment = req.body.payload?.payment?.entity;
      if (payment?.order_id && payment?.id) {
        await activateSubscription({
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
        });
      }
    }

    // Always 200 once signature is valid - Razorpay retries on non-2xx,
    // and retry-storming our own bug doesn't help anyone.
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(200).json({ received: true });
  }
}

// GET /api/payments/referral-info -> referral code, credits, count, and shareable text
async function getReferralInfo(req, res) {
  const user = await User.findById(req.user._id).select("referralCode referralCredits referralCount");
  res.json({
    referralCode: user.referralCode,
    referralCredits: user.referralCredits,
    referralCount: user.referralCount,
    rewards: REFERRAL_REWARD,
    shareMessage: `Rankveer pe practice karo! Mera referral code "${user.referralCode}" use karo signup pe. SSC, UP Police, Railway, Banking, CTET ke unlimited mock tests, PYQs aur live exams.`,
  });
}

module.exports = { createOrder, verifyPayment, razorpayWebhook, getReferralInfo, PLAN_PRICES };