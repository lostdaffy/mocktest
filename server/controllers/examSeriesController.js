const Test = require("../models/Test");
const { sectionRulesFrom } = require("../utils/marking");
const Question = require("../models/Question");
const ExamPattern = require("../models/ExamPattern");
const Subject = require("../models/Subject");
const RejectedQuestion = require("../models/RejectedQuestion");
const Vacancy = require("../models/Vacancy");
const QuestionImage = require("../models/QuestionImage");
const { imagesPendingIn, hasVisuals, pendingImagesMessage } = require("../services/visuals");
const { createVerifiedQuestions, qualityNote } = require("../services/questionFactory");
const { refillTest, refillTests, refillNote, targetSize } = require("../services/testTopUp");

// How much of every mock is made of REAL previous-year questions. The rest
// is generated fresh. If the PYQ Bank doesn't have enough for a subject,
// the shortfall is simply generated too - the mock is never left short.
const PYQ_MIX_PERCENT = 50;

// How many questions a chapter practice test holds, and how many are asked
// for at a time - see utils/practice.js.
const { PRACTICE_TEST_SIZE, PRACTICE_BATCH } = require("../utils/practice");

// How many questions a full mock of a given exam must hold: whatever its
// pattern's sections add up to. Read from the pattern rather than fixed in
// code, so adding an exam with a 150-question paper stays an admin job.
async function fullMockSize(examStage) {
  const pattern = await ExamPattern.findOne({ examType: examStage }).lean();
  const total = (pattern?.sections || []).reduce((n, sec) => n + (sec.questionCount || 0), 0);
  return total || 100;
}

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
/**
 * Builds one mock for an exam and returns a line describing what was built.
 *
 * Separated from the HTTP handler because the generation queue needs to build
 * mocks too, and two implementations of "assemble a paper from its pattern"
 * would drift apart the first time one of them was fixed.
 *
 * Throws rather than returning an error shape: the caller decides whether
 * that becomes a 500 or a failed job.
 */
async function buildMockForExam(examStage, { vacancyId } = {}) {
  const pattern = await ExamPattern.findOne({ examType: examStage, isActive: true });
  if (!pattern) {
    throw new Error(`No exam pattern found for ${examStage}. Create the pattern first.`);
  }

  // A mock for one recruitment notice follows that notice's syllabus where
  // it gives one, section by section, and is numbered in its own series.
  let vacancy = null;
  if (vacancyId) {
    vacancy = await Vacancy.findById(vacancyId).lean();
    if (!vacancy) throw new Error("That vacancy no longer exists.");
    if (vacancy.examType !== examStage) throw new Error(`That vacancy follows ${vacancy.examType}, not ${examStage}.`);
  }
  const series = { vacancy: vacancy ? vacancy._id : null };
  const syllabusOf = (section) => {
    const own = (vacancy?.syllabus || []).find((s) => String(s.subject).toLowerCase() === String(section.subject).toLowerCase());
    return own?.topics?.length ? own.topics : section.syllabus;
  };
  const visualPlan = await visualChaptersFor(pattern, syllabusOf);

  // What a full paper of this exam is - 80 for SSC GD, 150 for CTET.
  const paperSize = (pattern.sections || []).reduce((n, sec) => n + (sec.questionCount || 0), 0);
  const sectionIndexOf = (subject) =>
    pattern.sections.findIndex((sec) => sec.subject === subject || (sec.sources || []).includes(subject));

  // Finish what is already started rather than starting another. A run that
  // ran out of allowance, or was cut off by a deploy, leaves a draft behind;
  // the next run used to create Mock #2 beside it and leave #1 short for
  // ever. Only drafts are touched - nothing a student can see.
  const drafts = await Test.find({ examStage, type: "full_mock", publishStatus: "draft", ...series }).sort({ seriesNumber: 1 });
  const unfinished = drafts.filter((d) => d.questions.length < paperSize);
  const partial = unfinished.filter((d) => d.questions.length > 0).sort((a, b) => b.questions.length - a.questions.length);
  const empties = unfinished.filter((d) => d.questions.length === 0);

  let test = partial[0] || empties[0] || null;
  const resumed = !!test;

  // An empty draft holds nothing and cannot have been sat - drafts are never
  // shown to students - so the spares are removed rather than left in the
  // list as "Mock #3 (0 questions)".
  for (const e of empties) {
    if (!test || String(e._id) !== String(test._id)) await Test.deleteOne({ _id: e._id });
  }

  if (!test) {
    const lastMock = await Test.findOne({ examStage, type: "full_mock", ...series }).sort({ seriesNumber: -1 });
    const nextNumber = (lastMock?.seriesNumber || 0) + 1;
    test = await Test.create({
      title: `${vacancy ? vacancy.seriesName : pattern.displayName} - Mock #${nextNumber}`,
      ...(vacancy ? { vacancy: vacancy._id } : {}),
      type: "full_mock",
      examType: examStage,
      examStage,
      seriesNumber: nextNumber,
      questions: [],
      durationMinutes: pattern.durationMinutes,
      marksPerQuestion: pattern.marksPerQuestion,
      negativeMarking: pattern.negativeMarking,
      sectionRules: sectionRulesFrom(pattern),
      publishStatus: "draft",
      createdBy: "admin",
    });
  }

  // The paper is kept as one bucket per section, in the pattern's order, so a
  // resumed section's new questions land inside that section rather than
  // tacked onto the end of the paper.
  const buckets = pattern.sections.map(() => []);
  const strays = [];
  const pyqInSection = pattern.sections.map(() => 0);
  // Which chart/figure chapters a section already has a set from, so a
  // resumed mock does not get a second one.
  const visualsInSection = pattern.sections.map(() => new Set());
  if (test.questions.length) {
    const have = await Question.find({ _id: { $in: test.questions } }).select("subject source chapter visual.kind").lean();
    const byId = new Map(have.map((q) => [String(q._id), q]));
    for (const id of test.questions) {
      const q = byId.get(String(id));
      if (!q) continue; // deleted from the bank since - drop the dangling id
      const k = sectionIndexOf(q.subject);
      if (k < 0) strays.push(q._id);
      else {
        buckets[k].push(q._id);
        if (q.source === "pyq") pyqInSection[k] += 1;
        if (q.visual?.kind) visualsInSection[k].add(q.chapter);
      }
    }
  }
  const startedWith = buckets.reduce((n, b) => n + b.length, 0);
  const flatten = () => [...buckets.flat(), ...strays];
  const saveProgress = async () => {
    // updateOne, not save(): a mock created under an older schema fails
    // whole-document validation, and this only ever changes one field.
    await Test.updateOne({ _id: test._id }, { $set: { questions: flatten() } });
  };

  let hadFailure = false;
  // Once every model has used its allowance there is nothing to gain from
  // trying the remaining batches - each one fails the same way, five seconds
  // apart. Stop, and say so, so the queue can pause instead of calling a
  // 9-question mock done.
  let allowanceGone = false;
  const tally = { verified: 0, repaired: 0, discarded: 0, duplicates: 0, short: 0 };
  const syllabusOffsets = new Map(); // per subject, so each batch moves along the syllabus
  const everyId = () => flatten();

  // Small chunks (max 12 per call for quality and valid JSON), paused between
  // calls to stay under the free tier's per-minute limit. A batch that fails
  // for a passing reason is skipped and the rest carry on.
  async function generateInChunks(k, section, difficulty, totalCount) {
    const CHUNK = 12;
    let remaining = totalCount;
    while (remaining > 0 && !allowanceGone) {
      const thisBatch = Math.min(CHUNK, remaining);
      const offset = syllabusOffsets.get(section.subject) || 0;
      const topics = syllabusSlice(syllabusOf(section), offset);
      syllabusOffsets.set(section.subject, offset + (topics.length || 1));
      try {
        // Only questions that pass the rule checks AND the AI's own re-solve
        // come back here. Anything doubtful is mended if it can be and
        // deleted if it cannot - nothing doubtful is kept.
        const built = await createVerifiedQuestions({
          needed: thisBatch,
          tag: { examStage },
          generateParams: {
            examType: examStage,
            examDisplayName: vacancy ? vacancy.name : pattern.displayName,
            subject: section.subject,
            topic: section.subject,
            difficulty,
            examLevel: pattern.examLevel,
            syllabusTopics: topics,
          },
        });
        for (const key of Object.keys(tally)) tally[key] += built[key] || 0;
        buckets[k].push(...built.ids);
        await saveProgress();
      } catch (err) {
        hadFailure = true;
        if (/every model has used its allowance|PerDay|per day|quota exceeded/i.test(err.message || "")) {
          allowanceGone = true;
          console.log(`Mock ${examStage}: the day's allowance is gone at ${everyId().length} of ${paperSize} - stopping, to finish from here tomorrow.`);
          break;
        }
        console.log(`Batch failed (${section.subject}/${difficulty}): ${err.message}. Skipping it and carrying on.`);
      }
      remaining -= thisBatch;
      await new Promise((r) => setTimeout(r, GEMINI_PAUSE_MS));
    }
  }

  // Each section is part real previous-year questions and part freshly
  // generated, so a mock feels like the actual paper. Only what a section is
  // still SHORT of is fetched - on a resumed mock, that is the remainder.
  let pyqUsed = pyqInSection.reduce((n, x) => n + x, 0);

  for (let k = 0; k < pattern.sections.length && !allowanceGone; k++) {
    const section = pattern.sections[k];
    const shortBy = Math.max(0, section.questionCount - buckets[k].length);
    if (shortBy === 0) continue;

    const pyqTarget = Math.round((section.questionCount * PYQ_MIX_PERCENT) / 100);
    const pyqWanted = Math.min(shortBy, Math.max(0, pyqTarget - pyqInSection[k]));
    const pyqIds = pyqWanted > 0 ? await pickPyqQuestions(examStage, section.subject, pyqWanted, everyId()) : [];
    if (pyqIds.length > 0) {
      buckets[k].push(...pyqIds);
      pyqUsed += pyqIds.length;
      await saveProgress();
    }

    // A section whose syllabus names a Data Interpretation or figure chapter
    // gets one set of those, the way the real paper has one: a chart with
    // five questions, or three figure questions. Figures still need their
    // pictures uploaded before the mock can be published.
    for (const v of visualPlan[k] || []) {
      if (allowanceGone || visualsInSection[k].has(v.chapter)) continue;
      const room = section.questionCount - buckets[k].length;
      const want = Math.min(room, v.kind === "chart" ? 5 : 3);
      if (want < (v.kind === "chart" ? 3 : 1)) continue;
      try {
        const built = await createVerifiedQuestions({
          needed: want,
          tag: { examStage, chapter: v.chapter },
          generateParams: {
            examType: examStage,
            examDisplayName: vacancy ? vacancy.name : pattern.displayName,
            subject: v.subject,
            topic: v.chapter,
            difficulty: "medium",
            examLevel: pattern.examLevel,
            syllabusTopics: v.topics,
            visualKind: v.kind,
          },
        });
        for (const key of Object.keys(tally)) tally[key] += built[key] || 0;
        buckets[k].push(...built.ids);
        if (built.ids.length) visualsInSection[k].add(v.chapter);
        await saveProgress();
      } catch (err) {
        hadFailure = true;
        if (/every model has used its allowance|PerDay|per day|quota exceeded/i.test(err.message || "")) allowanceGone = true;
        console.log(`Visual set failed (${v.kind} ${v.chapter}): ${err.message}`);
      }
    }
    if (allowanceGone) break;

    // Whatever the PYQ bank couldn't supply is generated instead, so a thin
    // bank means a more AI-heavy mock, never a short one.
    const aiNeeded = Math.max(0, section.questionCount - buckets[k].length);
    const easy = Math.round((aiNeeded * (section.difficultyMix?.easy ?? 30)) / 100);
    const medium = Math.round((aiNeeded * (section.difficultyMix?.medium ?? 50)) / 100);
    const perDifficulty = {
      easy,
      medium,
      hard: Math.max(0, aiNeeded - easy - medium), // takes the rounding, so the section lands on its exact count
    };
    for (const [difficulty, count] of Object.entries(perDifficulty)) {
      if (count <= 0 || allowanceGone) continue;
      await generateInChunks(k, section, difficulty, count);
    }

    // Shuffle within the section, otherwise every real question sits at the
    // top of its subject and the mock reads in two obvious halves.
    const b = buckets[k];
    for (let x = b.length - 1; x > 0; x--) {
      const y = Math.floor(Math.random() * (x + 1));
      [b[x], b[y]] = [b[y], b[x]];
    }
    await saveProgress();
  }

  const finalCount = flatten().length;
  const added = finalCount - startedWith;

  if (finalCount === 0) {
    await Test.deleteOne({ _id: test._id });
    if (allowanceGone) {
      throw new Error("Every model has used its allowance for today - nothing could be generated for this mock yet.");
    }
    throw new Error("No questions could be generated (rate limit or API issue). Try again in a minute.");
  }

  const note =
    qualityNote(tally) +
    (allowanceGone
      ? " (Stopped when the day's AI allowance ran out - it will be finished from here, not started again.)"
      : hadFailure
      ? ' (Some batches were skipped because of the rate limit - it will be finished from here on the next run.)'
      : "");

  const verb = resumed ? `continued (+${added})` : "created";
  return {
    message: `Mock #${test.seriesNumber} ${verb} — ${finalCount} of ${paperSize} questions (${pyqUsed} from past papers, ${finalCount - pyqUsed} new).${note} Review, then publish once it is full.`,
    test: { _id: test._id, title: test.title, questionCount: finalCount },
    full: finalCount >= paperSize,
    allowanceGone,
    have: finalCount,
    paperSize,
  };
}

/**
 * For each section of a pattern, the catalog's chart and figure chapters its
 * syllabus names - by chapter name or by one of the chapter's topics, in the
 * section's own subject or one it draws from.
 */
async function visualChaptersFor(pattern, syllabusOf) {
  const subjects = await Subject.find({ isActive: true, "chapters.visual": { $in: ["chart", "figure"] } }).lean();
  return pattern.sections.map((section) => {
    const names = new Set(
      (syllabusOf(section) || []).map((t) => String(typeof t === "string" ? t : t?.topic || "").trim().toLowerCase()).filter(Boolean)
    );
    if (!names.size) return [];
    const inSection = [section.subject, ...(section.sources || [])].map((s) => s.toLowerCase());
    const out = [];
    for (const subj of subjects) {
      const subjNames = [subj.name, ...(subj.aliases || [])].map((s) => s.toLowerCase());
      if (!subjNames.some((n) => inSection.includes(n))) continue;
      for (const ch of subj.chapters || []) {
        if (!ch.visual) continue;
        const keys = [ch.name, ...(ch.topics || [])].map((t) => t.toLowerCase());
        if (keys.some((t) => names.has(t))) {
          out.push({ kind: ch.visual, subject: subj.name, chapter: ch.name, topics: ch.topics?.length ? ch.topics : [ch.name] });
        }
      }
    }
    return out.slice(0, 2);
  });
}

// POST /api/exam-series/:examStage/generate-mock (admin)
// body: { vacancyId? } - a mock in that recruitment notice's series
async function generateExamMock(req, res) {
  try {
    const built = await buildMockForExam(req.params.examStage, { vacancyId: req.body?.vacancyId });
    res.status(201).json(built);
  } catch (err) {
    console.error(err);
    const notFound = /No exam pattern found/.test(err.message);
    const nothingBuilt = /No questions could be generated/.test(err.message);
    res
      .status(notFound ? 404 : nothingBuilt ? 400 : 500)
      .json({ message: notFound || nothingBuilt ? err.message : "Generation failed: " + err.message });
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

  // A mock goes live holding what the real paper holds. Generation gets cut
  // short by rate limits often enough that this is the last thing standing
  // between a half-built mock and a student's exam-day practice.
  const required = await fullMockSize(test.examStage);
  if (test.questions.length < required) {
    const short = required - test.questions.length;
    return res.status(400).json({
      message: `This mock has ${test.questions.length} of ${required} questions. Add ${short} more before publishing.`,
      currentCount: test.questions.length,
      required,
      short,
    });
  }

  // ...and with every figure's picture in it.
  const pending = await imagesPendingIn(test.questions);
  if (pending) return res.status(400).json({ message: pendingImagesMessage(pending), imagesPending: pending });

  test.publishStatus = "published";
  test.isFree = !!isFree;
  test.hasVisuals = await hasVisuals(test.questions);
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

  // Delete the mock's questions too (they were generated for this mock only),
  // and the pictures of any figure questions among them.
  await QuestionImage.deleteMany({ question: { $in: test.questions } });
  await Question.deleteMany({ _id: { $in: test.questions } });
  await Test.findByIdAndDelete(req.params.testId);

  res.json({ message: "The mock and its questions were deleted" });
}

// DELETE /api/exam-series/mock/:testId/question/:questionId (admin)
// Remove a single bad question from a mock (and delete it).
// Works for any test - a mock, a practice test, whatever holds questions.
//
// It used to delete the question from the bank outright. If another test was
// also using it, that test kept an id pointing at nothing: populate quietly
// drops it, so the other test simply became one question shorter with no
// sign of why. The question is only deleted when this was the last test
// holding it.
async function removeQuestionFromMock(req, res) {
  const { testId, questionId } = req.params;
  const test = await Test.findById(testId);
  if (!test) return res.status(404).json({ message: "Test not found" });

  test.questions = test.questions.filter((q) => String(q) !== String(questionId));
  await test.save();

  const stillUsedBy = await Test.countDocuments({ questions: questionId });
  let deleted = false;
  if (stillUsedBy === 0) {
    const q = await Question.findById(questionId);
    if (q) {
      await RejectedQuestion.create({
        text: q.text, subject: q.subject, topic: q.topic, chapter: q.chapter, difficulty: q.difficulty,
        reason: "removed_by_admin", detail: `removed from ${test.title}`,
      }).catch(() => {});
      await Question.findByIdAndDelete(questionId);
      await QuestionImage.deleteMany({ question: questionId });
      deleted = true;
    }
  }

  // ...and another takes its place, right now. Telling the admin the test is
  // short and leaving it there is how a test ends up serving five questions.
  const refilled = test.type === "practice" ? [await refillTest(test._id)] : [];
  const after = await Test.findById(test._id).select("questions").lean();
  const remaining = (after?.questions || test.questions).length;
  const short = Math.max(0, PRACTICE_TEST_SIZE - remaining);

  res.json({
    message:
      "Question removed" +
      (deleted ? " and deleted from the bank" : ` (kept - ${stillUsedBy} other test(s) use it)`) +
      refillNote(refilled),
    remainingCount: remaining,
    short,
    deletedFromBank: deleted,
    refilled,
  });
}

// POST /api/exam-series/practice/:testId/add-questions  { count }
//
// Refills a practice test after the admin has taken questions out of it.
// Mocks and live exams already had this; practice tests - which are most of
// the content - had no way back once a question was removed, so a test could
// only ever shrink.
//
// The new questions go through the same gate as any other: verified,
// repaired where repairable, and checked against everything the chapter has
// already asked so a replacement is not a reworded copy of what is still in
// the test.
async function addQuestionsToPractice(req, res) {
  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).json({ message: "Test not found" });
  if (test.type !== "practice") {
    return res.status(400).json({ message: "This is not a practice test" });
  }
  if (test.publishStatus === "published") {
    return res.status(400).json({ message: "Unpublish this test before changing its questions" });
  }

  const wanted = Number(req.body?.count) || Math.max(0, PRACTICE_TEST_SIZE - test.questions.length);
  if (wanted <= 0) {
    return res.status(400).json({ message: `This test already has ${test.questions.length} questions` });
  }

  // The same top-up removal uses: the chapter's (or the one topic's) syllabus,
  // the chapter's exam tags, ten at a time.
  const result = await refillTest(test._id, { max: wanted });

  if (!result.added) {
    return res.status(400).json({
      message: `No questions could be added${result.why ? ` (${result.why})` : ""}. Try again in a minute.`,
    });
  }

  res.json({
    message: `${result.added} question(s) added. ${result.to} in this test now.`,
    added: result.added,
    total: result.to,
  });
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
        _id: { subject: "$subject", topic: "$topic", subtopic: "$subtopic", level: "$difficultyLevel", status: "$publishStatus" },
        n: { $sum: 1 },
        // Below PRACTICE_TEST_SIZE: the old 12-question tests, and any that
        // went short. Counted here so the page can offer to top them up.
        short: { $sum: { $cond: [{ $lt: [{ $size: { $ifNull: ["$questions", []] } }, PRACTICE_TEST_SIZE] }, 1, 0] } },
      },
    },
  ]);

  const emptyLevels = () => ({
    easy: { published: 0, draft: 0 },
    medium: { published: 0, draft: 0 },
    hard: { published: 0, draft: 0 },
    advanced: { published: 0, draft: 0 },
  });

  // Keyed subject + chapter, with a NUL between so no two names can collide.
  const byChapter = new Map();
  let shortTests = 0;
  for (const row of counts) {
    shortTests += row.short;
    const key = `${row._id.subject}\u0000${row._id.topic}`;
    if (!byChapter.has(key)) byChapter.set(key, { published: 0, draft: 0, levels: emptyLevels(), subtopics: {} });
    const entry = byChapter.get(key);
    const status = row._id.status === "published" ? "published" : "draft";
    entry[status] += row.n;
    if (entry.levels[row._id.level]) entry.levels[row._id.level][status] += row.n;
    // Tests for one topic of the chapter, counted per topic as well.
    if (row._id.subtopic) {
      const t = (entry.subtopics[row._id.subtopic] ||= { published: 0, draft: 0 });
      t[status] += row.n;
    }
  }

  const withCounts = subjects.map((s) => ({
    _id: s._id,
    name: s.name,
    icon: s.icon,
    chapters: (s.chapters || []).map((ch) => {
      const entry = byChapter.get(`${s.name}\u0000${ch.name}`);
      return {
        name: ch.name,
        topics: ch.topics,
        publishedTests: entry?.published || 0,
        draftTests: entry?.draft || 0,
        levels: entry?.levels || emptyLevels(),
        subtopicCounts: entry?.subtopics || {},
      };
    }),
  }));

  res.json({ subjects: withCounts, shortTests, testSize: PRACTICE_TEST_SIZE });
}

// POST /api/exam-series/practice/generate (admin)
// body: { subject, chapter, topics[], difficulty }
// Generates an adaptive-level practice test for a chapter (easy/medium/hard/advanced).
/**
 * Builds one practice test and returns a line describing what was built.
 *
 * Separated from the HTTP handler so the generation queue can call it
 * directly. Writing this a second time inside the worker is exactly how the
 * worker ended up creating Test documents without examType - there is one
 * implementation now, and it is this one.
 *
 * Throws rather than returning an error shape; the caller decides whether
 * that is a 400 or a failed job.
 */
async function buildPracticeTest({ subject, chapter, subtopic, topics, difficulty = "easy" }) {
  {
    if (!subject || !chapter) throw new Error("subject and chapter are required");
    subtopic = String(subtopic || "").trim() || undefined;
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

    // A topic test covers one of the chapter's own topics, as named in
    // Subjects - not any string, or the app would show a topic the chapter
    // does not have.
    if (subtopic && !(chapterDoc?.topics || []).includes(subtopic)) {
      throw new Error(`"${subtopic}" is not one of the topics of ${chapter}. Add it to the chapter in Subjects first.`);
    }
    const topicList = subtopic
      ? [subtopic]
      : topics && topics.length
      ? topics
      : chapterDoc?.topics?.length
      ? chapterDoc.topics
      : [chapter];

    let examTags = chapterDoc?.exams?.length ? chapterDoc.exams : null;
    if (!examTags) {
      // Chapter not in the catalog, or not tagged to any exam yet. An
      // untagged chapter is shown to every exam, so its questions belong to
      // every exam too - same rule, applied in the one other place it matters.
      const active = await ExamPattern.find({ isActive: true }).select(`examType`).lean();
      examTags = active.map((e) => e.examType);
    }

    // All the chapter's topics go into each request (not one request per
    // topic), which keeps us under the free tier's 15 requests/minute.
    const topicsForPrompt = topicList.join(", ");

    // Twenty questions, asked for ten at a time. Each batch is checked
    // against everything already in the bank - the first batch included - so
    // the second is not a reworded copy of the first.
    let allQuestionIds = [];
    let quality = { verified: 0, repaired: 0, discarded: 0, duplicates: 0, short: 0 };
    for (let batch = 0; allQuestionIds.length < PRACTICE_TEST_SIZE; batch++) {
      const ask = Math.min(PRACTICE_BATCH, PRACTICE_TEST_SIZE - allQuestionIds.length);
      try {
        const built = await createVerifiedQuestions({
          needed: ask,
          // examType here OVERRIDES what the generator stamped on each
          // question - tags are applied after generation. examStage is gone:
          // the Question schema has no such field, so it was being dropped
          // silently and only looked like it was doing something.
          tag: { chapter, examType: examTags },
          generateParams: {
            examType: "PRACTICE",
            // Tell the model who this is for, so a chapter shared by SSC CGL
            // and Agniveer is not written at graduate level by default.
            examDisplayName: `${subject} - ${chapter}${subtopic ? ` (${subtopic})` : ""}, for ${examTags.join(", ")}`,
            subject,
            topic: topicsForPrompt, // all topics of the chapter in one call
            difficulty: genDifficulty,
            syllabusTopics: topicList, // the chapter's topics ARE its syllabus
            // A Data Interpretation or figure chapter goes to the visual
            // generator, which checks every answer against its chart or
            // figure in code.
            ...(chapterDoc?.visual ? { visualKind: chapterDoc.visual } : {}),
          },
        });

        for (const k of Object.keys(quality)) quality[k] += built[k] || 0;
        allQuestionIds.push(...built.ids);
        // A batch that came back short will not do better asked again straight
        // away; the test is saved as it is and "Add questions" finishes it.
        if (built.ids.length < ask) break;
      } catch (err) {
        console.log(`Practice generation fail (${chapter}/${difficulty}, batch ${batch + 1}): ${err.message}`);
        break;
      }
    }

    if (allQuestionIds.length === 0) {
      throw new Error("No questions were generated (rate limit or API issue). Wait a minute and try again.");
    }

    // Numbered within its own series: the whole chapter's Easy tests are one
    // series, each topic's Easy tests another. `subtopic: null` also matches
    // tests from before the field existed.
    const lastTest = await Test.findOne({
      type: "practice",
      subject,
      topic: chapter,
      subtopic: subtopic || null,
      difficultyLevel: difficulty,
    }).sort({ seriesNumber: -1 });
    const nextNumber = (lastTest?.seriesNumber || 0) + 1;
    const levelName = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    const test = await Test.create({
      title: `${subtopic ? `${chapter}: ${subtopic}` : chapter} - ${levelName} #${nextNumber}`,
      type: "practice",
      examType: "PRACTICE",
      examStage: "PRACTICE",
      subject,
      topic: chapter,
      ...(subtopic ? { subtopic } : {}),
      difficultyLevel: difficulty,
      seriesNumber: nextNumber,
      questions: allQuestionIds,
      durationMinutes: Math.max(10, allQuestionIds.length),
      publishStatus: "draft",
      createdBy: "admin",
    });

    return {
      message: `${subtopic ? `${chapter}: ${subtopic}` : chapter} ${difficulty} test created — ${allQuestionIds.length} of ${PRACTICE_TEST_SIZE} questions${qualityNote(quality)}. ${allQuestionIds.length < PRACTICE_TEST_SIZE ? `Add the last ${PRACTICE_TEST_SIZE - allQuestionIds.length} from Review, then publish.` : "Review and publish."}`,
      test: { _id: test._id, title: test.title, questionCount: allQuestionIds.length },
    };
  }
}

// POST /api/exam-series/practice/generate (admin)
async function generatePracticeTest(req, res) {
  try {
    const built = await buildPracticeTest(req.body || {});
    res.status(201).json(built);
  } catch (err) {
    console.error(err);
    const bad = /are required|No questions were generated|is not one of the topics/.test(err.message);
    res.status(bad ? 400 : 500).json({ message: bad ? err.message : "Generation failed: " + err.message });
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
      message: `${newIds.length} questions added${sectionNote}${qualityNote(built)}. Total ${test.questions.length} questions.${groundingNote}`,
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
      sectionRules: sectionRulesFrom(pattern),
      publishStatus: "draft",
      createdBy: "admin",
    });

    res.status(201).json({ message: `Empty Mock #${nextNumber} created. Add questions to it next.`, test });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/exam-series/:examStage/sections -> the real exam's sections (from pattern)
// so admin picks from actual exam sections instead of typing subject names.
async function getExamSections(req, res) {
  const { examStage } = req.params;
  const pattern = await ExamPattern.findOne({ examType: examStage, isActive: true });
  if (!pattern) return res.status(404).json({ message: "No pattern found for this exam" });

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

  // Full, or not at all. A student who opens a 10-question test sitting next
  // to a 12-question one has been short-changed, and "Add questions" closes
  // the gap in one click - so there is no reason to let a short one out.
  if (test.questions.length < PRACTICE_TEST_SIZE) {
    const short = PRACTICE_TEST_SIZE - test.questions.length;
    return res.status(400).json({
      message: `This test has ${test.questions.length} of ${PRACTICE_TEST_SIZE} questions. Add ${short} more before publishing.`,
      short,
    });
  }

  // A figure question without its picture is a question nobody can answer.
  const pending = await imagesPendingIn(test.questions);
  if (pending) return res.status(400).json({ message: pendingImagesMessage(pending), imagesPending: pending });

  test.publishStatus = "published";
  test.isFree = !!isFree;
  test.hasVisuals = await hasVisuals(test.questions);
  await test.save();
  res.json({ message: "Practice test is live", test });
}

// POST /api/exam-series/practice/fill-short (admin)
//
// Every practice test that is below its size, filled. Removal fills its own
// hole now, so this is for the ones that went short before it did - the purge
// of 127 untrustworthy answer keys left 26 live tests wanting.
async function fillShortTests(req, res) {
  const limit = Math.min(Math.max(Number(req.body?.limit) || 5, 1), 15);

  const tests = await Test.find({ type: "practice" }).select("title questions publishStatus").lean();
  const short = tests
    .filter((t) => (t.questions || []).length < PRACTICE_TEST_SIZE)
    .sort((a, b) => (a.questions || []).length - (b.questions || []).length);

  if (!short.length) return res.json({ message: "Every practice test is full", filled: [], remaining: 0 });

  // A few at a time: each replacement costs API calls, and the free tier
  // allows about fifteen a minute.
  const batch = short.slice(0, limit);
  const filled = await refillTests(batch.map((t) => t._id));

  const added = filled.reduce((n, r) => n + r.added, 0);
  const done = filled.filter((r) => r.filled).length;
  const remaining = short.length - done;

  res.json({
    message:
      `${added} question(s) added across ${batch.length} test(s); ${done} now full` +
      (remaining ? `. ${remaining} still short - run it again` : ". Every practice test is full"),
    filled,
    remaining,
  });
}

// Back to draft, so a published test can be corrected. Questions are not
// touched - only whether students can see it.
async function unpublishPracticeTest(req, res) {
  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).json({ message: "Practice test not found" });
  if (test.type !== "practice") {
    return res.status(400).json({ message: "This is not a practice test" });
  }
  if (test.publishStatus !== "published") {
    return res.status(400).json({ message: "This test is not published" });
  }

  test.publishStatus = "draft";
  await test.save();
  res.json({ message: "Taken off the app - you can edit it now", test });
}

module.exports = {
  buildMockForExam,
  buildPracticeTest,
  listExams,
  listExamMocks,
  generateExamMock,
  getMockForReview,
  publishMock,
  archiveMock,
  deleteMock,
  removeQuestionFromMock,
  addQuestionsToPractice,
  listSubjectsForAdmin,
  generatePracticeTest,
  listPracticeTests,
  addQuestionsToMock,
  createEmptyMock,
  getExamSections,
  getMockSectionStatus,
  publishPracticeTest,
  unpublishPracticeTest,
  fillShortTests,
};