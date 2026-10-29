// Shared helpers for the Time & Work chapter (tw-*.js): one list of used
// numbers for the whole chapter (keyed on the numbers each question shows,
// so no two questions of the chapter show the same numbers whatever their
// kind), answers with their units in English and Hindi, and a guard that
// keeps every kind away from the 108 questions already in the bank.
//
// Numbers are written plain (1517, 99792 - no commas), the way HCF and LCM
// questions are printed in exam papers.
const L = require("./pl-lib");
const { clean, isInt, hashOf } = L;
const { looksLikeRepeat, numberSignature } = require("../server/services/validationPipeline");
const ex = require("./tw-existing");
const bank = require("./tw-bank");
const AVOID = [...ex.texts, ...bank];

const USED = new Set();
const N = (x) => String(clean(x));
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
const gcdA = (xs) => xs.reduce((a, b) => gcd(a, b));
const lcmA = (xs) => xs.reduce((a, b) => lcm(a, b));
// The check's own route: HCF by trying every divisor down from the smallest
// number, LCM by walking the multiples of the largest. Never the formula.
const hcfSlow = (xs) => { for (let d = Math.min(...xs); d >= 1; d--) if (xs.every((x) => x % d === 0)) return d; return 1; };
const lcmSlow = (xs) => { const m = Math.max(...xs); for (let k = m; ; k += m) if (xs.every((x) => k % x === 0)) return k; };
const divisors = (x) => { const o = []; for (let d = 1; d * d <= x; d++) if (x % d === 0) { o.push(d); if (d * d !== x) o.push(x / d); } return o.sort((a, b) => a - b); };
const factor = (x) => { const o = []; for (let p = 2; p * p <= x; p++) { let e = 0; while (x % p === 0) { x /= p; e++; } if (e) o.push([p, e]); } if (x > 1) o.push([x, 1]); return o; };
// 360 -> "2^3 × 3^2 × 5" (fmt() raises the powers).
const pf = (x) => factor(x).map(([p, e]) => (e > 1 ? `${p}^${e}` : `${p}`)).join(" × ");
const isPrime = (x) => x > 1 && factor(x).length === 1 && factor(x)[0][1] === 1;
const range = (a, b, s = 1) => { const o = []; for (let x = a; x <= b + 1e-9; x += s) o.push(clean(x)); return o; };
// At most `max` items, spread evenly over the list, so a pool stays small
// enough to check every candidate against the bank.
const cap = (list, max) => (list.length <= max ? list : Array.from({ length: max }, (_, i) => list[Math.floor((i * list.length) / max)]));
const pick = (list, prm, salt = 0) => list[(hashOf(prm) + salt) % list.length];
const dec2 = (x) => isInt(clean(x) * 100);

// Units: English and Hindi, written after the number (money before it).
const U = {
  none: { en: N, hi: N },
  cm: { en: (x) => `${N(x)} cm`, hi: (x) => `${N(x)} cm` },
  m: { en: (x) => `${N(x)} m`, hi: (x) => `${N(x)} m` },
  lt: { en: (x) => `${N(x)} litres`, hi: (x) => `${N(x)} लीटर` },
  sec: { en: (x) => `${N(x)} second${x === 1 ? "" : "s"}`, hi: (x) => `${N(x)} सेकंड` },
  min: { en: (x) => `${N(x)} minute${x === 1 ? "" : "s"}`, hi: (x) => `${N(x)} मिनट` },
  hr: { en: (x) => `${N(x)} hour${x === 1 ? "" : "s"}`, hi: (x) => `${N(x)} घंटे` },
  day: { en: (x) => `${N(x)} day${x === 1 ? "" : "s"}`, hi: (x) => `${N(x)} दिन` },
  times: { en: (x) => `${N(x)} times`, hi: (x) => `${N(x)} बार` },
  pairs: { en: (x) => `${N(x)}`, hi: (x) => `${N(x)}` },
  kg: { en: (x) => `${N(x)} kg`, hi: (x) => `${N(x)} kg` },
  rs: { en: (x) => `₹${N(x)}`, hi: (x) => `₹${N(x)}` },
  men: { en: (x) => `${N(x)}`, hi: (x) => `${N(x)}` },
};

// Four options in a unit: the answer and the slips students make, each
// worked out exactly - a slip that is not a clean number (2 decimals at
// most) or not positive is dropped, never rounded; then neighbours.
function opts(ans, slips, unit = "none", step = 1) {
  const u = U[unit];
  const vals = [clean(ans)];
  const add = (x) => { x = clean(x); if (vals.length < 4 && Number.isFinite(x) && x > 0 && dec2(x) && !vals.some((v) => Math.abs(v - x) < 1e-9)) vals.push(x); };
  // A slip far bigger than the answer gives itself away: left out.
  // A whole-number answer gets whole-number slips (no 68.25 beside 15).
  slips.filter((x) => !(x > 30 * ans && x > 100) && (!isInt(ans) || isInt(x))).forEach(add);
  // Neighbours in the answer's own scale: 8836 and 8636 beside 8736, not 8737.
  const st = isInt(ans) && ans >= 100 ? Math.max(step, 10 ** (Math.floor(Math.log10(ans)) - 1)) : step;
  for (let k = 1; vals.length < 4 && k < 60; k++) [ans + st * k, ans - st * k].forEach(add);
  if (vals.length < 4) throw new Error(`not enough options for ${ans}`);
  return { o: vals.map(u.en), oh: vals.map(u.hi), show: u.en };
}
// A question whose answer is a number in a unit; v() works it out again.
const AQ = (t, q, qh, ans, slips, value, s, sh, unit = "none", step = 1) => {
  if (!dec2(ans)) throw new Error(`answer ${ans} is not clean`);
  const { o, oh, show } = opts(ans, slips, unit, step);
  return L.Q(t, q, qh, o, 0, () => show(clean(value())), s, sh, oh);
};
// A question whose options are written out (pairs, times, fractions): the
// answer first, then the wrong ones; v() works the answer out again.
const SQ = (t, q, qh, ans, wrong, value, s, sh, ansH, wrongH) => {
  const o = [ans, ...wrong.filter((w, i, a) => w !== ans && a.indexOf(w) === i)].slice(0, 4);
  if (o.length < 4) throw new Error(`not enough options for ${ans}`);
  const oh = ansH ? [ansH, ...wrongH.filter((w, i, a) => w !== ansH && a.indexOf(w) === i)].slice(0, 4) : undefined;
  return L.Q(t, q, qh, o, 0, () => String(value()), s, sh, oh);
};

// Clock times: minutes after midnight -> "10:36 AM" / "10:36:24 AM".
const clock = (secs, withSec) => {
  secs = ((secs % 86400) + 86400) % 86400;
  const h = Math.floor(secs / 3600), mi = Math.floor((secs % 3600) / 60), s = secs % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mi).padStart(2, "0")}${withSec ? `:${String(s).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};
const clockH = (secs, withSec) => clock(secs, withSec).replace(" AM", " AM").replace(" PM", " PM");

// Fractions in lowest terms: "7/29".
const frac = (p, q) => { const g = gcd(p, q); return q / g === 1 ? `${p / g}` : `${p / g}/${q / g}`; };

function guard(kinds) {
  for (const k of kinds) {
    k.key = (p) => `tw|${numberSignature(k.build("x · y · Easy #1", p).q)}`;
    const orig = k.cands;
    let memo;
    k.cands = () => (memo = memo || orig().filter((p) => {
      try { return !looksLikeRepeat(k.build("x · y · Easy #1", p).q, AVOID).repeat; } catch (e) { return false; }
    }));
  }
  return kinds;
}

// cross() that filters while it walks, so big pools never sit in memory.
const cross = (...lists) => ({
  filter(ok) {
    const out = []; const acc = [];
    const rec = (i) => { if (i === lists.length) { if (ok(acc)) out.push([...acc]); return; } for (const v of lists[i]) { acc.push(v); rec(i + 1); acc.pop(); } };
    rec(0); return out;
  },
});

const andE = (xs) => (xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const andH = (xs) => (xs.length === 2 ? `${xs[0]} और ${xs[1]}` : `${xs.slice(0, -1).join(", ")} और ${xs[xs.length - 1]}`);

// 20/3 -> "6 2/3" (whole part and a fraction); used for times like 6 2/3 days.
const mixedFrac = (p, q) => { const g = gcd(p, q); p /= g; q /= g; const w = Math.floor(p / q), r = p - w * q; return r === 0 ? `${w}` : w ? `${w} ${r}/${q}` : `${r}/${q}`; };

module.exports = {
  mixedFrac,
  ...L, USED, N, gcd, lcm, gcdA, lcmA, hcfSlow, lcmSlow, divisors, factor, pf, isPrime, range, cap, pick, dec2,
  U, opts, AQ, SQ, clock, clockH, frac, guard, cross, andE, andH,
};
