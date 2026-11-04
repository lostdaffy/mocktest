// Shared builder for hand-written full mocks (no AI). A mock file does:
//
//   const { add, H, done } = require("./mock-lib")({ name: "ssc-gd-mock3", want: { Reasoning: 20, ... }, hindiSubjects: ["General Hindi"] });
//   add(subject, topic, difficulty, question, questionHi, options, optionsHi|null, "B", solution, solutionHi, check?)
//   ...
//   done();
//
// `check` recomputes the answer from the numbers in the question. done() refuses
// to build if a check fails, an option set is wrong, a question repeats inside
// the paper, or a section has the wrong count; it spreads the answer letters
// (swapping the right answer with another option only where order carries no
// meaning) and, with --json, writes <name>.json for the manual-questions API.
const fs = require("fs");
const path = require("path");

module.exports = function makeMock({ name, want, hindiSubjects = [], spreadNumeric = false }) {
  const Q = [];
  const add = (subject, topic, difficulty, question, questionHi, options, optionsHi, correct, solution, solutionHi, check) =>
    Q.push({ subject, topic, difficulty, question, questionHi, options, optionsHi: optionsHi || [...options], correct, solution, solutionHi, check });
  // A question that is in Hindi in both languages.
  const H = (subject, topic, difficulty, q, opts, correct, sol, check) => add(subject, topic, difficulty, q, q, opts, [...opts], correct, sol, sol, check);
  const L = (c) => "ABCD".indexOf(c);

  function done() {
    const orderMatters = (q) =>
      /Syllogism|Venn|Statement|Assumption|Conclusion|Course of Action/i.test(q.topic) ||
      (!spreadNumeric && q.options.every((o) => /^[-−₹]?[\d,.]+/.test(o.trim()))) ||
      q.options.every((o) => /^[A-D]$/.test(o.trim())) || // "which part has the error": A, B, C, D name the parts
      q.options.some((o) => /^(Only|Both|Neither|All of|None of|केवल|न तो|दोनों|उपरोक्त|इनमें से कोई)/.test(o.trim()));
    const tally = () => { const c = { A: 0, B: 0, C: 0, D: 0 }; Q.forEach((q) => c[q.correct]++); return c; };
    for (let pass = 0; pass < 400; pass++) {
      const c = tally();
      const keys = Object.keys(c);
      const most = keys.sort((a, b) => c[b] - c[a])[0];
      const least = keys.sort((a, b) => c[a] - c[b])[0];
      if (c[most] - c[least] <= 2) break;
      const q = Q.find((x) => x.correct === most && !orderMatters(x) && !x.__moved);
      if (!q) break;
      const i = L(most), j = L(least);
      [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
      [q.optionsHi[i], q.optionsHi[j]] = [q.optionsHi[j], q.optionsHi[i]];
      q.correct = least; q.__moved = true;
    }

    const errs = [];
    const count = {};
    const norm = (x) => String(x).replace(/[₹,\s]/g, "");
    Q.forEach((q, i) => {
      const n = i + 1;
      count[q.subject] = (count[q.subject] || 0) + 1;
      if (q.options.length !== 4 || q.optionsHi.length !== 4) errs.push(`Q${n}: needs 4 options in both languages`);
      if (new Set(q.options).size !== 4) errs.push(`Q${n}: options repeat`);
      if (!/^[A-D]$/.test(q.correct)) errs.push(`Q${n}: correct must be A-D`);
      if (q.check && !q.check()) errs.push(`Q${n}: answer check FAILED`);
      if (!q.solution || !q.solutionHi || !q.questionHi) errs.push(`Q${n}: missing Hindi or solution`);
      const hindi = hindiSubjects.includes(q.subject);
      if (!hindi && /[ऀ-ॿ]/.test(q.question + q.options.join("") + q.solution)) errs.push(`Q${n}: Hindi in the English text`);
      if (hindi && !/[ऀ-ॿ]/.test(q.question)) errs.push(`Q${n}: Hindi question has no Hindi`);
      // A numeric answer must be named in its own solution.
      const ans = q.options[L(q.correct)];
      // The upload check calls a solution under ~40 characters "too short to teach anything".
      if ((String(q.solution).length < 24) || (!/=/.test(q.solution) && (String(q.solution).length < 28 || String(q.solutionHi).length < 20))) errs.push(`Q${n}: solution is too short (needs a real explanation) :: ${String(q.question).slice(0,50)}`);
      // The server rewrites "3 * 4" between digits into "3 × 4"; a made-up operator must use another symbol (@, #, $).
      if (/\d\s*\*\s*\d/.test(q.question + q.solution)) errs.push(`Q${n}: "*" between numbers is turned into × by the server - use @ or # for a made-up operator`);
      if (/[a-zA-Z0-9)]^[a-zA-Z0-9(]/.test(q.question)) errs.push(`Q${n}: "^" is turned into a superscript by the server - write the superscript character directly`);
      // A plain numeric answer ("₹1,200", "45 km", "20%") must be named in its own solution.
      if (/^[₹−-]?[\d,.]+\s*(%|°|[A-Za-z²³]{0,6})?$/.test(ans.trim()) && !norm(q.solution).includes(norm(ans).replace(/[^\d.]/g, ""))) errs.push(`Q${n}: solution does not show the marked number ${ans}`);
    });
    for (const [s, n] of Object.entries(want)) if (count[s] !== n) errs.push(`${s}: ${count[s] || 0} questions, want ${n}`);
    for (const s of Object.keys(count)) if (!(s in want)) errs.push(`unexpected section ${s}`);
    const seen = new Set();
    Q.forEach((q, i) => { const k = q.question.replace(/\s+/g, " ").toLowerCase(); if (seen.has(k)) errs.push(`Q${i + 1}: repeats an earlier question`); seen.add(k); });
    const spread = tally();
    console.log(`${Q.length} questions`, count, "answers", spread, `checked by code: ${Q.filter((q) => q.check).length}`);
    if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
    console.log("All checks pass.");
    if (process.argv.includes("--json")) {
      const rows = Q.map((q) => ({
        subject: q.subject, topic: q.topic, difficulty: q.difficulty,
        question: q.question, questionHi: q.questionHi,
        optionA: q.options[0], optionB: q.options[1], optionC: q.options[2], optionD: q.options[3],
        optionAHi: q.optionsHi[0], optionBHi: q.optionsHi[1], optionCHi: q.optionsHi[2], optionDHi: q.optionsHi[3],
        correct: q.correct, solution: q.solution, solutionHi: q.solutionHi,
      }));
      fs.writeFileSync(path.join(__dirname, name + ".json"), JSON.stringify(rows, null, 1));
      console.log(`Wrote content/${name}.json`);
    }
  }
  return { add, H, done, Q };
};
