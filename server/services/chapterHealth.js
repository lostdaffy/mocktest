// Everything about one chapter's practice tests that the per-question gate
// cannot see on its own: whether each subtopic has its tests, whether every
// test is full and live, whether a test repeats itself, and whether two live
// questions of the chapter are the same question. Each live question is also
// put through the rule gate again (no AI - the AI half is the audit).
const Question = require("../models/Question");
const Test = require("../models/Test");
const { ruleBasedCheck, looksLikeRepeat, sameFactInPaper, numberSignature } = require("./validationPipeline");
const { PRACTICE_TEST_SIZE } = require("./testTopUp");

const LEVELS = ["easy", "medium", "hard", "advanced"];
// Advanced tests draw on the bank's hardest two grades.
const GRADES_FOR = { easy: ["easy"], medium: ["medium"], hard: ["hard"], advanced: ["hard", "exam"] };
// Typeset maths that was never turned into plain text.
const LATEX = /\\(frac|times|div|sqrt|cdot|left|right|text|pm|le|ge|ne)\b|\$[^$\n]{1,80}\$/;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function chapterHealth(chapter) {
  const tests = await Test.find({ type: "practice", title: new RegExp(`^${escape(chapter)} · `) })
    .select("title difficultyLevel publishStatus questions")
    .lean();
  const ids = [...new Set(tests.flatMap((t) => t.questions.map(String)))];
  const inTests = await Question.find({ _id: { $in: ids } }).lean();
  const byId = new Map(inTests.map((q) => [String(q._id), q]));
  const live = await Question.find({
    status: "published",
    $or: [{ chapter }, { chapter: { $in: [null, ""] }, topic: chapter }],
  }).lean();

  // ---- the grid: subtopic x level -> tests
  const grid = {};
  const testProblems = [];
  for (const t of tests) {
    const [, subtopic = "?", rest = ""] = t.title.split(" · ");
    const level = (t.difficultyLevel || rest.split(" ")[0] || "?").toLowerCase();
    grid[subtopic] = grid[subtopic] || {};
    const cell = (grid[subtopic][level] = grid[subtopic][level] || { tests: 0, full: 0, live: 0 });
    cell.tests++;
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
        const a = present[i];
        const b = present[j];
        if (sameFactInPaper(a, b) || looksLikeRepeat(a.text, [b.text]).repeat) {
          problems.push(`asks the same thing twice: "${a.text.slice(0, 70)}" / "${b.text.slice(0, 70)}"`);
        }
      }
    }
    const grades = GRADES_FOR[level];
    const offLevel = grades ? present.filter((q) => q.difficulty && !grades.includes(q.difficulty)).length : 0;
    if (offLevel) problems.push(`${offLevel} question(s) graded for another level`);
    if (subtopic !== "Mixed Practice") {
      const offTopic = present.filter((q) => q.topic && q.topic !== subtopic && q.topic !== chapter).length;
      if (offTopic) problems.push(`${offTopic} question(s) from another subtopic`);
    }
    if (problems.length) testProblems.push({ _id: t._id, title: t.title, problems });
  }

  // ---- every live question through the rule gate again
  const pool = new Map([...live, ...inTests.filter((q) => q.status === "published")].map((q) => [String(q._id), q]));
  const ruleFailures = [];
  const latex = [];
  for (const q of pool.values()) {
    const { passed, issues } = ruleBasedCheck(q);
    if (!passed) ruleFailures.push({ _id: q._id, text: String(q.text).slice(0, 120), issues });
    const fields = [q.text, q.textHi, q.solution, q.solutionHi, ...(q.options || []), ...(q.optionsHi || [])];
    if (fields.some((f) => LATEX.test(String(f || "")))) latex.push({ _id: q._id, text: String(q.text).slice(0, 120) });
  }

  // ---- the same question twice in the chapter (same key, or same numbers
  // and mostly the same words)
  const repeats = [];
  const byKey = new Map();
  const bySignature = new Map();
  for (const q of pool.values()) {
    if (q.textKey) {
      if (byKey.has(q.textKey)) repeats.push({ a: byKey.get(q.textKey), b: q, how: "same key" });
      else byKey.set(q.textKey, q);
    }
    const sig = numberSignature(q.text);
    const bucket = bySignature.get(sig) || [];
    const hit = sig && bucket.find((o) => looksLikeRepeat(q.text, [o.text]).repeat);
    if (hit && hit.textKey !== q.textKey) repeats.push({ a: hit, b: q, how: "same numbers, same words" });
    bucket.push(q);
    bySignature.set(sig, bucket);
  }

  return {
    chapter,
    tests: tests.length,
    liveQuestions: pool.size,
    grid,
    testProblems,
    ruleFailures,
    latex,
    repeats: repeats.map(({ a, b, how }) => ({
      how,
      a: { _id: a._id, text: String(a.text).slice(0, 120) },
      b: { _id: b._id, text: String(b.text).slice(0, 120) },
    })),
    levels: LEVELS,
  };
}

module.exports = { chapterHealth };
