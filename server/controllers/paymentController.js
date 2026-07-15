const crypto = require("crypto");
const Razorpay = require("razorpay");
const Subscription = require("../models/Subscription");
const User = require("../models/User");

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
    const { plan, useCredits } = req.body;
    const basePrice = PLAN_PRICES[plan];
    if (!basePrice) return res.status(400).json({ message: "Invalid plan" });

    const user = await User.findById(req.user._id);

    // Apply referral credit as a discount if the student opted in
    let discount = 0;
    if (useCredits && user.referralCredits > 0) {
      const maxDiscount = Math.floor((basePrice * MAX_CREDIT_DISCOUNT_PERCENT) / 100);
      discount = Math.min(user.referralCredits, maxDiscount);
    }
    const finalAmount = basePrice - discount;

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

// POST /api/payments/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId }
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed - signature mismatch" });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Subscription record not found" });

    // Idempotency guard: if already processed, don't double-apply rewards
    if (subscription.status === "paid") {
      return res.json({ message: "Already verified", subscription });
    }

    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpaySignature = razorpay_signature;
    subscription.status = "paid";
    await subscription.save();

    const buyer = await User.findById(subscription.user);

    // Deduct any referral credits the buyer used
    if (subscription.creditsUsed > 0) {
      buyer.referralCredits = Math.max(0, buyer.referralCredits - subscription.creditsUsed);
    }

    // Activate subscription
    buyer.subscriptionStatus = "active";
    buyer.subscriptionExpiresAt = subscription.endDate;
    await buyer.save();

    // Reward the referrer (only on the buyer's FIRST paid purchase, to prevent
    // farming credits via repeat purchases by the same referred user)
    if (buyer.referredBy) {
      const priorPaid = await Subscription.countDocuments({
        user: buyer._id,
        status: "paid",
      });
      if (priorPaid === 1) {
        const reward = REFERRAL_REWARD[subscription.plan] || 0;
        await User.findByIdAndUpdate(buyer.referredBy, {
          $inc: { referralCredits: reward, referralCount: 1 },
        });
      }
    }

    res.json({ message: "Payment verified, subscription activated", subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed", error: err.message });
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
    shareMessage: `Smart Test Engine pe practice karo! Mera referral code "${user.referralCode}" use karo signup pe. SSC, UP Police, Railway, Banking, CTET ke unlimited mock tests, PYQs aur live exams.`,
  });
}

module.exports = { createOrder, verifyPayment, getReferralInfo, PLAN_PRICES };