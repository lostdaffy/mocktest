const Test = require("../models/Test");
const Question = require("../models/Question");
const ExamPattern = require("../models/ExamPattern");
const Subject = require("../models/Subject");
const { createVerifiedQuestions, qualityNote } = require("../services/questionFactory");

// How much of every mock is made of REAL previous-year questions. The rest
// is generated fresh. If the PYQ Bank doesn't have enough for a subject,
// the shortfall is simply generated too - the mock is never left short.
const PYQ_MIX_PERCENT = 50;

// Pause between Gemini calls, to stay under the free tier's 15 requests/min.
// Overridable only so the test harness (which stubs Gemini out entirely)
// doesn't have to sit through the waits.
const GEMINI_PAUSE_MS = Number(process.env.GEMINI_PAUSE_MS) || 5000;

// Feeds a long syllabus to the model in rotating slices. Each batch is a
// separate call with no memory of the previous one, so handing it all 40
// topics every time just makes it keep picking the same familiar few.
function syllabusSlice(topics, offset, size = 8) {
  if (!topics || topics.length === 0) return [];
  if (topics.length <= size) return topics;
  const out = [];
  for (let i = 0; i < size; i++) out.push(topics[(offset + i) % topics.length]);
  return out;
}

// Picks real previous-year questions for one section of a mock.
//
// Only questions from a PYQ paper the admin has already PUBLISHED are
// eligible: publishing is what marks them reviewed and answer-keyed
// (see publishPyqPaper), so nothing unchecked can slip into a mock.
// Questions already used by another mock of the same exam are avoided
// first, so two mocks don't end up looking like the same paper; they're
// only reused if the bank can't supply enough fresh ones.
async function pickPyqQuestions(examStage, subject, wanted, excludeIds = []) {
  if (wanted <= 0) return [];

  const base = {
    source: "pyq",
    // NOT examStage: the Question schema has no such field, so the value the
    // PYQ extractor sets is dropped by Mongoose and only examType survives.
    // examType is an array, and Mongo matches a plain string against it.
    examType: examStage,
    subject,
    status: "published",
    correctIndex: { $ne: null },
  };

  const sample = async (exclude, size) => {
    if (size <= 0) return [];
    const rows = await Question.aggregate([
      { $match: { ...base, _id: { $nin: exclude } } },
      { $sample: { size } },
      { $project: { _id: 1 } },
    ]);
    return rows.map((r) => r._id);
  };

  const usedInOtherMocks = await Test.distinct("questions", { type: "full_mock", examStage });
  const picked = await sample([...excludeIds, ...usedInOtherMocks], wanted);

  if (picked.length < wanted) {
    const more = await sample([...excludeIds, ...picked], wanted - picked.length);
    picked.push(...more);
  }

  return picked;
}

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
  const { status } = req.query;
  const filter = { examStage, type: "full_mock" };
  if (status) filter.publishStatus = status;

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
      return res.status(404).json({ message: `No exam pattern found for ${examStage}. Create the pattern first.` });
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
    let flaggedTotal = 0;
    const syllabusOffsets = new Map(); // per subject, so each batch moves along the syllabus

    // Helper: generate questions in small chunks (max 12 per call for quality &
    // valid JSON), with a short pause between calls so we stay under Gemini's
    // free-tier limit of 15 requests/minute. If a batch fails, we skip it and
    // keep going instead of losing the whole mock.
    async function generateInChunks(section, difficulty, totalCount) {
      const CHUNK = 12;
      let remaining = totalCount;
      while (remaining > 0) {
        const thisBatch = Math.min(CHUNK, remaining);
        const offset = syllabusOffsets.get(section.subject) || 0;
        const topics = syllabusSlice(section.syllabus, offset);
        syllabusOffsets.set(section.subject, offset + (topics.length || 1));
        try {
          // Only questions that pass the rule checks AND the AI's own
          // re-solve come back here. Anything doubtful is saved to the
          // review queue instead of being put in front of a student.
          const built = await createVerifiedQuestions({
            needed: thisBatch,
            tag: { examStage },
            generateParams: {
              examType: examStage,
              examDisplayName: pattern.displayName,
              subject: section.subject,
              topic: section.subject,
              difficulty,
              examLevel: pattern.examLevel,
              syllabusTopics: topics,
            },
          });
          flaggedTotal += built.flagged + built.duplicates;
          allQuestionIds.push(...built.ids);
          // Save progress to the mock after each successful batch
          test.questions = allQuestionIds;
          await test.save();
        } catch (err) {
          console.log(`Batch fail hua (${section.subject}/${difficulty}): ${err.message}. Skipping, baaki continue.`);
          hadFailure = true;
        }
        remaining -= thisBatch;
        // Pause ~5s between calls -> at most ~12 calls/min, safely under the 15 limit
        await new Promise((r) => setTimeout(r, GEMINI_PAUSE_MS));
      }
    }

    // Each section is half REAL previous-year questions and half freshly
    // generated ones, so a mock feels like the actual paper instead of an
    // entirely invented one. The PYQ half comes from papers the admin has
    // already reviewed and published in the PYQ Bank - that feature itself
    // is untouched, these questions are only referenced here as well.
    let pyqUsed = 0;

    for (const section of pattern.sections) {
      const sectionStart = allQuestionIds.length;

      const pyqWanted = Math.round((section.questionCount * PYQ_MIX_PERCENT) / 100);
      const pyqIds = await pickPyqQuestions(examStage, section.subject, pyqWanted, allQuestionIds);
      if (pyqIds.length > 0) {
        allQuestionIds.push(...pyqIds);
        pyqUsed += pyqIds.length;
        test.questions = allQuestionIds;
        await test.save();
      }

      // Whatever the PYQ bank couldn't supply is generated instead, so a
      // thin bank just means a more AI-heavy mock, never a short one.
      const aiNeeded = Math.max(0, section.questionCount - pyqIds.length);
      const easy = Math.round((aiNeeded * (section.difficultyMix?.easy ?? 30)) / 100);
      const medium = Math.round((aiNeeded * (section.difficultyMix?.medium ?? 50)) / 100);
      const perDifficulty = {
        easy,
        medium,
        hard: Math.max(0, aiNeeded - easy - medium), // takes the rounding, so the section lands on its exact count
      };

      for (const [difficulty, count] of Object.entries(perDifficulty)) {
        if (count <= 0) continue;
        await generateInChunks(section, difficulty, count);
      }

      // Shuffle within the section, otherwise every real question sits at
      // the top of its subject and the mock reads in two obvious halves.
      const sectionIds = allQuestionIds.slice(sectionStart);
      for (let i = sectionIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sectionIds[i], sectionIds[j]] = [sectionIds[j], sectionIds[i]];
      }
      allQuestionIds.splice(sectionStart, sectionIds.length, ...sectionIds);
      test.questions = allQuestionIds;
      await test.save();
    }

    // The mock was already created upfront and saved progressively. Just report.
    const finalCount = test.questions.length;

    if (finalCount === 0) {
      // Nothing generated - clean up the empty mock
      await Test.findByIdAndDelete(test._id);
      return res.status(400).json({
        message: "No questions could be generated (rate limit or API issue). Try again in a minute.",
      });
    }

    const note =
      (hadFailure ? ` (Kuch batches rate limit ki wajah se skip hue — "Add Questions" se baaki pure karo.)` : "") +
      (flaggedTotal ? ` (${flaggedTotal} question jaanch mein fail ya repeat nikle - review queue mein hain, mock mein nahi.)` : "");

    res.status(201).json({
      message: `Mock #${test.seriesNumber} created — ${finalCount} questions (${pyqUsed} from past papers, ${finalCount - pyqUsed} new).${note} Review and publish (100 required).`,
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
      message: `This mock cannot go live yet — it has ${test.questions.length} questions and needs at least ${MIN_QUESTIONS}. Generate more, then publish.`,
      currentCount: test.questions.length,
      required: MIN_QUESTIONS,
    });
  }

  test.publishStatus = "published";
  test.isFree = !!isFree;
  await test.save();

  res.json({ message: "Mock is live", test });
}

// PATCH /api/exam-series/mock/:testId/archive (admin) -> hide a bad mock from students
async function archiveMock(req, res) {
  const test = await Test.findByIdAndUpdate(req.params.testId, { publishStatus: "archived" }, { new: true });
  if (!test) return res.status(404).json({ message: "Mock not found" });
  res.json({ message: "Mock hidden", test });
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
  const subjects = await Subject.find({ isActive: true }).sort({ displayOrder: 1 }).lean();

  // ONE aggregation for the whole screen. This used to run two
  // countDocuments per chapter - with 10 subjects of 20 chapters that was
  // 400 separate queries on every page load, and it got slower as chapters
  // were added. Now it's a single grouped count, and the per-level split
  // comes along for free so the UI can show Easy/Medium/Hard/Advanced
  // counts without asking again.
  const counts = await Test.aggregate([
    { $match: { type: "practice", publishStatus: { $in: ["published", "draft"] } } },
    {
      $group: {
        _id: { subject: "$subject", topic: "$topic", level: "$difficultyLevel", status: "$publishStatus" },
        n: { $sum: 1 },
      },
    },
  ]);

  const emptyLevels = () => ({
    easy: { published: 0, draft: 0 },
    medium: { published: 0, draft: 0 },
    hard: { published: 0, draft: 0 },
    advanced: { published: 0, draft: 0 },
  });

  const byChapter = new Map();
  for (const row of counts) {
    const key = `${row._id.subject} ${row._id.topic}`;
    if (!byChapter.has(key)) byChapter.set(key, { published: 0, draft: 0, levels: emptyLevels() });
    const entry = byChapter.get(key);
    const status = row._id.status === "published" ? "published" : "draft";
    entry[status] += row.n;
    if (entry.levels[row._id.level]) entry.levels[row._id.level][status] += row.n;
  }

  const withCounts = subjects.map((s) => ({
    _id: s._id,
    name: s.name,
    icon: s.icon,
    chapters: (s.chapters || []).map((ch) => {
      const entry = byChapter.get(`${s.name} ${ch.name}`);
      return {
        name: ch.name,
        topics: ch.topics,
        publishedTests: entry?.published || 0,
        draftTests: entry?.draft || 0,
        levels: entry?.levels || emptyLevels(),
      };
    }),
  }));

  res.json({ subjects: withCounts });
}

// POST /api/exam-series/practice/generate (admin)
// body: { subject, chapter, topics[], difficulty }
// Generates an adaptive-level practice test for a chapter (easy/medium/hard/advanced).
async function generatePracticeTest(req, res) {
  try {
    const { subject, chapter, topics, difficulty = "easy" } = req.body;
    if (!subject || !chapter) return res.status(400).json({ message: "subject and chapter are required" });

    const topicList = topics && topics.length ? topics : [chapter];
    // "advanced" maps to hard-difficulty questions (hardest we generate)
    const genDifficulty = difficulty === "advanced" ? "hard" : difficulty;

    // Which exams do these questions belong to?
    //
    // They used to be tagged examType: ["PRACTICE"], which is not an exam.
    // Nothing ever matched it, so a question generated here could never be
    // preferred for an SSC student, never be picked for an SSC mock, and
    // only ever arrive through the shared-bank fallback. The whole point of
    // one bank serving nine exams was being thrown away at the moment of
    // writing each question.
    //
    // The catalog already knows: it is the chapter's own exam tags. One
    // Percentage question, generated once, now counts for every exam that
    // asks for Percentage.
    const subjectDoc = await Subject.findOne({
      $or: [{ name: subject }, { aliases: subject }],
    }).lean();
    const chapterDoc = (subjectDoc?.chapters || []).find((c) => c.name === chapter);

    let examTags = chapterDoc?.exams?.length ? chapterDoc.exams : null;
    if (!examTags) {
      // Chapter not in the catalog, or not tagged to any exam yet. An
      // untagged chapter is shown to every exam, so its questions belong to
      // every exam too - same rule, applied in the one other place it matters.
      const active = await ExamPattern.find({ isActive: true }).select(`examType`).lean();
      examTags = active.map((e) => e.examType);
    }

    // ONE Gemini call for the whole test (not one per topic) — this keeps us
    // well under the 15 requests/minute free-tier limit. We pass all the
    // chapter's topics into a single prompt so the test still covers them.
    const topicsForPrompt = topicList.join(", ");

    let allQuestionIds = [];
    let quality = { flagged: 0, duplicates: 0 };
    try {
      const built = await createVerifiedQuestions({
        needed: 12,
        // examType here OVERRIDES what the generator stamped on each
        // question - tags are applied after generation. examStage is gone:
        // the Question schema has no such field, so it was being dropped
        // silently and only looked like it was doing something.
        tag: { chapter, examType: examTags },
        generateParams: {
          examType: "PRACTICE",
          // Tell the model who this is for, so a chapter shared by SSC CGL
          // and Agniveer is not written at graduate level by default.
          examDisplayName: `${subject} - ${chapter}, for ${examTags.join(", ")}`,
          subject,
          topic: topicsForPrompt, // all topics of the chapter in one call
          difficulty: genDifficulty,
          syllabusTopics: topicList, // the chapter's topics ARE its syllabus
        },
      });

      quality = built;
      allQuestionIds.push(...built.ids);
    } catch (err) {
      console.log(`Practice generation fail (${chapter}/${difficulty}): ${err.message}`);
    }

    if (allQuestionIds.length === 0) {
      return res.status(400).json({
        message: "No questions were generated (rate limit or API issue). Wait a minute and try again.",
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
      message: `${chapter} ${difficulty} test created — ${allQuestionIds.length} questions${qualityNote(quality)}. Review and publish.`,
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

  // Sorting on difficultyLevel sorted it ALPHABETICALLY - advanced, easy,
  // hard, medium - which is why the list looked shuffled. levelOrder sorts
  // it the way the levels actually progress. questionCount is computed in
  // the database so the (large) questions array never leaves it.
  const tests = await Test.aggregate([
    { $match: { type: "practice", subject, topic: chapter } },
    {
      $addFields: {
        questionCount: { $size: { $ifNull: ["$questions", []] } },
        levelOrder: {
          $switch: {
            branches: [
              { case: { $eq: ["$difficultyLevel", "easy"] }, then: 0 },
              { case: { $eq: ["$difficultyLevel", "medium"] }, then: 1 },
              { case: { $eq: ["$difficultyLevel", "hard"] }, then: 2 },
              { case: { $eq: ["$difficultyLevel", "advanced"] }, then: 3 },
            ],
            default: 4,
          },
        },
      },
    },
    { $project: { questions: 0 } },
    { $sort: { levelOrder: 1, seriesNumber: -1, createdAt: -1 } },
  ]);

  res.json({ tests });
}

// POST /api/exam-series/mock/:testId/add-questions (admin)
// body: { subject, difficulty, count }
// Pulls a few REAL (source: "pyq") questions for this exam+subject to use as
// few-shot style examples. This runs before EVERY batch of a mock (not just
// once), so the whole 100-question paper stays grounded in genuine exam
// style - not just a token handful of questions out of the full set.
// Returns [] gracefully if the PYQ bank has nothing for this subject yet -
// generation just proceeds without grounding, same as before.
async function getPyqStyleExamples(examStage, subject, limit = 4) {
  if (!subject) return [];
  // Matches on examType, not examStage: Question has no examStage field, so
  // the value the PYQ extractor sets never actually reaches the database.
  // Matching on it meant this silently returned nothing and every batch was
  // generated ungrounded.
  const docs = await Question.aggregate([
    { $match: { examType: examStage, subject, source: "pyq", status: "published" } },
    { $sample: { size: limit } },
  ]);
  return docs.map((q) => q.text);
}


async function addQuestionsToMock(req, res) {
  try {
    const { subject } = req.body;
    let { count = 10 } = req.body;
    const test = await Test.findById(req.params.testId).populate("questions", "subject");
    if (!test) return res.status(404).json({ message: "Mock not found" });
    if (test.publishStatus === "published") {
      return res.status(400).json({ message: "Cannot add questions to a published mock. Archive it first." });
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
          message: `The ${subject} section is already full (${sectionDef.questionCount}/${sectionDef.questionCount}) — that is how many the real exam asks. Choose another section.`,
        });
      }

      // Don't generate more than the room left in this section
      count = Math.min(count, roomLeft);
    }

    const batch = Math.min(count, 12);
    const pyqExamples = await getPyqStyleExamples(test.examStage, subject);
    const built = await createVerifiedQuestions({
      needed: batch,
      tag: { examStage: test.examStage },
      generateParams: {
        examType: test.examStage,
        examDisplayName: displayName,
        subject: subject || "General",
        topic: subject || "General",
        examMode: true, // real-exam-style questions (mixed difficulty like actual paper)
        pyqExamples, // fresh real-question reference for THIS batch - every batch gets grounded, not just one
        examLevel: pattern?.examLevel,
        // Random starting point, so topping a mock up twice doesn't ask the
        // same corner of the syllabus both times.
        syllabusTopics: syllabusSlice(sectionDef?.syllabus, Math.floor(Math.random() * 100)),
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
      message: `${newIds.length} questions add ho gaye${sectionNote}${qualityNote(built)}. Total ${test.questions.length} questions.${groundingNote}`,
      added: newIds.length,
      totalCount: test.questions.length,
      groundedInRealPyqs: pyqExamples.length > 0,
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
    const pattern = await ExamPattern.findOne({ examType: examStage, isActive: true });
    if (!pattern) return res.status(404).json({ message: `No pattern found for ${examStage}` });

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