const Test = require("../models/Test");
const Question = require("../models/Question");
const ExamPattern = require("../models/ExamPattern");
const { extractQuestionsFromPDF } = require("../services/geminiService");
const { addManualQuestions } = require("../services/manualQuestions");
const { sectionRulesFrom } = require("../utils/marking");

// POST /api/pyq/upload (admin only)
// body: { examStage, subject, year, shift, examDate, language, pdfBase64 }
// Uploads a REAL previous-year paper PDF, extracts its actual questions
// (not AI-authored ones), and saves them as a draft PYQ paper for review.
async function uploadPyqPdf(req, res) {
  try {
    const { examStage, subject, year, shift, examDate, language, pdfBase64 } = req.body;
    if (!examStage || !year || !pdfBase64) {
      return res.status(400).json({ message: "examStage, year, and pdfBase64 are required" });
    }

    const pattern = await ExamPattern.findOne({ examType: examStage, isActive: true });
    if (!pattern) {
      return res.status(404).json({ message: `No exam pattern found for ${examStage}. Create the pattern first.` });
    }

    const extracted = await extractQuestionsFromPDF({
      pdfBase64,
      examType: examStage,
      examDisplayName: pattern.displayName,
      subject,
      language: language || "bilingual", // tells the extractor whether to expect one language or paired EN+HI
    });

    if (extracted.length === 0) {
      return res.status(400).json({
        message: "No questions could be read from this PDF. Check that it is legible, or try a text-based PDF.",
      });
    }

    const validQuestions = extracted.filter((q) => q.text && q.options.every((o) => o));
    const questionDocs = await Question.insertMany(validQuestions);
    const missingAnswer = questionDocs.filter((q) => q.correctIndex === null || q.correctIndex === undefined).length;
    const mismatchCount = questionDocs.filter((q) => q.aiConfidenceScore === 0.3).length;

    const dateLabel = examDate ? new Date(examDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : year;

    const test = await Test.create({
      title: `${pattern.displayName} PYQ - ${dateLabel}${shift ? ` (${shift})` : ""}`,
      type: "pyq",
      examType: examStage,
      examStage,
      subject: subject || undefined,
      pyqYear: Number(year),
      pyqShift: shift || undefined,
      examDate: examDate || undefined,
      pyqLanguage: language || "bilingual",
      questions: questionDocs.map((q) => q._id),
      // A whole paper runs to the real exam's clock and marking; a single
      // subject's questions keep the rough per-question allowance.
      durationMinutes: subject ? Math.max(30, Math.round(questionDocs.length * 0.9)) : pattern.durationMinutes,
      marksPerQuestion: pattern.marksPerQuestion,
      negativeMarking: pattern.negativeMarking,
      sectionRules: sectionRulesFrom(pattern),
      publishStatus: "draft",
      createdBy: "admin",
    });

    const parts = [`${questionDocs.length} questions extract hue.`];
    if (missingAnswer > 0) parts.push(`${missingAnswer} have no answer key in the paper.`);
    if (mismatchCount > 0) parts.push(`${mismatchCount} where the paper's answer and the independent solve disagree.`);
    if (missingAnswer === 0 && mismatchCount === 0) parts.push("All verified - give them a look and publish.");

    res.status(201).json({
      message: parts.join(" "),
      test,
      stats: { total: questionDocs.length, missingAnswer, mismatchCount, skipped: extracted.length - validQuestions.length },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// GET /api/pyq/:examStage (admin) -> all PYQ papers for one exam
async function listPyqPapers(req, res) {
  const { examStage } = req.params;
  const papers = await Test.find({ examStage, type: "pyq" })
    .sort({ pyqYear: -1, createdAt: -1 })
    .lean();
  const light = papers.map((p) => ({ ...p, questions: new Array(p.questions?.length || 0) }));
  res.json({ papers: light });
}

// GET /api/pyq/paper/:testId (admin) -> full paper with unmasked questions, for review
async function getPyqForReview(req, res) {
  const test = await Test.findById(req.params.testId).populate("questions");
  if (!test) return res.status(404).json({ message: "Paper not found" });
  res.json({ test });
}

// PATCH /api/pyq/question/:questionId (admin) -> fix an extraction error or fill in a missing answer
async function updatePyqQuestion(req, res) {
  const { text, textHi, options, optionsHi, correctIndex, solution, solutionHi, subject } = req.body;
  const update = {};
  if (text !== undefined) update.text = text;
  if (textHi !== undefined) update.textHi = textHi;
  if (options !== undefined) update.options = options;
  if (optionsHi !== undefined) update.optionsHi = optionsHi;
  if (subject !== undefined) update.subject = subject;
  if (solution !== undefined) update.solution = solution;
  if (solutionHi !== undefined) update.solutionHi = solutionHi;

  // Admin confirming/changing the answer settles it - clear the AI's
  // uncertainty flag so it stops showing up as "needs attention".
  if (correctIndex !== undefined) {
    update.correctIndex = correctIndex;
    update.aiConfidenceScore = 1;
    update.flagReason = undefined;
    update.suggestedIndex = undefined;
  }

  const question = await Question.findByIdAndUpdate(req.params.questionId, update, { new: true, runValidators: true });
  if (!question) return res.status(404).json({ message: "Question not found" });
  res.json({ message: "Question updated", question });
}

// DELETE /api/pyq/paper/:testId/question/:questionId (admin) -> drop a bad extraction
async function removePyqQuestion(req, res) {
  const { testId, questionId } = req.params;
  const test = await Test.findById(testId);
  if (!test) return res.status(404).json({ message: "Paper not found" });

  test.questions = test.questions.filter((q) => String(q) !== String(questionId));
  await test.save();
  await Question.findByIdAndDelete(questionId);

  res.json({ message: "Question removed", remainingCount: test.questions.length });
}

// PATCH /api/pyq/paper/:testId/publish (admin)
// Blocks publish until every remaining question has a real correct answer -
// a real PYQ paper with unanswerable questions helps nobody.
async function publishPyqPaper(req, res) {
  const test = await Test.findById(req.params.testId).populate("questions");
  if (!test) return res.status(404).json({ message: "Paper not found" });

  const unanswered = test.questions.filter((q) => q.correctIndex === null || q.correctIndex === undefined);
  if (unanswered.length > 0) {
    return res.status(400).json({
      message: `${unanswered.length} question(s) still have no answer key. Fill them in under Review, then publish.`,
      unansweredCount: unanswered.length,
    });
  }
  if (test.questions.length === 0) {
    return res.status(400).json({ message: "No questions are left in this paper" });
  }

  await Question.updateMany({ _id: { $in: test.questions.map((q) => q._id) } }, { status: "published" });
  test.publishStatus = "published";
  await test.save();

  res.json({ message: "Paper published - students can see it now", test });
}

// PATCH /api/pyq/paper/:testId/archive (admin) -> hide from students without deleting
async function archivePyqPaper(req, res) {
  const test = await Test.findByIdAndUpdate(req.params.testId, { publishStatus: "archived" }, { new: true });
  if (!test) return res.status(404).json({ message: "Paper not found" });
  res.json({ message: "Paper hidden", test });
}

// DELETE /api/pyq/paper/:testId (admin) -> permanently delete a paper and its questions
async function deletePyqPaper(req, res) {
  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).json({ message: "Paper not found" });

  await Question.deleteMany({ _id: { $in: test.questions } });
  await Test.findByIdAndDelete(req.params.testId);

  res.json({ message: "Paper deleted" });
}

// POST /api/pyq/paper (admin) { examStage, year, shift?, examDate?, language?, title? }
//
// Starts an empty past paper to be filled by hand, for papers that exist only
// on paper or as a scan the extractor cannot read. Timed and marked like the
// real exam, from its pattern - a past paper is only practice if it is sat
// the way it was set.
async function createPyqPaper(req, res) {
  const { examStage, year, shift, examDate, language, title } = req.body || {};
  if (!examStage || !year) return res.status(400).json({ message: "The exam and the year are both required" });
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1990 || y > new Date().getFullYear()) {
    return res.status(400).json({ message: "That year does not look right" });
  }

  const pattern = await ExamPattern.findOne({ examType: examStage });
  if (!pattern) return res.status(404).json({ message: `No exam pattern found for ${examStage}` });

  const dateLabel = examDate ? new Date(examDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : String(y);
  const test = await Test.create({
    title: (title || "").trim() || `${pattern.displayName} PYQ - ${dateLabel}${shift ? ` (${shift})` : ""}`,
    type: "pyq",
    examType: examStage,
    examStage,
    pyqYear: y,
    pyqShift: shift || undefined,
    examDate: examDate || undefined,
    pyqLanguage: language || "bilingual",
    questions: [],
    durationMinutes: pattern.durationMinutes,
    marksPerQuestion: pattern.marksPerQuestion,
    negativeMarking: pattern.negativeMarking,
    sectionRules: sectionRulesFrom(pattern),
    publishStatus: "draft",
    createdBy: "admin",
  });

  res.status(201).json({ message: "Paper started as a draft. Add its questions next.", test });
}

// POST /api/pyq/paper/:testId/manual-questions (admin) { questions: [...], dryRun? }
//
// Questions typed or pasted into a past paper, in the paper's own order.
// dryRun checks them and saves nothing, so a 100-row file can be corrected
// before any of it lands.
async function addManualQuestionsToPyq(req, res) {
  const test = await Test.findOne({ _id: req.params.testId, type: "pyq" });
  if (!test) return res.status(404).json({ message: "Past paper not found" });
  try {
    const result = await addManualQuestions(test._id, req.body?.questions, { dryRun: !!req.body?.dryRun, source: "pyq" });
    res.status(result.dryRun ? 200 : 201).json({ ...result, message: summarise(result) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

function summarise(r) {
  const verb = r.dryRun ? "would be added" : "added";
  const parts = [`${r.dryRun ? r.wouldAdd : r.added} of ${r.checked} ${verb}`];
  if (r.rejected.length) parts.push(`${r.rejected.length} can't be saved`);
  if (r.warned.length) parts.push(`${r.warned.length} worth a second look`);
  return parts.join(", ") + ".";
}

module.exports = {
  createPyqPaper,
  addManualQuestionsToPyq,
  uploadPyqPdf,
  listPyqPapers,
  getPyqForReview,
  updatePyqQuestion,
  removePyqQuestion,
  publishPyqPaper,
  archivePyqPaper,
  deletePyqPaper,
};