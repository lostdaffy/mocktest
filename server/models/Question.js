const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    // Bilingual content
    text: { type: String, required: true },
    textHi: { type: String }, // Hindi version

    // Four options. A real past paper that printed five - UPSSSC PET adds
    // (E) "None of the above", and it is sometimes the answer - is kept as
    // printed; only source "pyq" may carry five. (On an update query `this`
    // is not the document, so five is refused there; the PYQ paths save
    // documents.)
    options: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.length === 4 || (v.length === 5 && this?.source === "pyq");
        },
        message: "A question needs exactly four options (five only for a past paper that printed five)",
      },
      required: true,
    },
    optionsHi: [{ type: String }],

    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 4,
      validate: {
        validator: function (v) {
          const n = Array.isArray(this?.options) ? this.options.length : 4;
          return v < n;
        },
        message: "The correct answer must be one of the options",
      },
    },

    solution: { type: String, required: true },

    // Maths: the sum that gives the answer, using the question's numbers
    // ("1200 * 12 * 3 / 100"). The gate runs it and checks the marked option
    // is the result - see services/mathCheck.js checkFormula.
    formula: { type: String },
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
    // "proven": two separate workings, run in code, both land on the key
    // (services/answerProof.js). Absent when there was nothing to run.
    answerProof: { type: String, enum: ["proven", "disproved"] },
    flagReason: { type: String },
    reportCount: { type: Number, default: 0 },

    // Performance-driven data (updated as students attempt this question)
    timesAttempted: { type: Number, default: 0 },
    timesCorrect: { type: Number, default: 0 },
    wrongAnswerRate: { type: Number, default: 0 }, // auto-recalculated, used to flag confusing questions
    // How many answers went to each option ({ "0": 12, "2": 3 }). A wrong
    // key shows as the answers gathering on one other option - see
    // services/answerSignals.js.
    picks: { type: Map, of: Number },

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