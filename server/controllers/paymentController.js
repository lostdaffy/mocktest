const crypto = require("crypto");
const Razorpay = require("razorpay");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { resolveCoupon } = require("./couponController");

// Plans (price, length, discount rules) live in the Plan collection and are
// managed from the admin panel (services/plans.js). Nothing about a plan is
// ever taken from the request except its key: the price charged is always
// read here, on the server. The four original keys stay valid, so older app
// versions keep working.
const { getActivePlans, getPlanByKey, publicPlan } = require("../services/plans");

// Referral reward lives in config/referral.js now - it's awarded at signup
// (controllers/authController.js), not here at purchase time. Imported only
// so getReferralInfo can tell the app what a referral is currently worth.
const { REFERRAL_SIGNUP_REWARD, REFERRAL_OFFER_ACTIVE } = require("../config/referral");

// Cap how much of a purchase can be paid with referral credits, so a plan
// is never fully free (protects revenue and discourages fraud rings). Each
// plan carries its own share (Plan.creditPercent); this is the fallback.
const MAX_CREDIT_DISCOUNT_PERCENT = 50;
const creditPercentFor = (plan) => plan?.creditPercent ?? MAX_CREDIT_DISCOUNT_PERCENT;

// How long an unpaid order holds one of a coupon's remaining uses.
const COUPON_HOLD_MINUTES = 15;

// Payments stay OFF while the server holds Razorpay TEST keys. In test mode
// anyone can "pay" with Razorpay's publicly documented test card numbers and
// walk away with a real subscription. Putting the live keys (rzp_live_...)
// in Render switches payments on by itself - the app asks /api/app-config,
// so no app update is needed. ALLOW_TEST_PAYMENTS=true is for local
// development only; never set it on the live server.
function paymentsEnabled() {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  if (!keyId || !process.env.RAZORPAY_KEY_SECRET) return false;
  if (keyId.startsWith("rzp_test_")) return process.env.ALLOW_TEST_PAYMENTS === "true";
  return true;
}

const PAYMENTS_OFF = {
  message: "Payments have not started yet - coming soon!",
  code: "PAYMENTS_DISABLED",
};

function getRazorpayInstance() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /api/payments/create-order  { plan: "monthly" | "quarterly" | "half_yearly" | "yearly", useCredits: boolean }
async function createOrder(req, res) {
  try {
    if (!paymentsEnabled()) return res.status(503).json(PAYMENTS_OFF);

    const { plan, useCredits, couponCode } = req.body;
    const planDoc = await getPlanByKey(plan);
    if (!planDoc || !planDoc.active || planDoc.archivedAt) {
      return res.status(400).json({ message: "This plan is not available any more. Please pick another." });
    }
    const basePrice = planDoc.price;

    const user = await User.findById(req.user._id);

    let discount = 0;
    let finalAmount = basePrice;
    let appliedCoupon = null;

    if (couponCode && !planDoc.couponsAllowed) {
      return res.status(400).json({ message: "Coupons do not apply to this plan" });
    }

    if (couponCode) {
      // A coupon replaces the referral-credit discount rather than
      // stacking with it - keeps the pricing unambiguous instead of
      // needing rules for how two discounts combine.
      try {
        const result = await resolveCoupon(couponCode, basePrice, planDoc.key);
        appliedCoupon = result.coupon;
        finalAmount = result.finalAmount;
        discount = basePrice - finalAmount;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

      // One coupon, one use per student. Without this, a single student can
      // buy again and again on the same code - each purchase is only one
      // use, so even maxUses can't stop them until the count runs out.
      const claimed = await User.exists({ _id: req.user._id, usedCoupons: appliedCoupon.code });
      const alreadyUsed = claimed || (await Subscription.findOne({
        user: req.user._id,
        couponCode: appliedCoupon.code,
        status: "paid",
      }));
      if (alreadyUsed) {
        return res.status(400).json({ message: "You have already used this coupon" });
      }

      // Checkouts other students already have open count against the limit
      // too. usedCount only rises once money lands, so without this a
      // single-use coupon that leaks can be opened by twenty people at once
      // and every one of them pays. Their own abandoned attempts are
      // excluded (they'd otherwise lock themselves out for 15 minutes), and
      // a hold expires after 15 minutes so an abandoned checkout doesn't
      // keep a coupon reserved forever.
      if (appliedCoupon.maxUses !== null) {
        const pendingHolds = await Subscription.countDocuments({
          couponCode: appliedCoupon.code,
          status: "created",
          user: { $ne: req.user._id },
          createdAt: { $gte: new Date(Date.now() - COUPON_HOLD_MINUTES * 60 * 1000) },
        });
        if (appliedCoupon.usedCount + pendingHolds >= appliedCoupon.maxUses) {
          return res.status(400).json({ message: "This coupon has reached its usage limit" });
        }
      }
    } else if (useCredits && user.referralCredits > 0) {
      const maxDiscount = Math.floor((basePrice * creditPercentFor(planDoc)) / 100);
      discount = Math.min(user.referralCredits, maxDiscount);
      finalAmount = basePrice - discount;
    }

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: finalAmount * 100, // paise
      currency: "INR",
      receipt: `rcpt_${req.user._id}_${Date.now()}`.slice(0, 40),
    });

    // Provisional term, mirroring the renewal-stacking rule in
    // activateSubscription (an early renewal extends from the current
    // expiry, not from today) so the app can preview the right dates.
    // These are recomputed for real when the payment actually lands.
    const now = new Date();
    const currentExpiry = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
    const startDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + planDoc.months);

    const subscription = await Subscription.create({
      user: req.user._id,
      plan: planDoc.key,
      months: planDoc.months,
      amount: finalAmount,
      creditsUsed: discount,
      couponCode: appliedCoupon?.code,
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

  const buyer = await User.findById(subscription.user);

  // A coupon gives one plan per person. The claim is a single atomic write,
  // so two checkouts opened on the same coupon and paid together can't both
  // add a month. The second payment is recorded (the money was taken) but
  // adds no time; it shows up in the log for a refund if anyone asks.
  if (subscription.couponCode) {
    const code = subscription.couponCode;
    const slot = "couponClaims." + code.replace(/[.$]/g, "_");
    const claim = await User.updateOne(
      { _id: subscription.user, usedCoupons: { $ne: code }, [slot]: { $exists: false } },
      { $addToSet: { usedCoupons: code }, $set: { [slot]: razorpayOrderId } }
    );
    let ours = claim.modifiedCount === 1;
    if (!ours) {
      // Already claimed - fine only if THIS order made the claim earlier.
      const u = await User.findById(subscription.user).select("+couponClaims").lean();
      ours = !!u?.couponClaims && u.couponClaims[code.replace(/[.$]/g, "_")] === razorpayOrderId;
    }
    const earlierPaid = await Subscription.exists({
      user: subscription.user,
      couponCode: code,
      status: "paid",
      _id: { $ne: subscription._id },
    });
    if (!ours || earlierPaid) {
      const now = new Date();
      subscription.razorpayPaymentId = razorpayPaymentId;
      if (razorpaySignature) subscription.razorpaySignature = razorpaySignature;
      subscription.status = "paid";
      subscription.startDate = now;
      subscription.endDate = now; // no time added
      subscription.duplicateCoupon = true;
      await subscription.save();
      console.warn(`Coupon ${subscription.couponCode} paid a second time by user ${subscription.user} (order ${razorpayOrderId}) - no time added`);
      return { ok: true, subscription, duplicateCoupon: true };
    }
  }

  // Renewal stacking. A student who renews EARLY must not lose the days
  // still left on their current plan - the new term starts the moment the
  // old one ends, not today. (Renewing a yearly plan 4 months early used to
  // silently move the expiry to today+12 months, quietly eating those 4
  // paid-for months.)
  //
  // This is computed here, at payment time, rather than at order-creation
  // time: an order can sit unpaid for a while, and a student can create two
  // orders before paying either. Deriving the term from the buyer's actual
  // expiry at the moment money lands keeps both cases correct, and makes
  // each renewal stack on top of the previous one.
  const now = new Date();
  const previousExpiry = buyer.subscriptionExpiresAt ? new Date(buyer.subscriptionExpiresAt) : null;
  const termStart = previousExpiry && previousExpiry > now ? previousExpiry : now;
  const termEnd = new Date(termStart);
  // The length was stamped on the order when it was created, so a later
  // edit of the plan never changes what an already-open order buys.
  const months = subscription.months || (await getPlanByKey(subscription.plan))?.months || 1;
  termEnd.setMonth(termEnd.getMonth() + months);

  subscription.razorpayPaymentId = razorpayPaymentId;
  if (razorpaySignature) subscription.razorpaySignature = razorpaySignature;
  subscription.status = "paid";
  subscription.startDate = termStart;
  subscription.endDate = termEnd;
  await subscription.save();

  if (subscription.creditsUsed > 0) {
    buyer.referralCredits = Math.max(0, buyer.referralCredits - subscription.creditsUsed);
  }

  buyer.subscriptionStatus = "active";
  buyer.subscriptionExpiresAt = termEnd;
  buyer.subscriptionPlan = subscription.plan;
  await buyer.save();

  // NOTE: the referrer is NOT rewarded here any more. The Refer & Earn
  // payout moved to signup time (see controllers/authController.js and
  // config/referral.js) - a friend installing the app is now what earns
  // the credit, not their eventual purchase.

  if (subscription.couponCode) {
    try {
      const Coupon = require("../models/Coupon");
      // Conditional $inc: two students paying on the last remaining use at
      // the same moment can't both push the count past maxUses. The one
      // that loses the race keeps its subscription - the money has already
      // been taken and refusing it here would be worse - but it is logged
      // so an over-used coupon is visible rather than silent.
      const counted = await Coupon.updateOne(
        {
          code: subscription.couponCode,
          $or: [{ maxUses: null }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }],
        },
        { $inc: { usedCount: 1 } }
      );
      if (counted.modifiedCount === 0) {
        console.warn(`Coupon ${subscription.couponCode} was used past its limit by subscription ${subscription._id}`);
      }
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
    if (!paymentsEnabled()) return res.status(503).json(PAYMENTS_OFF);

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
    if (event === "payment.captured" && !paymentsEnabled()) {
      console.warn("payment.captured webhook ignored - payments are disabled (test keys / not configured)");
    } else if (event === "payment.captured") {
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
    rewardPerSignup: REFERRAL_SIGNUP_REWARD,
    offerActive: REFERRAL_OFFER_ACTIVE,
    maxDiscountPercent: MAX_CREDIT_DISCOUNT_PERCENT,
    // What each plan allows, for the app's plan and payment screens.
    credits: user.referralCredits,
    plans: Object.fromEntries((await getActivePlans()).map((p) => [p.key, {
      price: p.price,
      creditPercent: creditPercentFor(p),
      coupons: !!p.couponsAllowed,
    }])),
    shareMessage: `Practise on Rankveer! Use my referral code "${user.referralCode}" when you sign up. Unlimited mock tests, PYQs and live exams for SSC, UP Police, Railway, Banking and CTET.`,
  });
}

// GET /api/payments/plans - what the Subscription screen lists
async function listPlans(req, res) {
  res.set("Cache-Control", "no-store");
  res.json({ plans: (await getActivePlans()).map(publicPlan) });
}

module.exports = { createOrder, verifyPayment, razorpayWebhook, getReferralInfo, listPlans, paymentsEnabled };