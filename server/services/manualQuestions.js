const Question = require("../models/Question");
const Test = require("../models/Test");
const { ruleBasedCheck, questionKey, looksLikeRepeat, numberSignature } = require("./validationPipeline");
const { plainMaths, plainMathsUpdate } = require("./mathNotation");

// Questions a person typed or pasted in: a human-made mock, or a previous
// year paper entered by hand. One implementation for both, because the rules
// are the same and two copies drift - see the practice builder and the test
// stub, both of which taught that lesson the hard way.
//
// What is deliberately NOT done here, although the AI path does all of it:
//
//   - No AI verification. It spends the day's allowance, and it would put a
//     model's opinion above the person who wrote the question.
//   - No shuffling. A previous year paper has to read the way the real paper
//     read, option order included; a human mock is laid out on purpose.
//   - No dedupe against the bank. The same question genuinely appears in
//     more than one year's paper, and that is worth knowing, not hiding.
//
// Only what makes a question impossible to save is refused. Everything else
// the quality gate would have said comes back as a warning - the admin has
// the last word on a question they wrote, but they should hear the gate.

// Real papers often carry no printed solution and a human mock may be
// English-only, so these are warnings for a person, never refusals.
const HARD_FAULTS = [/must have exactly 4 options/, /an option is empty/, /correctIndex out of range/];
// A practice test filled from a spreadsheet is held to the gate's bar: these
// are refused too, not just reported.
const STRICT_FAULTS = [/duplicate options/, /maths check/, /maths working/, /solution never arrives/, /mixed script/];

/**
 * The correct answer as a person writes it: A-D, or 1-4 where 1 is the FIRST
 * option. Always. A spreadsheet sends "1" as text and a form may send 1 as a
 * number, and those must mean the same thing - reading one as A and the other
 * as B would mis-key a whole file without a single error. 0 is refused rather
 * than guessed at, for the same reason.
 */
function parseCorrect(value) {
  if (value === undefined || value === null || value === "") return null;
  const v = String(value).trim().toUpperCase();
  if (/^[A-D]$/.test(v)) return v.charCodeAt(0) - 65;
  if (/^[1-4]$/.test(v)) return Number(v) - 1;
  return null;
}

/** correctIndex from a program: 0-3, zero-based, as the model stores it. */
function parseCorrectIndex(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 3 ? n : null;
}

const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());

/**
 * Turns one incoming row into a question, plus what is wrong with it.
 * Nothing is saved here.
 */
function prepareRow(row, { examType, source, subjectFallback, pyq, strict = false }) {
  const options = [row.optionA, row.optionB, row.optionC, row.optionD].map(clean);
  const optionsHi = [row.optionAHi, row.optionBHi, row.optionCHi, row.optionDHi].map(clean);
  const hasHindiOptions = optionsHi.some(Boolean);

  const question = {
    text: clean(row.question ?? row.text),
    textHi: clean(row.questionHi ?? row.textHi),
    options: row.options ? row.options.map(clean) : options,
    optionsHi: row.optionsHi ? row.optionsHi.map(clean) : hasHindiOptions ? optionsHi : [],
    correctIndex: row.correct !== undefined && row.correct !== "" ? parseCorrect(row.correct) : parseCorrectIndex(row.correctIndex),
    solution: clean(row.solution),
    solutionHi: clean(row.solutionHi),
    subject: clean(row.subject) || subjectFallback || "",
    topic: clean(row.topic) || clean(row.subject) || subjectFallback || "General",
    difficulty: ["easy", "medium", "hard"].includes(clean(row.difficulty).toLowerCase())
      ? clean(row.difficulty).toLowerCase()
      : "medium",
    examType: [examType],
    examStage: examType,
    ...(clean(row.formula) ? { formula: clean(row.formula) } : {}),
    source,
    status: "published",
    createdBy: "admin",
    ...(pyq || {}),
  };

  // 2^15 * 3^10 typed in a spreadsheet reaches the student as typed; it is
  // saved as 2¹⁵ × 3¹⁰ (services/mathNotation.js).
  Object.assign(question, plainMathsUpdate(question) || {});

  // A real past paper prints no solution, and the model requires one. Say so
  // in words a student will read, rather than leave a blank that looks like
  // a fault or invent an explanation nobody checked.
  const noSolution = !question.solution;
  if (noSolution) {
    question.solution = "The official paper does not include a solution for this question.";
    question.solutionHi = question.solutionHi || "आधिकारिक पेपर में इस प्रश्न का हल नहीं दिया गया है।";
  }

  const errors = [];
  if (!question.text) errors.push("the question has no text");
  if (!question.subject) errors.push("no subject - say which section this belongs to");

  const { issues } = ruleBasedCheck(question);
  const faults = strict ? [...HARD_FAULTS, ...STRICT_FAULTS] : HARD_FAULTS;
  const hard = issues.filter((i) => faults.some((re) => re.test(i)));
  const soft = issues.filter((i) => !faults.some((re) => re.test(i)));
  errors.push(...hard.map(humanise));

  // The placeholder above is not a solution, so the gate's view of it is
  // noise. For a real paper a missing solution is normal and not worth a
  // word; for a human-made mock it is worth saying once, plainly.
  // Judged on what the person actually sent - the placeholder solution
  // above carries Hindi of its own and must not make this look "partly" done.
  const rest = soft.filter((i) => !/^Hindi /.test(i) && !(noSolution && /solution/i.test(i)));
  const warnings = rest.map(humanise);
  if (noSolution && source !== "pyq") warnings.push("no solution - students will see that none was provided");
  // Three separate "no Hindi ..." lines drowned out the warnings that
  // matter, like two identical options. One line, and last.
  const sentHindi = [question.textHi, ...(question.optionsHi || []), noSolution ? "" : question.solutionHi].filter(Boolean).length;
  const wantedHindi = 1 + 4 + (noSolution ? 0 : 1);
  if (sentHindi === 0) warnings.push("no Hindi version");
  else if (sentHindi < wantedHindi) warnings.push("Hindi version is incomplete");

  return { question, errors, warnings };
}

function humanise(issue) {
  const map = {
    "must have exactly 4 options": "needs exactly four options",
    "an option is empty": "one of the four options is empty",
    "correctIndex out of range": "the correct answer is missing or not A-D",
    "duplicate options found": "two options are the same, so more than one answer is right",
    "question text too short": "the question is very short - check it is complete",
    "solution too short to explain anything": "the solution is too short to teach anything",
    "solution is just the option text": "the solution only repeats the answer",
    "Hindi question missing": "no Hindi version of the question",
    "Hindi options missing": "no Hindi options",
    "Hindi solution missing": "no Hindi solution",
  };
  return map[issue] || issue;
}

/**
 * Checks and, unless dryRun, adds questions to a test in the order given.
 *
 * Rows with errors are skipped and reported by row number; rows with only
 * warnings are added and the warnings returned. The order of the paper is the
 * order of the rows - a previous year paper must read as it was set.
 */
async function addManualQuestions(testId, rows, { dryRun = false, source, strict = false, maxAdd, examTypes } = {}) {
  // A test not created yet (a dry run of a spreadsheet that names new tests)
  // comes in as an object, and is only checked against.
  const test = testId && testId.virtual ? testId : await Test.findById(testId);
  if (!test) {
    const err = new Error("Test not found");
    err.status = 404;
    throw err;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error("No questions were sent");
    err.status = 400;
    throw err;
  }
  if (rows.length > 300) {
    const err = new Error("At most 300 questions at a time - split the file");
    err.status = 400;
    throw err;
  }

  const isPyq = test.type === "pyq";
  const pyq = isPyq
    ? { pyqYear: test.pyqYear, pyqShift: test.pyqShift, pyqExamName: test.title }
    : null;
  const resolvedSource = source || (isPyq ? "pyq" : "manual");

  // Sections this paper has, so a row filed under a subject the exam never
  // asks is caught before a student meets it.
  const known = new Set(
    (test.sectionRules || []).flatMap((r) => [r.subject, ...(r.sources || [])]).filter(Boolean)
  );
  const existingTexts = new Set(
    (await Question.find({ _id: { $in: test.questions } }).select("text").lean()).map((q) => q.text.trim().toLowerCase())
  );
  const seenInBatch = new Set();
  const inTest = new Set((test.questions || []).map(String));
  const replacedSeen = new Set();

  const accepted = [];
  const replacing = []; // per accepted row: the id it takes the place of, or ""
  const replaceReasons = [];
  const rejected = [];
  const warned = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 1;
    const { question, errors, warnings } = prepareRow(row, {
      examType: test.examType,
      source: resolvedSource,
      subjectFallback: test.subject,
      pyq,
      strict,
    });
    question.textKey = questionKey(question.text);
    // A practice question belongs to the exams its chapter is tagged for,
    // the way the generator tags its own - not to "PRACTICE", which no mock
    // ever asks for.
    if (examTypes?.length) question.examType = [...examTypes];
    if (!question.chapter && test.topic) question.chapter = test.topic;

    const key = question.text.toLowerCase();
    if (key && existingTexts.has(key)) warnings.push("this exact question is already in this paper");
    if (key && seenInBatch.has(key)) warnings.push("this question appears twice in what you sent");
    if (key) seenInBatch.add(key);
    if (known.size && question.subject && !known.has(question.subject)) {
      warnings.push(`"${question.subject}" is not a section of this exam (${[...known].join(", ")})`);
    }

    // A row may name a question of this test it replaces: it takes that
    // question's place and the old one is rejected - no hole, nothing asked
    // of a model. Such a row needs no room.
    const replaces = clean(row.replaces);
    if (replaces) {
      if (!inTest.has(replaces)) errors.push("the question it replaces is not in this test");
      else if (replacedSeen.has(replaces)) errors.push("another row already replaces that question");
    } else if (maxAdd !== undefined && replacing.filter((x) => !x).length >= maxAdd) {
      errors.push(`the test is full - it only needed ${maxAdd} more`);
    }
    if (errors.length) {
      rejected.push({ row: rowNumber, text: question.text.slice(0, 80), errors });
      return;
    }
    if (warnings.length) warned.push({ row: rowNumber, text: question.text.slice(0, 80), warnings });
    if (replaces) replacedSeen.add(replaces);
    accepted.push(question);
    replacing.push(replaces);
    replaceReasons.push(clean(row.replaceReason));
  });

  let added = 0;
  let replaced = 0;
  let createdIds = [];
  if (!dryRun && accepted.length) {
    const created = await Question.insertMany(accepted, { ordered: true });
    const pushed = created.filter((_, k) => !replacing[k]);
    // $push keeps the paper in row order and avoids re-validating the whole
    // test document, which fails on tests created under an older schema.
    if (pushed.length) await Test.updateOne({ _id: test._id }, { $push: { questions: { $each: pushed.map((q) => q._id) } } });
    const history = require("./questionHistory");
    for (let k = 0; k < created.length; k++) {
      await history.record(created[k]._id, "create", { after: created[k], note: "Added from a spreadsheet" });
      if (!replacing[k]) continue;
      // Into the same place in every test that held the old one.
      await Test.updateMany({ questions: replacing[k] }, { $set: { "questions.$": created[k]._id } });
      await history.change(
        replacing[k],
        { status: "rejected", flagReason: replaceReasons[k] || "Replaced by a checked question" },
        { action: "replaced", note: "Replaced by a spreadsheet row", replacedBy: created[k]._id }
      );
      replaced++;
    }
    added = pushed.length;
    createdIds = created.map((q) => q._id);
    await queueQualityCheck(createdIds, "csv");
  }

  return {
    dryRun,
    checked: rows.length,
    wouldAdd: replacing.filter((x) => !x).length,
    wouldReplace: replacing.filter(Boolean).length,
    added,
    replaced,
    rejected,
    warned,
    paperSize: test.questions.length + added,
    createdIds,
  };
}

// After an upload, the AI checks every new question in the background - its
// answer, solution, language and repeats - if the quality desk says so. Jobs
// of 20 wait in the generation queue; an exhausted AI allowance only delays
// them, the questions are already in (they passed the rule gate to get in).
async function queueQualityCheck(ids, source) {
  if (!ids.length) return;
  try {
    const QualitySettings = require("../models/QualitySettings");
    if (!(await QualitySettings.get()).checkCsvUploads) return;
    const GenerationJob = require("../models/GenerationJob");
    const jobs = [];
    for (let i = 0; i < ids.length; i += 20) {
      jobs.push({ kind: "quality_check", questionIds: ids.slice(i, i + 20), source, label: `AI check of ${Math.min(20, ids.length - i)} uploaded question(s)`, status: "queued" });
    }
    await GenerationJob.insertMany(jobs);
  } catch (err) {
    console.error("Queueing the AI check:", err.message);
  }
}

// ---- practice tests from one spreadsheet
//
// Each row names its test in a "test" column (the test's id, or its exact
// title), so one file can fill a whole chapter's tests. A test is filled up
// to its size and no further; a question the bank already has (same wording)
// is refused - a practice test should not repeat the bank. A row with a
// "replaces" column (a question id in that test) takes that question's place
// and the old one is rejected, so a bad question is swapped out with no gap
// and no model asked for a replacement.
async function addPracticeCsv(rows, { dryRun = false } = {}) {
  const { PRACTICE_TEST_SIZE } = require("../utils/practice");
  if (!Array.isArray(rows) || !rows.length) throw Object.assign(new Error("No rows were sent"), { status: 400 });
  if (rows.length > 1500) throw Object.assign(new Error("At most 1500 rows at a time - split the file"), { status: 400 });

  const Subject = require("../models/Subject");
  const ExamPattern = require("../models/ExamPattern");
  const LEVELS = { Easy: "easy", Medium: "medium", Hard: "hard", Advanced: "advanced" };
  const chapterCache = new Map();
  const chapterOf = async (subject, chapter) => {
    const k = `${subject}|${chapter}`;
    if (!chapterCache.has(k)) {
      const doc = await Subject.findOne({ $or: [{ name: subject }, { aliases: subject }] }).lean();
      const ch = (doc?.chapters || []).find((c) => c.name === chapter) || null;
      let exams = ch?.exams?.length ? ch.exams : null;
      if (ch && !exams) exams = (await ExamPattern.find({ isActive: true }).select("examType").lean()).map((e) => e.examType);
      chapterCache.set(k, ch ? { subject: doc.name, chapter: ch, exams } : null);
    }
    return chapterCache.get(k);
  };

  const groups = new Map();
  const unknown = [];
  const created = new Map(); // title -> test, for tests this file makes
  for (let i = 0; i < rows.length; i++) {
    const ref = String(rows[i].test || "").trim();
    let test = null;
    if (/^[a-f0-9]{24}$/i.test(ref)) test = await Test.findById(ref).select("title type questions subject topic subtopic examType publishStatus publishedAt").lean();
    else if (ref) test = created.get(ref) || (await Test.findOne({ title: ref, type: "practice" }).select("title type questions subject topic subtopic examType publishStatus publishedAt").lean());
    // A test that does not exist yet is made, if its title is a practice
    // test's title for a chapter and topic the catalog has:
    // "Number System · Unit Digit · Easy #3".
    const m = !test && ref.match(/^(.+?) · (.+?) · (Easy|Medium|Hard|Advanced) #(\d+)$/);
    if (m) {
      const info = await chapterOf(String(rows[i].subject || "").trim(), m[1]);
      const sub = m[2] === "Mixed Practice" ? null : m[2];
      if (!info) {
        unknown.push({ row: i + 1, test: ref, errors: [`"${m[1]}" is not a chapter of "${rows[i].subject || "?"}" in Subjects`] });
        continue;
      }
      if (sub && !(info.chapter.topics || []).includes(sub)) {
        unknown.push({ row: i + 1, test: ref, errors: [`"${sub}" is not a topic of ${m[1]} - add it in Subjects first`] });
        continue;
      }
      const fields = {
        title: ref, type: "practice", examType: "PRACTICE", examStage: "PRACTICE", subject: info.subject, topic: m[1],
        ...(sub ? { subtopic: sub } : {}), difficultyLevel: LEVELS[m[3]], seriesNumber: Number(m[4]),
        questions: [], durationMinutes: 10, publishStatus: "draft", createdBy: "admin",
      };
      test = dryRun ? { ...fields, _id: `new:${ref}`, virtual: true, sectionRules: [] } : (await Test.create(fields)).toObject();
      test.isNew = true;
      created.set(ref, test);
    }
    if (!test || test.type !== "practice") {
      unknown.push({ row: i + 1, test: ref, errors: [ref ? "no practice test with this id or title" : "the test column is empty"] });
      continue;
    }
    const key = String(test._id);
    if (!groups.has(key)) groups.set(key, { test, rows: [], rowNumbers: [] });
    groups.get(key).rows.push(rows[i]);
    groups.get(key).rowNumbers.push(i + 1);
  }

  const tests = [];
  const rejected = [...unknown];
  const warned = [];
  let wouldAdd = 0;
  let added = 0;
  let wouldReplace = 0;
  let replaced = 0;
  // The same question reworded is still a repeat: the chapter's live
  // questions, and the rows of this file already taken, are what a new row
  // must not repeat (same numbers and mostly the same words - the rule the
  // generator holds its own questions to). Bucketed by their numbers, since
  // only questions with the same numbers can be repeats.
  const banks = new Map();
  const bankOf = async (chapter) => {
    if (!banks.has(chapter)) {
      const live = await Question.find({
        status: { $ne: "rejected" },
        $or: [{ chapter }, { chapter: { $in: [null, ""] }, topic: chapter }],
      }).select("text").lean();
      const bySig = new Map();
      for (const q of live) {
        const text = plainMaths(q.text);
        const sig = numberSignature(text);
        if (!bySig.has(sig)) bySig.set(sig, []);
        bySig.get(sig).push({ _id: String(q._id), text });
      }
      banks.set(chapter, bySig);
    }
    return banks.get(chapter);
  };

  for (const { test, rows: mine, rowNumbers } of groups.values()) {
    const keep = [];
    const keepNumbers = [];
    const bySig = await bankOf(test.topic);
    for (let k = 0; k < mine.length; k++) {
      const text = plainMaths(String(mine[k].question ?? mine[k].text ?? "").trim());
      const replaces = String(mine[k].replaces || "").trim();
      const exists = text && (await Question.exists({ textKey: questionKey(text), status: { $ne: "rejected" }, _id: { $ne: /^[a-f0-9]{24}$/i.test(replaces) ? replaces : null } }));
      const sig = numberSignature(text);
      const near = text && !exists ? looksLikeRepeat(text, (bySig.get(sig) || []).filter((o) => o._id !== replaces).map((o) => o.text)) : { repeat: false };
      if (exists) rejected.push({ row: rowNumbers[k], test: test.title, text: text.slice(0, 80), errors: ["already in the question bank"] });
      else if (near.repeat) rejected.push({ row: rowNumbers[k], test: test.title, text: text.slice(0, 80), errors: [`repeats a question already in this chapter: "${String(near.of).slice(0, 100)}"`] });
      else {
        keep.push(mine[k]);
        keepNumbers.push(rowNumbers[k]);
        // Taken: later rows of this file must not repeat it either.
        if (!bySig.has(sig)) bySig.set(sig, []);
        bySig.get(sig).push({ _id: `row:${rowNumbers[k]}`, text });
      }
    }
    const room = Math.max(0, PRACTICE_TEST_SIZE - (test.questions || []).length);
    const info = await chapterOf(test.subject, test.topic);
    const r = keep.length
      ? await addManualQuestions(test.virtual ? test : test._id, keep, { dryRun, source: "manual", strict: true, maxAdd: room, examTypes: info?.exams })
      : { wouldAdd: 0, added: 0, wouldReplace: 0, replaced: 0, rejected: [], warned: [] };
    // Full: a minute a question, and the test goes live - one this file made,
    // or one never published that a file has now filled (a test the admin
    // took off the app has a publishedAt, and stays off until they say).
    if (!dryRun && r.added) {
      const size = (test.questions || []).length + r.added;
      const goesLive = size >= PRACTICE_TEST_SIZE && (test.isNew || (test.publishStatus === "draft" && !test.publishedAt));
      await Test.updateOne(
        { _id: test._id },
        { $set: { durationMinutes: Math.max(10, size), ...(goesLive ? { publishStatus: "published", publishedAt: new Date() } : {}) } }
      );
    }
    // Row numbers back to the file's, not the group's.
    for (const x of r.rejected) rejected.push({ ...x, row: keepNumbers[x.row - 1], test: test.title });
    for (const x of r.warned) warned.push({ ...x, row: keepNumbers[x.row - 1], test: test.title });
    wouldAdd += r.wouldAdd;
    added += r.added;
    wouldReplace += r.wouldReplace;
    replaced += r.replaced;
    tests.push({ testId: test._id, title: test.title, created: !!test.isNew, had: (test.questions || []).length, after: (test.questions || []).length + r.wouldAdd, replaces: r.wouldReplace, of: PRACTICE_TEST_SIZE });
  }
  rejected.sort((a, b) => a.row - b.row);
  warned.sort((a, b) => a.row - b.row);
  return { dryRun, checked: rows.length, wouldAdd, added, wouldReplace, replaced, tests, rejected, warned };
}

module.exports = { addManualQuestions, addPracticeCsv, prepareRow, parseCorrect, parseCorrectIndex };
