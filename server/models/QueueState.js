const mongoose = require("mongoose");

// Whether the generation worker is allowed to pick up work, and why not.
//
// A single document. It lives in the database rather than in a variable so a
// pause survives a restart - Render restarts this service on every deploy and
// whenever the free instance wakes up, and a queue that quietly resumed after
// being paused for a spent allowance would spend the next day's too.
const queueStateSchema = new mongoose.Schema(
  {
    key: { type: String, default: "generation", unique: true },
    paused: { type: Boolean, default: false },

    // Set when the worker pauses itself, so the panel can say what happened
    // instead of just showing a stopped queue.
    pausedReason: String,
    pausedAt: Date,

    // Who stopped it: the admin, or the worker running out of allowance.
    pausedBy: { type: String, enum: ["admin", "worker"], default: "admin" },
    // Set when the worker stopped because the day's AI allowance ran out:
    // the earliest a Resume will do anything. Shown on the panel so nobody
    // presses it at 11:49 and watches it stop again. The queue does NOT start
    // itself at this time - the team resumes it.
    resumableAfter: Date,
  },
  { timestamps: true }
);

// Always the same single row.
queueStateSchema.statics.get = async function () {
  return this.findOneAndUpdate(
    { key: "generation" },
    { $setOnInsert: { key: "generation", paused: false } },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model("QueueState", queueStateSchema);
