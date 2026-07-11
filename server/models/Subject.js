const mongoose = require("mongoose");

// Master catalog of subjects and their chapters. This drives the
// subject-first navigation: a student picks the subjects they study, and
// under each subject they see chapters they can take tests on.
//
// One document per subject. Chapters are embedded because they're always
// read together with the subject and rarely change.
const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // "Maths", "Reasoning"
    nameHi: { type: String }, // "गणित"
    icon: { type: String, default: "📘" },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    chapters: [
      {
        name: { type: String, required: true }, // "Percentage"
        nameHi: { type: String },
        // Topics within this chapter - questions are tagged by topic, so this
        // links the chapter to its question pool.
        topics: [{ type: String }],
        displayOrder: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);