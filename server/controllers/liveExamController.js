const Test = require("../models/Test");
const Question = require("../models/Question");
const Attempt = require("../models/Attempt");
const ExamPattern = require("../models/ExamPattern");
const { createVerifiedQuestions, qualityNote } = require("../services/questionFactory");
const { liveState } = require("../utils/liveExam");

// Live exams get their OWN question pool, generated directly for the live
// event - never a copy of a Mock Tests series paper. This is deliberate:
// reusing a mock meant that mock had to exist first (built, reviewed,
// published in the Mock series) before it could ever be scheduled live,
// and it entangled two unrelated lifecycles (a mock's regular publish
// state vs. a live event's schedule). Building the paper straight under
// type "live" removes that dependency entirely - an admin creates a live
// exam, fills it with fresh questions, reviews/edits/deletes any of them,
// and schedules it, with nothing borrowed from the Mock Tests pool.

const hasExplicitOffset = (v) => /(Z|[+-]\d{2}:?\d{2})$/.test(v || "");

// A datetime string with no timezone marker is ambiguous - `new Date()`
// would parse it in whatever timezone the server runs in, not the IST the
// admin picked. Reject it here so nothing downstream can reintroduce that
// silent 5.5-hour shift.
function assertExplicitOffset(scheduledAt) {
  if (!hasExplicitOffset(scheduledAt)) {
    const err = new Error(
      "scheduledAt must include an explicit timezone offset (e.g. +05:30 or Z) - a bare local time is ambiguous and will schedule the wrong time."
    );
    err.status = 400;
    throw err;
  }
}

function minQuestionsFor(pattern) {
  if (!pattern?.sections?.length) return 100;
  return pattern.sections.reduce((sum, s) => sum + s.questionCount, 0);
}

// GET /api/live-exams (admin) -> every live exam (draft/published/archived)
async function listLiveExams(req, res) {
  const exams = await Test.find({ type: "live" })
    .sort({ scheduledAt: -1 })
    .lean();

  const withState = exams.map((e) => ({
    ...e,
    questionCount: e.questions?.length || 0,
    questions: undefined,
    liveState: e.publishStatus === "published" ? liveState(e) : null,
  }));

  res.json({ exams: withState });
}

// POST /api/live-exams (admin) { examType, scheduledAt, title? }
// Creates an empty draft live exam. Admin fills it with questions afterwards.
async function createLiveExam(req, res) {
  try {
    const { examType, scheduledAt, title } = req.body;
    if (!examType || !scheduledAt) {
      return res.status(400).json({ message: "Both the exam and a date and time are required" });
    }
    assertExplicitOffset(scheduledAt);

    const pattern = await ExamPattern.findOne({ examType, isActive: true });
    if (!pattern) return res.status(404).json({ message: `No exam pattern found for ${examType}` });

    const lastLive = await Test.findOne({ examStage: examType, type: "live" }).sort({ seriesNumber: -1 });
    const nextNumber = (lastLive?.seriesNumber || 0) + 1;

    const test = await Test.create({
      title: title?.trim() || `${pattern.displayName} - Live Exam #${nextNumber}`,
      type: "live",
      examType,
      examStage: examType,
      seriesNumber: nextNumber,
      questions: [],
      durationMinutes: pattern.durationMinutes,
      marksPerQuestion: pattern.marksPerQuestion,
      negativeMarking: pattern.negativeMarking,
      scheduledAt: new Date(scheduledAt),
      liveStatus: "upcoming",
      publishStatus: "draft",
      createdBy: "admin",
    });

    res.status(201).json({ message: `Live Exam #${nextNumber} created as a draft. Add questions to it next.`, test });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// GET /api/live-exams/:id -> full live exam with questions, for admin review
async function getLiveExamForReview(req, res) {
  const test = await Test.findOne({ _id: req.params.id, type: "live" }).populate("questions");
  if (!test) return res.status(404).json({ message: "Live exam not found" });
  res.json({ test });
}

// GET /api/live-exams/:id/section-status
async function getLiveExamSectionStatus(req, res) {
  const test = await Test.findOne({ _id: req.params.id, type: "live" }).populate("questions", "subject");
  if (!test) return res.status(404).json({ message: "Live exam not found" });

  const pattern = await ExamPattern.findOne({ examType: test.examType });
  if (!pattern) return res.json({ sections: [], totalHave: test.questions.length });

  const sections = pattern.sections.map((s) => {
    const have = test.questions.filter((q) => q.subject === s.subject).length;
    return { subject: s.subject, required: s.questionCount, have, isFull: have >= s.questionCount };
  });

  const totalRequired = minQuestionsFor(pattern);
  res.json({ sections, totalHave: test.questions.length, totalRequired, isComplete: test.questions.length >= totalRequired });
}

// Reuse a handful of real PYQs for this exam+subject as style examples, same
// grounding trick the Mock series generator uses - keeps the live paper in
// the same voice as the actual exam instead of generic AI phrasing.
async function getPyqStyleExamples(examType, subject, limit = 4) {
  if (!subject) return [];
  const docs = await Question.aggregate([
    // examType, not examStage: Question has no examStage field, so Mongoose
    // drops the value the PYQ extractor sets and this matched nothing.
    { $match: { examType, subject, source: "pyq", status: "published" } },
    { $sample: { size: limit } },
  ]);
  return docs.map((q) => q.text);
}

// POST /api/live-exams/:id/add-questions (admin) { subject, count }
async function addQuestionsToLiveExam(req, res) {
  try {
    const { subject } = req.body;
    let { count = 10 } = req.body;
    const test = await Test.findOne({ _id: req.params.id, type: "live" }).populate("questions", "subject");
    if (!test) return res.status(404).json({ message: "Live exam not found" });
    if (test.publishStatus === "published") {
      return res.status(400).json({ message: "A scheduled live exam cannot take new questions. Unschedule it first." });
    }

    const pattern = await ExamPattern.findOne({ examType: test.examType });
    const displayName = pattern?.displayName || test.examType;

    const sectionDef = pattern?.sections?.find((s) => s.subject === subject);
    if (sectionDef) {
      const alreadyInSection = test.questions.filter((q) => q.subject === subject).length;
      const roomLeft = sectionDef.questionCount - alreadyInSection;
      if (roomLeft <= 0) {
        return res.status(400).json({
          message: `The ${subject} section is full (${sectionDef.questionCount}/${sectionDef.questionCount}) - that is how many the real exam has. Choose another section.`,
        });
      }
      count = Math.min(count, roomLeft);
    }

    const batch = Math.min(count, 12); // cap for quality + valid JSON
    const pyqExamples = await getPyqStyleExamples(test.examType, subject);
    // Only verified questions reach a live exam - there is no second chance
    // to fix a bad question once thousands of students are sitting it.
    const built = await createVerifiedQuestions({
      needed: batch,
      tag: { examStage: test.examType },
      generateParams: {
        examType: test.examType,
        examDisplayName: displayName,
        subject: subject || "General",
        topic: subject || "General",
        examMode: true,
        pyqExamples,
        examLevel: pattern?.examLevel,
        syllabusTopics: pattern?.sections?.find((x) => x.subject === subject)?.syllabus || [],
      },
    });
    const newIds = built.ids;

    test.questions.push(...newIds);
    await test.save();

    const sectionNote = sectionDef
      ? ` (${subject}: ${test.questions.filter((q) => (q.subject || q) === subject).length || newIds.length}/${sectionDef.questionCount})`
      : "";
    const groundingNote =
      pyqExamples.length > 0
        ? ` Style-matched against ${pyqExamples.length} real PYQ question(s).`
        : ` No real PYQs found yet for ${subject} - upload some in PYQ Bank for closer style-matching.`;

    res.json({
      message: `${newIds.length} questions added${sectionNote}${qualityNote(built)}. ${test.questions.length} in total.${groundingNote}`,
      added: newIds.length,
      totalCount: test.questions.length,
      groundedInRealPyqs: pyqExamples.length > 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed: " + err.message });
  }
}

// DELETE /api/live-exams/:id/question/:questionId (admin)
// Remove one question from this live exam (and delete it - it was generated
// only for this paper).
async function removeQuestionFromLiveExam(req, res) {
  const { id, questionId } = req.params;
  const test = await Test.findOne({ _id: id, type: "live" });
  if (!test) return res.status(404).json({ message: "Live exam not found" });
  if (test.publishStatus === "published") {
    return res.status(400).json({ message: "Questions cannot be removed from a scheduled live exam. Unschedule it first." });
  }

  test.questions = test.questions.filter((q) => String(q) !== String(questionId));
  await test.save();
  await Question.findByIdAndDelete(questionId);

  res.json({ message: "Question removed", remainingCount: test.questions.length });
}

// PATCH /api/live-exams/:id (admin) { scheduledAt?, title?, durationMinutes? }
// Reschedule or rename - blocked once the exam window has opened, since
// students may already be inside it.
async function updateLiveExam(req, res) {
  const test = await Test.findOne({ _id: req.params.id, type: "live" });
  if (!test) return res.status(404).json({ message: "Live exam not found" });

  if (test.publishStatus === "published" && liveState(test) !== "upcoming") {
    return res.status(400).json({ message: "This live exam has already started or finished - it cannot be rescheduled." });
  }

  const { scheduledAt, title, durationMinutes } = req.body;
  if (scheduledAt !== undefined) {
    assertExplicitOffset(scheduledAt);
    test.scheduledAt = new Date(scheduledAt);
  }
  if (title !== undefined && title.trim()) test.title = title.trim();
  if (durationMinutes !== undefined) test.durationMinutes = durationMinutes;

  await test.save();
  res.json({ message: "Live exam updated", test });
}

// PATCH /api/live-exams/:id/publish (admin) -> schedule it live for students
async function publishLiveExam(req, res) {
  const test = await Test.findOne({ _id: req.params.id, type: "live" });
  if (!test) return res.status(404).json({ message: "Live exam not found" });

  const pattern = await ExamPattern.findOne({ examType: test.examType });
  const MIN_QUESTIONS = minQuestionsFor(pattern);
  if (test.questions.length < MIN_QUESTIONS) {
    return res.status(400).json({
      message: `This live exam cannot be scheduled yet - it has ${test.questions.length} questions and needs at least ${MIN_QUESTIONS}.`,
      currentCount: test.questions.length,
      required: MIN_QUESTIONS,
    });
  }
  if (!test.scheduledAt || test.scheduledAt <= new Date()) {
    return res.status(400).json({ message: "The scheduled date and time must be in the future." });
  }

  test.publishStatus = "published";
  await test.save();

  res.json({ message: "Live exam scheduled - students can see it now", test });
}

// PATCH /api/live-exams/:id/cancel (admin) -> pull a scheduled/draft live
// exam back without deleting it (keeps any attempts already made intact).
async function cancelLiveExam(req, res) {
  const test = await Test.findOne({ _id: req.params.id, type: "live" });
  if (!test) return res.status(404).json({ message: "Live exam not found" });

  if (test.publishStatus === "published" && liveState(test) === "ongoing") {
    return res.status(400).json({ message: "This live exam is running right now - it cannot be cancelled mid-exam." });
  }

  test.publishStatus = "archived";
  await test.save();
  res.json({ message: "Live exam cancelled", test });
}

// DELETE /api/live-exams/:id (admin) -> permanently delete a live exam and
// its questions. Blocked once anyone has attempted it - deleting would
// orphan their attempt/result and break the leaderboard; cancel instead.
async function deleteLiveExam(req, res) {
  const test = await Test.findOne({ _id: req.params.id, type: "live" });
  if (!test) return res.status(404).json({ message: "Live exam not found" });

  const attemptCount = await Attempt.countDocuments({ test: test._id });
  if (attemptCount > 0) {
    return res.status(400).json({
      message: `${attemptCount} student(s) have attempted this live exam, so it cannot be deleted. Cancel it instead.`,
    });
  }

  await Question.deleteMany({ _id: { $in: test.questions } });
  await Test.findByIdAndDelete(test._id);

  res.json({ message: "Live exam aur uske questions delete ho gaye" });
}

// GET /api/live-exams/:id/attempts (admin) -> results + integrity flags for
// a live exam, so a background-app violation (see Attempt.integrityFlags)
// is actually visible to someone, not just silently recorded.
async function getLiveExamAttempts(req, res) {
  const test = await Test.findOne({ _id: req.params.id, type: "live" });
  if (!test) return res.status(404).json({ message: "Live exam not found" });

  const attempts = await Attempt.find({ test: test._id, status: { $ne: "in_progress" } })
    .sort({ score: -1 })
    .populate("user", "name phone")
    .select("user score accuracy rank percentile status integrityFlags submittedAt");

  res.json({
    attempts: attempts.map((a) => ({
      attemptId: a._id,
      name: a.user?.name || "Unknown",
      phone: a.user?.phone || null,
      score: a.score,
      accuracy: a.accuracy,
      rank: a.rank,
      percentile: a.percentile,
      autoSubmitted: a.status === "auto_submitted",
      submittedAt: a.submittedAt,
      backgroundCount: a.integrityFlags?.backgroundCount || 0,
      backgroundSeconds: a.integrityFlags?.backgroundSeconds || 0,
    })),
  });
}

module.exports = {
  listLiveExams,
  createLiveExam,
  getLiveExamForReview,
  getLiveExamSectionStatus,
  addQuestionsToLiveExam,
  removeQuestionFromLiveExam,
  updateLiveExam,
  publishLiveExam,
  cancelLiveExam,
  deleteLiveExam,
  getLiveExamAttempts,
};
