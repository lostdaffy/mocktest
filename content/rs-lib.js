// Shared helpers for the Reasoning chapters (rs-*.js).
//
// - One list of used questions per chapter (keyed on the numbers or letters
//   each question shows), so no two questions of a chapter are the same.
// - `rivals`: the common series rules a student tries (AP, GP, second and
//   third differences, differences multiplying, ×r + c, Fibonacci, two
//   interleaved series). A series question is kept only if every rival rule
//   that fits the terms shown gives the same answer - a series that two rules
//   explain is ambiguous and is never asked.
// - The option builders NQ / XQ come from alg-lib (numbers / text answers).
const A = require("./alg-lib");
const { numbersOf } = require("./gen");
const { looksLikeRepeat } = require("../server/services/validationPipeline");

const isInt = (x) => Number.isFinite(x) && Math.abs(x - Math.round(x)) < 1e-9;
const near = (a, b) => Math.abs(a - b) < 1e-6;

// ---- series rules: each fits the shown terms (null = hidden) and returns the
// whole series, or null if it does not fit. Parameters come from the first
// run of known terms long enough for the rule.
const firstRun = (t, len) => { for (let i = 0; i + len <= t.length; i++) if (t.slice(i, i + len).every((x) => x !== null)) return i; return -1; };
function extend(t, start, len, step) {
  // step(prev terms array, index) -> next value; generates forward from the run
  const out = t.slice();
  for (let i = start + len; i < t.length; i++) out[i] = step(out, i);
  // terms before the run are only accepted if the rule is checked on them too
  return out;
}
const RULES = {
  ap: { len: 2, make: (t, s) => { const d = t[s + 1] - t[s]; return (o, i) => o[i - 1] + d; }, back: (t, s) => { const d = t[s + 1] - t[s]; return (o, i) => o[i + 1] - d; } },
  gp: { len: 2, make: (t, s) => { const r = t[s + 1] / t[s]; return (o, i) => o[i - 1] * r; }, back: (t, s) => { const r = t[s + 1] / t[s]; return (o, i) => o[i + 1] / r; } },
  diff2: { len: 3, make: (t, s) => { const k = t[s + 2] - 2 * t[s + 1] + t[s]; return (o, i) => 2 * o[i - 1] - o[i - 2] + k; } },
  diff3: { len: 4, make: (t, s) => { const k = t[s + 3] - 3 * t[s + 2] + 3 * t[s + 1] - t[s]; return (o, i) => 3 * o[i - 1] - 3 * o[i - 2] + o[i - 3] + k; } },
  diffGP: { len: 3, make: (t, s) => { const d0 = t[s + 1] - t[s], d1 = t[s + 2] - t[s + 1]; if (!d0) return null; const q = d1 / d0; return (o, i) => o[i - 1] + (o[i - 1] - o[i - 2]) * q; } },
  mulAdd: { len: 3, make: (t, s) => { const d0 = t[s + 1] - t[s]; if (!d0) return null; const r = (t[s + 2] - t[s + 1]) / d0; const c = t[s + 1] - r * t[s]; return (o, i) => r * o[i - 1] + c; } },
  fib: { len: 3, make: (t, s) => { const c = t[s + 2] - t[s + 1] - t[s]; return (o, i) => o[i - 1] + o[i - 2] + c; } },
  alt: { len: 4, make: (t, s) => { const d0 = t[s + 2] - t[s], d1 = t[s + 3] - t[s + 1]; return (o, i) => o[i - 2] + ((i - s) % 2 === 0 ? d0 : d1); } },
};
// The whole series by one rule, or null when the rule does not fit the shown terms.
function fitRule(name, t) {
  const R = RULES[name];
  const s = firstRun(t, R.len);
  if (s < 0) return null;
  const step = R.make(t, s);
  if (!step) return null;
  let out;
  try { out = extend(t, s, R.len, step); } catch (e) { return null; }
  // backwards for the terms before the run (only rules that can run back)
  if (s > 0) {
    if (!R.back) return null;
    const b = R.back(t, s);
    for (let i = s - 1; i >= 0; i--) out[i] = b(out, i);
  }
  if (out.some((x) => !Number.isFinite(x))) return null;
  for (let i = 0; i < t.length; i++) if (t[i] !== null && !near(out[i], t[i])) return null;
  return out;
}
// Every rival rule that fits, and what it puts at index m.
const rivalsAt = (t, m) => Object.keys(RULES).map((r) => [r, fitRule(r, t)]).filter(([, o]) => o).map(([r, o]) => [r, o[m]]);
// A missing-term question is safe when every rival that fits agrees with the answer.
const unique = (t, m, ans) => rivalsAt(t, m).every(([, v]) => near(v, ans));
// A wrong-number question is safe when hiding any other term lets no rival fit.
function uniqueWrong(full, wrongIdx) {
  for (let j = 0; j < full.length; j++) {
    if (j === wrongIdx) continue;
    const t = full.slice();
    t[j] = null;
    if (rivalsAt(t, j).length) return false;
  }
  return true;
}

// ---- the chapter guard: unique shown content, away from the bank
function chapter(existingTexts = []) {
  const USED = new Set();
  const keyText = (q) => String(q).replace(/[^0-9A-Za-z?]+/g, " ").trim();
  function guard(kinds, tag) {
    for (const k of kinds) {
      // gen.js keys its pools by id, so ids must be unique across the chapter.
      k.id = `${tag}:${k.id}`;
      k.key = (p) => `${tag}|${keyText(k.show ? k.show(p) : k.build("x · y · Easy #1", p).q)}`;
      const orig = k.cands;
      let memo;
      const sample = () => { const all = orig(); return all.length <= 3000 ? all : all.map((p) => [A.hashOf([...p.flat(), k.id.length]), p]).sort((x, y) => x[0] - y[0]).slice(0, 3000).map((x) => x[1]); };
      k.cands = () => (memo = memo || sample().filter((p) => {
        try { const q = k.build("x · y · Easy #1", p); return q && !looksLikeRepeat(q.q, existingTexts).repeat; } catch (e) { return false; }
      }));
    }
    return kinds;
  }
  return { USED, guard };
}

// Phrasings, as papers and books word these.
const pickOf = (list, prm, salt = 0) => list[(A.hashOf(prm) + salt * 7919) % list.length];

module.exports = { ...A, isInt, near, RULES, fitRule, rivalsAt, unique, uniqueWrong, chapter, pickOf, numbersOf };
