const mongoose = require("mongoose");

// A message the admin sent to many students at once (services/broadcast.js):
// a push notification, and the same message in the app's Notifications
// list for 14 days, so a student whose phone missed the push still sees it.
const broadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 65 },
    body: { type: String, required: true, trim: true, maxlength: 240 },
    // Who it is for: everyone, the students of one exam, or paid / free.
    audience: {
      kind: { type: String, enum: ["all", "exam", "paid", "free"], default: "all" },
      exam: { type: String, trim: true }, // with kind "exam": an examGoals value, e.g. "SSC_CGL"
    },
    // What a tap on it in the app's Notifications list opens.
    screen: { type: String, enum: ["", "HomeTab", "LiveTab", "Subscription", "ExamSeries"], default: "" },

    status: { type: String, enum: ["sending", "done", "failed"], default: "sending", index: true },
    students: { type: Number, default: 0 }, // in the audience when it was sent
    phones: { type: Number, default: 0 }, // of them, with notifications on
    delivered: { type: Number, default: 0 }, // Expo accepted
    failed: { type: Number, default: 0 },
    problems: [{ type: String }], // the first few delivery errors, to say why
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Broadcast", broadcastSchema);
