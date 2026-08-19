const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, razorpayWebhook, getReferralInfo } = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.post("/webhook", razorpayWebhook); // called by Razorpay's servers directly, not by the app
router.get("/referral-info", protect, getReferralInfo);

module.exports = router;