// Shared helpers for the Algebra chapter (alg-*.js).
//
// - One list of used numbers for the whole chapter, keyed on the numbers each
//   question shows (the server's numberSignature), so no two questions of the
//   chapter show the same numbers whatever their kind or topic.
// - Polynomials as coefficient lists, written the way a paper writes them
//   ("x^2 − 5x + 6"; fmt.js turns ^2 into ²).
// - Two question builders. NQ: the answer is a number; v() works it out again
//   by another route and checks that exactly one option is that number.
//   XQ: the answer is an expression or a statement; v() asks a judge in code
//   which options are right and expects exactly the marked one.
// - A guard that keeps every kind away from the questions already on the
//   server (alg-existing.js), so the server never refuses one as a repeat.
const { numbersOf } = require("./gen");
const { looksLikeRepeat, numberSignature } = require("../server/services/validationPipeline");
const ex = require("./alg-existing");

const USED = new Set();
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;
const clean = (x) => (isInt(x) ? Math.round(x) : Math.round(x * 1e9) / 1e9);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const cross = (...lists) => lists.reduce((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
// Like cross, but keeps only the tuples `keep` accepts while it walks them, so
// a seven-way product never sits in memory whole.
function crossF(lists, keep) { const out = []; const cur = []; const walk = (i) => { if (i === lists.length) { if (keep(cur)) out.push([...cur]); return; } for (const x of lists[i]) { cur.push(x); walk(i + 1); cur.pop(); } }; walk(0); return out; }
const range = (a, b, s = 1) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(clean(x)); return o; };
const hashOf = (p) => [...numbersOf(p)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
const pick = (list, prm, salt = 0) => list[(hashOf(prm) + salt * 7919) % list.length];
// Keep one set per key (the cheapest by hash), so a kind does not offer
// fifty near-identical sets.
const thin = (list, key) => { const m = new Map(); for (const p of list) { const k = JSON.stringify(key(p)); const h = hashOf(p); if (!m.has(k) || h < m.get(k)[0]) m.set(k, [h, p]); } return [...m.values()].map((x) => x[1]); };

// Numbers as a paper prints them: a real minus sign, no trailing zeros.
const N = (x) => { x = clean(x); const s = String(Math.abs(x)); return x < 0 ? `−${s}` : s; };
// A fraction p/q in lowest terms ("3/4", "−5/2", "7").
const F = (p, q = 1) => { if (q < 0) { p = -p; q = -q; } const g = gcd(p, q) || 1; p /= g; q /= g; return q === 1 ? N(p) : `${p < 0 ? "−" : ""}${Math.abs(p)}/${q}`; };
const fval = (s) => { const t = String(s).replace(/−/g, "-"); const m = /^(-?\d+(?:\.\d+)?)(?:\/(\d+))?$/.exec(t); return m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : NaN; };

// ---- polynomials: [a_n, ..., a_1, a_0] -------------------------------------
const evalP = (c, x) => c.reduce((s, k) => s * x + k, 0);
const mulP = (a, b) => { const o = Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y; })); return o; };
const addP = (a, b) => { const n = Math.max(a.length, b.length); const A = Array(n - a.length).fill(0).concat(a), B = Array(n - b.length).fill(0).concat(b); return A.map((x, i) => x + B[i]); };
// "x^2 − 5x + 6", "2a^3 + a − 4", "−x + 7". Terms with a 0 coefficient are left out.
function P(c, v = "x") {
  const deg = c.length - 1;
  const parts = [];
  c.forEach((k, i) => {
    if (!k) return;
    const p = deg - i;
    const mag = Math.abs(k);
    const coef = p === 0 ? String(mag) : mag === 1 ? "" : String(mag);
    const body = p === 0 ? coef : p === 1 ? `${coef}${v}` : `${coef}${v}^${p}`;
    parts.push([k < 0 ? "−" : "+", body]);
  });
  if (!parts.length) return "0";
  return parts.map(([s, b], i) => (i === 0 ? (s === "−" ? `−${b}` : b) : ` ${s} ${b}`)).join("");
}
// A linear factor "(x + 3)", "(2x − 1)", "(x)" - from a·x + b.
const lin = (a, b, v = "x") => `(${P([a, b], v)})`;

// Same polynomial? Compared at many points, so a judge never trusts text.
const sameP = (a, b) => [-3, -2, -1, 0, 1, 2, 3, 5, 7].every((x) => Math.abs(evalP(a, x) - evalP(b, x)) < 1e-6);

// ---- question builders ------------------------------------------------------
const Q = (t, q, qh, o, oh, a, judge, s, sh) => ({
  t, q, qh, o, ...(oh ? { oh } : {}), a, s, sh,
  v: () => { const right = o.map((_, i) => judge(i) === true); return right[a] && right.filter(Boolean).length === 1; },
});

// Numeric answer. `slips` are the wrong answers students reach; any that is
// not a clean number (2 decimals) or equals the answer is dropped, then the
// options are filled with neighbours one `step` away.
function NQ(t, q, qh, ans, slips, value, s, sh, { step = 1, positive = false, whole = false, fmtv = N } = {}) {
  ans = clean(ans);
  if (!isInt(ans * 100)) throw new Error(`answer ${ans} is not clean`);
  const vals = [ans];
  const add = (x) => { x = clean(x); if (vals.length < 4 && Number.isFinite(x) && isInt(x * 100) && (!whole || isInt(x)) && (!positive || x > 0) && !vals.some((v) => Math.abs(v - x) < 1e-9)) vals.push(x); };
  slips.forEach(add);
  for (let k = 1; vals.length < 4 && k < 60; k++) [ans + step * k, ans - step * k].forEach(add);
  const o = vals.map(fmtv);
  if (new Set(o).size !== 4) throw new Error(`options collide for ${ans}`);
  const got = () => clean(value());
  return Q(t, q, qh, o, null, 0, (i) => Math.abs(vals[i] - got()) < 1e-9, s, sh);
}
// Fraction answer ("p/q"): like NQ, but the options are fractions.
function FQ(t, q, qh, [p, r], slips, value, s, sh) {
  const want = p / r;
  const vals = [[p, r]];
  const key = ([a, b]) => clean(a / b);
  for (const x of slips) if (vals.length < 4 && x && x[1] !== 0 && !vals.some((v) => Math.abs(key(v) - key(x)) < 1e-9)) vals.push(x);
  for (let k = 1; vals.length < 4 && k < 40; k++) for (const x of [[p + k, r], [p - k, r]]) if (vals.length < 4 && !vals.some((v) => Math.abs(key(v) - key(x)) < 1e-9)) vals.push(x);
  const o = vals.map(([a, b]) => F(a, b));
  if (new Set(o).size !== 4) throw new Error(`fraction options collide for ${p}/${r}`);
  return Q(t, q, qh, o, null, 0, (i) => Math.abs(key(vals[i]) - value()) < 1e-9 && Math.abs(value() - want) < 1e-9, s, sh);
}
// Text answer: o[0] is right; judge(i) decides each option in code.
const XQ = (t, q, qh, o, oh, judge, s, sh) => {
  if (new Set(o).size !== 4) throw new Error(`options collide: ${o.join(" | ")}`);
  return Q(t, q, qh, o, oh, 0, judge, s, sh);
};

// The variable letters a question uses - varied like a real paper.
const VARS1 = ["x", "x", "x", "y", "a", "p", "m", "t"];
const v1 = (prm, salt = 0) => pick(VARS1, prm, salt);

// ---- the chapter-wide guard -----------------------------------------------
function guard(kinds) {
  for (const k of kinds) {
    k.key = (p) => `alg|${numberSignature(k.build("x · y · Easy #1", p).q)}`;
    const orig = k.cands;
    let memo;
    // A kind with thousands of sets keeps a fixed sample of 3000 (by hash),
    // which is plenty and keeps the build quick.
    const sample = () => { const all = orig(); return all.length <= 3000 ? all : all.map((p) => [hashOf([...p, k.id.length]), p]).sort((x, y) => x[0] - y[0]).slice(0, 3000).map((x) => x[1]); };
    k.cands = () => (memo = memo || sample().filter((p) => {
      try { return !looksLikeRepeat(k.build("x · y · Easy #1", p).q, ex.texts).repeat; } catch (e) { return false; }
    }));
  }
  return kinds;
}

module.exports = { USED, isInt, clean, gcd, cross, crossF, range, hashOf, pick, thin, N, F, fval, evalP, mulP, addP, P, lin, sameP, Q, NQ, FQ, XQ, v1, guard };
