const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },

    // "percent"      - value is 0-100, discounted off the plan's normal price
    // "flat_discount" - value is a rupee amount subtracted from the price
    // "fixed_price"   - value IS the final price, regardless of the plan's
    //                    normal price (this is what a ₹1 test coupon uses)
    type: { type: String, enum: ["percent", "flat_discount", "fixed_price"], required: true },
    value: { type: Number, required: true },

    maxUses: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },

    note: { type: String }, // admin-facing reminder of what this coupon is for
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);