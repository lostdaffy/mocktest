const express = require("express");
const router = express.Router();
const { listCoupons, createCoupon, toggleCoupon, deleteCoupon } = require("../controllers/couponController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", protect, adminOnly, listCoupons);
router.post("/", protect, adminOnly, createCoupon);
router.patch("/:id/toggle", protect, adminOnly, toggleCoupon);
router.delete("/:id", protect, adminOnly, deleteCoupon);

module.exports = router;