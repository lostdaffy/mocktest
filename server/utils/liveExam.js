// Shared live-exam timing rules, used by both the exam and test controllers
// so the window is computed identically everywhere (a mismatch here would
// mean a student could be told "you may enter" by one endpoint and "too
// early" by another).
//
// The model: a live exam runs on wall-clock time, exactly like a real exam
// centre. It opens at scheduledAt and closes at scheduledAt + duration -
// the SAME moment for every student. A student who joins late doesn't get
// extra time; their timer is what's left of the shared window. That's what
// makes the resulting rank comparable across everyone.

// How long after the window closes the exam still stays visible in the
// app (so students can find their result/rank right after it ends).
const POST_EXAM_VISIBLE_DAYS = 7;

function liveWindow(test) {
  const startsAt = new Date(test.scheduledAt);
  const endsAt = new Date(
    startsAt.getTime() + (test.durationMinutes || 60) * 60 * 1000
  );
  return { startsAt, endsAt };
}

// "upcoming" -> hasn't opened yet, entry blocked
// "ongoing"  -> open right now, entry allowed
// "ended"    -> closed, entry blocked, results/rank released
function liveState(test, now = new Date()) {
  const { startsAt, endsAt } = liveWindow(test);
  if (now < startsAt) return "upcoming";
  if (now <= endsAt) return "ongoing";
  return "ended";
}

// Seconds a student joining right now would actually get. Never more than
// what's left of the shared window - this is the number the client should
// run its timer on for a live exam, NOT the test's full duration.
function secondsRemaining(test, now = new Date()) {
  const { endsAt } = liveWindow(test);
  return Math.max(0, Math.floor((endsAt - now) / 1000));
}

module.exports = {
  POST_EXAM_VISIBLE_DAYS,
  liveWindow,
  liveState,
  secondsRemaining,
};