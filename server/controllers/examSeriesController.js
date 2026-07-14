const Test = require("../models/Test");
const Question = require("../models/Question");
const ExamPattern = require("../models/ExamPattern");
const { generateQuestions } = require("../services/geminiService");
const { runValidationPipeline } = require("../services/validationPipeline");

// GET /api/exam-series/exams -> list all configured exams (for the admin's exam-wise pages)
async function listExams(req, res) {
  const patterns = await ExamPattern.find({ isActive: true }).sort({ displayName: 1 });

  // Attach counts so admin sees at a glance how many published mocks each exam has
  const withCounts = await Promise.all(
    patterns.map(async (p) => {
      const [published, drafts] = await Promise.all([
        Test.countDocuments({ examStage: p.examType, type: "full_mock", publishStatus: "published" }),
        Test.countDocuments({ examStage: p.examType, type: "full_mock", publishStatus: "draft" }),
      ]);
      return {
        examType: p.examType,
        displayName: p.displayName,
        sections: p.sections,
        durationMinutes: p.durationMinutes,
        publishedMocks: published,
        draftMocks: drafts,
      };
    })
  );

  res.json({ exams: withCounts });
}

// GET /api/exam-series/:examStage/mocks?status= -> all mocks for one exam (draft/published/archived)
async function listExamMocks(req, res) {
  const { examStage } = req.params;
  const { status, liveExclusive } = req.query;
  const filter = { examStage, type: "full_mock" };
  if (status) filter.publishStatus = status;
  if (liveExclusive !== undefined) filter.liveExclusive = liveExclusive === "true";

  const mocks = await Test.find(filter).sort({ seriesNumber: -1, createdAt: -1 }).lean();
  // Replace the heavy questions array with just its length for the list view
  const lightMocks = mocks.map((m) => ({
    ...m,
    questions: new Array(m.questions?.length || 0), // keep .length working on client
  }));
  res.json({ mocks: lightMocks });
}

// POST /api/exam-series/:examStage/generate-mock (admin)
// Generates a NEW mock test for a SPECIFIC exam. Questions are generated
// exam-specifically (strict content isolation) and tagged with examStage so
// they never mix with other exams.
async function generateExamMock(req, res) {
  try {
    const { examStage } = req.params;
    const pattern = await ExamPattern.findOne({ examType: examStage, isActive: true });
    if (!pattern) {
      return res.status(404).json({ message: `${examStage} ka exam pattern nahi mila. Pehle pattern banao.` });
    }

    // Create the draft mock UPFRONT and empty, so that even if generation
    // partially fails (rate limits), whatever we generate is saved to a real
    // mock the admin can top up later via "Add Questions".
    const lastMock = await Test.findOne({ examStage, type: "full_mock" }).sort({ seriesNumber: -1 });
    const nextNumber = (lastMock?.seriesNumber || 0) + 1;
    const test = await Test.create({
      title: `${pattern.displayName} - Mock #${nextNumber}`,
      type: "full_mock",
      examType: examStage,
      examStage,
      seriesNumber: nextNumber,
      questions: [],
      durationMinutes: pattern.durationMinutes,
      marksPerQuestion: pattern.marksPerQuestion,
      negativeMarking: pattern.negativeMarking,
      publishStatus: "draft",
      createdBy: "admin",
    });

    const allQuestionIds = [];
    let hadFailure = false;

    // Helper: generate questions in small chunks (max 12 per call for quality &
    // valid JSON), with a short pause between calls so we stay under Gemini's
    // free-tier limit of 15 requests/minute. If a batch fails, we skip it and
    // keep going instead of losing the whole mock.
    async function generateInChunks(section, difficulty, totalCount) {
      const CHUNK = 12;
      let remaining = totalCount;
      while (remaining > 0) {
        const thisBatch = Math.min(CHUNK, remaining);
        try {
          const rawQuestions = await generateQuestions({
            examType: examStage,
            examDisplayName: pattern.displayName,
            subject: section.subject,
            topic: section.subject,
            difficulty,
            count: thisBatch,
          });
          for (const raw of rawQuestions) {
            raw.examStage = examStage;
            const validated = await runValidationPipeline(raw);
            const q = await Question.create(validated);
            allQuestionIds.push(q._id);
          }
          // Save progress to the mock after each successful batch
          test.questions = allQuestionIds;
          await test.save();
        } catch (err) {
          console.log(`Batch fail hua (${section.subject}/${difficulty}): ${err.message}. Skipping, baaki continue.`);
          hadFailure = true;
        }
        remaining -= thisBatch;
        // Pause ~5s between calls -> at most ~12 calls/min, safely under the 15 limit
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    // For each section, generate exam-specific questions fresh, so this mock's
    // content is guaranteed to be for THIS exam only.
    for (const section of pattern.sections) {
      const perDifficulty = {
        easy: Math.round((section.questionCount * (section.difficultyMix?.easy ?? 30)) / 100),
        medium: Math.round((section.questionCount * (section.difficultyMix?.medium ?? 50)) / 100),
        hard: Math.round((section.questionCount * (section.difficultyMix?.hard ?? 20)) / 100),
      };

      for (const [difficulty, count] of Object.entries(perDifficulty)) {
        if (count <= 0) continue;
        await generateInChunks(section, difficulty, count);
      }
    }

    // The mock was already created upfront and saved progressively. Just report.
    const finalCount = test.questions.length;

    if (finalCount === 0) {
      // Nothing generated - clean up the empty mock
      await Test.findByIdAndDelete(test._id);
      return res.status(400).json({
        message: "Koi question generate nahi ho paya (rate limit ya API issue). Thodi der baad try karo.",
      });
    }

    const note = hadFailure
      ? ` (Kuch batches rate limit ki wajah se skip hue — "Add Questions" se baaki pure karo.)`
      : "";

    res.status(201).json({
      message: `Mock #${test.seriesNumber} ban gaya — ${finalCount} questions.${note} Review karke publish karo (100 zaroori).`,
      test: { _id: test._id, title: test.title, questionCount: finalCount },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Generation failed: " + err.message });
  }
}

// GET /api/exam-series/mock/:testId -> full mock with questions+answers for admin review
async function getMockForReview(req, res) {
  const test = await Test.findById(req.params.testId).populate("questions");
  if (!test) return res.status(404).json({ message: "Mock not found" });
  res.json({ test });
}

// PATCH /api/exam-series/mock/:testId/publish (admin) -> make it live to students
async function publishMock(req, res) {
  const { isFree } = req.body;

  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).json({ message: "Mock not found" });

  // Quality gate: a mock must have enough questions before it can go live.
  // This prevents publishing half-baked mocks (e.g. if generation stopped early
  // due to rate limits). Adjust MIN_QUESTIONS if your exam needs fewer/more.
  const MIN_QUESTIONS = 100;
  if (test.questions.length < MIN_QUESTIONS) {
    return res.status(400).json({
      message: `Ye mock abhi live nahi ho sakta — isme sirf ${test.questions.length} questions hain, kam se kam ${MIN_QUESTIONS} chahiye. Aur questions generate karo phir publish karo.`,
      currentCount: test.questions.length,
      required: MIN_QUESTIONS,
    });
  }

  test.publishStatus = "published";
  test.isFree = !!isFree;
  await test.save();

  res.json({ message: "Mock live ho gaya", test });
}

// PATCH /api/exam-series/mock/:testId/archive (admin) -> hide a bad mock from students
async function archiveMock(req, res) {
  const test = await Test.findByIdAndUpdate(req.params.testId, { publishStatus: "archived" }, { new: true });
  if (!test) return res.status(404).json({ message: "Mock not found" });
  res.json({ message: "Mock hide ho gaya", test });
}

// DELETE /api/exam-series/mock/:testId (admin) -> permanently delete a mock and its questions
async function deleteMock(req, res) {
  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).json({ message: "Mock not found" });

  // Delete the mock's questions too (they were generated for this mock only)
  await Question.deleteMany({ _id: { $in: test.questions } });
  await Test.findByIdAndDelete(req.params.testId);

  res.json({ message: "Mock aur uske questions delete ho gaye" });
}

// DELETE /api/exam-series/mock/:testId/question/:questionId (admin)
// Remove a single bad question from a mock (and delete it).
async function removeQuestionFromMock(req, res) {
  const { testId, questionId } = req.params;
  const test = await Test.findById(testId);
  if (!test) return res.status(404).json({ message: "Mock not found" });

  test.questions = test.questions.filter((q) => String(q) !== String(questionId));
  await test.save();
  await Question.findByIdAndDelete(questionId);

  res.json({ message: "Question hata diya", remainingCount: test.questions.length });
}

// ========== SUBJECT-WISE PRACTICE (admin pre-built, adaptive levels) ==========

// GET /api/exam-series/subjects/list -> subjects with per-chapter published practice counts
async function listSubjectsForAdmin(req, res) {
  const Subject = require("../models/Subject");
  const subjects = await Subject.find({ isActive: true }).sort({ displayOrder: 1 });

  const withCounts = await Promise.all(
    subjects.map(async (s) => {
      const chapters = await Promise.all(
        s.chapters.map(async (ch) => {
          const published = await Test.countDocuments({
            type: "practice",
            subject: s.name,
            topic: ch.name,
            publishStatus: "published",
          });
          const drafts = await Test.countDocuments({
            type: "practice",
            subject: s.name,
            topic: ch.name,
            publishStatus: "draft",
          });
          return { name: ch.name, topics: ch.topics, publishedTests: published, draftTests: drafts };
        })
      );
      return { _id: s._id, name: s.name, icon: s.icon, chapters };
    })
  );

  res.json({ subjects: withCounts });
}

// POST /api/exam-series/practice/generate (admin)
// body: { subject, chapter, topics[], difficulty }
// Generates an adaptive-level practice test for a chapter (easy/medium/hard/advanced).
async function generatePracticeTest(req, res) {
  try {
    const { subject, chapter, topics, difficulty = "easy" } = req.body;
    if (!subject || !chapter) return res.status(400).json({ message: "subject aur chapter chahiye" });

    const topicList = topics && topics.length ? topics : [chapter];
    // "advanced" maps to hard-difficulty questions (hardest we generate)
    const genDifficulty = difficulty === "advanced" ? "hard" : difficulty;

    // ONE Gemini call for the whole test (not one per topic) — this keeps us
    // well under the 15 requests/minute free-tier limit. We pass all the
    // chapter's topics into a single prompt so the test still covers them.
    const topicsForPrompt = topicList.join(", ");

    let allQuestionIds = [];
    try {
      const rawQuestions = await generateQuestions({
        examType: "PRACTICE",
        examDisplayName: `${subject} - ${chapter} practice`,
        subject,
        topic: topicsForPrompt, // all topics of the chapter in one call
        difficulty: genDifficulty,
        count: 12, // one batch = one call
      });

      for (const raw of rawQuestions) {
        raw.examStage = "PRACTICE";
        raw.chapter = chapter;
        const validated = await runValidationPipeline(raw);
        const q = await Question.create(validated);
        allQuestionIds.push(q._id);
      }
    } catch (err) {
      console.log(`Practice generation fail (${chapter}/${difficulty}): ${err.message}`);
    }

    if (allQuestionIds.length === 0) {
      return res.status(400).json({
        message: "Koi question generate nahi hua (rate limit ya API issue). 1 minute ruk ke try karo.",
      });
    }

    const lastTest = await Test.findOne({ type: "practice", subject, topic: chapter, difficultyLevel: difficulty }).sort({
      seriesNumber: -1,
    });
    const nextNumber = (lastTest?.seriesNumber || 0) + 1;

    const test = await Test.create({
      title: `${chapter} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} #${nextNumber}`,
      type: "practice",
      examType: "PRACTICE",
      examStage: "PRACTICE",
      subject,
      topic: chapter,
      difficultyLevel: difficulty,
      seriesNumber: nextNumber,
      questions: allQuestionIds,
      durationMinutes: Math.max(10, allQuestionIds.length),
      publishStatus: "draft",
      createdBy: "admin",
    });

    res.status(201).json({
      message: `${chapter} ka ${difficulty} test ban gaya (${allQuestionIds.length} questions). Review karke publish karo.`,
      test: { _id: test._id, title: test.title, questionCount: allQuestionIds.length },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Generation failed: " + err.message });
  }
}

// GET /api/exam-series/practice/:subject/:chapter -> all practice tests for a chapter (admin)
async function listPracticeTests(req, res) {
  const { subject, chapter } = req.params;
  const tests = await Test.find({ type: "practice", subject, topic: chapter })
    .sort({ difficultyLevel: 1, seriesNumber: -1 })
    .select("-questions");
  res.json({ tests });
}

// POST /api/exam-series/mock/:testId/add-questions (admin)
// body: { subject, difficulty, count }
// Adds more questions to an existing draft mock. Lets admin build a mock up to
// 100 questions across multiple sessions instead of all at once (avoids rate limits).
async function addQuestionsToMock(req, res) {
  try {
    const { subject } = req.body;
    let { count = 10 } = req.body;
    const test = await Test.findById(req.params.testId).populate("questions", "subject");
    if (!test) return res.status(404).json({ message: "Mock not found" });
    if (test.publishStatus === "published") {
      return res.status(400).json({ message: "Published mock mein questions add nahi kar sakte. Pehle archive karo." });
    }

    const pattern = await ExamPattern.findOne({ examType: test.examStage });
    const displayName = pattern?.displayName || test.examStage;

    // Enforce the real exam's per-section limit. If SSC Maths has 25 questions,
    // this mock's Maths section can never exceed 25 — keeps the mock true to
    // the actual exam pattern.
    const sectionDef = pattern?.sections?.find((s) => s.subject === subject);
    if (sectionDef) {
      const alreadyInSection = test.questions.filter((q) => q.subject === subject).length;
      const roomLeft = sectionDef.questionCount - alreadyInSection;

      if (roomLeft <= 0) {
        return res.status(400).json({
          message: `${subject} section pura ho chuka hai (${sectionDef.questionCount}/${sectionDef.questionCount}). Asli exam mein bhi itne hi aate hain. Dusra section choose karo.`,
        });
      }

      // Don't generate more than the room left in this section
      count = Math.min(count, roomLeft);
    }

    const batch = Math.min(count, 12); // cap for quality + valid JSON
    const rawQuestions = await generateQuestions({
      examType: test.examStage,
      examDisplayName: displayName,
      subject: subject || "General",
      topic: subject || "General",
      count: batch,
      examMode: true, // real-exam-style questions (mixed difficulty like actual paper)
    });

    const newIds = [];
    for (const raw of rawQuestions) {
      raw.examStage = test.examStage;
      const validated = await runValidationPipeline(raw);
      const q = await Question.create(validated);
      newIds.push(q._id);
    }

    test.questions.push(...newIds);
    await test.save();

    const sectionNote = sectionDef
      ? ` (${subject}: ${test.questions.filter((q) => (q.subject || q) === subject).length || newIds.length}/${sectionDef.questionCount})`
      : "";

    res.json({
      message: `${newIds.length} questions add ho gaye${sectionNote}. Total ${test.questions.length} questions.`,
      added: newIds.length,
      totalCount: test.questions.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed: " + err.message });
  }
}

// POST /api/exam-series/:examStage/create-empty-mock (admin)
// Creates an empty draft mock that admin can then fill with questions gradually.
async function createEmptyMock(req, res) {
  try {
    const { examStage } = req.params;
    const { liveExclusive } = req.body;
    const pattern = await ExamPattern.findOne({ examType: examStage, isActive: true });
    if (!pattern) return res.status(404).json({ message: `${examStage} ka pattern nahi mila` });

    const lastMock = await Test.findOne({ examStage, type: "full_mock" }).sort({ seriesNumber: -1 });
    const nextNumber = (lastMock?.seriesNumber || 0) + 1;

    const test = await Test.create({
      title: `${pattern.displayName} - ${liveExclusive ? "Live Exam" : "Mock"} #${nextNumber}`,
      type: "full_mock",
      examType: examStage,
      examStage,
      seriesNumber: nextNumber,
      questions: [],
      durationMinutes: pattern.durationMinutes,
      marksPerQuestion: pattern.marksPerQuestion,
      negativeMarking: pattern.negativeMarking,
      publishStatus: "draft",
      liveExclusive: !!liveExclusive,
      createdBy: "admin",
    });

    res.status(201).json({ message: `Khali Mock #${nextNumber} ban gaya. Ab questions add karo.`, test });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/exam-series/:examStage/sections -> the real exam's sections (from pattern)
// so admin picks from actual exam sections instead of typing subject names.
async function getExamSections(req, res) {
  const { examStage } = req.params;
  const pattern = await ExamPattern.findOne({ examType: examStage, isActive: true });
  if (!pattern) return res.status(404).json({ message: "Is exam ka pattern nahi mila" });

  res.json({
    examStage,
    displayName: pattern.displayName,
    durationMinutes: pattern.durationMinutes,
    sections: pattern.sections.map((s) => ({
      subject: s.subject,
      questionCount: s.questionCount,
    })),
  });
}

// GET /api/exam-series/mock/:testId/section-status -> per-section progress
// (how many questions in each section vs how many the real exam needs)
async function getMockSectionStatus(req, res) {
  const test = await Test.findById(req.params.testId).populate("questions", "subject");
  if (!test) return res.status(404).json({ message: "Mock not found" });

  const pattern = await ExamPattern.findOne({ examType: test.examStage });
  if (!pattern) return res.json({ sections: [], totalHave: test.questions.length });

  const sections = pattern.sections.map((s) => {
    const have = test.questions.filter((q) => q.subject === s.subject).length;
    return {
      subject: s.subject,
      required: s.questionCount,
      have,
      isFull: have >= s.questionCount,
    };
  });

  const totalRequired = pattern.sections.reduce((sum, s) => sum + s.questionCount, 0);

  res.json({
    sections,
    totalHave: test.questions.length,
    totalRequired,
    isComplete: test.questions.length >= totalRequired,
  });
}

// PATCH /api/exam-series/practice/:testId/publish (admin)
// Publishes a practice test. No 100-question rule (practice tests are short).
async function publishPracticeTest(req, res) {
  const { isFree } = req.body;
  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).json({ message: "Practice test not found" });

  const MIN = 5;
  if (test.questions.length < MIN) {
    return res.status(400).json({
      message: `Kam se kam ${MIN} questions chahiye publish ke liye. Abhi ${test.questions.length} hain.`,
    });
  }

  test.publishStatus = "published";
  test.isFree = !!isFree;
  await test.save();
  res.json({ message: "Practice test live ho gaya", test });
}

module.exports = {
  listExams,
  listExamMocks,
  generateExamMock,
  getMockForReview,
  publishMock,
  archiveMock,
  deleteMock,
  removeQuestionFromMock,
  listSubjectsForAdmin,
  generatePracticeTest,
  listPracticeTests,
  addQuestionsToMock,
  createEmptyMock,
  getExamSections,
  getMockSectionStatus,
  publishPracticeTest,
};