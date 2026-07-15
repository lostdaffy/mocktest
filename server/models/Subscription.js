const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["half_yearly", "yearly"], required: true },
    amount: { type: Number, required: true }, // final amount paid after any credit discount
    creditsUsed: { type: Number, default: 0 }, // referral credits applied as discount
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);