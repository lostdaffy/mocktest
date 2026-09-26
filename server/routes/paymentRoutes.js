const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, razorpayWebhook, getReferralInfo } = require("../controllers/paymentController");
const { validateCoupon } = require("../controllers/couponController");
const { protect } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

router.post("/create-order", protect, asyncRoute(createOrder));
router.post("/verify", protect, asyncRoute(verifyPayment));
router.post("/webhook", asyncRoute(razorpayWebhook)); // called by Razorpay's servers directly, not by the app
router.get("/referral-info", protect, asyncRoute(getReferralInfo));
router.get("/validate-coupon", protect, asyncRoute(validateCoupon));

module.exports = router;