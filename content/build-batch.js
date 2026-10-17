// Turns a batch of hand-written questions into the CSV the admin's
// "Fill practice tests from a spreadsheet" takes - but only if every
// question passes its own check.
//
//   node content/build-batch.js content/ns-divisibility-batch1.js out.csv
//
// Each question: { t: test title, q, qh, o: [4 options], oh?: [4 Hindi
// options], a: index of the right option, s, sh: solutions, v: () => true
// when the answer is worked out in code and agrees, r?: id of the question
// it replaces in that test, rr?: why }.
const fs = require("fs");
const path = require("path");

const file = path.resolve(process.argv[2]);
const out = process.argv[3];
const qs = require(file);
const problems = [];
const seen = new Map();

qs.forEach((x, i) => {
  const where = `#${i + 1} (${x.t}): ${String(x.q).slice(0, 60)}`;
  if (!x.t || !x.q || !x.qh || !x.s || !x.sh) problems.push(`${where} - a field is missing`);
  if (!Array.isArray(x.o) || x.o.length !== 4) problems.push(`${where} - needs 4 options`);
  if (x.oh && x.oh.length !== 4) problems.push(`${where} - needs 4 Hindi options`);
  if (!(x.a >= 0 && x.a <= 3)) problems.push(`${where} - no right option`);
  if (new Set(x.o.map((o) => String(o).trim().toLowerCase())).size !== 4) problems.push(`${where} - two options are the same`);
  let ok = false;
  try { ok = x.v() === true; } catch (e) { problems.push(`${where} - check crashed: ${e.message}`); }
  if (!ok) problems.push(`${where} - the check does not agree with option ${"ABCD"[x.a]}`);
  const ans = String(x.o[x.a]);
  if (/^[\d,.\s%-]+$/.test(ans) && !x.s.includes(ans)) problems.push(`${where} - the solution never writes the answer "${ans}" as the option shows it`);
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const key = x.q.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => SUP.indexOf(c)).join("")).toLowerCase().replace(/[^a-z0-9^]+/g, "");
  if (seen.has(key)) problems.push(`${where} - same question as #${seen.get(key)}`);
  seen.set(key, i + 1);
});

const perTest = {};
qs.forEach((x) => (perTest[x.t] = (perTest[x.t] || 0) + 1));

if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} problem(s) - no CSV written`);
  process.exit(1);
}

const COLS = ["test", "subject", "topic", "difficulty", "question", "optionA", "optionB", "optionC", "optionD", "correct", "formula", "solution", "questionHi", "optionAHi", "optionBHi", "optionCHi", "optionDHi", "solutionHi", "replaces", "replaceReason"];
const level = (t) => (/· (Easy|Medium|Hard|Advanced) #/.exec(t) || [])[1];
// The right answer goes to A, B, C, D in turn (the order of the other three
// kept), so no letter is the "usual" answer.
qs.forEach((x, i) => {
  const want = i % 4;
  if (want === x.a) return;
  const move = (arr) => {
    const right = arr[x.a];
    const rest = arr.filter((_, k) => k !== x.a);
    rest.splice(want, 0, right);
    return rest;
  };
  x.o = move(x.o);
  if (x.oh) x.oh = move(x.oh);
  x.a = want;
});

const rows = qs.map((x) => {
  const oh = x.oh || x.o;
  const lv = (level(x.t) || "Medium").toLowerCase();
  return {
    test: x.t, subject: x.subject || "Maths", topic: x.topic || x.t.split(" · ")[1], difficulty: lv === "advanced" ? "hard" : lv,
    question: x.q, optionA: x.o[0], optionB: x.o[1], optionC: x.o[2], optionD: x.o[3], correct: "ABCD"[x.a],
    formula: x.f || "", solution: x.s,
    questionHi: x.qh, optionAHi: oh[0], optionBHi: oh[1], optionCHi: oh[2], optionDHi: oh[3], solutionHi: x.sh,
    replaces: x.r || "", replaceReason: x.rr || "",
  };
});
const esc = (v) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
fs.writeFileSync(out, "﻿" + [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\r\n"));
console.log(`${rows.length} question(s), every check passed. Per test:`, perTest);
console.log("Answer spread:", ["A", "B", "C", "D"].map((l) => rows.filter((r) => r.correct === l).length).join(" "));
