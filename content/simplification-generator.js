// Simplification questions for the practice tests that are at 12 of 20.
// Every answer is worked out here with exact fractions; the wrong options are
// the classic slips (left-to-right instead of BODMAS, a sign dropped, a step
// missed). Writes a CSV the admin's "Fill practice tests from a spreadsheet"
// takes as it is.
const fs = require("fs");

const TESTS = {
  easy: ["6ac09d7643e0284865e13824", "6ac09e0043e0284865e138b1", "6ac09e7443e0284865e13931", "6ac0a16043e0284865e13b82", "6ac0a32343e0284865e13d87", "6ac0a6b243e0284865e14118", "6ac0a72743e0284865e141ec", "6ac0a75d43e0284865e14240", "6ac0a7a843e0284865e142a1"],
  medium: ["6ac0a81943e0284865e14336", "6ac0a91c43e0284865e1442b", "6ac0a9ba43e0284865e144d2", "6ac0aa7443e0284865e14589", "6ac0aabc43e0284865e145f3", "6ac0ab9243e0284865e146c3", "6ac0abf643e0284865e1474d", "6ac0ac4243e0284865e147b8", "6ac0acac43e0284865e1484a"],
  hard: ["6ab6408123f2ffd4a625c83a", "6ac0add443e0284865e1499b", "6ac0aec943e0284865e14a84", "6ac0afbd43e0284865e14b73", "6ac0b14643e0284865e14cd3", "6ac0b1f143e0284865e14d9b", "6ac0b2fb43e0284865e14ea0", "6ac0b3cc43e0284865e14f81", "6ac0b4b243e0284865e1506b", "6ac0b54c43e0284865e15131"],
  advanced: ["6ab6413e23f2ffd4a625c86b", "6ac0ba7138d88a6afcd61552", "6ac0bb0f38d88a6afcd6160c", "6ac0bbf138d88a6afcd6170c", "6ac0bd2b38d88a6afcd61842", "6ac0bdd938d88a6afcd61931", "6ac0be6738d88a6afcd61a0d", "6ac0bf0538d88a6afcd61af3", "6ac0c04438d88a6afcd61c57", "6ac0c0d538d88a6afcd61d1d"],
};

// ---- seeded randomness, so the file is the same every run
let seed = 20261017;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---- exact fractions
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
class F {
  constructor(n, d = 1) {
    if (d === 0) throw new Error("divide by zero");
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    this.n = n / g; this.d = d / g;
  }
  add(o) { o = fr(o); return new F(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = fr(o); return new F(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = fr(o); return new F(this.n * o.n, this.d * o.d); }
  div(o) { o = fr(o); return new F(this.n * o.d, this.d * o.n); }
  eq(o) { o = fr(o); return this.n === o.n && this.d === o.d; }
  isInt() { return this.d === 1; }
  val() { return this.n / this.d; }
  toString() {
    if (this.d === 1) return String(this.n);
    // a terminating decimal is written as a decimal, otherwise as a fraction
    let d = this.d; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5;
    if (d === 1) return String(+(this.n / this.d).toFixed(6));
    return `${this.n}/${this.d}`;
  }
}
const fr = (x) => (x instanceof F ? x : typeof x === "number" && Number.isInteger(x) ? new F(x) : decF(x));
// a decimal written as a string or number -> exact fraction
function decF(x) {
  const s = String(x);
  if (!s.includes(".")) return new F(Number(s));
  const [a, b] = s.split(".");
  const d = 10 ** b.length;
  return new F(Number(a) * d + Math.sign(Number(s) || 1) * Number(b), d);
}

// ---- options: the answer and three of the slips, all different
function options(answer, slips) {
  const asFraction = answer.toString().includes("/");
  // Every option in one format: all fractions, or all numbers.
  const show = (f) => (asFraction ? (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`) : f.toString());
  const places = (s) => ((s.split(".")[1] || "").length);
  // Two options a student cannot tell apart, or that the checker would read
  // as the same number, are not both kept.
  const clash = (s, f) => !asFraction && Math.abs(f.val() - answer.val()) <= 0.5 * 10 ** -places(s) + 1e-9;
  const out = [show(answer)];
  const tryAdd = (f) => {
    if (out.length === 4 || !f || !(f instanceof F) || f.n <= 0) return;
    const s = show(f);
    if (!asFraction && s.includes("/")) return;
    if (out.includes(s) || clash(s, f)) return;
    out.push(s);
  };
  for (const s of slips) {
    let f;
    try { f = fr(s); } catch { continue; }
    tryAdd(f);
  }
  // Near misses of the right kind, if the slips ran out.
  const near = asFraction
    ? [answer.add(new F(1, answer.d)), answer.sub(new F(1, answer.d)), answer.mul(2), answer.mul(new F(1, 2)), answer.add(new F(2, answer.d))]
    : answer.isInt()
      ? [answer.add(pick([1, 2, 3])), answer.sub(pick([1, 2, 3])), answer.add(pick([5, 10])), answer.sub(pick([5, 10])), answer.mul(2)]
      : [answer.mul(2), answer.mul(new F(1, 2)), answer.add(new F(1, 10)), answer.sub(new F(1, 10)), answer.mul(10), answer.add(1)];
  for (const f of near) tryAdd(f);
  let k = 3;
  while (out.length < 4) tryAdd(answer.add(k++));
  // the answer goes in a random place (Fisher-Yates, so each place is as likely)
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => out[i]), correct: "ABCD"[order.indexOf(0)], answerText: out[0] };
}

const rows = [];
const seen = new Set();
function add(level, q) {
  const key = q.question.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (seen.has(key)) return false;
  seen.add(key);
  const { options: opts, correct } = options(q.answer, q.slips);
  rows.push({
    level, subject: "Maths", topic: "Simplification", difficulty: level === "advanced" ? "hard" : level,
    question: q.question, questionHi: q.questionHi,
    optionA: opts[0], optionB: opts[1], optionC: opts[2], optionD: opts[3], correct,
    optionAHi: opts[0], optionBHi: opts[1], optionCHi: opts[2], optionDHi: opts[3],
    formula: q.formula && q.answer.isInt() ? q.formula : q.formula && /^-?\d+(\.\d+)?$/.test(q.answer.toString()) ? q.formula : "",
    solution: q.solution, solutionHi: q.solutionHi,
  });
  return true;
}

// =================================================================== EASY
const easy = [
  () => { // a + b ÷ c × d
    const c = ri(2, 9), b = c * ri(2, 9), d = ri(2, 9), a = ri(10, 60);
    const v = new F(a).add(new F(b).div(c).mul(d));
    return { question: `Simplify: ${a} + ${b} ÷ ${c} × ${d}`, questionHi: `सरल कीजिए: ${a} + ${b} ÷ ${c} × ${d}`, answer: v,
      slips: [new F(a + b).div(c).mul(d), new F(a).add(new F(b).div(c * d)), v.add(d)],
      formula: `${a} + ${b} / ${c} * ${d}`,
      solution: `Division and multiplication first, left to right: ${b} ÷ ${c} = ${b / c}, ${b / c} × ${d} = ${(b / c) * d}. Then ${a} + ${(b / c) * d} = ${v}.`,
      solutionHi: `पहले भाग और गुणा (बाएँ से दाएँ): ${b} ÷ ${c} = ${b / c}, ${b / c} × ${d} = ${(b / c) * d}। फिर ${a} + ${(b / c) * d} = ${v}।` };
  },
  () => { // a × b − c ÷ d
    const d = ri(2, 9), c = d * ri(2, 12), a = ri(3, 15), b = ri(3, 12);
    const v = new F(a * b).sub(new F(c).div(d));
    return { question: `What is the value of ${a} × ${b} − ${c} ÷ ${d}?`, questionHi: `${a} × ${b} − ${c} ÷ ${d} का मान क्या है?`, answer: v,
      slips: [new F(a * b - c).div(d), new F(a).mul(b - c / d + 0).add(0), v.add(c / d * 2)],
      formula: `${a} * ${b} - ${c} / ${d}`,
      solution: `${a} × ${b} = ${a * b} and ${c} ÷ ${d} = ${c / d}. So ${a * b} − ${c / d} = ${v}.`,
      solutionHi: `${a} × ${b} = ${a * b} और ${c} ÷ ${d} = ${c / d}। अतः ${a * b} − ${c / d} = ${v}।` };
  },
  () => { // p% of N + q% of M
    const p = pick([10, 20, 25, 30, 40, 50, 15, 5]), N = pick([200, 300, 400, 500, 600, 800, 120, 160, 240]);
    const q = pick([10, 20, 25, 50, 5]), M = pick([100, 200, 300, 400, 80, 60, 140]);
    const v = new F(p * N, 100).add(new F(q * M, 100));
    if (!v.isInt()) return null;
    return { question: `What is the value of ${p}% of ${N} + ${q}% of ${M}?`, questionHi: `${N} का ${p}% + ${M} का ${q}% का मान क्या है?`, answer: v,
      slips: [new F((p + q) * (N + M), 100), new F(p * N, 100).sub(new F(q * M, 100)), new F(p * M, 100).add(new F(q * N, 100))],
      formula: `${p} / 100 * ${N} + ${q} / 100 * ${M}`,
      solution: `${p}% of ${N} = ${new F(p * N, 100)} and ${q}% of ${M} = ${new F(q * M, 100)}. Sum = ${v}.`,
      solutionHi: `${N} का ${p}% = ${new F(p * N, 100)} और ${M} का ${q}% = ${new F(q * M, 100)}। योग = ${v}।` };
  },
  () => { // x/y of N + k
    const y = pick([2, 3, 4, 5, 6, 8]), x = ri(1, y - 1), N = y * ri(4, 20), k = ri(5, 40);
    if (gcd(x, y) !== 1) return null;
    const v = new F(x, y).mul(N).add(k);
    return { question: `Find the value of ${x}/${y} of ${N} + ${k}.`, questionHi: `${N} का ${x}/${y} + ${k} का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(x, y).mul(N + k), new F(N, y).add(k), v.sub(k).sub(k)],
      formula: `${x} / ${y} * ${N} + ${k}`,
      solution: `"of" means multiply and is done first: ${x}/${y} × ${N} = ${new F(x, y).mul(N)}. Then + ${k} = ${v}.`,
      solutionHi: `"का" का अर्थ गुणा है और यह पहले होता है: ${x}/${y} × ${N} = ${new F(x, y).mul(N)}। फिर + ${k} = ${v}।` };
  },
  () => { // a² + b² − c
    const a = ri(4, 15), b = ri(3, 12), c = ri(10, 80);
    const v = new F(a * a + b * b - c);
    return { question: `Simplify: ${a}² + ${b}² − ${c}`, questionHi: `सरल कीजिए: ${a}² + ${b}² − ${c}`, answer: v,
      slips: [new F((a + b) ** 2 - c), new F(2 * a + 2 * b - c), new F(a * a + b * b + c)],
      formula: `${a}^2 + ${b}^2 - ${c}`,
      solution: `${a}² = ${a * a}, ${b}² = ${b * b}. ${a * a} + ${b * b} − ${c} = ${v}.`,
      solutionHi: `${a}² = ${a * a}, ${b}² = ${b * b}। ${a * a} + ${b * b} − ${c} = ${v}।` };
  },
  () => { // √A + √B × k
    const p = ri(4, 20), s = ri(2, 12), k = ri(2, 6);
    const v = new F(p + s * k);
    return { question: `What is the value of √${p * p} + √${s * s} × ${k}?`, questionHi: `√${p * p} + √${s * s} × ${k} का मान क्या है?`, answer: v,
      slips: [new F((p + s) * k), new F(p * k + s), new F(p + s + k)],
      formula: `sqrt(${p * p}) + sqrt(${s * s}) * ${k}`,
      solution: `√${p * p} = ${p}, √${s * s} = ${s}. Multiplication first: ${s} × ${k} = ${s * k}. Then ${p} + ${s * k} = ${v}.`,
      solutionHi: `√${p * p} = ${p}, √${s * s} = ${s}। पहले गुणा: ${s} × ${k} = ${s * k}। फिर ${p} + ${s * k} = ${v}।` };
  },
  () => { // (a + b) ÷ c × d
    const c = ri(2, 9), sum = c * ri(3, 15), a = ri(1, sum - 1), b = sum - a, d = ri(2, 8);
    const v = new F(sum).div(c).mul(d);
    return { question: `Find the value of (${a} + ${b}) ÷ ${c} × ${d}.`, questionHi: `(${a} + ${b}) ÷ ${c} × ${d} का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(sum).div(c * d), new F(a).add(new F(b).div(c).mul(d)), v.add(c)],
      formula: `(${a} + ${b}) / ${c} * ${d}`,
      solution: `Bracket first: ${a} + ${b} = ${sum}. Then left to right: ${sum} ÷ ${c} = ${sum / c}, × ${d} = ${v}.`,
      solutionHi: `पहले कोष्ठक: ${a} + ${b} = ${sum}। फिर बाएँ से दाएँ: ${sum} ÷ ${c} = ${sum / c}, × ${d} = ${v}।` };
  },
  () => { // decimals a.b × c + d
    const a = pick(["0.5", "1.5", "2.5", "0.25", "1.2", "0.4", "3.5", "0.75"]), c = pick([4, 6, 8, 12, 16, 20]), d = ri(2, 30);
    const v = decF(a).mul(c).add(d);
    return { question: `Simplify: ${a} × ${c} + ${d}`, questionHi: `सरल कीजिए: ${a} × ${c} + ${d}`, answer: v,
      slips: [decF(a).mul(c + d), decF(a).mul(c).sub(d), v.add(1)],
      formula: `${a} * ${c} + ${d}`,
      solution: `${a} × ${c} = ${decF(a).mul(c)}. Then + ${d} = ${v}.`,
      solutionHi: `${a} × ${c} = ${decF(a).mul(c)}। फिर + ${d} = ${v}।` };
  },
];

// =================================================================== MEDIUM
const medium = [
  () => { // a − [b − {c + (d − e)}]
    const e = ri(2, 10), d = e + ri(2, 15), c = ri(3, 20), b = c + (d - e) + ri(5, 30), a = b + ri(5, 40);
    const inner = c + (d - e), mid = b - inner, v = new F(a - mid);
    return { question: `Simplify: ${a} − [${b} − {${c} + (${d} − ${e})}]`, questionHi: `सरल कीजिए: ${a} − [${b} − {${c} + (${d} − ${e})}]`, answer: v,
      slips: [new F(a - b - inner), new F(a - b + c + d + e), new F(a - (b - c + d - e))],
      formula: `${a} - (${b} - (${c} + (${d} - ${e})))`,
      solution: `( ) first: ${d} − ${e} = ${d - e}. { }: ${c} + ${d - e} = ${inner}. [ ]: ${b} − ${inner} = ${mid}. Finally ${a} − ${mid} = ${v}.`,
      solutionHi: `पहले ( ): ${d} − ${e} = ${d - e}। { }: ${c} + ${d - e} = ${inner}। [ ]: ${b} − ${inner} = ${mid}। अंत में ${a} − ${mid} = ${v}।` };
  },
  () => { // a/b + c/d − e/f
    const b = pick([2, 3, 4, 5, 6]), d = pick([3, 4, 6, 8, 12]), f = pick([2, 4, 6, 12]);
    const a = ri(1, b - 1), c = ri(1, d - 1), e = ri(1, f - 1);
    if (gcd(a, b) !== 1 || gcd(c, d) !== 1 || gcd(e, f) !== 1 || b === d) return null;
    const v = new F(a, b).add(new F(c, d)).sub(new F(e, f));
    if (v.n <= 0 || v.isInt()) return null;
    return { question: `What is the value of ${a}/${b} + ${c}/${d} − ${e}/${f}?`, questionHi: `${a}/${b} + ${c}/${d} − ${e}/${f} का मान क्या है?`, answer: v,
      slips: [new F(a + c - e, b + d - f || 1), new F(a, b).add(new F(c, d)).add(new F(e, f)), new F(a, b).sub(new F(c, d)).add(new F(e, f))],
      formula: "",
      solution: `Take the LCM of ${b}, ${d}, ${f} as the common denominator: ${a}/${b} + ${c}/${d} − ${e}/${f} = ${v}.`,
      solutionHi: `${b}, ${d}, ${f} का LCM हर लेकर: ${a}/${b} + ${c}/${d} − ${e}/${f} = ${v}।` };
  },
  () => { // p% of q% of N
    const p = pick([10, 20, 25, 40, 50, 60, 75]), q = pick([10, 20, 25, 40, 50, 80]), N = pick([400, 500, 800, 1000, 1200, 1600, 2000, 2400]);
    const v = new F(p * q * N, 10000);
    if (!v.isInt()) return null;
    return { question: `Find ${p}% of ${q}% of ${N}.`, questionHi: `${N} के ${q}% का ${p}% ज्ञात कीजिए।`, answer: v,
      slips: [new F((p + q) * N, 100), new F(p * N, 100), v.mul(10)],
      formula: `${p} / 100 * ${q} / 100 * ${N}`,
      solution: `${q}% of ${N} = ${new F(q * N, 100)}. ${p}% of that = ${v}.`,
      solutionHi: `${N} का ${q}% = ${new F(q * N, 100)}। उसका ${p}% = ${v}।` };
  },
  () => { // a ÷ b × c ÷ d  (left to right)
    const b = ri(2, 6), d = ri(2, 6), c = ri(2, 9), a = b * d * ri(2, 10);
    const v = new F(a).div(b).mul(c).div(d);
    return { question: `Simplify: ${a} ÷ ${b} × ${c} ÷ ${d}`, questionHi: `सरल कीजिए: ${a} ÷ ${b} × ${c} ÷ ${d}`, answer: v,
      slips: [new F(a).div(b * c).div(d), new F(a).div(b).mul(new F(c, d)).mul(d), new F(a).div(new F(b * c, d))],
      formula: `${a} / ${b} * ${c} / ${d}`,
      solution: `Division and multiplication have equal priority, so go left to right: ${a} ÷ ${b} = ${a / b}, × ${c} = ${(a / b) * c}, ÷ ${d} = ${v}.`,
      solutionHi: `भाग और गुणा की प्राथमिकता बराबर है, इसलिए बाएँ से दाएँ: ${a} ÷ ${b} = ${a / b}, × ${c} = ${(a / b) * c}, ÷ ${d} = ${v}।` };
  },
  () => { // ∛A + √B − k
    const x = ri(2, 9), y = ri(5, 25), k = ri(1, 10);
    const v = new F(x + y - k);
    return { question: `What is the value of ∛${x ** 3} + √${y * y} − ${k}?`, questionHi: `∛${x ** 3} + √${y * y} − ${k} का मान क्या है?`, answer: v,
      slips: [new F(x * x + y - k), new F(x + y + k), new F(x + y * y - k)],
      formula: `cbrt(${x ** 3}) + sqrt(${y * y}) - ${k}`,
      solution: `∛${x ** 3} = ${x} and √${y * y} = ${y}. So ${x} + ${y} − ${k} = ${v}.`,
      solutionHi: `∛${x ** 3} = ${x} और √${y * y} = ${y}। अतः ${x} + ${y} − ${k} = ${v}।` };
  },
  () => { // (a.b × c.d) ÷ e
    const a = pick(["1.2", "2.4", "3.6", "0.8", "1.5", "2.5", "4.5", "0.6"]), c = pick(["0.5", "2.5", "1.5", "0.25", "4", "0.4"]);
    const prod = decF(a).mul(decF(c)); const e = pick([2, 3, 4, 5, 6]);
    const v = prod.div(e);
    if (!/^\d+(\.\d{1,3})?$/.test(v.toString())) return null;
    return { question: `Simplify: (${a} × ${c}) ÷ ${e}`, questionHi: `सरल कीजिए: (${a} × ${c}) ÷ ${e}`, answer: v,
      slips: [prod.mul(e), v.mul(10), decF(a).add(decF(c)).div(e)],
      formula: `${a} * ${c} / ${e}`,
      solution: `${a} × ${c} = ${prod}. Then ${prod} ÷ ${e} = ${v}.`,
      solutionHi: `${a} × ${c} = ${prod}। फिर ${prod} ÷ ${e} = ${v}।` };
  },
  () => { // a/b of c ÷ d + e
    const b = pick([2, 3, 4, 5]), a = ri(1, b - 1), d = pick([2, 3, 4]), c = b * d * ri(2, 8), e = ri(3, 25);
    if (gcd(a, b) !== 1) return null;
    const of = new F(a, b).mul(c), v = of.div(d).add(e);
    return { question: `Find the value of ${a}/${b} of ${c} ÷ ${d} + ${e}.`, questionHi: `${c} का ${a}/${b} ÷ ${d} + ${e} का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(a, b).mul(new F(c).div(d + e)), of.div(d + e).add(0), of.add(e).div(d)],
      formula: `${a} / ${b} * ${c} / ${d} + ${e}`,
      solution: `In BODMAS, "of" comes before division: ${a}/${b} of ${c} = ${of}. Then ${of} ÷ ${d} = ${of.div(d)}, + ${e} = ${v}.`,
      solutionHi: `BODMAS में "का" भाग से पहले आता है: ${c} का ${a}/${b} = ${of}। फिर ${of} ÷ ${d} = ${of.div(d)}, + ${e} = ${v}।` };
  },
  () => { // a² − b² ÷ (a − b) style with integers: (a² − b²) ÷ (a − b)
    const a = ri(12, 40), b = ri(3, a - 2);
    const v = new F(a + b);
    return { question: `Find the value of (${a}² − ${b}²) ÷ (${a} − ${b}).`, questionHi: `(${a}² − ${b}²) ÷ (${a} − ${b}) का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(a - b), new F(a * a - b * b), new F(a + b + 1)],
      formula: `(${a}^2 - ${b}^2) / (${a} - ${b})`,
      solution: `a² − b² = (a + b)(a − b), so the result is a + b = ${a} + ${b} = ${v}.`,
      solutionHi: `a² − b² = (a + b)(a − b), अतः परिणाम a + b = ${a} + ${b} = ${v}।` };
  },
];

// =================================================================== HARD
const hard = [
  () => { // (a³ + b³)/(a² − ab + b²) with decimals
    const a = pick(["4.7", "5.3", "6.2", "3.8", "7.4", "2.9", "8.6", "1.7"]), b = pick(["3.3", "2.7", "1.8", "4.2", "2.6", "5.1", "1.4", "3.9"]);
    const v = decF(a).add(decF(b));
    return { question: `Simplify: (${a}³ + ${b}³) ÷ (${a}² − ${a} × ${b} + ${b}²)`, questionHi: `सरल कीजिए: (${a}³ + ${b}³) ÷ (${a}² − ${a} × ${b} + ${b}²)`, answer: v,
      slips: [decF(a).sub(decF(b)), decF(a).mul(decF(b)), v.add(1)],
      formula: `(${a}^3 + ${b}^3) / (${a}^2 - ${a} * ${b} + ${b}^2)`,
      solution: `a³ + b³ = (a + b)(a² − ab + b²). Dividing leaves a + b = ${a} + ${b} = ${v}.`,
      solutionHi: `a³ + b³ = (a + b)(a² − ab + b²)। भाग देने पर a + b = ${a} + ${b} = ${v} बचता है।` };
  },
  () => { // (a³ − b³)/(a² + ab + b²)
    const a = pick(["7.5", "8.2", "6.4", "9.3", "5.8", "4.6"]), b = pick(["2.5", "3.2", "1.4", "2.3", "1.8", "0.6"]);
    const v = decF(a).sub(decF(b));
    return { question: `Find the value of (${a}³ − ${b}³) ÷ (${a}² + ${a} × ${b} + ${b}²).`, questionHi: `(${a}³ − ${b}³) ÷ (${a}² + ${a} × ${b} + ${b}²) का मान ज्ञात कीजिए।`, answer: v,
      slips: [decF(a).add(decF(b)), v.add(decF("0.5")), decF(a).mul(decF(b))],
      formula: `(${a}^3 - ${b}^3) / (${a}^2 + ${a} * ${b} + ${b}^2)`,
      solution: `a³ − b³ = (a − b)(a² + ab + b²). So the value is a − b = ${a} − ${b} = ${v}.`,
      solutionHi: `a³ − b³ = (a − b)(a² + ab + b²)। अतः मान a − b = ${a} − ${b} = ${v}।` };
  },
  () => { // x + 1/x = k → x² + 1/x² = k² − 2
    const k = ri(3, 12);
    const v = new F(k * k - 2);
    return { question: `If x + 1/x = ${k}, what is the value of x² + 1/x²?`, questionHi: `यदि x + 1/x = ${k} है, तो x² + 1/x² का मान क्या है?`, answer: v,
      slips: [new F(k * k), new F(k * k + 2), new F(k * k - 1)],
      formula: `${k}^2 - 2`,
      solution: `(x + 1/x)² = x² + 1/x² + 2. So x² + 1/x² = ${k}² − 2 = ${v}.`,
      solutionHi: `(x + 1/x)² = x² + 1/x² + 2। अतः x² + 1/x² = ${k}² − 2 = ${v}।` };
  },
  () => { // 1 + 1/(1 + 1/k)
    const k = ri(2, 9);
    const v = new F(1).add(new F(1).div(new F(1).add(new F(1, k))));
    return { question: `Simplify: 1 + 1 / (1 + 1/${k})`, questionHi: `सरल कीजिए: 1 + 1 / (1 + 1/${k})`, answer: v,
      slips: [new F(1).add(new F(1, k + 1)), new F(k + 1, k), new F(2 * k + 1, k)],
      formula: "",
      solution: `1 + 1/${k} = ${new F(k + 1, k)}. 1 ÷ ${new F(k + 1, k)} = ${new F(k, k + 1)}. 1 + ${new F(k, k + 1)} = ${v}.`,
      solutionHi: `1 + 1/${k} = ${new F(k + 1, k)}। 1 ÷ ${new F(k + 1, k)} = ${new F(k, k + 1)}। 1 + ${new F(k, k + 1)} = ${v}।` };
  },
  () => { // 2^a × 2^b ÷ 2^c
    const base = pick([2, 3, 5]), a = ri(3, 8), b = ri(2, 6), c = ri(a + b - 4, a + b - 1);
    const e = a + b - c, v = new F(base ** e);
    if (e < 1) return null;
    return { question: `What is the value of ${base}^${a} × ${base}^${b} ÷ ${base}^${c}?`, questionHi: `${base}^${a} × ${base}^${b} ÷ ${base}^${c} का मान क्या है?`, answer: v,
      slips: [new F(base ** (e + 1)), new F(base * e), new F(base ** Math.max(1, e - 1))],
      formula: `${base}^${a} * ${base}^${b} / ${base}^${c}`,
      solution: `Same base: add the powers when multiplying and subtract when dividing. ${a} + ${b} − ${c} = ${e}, so ${base}^${e} = ${v}.`,
      solutionHi: `समान आधार: गुणा में घात जुड़ते हैं, भाग में घटते हैं। ${a} + ${b} − ${c} = ${e}, अतः ${base}^${e} = ${v}।` };
  },
  () => { // 0.āā + 0.bb (recurring)
    const a = ri(1, 8), b = ri(1, 9 - a);
    const v = new F(a + b, 9);
    return { question: `What is the value of 0.${a}${a}${a}... + 0.${b}${b}${b}... (both recurring)?`, questionHi: `0.${a}${a}${a}... + 0.${b}${b}${b}... (दोनों आवर्ती) का मान क्या है?`, answer: v,
      slips: [new F(a + b, 10), new F(a + b, 99), new F(a * b, 9)],
      formula: "",
      solution: `0.${a}${a}${a}... = ${a}/9 and 0.${b}${b}${b}... = ${b}/9. Sum = ${a + b}/9${v.d !== 9 ? ` = ${v}` : ""}.`,
      solutionHi: `0.${a}${a}${a}... = ${a}/9 और 0.${b}${b}${b}... = ${b}/9। योग = ${a + b}/9${v.d !== 9 ? ` = ${v}` : ""}।` };
  },
  () => { // (a + b)² − (a − b)²  over ab = 4  -> ask value of (a+b)² − (a−b)² with numbers
    const a = ri(11, 40), b = ri(3, 15);
    const v = new F(4 * a * b);
    return { question: `Find the value of (${a} + ${b})² − (${a} − ${b})².`, questionHi: `(${a} + ${b})² − (${a} − ${b})² का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(2 * a * b), new F(4 * (a + b)), new F(2 * (a * a + b * b))],
      formula: `(${a} + ${b})^2 - (${a} - ${b})^2`,
      solution: `(a + b)² − (a − b)² = 4ab = 4 × ${a} × ${b} = ${v}.`,
      solutionHi: `(a + b)² − (a − b)² = 4ab = 4 × ${a} × ${b} = ${v}।` };
  },
  () => { // ((a+b)² + (a−b)²)/(a² + b²) = 2   -> use decimals to disguise; answer 2 too guessable -> ask (a+b)² + (a−b)²
    const a = ri(6, 25), b = ri(2, 12);
    const v = new F(2 * (a * a + b * b));
    return { question: `What is the value of (${a} + ${b})² + (${a} − ${b})²?`, questionHi: `(${a} + ${b})² + (${a} − ${b})² का मान क्या है?`, answer: v,
      slips: [new F(a * a + b * b), new F(4 * a * b), new F(2 * (a + b) ** 2)],
      formula: `(${a} + ${b})^2 + (${a} - ${b})^2`,
      solution: `(a + b)² + (a − b)² = 2(a² + b²) = 2 × (${a * a} + ${b * b}) = ${v}.`,
      solutionHi: `(a + b)² + (a − b)² = 2(a² + b²) = 2 × (${a * a} + ${b * b}) = ${v}।` };
  },
];

// =================================================================== ADVANCED
const advanced = [
  () => { // telescoping 1/(n(n+1)) from a to b
    const a = ri(1, 6), b = a + ri(5, 14);
    const v = new F(1, a).sub(new F(1, b + 1));
    return { question: `Find the value of 1/(${a}×${a + 1}) + 1/(${a + 1}×${a + 2}) + ... + 1/(${b}×${b + 1}).`, questionHi: `1/(${a}×${a + 1}) + 1/(${a + 1}×${a + 2}) + ... + 1/(${b}×${b + 1}) का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(1, a).sub(new F(1, b)), new F(b - a, b + 1), new F(1, a).add(new F(1, b + 1))],
      formula: "",
      solution: `Each term 1/(n(n+1)) = 1/n − 1/(n+1), so the middle terms cancel: 1/${a} − 1/${b + 1} = ${v}.`,
      solutionHi: `हर पद 1/(n(n+1)) = 1/n − 1/(n+1), इसलिए बीच के पद कट जाते हैं: 1/${a} − 1/${b + 1} = ${v}।` };
  },
  () => { // a + b = s, ab = p → a³ + b³
    const x = ri(2, 9), y = ri(1, 8); if (x === y) return null;
    const s = x + y, p = x * y, v = new F(s ** 3 - 3 * p * s);
    return { question: `If a + b = ${s} and ab = ${p}, find the value of a³ + b³.`, questionHi: `यदि a + b = ${s} और ab = ${p} है, तो a³ + b³ का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(s ** 3 - p * s), new F(s ** 3 + 3 * p * s), new F(s ** 3 - 3 * p)],
      formula: `${s}^3 - 3 * ${p} * ${s}`,
      solution: `a³ + b³ = (a + b)³ − 3ab(a + b) = ${s}³ − 3 × ${p} × ${s} = ${s ** 3} − ${3 * p * s} = ${v}.`,
      solutionHi: `a³ + b³ = (a + b)³ − 3ab(a + b) = ${s}³ − 3 × ${p} × ${s} = ${s ** 3} − ${3 * p * s} = ${v}।` };
  },
  () => { // a − b = d, ab = p → a² + b²
    const x = ri(4, 15), y = ri(1, x - 1);
    const d = x - y, p = x * y, v = new F(d * d + 2 * p);
    return { question: `If a − b = ${d} and ab = ${p}, what is the value of a² + b²?`, questionHi: `यदि a − b = ${d} और ab = ${p} है, तो a² + b² का मान क्या है?`, answer: v,
      slips: [new F(d * d - 2 * p), new F(d * d + p), new F(d * d + 4 * p)],
      formula: `${d}^2 + 2 * ${p}`,
      solution: `a² + b² = (a − b)² + 2ab = ${d}² + 2 × ${p} = ${d * d} + ${2 * p} = ${v}.`,
      solutionHi: `a² + b² = (a − b)² + 2ab = ${d}² + 2 × ${p} = ${d * d} + ${2 * p} = ${v}।` };
  },
  () => { // √(k + √(k + ...)) with k = n(n−1)
    const n = ri(3, 12), k = n * (n - 1);
    const v = new F(n);
    return { question: `Find the value of √(${k} + √(${k} + √(${k} + ...))) (continuing endlessly).`, questionHi: `√(${k} + √(${k} + √(${k} + ...))) (अनंत तक) का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(n - 1), new F(n + 1), new F(k / 2)],
      formula: "",
      solution: `Let the value be x. Then x = √(${k} + x), so x² − x − ${k} = 0, i.e. (x − ${n})(x + ${n - 1}) = 0. Being positive, x = ${v}.`,
      solutionHi: `मान लीजिए मान x है। तब x = √(${k} + x), अतः x² − x − ${k} = 0, यानी (x − ${n})(x + ${n - 1}) = 0। धनात्मक होने से x = ${v}।` };
  },
  () => { // (1 − 1/2)(1 − 1/3)...(1 − 1/n)
    const n = ri(8, 40);
    const v = new F(1, n);
    return { question: `What is the value of (1 − 1/2)(1 − 1/3)(1 − 1/4) ... (1 − 1/${n})?`, questionHi: `(1 − 1/2)(1 − 1/3)(1 − 1/4) ... (1 − 1/${n}) का मान क्या है?`, answer: v,
      slips: [new F(1, n - 1), new F(2, n), new F(n - 1, n)],
      formula: "",
      solution: `Each bracket is (k − 1)/k: 1/2 × 2/3 × 3/4 × ... × ${n - 1}/${n}. Everything cancels except 1/${n}.`,
      solutionHi: `हर कोष्ठक (k − 1)/k है: 1/2 × 2/3 × 3/4 × ... × ${n - 1}/${n}। सब कटकर 1/${n} बचता है।` };
  },
  () => { // (1 + 1/2)(1 + 1/3)...(1 + 1/n)
    const n = ri(9, 49);
    const v = new F(n + 1, 2);
    return { question: `Find the value of (1 + 1/2)(1 + 1/3)(1 + 1/4) ... (1 + 1/${n}).`, questionHi: `(1 + 1/2)(1 + 1/3)(1 + 1/4) ... (1 + 1/${n}) का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(n + 1, n), new F(n, 2), new F(n + 2, 2)],
      formula: v.isInt() ? `(${n} + 1) / 2` : "",
      solution: `Each bracket is (k + 1)/k: 3/2 × 4/3 × 5/4 × ... × ${n + 1}/${n}. Everything cancels except ${n + 1}/2 = ${v}.`,
      solutionHi: `हर कोष्ठक (k + 1)/k है: 3/2 × 4/3 × 5/4 × ... × ${n + 1}/${n}। सब कटकर ${n + 1}/2 = ${v} बचता है।` };
  },
  () => { // x + 1/x = k → x⁴ + 1/x⁴
    const k = ri(3, 7);
    const s2 = k * k - 2, v = new F(s2 * s2 - 2);
    return { question: `If x + 1/x = ${k}, find the value of x⁴ + 1/x⁴.`, questionHi: `यदि x + 1/x = ${k} है, तो x⁴ + 1/x⁴ का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(s2 * s2), new F(k ** 4 - 2), new F(s2 * s2 + 2)],
      formula: `(${k}^2 - 2)^2 - 2`,
      solution: `x² + 1/x² = ${k}² − 2 = ${s2}. Then x⁴ + 1/x⁴ = ${s2}² − 2 = ${s2 * s2} − 2 = ${v}.`,
      solutionHi: `x² + 1/x² = ${k}² − 2 = ${s2}। फिर x⁴ + 1/x⁴ = ${s2}² − 2 = ${s2 * s2} − 2 = ${v}।` };
  },
  () => { // sum of squares m..n
    const m = ri(5, 15), n = m + ri(4, 9);
    const sq = (t) => (t * (t + 1) * (2 * t + 1)) / 6;
    const v = new F(sq(n) - sq(m - 1));
    return { question: `Find the value of ${m}² + ${m + 1}² + ${m + 2}² + ... + ${n}².`, questionHi: `${m}² + ${m + 1}² + ${m + 2}² + ... + ${n}² का मान ज्ञात कीजिए।`, answer: v,
      slips: [new F(sq(n) - sq(m)), new F(sq(n)), v.add(m * m)],
      formula: `${n} * (${n} + 1) * (2 * ${n} + 1) / 6 - (${m} - 1) * ${m} * (2 * (${m} - 1) + 1) / 6`,
      solution: `1² + ... + n² = n(n + 1)(2n + 1)/6. Up to ${n}: ${sq(n)}. Up to ${m - 1}: ${sq(m - 1)}. Difference = ${v}.`,
      solutionHi: `1² + ... + n² = n(n + 1)(2n + 1)/6। ${n} तक: ${sq(n)}। ${m - 1} तक: ${sq(m - 1)}। अंतर = ${v}।` };
  },
];

// ---- build: 8 per test, a mix of templates in each test
const NEED = { easy: 9 * 8, medium: 9 * 8, hard: 10 * 8, advanced: 10 * 8 };
const BANK = { easy, medium, hard, advanced };
for (const level of Object.keys(NEED)) {
  const made = [];
  let guard = 0;
  while (made.length < NEED[level] && guard++ < 20000) {
    const tpl = BANK[level][guard % BANK[level].length];
    let q;
    try { q = tpl(); } catch { q = null; }
    if (!q) continue;
    if (add(level, q)) made.push(rows[rows.length - 1]);
  }
  if (made.length < NEED[level]) throw new Error(`${level}: only ${made.length}`);
  // spread over the tests so each test has a mix
  made.forEach((r, i) => { r.test = TESTS[level][i % TESTS[level].length]; });
}

// ---- self-check: every answer recomputed from the formula where there is one
const { checkFormula } = require(process.argv[2] + "/services/mathCheck");
let bad = 0;
for (const r of rows) {
  if (!r.formula) continue;
  const res = checkFormula({ text: r.question, textHi: r.questionHi, options: [r.optionA, r.optionB, r.optionC, r.optionD], correctIndex: "ABCD".indexOf(r.correct), formula: r.formula });
  if (res.ok !== true) { bad++; console.log("FORMULA", res.reason, "|", r.question, r.formula); }
}

const COLS = ["test", "subject", "topic", "difficulty", "question", "optionA", "optionB", "optionC", "optionD", "correct", "formula", "solution", "questionHi", "optionAHi", "optionBHi", "optionCHi", "optionDHi", "solutionHi"];
const esc = (v) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
fs.writeFileSync(process.argv[3], "﻿" + [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\r\n"));
fs.writeFileSync(process.argv[3].replace(/\.csv$/, ".json"), JSON.stringify(rows.map((r) => Object.fromEntries(COLS.map((c) => [c, r[c]])))));
console.log(`rows ${rows.length}, formula problems ${bad}, with formula ${rows.filter((r) => r.formula).length}`);
const byTest = {}; rows.forEach((r) => (byTest[r.test] = (byTest[r.test] || 0) + 1));
console.log("per test:", [...new Set(Object.values(byTest))]);
