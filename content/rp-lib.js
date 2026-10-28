// Shared helpers for the Ratio & Proportion chapter (rp-*.js): one list of used numbers
// for the whole chapter (keyed on the numbers each question shows, so no two
// questions of the chapter show the same numbers whatever their kind),
// answers with their units in English and Hindi, and a guard that keeps
// every kind away from the 48 questions already on the server.
const L = require("./pl-lib");
const { n, clean, isInt, hashOf } = L;
const { looksLikeRepeat, numberSignature } = require("../server/services/validationPipeline");
const ex = require("./rp-existing");
const bank = require("./rp-bank");
const AVOID = [...ex.texts, ...bank];

const USED = new Set();
const dec2 = (x) => isInt(clean(x) * 100); // at most 2 decimal places
const thin = (list, key) => { const m = new Map(); for (const p of list) { const k = JSON.stringify(key(p)); const h = hashOf(p); if (!m.has(k) || h < m.get(k)[0]) m.set(k, [h, p]); } return [...m.values()].map((x) => x[1]); };
const pick = (list, prm, salt = 0) => list[(hashOf(prm) + salt) % list.length];
const range = (a, b, s = 1) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(clean(x)); return o; };

// Units: English and Hindi, written after the number (money before it).
const U = {
  none: { en: (x) => n(x), hi: (x) => n(x) },
  kg: { en: (x) => `${n(x)} kg`, hi: (x) => `${n(x)} kg` },
  yr: { en: (x) => `${n(x)} years`, hi: (x) => `${n(x)} वर्ष` },
  run: { en: (x) => `${n(x)} runs`, hi: (x) => `${n(x)} रन` },
  mark: { en: (x) => `${n(x)} marks`, hi: (x) => `${n(x)} अंक` },
  rs: { en: (x) => `₹${n(x)}`, hi: (x) => `₹${n(x)}` },
  cm: { en: (x) => `${n(x)} cm`, hi: (x) => `${n(x)} cm` },
  wk: { en: (x) => `${n(x)}`, hi: (x) => `${n(x)}` },
  pct: { en: (x) => `${n(x)}%`, hi: (x) => `${n(x)}%` },
  lt: { en: (x) => `${n(x)} litres`, hi: (x) => `${n(x)} लीटर` },
  hr: { en: (x) => `${n(x)} hours`, hi: (x) => `${n(x)} घंटे` },
  km: { en: (x) => `${n(x)} km`, hi: (x) => `${n(x)} km` },
  mo: { en: (x) => `${n(x)} months`, hi: (x) => `${n(x)} महीने` },
  day: { en: (x) => `${n(x)} days`, hi: (x) => `${n(x)} दिन` },
};

// Four options in a unit: the answer and the slips students make, each
// worked out exactly - a slip that is not a clean number (2 decimals at
// most) or not positive is dropped, never rounded; then neighbours.
function opts(ans, slips, unit = "none", step = 1) {
  const u = U[unit];
  const vals = [clean(ans)];
  const add = (x) => { x = clean(x); if (vals.length < 4 && Number.isFinite(x) && x > 0 && dec2(x) && !vals.some((v) => Math.abs(v - x) < 1e-9)) vals.push(x); };
  slips.forEach(add);
  for (let k = 1; vals.length < 4 && k < 60; k++) [ans + step * k, ans - step * k].forEach(add);
  if (vals.length < 4) throw new Error(`not enough options for ${ans}`);
  return { o: vals.map(u.en), oh: vals.map(u.hi), show: u.en };
}
// A question whose answer is a number in a unit; v() works it out again.
const AQ = (t, q, qh, ans, slips, value, s, sh, unit = "none", step = 1) => {
  if (!dec2(ans)) throw new Error(`answer ${ans} is not clean`);
  const { o, oh, show } = opts(ans, slips, unit, step);
  return L.Q(t, q, qh, o, 0, () => show(clean(value())), s, sh, oh);
};

function guard(kinds) {
  for (const k of kinds) {
    k.key = (p) => `rp|${numberSignature(k.build("x · y · Easy #1", p).q)}`;
    const orig = k.cands;
    let memo;
    k.cands = () => (memo = memo || orig().filter((p) => {
      try { return !looksLikeRepeat(k.build("x · y · Easy #1", p).q, AVOID).repeat; } catch (e) { return false; }
    }));
  }
  return kinds;
}


// Ratios as options: "8 : 15", lowest terms. The answer and the slips
// (turned round, not reduced, a wrong pairing), then near neighbours.
const gcdN = (...xs) => xs.reduce((a, b) => L.gcd(a, b));
const rat = (...xs) => { const g = gcdN(...xs.map((x) => Math.round(x))); return xs.map((x) => Math.round(x) / g).join(" : "); };
const ratOk = (xs) => xs.every((x) => Number.isInteger(x) && x > 0);
function RQ(t, q, qh, ans, slips, value, s, sh) {
  const A = rat(...ans);
  const o = [A];
  const add = (xs) => { if (o.length < 4 && ratOk(xs)) { const r = rat(...xs); if (!o.includes(r)) o.push(r); } };
  slips.forEach(add);
  add([...ans].reverse());
  for (let k = 1; o.length < 4 && k < 20; k++) { add(ans.map((x, i) => (i === 0 ? x + k : x))); add(ans.map((x, i) => (i === ans.length - 1 ? x + k : x))); }
  if (o.length < 4) throw new Error("not enough ratio options");
  return L.Q(t, q, qh, o, 0, () => rat(...value()), s, sh, o);
}
// A fraction in lowest terms: "7/29".
const frac = (p, q) => { const g = L.gcd(Math.abs(p), Math.abs(q)); return `${p / g}/${q / g}`; };
function FQ(t, q, qh, ans, slips, value, s, sh) {
  const A = frac(...ans); const o = [A];
  const add = ([p, r]) => { if (o.length < 4 && Number.isInteger(p) && Number.isInteger(r) && p > 0 && r > 0) { const f = frac(p, r); if (!o.includes(f)) o.push(f); } };
  slips.forEach(add);
  for (let k = 1; o.length < 4 && k < 20; k++) { add([ans[0] + k, ans[1]]); add([ans[0], ans[1] + k]); }
  if (o.length < 4) throw new Error("not enough fraction options");
  return L.Q(t, q, qh, o, 0, () => frac(...value()), s, sh, o);
}

module.exports = { rat, RQ, frac, FQ,  ...L, USED, dec2, thin, pick, range, U, opts, AQ, guard };
