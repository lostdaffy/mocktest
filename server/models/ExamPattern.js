const mongoose = require("mongoose");

// One document per exam (or per exam-stage, e.g. SSC_CGL_TIER1).
// The auto test generator reads this to assemble a full mock without
// any manual test creation.
const examPatternSchema = new mongoose.Schema(
  {
    examType: { type: String, required: true, unique: true, index: true }, // "SSC_CGL", "UP_POLICE", "RRB_NTPC", etc.
    displayName: { type: String, required: true }, // "SSC CGL Tier 1"
    durationMinutes: { type: Number, required: true },
    negativeMarking: { type: Number, default: 0.25 },
    marksPerQuestion: { type: Number, default: 1 },

    sections: [
      {
        subject: { type: String, required: true }, // "Maths"
        questionCount: { type: Number, required: true },
        difficultyMix: {
          easy: { type: Number, default: 30 }, // percentage
          medium: { type: Number, default: 50 },
          hard: { type: Number, default: 20 },
        },
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamPattern", examPatternSchema);
