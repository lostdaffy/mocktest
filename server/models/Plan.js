const mongoose = require("mongoose");

// A subscription plan students can buy. The four original plans (monthly,
// quarterly, half_yearly, yearly) are seeded from services/plans.js the first
// time the server starts with an empty collection; after that everything -
// price, length, discount rules, order on screen - is edited by the admin.
//
// `key` is what the app sends when buying and what every Subscription row
// stores, so it never changes after creation. A plan that has been sold is
// archived, never deleted: old payments still point at its key.
const planSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, immutable: true, match: /^[a-z][a-z0-9_]{2,31}$/ },
    name: { type: String, required: true, trim: true, maxlength: 40 }, // "6 Months"
    months: { type: Number, required: true, min: 1, max: 36 },
    price: { type: Number, required: true, min: 1, max: 100000 }, // rupees, whole number
    mrp: { type: Number, default: null, min: 1, max: 1000000 }, // struck-out "was" price, optional
    badge: { type: String, trim: true, maxlength: 24, default: "" }, // "BEST VALUE"
    highlight: { type: Boolean, default: false }, // pre-selected in the app
    creditPercent: { type: Number, default: 50, min: 0, max: 100 }, // share payable with referral credit
    couponsAllowed: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: false }, // on sale in the app right now
    archivedAt: { type: Date, default: null }, // removed from the admin list's active view, kept for history
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
