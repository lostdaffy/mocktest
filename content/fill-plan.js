// Fits a topic's generated tests around the tests already on the server:
// a short test there gets just the questions it is missing, and the
// generated tests take the numbers after the last one. `existing` is
// { level: { number: questionsItHas } }, read from the admin API before
// building. Returns { level: [questions with their final test titles] }.
const NAME = { easy: "Easy", medium: "Medium", hard: "Hard", advanced: "Advanced" };

function fitAround({ topic, prefix, existing, target = 10, size = 20 }) {
  const out = {};
  for (const level of Object.keys(NAME)) {
    const have = existing[level] || {};
    const mine = topic[level].map((t) => [...t]); // copies of the generated tests
    const title = (n) => `${prefix} · ${NAME[level]} #${n}`;
    const numbers = Object.keys(have).map(Number);
    const next = numbers.length ? Math.max(...numbers) + 1 : 1;
    const qs = [];
    // New tests, numbered on from the last one there.
    for (let n = next; n <= target; n++) {
      const t = mine.shift();
      if (!t) throw new Error(`${title(n)}: no generated test left`);
      qs.push(...t.map((q) => ({ ...q, t: title(n) })));
    }
    // The missing questions of the short ones, from the tests not used.
    const spare = mine.flat();
    for (const n of numbers.sort((a, b) => a - b)) {
      const need = size - have[n];
      for (let k = 0; k < need; k++) {
        const q = spare.shift();
        if (!q) throw new Error(`${title(n)}: no spare question left`);
        qs.push({ ...q, t: title(n) });
      }
    }
    out[level] = qs;
    out.spare = out.spare || {};
    out.spare[level] = spare;
  }
  return out;
}

// A question that repeats one already in the chapter (or earlier in the
// plan) is swapped for a spare of the same level that does not.
function swapRepeats(plan, prevTexts) {
  const { looksLikeRepeat } = require("../server/services/validationPipeline");
  const seen = [...prevTexts];
  const swapped = [];
  for (const level of Object.keys(NAME)) {
    const spare = plan.spare[level];
    plan[level] = plan[level].map((q) => {
      let cur = q;
      while (looksLikeRepeat(cur.q, seen).repeat) {
        const next = spare.shift();
        if (!next) throw new Error(`${q.t}: no spare left to replace a repeat`);
        cur = { ...next, t: q.t };
      }
      if (cur !== q) swapped.push(q.t);
      seen.push(cur.q);
      return cur;
    });
  }
  return swapped;
}

module.exports = { fitAround, swapRepeats };
