// The only background job in this app - a plain setInterval tick (started
// from server.js) rather than a new cron/queue dependency, since this is
// the sole recurring task the backend needs.
//
// Does two things every tick:
// 1. Finalizes any live-exam Attempt still "in_progress" once that exam's
//    shared window has closed - this is what makes submission actually
//    synchronized: a student doesn't get to keep their editing window open
//    just by not tapping submit or losing connectivity.
// 2. Sends a "starts in 15 minutes" push notification for upcoming live
//    exams, once each.

const Test = require("../models/Test");
const Attempt = require("../models/Attempt");
const User = require("../models/User");
const { finalizeAttempt } = require("../controllers/testController");
const { liveState } = require("../utils/liveExam");
const { sendPushNotifications } = require("../services/pushService");

const REMINDER_WINDOW_MS = 15 * 60 * 1000;

let running = false;

async function autoFinalizeEndedLiveExams() {
  // Scope to tests that actually have a pending attempt - cheap indexed
  // lookup, avoids touching every live exam that ever existed on each tick.
  const testIds = await Attempt.distinct("test", { status: "in_progress" });
  if (testIds.length === 0) return;

  const tests = await Test.find({ _id: { $in: testIds }, type: "live" }).populate("questions");

  for (const test of tests) {
    if (liveState(test) !== "ended") continue;

    const stragglers = await Attempt.find({ test: test._id, status: "in_progress" });
    for (const attempt of stragglers) {
      try {
        const rawAnswers = (attempt.answers || []).map((a) => ({
          questionId: a.question,
          selectedIndex: a.selectedIndex,
          timeTakenSeconds: a.timeTakenSeconds,
          markedForReview: a.markedForReview,
        }));
        await finalizeAttempt(test, attempt.user, rawAnswers, { attemptDoc: attempt, autoSubmitted: true });
      } catch (err) {
        console.error(`liveExamScheduler: auto-finalize failed for attempt ${attempt._id}:`, err.message);
      }
    }
  }
}

async function sendUpcomingReminders() {
  const now = new Date();
  const soon = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const upcoming = await Test.find({
    type: "live",
    publishStatus: "published",
    scheduledAt: { $gt: now, $lte: soon },
    reminderSentAt: { $exists: false },
  }).select("_id title scheduledAt");

  if (upcoming.length === 0) return;

  const users = await User.find({ pushToken: { $exists: true, $ne: null } }).select("pushToken");
  const tokens = users.map((u) => u.pushToken).filter(Boolean);

  for (const test of upcoming) {
    if (tokens.length > 0) {
      await sendPushNotifications(tokens, {
        title: "Live Exam shuru hone wala hai!",
        body: `${test.title} 15 minute mein shuru hoga - taiyaar ho jao.`,
        data: { type: "live_exam_reminder", testId: String(test._id) },
      });
    }
    // Mark sent even if there were zero tokens - otherwise a quiet period
    // with no registered devices would keep retrying this same exam forever.
    test.reminderSentAt = new Date();
    await test.save();
  }
}

async function runLiveExamTick() {
  if (running) return; // don't overlap if a previous tick is still finishing
  running = true;
  try {
    await autoFinalizeEndedLiveExams();
    await sendUpcomingReminders();
  } catch (err) {
    console.error("liveExamScheduler: tick failed:", err.message);
  } finally {
    running = false;
  }
}

module.exports = { runLiveExamTick };
