const mongoose = require("mongoose");

// One row per calendar day (India time): the Daily GK Quiz every student gets
// that day. It replaces the old per-student "Aaj Ka Test" for the app's daily
// button - same endpoint (GET /api/tests/today), so installed apps pick it up
// without an update.
//
// A quiz goes live on its date if it is "ready". There is no publish job at
// midnight: the date is the switch. This instance sleeps when idle, so a
// timer at 12:00 AM could not be relied on; reading the date on each request
// can.
const dailyQuizSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // "2026-10-13", Asia/Kolkata
    test: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },

    // draft      - being put together or under review; never shown
    // generating - AI questions are being made for it (generation queue)
    // ready      - goes live on its date
    status: { type: String, enum: ["draft", "generating", "ready"], default: "draft", index: true },

    // Where the questions came from: picked from the published bank,
    // freshly made by AI, or put together by hand.
    source: { type: String, enum: ["bank", "ai", "manual"], default: "bank" },
    preparedBy: { type: String, default: "auto" }, // "auto" or the admin's name

    // Why the last attempt to prepare it did not finish, for the panel.
    lastError: String,
  },
  { timestamps: true }
);

const DailyQuiz = mongoose.model("DailyQuiz", dailyQuizSchema);

// One document, key "dailyQuiz". What the scheduler is allowed to do on its
// own. Bank filling uses questions already checked and published; AI filling
// spends the day's allowance, so it is off until the team turns it on.
const dailyQuizSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "dailyQuiz", unique: true },
    // If today has no ready quiz when a student asks for it, build one from
    // the published GK bank on the spot.
    autoFromBank: { type: Boolean, default: true },
    // Queue AI generation for the coming days that have no quiz yet.
    autoAI: { type: Boolean, default: false },
    daysAhead: { type: Number, default: 2, min: 1, max: 7 },
  },
  { timestamps: true }
);

const DailyQuizSettings = mongoose.model("DailyQuizSettings", dailyQuizSettingsSchema);

module.exports = { DailyQuiz, DailyQuizSettings };
