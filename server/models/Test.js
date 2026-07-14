const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["full_mock", "sectional", "topic_wise", "pyq", "live", "revision", "practice"],
      required: true,
      index: true,
    },
    examType: { type: String, required: true, index: true },
    subject: { type: String }, // for sectional/topic-wise
    topic: { type: String }, // for topic-wise
    difficultyLevel: { type: String, enum: ["easy", "medium", "hard", "advanced"] }, // for practice series

    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true }],
    durationMinutes: { type: Number, required: true },
    marksPerQuestion: { type: Number, default: 1 },
    negativeMarking: { type: Number, default: 0.25 },

    // PYQ specific
    pyqYear: { type: Number },
    pyqShift: { type: String },

    // Live exam specific
    scheduledAt: { type: Date },
    liveStatus: { type: String, enum: ["upcoming", "live", "completed"] },
    participantCount: { type: Number, default: 0 },

    // Access control
    isFree: { type: Boolean, default: false },

    // A mock built specifically to become a live exam later. It's excluded
    // from the regular student-facing Mock Tests series so nobody can
    // practice on it before the live event runs.
    liveExclusive: { type: Boolean, default: false },

    // Admin publish workflow: draft -> published (live to students) or archived.
    // Only "published" tests are visible to students.
    publishStatus: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    seriesNumber: { type: Number }, // Mock #1, #2, #3... within an exam
    examStage: { type: String, index: true }, // "SSC_CGL", "SSC_MTS" etc.

    // Personalization: null means it's a generic test, otherwise it was
    // generated specifically for this user (e.g. "Aaj ka Test", weak-topic revision)
    generatedForUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    createdBy: { type: String, enum: ["system_auto", "admin"], default: "system_auto" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", testSchema);