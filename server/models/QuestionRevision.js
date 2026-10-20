const mongoose = require("mongoose");

// Every change to a question, with what it looked like before and after.
//
// A question in the bank is edited by the admin, mended or replaced by the AI,
// retired from tests and occasionally brought back. Without a record, a wrong
// edit to a published question - a changed answer key, a solution overwritten
// - could not be seen or undone. Each row is one change; restoring a version
// is itself a change and gets its own row, so nothing is ever lost.
const snapshot = {
  text: String,
  textHi: String,
  options: [String],
  optionsHi: [String],
  correctIndex: Number,
  solution: String,
  solutionHi: String,
  formula: String,
  status: String,
  difficulty: String,
  topic: String,
  chapter: String,
  flagReason: String,
};

const questionRevisionSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    action: {
      type: String,
      enum: ["create", "edit", "ai_fix", "ai_replace", "replaced", "status", "retire", "delete", "restore"],
      required: true,
    },
    // Who made the change: the admin, the AI quality desk, or the system (a
    // spreadsheet row replacing it, an audit, a sweep).
    by: { type: String, enum: ["admin", "ai", "system"], default: "admin" },
    note: String,
    before: { type: snapshot, default: undefined },
    after: { type: snapshot, default: undefined },
    // For a replacement: the question that took this one's place.
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    // For a deletion: the whole question as it was, so it can be brought back.
    whole: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("QuestionRevision", questionRevisionSchema);
