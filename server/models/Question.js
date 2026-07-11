const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    // Bilingual content
    text: { type: String, required: true },
    textHi: { type: String }, // Hindi version

    options: {
      type: [String],
      validate: (v) => v.length === 4,
      required: true,
    },
    optionsHi: [{ type: String }],

    correctIndex: { type: Number, required: true, min: 0, max: 3 },

    solution: { type: String, required: true },
    solutionHi: { type: String },

    // Tagging - this is what makes one question bank serve both
    // topic-wise AND exam-wise tests
    examType: [{ type: String, required: true, index: true }], // ["SSC", "RAILWAY"]
    subject: { type: String, required: true, index: true }, // Maths / Reasoning / GK / English / Hindi
    topic: { type: String, required: true, index: true }, // e.g. "Percentage"
    chapter: { type: String },
    difficulty: { type: String, enum: ["easy", "medium", "hard", "exam"], default: "medium" },

    // Source & PYQ metadata
    source: { type: String, enum: ["ai_generated", "pyq"], required: true },
    pyqYear: { type: Number },
    pyqShift: { type: String },
    pyqExamName: { type: String }, // e.g. "SSC CGL Tier 1"

    // Quality control pipeline
    status: {
      type: String,
      enum: ["draft", "under_review", "published", "rejected", "hidden"],
      default: "draft",
      index: true,
    },
    aiConfidenceScore: { type: Number, min: 0, max: 1 }, // from self-verification step
    flagReason: { type: String },
    reportCount: { type: Number, default: 0 },

    // Performance-driven data (updated as students attempt this question)
    timesAttempted: { type: Number, default: 0 },
    timesCorrect: { type: Number, default: 0 },
    wrongAnswerRate: { type: Number, default: 0 }, // auto-recalculated, used to flag confusing questions

    // Repeat-detection / Exam Match Engine
    embedding: { type: [Number], select: false }, // vector for similarity search
    repeatCount: { type: Number, default: 0 }, // how many times a near-identical PYQ has appeared historically

    createdBy: { type: String, enum: ["ai", "admin", "import"], default: "ai" },
  },
  { timestamps: true }
);

questionSchema.index({ examType: 1, subject: 1, topic: 1, status: 1 });

module.exports = mongoose.model("Question", questionSchema);