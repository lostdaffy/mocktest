// Rules found by reading real questions, each one a fault that reached a
// test before it was written down. Pure functions, no database, no AI - so
// the generator, the spreadsheet upload and the chapter health check all
// judge a question the same way.
const { numbersIn, optionValue } = require("./mathCheck");

const DEVANAGARI_DIGITS = /[०-९]/g;
const toAscii = (s) => String(s || "").replace(DEVANAGARI_DIGITS, (d) => String("०१२३४५६७८९".indexOf(d)));

// ---- 1. "between" that can be read two ways --------------------------------
// "How many multiples of 12 lie between 300 and 500?" - 300 is itself a
// multiple of 12, so 16 and 17 are both defensible, and both were options
// (Factors and Multiples Easy #7, found 2026-10-21). A count over a range is
// only unambiguous when neither end can be counted, or the question says
// whether the ends are included.
const BETWEEN_EN = /\bbetween\s+(\d[\d,]*)\s+and\s+(\d[\d,]*)/i;
const BETWEEN_HI = /(\d[\d,]*)\s+(?:और|तथा|एवं)\s+(\d[\d,]*)\s+के\s+बीच/;
const SAYS_ENDS = /\b(inclusive|exclusive|both\s+(?:included|inclusive|excluded)|including|excluding|not\s+including)\b|सम्मिलित|शामिल|छोड़कर/i;
const COUNTS = /\bhow many\b|\bnumber of\b|कितनी|कितने|संख्या\s+ज्ञात/i;
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcmAll = (xs) => xs.reduce((a, b) => (a / gcd(a, b)) * b, 1);
const listOf = (s) => (String(s).match(/\d[\d,]*/g) || []).map((x) => Number(x.replace(/,/g, ""))).filter((n) => n > 1);

// What a number must satisfy to be counted, read from the common shapes -
// or null when the shape is not one of these (then nothing is claimed).
// Only an end that would itself be counted makes "between" ambiguous:
// "between 1 and 200 ... divisible by both 3 and 5" is clear, since 200 is
// not a multiple of 15 however the range is read.
function countedTest(text) {
  const t = text.toLowerCase();
  const butNot = /\bbut not (?:by |of )?(\d+)/.exec(t);
  const notBy = butNot ? Number(butNot[1]) : null;
  const and = (f) => (n) => f(n) && (notBy ? n % notBy !== 0 : true);
  let m;
  if ((m = /remainder of (\d+) when divided by (?:each of )?([\d,\sand]+)/.exec(t)) || (m = /leaves? (?:a )?remainder (\d+) (?:when divided by|with) (?:each of )?([\d,\sand]+)/.exec(t))) {
    const r = Number(m[1]);
    const L = lcmAll(listOf(m[2]));
    return (n) => n % L === r;
  }
  if ((m = /neither (?:by )?(\d+) nor (?:by )?(\d+)/.exec(t))) {
    const [x, y] = [Number(m[1]), Number(m[2])];
    return (n) => n % x !== 0 && n % y !== 0;
  }
  if ((m = /divisible by (?:either )?(\d+) or (?:by )?(\d+)/.exec(t)) && !/\bboth\b/.test(t)) {
    const [x, y] = [Number(m[1]), Number(m[2])];
    return and((n) => n % x === 0 || n % y === 0);
  }
  // A list of divisors - "2, 3, and 5", "4 and 6" - each a whole number, with
  // its thousands comma ("1,000") kept apart from the list's own commas.
  if ((m = /divisible by (?:both |each of |all of |all )?((?:\d{1,3}(?:,\d{3})*(?:\s*,\s*(?:and\s+)?|\s+and\s+)?)+)/.exec(t))) {
    const L = lcmAll(listOf(m[1].replace(/\bbut\b.*$/, "")));
    return L > 1 ? and((n) => n % L === 0) : null;
  }
  if ((m = /multiples? of (\d+)/.exec(t))) {
    const k = Number(m[1]);
    return and((n) => n % k === 0);
  }
  return null;
}
function ambiguousBetween(q) {
  const text = toAscii(q.text);
  if (!COUNTS.test(text) && !COUNTS.test(toAscii(q.textHi))) return null;
  if (SAYS_ENDS.test(text) || SAYS_ENDS.test(q.textHi || "")) return null;
  const m = BETWEEN_EN.exec(text) || BETWEEN_HI.exec(toAscii(q.textHi));
  if (!m) return null;
  const a = Number(m[1].replace(/,/g, ""));
  const b = Number(m[2].replace(/,/g, ""));
  const counted = countedTest(text.replace(BETWEEN_EN, " "));
  if (!counted) return null;
  const end = counted(a) ? a : counted(b) ? b : null;
  if (end === null) return null;
  return `"between ${a} and ${b}" can be read two ways: ${end} itself would be counted - say whether the ends count, or pick ends that would not be`;
}

// ---- 2. a maths question answered Yes / No / Maybe -------------------------
// Generated Factors and Multiples Easy had "Is 91 prime? Yes / No / Maybe /
// Cannot say" - a coin toss dressed as a question, and nothing to work out.
const VAGUE = /^(yes|no|maybe|perhaps|can'?t say|cannot (?:be )?(?:say|determined)|हाँ|हां|नहीं|शायद|कह नहीं सकते)\.?$/i;
function yesNoOptions(q) {
  const vague = (q.options || []).filter((o) => VAGUE.test(String(o).trim())).length;
  return vague >= 2 ? "the options are Yes / No / Maybe - ask for something to work out instead" : null;
}

// ---- 3. a number changed in translation ------------------------------------
// The Hindi is what half the students read. A number that differs between
// the English and the Hindi question, or an option that is 45 in English and
// 54 in Hindi, makes one of the two languages wrong. Numbers written out as
// words in Hindi are fine (they are simply absent); a different number is not.
function numbersChangedInHindi(q) {
  if (!q.textHi) return null;
  const en = numbersIn(toAscii(q.text)).map((n) => +n.toFixed(6));
  const hi = numbersIn(toAscii(q.textHi)).map((n) => +n.toFixed(6));
  const enSet = new Set(en);
  const extra = hi.filter((n) => !enSet.has(n));
  if (extra.length) return `the Hindi question has ${extra.slice(0, 3).join(", ")}, which the English question does not`;
  const opts = q.options || [];
  const optsHi = q.optionsHi || [];
  if (optsHi.length === opts.length) {
    for (let k = 0; k < opts.length; k++) {
      const a = optionValue(toAscii(opts[k]));
      const b = optionValue(toAscii(optsHi[k]));
      if (a !== null && b !== null && Math.abs(a - b) > 1e-9) return `option ${"ABCD"[k]} is ${opts[k]} in English but ${optsHi[k]} in Hindi`;
    }
  }
  return null;
}

// ---- 4. the same question pattern, numbers swapped -------------------------
// Generated Factors and Multiples Advanced #1 asked for "even factors of N"
// six times in twenty questions, each with a new N. Each passed the repeat
// check (different numbers), and together they made a test that drilled one
// idea. Two questions share a pattern when, with every number taken out,
// nearly all their words are the same.
const STOP = new Set("the a an of is are was what which find how many much to in on for and by with that this its it be if then from at as or into has have".split(" "));
// The shape of the maths, numbers left out: 2⁴¹ ÷ 7 is "P", (7¹³ + 1) ÷ 6
// is "P+N", (127⁹⁷ + 97⁹⁷) ÷ 32 is "P+P", 1! + 2! + ... is "F+F...". Two
// remainder questions with different shapes test different things.
const shapeOf = (text) =>
  "§" +
  String(text || "")
    .replace(/(\d+|\))[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/g, " P ")
    .replace(/\d[\d,]*(\.\d+)?\s*!/g, " F ")
    .replace(/\d[\d,]*(\.\d+)?\s*\/\s*\d[\d,]*/g, " Q ")
    .replace(/\d[\d,]*(\.\d+)?/g, " N ")
    .replace(/[^PFQN+×x*−\-÷/!.]+/g, "")
    .replace(/(N)+/g, "N")
    .slice(0, 40);
const patternWords = (text) => {
  const words = new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/g, " ")
      .replace(/[0-9][0-9,.]*/g, " ")
      .replace(/[^a-zऀ-ॿ]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 1 && !STOP.has(w))
  );
  words.add(shapeOf(text));
  return words;
};
function samePattern(a, b) {
  const x = patternWords(a);
  const y = patternWords(b);
  if (x.size < 3 || y.size < 3) return false;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / (x.size + y.size - shared) >= 0.8;
}
// How many of `others` share a pattern with `text`.
const patternCount = (text, others) => others.filter((o) => samePattern(text, o)).length;
// At most this many questions of one pattern in one test.
const MAX_PER_PATTERN = 3;

/** Every rule above that a question breaks, as readable issues. */
function qualityIssues(q, { maths = false } = {}) {
  const issues = [];
  if (maths) {
    const b = ambiguousBetween(q);
    if (b) issues.push(`ambiguous: ${b}`);
    const y = yesNoOptions(q);
    if (y) issues.push(y);
  }
  const n = numbersChangedInHindi(q);
  if (n) issues.push(`translation: ${n}`);
  return issues;
}

module.exports = { ambiguousBetween, yesNoOptions, numbersChangedInHindi, samePattern, patternCount, MAX_PER_PATTERN, qualityIssues };
