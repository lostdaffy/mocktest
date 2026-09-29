const Subject = require("../models/Subject");
const ExamPattern = require("../models/ExamPattern");
const Test = require("../models/Test");

const LEVELS = ["easy", "medium", "hard", "advanced"];
const PRACTICE_TEST_SIZE = 12;

/**
 * Everything the catalog is still missing.
 *
 * The admin should not have to work out which of 224 practice tests exist and
 * which do not, or which exams have no mock. The system already knows: a
 * chapter times a level is a practice test, and an exam pattern is a mock.
 *
 * Returned in the order it should be built - the easier levels first, so a
 * student who opens a new chapter finds a rung to start on rather than only
 * an Advanced test.
 */
async function findGaps({ includeSubjects, excludeSubjects = [], mocksPerExam = 1 } = {}) {
  const [subjects, patterns, tests] = await Promise.all([
    Subject.find({ isActive: true }).lean(),
    ExamPattern.find({ isActive: true }).lean(),
    Test.find({}).select("type topic difficultyLevel examStage questions").lean(),
  ]);

  const havePractice = new Set(
    tests.filter((t) => t.type === "practice").map((t) => `${t.topic}|${t.difficultyLevel}`)
  );

  // Only a FULL mock fills the gap. Counting every mock document meant SSC
  // CHSL at 9 of 100 - and an empty one left by an interrupted run - both
  // counted as built, so the missing 91 questions never showed up anywhere.
  // A short draft stays a gap, and building it resumes that same draft.
  const mockCount = {};
  tests.filter((t) => t.type === "full_mock").forEach((t) => {
    if ((t.questions || []).length < paperSizeOf(patterns, t.examStage)) return;
    mockCount[t.examStage] = (mockCount[t.examStage] || 0) + 1;
  });

  const skip = new Set(excludeSubjects);
  const only = includeSubjects && includeSubjects.length ? new Set(includeSubjects) : null;

  const practice = [];
  for (const level of LEVELS) {
    for (const subject of subjects) {
      if (skip.has(subject.name)) continue;
      if (only && !only.has(subject.name)) continue;
      for (const chapter of subject.chapters || []) {
        const name = chapter.name || chapter;
        if (havePractice.has(`${name}|${level}`)) continue;
        practice.push({
          kind: "practice",
          subject: subject.name,
          chapter: name,
          difficulty: level,
          label: `${subject.name} · ${name} · ${level}`,
        });
      }
    }
  }

  const mocks = [];
  for (const pattern of patterns) {
    const have = mockCount[pattern.examType] || 0;
    for (let i = have; i < mocksPerExam; i++) {
      const size = (pattern.sections || []).reduce((n, s) => n + (s.questionCount || 0), 0);
      mocks.push({
        kind: "mock",
        examType: pattern.examType,
        label: `${pattern.displayName || pattern.examType} · mock #${i + 1} (${size} questions)`,
      });
    }
  }

  // Tests that exist but are below their size. Removal fills its own hole
  // now, so these are only ever ones that went short before that, or where a
  // top-up ran out of allowance part way.
  const short = tests
    .filter((t) => t.type === "practice" && (t.questions || []).length < PRACTICE_TEST_SIZE)
    .map((t) => ({ title: t.topic, level: t.difficultyLevel, have: (t.questions || []).length }));

  return { practice, mocks, short, levels: LEVELS };
}

function paperSizeOf(patterns, examType) {
  const p = patterns.find((x) => x.examType === examType);
  return (p?.sections || []).reduce((n, s) => n + (s.questionCount || 0), 0) || 1;
}

/** A count of what exists against what could exist, for the panel's header. */
async function coverage() {
  const [subjects, patterns, tests] = await Promise.all([
    Subject.find({ isActive: true }).lean(),
    ExamPattern.find({ isActive: true }).lean(),
    Test.find({}).select("type topic difficultyLevel examStage questions").lean(),
  ]);

  const havePractice = new Set(
    tests.filter((t) => t.type === "practice").map((t) => `${t.topic}|${t.difficultyLevel}`)
  );

  let possible = 0;
  let built = 0;
  for (const subject of subjects) {
    for (const chapter of subject.chapters || []) {
      const name = chapter.name || chapter;
      for (const level of LEVELS) {
        possible++;
        if (havePractice.has(`${name}|${level}`)) built++;
      }
    }
  }

  // "10 of 10 built" was true of documents and false of papers. Full ones
  // are counted as built; short ones are reported separately so the panel
  // can say which exams still need finishing.
  const mockDocs = tests.filter((t) => t.type === "full_mock");
  const fullMocks = mockDocs.filter((t) => (t.questions || []).length >= paperSizeOf(patterns, t.examStage));
  const unfinished = mockDocs
    .filter((t) => (t.questions || []).length < paperSizeOf(patterns, t.examStage))
    .map((t) => ({ examType: t.examStage, have: (t.questions || []).length, of: paperSizeOf(patterns, t.examStage) }));
  const examsWithAFullMock = new Set(fullMocks.map((t) => t.examStage)).size;

  return {
    practice: { built, possible },
    mocks: { built: fullMocks.length, exams: patterns.length, examsCovered: examsWithAFullMock, unfinished },
  };
}

module.exports = { findGaps, coverage, LEVELS, PRACTICE_TEST_SIZE };
