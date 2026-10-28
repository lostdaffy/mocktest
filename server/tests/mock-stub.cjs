// Preloaded into the server under test (node -r). Replaces Gemini with a
// local generator so mock generation runs instantly and costs nothing, and
// logs every call so the test can inspect what the generator was given.
const STUB_WORDS = "apples rivers trains clocks coins ladders gardens pipes boats candles shelves tickets bridges lamps kites wells towers drums maps seeds rockets parrots marbles tunnels baskets mirrors bottles engines blankets pencils".split(" ");
const path = require("path");
const fs = require("fs");
const SERVER = require("path").resolve(__dirname, "..");
const CALLS = path.join(__dirname, "gen-calls.jsonl");

let n = 0;
const allowanceUsed = {};
const gemini = require(path.join(SERVER, "services/geminiService"));
// Mirrors the real generateQuestions, including the tags it stamps on every
// question - the controllers rely on those being present.
gemini.generateQuestions = async ({ examType, subject, difficulty, count, pyqExamples, examLevel, syllabusTopics, avoidTexts }) => {
  fs.appendFileSync(
    CALLS,
    JSON.stringify({
      subject,
      difficulty,
      count,
      pyqExamples: pyqExamples || [],
      examLevel: examLevel || "",
      avoidTexts: avoidTexts || [],
      syllabusTopics: syllabusTopics || [],
    }) + "\n"
  );
  // Mirrors the real generator: one REAL topic per question, handed out in
  // turn, never the joined "A, B" string that matches nothing.
  // A deliberate hook for the barren path: the branch that runs when the
  // generator produces nothing. It is only reached when the day's allowance
  // is spent, so it went untested and shipped a "res is not defined" - the
  // builder reaching for an HTTP response it no longer has.
  if (subject === "NothingComesBack") return [];

  // The allowance gone before a practice test's first batch: the builder must
  // say so in the words the queue reads, not "rate limit or API issue".
  if (subject === "AllowanceGone") {
    throw new Error("Every model has used its allowance for today (gemini-3.1-flash-lite). Generation can continue tomorrow.");
  }

  // The day's allowance running out part way through a mock. An exam whose
  // level says ALLOWANCE_AFTER_<n> gets n batches and then the exact error
  // the real model rotation throws. This is how SSC CHSL was "done" at 9 of
  // 100 - every batch after the first failed, was skipped, and the job was
  // reported finished.
  const cap = /ALLOWANCE_AFTER_(\d+)/.exec(examLevel || "");
  if (cap) {
    allowanceUsed[examType] = (allowanceUsed[examType] || 0) + 1;
    if (allowanceUsed[examType] > Number(cap[1])) {
      throw new Error(
        "Every model has used its allowance for today (gemini-3.1-flash-lite, gemini-3.5-flash-lite, gemini-3.8-flash). Generation can continue tomorrow."
      );
    }
  }

  // The tags come from the real tagGenerated, not from a copy made here.
  // This stub used to re-implement it, and the copy carried the same fault -
  // it handed out the syllabus OBJECT as a question topic, which is the bug
  // no suite could catch precisely because the stub agreed with the code.
  const raw = Array.from({ length: count }, () => {
    n += 1;
    return {
      // Two words that change with n: real questions differ in more than a
      // number, and the gate refuses a fourth question of one pattern.
      text: `AI ${subject} ${difficulty} #${n} (${STUB_WORDS[n % STUB_WORDS.length]} ${STUB_WORDS[(n * 7 + 3) % STUB_WORDS.length]})`,
      // A different answer each time: one paper must not ask the same thing
      // with the same answer twice (sameFactInPaper).
      options: [`${n}1`, `${n}2`, `${n}3`, `${n}4`],
      correctIndex: 0,
      solution: "stub solution",
      // No topic: like the real model on a bad day, so the fallback runs.
    };
  });
  return gemini.tagGenerated(raw, { examType, subject, topic: subject, difficulty, syllabusTopics });
};

// Nothing here may reach the real API. A suite that quietly calls Gemini
// passes while the day's allowance lasts and fails after it is spent, which
// is exactly what happened: reject-test went green all morning and then
// started reporting "Every model has used its allowance for today" - a
// failure of the test setup wearing the costume of a product bug.
gemini.repairQuestion = async (q) => ({
  ...q,
  solution: "Step 1: work it through. Step 2: the answer follows. Answer confirmed.",
  solutionHi: "चरण 1: हल करें। चरण 2: उत्तर मिलता है।",
});
gemini.verifyQuestions = async (qs) => qs.map(() => ({ matches: true, confidence: 1 }));
gemini.verifyQuestion = async () => ({ matches: true, confidence: 1 });
gemini.callGemini = async () => {
  throw new Error("callGemini reached the real API from a test - stub whatever called it");
};

// The pipeline verifies a whole batch in one Gemini call; stub it out so the
// tests neither call the API nor need a key.
const pipeline = require(path.join(SERVER, "services/validationPipeline"));
const publish = (q) => ({ ...q, status: "published", aiConfidenceScore: 1 });
pipeline.runValidationPipelineBatch = async (questions) => questions.map(publish);
pipeline.runValidationPipeline = async (question) => publish(question);

// Chart and figure questions. The model is faked, but everything after it -
// the chart/figure normalising and the answer cross-check - is the real code:
// each call also returns one question whose marked answer is wrong, which the
// real check must throw out.
const visualGen = require(path.join(SERVER, "services/visualGenerator"));
const visuals = require(path.join(SERVER, "services/visuals"));
let v = 0;
visualGen.generateVisualQuestions = async (params) => {
  const { kind, count } = params;
  fs.appendFileSync(CALLS, JSON.stringify({ visual: kind, subject: params.subject, count, syllabusTopics: params.syllabusTopics || [], chartType: params.chartType || null }) + "\n");
  let raw;
  if (kind === "chart") {
    v += 1;
    const base = 10 * v;
    raw = {
      chart: { type: "bar", title: `Sales ${v}`, unit: "lakh", categories: ["2019", "2020", "2021"], series: [{ name: "A", values: [base, base + 10, base + 20] }] },
      questions: [
        ...Array.from({ length: count }, (_, i) => ({
          text: `Chart ${v} q${i + 1}: what is the total of A across the three years?`,
          textHi: "हिंदी", options: [`${3 * base + 30 + i}`, `${3 * base + 30}`, `${3 * base + 31 + i}`, `${3 * base + 50 + i}`],
          optionsHi: ["1", "2", "3", "4"], correctIndex: 1, formula: `sum("A")`,
          solution: `${base} + ${base + 10} + ${base + 20} = ${3 * base + 30}`, solutionHi: "हल",
        })).map((q, i) => (i === 0 ? { ...q, options: [`${3 * base + 30}`, `${3 * base + 29}`, `${3 * base + 31}`, `${3 * base + 50}`], correctIndex: 0 } : q)),
        // Wrong on purpose: the chart says 30 for 2020 minus 2019 is 10.
        { text: `Chart ${v}: by how much did A grow from 2019 to 2020?`, textHi: "हिंदी", options: ["5", "10", "15", "20"], optionsHi: ["5", "10", "15", "20"], correctIndex: 0, formula: `v("A","2020") - v("A","2019")`, solution: "10 - 5 = 5", solutionHi: "हल" },
      ],
    };
  } else {
    const qs = [];
    for (let i = 0; i <= count; i++) {
      v += 1;
      // A different figure every time (a circle and a dot in two of the
      // eight free cells) - the bank treats one figure reworded as a repeat.
      const cells = [[1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]];
      const c1 = cells[v % 8];
      let c2 = cells[(v + 1 + Math.floor(v / 8)) % 8];
      if (c2 === c1) c2 = cells[(v + 2) % 8];
      const p1 = { elements: [
        { shape: "arrow", row: 1, col: 1, fill: "black", rotate: 0 },
        { shape: "circle", row: c1[0], col: c1[1], fill: "white" },
        { shape: "dot", row: c2[0], col: c2[1], fill: "black" },
      ] };
      const p2 = visuals.rotatePanel(p1, 90, 3);
      const p3 = visuals.rotatePanel(p2, 90, 3);
      const answer = visuals.rotatePanel(p3, 90, 3);
      const options = [answer, visuals.mirrorPanel(p3, 3), p3, visuals.waterPanel(p3, 3)];
      qs.push({
        text: `Figure ${v}: which answer figure comes next in the series?`,
        textHi: "श्रृंखला में अगली आकृति कौन सी है?",
        // The last one is marked wrong on purpose; the rule gives option A.
        correctIndex: i === count ? 2 : 0,
        solution: "Each figure turns 90 degrees clockwise.", solutionHi: "हर आकृति 90 अंश घूमती है।",
        figure: { layout: "series", grid: 3, rule: { type: "rotate", by: 90 }, question: [p1, p2, p3], options },
      });
    }
    raw = { questions: qs };
  }
  return visualGen.buildVisualQuestions(kind, raw, params).questions.slice(0, count);
};

// Passage sets: one passage and its questions. The model is faked; the
// building of the set (passage into every question, one passageSetId) is the
// real code.
const passageGen = require(path.join(SERVER, "services/passageSetGenerator"));
// Started at random, so a second process loading this stub (a test calling
// the refill in-process) does not write the server's first passage again.
let p = Math.floor(Math.random() * 100000);
passageGen.generatePassageSet = async (params) => {
  p += 1;
  fs.appendFileSync(CALLS, JSON.stringify({ passageSet: true, subject: params.subject, count: params.count }) + "\n");
  const words = Array.from({ length: 160 }, (_, i) => `शब्द${(i * 7 + p) % 97}`).join(" ");
  const raw = {
    passage: `गद्यांश ${p}: ${words}`,
    questions: Array.from({ length: params.count }, (_, i) => ({
      question: `गद्यांश ${p} का प्रश्न ${i + 1}: लेखक ${STUB_WORDS[(p * 5 + i) % STUB_WORDS.length]} के बारे में क्या कहता है ?`,
      options: [`${p}${i}क`, `${p}${i}ख`, `${p}${i}ग`, `${p}${i}घ`],
      correctIndex: 0,
      solution: "गद्यांश की दूसरी पंक्ति में यही कहा गया है।",
    })),
  };
  const built = passageGen.buildPassageSet(raw, { hindi: true });
  return gemini.tagGenerated(built.questions, params);
};

console.log("[stub] Gemini generation stubbed");
