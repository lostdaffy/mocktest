const express = require("express");
const router = express.Router();
const { listCoupons, createCoupon, toggleCoupon, deleteCoupon } = require("../controllers/couponController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

router.get("/", protect, adminOnly, asyncRoute(listCoupons));
router.post("/", protect, adminOnly, asyncRoute(createCoupon));
router.patch("/:id/toggle", protect, adminOnly, asyncRoute(toggleCoupon));
router.delete("/:id", protect, adminOnly, asyncRoute(deleteCoupon));

module.exports = router;