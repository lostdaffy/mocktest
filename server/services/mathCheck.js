// Works out the answer to the common arithmetic question shapes in code, and
// says when the marked option is not it - or when the question cannot be
// true at all.
//
// Reading the Super TET mocks found the same kinds of wrong keys again and
// again: "HCF 12, LCM 600, one number 120" (the other would be 60, whose HCF
// with 120 is 60, not 12), "place value minus face value of 4 in 58439"
// marked 3996 (it is 396), simple interest from two amounts marked 12.5%
// (it is 13.6%). The model's own re-solve passed every one. These are sums,
// so they are checked as sums.
//
// Only shapes it can read for certain are judged; anything else is left
// alone (null). No requires, on purpose: the same file is pasted into a
// browser to measure it against the live bank before it is trusted.

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a && b ? Math.abs(a * b) / gcd(a, b) : 0);
const close = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

// The numbers in a piece of text, in order ("1,200" is 1200; "₹ 400" is 400).
function numbersIn(text) {
  return (String(text || "").replace(/(\d),(\d{3})\b/g, "$1$2").match(/\d+(?:\.\d+)?/g) || []).map(Number);
}

// The single number an option stands for, or null if it is not just one
// number (with a unit or a % at most).
function optionValue(opt) {
  const s = String(opt || "").trim();
  if (/\d\s*\/\s*\d/.test(s)) return null; // a fraction is not one number
  const n = numbersIn(s);
  return n.length === 1 ? n[0] : null;
}

const HCF = /(HCF|H\.C\.F|म\.\s*स\.\s*प|महत्तम\s*समापवर्त(?:क|्य|्त्य))/i;
const LCM = /(LCM|L\.C\.M|ल\.\s*स\.\s*प|लघुत्तम\s*समापवर्त(?:्य|्त्य|क))/i;

function judge(q, expected, what, tol) {
  const options = q.options || [];
  const values = options.map(optionValue);
  const hit = values.findIndex((v) => v !== null && (tol ? Math.abs(v - expected) <= tol : close(v, expected)));
  if (hit < 0) return { ok: false, reason: `${what} is ${+expected.toFixed(4)}, which is not among the options` };
  if (hit !== q.correctIndex) return { ok: false, reason: `${what} is ${+expected.toFixed(4)} (option ${"ABCD"[hit]}), not the marked option` };
  return { ok: true };
}

/** { ok: true | false | null, reason } for one question. */
function checkArithmetic(q) {
  const text = String(q.text || "");
  if (!text || !Array.isArray(q.options) || q.options.length !== 4) return { ok: null };
  // Powers and products are not read: 2^3 x 3^2 is not the numbers 2, 3, 3, 2.
  if (/[\^×]|\d\s*[xX]\s*\d/.test(text)) return { ok: null };
  const nums = numbersIn(text);

  // The number a phrase gives: the first number within a few words after it
  // ("HCF of two numbers is 12", "(LCM) 600 है"). Null when there is none.
  const valueAfter = (re) => {
    const m = new RegExp(re.source + "[^\\d]{0,40}?(\\d+(?:\\.\\d+)?)", "i").exec(text.replace(/(\d),(\d{3})\b/g, "$1$2"));
    return m ? Number(m[m.length - 1]) : null;
  };
  // Shapes that only look like the plain ones: "LCM is 12 times the HCF",
  // "their sum is 403", "the larger number", "product of HCF and LCM".
  const tangled = /(गुना|times|योग|sum|अंतर|difference|बड़ी|छोटी|अधिक|greater|larger|smaller|गुणनफल|product)/i;
  const ONE = /(एक\s*संख्या|one\s+(?:of\s+the\s+)?numbers?)/i;

  // HCF h, LCM l, one number a -> the other is h*l/a, and must give back h and l.
  if (HCF.test(text) && LCM.test(text) && ONE.test(text) && !tangled.test(text)) {
    let h = valueAfter(HCF);
    let l = valueAfter(LCM);
    if (/(respectively|क्रमशः)/i.test(text)) {
      const firstTwo = numbersIn(text.slice(0, text.search(ONE)));
      if (firstTwo.length === 2) [h, l] = text.search(HCF) < text.search(LCM) ? firstTwo : [firstTwo[1], firstTwo[0]];
    }
    const a = valueAfter(ONE);
    if (h && l && a && h !== l && nums.length === 3) {
      const b = (h * l) / a;
      if (!Number.isInteger(b) || gcd(a, b) !== h || lcm(a, b) !== l) {
        return { ok: false, reason: `no pair has HCF ${h} and LCM ${l} with ${a} in it - the question cannot be true` };
      }
      return judge(q, b, "the other number");
    }
  }

  // HCF h and product p -> LCM is p/h; a pair must exist.
  const PRODUCT = /(गुणनफल|product)/i;
  if (HCF.test(text) && PRODUCT.test(text) && LCM.test(text) && nums.length === 2 && !/(times|गुना|योग|sum)/i.test(text)) {
    const h = valueAfter(HCF);
    const p = valueAfter(PRODUCT);
    if (h && p && h !== p && text.search(PRODUCT) > text.search(HCF) - 1 && !new RegExp(LCM.source + "[^\\d]{0,40}?\\d", "i").test(text)) {
      if (p % (h * h) !== 0) return { ok: false, reason: `no pair has HCF ${h} and product ${p} - the question cannot be true` };
      return judge(q, p / h, "the LCM");
    }
  }

  // LCM / HCF of numbers listed in the question, nothing else numeric.
  const only = HCF.test(text) !== LCM.test(text);
  if (only && nums.length >= 2 && nums.length <= 4 && nums.every((n) => Number.isInteger(n) && n > 0)
      && !/(शेष|remainder|भाग|divid|घंटी|bell|अनुपात|ratio|गुणनफल|product|बड़ी|छोटी|largest|smallest|greatest|least|एक\s*संख्या|दो\s*संख्याओं|one\s+number|one\s+of|two\s+(?:[-\w]+\s+)?numbers|pairs?\b|\bsum\b|\u092F\u0941\u0917\u094D\u092E|\u092F\u094B\u0917)/i.test(text)) {
    const value = HCF.test(text) ? nums.reduce(gcd) : nums.reduce(lcm);
    return judge(q, value, HCF.test(text) ? "the HCF" : "the LCM");
  }

  // Place value / face value of a digit in a number.
  const pv = /(स्थानीय\s*मान|place\s*value)/i.test(text);
  const fv = /(जातीय\s*मान|अंकित\s*मान|face\s*value)/i.test(text);
  if ((pv || fv) && nums.length === 2) {
    const [n, d] = nums[0] >= 10 ? nums : [nums[1], nums[0]];
    const s = String(n);
    if (Number.isInteger(n) && Number.isInteger(d) && d >= 0 && d <= 9 && s.split(String(d)).length === 2) {
      const place = d * 10 ** (s.length - 1 - s.indexOf(String(d)));
      if (pv && fv && /(अंतर|difference)/i.test(text)) return judge(q, place - d, "place value minus face value");
      if (pv && !fv) return judge(q, place, "the place value");
      if (fv && !pv) return judge(q, d, "the face value");
    }
  }

  // Simple interest: an amount A1 after t1 years and A2 after t2 years.
  if (/(साधारण\s*ब्याज|simple\s*interest)/i.test(text) && /(वर्ष|years?)/i.test(text) && nums.length === 4
      && !/(चक्रवृद्धि|compound)/i.test(text)) {
    const [a1, t1, a2, t2] = nums[1] < nums[0] && nums[3] < nums[2] ? nums : [nums[1], nums[0], nums[3], nums[2]];
    if (t2 !== t1 && a1 > 0 && a2 > 0 && t1 < 50 && t2 < 50 && a1 > t1 * 10) {
      const perYear = (a2 - a1) / (t2 - t1);
      const principal = a1 - perYear * t1;
      if (principal > 0) {
        if (/(दर|rate)/i.test(text) && !/(मूलधन|principal|राशि\s*ज्ञात)/i.test(text.slice(-60))) return judge(q, (perYear / principal) * 100, "the rate", 0.02);
        if (/(मूलधन|principal)/i.test(text)) return judge(q, principal, "the principal");
      }
    }
  }

  return { ok: null };
}

// ---- every other numeric maths question: the setter's working, run in code
//
// The generator writes, beside each numeric question, the sum that gives its
// answer - "formula": "1200 * 12 * 3 / 100" - using only the numbers in the
// question. Code works it out and checks the marked option is that number,
// and that no other option is. A slip in the arithmetic, an answer key on
// the wrong option, or options that do not contain the answer all show here,
// in every chapter, not just the shapes above.

// Constants a working may use without them appearing in the question: unit
// conversions, percent, a dozen, days and degrees, pi as 22/7.
const FREE_NUMBERS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 22, 24, 30, 60, 100, 1000, 360, 365, 3600, 0.5]);

function evaluateArithmetic(src) {
  const toks = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_]+)|(\*\*|[-+*/^(),%]))/y;
  const s = String(src || "").replace(/×/g, "*").replace(/÷/g, "/");
  let m;
  re.lastIndex = 0;
  while (re.lastIndex < s.length) {
    m = re.exec(s);
    if (!m) {
      if (/^\s*$/.test(s.slice(re.lastIndex))) break;
      throw new Error(`cannot read "${s.slice(re.lastIndex, re.lastIndex + 8)}"`);
    }
    if (m[1]) toks.push({ t: "num", v: Number(m[1]) });
    else if (m[2]) toks.push({ t: "id", v: m[2].toLowerCase() });
    else toks.push({ t: "op", v: m[3] === "**" ? "^" : m[3] });
  }
  let i = 0;
  const peek = () => toks[i];
  const take = (v) => {
    const t = toks[i];
    if (!t || (v && t.v !== v)) throw new Error(`expected ${v || "more"}`);
    i++;
    return t;
  };
  const FNS = {
    sqrt: (x) => Math.sqrt(x), cbrt: (x) => Math.cbrt(x), abs: (x) => Math.abs(x), round: (x) => Math.round(x),
    pow: (a, b) => Math.pow(a, b), min: (...a) => Math.min(...a), max: (...a) => Math.max(...a),
    gcd: (...a) => a.reduce((x, y) => gcd(x, y)), hcf: (...a) => a.reduce((x, y) => gcd(x, y)), lcm: (...a) => a.reduce((x, y) => lcm(x, y)),
  };
  const used = [];
  function primary() {
    const t = peek();
    if (!t) throw new Error("ends too early");
    if (t.t === "num") { used.push(t.v); return take().v; }
    if (t.v === "(") { take("("); const v = expr(); take(")"); return v; }
    if (t.v === "-") { take("-"); return -power(); }
    if (t.v === "+") { take("+"); return power(); }
    if (t.t === "id") {
      const name = take().v;
      if (name === "pi") return Math.PI;
      const fn = FNS[name];
      if (!fn) throw new Error(`unknown function ${name}`);
      take("(");
      const args = [expr()];
      while (peek()?.v === ",") { take(","); args.push(expr()); }
      take(")");
      return fn(...args);
    }
    throw new Error(`unexpected "${t.v}"`);
  }
  function power() {
    const base = primary();
    if (peek()?.v === "^") { take("^"); return Math.pow(base, power()); }
    if (peek()?.v === "%") { take("%"); return base / 100; }
    return base;
  }
  function term() {
    let v = power();
    while (peek() && (peek().v === "*" || peek().v === "/")) v = take().v === "*" ? v * power() : v / power();
    return v;
  }
  function expr() {
    let v = term();
    while (peek() && (peek().v === "+" || peek().v === "-")) v = take().v === "+" ? v + term() : v - term();
    return v;
  }
  const value = expr();
  if (i !== toks.length) throw new Error(`unexpected "${toks[i].v}"`);
  if (!Number.isFinite(value)) throw new Error("does not give a number");
  return { value, used, operators: toks.filter((t) => t.t === "op" && t.v !== "(" && t.v !== ")" && t.v !== ",").length + toks.filter((t) => t.t === "id").length };
}

// An option matches when it is the worked value rounded to the places the
// option is written to: "33.3" or "33.33" for 33.333..., but "0.8" is not
// 0.75 and "430" is not 432.
function near(option, value, worked) {
  const m = String(option).replace(/,/g, "").match(/\d+(?:\.(\d+))?/);
  const places = m && m[1] ? m[1].length : 0;
  return Math.abs(value - worked) <= 0.5 * 10 ** -places + 1e-9;
}

/**
 * { ok: true | false | null, reason } - null when there is no formula or the
 * answer is not a single number (a ratio, an expression, a statement).
 */
// An option that is a number - "Rs 432", "₹ 1,200", "12.5%", "25 km/h",
// "432 रुपये" - and not words with a number in them ("Option 2", "RIGHT
// answer 1").
function isNumberOption(opt) {
  const s = String(opt || "").trim();
  return optionValue(s) !== null && /^(?:rs\.?|inr|₹|\$)?\s*-?[\d,]*\.?\d+\s*(?:%|[a-zऀ-ॿ/²³ .]{0,14})$/i.test(s);
}

function checkFormula(q) {
  const formula = String(q.formula || "").trim();
  const values = (q.options || []).map(optionValue);
  if (!formula) return { ok: null, reason: "no formula" };
  if (!(q.options || []).every(isNumberOption)) return { ok: null, reason: "the options are not single numbers" };
  let run;
  try {
    run = evaluateArithmetic(formula);
  } catch (err) {
    return { ok: false, reason: `the working "${formula}" cannot be run: ${err.message}` };
  }
  if (!run.operators) return { ok: false, reason: `the working "${formula}" is just a number, not a sum` };
  const given = new Set([...numbersIn(q.text), ...numbersIn(q.textHi)].map((n) => +n.toFixed(6)));
  const foreign = run.used.filter((n) => !given.has(+n.toFixed(6)) && !FREE_NUMBERS.has(n));
  if (foreign.length) return { ok: false, reason: `the working uses ${foreign.join(", ")}, which the question does not give` };
  const hits = values.map((v, k) => (near(q.options[k], v, run.value) ? k : -1)).filter((k) => k >= 0);
  const shown = +run.value.toFixed(4);
  if (!hits.length) return { ok: false, reason: `the working gives ${shown}, which is not among the options` };
  if (hits.length > 1) return { ok: false, reason: `${shown} matches more than one option` };
  if (hits[0] !== q.correctIndex) return { ok: false, reason: `the working gives ${shown} (option ${"ABCD"[hits[0]]}), not the marked option` };
  return { ok: true };
}

if (typeof module !== "undefined") module.exports = { checkArithmetic, checkFormula, evaluateArithmetic, isNumberOption, numbersIn, optionValue };
