const mongoose = require("mongoose");

// A short note about a question the quality gate threw away.
//
// The questions themselves are deleted, not parked: a review queue nobody
// works through is worse than no queue, and there is an endless supply of
// replacements. But deleting with no trace at all is how a broken gate
// destroys good work silently - twice in one day the gate itself turned out
// to be at fault (it compared answer positions instead of answers, and it
// was asked for a verdict without room to calculate), and both times the
// evidence was only there because the rejects had been kept.
//
// So the question goes; a line about why it went stays. Nothing here is in
// the admin's way - it is not a queue and there is nothing to action. It is
// for one question: "is this chapter rejecting far more than the others, and
// if so is the gate wrong or is the topic genuinely hard?"
const rejectedQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    subject: { type: String, index: true },
    topic: { type: String, index: true },
    chapter: { type: String },
    difficulty: { type: String },

    // "rule", "answer_disputed", "duplicate", "reworded"
    reason: { type: String, required: true, index: true },
    detail: { type: String },

    // Whether a repair was attempted before giving up, so a rising repair
    // failure rate is visible rather than buried.
    repairAttempted: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Ninety days is long enough to investigate a bad patch of generation and
// short enough that this never becomes a table anybody has to manage.
rejectedQuestionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("RejectedQuestion", rejectedQuestionSchema);
