const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: {
      type: String,
      enum: ["wrong_answer", "unclear_question", "typo", "duplicate_options", "other"],
      required: true,
    },
    note: { type: String },
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
