const mongoose = require("mongoose");

// What the AI quality desk found wrong with a question, and what it proposes.
//
// In "approval" mode a proposal waits here until the admin applies or
// dismisses it; in "auto" mode it is applied at once and kept here as the
// record of what was done and why.
//
//   fix      - the same question mended (a fuller solution, the Hindi), with
//              the proposed fields in `proposed`
//   replace  - a new question on the same topic and level, already built and
//              checked (`replacement`, kept out of circulation until applied)
//   flag     - something only a person can settle (no AI available, or the
//              AI could not build a sound replacement)
const qualityFixSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    kind: { type: String, enum: ["fix", "replace", "flag"], required: true },
    problems: [String],
    // The AI's own reading, when it disagreed with the answer key.
    aiSaid: String,
    proposed: { type: mongoose.Schema.Types.Mixed },
    replacement: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    // Where the check came from: a spreadsheet upload, a bank audit, or the
    // admin asking about one question.
    source: { type: String, enum: ["csv", "audit", "admin", "edit"], default: "admin" },
    status: { type: String, enum: ["pending", "applied", "dismissed", "failed", "undone"], default: "pending", index: true },
    result: String,
    decidedAt: Date,
    decidedBy: { type: String, enum: ["admin", "ai"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QualityFix", qualityFixSchema);
