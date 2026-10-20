// Everything about one chapter's practice tests that the per-question gate
// cannot see on its own: whether each topic has its ten tests at every level,
// whether every test is full and live, and whether a question repeats one
// already in the chapter. Each live question is also put through the rule
// gate again (no AI - the AI half is the audit).
//
// Every problem names the test and the question id, so the admin can fix it
// with the practice spreadsheet (a row naming the test, with "replaces" set
// to the id) - no code involved.
const Question = require("../models/Question");
const Test = require("../models/Test");
const Subject = require("../models/Subject");
const { ruleBasedCheck, looksLikeRepeat, sameFactInPaper, numberSignature } = require("./validationPipeline");
const { plainMaths } = require("./mathNotation");
const { PRACTICE_TEST_SIZE } = require("../utils/practice");

const LEVELS = ["easy", "medium", "hard", "advanced"];
const IS_MATHS = /^(maths?|mathematics|quant|गणित|reasoning|तर्क)/i;
const TESTS_PER_LEVEL = 10;
// The chapter's own series, with no topic ("Mixed Practice" in a spreadsheet
// title): shown on the Subject Practice page as the chapter itself.
const WHOLE = "Whole chapter";
// Advanced tests draw on the bank's hardest two grades.
const GRADES_FOR = { easy: ["easy"], medium: ["medium"], hard: ["hard"], advanced: ["hard", "exam"] };
// Typeset maths that was never turned into plain text, and keyboard maths.
const LATEX = /\\(frac|times|div|sqrt|cdot|left|right|text|pm|le|ge|ne)\b|\$[^$\n]{1,80}\$/;
// A power of a power, 7^(7⁷), is left as written on purpose (mathNotation.js).
const KEYBOARD = /[0-9)]\s*\^\s*\d|\d\s+\*\s+\d/;
const short = (q) => ({ _id: q._id, text: String(q.text).slice(0, 140) });

async function chapterHealth(chapter) {
  const subjectDoc = await Subject.findOne({ "chapters.name": chapter }).lean();
  // A topic named like the chapter is the whole chapter again (as on the
  // Subject Practice page), so it is not a series of its own.
  const topics = ((subjectDoc?.chapters || []).find((c) => c.name === chapter)?.topics || [])
    .filter((t) => t.trim().toLowerCase() !== chapter.trim().toLowerCase());
  const tests = await Test.find({ type: "practice", topic: chapter })
    .select("title subtopic difficultyLevel publishStatus questions seriesNumber")
    .lean();
  const ids = [...new Set(tests.flatMap((t) => t.questions.map(String)))];
  const inTests = await Question.find({ _id: { $in: ids } }).lean();
  const byId = new Map(inTests.map((q) => [String(q._id), q]));
  const live = await Question.find({
    status: "published",
    $or: [{ chapter }, { chapter: { $in: [null, ""] }, topic: chapter }],
  }).lean();
  const testsOf = new Map(); // question id -> titles of the tests holding it
  for (const t of tests) for (const id of t.questions) {
    const k = String(id);
    if (!testsOf.has(k)) testsOf.set(k, []);
    testsOf.get(k).push(t.title);
  }

  // ---- the grid: topic x level -> tests (every catalog topic, and Mixed)
  const grid = {};
  for (const topic of [...topics, WHOLE]) {
    grid[topic] = Object.fromEntries(LEVELS.map((l) => [l, { tests: 0, full: 0, live: 0, missing: TESTS_PER_LEVEL, numbers: [] }]));
  }
  const testProblems = [];
  for (const t of tests) {
    const topic = t.subtopic || WHOLE;
    const level = String(t.difficultyLevel || "?").toLowerCase();
    grid[topic] = grid[topic] || {};
    const cell = (grid[topic][level] = grid[topic][level] || { tests: 0, full: 0, live: 0, missing: TESTS_PER_LEVEL, numbers: [] });
    cell.tests++;
    // The test's number in its series ("… · Easy #3"), so the missing ones can be named.
    const number = t.seriesNumber || Number(String(t.title).match(/#(d+)s*$/)?.[1]) || 0;
    if (number) cell.numbers.push(number);
    cell.missing = Math.max(0, TESTS_PER_LEVEL - cell.tests);
    const qs = t.questions.map((id) => byId.get(String(id)));
    const problems = [];
    if (t.questions.length !== PRACTICE_TEST_SIZE) problems.push(`${t.questions.length} questions, not ${PRACTICE_TEST_SIZE}`);
    else cell.full++;
    if (t.publishStatus === "published") cell.live++;
    else problems.push(`not published (${t.publishStatus})`);
    const missing = qs.filter((q) => !q).length;
    if (missing) problems.push(`${missing} question id(s) point at nothing`);
    const notLive = qs.filter((q) => q && q.status !== "published").length;
    if (notLive) problems.push(`${notLive} question(s) not live (rejected/under review) still in the test`);
    if (new Set(t.questions.map(String)).size !== t.questions.length) problems.push("the same question twice");
    const present = qs.filter(Boolean);
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        const [a, b] = [present[i], present[j]];
        // Same numbers and mostly the same words. (sameFactInPaper is for GK:
        // in maths, two different remainder questions often share an answer.)
        if (looksLikeRepeat(plainMaths(a.text), [plainMaths(b.text)]).repeat) {
          problems.push(`asks the same thing twice: "${a.text.slice(0, 70)}" / "${b.text.slice(0, 70)}"`);
        }
      }
    }
    const grades = GRADES_FOR[level];
    const offLevel = grades ? qs.filter((q) => q && q.difficulty && !grades.includes(q.difficulty)).length : 0;
    if (offLevel) problems.push(`${offLevel} question(s) graded for another level`);
    if (topic !== WHOLE) {
      const offTopic = qs.filter((q) => q && q.topic && q.topic !== topic && q.topic !== chapter).length;
      if (offTopic) problems.push(`${offTopic} question(s) from another topic`);
    }
    if (problems.length) testProblems.push({ _id: t._id, title: t.title, problems });
  }

  // ---- every live question through the rule gate again
  const pool = new Map([...live, ...inTests.filter((q) => q.status === "published")].map((q) => [String(q._id), q]));
  const ruleFailures = [];
  const notation = [];
  for (const q of pool.values()) {
    const { passed, issues } = ruleBasedCheck(q);
    if (!passed) ruleFailures.push({ ...short(q), tests: testsOf.get(String(q._id)) || [], issues });
    const fields = [q.text, q.textHi, q.solution, q.solutionHi, ...(q.options || []), ...(q.optionsHi || [])].map((f) => String(f || ""));
    if (fields.some((f) => LATEX.test(f) || KEYBOARD.test(f))) notation.push({ ...short(q), tests: testsOf.get(String(q._id)) || [] });
  }

  // ---- the same question twice in the chapter. Of each pair, the one to
  // replace: the AI-written one if only one is, else the later one.
  const repeats = [];
  const bySignature = new Map();
  const ordered = [...pool.values()].sort((a, b) => String(a._id).localeCompare(String(b._id)));
  const human = (q) => q.source === "manual" || q.createdBy === "admin";
  for (const q of ordered) {
    // "Which of the following numbers is divisible by 11?" says nothing until
    // its options are read: such a question is compared with its options.
    const stem = plainMaths(q.text);
    const generic = !numberSignature(stem);
    const text = generic ? `${stem} ${(q.options || []).join(" ")}` : stem;
    const sig = numberSignature(text);
    const bucket = bySignature.get(sig) || [];
    // Same answer and similar words is a repeat in GK, not in maths, where
    // two different remainder questions often share an answer.
    const gk = !IS_MATHS.test(String(q.subject || ""));
    const hit = bucket.find(
      (o) => (!generic && o.textKey && o.textKey === q.textKey) || looksLikeRepeat(text, [o.plain]).repeat || (gk && sameFactInPaper(q, o))
    );
    if (hit) {
      const [keep, replace] = human(q) && !human(hit) ? [q, hit] : [hit, q];
      repeats.push({ keep: short(keep), replace: { ...short(replace), tests: testsOf.get(String(replace._id)) || [] } });
    } else {
      bucket.push({ ...q, plain: text });
      bySignature.set(sig, bucket);
    }
  }

  const missingTests = Object.values(grid).reduce((n, row) => n + Object.values(row).reduce((m, c) => m + (c.missing || 0), 0), 0);
  return {
    chapter,
    topics,
    testsPerLevel: TESTS_PER_LEVEL,
    testSize: PRACTICE_TEST_SIZE,
    tests: tests.length,
    missingTests,
    liveQuestions: pool.size,
    grid,
    testProblems,
    ruleFailures,
    notation,
    repeats,
    levels: LEVELS,
  };
}

module.exports = { chapterHealth };
