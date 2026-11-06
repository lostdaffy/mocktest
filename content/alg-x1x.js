// Algebra · Value of Expressions (x + 1/x type): every kind of question, level
// by level. v() finds an actual x (a root of x^2 − kx + 1 = 0, or the given
// surd) and evaluates the asked expression on it numerically - it never uses
// the identity the solution teaches.
const L = require("./alg-lib");
const { N, F, NQ, FQ, XQ, cross, crossF, range, isInt, clean, gcd, pick, guard } = L;
const { fillTopic } = require("./gen");

const PREFIX = "Algebra · Value of Expressions (x + 1/x type)";
const LET = ["x", "x", "x", "a", "p", "m", "t", "y"];
const lv = (prm, salt = 0) => pick(LET, prm, salt + 11);
// An x with x + 1/x = k (k ≥ 2), and one with x − 1/x = k.
const xPlus = (k) => (k + Math.sqrt(k * k - 4)) / 2;
const xMinus = (k) => (k + Math.sqrt(k * k + 4)) / 2;
const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));
const pw = (v, n) => (n === 1 ? v : `${v}^${n}`);
const inv = (v, n) => `1/${pw(v, n)}`;
const sumT = (v, n, s = "+") => `${pw(v, n)} ${s} ${inv(v, n)}`;
const NUM = (x) => clean(x);

// ---------------------------------------------------------------- EASY
const sq = {
  id: "sq", levels: ["easy", "medium"],
  cands: () => range(3, 60).map((k) => [k]),
  build: (t, [k]) => {
    const v = lv([k]); const ans = k * k - 2;
    return NQ(t, `If ${sumT(v, 1)} = ${k}, find the value of ${sumT(v, 2)}.`, `यदि ${sumT(v, 1)} = ${k} है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
      ans, [k * k + 2, k * k, 2 * k - 2], () => { const x = xPlus(k); return NUM(x * x + 1 / (x * x)); },
      `${sumT(v, 2)} = (${sumT(v, 1)})^2 − 2 = ${k}^2 − 2 = ${k * k} − 2 = ${ans}.`, `${sumT(v, 2)} = (${sumT(v, 1)})^2 − 2 = ${k}^2 − 2 = ${k * k} − 2 = ${ans}।`, { positive: true });
  },
};

const sqMinus = {
  id: "sqMinus", levels: ["easy", "medium"],
  cands: () => range(2, 60).map((k) => [k]),
  build: (t, [k]) => {
    const v = lv([k], 1); const ans = k * k + 2;
    return NQ(t, `If ${sumT(v, 1, "−")} = ${k}, find the value of ${sumT(v, 2)}.`, `यदि ${sumT(v, 1, "−")} = ${k} है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
      ans, [k * k - 2, k * k, 2 * k + 2], () => { const x = xMinus(k); return NUM(x * x + 1 / (x * x)); },
      `(${sumT(v, 1, "−")})^2 = ${sumT(v, 2)} − 2, so ${sumT(v, 2)} = ${k}^2 + 2 = ${k * k} + 2 = ${ans}.`, `(${sumT(v, 1, "−")})^2 = ${sumT(v, 2)} − 2, अतः ${sumT(v, 2)} = ${k}^2 + 2 = ${k * k} + 2 = ${ans}।`, { positive: true });
  },
};

// x^2 + 1/x^2 = m: x + 1/x (x > 0) or x − 1/x (x > 1).
const backSum = {
  id: "backSum", levels: ["easy", "medium"],
  cands: () => cross(range(3, 40), ["plus", "minus"]).filter(([k, w]) => w === "plus" || k >= 1),
  build: (t, [k, w]) => {
    const v = lv([k], 2); const plus = w === "plus"; const m = plus ? k * k - 2 : k * k + 2;
    return NQ(t, plus ? `If ${sumT(v, 2)} = ${m} and ${v} > 0, find the value of ${sumT(v, 1)}.` : `If ${sumT(v, 2)} = ${m} and ${v} > 1, find the value of ${sumT(v, 1, "−")}.`,
      plus ? `यदि ${sumT(v, 2)} = ${m} और ${v} > 0 है, तो ${sumT(v, 1)} का मान ज्ञात कीजिए।` : `यदि ${sumT(v, 2)} = ${m} और ${v} > 1 है, तो ${sumT(v, 1, "−")} का मान ज्ञात कीजिए।`,
      k, plus ? [Math.sqrt(m - 2), m + 2, k + 2].map((x) => (isInt(x) ? x : k + 1)) : [Math.sqrt(m + 2), m - 2, k + 2].map((x) => (isInt(x) ? x : k + 1)),
      () => { if (plus) { const x = xPlus(k); return near(x * x + 1 / (x * x), m) ? NUM(x + 1 / x) : NaN; } const x = xMinus(k); return near(x * x + 1 / (x * x), m) ? NUM(x - 1 / x) : NaN; },
      plus ? `(${sumT(v, 1)})^2 = ${sumT(v, 2)} + 2 = ${m} + 2 = ${k * k}, so ${sumT(v, 1)} = ${k} (positive, as ${v} > 0).` : `(${sumT(v, 1, "−")})^2 = ${sumT(v, 2)} − 2 = ${m} − 2 = ${k * k}, so ${sumT(v, 1, "−")} = ${k} (positive, as ${v} > 1).`,
      plus ? `(${sumT(v, 1)})^2 = ${sumT(v, 2)} + 2 = ${m} + 2 = ${k * k}, अतः ${sumT(v, 1)} = ${k} (धनात्मक, क्योंकि ${v} > 0)।` : `(${sumT(v, 1, "−")})^2 = ${sumT(v, 2)} − 2 = ${m} − 2 = ${k * k}, अतः ${sumT(v, 1, "−")} = ${k} (धनात्मक, क्योंकि ${v} > 1)।`, { positive: true, whole: true });
  },
};

// x^2 − kx + 1 = 0 → x + 1/x = k; ask x^2 + 1/x^2, x^3 + 1/x^3 or x^4 + 1/x^4.
const ASKP = { 2: (k) => k * k - 2, 3: (k) => k ** 3 - 3 * k, 4: (k) => (k * k - 2) ** 2 - 2 };
const quadForm = {
  id: "quadForm", levels: ["easy", "medium", "hard"],
  cands: () => cross(range(3, 25), [2, 3, 4]).filter(([k, n]) => n === 2 || (n === 3 ? k <= 15 : k <= 10)),
  build: (t, [k, n]) => {
    const v = lv([k, n], 3); const ans = ASKP[n](k);
    const how = n === 2 ? `${sumT(v, 2)} = ${k}^2 − 2 = ${ans}` : n === 3 ? `${sumT(v, 3)} = ${k}^3 − 3 × ${k} = ${k ** 3} − ${3 * k} = ${ans}` : `${sumT(v, 2)} = ${k}^2 − 2 = ${k * k - 2}, ${sumT(v, 4)} = ${k * k - 2}^2 − 2 = ${ans}`;
    return NQ(t, `If ${v}^2 − ${k}${v} + 1 = 0, find the value of ${sumT(v, n)}.`, `यदि ${v}^2 − ${k}${v} + 1 = 0 है, तो ${sumT(v, n)} का मान ज्ञात कीजिए।`,
      ans, [ASKP[n](k) + 4, k ** n, ans - 2 * k], () => { const x = xPlus(k); return NUM(x ** n + x ** -n); },
      `Divide ${v}^2 − ${k}${v} + 1 = 0 by ${v}: ${sumT(v, 1)} = ${k}. ${how}.`, `${v}^2 − ${k}${v} + 1 = 0 को ${v} से भाग देने पर: ${sumT(v, 1)} = ${k}। ${how}।`, { positive: true });
  },
};

// 3x + 1/(3x) = k: 9x^2 + 1/(9x^2).
const scaled = {
  id: "scaled", levels: ["easy", "medium"],
  cands: () => cross([2, 3, 4, 5, 6], range(3, 40)),
  build: (t, [c, k]) => {
    const ans = k * k - 2;
    return NQ(t, `If ${c}x + 1/(${c}x) = ${k}, find the value of ${c * c}x^2 + 1/(${c * c}x^2).`, `यदि ${c}x + 1/(${c}x) = ${k} है, तो ${c * c}x^2 + 1/(${c * c}x^2) का मान ज्ञात कीजिए।`,
      ans, [k * k + 2, (k * k - 2) * c, k * k], () => { const y = xPlus(k) / c; return NUM(c * c * y * y + 1 / (c * c * y * y)); },
      `Put y = ${c}x: y + 1/y = ${k}, so y^2 + 1/y^2 = ${k}^2 − 2 = ${ans}. Here y^2 = ${c * c}x^2, so the value is ${ans}.`,
      `y = ${c}x रखने पर: y + 1/y = ${k}, अतः y^2 + 1/y^2 = ${k}^2 − 2 = ${ans}। यहाँ y^2 = ${c * c}x^2, अतः मान ${ans} है।`, { positive: true });
  },
};

// x + 1/x = k: (x − 1/x)^2.
const diffSquare = {
  id: "diffSquare", levels: ["easy", "medium"],
  cands: () => range(3, 60).map((k) => [k, "d"]),
  build: (t, [k]) => {
    const v = lv([k], 4); const ans = k * k - 4;
    return NQ(t, `If ${sumT(v, 1)} = ${k}, find the value of (${sumT(v, 1, "−")})^2.`, `यदि ${sumT(v, 1)} = ${k} है, तो (${sumT(v, 1, "−")})^2 का मान ज्ञात कीजिए।`,
      ans, [k * k - 2, k * k + 4, k * k], () => { const x = xPlus(k); return NUM((x - 1 / x) ** 2); },
      `(${sumT(v, 1, "−")})^2 = (${sumT(v, 1)})^2 − 4 = ${k}^2 − 4 = ${k * k} − 4 = ${ans}.`, `(${sumT(v, 1, "−")})^2 = (${sumT(v, 1)})^2 − 4 = ${k}^2 − 4 = ${k * k} − 4 = ${ans}।`, { positive: true });
  },
};

// x = a + √b with a^2 − b = 1, so 1/x = a − √b.
const CONJ = range(2, 15).map((a) => [a, a * a - 1]);
const surd = {
  id: "surd", levels: ["easy", "medium", "hard"],
  cands: () => cross(range(0, CONJ.length - 1), [1, 2, 3], ["plus", "minus"]).filter(([i, n]) => n < 3 || CONJ[i][0] <= 6),
  build: (t, [i, n, s]) => {
    const [a, b] = CONJ[i]; const k = 2 * a; const ans = ASKP[n] ? ASKP[n](k) : k; const val = n === 1 ? k : ans;
    const xs = s === "plus" ? `${a} + √${b}` : `${a} − √${b}`;
    const how = n === 1 ? `x + 1/x = (${a} + √${b}) + (${a} − √${b}) = ${k}` : n === 2 ? `x + 1/x = ${k}, so x^2 + 1/x^2 = ${k}^2 − 2 = ${val}` : `x + 1/x = ${k}, so x^3 + 1/x^3 = ${k}^3 − 3 × ${k} = ${val}`;
    return NQ(t, `If x = ${xs}, find the value of ${sumT("x", n)}.`, `यदि x = ${xs} है, तो ${sumT("x", n)} का मान ज्ञात कीजिए।`,
      val, n === 1 ? [a, 2 * b, k + 2] : [val + 4, k ** n, val - 2], () => { const x = s === "plus" ? a + Math.sqrt(b) : a - Math.sqrt(b); return NUM(x ** n + x ** -n); },
      `1/x = 1/(${xs}) = ${s === "plus" ? `${a} − √${b}` : `${a} + √${b}`} (as ${a}^2 − ${b} = 1). ${how}.`, `1/x = 1/(${xs}) = ${s === "plus" ? `${a} − √${b}` : `${a} + √${b}`} (क्योंकि ${a}^2 − ${b} = 1)। ${how}।`, { positive: true });
  },
};

const fourth = {
  id: "fourth", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => cross(range(3, 20), ["plus", "minus"]),
  build: (t, [k, w]) => {
    const v = lv([k], 5); const plus = w === "plus"; const m = plus ? k * k - 2 : k * k + 2; const ans = m * m - 2;
    return NQ(t, `If ${sumT(v, 1, plus ? "+" : "−")} = ${k}, find the value of ${sumT(v, 4)}.`, `यदि ${sumT(v, 1, plus ? "+" : "−")} = ${k} है, तो ${sumT(v, 4)} का मान ज्ञात कीजिए।`,
      ans, [m * m, m * m + 2, k ** 4 - 2], () => { const x = plus ? xPlus(k) : xMinus(k); return NUM(x ** 4 + x ** -4); },
      `${sumT(v, 2)} = ${k}^2 ${plus ? "−" : "+"} 2 = ${m}. ${sumT(v, 4)} = (${sumT(v, 2)})^2 − 2 = ${m}^2 − 2 = ${ans}.`, `${sumT(v, 2)} = ${k}^2 ${plus ? "−" : "+"} 2 = ${m}। ${sumT(v, 4)} = (${sumT(v, 2)})^2 − 2 = ${m}^2 − 2 = ${ans}।`, { positive: true });
  },
};

// (x^2 + 1)/x = k  or  x/(x^2 + 1) = 1/k.
const fracForm = {
  id: "fracForm", levels: ["easy", "medium", "hard"],
  cands: () => cross(range(3, 60), ["up", "down"]),
  build: (t, [k, w]) => {
    const v = lv([k], 6); const ans = k * k - 2;
    const given = w === "up" ? `(${v}^2 + 1)/${v} = ${k}` : `${v}/(${v}^2 + 1) = 1/${k}`;
    return NQ(t, `If ${given}, find the value of ${sumT(v, 2)}.`, `यदि ${given} है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
      ans, [k * k + 2, k * k, k * k - 4], () => { const x = xPlus(k); return NUM(x * x + 1 / (x * x)); },
      `${w === "up" ? `(${v}^2 + 1)/${v}` : `(${v}^2 + 1)/${v} (the reciprocal)`} = ${sumT(v, 1)} = ${k}, so ${sumT(v, 2)} = ${k}^2 − 2 = ${ans}.`,
      `${w === "up" ? `(${v}^2 + 1)/${v}` : `(${v}^2 + 1)/${v} (व्युत्क्रम)`} = ${sumT(v, 1)} = ${k}, अतः ${sumT(v, 2)} = ${k}^2 − 2 = ${ans}।`, { positive: true });
  },
};

// ---------------------------------------------------------------- MEDIUM
const cube = {
  id: "cube", levels: ["medium", "hard", "advanced"],
  cands: () => range(3, 60).map((k) => [k]),
  build: (t, [k]) => {
    const v = lv([k], 7); const ans = k ** 3 - 3 * k;
    return NQ(t, `If ${sumT(v, 1)} = ${k}, find the value of ${sumT(v, 3)}.`, `यदि ${sumT(v, 1)} = ${k} है, तो ${sumT(v, 3)} का मान ज्ञात कीजिए।`,
      ans, [k ** 3 + 3 * k, k ** 3, k ** 3 - 3], () => { const x = xPlus(k); return NUM(x ** 3 + x ** -3); },
      `${sumT(v, 3)} = (${sumT(v, 1)})^3 − 3(${sumT(v, 1)}) = ${k}^3 − 3 × ${k} = ${k ** 3} − ${3 * k} = ${ans}.`, `${sumT(v, 3)} = (${sumT(v, 1)})^3 − 3(${sumT(v, 1)}) = ${k}^3 − 3 × ${k} = ${k ** 3} − ${3 * k} = ${ans}।`, { positive: true });
  },
};

const cubeMinus = {
  id: "cubeMinus", levels: ["medium", "hard", "advanced"],
  cands: () => range(2, 60).map((k) => [k]),
  build: (t, [k]) => {
    const v = lv([k], 8); const ans = k ** 3 + 3 * k;
    return NQ(t, `If ${sumT(v, 1, "−")} = ${k}, find the value of ${sumT(v, 3, "−")}.`, `यदि ${sumT(v, 1, "−")} = ${k} है, तो ${sumT(v, 3, "−")} का मान ज्ञात कीजिए।`,
      ans, [k ** 3 - 3 * k, k ** 3, k ** 3 + 3], () => { const x = xMinus(k); return NUM(x ** 3 - x ** -3); },
      `${sumT(v, 3, "−")} = (${sumT(v, 1, "−")})^3 + 3(${sumT(v, 1, "−")}) = ${k}^3 + 3 × ${k} = ${k ** 3} + ${3 * k} = ${ans}.`, `${sumT(v, 3, "−")} = (${sumT(v, 1, "−")})^3 + 3(${sumT(v, 1, "−")}) = ${k}^3 + 3 × ${k} = ${k ** 3} + ${3 * k} = ${ans}।`, { positive: true });
  },
};

// x^2 + 1/x^2 = m (x > 0): x^3 + 1/x^3.
const cubeFromSq = {
  id: "cubeFromSq", levels: ["medium", "hard", "advanced"],
  cands: () => range(3, 45).map((k) => [k * k - 2, k]),
  build: (t, [m, k]) => {
    const v = lv([m], 9); const ans = k ** 3 - 3 * k;
    return NQ(t, `If ${sumT(v, 2)} = ${m} and ${v} > 0, find the value of ${sumT(v, 3)}.`, `यदि ${sumT(v, 2)} = ${m} और ${v} > 0 है, तो ${sumT(v, 3)} का मान ज्ञात कीजिए।`,
      ans, [k ** 3, m * k, ans + 3 * k], () => { const x = xPlus(k); return near(x * x + x ** -2, m) ? NUM(x ** 3 + x ** -3) : NaN; },
      `(${sumT(v, 1)})^2 = ${m} + 2 = ${k * k}, so ${sumT(v, 1)} = ${k}. ${sumT(v, 3)} = ${k}^3 − 3 × ${k} = ${ans}.`, `(${sumT(v, 1)})^2 = ${m} + 2 = ${k * k}, अतः ${sumT(v, 1)} = ${k}। ${sumT(v, 3)} = ${k}^3 − 3 × ${k} = ${ans}।`, { positive: true });
  },
};

// (x^4 + 1)/x^2 and (x^6 + 1)/x^3 written forms.
const writtenForm = {
  id: "writtenForm", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(3, 30), [2, 3]).filter(([k, n]) => n === 2 || k <= 16),
  build: (t, [k, n]) => {
    const v = lv([k, n], 10); const ans = ASKP[n](k);
    const e = n === 2 ? `(${v}^4 + 1)/${v}^2` : `(${v}^6 + 1)/${v}^3`;
    return NQ(t, `If ${sumT(v, 1)} = ${k}, find the value of ${e}.`, `यदि ${sumT(v, 1)} = ${k} है, तो ${e} का मान ज्ञात कीजिए।`,
      ans, [k ** n, ans + 2, n === 2 ? k * k + 2 : k ** 3 + 3 * k], () => { const x = xPlus(k); return NUM((x ** (2 * n) + 1) / x ** n); },
      `${e} = ${sumT(v, n)}. ${n === 2 ? `${sumT(v, 2)} = ${k}^2 − 2 = ${ans}` : `${sumT(v, 3)} = ${k}^3 − 3 × ${k} = ${ans}`}.`, `${e} = ${sumT(v, n)}। ${n === 2 ? `${sumT(v, 2)} = ${k}^2 − 2 = ${ans}` : `${sumT(v, 3)} = ${k}^3 − 3 × ${k} = ${ans}`}।`, { positive: true });
  },
};

// x^4 − kx^2 + 1 = 0 (x > 0): x + 1/x.
const quartForm = {
  id: "quartForm", levels: ["medium", "hard", "advanced"],
  cands: () => range(3, 50).map((s) => [s * s - 2, s]),
  build: (t, [k, s]) => {
    const v = lv([k], 12);
    return NQ(t, `If ${v}^4 − ${k}${v}^2 + 1 = 0 and ${v} > 0, find the value of ${sumT(v, 1)}.`, `यदि ${v}^4 − ${k}${v}^2 + 1 = 0 और ${v} > 0 है, तो ${sumT(v, 1)} का मान ज्ञात कीजिए।`,
      s, [k, Math.sqrt(k + 4) === Math.round(Math.sqrt(k + 4)) ? Math.sqrt(k + 4) : s + 1, s * 2], () => { const x2 = (k + Math.sqrt(k * k - 4)) / 2; const x = Math.sqrt(x2); return NUM(x + 1 / x); },
      `Divide by ${v}^2: ${sumT(v, 2)} = ${k}. (${sumT(v, 1)})^2 = ${k} + 2 = ${s * s}, so ${sumT(v, 1)} = ${s}.`, `${v}^2 से भाग देने पर: ${sumT(v, 2)} = ${k}। (${sumT(v, 1)})^2 = ${k} + 2 = ${s * s}, अतः ${sumT(v, 1)} = ${s}।`, { positive: true, whole: true });
  },
};

// ---------------------------------------------------------------- HARD
const sixth = {
  id: "sixth", levels: ["hard", "advanced"],
  cands: () => range(3, 10).flatMap((k) => [[k, "plus"], [k, "minus"]]),
  build: (t, [k, w]) => {
    const v = lv([k], 13); const plus = w === "plus"; const c3 = plus ? k ** 3 - 3 * k : null; const m = plus ? k * k - 2 : k * k + 2;
    // x^6 + 1/x^6 = (x^2 + 1/x^2)^3 − 3(x^2 + 1/x^2)
    const ans = m ** 3 - 3 * m;
    return NQ(t, `If ${sumT(v, 1, plus ? "+" : "−")} = ${k}, find the value of ${sumT(v, 6)}.`, `यदि ${sumT(v, 1, plus ? "+" : "−")} = ${k} है, तो ${sumT(v, 6)} का मान ज्ञात कीजिए।`,
      ans, [m ** 3, m ** 3 + 3 * m, ans + 2], () => { const x = plus ? xPlus(k) : xMinus(k); return NUM(x ** 6 + x ** -6); },
      `${sumT(v, 2)} = ${k}^2 ${plus ? "−" : "+"} 2 = ${m}. ${sumT(v, 6)} = (${sumT(v, 2)})^3 − 3(${sumT(v, 2)}) = ${m}^3 − 3 × ${m} = ${m ** 3} − ${3 * m} = ${ans}.`,
      `${sumT(v, 2)} = ${k}^2 ${plus ? "−" : "+"} 2 = ${m}। ${sumT(v, 6)} = (${sumT(v, 2)})^3 − 3(${sumT(v, 2)}) = ${m}^3 − 3 × ${m} = ${m ** 3} − ${3 * m} = ${ans}।`, { positive: true });
  },
};

const fifth = {
  id: "fifth", levels: ["hard", "advanced"],
  cands: () => range(3, 12).map((k) => [k, 5]),
  build: (t, [k]) => {
    const v = lv([k], 14); const s2 = k * k - 2, s3 = k ** 3 - 3 * k; const ans = s2 * s3 - k;
    return NQ(t, `If ${sumT(v, 1)} = ${k}, find the value of ${sumT(v, 5)}.`, `यदि ${sumT(v, 1)} = ${k} है, तो ${sumT(v, 5)} का मान ज्ञात कीजिए।`,
      ans, [s2 * s3, s2 * s3 + k, ans + 2], () => { const x = xPlus(k); return NUM(x ** 5 + x ** -5); },
      `${sumT(v, 2)} = ${s2} and ${sumT(v, 3)} = ${s3}. (${sumT(v, 2)})(${sumT(v, 3)}) = ${sumT(v, 5)} + ${sumT(v, 1)}, so ${sumT(v, 5)} = ${s2} × ${s3} − ${k} = ${ans}.`,
      `${sumT(v, 2)} = ${s2} और ${sumT(v, 3)} = ${s3}। (${sumT(v, 2)})(${sumT(v, 3)}) = ${sumT(v, 5)} + ${sumT(v, 1)}, अतः ${sumT(v, 5)} = ${s2} × ${s3} − ${k} = ${ans}।`, { positive: true });
  },
};

// x^3 + 1/x^3 = c: x + 1/x (real, the only real k).
const backCube = {
  id: "backCube", levels: ["hard", "advanced"],
  cands: () => range(3, 45).map((k) => [k ** 3 - 3 * k, k]),
  build: (t, [c, k]) => {
    const v = lv([c], 15);
    return NQ(t, `If ${sumT(v, 3)} = ${c} and ${v} > 0, find the value of ${sumT(v, 1)}.`, `यदि ${sumT(v, 3)} = ${c} और ${v} > 0 है, तो ${sumT(v, 1)} का मान ज्ञात कीजिए।`,
      k, [k + 1, k - 1, Math.round(Math.cbrt(c))].map((x) => (x === k ? k + 2 : x)), () => { for (let K = 2; K < 100; K++) if (K ** 3 - 3 * K === c) return K; return NaN; },
      `Let ${sumT(v, 1)} = k. Then k^3 − 3k = ${c}. Trying k = ${k}: ${k ** 3} − ${3 * k} = ${c}, so ${sumT(v, 1)} = ${k}.`, `माना ${sumT(v, 1)} = k। तब k^3 − 3k = ${c}। k = ${k} रखने पर: ${k ** 3} − ${3 * k} = ${c}, अतः ${sumT(v, 1)} = ${k}।`, { positive: true, whole: true });
  },
};

// px^2 − qx + p = 0 → x + 1/x = q/p: x^2 + 1/x^2 as a fraction.
const coefQuad = {
  id: "coefQuad", levels: ["hard", "advanced"],
  cands: () => crossF([range(2, 9), range(5, 50)], ([p, q]) => gcd(p, q) === 1 && q > 2 * p),
  build: (t, [p, q]) => {
    const v = lv([p, q], 16); const num = q * q - 2 * p * p, den = p * p;
    return FQ(t, `If ${p}${v}^2 − ${q}${v} + ${p} = 0, find the value of ${sumT(v, 2)}.`, `यदि ${p}${v}^2 − ${q}${v} + ${p} = 0 है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
      [num, den], [[q * q + 2 * p * p, den], [q * q, den], [num, p]], () => { const k = q / p; const x = xPlus(k); return x * x + 1 / (x * x); },
      `Divide by ${p}${v}: ${sumT(v, 1)} = ${q}/${p}. ${sumT(v, 2)} = (${q}/${p})^2 − 2 = ${q * q}/${den} − 2 = ${F(num, den)}.`, `${p}${v} से भाग देने पर: ${sumT(v, 1)} = ${q}/${p}। ${sumT(v, 2)} = (${q}/${p})^2 − 2 = ${q * q}/${den} − 2 = ${F(num, den)}।`);
  },
};

// x/(x^2 − cx + 1) = 1/m: x + 1/x = m + c.
const shifted = {
  id: "shifted", levels: ["hard", "advanced"],
  cands: () => crossF([range(1, 12), range(1, 25)], ([c, m]) => m + c >= 3 && m + c <= 30),
  build: (t, [c, m]) => {
    const v = lv([c, m], 17); const k = m + c; const ans = k * k - 2;
    return NQ(t, `If ${v}/(${v}^2 − ${c === 1 ? "" : c}${v} + 1) = 1/${m}, find the value of ${sumT(v, 2)}.`, `यदि ${v}/(${v}^2 − ${c === 1 ? "" : c}${v} + 1) = 1/${m} है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
      ans, [m * m - 2, (m - c) ** 2 - 2, ans + 4], () => { const x = xPlus(k); return near(x / (x * x - c * x + 1), 1 / m) ? NUM(x * x + 1 / (x * x)) : NaN; },
      `Taking reciprocals: (${v}^2 − ${c === 1 ? "" : c}${v} + 1)/${v} = ${m} → ${sumT(v, 1)} − ${c} = ${m} → ${sumT(v, 1)} = ${k}. So ${sumT(v, 2)} = ${k}^2 − 2 = ${ans}.`,
      `व्युत्क्रम लेने पर: (${v}^2 − ${c === 1 ? "" : c}${v} + 1)/${v} = ${m} → ${sumT(v, 1)} − ${c} = ${m} → ${sumT(v, 1)} = ${k}। अतः ${sumT(v, 2)} = ${k}^2 − 2 = ${ans}।`, { positive: true });
  },
};


// x^2 − kx − 1 = 0 → x − 1/x = k; ask x^2 + 1/x^2 or x^3 − 1/x^3.
const quadMinus = {
  id: "quadMinus", levels: ["easy", "medium", "hard"],
  cands: () => cross(range(1, 30), [2, 3]).filter(([k, n]) => n === 2 || k <= 20),
  build: (t, [k, n]) => {
    const v = lv([k, n], 20); const ans = n === 2 ? k * k + 2 : k ** 3 + 3 * k;
    const how = n === 2 ? `${sumT(v, 2)} = ${k}^2 + 2 = ${ans}` : `${sumT(v, 3, "−")} = ${k}^3 + 3 × ${k} = ${k ** 3} + ${3 * k} = ${ans}`;
    const ask = n === 2 ? sumT(v, 2) : sumT(v, 3, "−");
    return NQ(t, `If ${v}^2 − ${k === 1 ? "" : k}${v} − 1 = 0, find the value of ${ask}.`, `यदि ${v}^2 − ${k === 1 ? "" : k}${v} − 1 = 0 है, तो ${ask} का मान ज्ञात कीजिए।`,
      ans, n === 2 ? [k * k - 2, k * k, ans + 2] : [k ** 3 - 3 * k, k ** 3, ans + 3], () => { const x = xMinus(k); return NUM(n === 2 ? x * x + x ** -2 : x ** 3 - x ** -3); },
      `Divide ${v}^2 − ${k === 1 ? "" : k}${v} − 1 = 0 by ${v}: ${sumT(v, 1, "−")} = ${k}. ${how}.`, `${v}^2 − ${k === 1 ? "" : k}${v} − 1 = 0 को ${v} से भाग देने पर: ${sumT(v, 1, "−")} = ${k}। ${how}।`, { positive: true });
  },
};

// 2x − 1/(2x) = k: 4x^2 + 1/(4x^2).
const scaledMinus = {
  id: "scaledMinus", levels: ["easy", "medium"],
  cands: () => cross([2, 3, 4, 5, 6], range(2, 40)),
  build: (t, [c, k]) => {
    const ans = k * k + 2;
    return NQ(t, `If ${c}x − 1/(${c}x) = ${k}, find the value of ${c * c}x^2 + 1/(${c * c}x^2).`, `यदि ${c}x − 1/(${c}x) = ${k} है, तो ${c * c}x^2 + 1/(${c * c}x^2) का मान ज्ञात कीजिए।`,
      ans, [k * k - 2, (k * k + 2) * c, k * k], () => { const y = xMinus(k) / c; return NUM(c * c * y * y + 1 / (c * c * y * y)); },
      `Put y = ${c}x: y − 1/y = ${k}, so y^2 + 1/y^2 = ${k}^2 + 2 = ${ans}. Here y^2 = ${c * c}x^2, so the value is ${ans}.`,
      `y = ${c}x रखने पर: y − 1/y = ${k}, अतः y^2 + 1/y^2 = ${k}^2 + 2 = ${ans}। यहाँ y^2 = ${c * c}x^2, अतः मान ${ans} है।`, { positive: true });
  },
};

// x + 1/x = (a^2 + b^2)/ab (that is x = a/b): x^2 + 1/x^2 as a fraction.
const fracK = {
  id: "fracK", levels: ["medium", "hard", "advanced"],
  cands: () => crossF([range(1, 12), range(2, 12)], ([a, b]) => a < b && gcd(a, b) === 1 && b <= 9 + a),
  build: (t, [a, b]) => {
    const v = lv([a, b], 21); const p = a * a + b * b, q = a * b;
    const num = p * p - 2 * q * q, den = q * q;
    return FQ(t, `If ${sumT(v, 1)} = ${F(p, q)}, find the value of ${sumT(v, 2)}.`, `यदि ${sumT(v, 1)} = ${F(p, q)} है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
      [num, den], [[p * p + 2 * q * q, den], [p * p, den], [num, q]], () => { const x = a / b; return x * x + 1 / (x * x); },
      `${sumT(v, 2)} = (${sumT(v, 1)})^2 − 2 = (${F(p, q)})^2 − 2 = ${p * p}/${den} − 2 = ${F(num, den)}.`, `${sumT(v, 2)} = (${sumT(v, 1)})^2 − 2 = (${F(p, q)})^2 − 2 = ${p * p}/${den} − 2 = ${F(num, den)}।`);
  },
};

// px^2 − qx − p = 0 → x − 1/x = q/p: x^2 + 1/x^2 as a fraction.
const coefMinus = {
  id: "coefMinus", levels: ["hard", "advanced"],
  cands: () => crossF([range(2, 9), range(1, 30)], ([p, q]) => gcd(p, q) === 1),
  build: (t, [p, q]) => {
    const v = lv([p, q], 22); const num = q * q + 2 * p * p, den = p * p;
    return FQ(t, `If ${p}${v}^2 − ${q === 1 ? "" : q}${v} − ${p} = 0, find the value of ${sumT(v, 2)}.`, `यदि ${p}${v}^2 − ${q === 1 ? "" : q}${v} − ${p} = 0 है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
      [num, den], [[q * q - 2 * p * p, den], [q * q, den], [num, p]], () => { const k = q / p; const x = xMinus(k); return x * x + 1 / (x * x); },
      `Divide by ${p}${v}: ${sumT(v, 1, "−")} = ${F(q, p)}. ${sumT(v, 2)} = (${F(q, p)})^2 + 2 = ${q * q}/${den} + 2 = ${F(num, den)}.`, `${p}${v} से भाग देने पर: ${sumT(v, 1, "−")} = ${F(q, p)}। ${sumT(v, 2)} = (${F(q, p)})^2 + 2 = ${q * q}/${den} + 2 = ${F(num, den)}।`);
  },
};


// x + 1/x = (a^2 + b^2)/ab: x^3 + 1/x^3 = (a^6 + b^6)/(a^3b^3).
const fracCube = {
  id: "fracCube", levels: ["hard", "advanced"],
  cands: () => crossF([range(1, 6), range(2, 7)], ([a, b]) => a < b && gcd(a, b) === 1),
  build: (t, [a, b]) => {
    const v = lv([a, b], 23); const p = a * a + b * b, q = a * b;
    const num = a ** 6 + b ** 6, den = q ** 3;
    return FQ(t, `If ${sumT(v, 1)} = ${F(p, q)}, find the value of ${sumT(v, 3)}.`, `यदि ${sumT(v, 1)} = ${F(p, q)} है, तो ${sumT(v, 3)} का मान ज्ञात कीजिए।`,
      [num, den], [[p ** 3, den], [p ** 3 + 3 * p * q * q, den], [num, q * q]], () => { const x = a / b; return x ** 3 + x ** -3; },
      `${sumT(v, 3)} = (${sumT(v, 1)})^3 − 3(${sumT(v, 1)}) = (${F(p, q)})^3 − 3 × ${F(p, q)} = ${p ** 3}/${den} − ${3 * p * q * q}/${den} = ${F(num, den)}.`,
      `${sumT(v, 3)} = (${sumT(v, 1)})^3 − 3(${sumT(v, 1)}) = (${F(p, q)})^3 − 3 × ${F(p, q)} = ${p ** 3}/${den} − ${3 * p * q * q}/${den} = ${F(num, den)}।`);
  },
};

// x − 1/x = (b^2 − a^2)/ab (x = b/a): x^2 + 1/x^2.
const fracMinus = {
  id: "fracMinus", levels: ["medium", "hard", "advanced"],
  cands: () => crossF([range(1, 9), range(2, 12)], ([a, b]) => a < b && gcd(a, b) === 1 && b - a <= 8),
  build: (t, [a, b]) => {
    const v = lv([a, b], 24); const p = b * b - a * a, q = a * b;
    const num = p * p + 2 * q * q, den = q * q;
    return FQ(t, `If ${sumT(v, 1, "−")} = ${F(p, q)}, find the value of ${sumT(v, 2)}.`, `यदि ${sumT(v, 1, "−")} = ${F(p, q)} है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
      [num, den], [[p * p - 2 * q * q, den], [p * p, den], [num, q]], () => { const x = b / a; return x * x + 1 / (x * x); },
      `${sumT(v, 2)} = (${sumT(v, 1, "−")})^2 + 2 = (${F(p, q)})^2 + 2 = ${p * p}/${den} + 2 = ${F(num, den)}.`, `${sumT(v, 2)} = (${sumT(v, 1, "−")})^2 + 2 = (${F(p, q)})^2 + 2 = ${p * p}/${den} + 2 = ${F(num, den)}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
// x + 1/x = √k: x^2 + 1/x^2 and x^3 + 1/x^3 (in surd form).
const rootK = {
  id: "rootK", levels: ["advanced"],
  cands: () => cross([5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23], [2, 3]),
  build: (t, [k, n]) => {
    const v = lv([k, n], 18);
    if (n === 2) {
      const ans = k - 2;
      return NQ(t, `If ${sumT(v, 1)} = √${k}, find the value of ${sumT(v, 2)}.`, `यदि ${sumT(v, 1)} = √${k} है, तो ${sumT(v, 2)} का मान ज्ञात कीजिए।`,
        ans, [k + 2, k, k - 4], () => { const x = xPlus(Math.sqrt(k)); return NUM(x * x + 1 / (x * x)); },
        `${sumT(v, 2)} = (${sumT(v, 1)})^2 − 2 = (√${k})^2 − 2 = ${k} − 2 = ${ans}.`, `${sumT(v, 2)} = (${sumT(v, 1)})^2 − 2 = (√${k})^2 − 2 = ${k} − 2 = ${ans}।`, { positive: true });
    }
    const c = k - 3; // (√k)^3 − 3√k = (k − 3)√k
    const sv = [c, k, c + 2, k - 1]; const o = sv.map((x) => `${x}√${k}`);
    if (new Set(o).size !== 4) throw new Error("collide");
    return XQ(t, `If ${sumT(v, 1)} = √${k}, find the value of ${sumT(v, 3)}.`, `यदि ${sumT(v, 1)} = √${k} है, तो ${sumT(v, 3)} का मान ज्ञात कीजिए।`, o, null,
      (i) => { const x = xPlus(Math.sqrt(k)); return near(x ** 3 + x ** -3, sv[i] * Math.sqrt(k)); },
      `${sumT(v, 3)} = (√${k})^3 − 3√${k} = ${k}√${k} − 3√${k} = ${c}√${k}.`, `${sumT(v, 3)} = (√${k})^3 − 3√${k} = ${k}√${k} − 3√${k} = ${c}√${k}।`);
  },
};

// x + 1/x = 2 (or −2): x^n + 1/x^n for a large n.
const special = {
  id: "special", levels: ["advanced"],
  cands: () => cross([2, -2], range(11, 99)).filter(([s, n]) => n % 3 !== 0 || n % 2 === 1),
  build: (t, [s, n]) => {
    const v = lv([s, n], 19); const x = s / 2; const ans = 2 * x ** n;
    return NQ(t, `If ${sumT(v, 1)} = ${N(s)}, find the value of ${sumT(v, n)}.`, `यदि ${sumT(v, 1)} = ${N(s)} है, तो ${sumT(v, n)} का मान ज्ञात कीजिए।`,
      ans, [-ans, 2 ** n > 1e6 ? 0 : 2 ** n, s * n].map((y) => (Math.abs(y) > 1e7 ? 1 : y)), () => { const r = s / 2; return NUM(r ** n + r ** -n); },
      `${sumT(v, 1)} = ${N(s)} gives ${v}^2 ${s > 0 ? "−" : "+"} 2${v} + 1 = 0, i.e. (${v} ${s > 0 ? "−" : "+"} 1)^2 = 0, so ${v} = ${N(x)}. Then ${sumT(v, n)} = (${N(x)})^${n} + (${N(x)})^${n} = ${N(ans)}.`,
      `${sumT(v, 1)} = ${N(s)} से ${v}^2 ${s > 0 ? "−" : "+"} 2${v} + 1 = 0, अर्थात (${v} ${s > 0 ? "−" : "+"} 1)^2 = 0, अतः ${v} = ${N(x)}। तब ${sumT(v, n)} = (${N(x)})^${n} + (${N(x)})^${n} = ${N(ans)}।`);
  },
};

// x = √a + √(a − 1): x^2 + 1/x^2 = 2(2a − 1).
const surd2 = {
  id: "surd2", levels: ["advanced"],
  cands: () => cross(range(2, 30), ["sq", "sum"]).filter(([a, w]) => w === "sq" || Math.sqrt(a) === Math.round(Math.sqrt(a))),
  build: (t, [a, w]) => {
    const xs = `√${a} + √${a - 1}`;
    if (w === "sq") {
      const ans = 2 * (2 * a - 1);
      return NQ(t, `If x = ${xs}, find the value of x^2 + 1/x^2.`, `यदि x = ${xs} है, तो x^2 + 1/x^2 का मान ज्ञात कीजिए।`,
        ans, [2 * a - 1, 4 * a, ans + 2], () => { const x = Math.sqrt(a) + Math.sqrt(a - 1); return NUM(x * x + 1 / (x * x)); },
        `1/x = √${a} − √${a - 1} (as ${a} − ${a - 1} = 1). x^2 = ${2 * a - 1} + 2√${a * (a - 1)} and 1/x^2 = ${2 * a - 1} − 2√${a * (a - 1)}, so x^2 + 1/x^2 = ${ans}.`,
        `1/x = √${a} − √${a - 1} (क्योंकि ${a} − ${a - 1} = 1)। x^2 = ${2 * a - 1} + 2√${a * (a - 1)} और 1/x^2 = ${2 * a - 1} − 2√${a * (a - 1)}, अतः x^2 + 1/x^2 = ${ans}।`, { positive: true });
    }
    const r = Math.sqrt(a); const ans = 2 * r;
    return NQ(t, `If x = ${xs}, find the value of x + 1/x.`, `यदि x = ${xs} है, तो x + 1/x का मान ज्ञात कीजिए।`,
      ans, [r, a, 2 * a - 1], () => { const x = Math.sqrt(a) + Math.sqrt(a - 1); return NUM(x + 1 / x); },
      `1/x = √${a} − √${a - 1} (as ${a} − ${a - 1} = 1), so x + 1/x = 2√${a} = 2 × ${r} = ${ans}.`, `1/x = √${a} − √${a - 1} (क्योंकि ${a} − ${a - 1} = 1), अतः x + 1/x = 2√${a} = 2 × ${r} = ${ans}।`, { positive: true });
  },
};

const KINDS = guard([fracCube, fracMinus, quadMinus, scaledMinus, fracK, coefMinus, sq, sqMinus, backSum, quadForm, scaled, diffSquare, surd, fourth, fracForm, cube, cubeMinus, cubeFromSq, writtenForm, quartForm, sixth, fifth, backCube, coefQuad, shifted, rootK, special, surd2]);
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
