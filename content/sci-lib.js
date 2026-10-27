// Shared helpers for the Simple & Compound Interest chapter (sci-*.js): one
// list of used numbers for the whole chapter, the sums of money and rates the
// questions use, and a guard that keeps every kind away from the numbers of
// the 48 questions already on the server (the old Mixed #1 tests).
//
// Hindi: "राशि" is feminine ("राशि ... हो जाती है"), "मूलधन", "मिश्रधन" and
// "ब्याज" masculine. People only appear with gendered verbs through w.v().
const L = require("./pl-lib");
const { n, rs, pct, clean, isInt, whole, hashOf } = L;
const { looksLikeRepeat, numberSignature } = require("../server/services/validationPipeline");
const ex = require("./sci-existing");

const USED = new Set();
const money = (x) => rs(Math.round(clean(x)));
const paise = (x) => rs(clean(x)); // ₹1,157.63 when it is not whole
const near2 = (x) => isInt(clean(x) * 100);
const nicePct = (x) => !/\d \d/.test(pct(clean(x))) && !/\.\d{3,}/.test(pct(clean(x)));
const yrs = (x) => `${n(x)} ${clean(x) === 1 ? "year" : "years"}`;
const yrsH = (x) => `${n(x)} वर्ष`;
const pw = (x, k) => clean(x ** k);
const g = (r) => 1 + r / 100; // growth factor of a year at r%
const f = (r) => n(g(r)); // written: 10 -> "1.1"

// Sums of money people really lend or deposit: ₹1,000 to ₹2,00,000 (written
// the en-US way, 200,000, like every other chapter).
const D = [10, 12, 12.5, 15, 16, 18, 20, 24, 25, 30, 32, 35, 36, 40, 45, 48, 50, 60, 64, 72, 75, 80, 90];
const PRINC = [...new Set([100, 1000, 10000].flatMap((k) => D.map((d) => clean(d * k))).concat([6250, 15625, 31250, 62500, 8000, 16000]))]
  .filter((p) => p >= 1000 && p <= 200000).sort((a, b) => a - b);
const SI_RATES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12.5, 14, 15, 16, 18, 20];
const CI_RATES = [4, 5, 8, 10, 12, 12.5, 15, 16, 20, 25];
const TIMES = [2, 3, 4, 5, 6, 7, 8, 10];

// "doubles itself" / "triples itself" / "becomes 4 times itself" - and the
// Hindi with the same numbers (no digit on either side for 2 and 3).
const times = (m) => (m === 2 ? "doubles itself" : m === 3 ? "triples itself" : `becomes ${m} times itself`);
const timesH = (m) => (m === 2 ? "दोगुनी हो जाती है" : m === 3 ? "तिगुनी हो जाती है" : `${m} गुनी हो जाती है`);
const become = (m) => (m === 2 ? "double itself" : m === 3 ? "triple itself" : `become ${m} times itself`);
const becomeH = (m) => (m === 2 ? "दोगुनी हो जाएगी" : m === 3 ? "तिगुनी हो जाएगी" : `${m} गुनी हो जाएगी`);

// Options in years, with the Hindi words.
function yearChoices(ans, slips, step = 1) {
  const o = choices(ans, yrs, slips.filter((x) => isInt(clean(x * 2)) && x > 0), { step, near: 0.5 });
  return { o, oh: o.map((s) => s.replace(/ years?$/, " वर्ष")) };
}
const YQ = (t, q, qh, ans, slips, value, s, sh, step) => { const { o, oh } = yearChoices(ans, slips, step); return L.Q(t, q, qh, o, 0, () => yrs(value()), s, sh, oh); };

// One set of numbers per key, so two questions of a test never share most of
// their numbers.
const thin = (list, key) => { const m = new Map(); for (const p of list) { const k = JSON.stringify(key(p)); const h = hashOf(p); if (!m.has(k) || h < m.get(k)[0]) m.set(k, [h, p]); } return [...m.values()].map((x) => x[1]); };
const pick = (list, prm, salt = 0) => list[(hashOf(prm) + salt) % list.length];

// Drops the sets of numbers that would make a question the server already
// has (same numbers, same words), and the ones a kind cannot build. Two
// questions of the chapter never show the same numbers, whatever their kind
// (the server calls "CI on ₹1,800 at 20% for 2 years" and "CI − SI on ₹1,800
// at 20% for 2 years" a repeat).
function guard(kinds) {
  for (const k of kinds) {
    k.key = (p) => `sci|${numberSignature(k.build("x · y · Easy #1", p).q)}`;
    const orig = k.cands;
    let memo;
    k.cands = () => (memo = memo || orig().filter((p) => {
      try { return !looksLikeRepeat(k.build("x · y · Easy #1", p).q, ex.texts).repeat; } catch (e) { return false; }
    }));
  }
  return kinds;
}

// The wrong options are slips worked out exactly: one that is not a clean
// number (₹7,812.50 shown as ₹7,813, 3.5714% as 3.57%) is dropped, not
// rounded, so no option looks like a rounded right answer.
const clean2 = (x) => clean(x);
function choices(ans, show, slips, opt) {
  const ok = (x) => Number.isFinite(x) && x > 0 && (show === money ? whole(x) : show === paise ? near2(x) : show === pct ? isInt(clean(x * 4)) || isInt(clean(x * 3)) : true);
  return L.choices(ans, show, slips.map(clean2).filter(ok), opt);
}
// (1.1)^2, but just 1.1 for one year.
const pw1 = (r, k) => (k === 1 ? f(r) : `(${f(r)})^${k}`);

module.exports = { ...L, choices, pw1, USED, money, paise, near2, nicePct, yrs, yrsH, pw, g, f, PRINC, SI_RATES, CI_RATES, TIMES, times, timesH, become, becomeH, yearChoices, YQ, thin, pick, guard };
