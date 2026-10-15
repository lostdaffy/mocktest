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
    // "manual" is a question a person wrote - a human-made mock. Real past
    // papers stay "pyq" whether they came from a PDF or were typed in.
    source: { type: String, enum: ["ai_generated", "pyq", "manual"], required: true },
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

    // The question text with case, spacing and punctuation stripped out, so
    // "What is 15% of 240?" and "what is 15 % of 240" are recognised as the
    // same question. Indexed because every generation checks new questions
    // against the bank before putting them in a test.
    textKey: { type: String, index: true },

    // When a person last confirmed a fact that can go out of date ("who is
    // the current CEC", "recently", a recent year) is still true. See
    // GET /api/questions/time-sensitive.
    factCheckedAt: { type: Date },

    // Repeat-detection / Exam Match Engine
    embedding: { type: [Number], select: false }, // vector for similarity search
    repeatCount: { type: Number, default: 0 }, // how many times a near-identical PYQ has appeared historically

    createdBy: { type: String, enum: ["ai", "admin", "import"], default: "ai" },

    // A question that needs a picture - see services/visuals.js.
    //
    //  chart:  Data Interpretation. The numbers are stored and the app draws
    //          the chart, so nothing is uploaded. The questions of one set
    //          share a setId and the same chart.
    //  figure: figure-based reasoning. `spec` is the figure as shapes on a
    //          grid; the prompt for an image AI and the reference drawing are
    //          both made from it. Until `imageId` is set the question keeps
    //          its test from being published.
    //
    // Absent on every ordinary question, which is what keeps apps before
    // 1.2.0 - which cannot draw either - working exactly as they did.
    visual: {
      kind: { type: String, enum: ["chart", "figure"] },
      setId: { type: String },
      chart: {
        type: { type: String, enum: ["bar", "line", "pie", "table", "mixed", "caselet"] },
        title: String,
        titleHi: String,
        unit: String,
        xLabel: String,
        yLabel: String,
        // default: undefined - otherwise every ordinary question would be
        // saved carrying an empty visual.chart.
        categories: { type: [String], default: undefined },
        series: {
          type: [{ _id: false, name: String, values: [Number], as: { type: String, enum: ["bar", "line"] } }],
          default: undefined,
        },
        caselet: String,
        caseletHi: String,
      },
      // The arithmetic the marked answer was checked against, kept so the
      // admin can see why a DI question was trusted.
      formula: String,
      figure: {
        spec: { type: mongoose.Schema.Types.Mixed },
        // "checked": the answer was worked out in code from the figure's rule.
        // "by_eye": this kind of figure cannot be - the admin should look.
        answerCheck: { type: String, enum: ["checked", "by_eye"] },
        imageId: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionImage" },
        uploadedAt: Date,
        uploadedBy: String,
      },
    },
  },
  { timestamps: true }
);

questionSchema.index({ examType: 1, subject: 1, topic: 1, status: 1 });

// The Images pending page: figure questions without their picture.
questionSchema.index({ "visual.kind": 1, "visual.figure.imageId": 1 }, { sparse: true });

module.exports = mongoose.model("Question", questionSchema);