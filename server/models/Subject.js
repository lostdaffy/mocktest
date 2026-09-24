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

    // The same subject goes by different names in different exams: banking
    // calls Maths "Quantitative Aptitude" or "Quant", SSC calls Reasoning
    // "General Intelligence". An exam pattern may name a section by any of
    // these, and it still resolves to this one subject and one question bank.
    //
    // Without this, a pattern asking for "Quant" found no catalog subject at
    // all - which is exactly why a Banking student's Chapter Practice was
    // empty while the questions sat in the bank under "Maths".
    aliases: [{ type: String }],

    chapters: [
      {
        name: { type: String, required: true }, // "Percentage"
        nameHi: { type: String },
        // Topics within this chapter - questions are tagged by topic, so this
        // links the chapter to its question pool.
        topics: [{ type: String }],

        // What this chapter is grouped under on screen: "अंकगणित",
        // "ज्यामिति", "इतिहास". Purely a heading - it does not change where
        // questions come from.
        //
        // This is what lets a big area like History feel like its own
        // section without becoming its own subject. History has to stay
        // inside GK, because the exam paper's General Awareness section
        // draws on subject "GK"; a separate History subject would simply
        // never be asked.
        category: { type: String },
        categoryHi: { type: String },

        // Which exams this chapter belongs to, e.g. ["SSC_CGL", "RAILWAY"].
        // A student only sees the chapters their own exam asks for, so an
        // Agniveer aspirant is never shown Coordinate Geometry.
        //
        // Empty means "every exam" - so chapters that existed before this
        // field keep showing up rather than silently disappearing.
        exams: [{ type: String }],

        displayOrder: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);