// Preloaded with mock-stub.cjs for pyq-import-test: stands in for the model's
// reading of a past paper, page by page, with every awkward case a real paper
// has - a key in the paper and one only at the back, none at all, a figure, a
// Hindi-only question, five options, a passage that is missing, a question
// read twice across a page break, and a question that never turns up.
const path = require("path");
const fs = require("fs");
require("./mock-stub.cjs");
const SERVER = path.resolve(__dirname, "..");
const ex = require(path.join(SERVER, "services/pyqExtractor"));
const LOG = path.join(__dirname, "pyq-calls.jsonl");
const log = (o) => fs.appendFileSync(LOG, JSON.stringify(o) + "\n");

const q = (number, page, text, options, answer, more = {}) => ({
  number, section: "Quantitative Aptitude", page, passage: "", passageHi: "",
  textEn: text, textHi: "", optionsEn: options, optionsHi: [], needsFigure: false,
  answer, solutionEn: "", solutionHi: "", ...more,
});

ex.detectPaperInfo = async () => {
  log({ call: "info" });
  return { examName: "SSC CGL Tier 1", examDate: "2025-09-10", shift: "Shift 2", year: 2025, language: "bilingual", totalQuestions: 9 };
};

let failedOnce = false;
ex.extractPages = async (b64, { first, last, withNextPage }) => {
  log({ call: "pages", first, last, withNextPage, bytes: b64.length });
  // A three-page paper whose last call fails once, to test carrying on.
  if (first === 3 && last === 3 && !withNextPage) {
    if (!failedOnce) {
      failedOnce = true;
      throw new Error("Gemini kept returning invalid JSON. Try again.");
    }
    return { questions: [q(10, 3, "What is 10% of 500?", ["40", "50", "60", "70"], "(b)")], answerKey: [] };
  }
  if (first === 1) {
    return {
      questions: [
        q(1, 1, "What is 20% of 150?", ["20", "30", "40", "50"], "(b)"),
        q(2, 1, "What is 25% of 80?", ["10", "20", "30", "40"], null),
        q(3, 2, "What is 50% of 90?", ["40", "45", "50", "55"], "c"),
        // Cut short at the page break; read whole by the next call.
        q(4, 2, "Which figure", ["A", "B", "C", "D"], "B", { needsFigure: true }),
      ],
      answerKey: [],
    };
  }
  if (first === 3) {
    return {
      questions: [
        q(4, 2, "Which figure completes the series shown below?", ["Figure A", "Figure B", "Figure C", "Figure D"], "B", { needsFigure: true }),
        q(5, 3, "A number increased by 10% is 110. The number is", ["90", "100", "105", "120"], "(2)"),
        { ...q(6, 4, "", [], "(ख)"), textHi: "60 का 50% क्या है?", optionsHi: ["20", "30", "40", "50"] },
        q(7, 4, "From the passage, how many students passed?", ["12", "15", "18", "20", "25", "30"], "b", {
          passage: "In a class of 40 students, 15 passed the exam and the rest failed. Of those who failed, half took a retest the following week.",
        }),
      ],
      answerKey: [],
    };
  }
  if (first === 5) {
    return {
      questions: [q(8, 5, "According to the passage, why did the author leave the village?", ["Work", "Study", "Family", "Health"], null)],
      answerKey: [{ number: 2, section: "Quantitative Aptitude", answer: "B" }],
    };
  }
  return { questions: [], answerKey: [] };
};

// The AI always picks the second option and says so in words.
ex.solveRows = async (items) => {
  log({ call: "solve", n: items.length });
  return items.map((it) => ({ id: it.id, working: `Worked: the answer is ${it.options[1]}.`, answer: it.options[1] }));
};

ex.translateRows = async (items, to) => {
  log({ call: "translate", to, n: items.length });
  const tag = to === "hi" ? "हिंदी " : "English ";
  return items.map((it) => ({
    id: it.id,
    text: tag + it.text,
    options: (it.options || []).map((o) => tag + o),
    passage: it.passage ? tag + it.passage : "",
    solution: it.solution ? tag + it.solution : "",
  }));
};

ex.tagRows = async (items) => {
  log({ call: "tag", n: items.length });
  return items.map((it) => ({ id: it.id, subject: "Maths", topic: "Percentage" }));
};

console.log("[stub] PYQ reading stubbed");
