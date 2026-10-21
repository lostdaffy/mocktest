const mongoose = require("mongoose");

// The ideas a practice series is built from: for one topic at one level, a
// list of distinct question ideas ("two successive changes - the net
// percentage", "the change that undoes a change", ...). A test is written one
// idea per question, the least-used ideas first, so twenty questions test
// twenty things and the tenth test of a series is not the first one again.
//
// Drafted by the AI the first time a series needs it (services/blueprints.js)
// and editable by the admin after that - "source" says which.
const ideaSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 300 },
    used: { type: Number, default: 0 },
    // The admin can switch an idea off without losing its history.
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const blueprintSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    // The chapter's own series (no topic) is stored as "".
    topic: { type: String, default: "" },
    level: { type: String, enum: ["easy", "medium", "hard", "advanced"], required: true },
    ideas: { type: [ideaSchema], default: [] },
    source: { type: String, enum: ["ai", "admin"], default: "ai" },
  },
  { timestamps: true }
);

blueprintSchema.index({ subject: 1, chapter: 1, topic: 1, level: 1 }, { unique: true });

module.exports = mongoose.model("Blueprint", blueprintSchema);
