const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true, index: true },

    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
        selectedIndex: { type: Number, default: null }, // null = not attempted
        isCorrect: { type: Boolean, default: false },
        timeTakenSeconds: { type: Number, default: 0 },
        markedForReview: { type: Boolean, default: false },
      },
    ],

    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // percentage
    totalTimeTakenSeconds: { type: Number, default: 0 },

    // Live exam ranking
    rank: { type: Number },
    percentile: { type: Number },

    status: { type: String, enum: ["in_progress", "submitted", "auto_submitted"], default: "in_progress" },
    submittedAt: { type: Date },

    // Basic live-exam integrity signal: how many times, and for how long,
    // the student left the app mid-attempt. Not used to auto-disqualify -
    // just surfaced to the admin so a suspicious attempt can be reviewed.
    integrityFlags: {
      backgroundCount: { type: Number, default: 0 },
      backgroundSeconds: { type: Number, default: 0 },
    },

    // Which language the student actually took the test in (the toggle in
    // TestTakingScreen). Stored so the result/review screen can show the
    // same textHi/optionsHi/solutionHi content instead of always falling
    // back to English - a student who took the whole paper in Hindi
    // shouldn't have to read the solution in English.
    language: { type: String, enum: ["en", "hi"], default: "en" },
  },
  { timestamps: true }
);

attemptSchema.index({ test: 1, score: -1 }); // for fast leaderboard queries

// "Has this student already taken this test?" runs on every test card, every
// list, every entry into a live exam - the single most frequent query in the
// app once students are actually using it.
attemptSchema.index({ user: 1, test: 1 });

// Their history, newest first: the analysis screen, the daily goal count and
// the admin's per-student view all read it this way.
attemptSchema.index({ user: 1, createdAt: -1 });

// The live-exam scheduler looks for attempts still open when a window closes.
attemptSchema.index({ status: 1, test: 1 });

module.exports = mongoose.model("Attempt", attemptSchema);
