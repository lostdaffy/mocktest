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
// A raised power is a number the question gives: 2¹⁵ gives 2 and 15.
const RAISED = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
function numbersIn(text) {
  const plain = String(text || "").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => RAISED[c]).join(""));
  return (plain.replace(/(\d),(\d{3})\b/g, "$1$2").match(/\d+(?:\.\d+)?/g) || []).map(Number);
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
  // Not when the numbers are powers (2^10, 3⁵) or the question asks for a
  // digit of the result: "the unit digit of the LCM of 2^10 and 3^5".
  if (only && nums.length >= 2 && nums.length <= 4 && nums.every((n) => Number.isInteger(n) && n > 0)
      && !/[\^²³¹⁰-⁹]|digit|अंक/i.test(text)
      && !/(शेष|remainder|भाग|divid|घंटी|bell|अनुपात|ratio|गुणनफल|product|बड़ी|छोटी|largest|smallest|greatest|least|एक\s*संख्या|दो\s*संख्याओं|one\s+number|one\s+of|first\s|\d+\s*(?:to|से)\s*\d+|two\s+(?:[-\w]+\s+)?numbers|pairs?\b|\bsum\b|\u092F\u0941\u0917\u094D\u092E|\u092F\u094B\u0917)/i.test(text)) {
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

// The working is a small language, read and run here - never eval'd:
//
//   numbers, + - * / ^, ( ), a postfix % (12% is 0.12), pi
//   comparisons == != < <= > >= and the words and / or / not (true is 1)
//   sqrt cbrt abs round floor ceil pow min max hcf gcd lcm
//   mod(a, b)            remainder, always 0 .. b-1
//   powmod(b, e, m)      b^e mod m for huge e (exact, BigInt)
//   unitdigit(b, e)      last digit of b^e
//   fact(n) ncr(n, r) npr(n, r)
//   tau(n) sigma(n) phi(n) isprime(n) digitsum(n)
//   count(n, a, b, condition)   how many n from a to b make it true
//   sum(n, a, b, value) product(n, a, b, value)
//   first(n, a, b, condition) last(n, a, b, condition)   smallest / largest such n
//
// The counting forms are what let "how many numbers from 1 to 2,000 are
// divisible by none of 2, 3, 5 and 7" or "the sum of the factors of 2,520
// that are odd" be worked out in code, not trusted to the model - the
// Factors and Multiples tests of 2026-10-20 were mostly questions of that
// shape, and the one wrong key among them was one too. Loops are capped, so
// a working cannot run away with the server.
const MAX_STEPS = 3_000_000;
const MAX_FACTOR_N = 1e12;
const intOnly = (name, ...xs) => {
  for (const x of xs) if (!Number.isInteger(x)) throw new Error(`${name} needs whole numbers`);
};
const tauOf = (n) => { let c = 0; for (let d = 1; d * d <= n; d++) if (n % d === 0) c += d * d === n ? 1 : 2; return c; };
const sigmaOf = (n) => { let s = 0; for (let d = 1; d * d <= n; d++) if (n % d === 0) s += d * d === n ? d : d + n / d; return s; };
const phiOf = (n) => { let r = n, x = n; for (let p = 2; p * p <= x; p++) if (x % p === 0) { while (x % p === 0) x /= p; r -= r / p; } if (x > 1) r -= r / x; return r; };
const isPrimeN = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
const powmodBig = (b, e, m) => {
  let r = 1n, x = ((BigInt(b) % BigInt(m)) + BigInt(m)) % BigInt(m), k = BigInt(e);
  const M = BigInt(m);
  while (k > 0n) { if (k & 1n) r = (r * x) % M; x = (x * x) % M; k >>= 1n; }
  return Number(r % M);
};
const FNS = {
  sqrt: (x) => Math.sqrt(x), cbrt: (x) => Math.cbrt(x), abs: (x) => Math.abs(x), round: (x) => Math.round(x),
  floor: (x) => Math.floor(x + 1e-9), ceil: (x) => Math.ceil(x - 1e-9),
  pow: (a, b) => Math.pow(a, b), min: (...a) => Math.min(...a), max: (...a) => Math.max(...a),
  gcd: (...a) => a.reduce((x, y) => gcd(x, y)), hcf: (...a) => a.reduce((x, y) => gcd(x, y)), lcm: (...a) => a.reduce((x, y) => lcm(x, y)),
  mod: (a, b) => { intOnly("mod", a, b); if (!b) throw new Error("mod by 0"); return ((a % b) + Math.abs(b)) % Math.abs(b); },
  powmod: (b, e, m) => { intOnly("powmod", b, e, m); if (e < 0 || m < 1) throw new Error("powmod needs e >= 0, m >= 1"); return powmodBig(b, e, m); },
  unitdigit: (b, e) => { intOnly("unitdigit", b, e); if (e < 0) throw new Error("unitdigit needs e >= 0"); return powmodBig(Math.abs(b), e, 10); },
  fact: (n) => { intOnly("fact", n); if (n < 0 || n > 170) throw new Error("fact needs 0..170"); let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; },
  ncr: (n, r) => { intOnly("ncr", n, r); if (r < 0 || r > n) return 0; let v = 1; for (let k = 1; k <= r; k++) v = (v * (n - r + k)) / k; return Math.round(v); },
  npr: (n, r) => { intOnly("npr", n, r); if (r < 0 || r > n) return 0; let v = 1; for (let k = 0; k < r; k++) v *= n - k; return v; },
  tau: (n) => { intOnly("tau", n); if (n < 1 || n > MAX_FACTOR_N) throw new Error("tau needs 1..10^12"); return tauOf(n); },
  sigma: (n) => { intOnly("sigma", n); if (n < 1 || n > MAX_FACTOR_N) throw new Error("sigma needs 1..10^12"); return sigmaOf(n); },
  phi: (n) => { intOnly("phi", n); if (n < 1 || n > MAX_FACTOR_N) throw new Error("phi needs 1..10^12"); return phiOf(n); },
  isprime: (n) => { intOnly("isprime", n); if (n > MAX_FACTOR_N) throw new Error("isprime needs n <= 10^12"); return isPrimeN(n) ? 1 : 0; },
  digitsum: (n) => { intOnly("digitsum", n); return String(Math.abs(n)).split("").reduce((s, d) => s + Number(d), 0); },
};
const LOOPS = new Set(["count", "sum", "product", "first", "last"]);
const WORD_OPS = { and: "&&", or: "||", not: "!" };

function evaluateArithmetic(src) {
  const toks = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_]+)|(\*\*|==|!=|<=|>=|&&|\|\||[-+*/^(),%<>!]))/y;
  const s = String(src || "").replace(/×/g, "*").replace(/÷/g, "/").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/≠/g, "!=");
  let m;
  re.lastIndex = 0;
  while (re.lastIndex < s.length) {
    m = re.exec(s);
    if (!m) {
      if (/^\s*$/.test(s.slice(re.lastIndex))) break;
      throw new Error(`cannot read "${s.slice(re.lastIndex, re.lastIndex + 8)}"`);
    }
    if (m[1]) toks.push({ t: "num", v: Number(m[1]) });
    else if (m[2]) {
      const w = m[2].toLowerCase();
      if (WORD_OPS[w]) toks.push({ t: "op", v: WORD_OPS[w] });
      else toks.push({ t: "id", v: w });
    } else toks.push({ t: "op", v: m[3] === "**" ? "^" : m[3] });
  }

  // ---- parse into a tree (a loop body is run once per value, so it cannot
  //      be worked out while reading)
  let i = 0;
  const peek = () => toks[i];
  const take = (v) => {
    const t = toks[i];
    if (!t || (v && t.v !== v)) throw new Error(`expected ${v || "more"}`);
    i++;
    return t;
  };
  const used = [];
  let operators = 0;
  const bound = [];
  function primary() {
    const t = peek();
    if (!t) throw new Error("ends too early");
    if (t.t === "num") { used.push(t.v); take(); return { k: "num", v: t.v }; }
    if (t.v === "(") { take("("); const e = orExpr(); take(")"); return e; }
    if (t.v === "-") { take("-"); operators++; return { k: "neg", a: power() }; }
    if (t.v === "+") { take("+"); return power(); }
    if (t.v === "!") { take("!"); operators++; return { k: "not", a: power() }; }
    if (t.t === "id") {
      const name = take().v;
      if (name === "pi") return { k: "num", v: Math.PI };
      if (bound.includes(name) && peek()?.v !== "(") return { k: "var", name };
      operators++;
      if (LOOPS.has(name)) {
        take("(");
        const v = peek();
        if (!v || v.t !== "id" || FNS[v.v] || LOOPS.has(v.v)) throw new Error(`${name} needs a letter to count with, e.g. ${name}(n, 1, 100, ...)`);
        take();
        take(",");
        const from = orExpr(); take(",");
        const to = orExpr(); take(",");
        bound.push(v.v);
        const body = orExpr();
        bound.pop();
        take(")");
        return { k: "loop", name, v: v.v, from, to, body };
      }
      if (!FNS[name]) throw new Error(peek()?.v === "(" ? `unknown function ${name}` : `unknown name ${name} (a letter is only known inside count/sum/product/first/last)`);
      take("(");
      const args = [orExpr()];
      while (peek()?.v === ",") { take(","); args.push(orExpr()); }
      take(")");
      return { k: "fn", name, args };
    }
    throw new Error(`unexpected "${t.v}"`);
  }
  function power() {
    let base = primary();
    for (;;) {
      if (peek()?.v === "^") { take("^"); operators++; base = { k: "bin", op: "^", a: base, b: power() }; continue; }
      if (peek()?.v === "%") { take("%"); operators++; base = { k: "pct", a: base }; continue; }
      return base;
    }
  }
  const chain = (next, ops) => () => {
    let v = next();
    while (peek() && ops.includes(peek().v)) { const op = take().v; operators++; v = { k: "bin", op, a: v, b: next() }; }
    return v;
  };
  const term = chain(power, ["*", "/"]);
  const sum = chain(term, ["+", "-"]);
  const cmp = chain(sum, ["==", "!=", "<", "<=", ">", ">="]);
  const andExpr = chain(cmp, ["&&"]);
  const orExpr = chain(andExpr, ["||"]);
  const tree = orExpr();
  if (i !== toks.length) throw new Error(`unexpected "${toks[i].v}"`);

  // ---- run it
  let steps = 0;
  const env = {};
  const B = (x) => (x ? 1 : 0);
  function run(n) {
    if (++steps > MAX_STEPS) throw new Error("too much counting - narrow the range");
    switch (n.k) {
      case "num": return n.v;
      case "var": return env[n.name];
      case "neg": return -run(n.a);
      case "not": return B(!run(n.a));
      case "pct": return run(n.a) / 100;
      case "fn": return FNS[n.name](...n.args.map(run));
      case "bin": {
        if (n.op === "&&") return B(run(n.a) && run(n.b));
        if (n.op === "||") return B(run(n.a) || run(n.b));
        const a = run(n.a), b = run(n.b);
        switch (n.op) {
          case "+": return a + b; case "-": return a - b; case "*": return a * b; case "/": return a / b;
          case "^": return Math.pow(a, b);
          case "==": return B(close(a, b)); case "!=": return B(!close(a, b));
          case "<": return B(a < b); case "<=": return B(a <= b || close(a, b)); case ">": return B(a > b); case ">=": return B(a >= b || close(a, b));
        }
        throw new Error(`unknown operator ${n.op}`);
      }
      case "loop": {
        const from = run(n.from), to = run(n.to);
        intOnly(n.name, from, to);
        if (to - from > 2_000_000) throw new Error(`${n.name} over more than 2,000,000 values`);
        const saved = env[n.v];
        let acc = n.name === "product" ? 1 : 0;
        let found = null;
        for (let x = from; x <= to; x++) {
          env[n.v] = x;
          const val = run(n.body);
          if (n.name === "count") acc += val ? 1 : 0;
          else if (n.name === "sum") acc += val;
          else if (n.name === "product") acc *= val;
          else if (val) { found = x; if (n.name === "first") break; }
        }
        env[n.v] = saved;
        if (n.name === "first" || n.name === "last") { if (found === null) throw new Error(`no value from ${from} to ${to} fits`); return found; }
        return acc;
      }
    }
    throw new Error("cannot run this");
  }
  const value = run(tree);
  if (!Number.isFinite(value)) throw new Error("does not give a number");
  return { value, used, operators };
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
