const Question = require("../models/Question");
const Test = require("../models/Test");
const { ruleBasedCheck } = require("./validationPipeline");

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
function prepareRow(row, { examType, source, subjectFallback, pyq }) {
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
    source,
    status: "published",
    createdBy: "admin",
    ...(pyq || {}),
  };

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
  const hard = issues.filter((i) => HARD_FAULTS.some((re) => re.test(i)));
  const soft = issues.filter((i) => !HARD_FAULTS.some((re) => re.test(i)));
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
async function addManualQuestions(testId, rows, { dryRun = false, source } = {}) {
  const test = await Test.findById(testId);
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

  const accepted = [];
  const rejected = [];
  const warned = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 1;
    const { question, errors, warnings } = prepareRow(row, {
      examType: test.examType,
      source: resolvedSource,
      subjectFallback: test.subject,
      pyq,
    });

    const key = question.text.toLowerCase();
    if (key && existingTexts.has(key)) warnings.push("this exact question is already in this paper");
    if (key && seenInBatch.has(key)) warnings.push("this question appears twice in what you sent");
    if (key) seenInBatch.add(key);
    if (known.size && question.subject && !known.has(question.subject)) {
      warnings.push(`"${question.subject}" is not a section of this exam (${[...known].join(", ")})`);
    }

    if (errors.length) {
      rejected.push({ row: rowNumber, text: question.text.slice(0, 80), errors });
      return;
    }
    if (warnings.length) warned.push({ row: rowNumber, text: question.text.slice(0, 80), warnings });
    accepted.push(question);
  });

  let added = 0;
  if (!dryRun && accepted.length) {
    const created = await Question.insertMany(accepted, { ordered: true });
    // $push keeps the paper in row order and avoids re-validating the whole
    // test document, which fails on tests created under an older schema.
    await Test.updateOne({ _id: test._id }, { $push: { questions: { $each: created.map((q) => q._id) } } });
    added = created.length;
  }

  return {
    dryRun,
    checked: rows.length,
    wouldAdd: accepted.length,
    added,
    rejected,
    warned,
    paperSize: test.questions.length + added,
  };
}

module.exports = { addManualQuestions, prepareRow, parseCorrect, parseCorrectIndex };
