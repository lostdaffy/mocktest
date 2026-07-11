const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, getReferralInfo } = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.get("/referral-info", protect, getReferralInfo);

module.exports = router;