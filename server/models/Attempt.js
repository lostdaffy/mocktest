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
  },
  { timestamps: true }
);

attemptSchema.index({ test: 1, score: -1 }); // for fast leaderboard queries

module.exports = mongoose.model("Attempt", attemptSchema);
