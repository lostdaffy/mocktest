const mongoose = require("mongoose");

// One row per reminder round that has gone out, e.g. "quiz-live:2026-10-13".
// The unique key is what makes sending idempotent: the server's own timer,
// a restart, and the outside scheduler that wakes the server can all ask for
// the morning reminder, and it still goes out once.
const reminderLogSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    sent: { type: Number, default: 0 },
    // Kept a month, enough to look back at what went out.
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 31 },
  },
  { versionKey: false }
);

module.exports = mongoose.model("ReminderLog", reminderLogSchema);
