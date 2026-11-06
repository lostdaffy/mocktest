// The chapter check before any upload: every Algebra question through the
// server's own rules (ruleBasedCheck), the repeat check across the whole
// chapter and against the bank (alg-existing.js), and the per-test pattern
// limit. Prints problems; exits 1 if there are any.
const { ruleBasedCheck, looksLikeRepeat } = require("../server/services/validationPipeline");
const { patternCount } = (() => { try { return require("../server/services/qualityRules"); } catch (e) { return {}; } })();
// node alg-verify.js [upload module] [existing module] [subject]
const up = require(process.argv[2] ? "./" + process.argv[2] : "./alg-upload");
const ex = require(process.argv[3] ? "./" + process.argv[3] : "./alg-existing");
const SUBJECT = process.argv[4] || "Maths";
const ORDER = up.ORDER;
const all = [];
for (const name of [...ORDER, "mixed"]) for (const lv of ["easy", "medium", "hard", "advanced"]) all.push(...up.questions(name, lv));
const problems = [];
const byTest = new Map();
for (const q of all) {
  const doc = { text: q.q, options: q.o, correctIndex: q.a, solution: q.s, textHi: q.qh, optionsHi: q.oh || q.o, solutionHi: q.sh, subject: SUBJECT, status: "draft", source: "manual" };
  const r = ruleBasedCheck(doc);
  if (!r.passed) problems.push(`${q.t}: ${q.q.slice(0, 70)} -> ${r.issues.join("; ")}`);
  if (!byTest.has(q.t)) byTest.set(q.t, []);
  byTest.get(q.t).push(q.q);
  if (ex.texts.length && looksLikeRepeat(q.q, ex.texts).repeat) problems.push(`${q.t}: repeats a bank question: ${q.q.slice(0, 70)}`);
}
// repeats inside the chapter (same numbers and mostly the same words)
const seen = [];
for (const q of all) {
  const hit = looksLikeRepeat(q.q, seen);
  if (hit.repeat) problems.push(`${q.t}: repeat inside the chapter: ${q.q.slice(0, 60)} ~ ${hit.of.slice(0, 60)}`);
  seen.push(q.q);
}
if (patternCount && SUBJECT === "Maths") {
  for (const [t, qs] of byTest) {
    qs.forEach((q, i) => { const n = patternCount(q, qs.filter((_, j) => j !== i)); if (n >= 3) problems.push(`${t}: pattern used ${n + 1} times: ${q.slice(0, 60)}`); });
  }
}
console.log(`${all.length} questions, ${byTest.size} tests`);
const uniq = [...new Set(problems)];
console.log(uniq.slice(0, 60).join("\n"));
console.log(`${uniq.length} problem(s)`);
process.exit(uniq.length ? 1 : 0);
