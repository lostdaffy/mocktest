const Test = require("../models/Test");
const { addManualQuestions } = require("../services/manualQuestions");

// POST /api/exam-series/mock/:testId/manual-questions (admin)
// body: { questions: [...], dryRun? }
//
// A human-made mock: questions a person wrote, added to a mock in the order
// given. The same service fills past papers - see services/manualQuestions.js
// for what is checked, what is only warned about, and what is deliberately
// not done (AI verification, shuffling).
//
// dryRun checks everything and saves nothing, so a whole file can be
// corrected before a single row of it lands in a mock.
async function addManualQuestionsToMock(req, res) {
  // Live exams have their own route and their own rule (draft only) below.
  const test = await Test.findOne({ _id: req.params.testId, type: "full_mock" });
  if (!test) return res.status(404).json({ message: "Mock not found" });
  if (test.publishStatus === "published") {
    // Students may be sitting it. Changing a live paper under them is how a
    // result stops matching the questions it was marked against.
    return res.status(400).json({ message: "This mock is live. Archive it or make a new draft to add questions." });
  }

  try {
    const result = await addManualQuestions(test._id, req.body?.questions, {
      dryRun: !!req.body?.dryRun,
      source: "manual",
    });
    const verb = result.dryRun ? "would be added" : "added";
    const parts = [`${result.dryRun ? result.wouldAdd : result.added} of ${result.checked} ${verb}`];
    if (result.rejected.length) parts.push(`${result.rejected.length} can't be saved`);
    if (result.warned.length) parts.push(`${result.warned.length} worth a second look`);
    res.status(result.dryRun ? 200 : 201).json({ ...result, message: parts.join(", ") + "." });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// POST /api/live-exams/:id/manual-questions (admin)
// body: { questions: [...], dryRun? }
//
// The same thing for a live exam. Only while it is a draft: once scheduled,
// students can see it is coming, and publishing already required a full
// paper, so there is nothing left to add - and a paper must not change
// between the notice and the start.
async function addManualQuestionsToLive(req, res) {
  const test = await Test.findOne({ _id: req.params.id, type: "live" });
  if (!test) return res.status(404).json({ message: "Live exam not found" });
  if (test.publishStatus !== "draft") {
    return res.status(400).json({
      message: "This live exam is already scheduled. Cancel it first if its questions really must change.",
    });
  }
  try {
    const result = await addManualQuestions(test._id, req.body?.questions, {
      dryRun: !!req.body?.dryRun,
      source: "manual",
    });
    const verb = result.dryRun ? "would be added" : "added";
    const parts = [`${result.dryRun ? result.wouldAdd : result.added} of ${result.checked} ${verb}`];
    if (result.rejected.length) parts.push(`${result.rejected.length} can't be saved`);
    if (result.warned.length) parts.push(`${result.warned.length} worth a second look`);
    res.status(result.dryRun ? 200 : 201).json({ ...result, message: parts.join(", ") + "." });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = { addManualQuestionsToMock, addManualQuestionsToLive };
