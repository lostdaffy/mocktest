// Whether a question's answer key is PROVEN, worked out in code, rather than
// believed because a model said so.
//
// Two workings, written by two separate calls that never see each other's:
//
//   - the setter's  "formula"       written with the question
//   - the checker's "checkFormula"  written while solving it cold
//
// Each is run here (services/mathCheck.js - a small language, never eval'd)
// and must land on exactly one option. The key is PROVEN when both land on
// the ticked option. A model's arithmetic slip is the commonest fault in a
// generated maths question, and in a model's re-solve of one: on 2026-10-21
// four of six "the AI disagrees" disputes were the checker's own slips (2 for
// 3, 457 for 458, 103 for 97, 31 for 53). Run in code, a slip cannot happen;
// what is left to disagree about is the reading of the question, which is
// what a second opinion is for.
//
//   proven       both workings run and agree with the key
//   disproved    a working runs and lands on another option (or on none)
//   unproven     there is nothing to run (a ratio, a statement, a word answer)
//
// No requires beyond mathCheck: the same verdict is reached in the generator,
// the spreadsheet upload, the quality desk and the chapter health check.
const { evaluateArithmetic, optionValue, isNumberOption, numbersIn } = require("./mathCheck");

const near = (option, value) => {
  const m = String(option).replace(/,/g, "").match(/\d+(?:\.(\d+))?/);
  const places = m && m[1] ? m[1].length : 0;
  const v = optionValue(option);
  return v !== null && Math.abs(v - value) <= 0.5 * 10 ** -places + 1e-9;
};

// Where one working lands among the options: { index } or { error }.
function landing(q, formula) {
  const f = String(formula || "").trim();
  if (!f) return { none: true };
  if (!(q.options || []).every(isNumberOption)) return { none: true, why: "the options are not single numbers" };
  let run;
  try {
    run = evaluateArithmetic(f);
  } catch (err) {
    return { error: `"${f}" cannot be run: ${err.message}` };
  }
  if (!run.operators) return { error: `"${f}" is just a number, not a working` };
  const hits = q.options.map((o, k) => (near(o, run.value) ? k : -1)).filter((k) => k >= 0);
  const shown = +run.value.toFixed(4);
  if (!hits.length) return { error: `"${f}" gives ${shown}, which is not among the options`, value: shown };
  if (hits.length > 1) return { error: `"${f}" gives ${shown}, which matches more than one option`, value: shown };
  return { index: hits[0], value: shown };
}

/**
 * proveAnswer(question, checkerFormula?) ->
 *   { verdict: "proven" | "disproved" | "unproven", setter, checker, reason }
 */
function proveAnswer(q, checkerFormula) {
  const setter = landing(q, q.formula);
  const checker = landing(q, checkerFormula);
  const key = q.correctIndex;
  const wrong = (who, l) =>
    l.error ? `${who} working ${l.error}` : `${who} working gives ${l.value} (option ${"ABCD"[l.index]}), not the ticked option ${"ABCD"[key]}`;

  for (const [who, l] of [["the setter's", setter], ["the checker's", checker]]) {
    if (l.none) continue;
    if (l.error || l.index !== key) return { verdict: "disproved", setter, checker, reason: wrong(who, l) };
  }
  if (!setter.none && !checker.none) return { verdict: "proven", setter, checker, reason: `two separate workings give ${setter.value}` };
  return { verdict: "unproven", setter, checker, reason: setter.none && checker.none ? "no working to run" : "only one working ran" };
}

module.exports = { proveAnswer, landing };
// numbersIn is re-exported for callers that build checker prompts.
module.exports.numbersIn = numbersIn;
