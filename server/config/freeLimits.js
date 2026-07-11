// Central place to tune free-tier limits. Change numbers here only -
// used consistently across mock tests, live exams, PYQs, and the daily
// personalized test trial.
module.exports = {
  FREE_MOCK_TESTS: 5,
  FREE_LIVE_EXAMS: 3,
  FREE_PYQ_PAPERS: 3,
  FREE_TRIAL_DAYS: 7, // "Aaj Ka Test" personalized recommendation is free for this many days after signup
  // Topic-wise practice is intentionally NOT limited here - it stays free
  // forever as the "always something free" hook that keeps the app feeling
  // useful even after other limits are used up.
};