const mongoose = require("mongoose");

// One row per test that still has to be built.
//
// Generation used to be a thing somebody held open in a browser tab: close
// the tab and it stopped, and there was nowhere to look to see what had been
// done, what was left, or why anything had failed. A run of 113 lost its last
// 29 to a spent daily allowance and nobody could tell until the numbers were
// counted by hand afterwards.
//
// So the work is rows in a collection and a worker walks them. The queue
// survives a restart, the panel can show it, and a job that fails says why.
const generationJobSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["practice", "mock"], required: true },

    // What to build. A practice job names a chapter and a level; a mock job
    // names the exam and its pattern decides the rest.
    subject: String,
    chapter: String,
    difficulty: { type: String, enum: ["easy", "medium", "hard", "advanced"] },
    examType: String,

    // What the panel shows, so it never has to reassemble this from parts.
    label: { type: String, required: true },

    status: {
      type: String,
      enum: ["queued", "running", "done", "failed", "cancelled"],
      default: "queued",
      index: true,
    },

    // A job that fails for a reason that might pass next time - the server
    // asleep, a per-minute rate limit - is put back. One that fails because
    // the day's allowance is gone pauses the whole queue instead, because
    // retrying it would only spend the next model's allowance too.
    attempts: { type: Number, default: 0 },
    lastError: String,
    result: String,

    // Groups the jobs enqueued together, so the panel can say "this run".
    batch: { type: String, index: true },

    queuedAt: { type: Date, default: Date.now },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

// The worker's only query: the oldest thing still waiting.
generationJobSchema.index({ status: 1, queuedAt: 1 });

// Looking up "is this already waiting?" - see isAlreadyQueued below.
//
// NOT a unique partial index: MongoDB only allows $eq, $exists, $type,
// $gt/$gte/$lt/$lte and $and inside partialFilterExpression, so the obvious
// { status: { $in: ["queued", "running"] } } is silently not a constraint at
// all, and a second press of "build everything missing" queued all 113 again.
generationJobSchema.index({ kind: 1, subject: 1, chapter: 1, difficulty: 1, examType: 1, status: 1 });

// Whether this exact piece of work is already waiting or under way.
generationJobSchema.statics.isAlreadyQueued = function (job) {
  return this.exists({
    kind: job.kind,
    subject: job.subject ?? null,
    chapter: job.chapter ?? null,
    difficulty: job.difficulty ?? null,
    examType: job.examType ?? null,
    status: { $in: ["queued", "running"] },
  });
};

module.exports = mongoose.model("GenerationJob", generationJobSchema);
