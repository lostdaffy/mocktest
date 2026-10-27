const mongoose = require("mongoose");

// One previous-year paper on its way in from a PDF.
//
// What the PDF gives is held here, as rows, until a person has looked at it.
// Not as Question documents: a real paper often prints no solution and no
// answer key, and a Question cannot exist without both - the first version
// wrote straight to Question and failed on exactly those papers. Rows can be
// incomplete, edited in the panel or through a CSV, and only become questions
// when the paper is published, through the same rules as a hand-typed paper.

// What still needs a person on a row. A row with none left is ready.
const FLAGS = [
  "no_answer", // the paper has no key for it - the AI's answer is only a suggestion
  "answer_mismatch", // the paper's key and the AI's own solve disagree
  "needs_figure", // it needs a picture from the paper to be answered
  "option_count", // the paper printed other than four options
  "incomplete", // question or an option is empty
  "mixed_script", // letters of another script leaked in
  "passage_missing", // points at a passage that is not with it
];

const rowSchema = new mongoose.Schema(
  {
    number: Number, // as printed in the paper
    section: String, // the paper's own heading, e.g. "General Intelligence and Reasoning"
    page: Number,
    passage: String, // the passage a comprehension question belongs to, in full
    passageHi: String,
    text: String,
    textHi: String,
    options: [String],
    optionsHi: [String],
    // 0-3. paperAnswer is the key printed in the paper, aiAnswer the AI's own
    // solve; correctIndex is the answer that will be published.
    paperAnswer: Number,
    aiAnswer: Number,
    aiWorking: String,
    aiWorkingHi: String,
    solved: { type: Boolean, default: false },
    tagged: { type: Boolean, default: false },
    // A person has settled the answer (picked it, or accepted the paper's or
    // the AI's) - the answer flags no longer apply.
    answerConfirmed: { type: Boolean, default: false },
    needsFigure: { type: Boolean, default: false },
    correctIndex: Number,
    solution: String,
    solutionHi: String,
    subject: String,
    topic: String,
    // Which language the paper did not print and was translated in.
    translated: { type: String, enum: ["en", "hi", null], default: null },
    imageId: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionImage" },
    // A table or graph the question is about, as numbers (services/visuals.js
    // normaliseChart); published as the question's chart for the app to draw.
    chart: { type: mongoose.Schema.Types.Mixed },
    chartSet: String, // the questions on one chart share this
    chartFormula: String, // the sum over the chart that gives the answer
    flags: [{ type: String, enum: FLAGS }],
    removed: { type: Boolean, default: false },
    // Once published, the question this row became.
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  },
  { _id: true }
);

const pyqImportSchema = new mongoose.Schema(
  {
    examStage: { type: String, required: true, index: true },
    // What the admin typed, and what the paper itself says. The admin's
    // value always wins; the detected one fills what was left blank.
    title: String,
    examDate: Date,
    shift: String,
    year: Number,
    language: { type: String, enum: ["english", "hindi", "bilingual"] },
    detected: {
      examName: String,
      examDate: String,
      shift: String,
      year: Number,
      language: String,
      totalQuestions: Number,
    },

    fileName: String,
    fileHash: { type: String, index: true },
    fileId: mongoose.Schema.Types.ObjectId, // GridFS, bucket "pyqpdfs"
    pages: Number,

    status: {
      type: String,
      enum: ["queued", "reading", "review", "published", "failed"],
      default: "queued",
      index: true,
    },
    // Where the reading has got to, so the panel can say "page 12 of 30" and
    // a restart carries on instead of starting again.
    step: { type: String, enum: ["info", "pages", "translate", "solve", "tag", "done"], default: "info" },
    pagesDone: { type: Number, default: 0 },
    error: String,

    // The paper's own count, and the printed numbers that never turned up.
    expectedCount: Number,
    missingNumbers: [Number],

    rows: [rowSchema],
    // Answer-key tables found while reading, applied to the rows at the end
    // (the key is usually on the last pages, after its questions).
    answerKey: [{ number: Number, section: String, answer: String, _id: false }],

    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
    createdBy: String,
    publishedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PyqImport", pyqImportSchema);
module.exports.FLAGS = FLAGS;
