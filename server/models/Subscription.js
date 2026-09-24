const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["quarterly", "half_yearly", "yearly"], required: true },
    amount: { type: Number, required: true }, // final amount paid after any credit discount
    creditsUsed: { type: Number, default: 0 }, // referral credits applied as discount
    // The coupon this order was created with. It MUST be declared here:
    // Mongoose silently drops undeclared fields, and while it was missing
    // the activation step never saw a coupon to count, so every coupon
    // behaved as if it had unlimited uses.
    couponCode: { type: String, uppercase: true, trim: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Looked up by id on every payment verification AND on every webhook
    // Razorpay sends. Unique because one order must never map to two
    // subscription records - that is how a payment gets counted twice.
    razorpayOrderId: { type: String, index: true, unique: true, sparse: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);