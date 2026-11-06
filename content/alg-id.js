// Algebra · Algebraic Identities: every kind of question, level by level.
// gen.js fills the tests. Every answer is worked out again in code from the
// actual numbers (a and b themselves, not the identity), and the wrong
// options are the slips students make: dropping the 2ab, the wrong sign of
// 3ab(a + b), halving where they should not.
const L = require("./alg-lib");
const { N, NQ, cross, range, isInt, clean, pick, thin, guard } = L;
const { fillTopic } = require("./gen");

const PREFIX = "Algebra · Algebraic Identities";
const ROUND = [20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const pairs = (lo, hi) => { const o = []; for (let a = lo; a <= hi; a++) for (let b = 1; b < a; b++) o.push([a, b]); return o; };
const VAR2 = [["a", "b"], ["x", "y"], ["p", "q"], ["m", "n"]];
const vv = (prm) => pick(VAR2, prm, 3);
const ASK = ["find the value of", "what is the value of"];
const ask = (prm) => pick(ASK, prm, 5);
const end = (prm) => (ask(prm).startsWith("what") ? "?" : ".");

// ---------------------------------------------------------------- EASY
const sqNear = {
  id: "sqNear", levels: ["easy"],
  cands: () => cross(ROUND, range(1, 9), [1, -1]).filter(([b, k]) => b > 10 * k),
  build: (t, [b, k, s]) => {
    const x = b + s * k, ans = x * x, op = s > 0 ? "+" : "−";
    return NQ(t, `Using a suitable identity, find the value of ${x}^2.`, `उपयुक्त सर्वसमिका का प्रयोग करके ${x}^2 का मान ज्ञात कीजिए।`,
      ans, [b * b + k * k, b * b - k * k, ans + 10 * k, ans - 2 * b], () => x * x,
      `${x}^2 = (${b} ${op} ${k})^2 = ${b}^2 ${op} 2 × ${b} × ${k} + ${k}^2 = ${b * b} ${op} ${2 * b * k} + ${k * k} = ${ans}.`,
      `${x}^2 = (${b} ${op} ${k})^2 = ${b}^2 ${op} 2 × ${b} × ${k} + ${k}^2 = ${b * b} ${op} ${2 * b * k} + ${k * k} = ${ans}।`);
  },
};

const prodNear = {
  id: "prodNear", levels: ["easy"],
  cands: () => cross(ROUND, range(1, 9)).filter(([b, k]) => b > 10 * k),
  build: (t, [b, k]) => {
    const ans = (b + k) * (b - k);
    return NQ(t, `Using an identity, find the value of ${b + k} × ${b - k}.`, `सर्वसमिका का प्रयोग करके ${b + k} × ${b - k} का मान ज्ञात कीजिए।`,
      ans, [b * b + k * k, b * b - 2 * k, (b - k) * (b - k), ans + 100], () => (b + k) * (b - k),
      `${b + k} × ${b - k} = (${b} + ${k})(${b} − ${k}) = ${b}^2 − ${k}^2 = ${b * b} − ${k * k} = ${ans}.`,
      `${b + k} × ${b - k} = (${b} + ${k})(${b} − ${k}) = ${b}^2 − ${k}^2 = ${b * b} − ${k * k} = ${ans}।`);
  },
};

const diffSq = {
  id: "diffSq", levels: ["easy", "medium"],
  cands: () => thin(pairs(21, 99).filter(([x, y]) => (x + y) % 10 === 0 && x - y >= 6), ([x, y]) => [x + y, x - y]),
  build: (t, [x, y]) => {
    const ans = x * x - y * y;
    return NQ(t, `Find the value of ${x}^2 − ${y}^2.`, `${x}^2 − ${y}^2 का मान ज्ञात कीजिए।`,
      ans, [(x - y) * (x - y), (x + y) * (x + y) - 2 * x * y, ans + 100, ans - 10], () => x * x - y * y,
      `a^2 − b^2 = (a + b)(a − b), so ${x}^2 − ${y}^2 = (${x} + ${y})(${x} − ${y}) = ${x + y} × ${x - y} = ${ans}.`,
      `a^2 − b^2 = (a + b)(a − b), अतः ${x}^2 − ${y}^2 = (${x} + ${y})(${x} − ${y}) = ${x + y} × ${x - y} = ${ans}।`);
  },
};

// a + b = p, ab = q with whole a > b > 0, so the numbers are real ones.
const sumProd = (lo, hi) => pairs(lo, hi).map(([a, b]) => [a + b, a * b, a, b]);
const sumSq = {
  id: "sumSq", levels: ["easy", "medium"],
  cands: () => sumProd(3, 30).map(([p, q]) => [p, q]),
  build: (t, [p, q]) => {
    const [a, b] = vv([p, q]); const ans = p * p - 2 * q;
    return NQ(t, `If ${a} + ${b} = ${p} and ${a}${b} = ${q}, ${ask([p, q])} ${a}^2 + ${b}^2${end([p, q])}`, `यदि ${a} + ${b} = ${p} और ${a}${b} = ${q} है, तो ${a}^2 + ${b}^2 का मान ज्ञात कीजिए।`,
      ans, [p * p + 2 * q, p * p - q, p * p - 4 * q], () => { const d = Math.sqrt(p * p - 4 * q); const r = (p + d) / 2, s = (p - d) / 2; return r * r + s * s; },
      `${a}^2 + ${b}^2 = (${a} + ${b})^2 − 2${a}${b} = ${p}^2 − 2 × ${q} = ${p * p} − ${2 * q} = ${ans}.`,
      `${a}^2 + ${b}^2 = (${a} + ${b})^2 − 2${a}${b} = ${p}^2 − 2 × ${q} = ${p * p} − ${2 * q} = ${ans}।`, { positive: true });
  },
};

const diffSqSum = {
  id: "diffSqSum", levels: ["easy", "medium"],
  cands: () => pairs(3, 30).map(([a, b]) => [a - b, a * b]).filter(([p]) => p >= 1),
  build: (t, [p, q]) => {
    const [a, b] = vv([p, q, 1]); const ans = p * p + 2 * q;
    return NQ(t, `If ${a} − ${b} = ${p} and ${a}${b} = ${q}, ${ask([p, q, 1])} ${a}^2 + ${b}^2${end([p, q, 1])}`, `यदि ${a} − ${b} = ${p} और ${a}${b} = ${q} है, तो ${a}^2 + ${b}^2 का मान ज्ञात कीजिए।`,
      ans, [p * p - 2 * q, p * p + q, p * p + 4 * q], () => { const s = (-p + Math.sqrt(p * p + 4 * q)) / 2; const r = s + p; return r * r + s * s; },
      `${a}^2 + ${b}^2 = (${a} − ${b})^2 + 2${a}${b} = ${p}^2 + 2 × ${q} = ${p * p} + ${2 * q} = ${ans}.`,
      `${a}^2 + ${b}^2 = (${a} − ${b})^2 + 2${a}${b} = ${p}^2 + 2 × ${q} = ${p * p} + ${2 * q} = ${ans}।`, { positive: true });
  },
};

// (ax ± b)^2 = a^2x^2 + kx + b^2: find k.
const expandK = {
  id: "expandK", levels: ["easy"],
  cands: () => cross(range(1, 9), range(1, 15), [1, -1]).filter(([a, b]) => a > 1 || b > 3),
  build: (t, [a, b, s]) => {
    const v = L.v1([a, b, s]); const k = 2 * a * b * s; const lhs = `(${a === 1 ? "" : a}${v} ${s > 0 ? "+" : "−"} ${b})^2`;
    const rhs = `${a * a === 1 ? "" : a * a}${v}^2 + k${v} + ${b * b}`;
    return NQ(t, `If ${lhs} = ${rhs}, what is the value of k?`, `यदि ${lhs} = ${rhs} है, तो k का मान क्या है?`,
      k, [a * b * s, -k, 2 * (a + b) * s, a * a * b * s], () => L.mulP([a, s * b], [a, s * b])[1],
      `${lhs} = (${a === 1 ? "" : a}${v})^2 ${s > 0 ? "+" : "−"} 2 × ${a === 1 ? "" : a}${v} × ${b} + ${b}^2 = ${a * a === 1 ? "" : a * a}${v}^2 ${s > 0 ? "+" : "−"} ${Math.abs(k)}${v} + ${b * b}. So k = ${N(k)}.`,
      `${lhs} = (${a === 1 ? "" : a}${v})^2 ${s > 0 ? "+" : "−"} 2 × ${a === 1 ? "" : a}${v} × ${b} + ${b}^2 = ${a * a === 1 ? "" : a * a}${v}^2 ${s > 0 ? "+" : "−"} ${Math.abs(k)}${v} + ${b * b}। अतः k = ${N(k)}।`);
  },
};

// What makes x^2 + bx (or ax^2 + bx) a perfect square.
const completeSq = {
  id: "completeSq", levels: ["easy", "medium"],
  cands: () => cross([1, 4, 9, 16, 25], range(2, 60, 2)).filter(([a, b]) => isInt((b * b) / (4 * a)) && b % Math.sqrt(a) === 0),
  build: (t, [a, b]) => {
    const v = L.v1([a, b]); const c = (b * b) / (4 * a); const r = Math.sqrt(a);
    return NQ(t, `What must be added to ${a === 1 ? "" : a}${v}^2 + ${b}${v} to make it a perfect square?`, `${a === 1 ? "" : a}${v}^2 + ${b}${v} में क्या जोड़ा जाए कि यह एक पूर्ण वर्ग बन जाए?`,
      c, [b / 2, (b * b) / 2, b * b / a, c * 2], () => { for (let k = 1; k < 100000; k++) if (b * b - 4 * a * k === 0) return k; return NaN; },
      `${a === 1 ? "" : a}${v}^2 + ${b}${v} + c = (${r === 1 ? "" : r}${v} + ${b / (2 * r)})^2 when c = ${b / (2 * r)}^2 = ${c}.`,
      `${a === 1 ? "" : a}${v}^2 + ${b}${v} + c = (${r === 1 ? "" : r}${v} + ${b / (2 * r)})^2 तभी होगा जब c = ${b / (2 * r)}^2 = ${c}।`);
  },
};

// (x + y)^2 − (x − y)^2 = 4xy and (x + y)^2 + (x − y)^2 = 2(x^2 + y^2), numbers.
const pmSq = {
  id: "pmSq", levels: ["easy", "medium"],
  cands: () => cross(pairs(11, 70).filter(([x, y]) => x - y >= 3), ["minus", "plus"]).map(([[x, y], w]) => [x, y, w]),
  build: (t, [x, y, w]) => {
    if (w === "minus") {
      const ans = 4 * x * y;
      return NQ(t, `Find the value of (${x} + ${y})^2 − (${x} − ${y})^2.`, `(${x} + ${y})^2 − (${x} − ${y})^2 का मान ज्ञात कीजिए।`,
        ans, [2 * x * y, 2 * (x * x + y * y), ans + 4], () => (x + y) ** 2 - (x - y) ** 2,
        `(a + b)^2 − (a − b)^2 = 4ab, so the value is 4 × ${x} × ${y} = ${ans}.`, `(a + b)^2 − (a − b)^2 = 4ab, अतः मान = 4 × ${x} × ${y} = ${ans}।`);
    }
    const ans = 2 * (x * x + y * y);
    return NQ(t, `Find the value of (${x} + ${y})^2 + (${x} − ${y})^2.`, `(${x} + ${y})^2 + (${x} − ${y})^2 का मान ज्ञात कीजिए।`,
      ans, [x * x + y * y, 4 * x * y, ans + 2 * x], () => (x + y) ** 2 + (x - y) ** 2,
      `(a + b)^2 + (a − b)^2 = 2(a^2 + b^2) = 2(${x * x} + ${y * y}) = ${ans}.`, `(a + b)^2 + (a − b)^2 = 2(a^2 + b^2) = 2(${x * x} + ${y * y}) = ${ans}।`);
  },
};

// (a + b) and (a − b) given: find ab or a^2 + b^2.
const fourAB = {
  id: "fourAB", levels: ["easy", "medium"],
  cands: () => cross(pairs(3, 40).map(([a, b]) => [a + b, a - b]), ["ab", "sq"]).map(([[p, r], w]) => [p, r, w]),
  build: (t, [p, r, w]) => {
    const [a, b] = vv([p, r]); const A = (p + r) / 2, B = (p - r) / 2;
    if (w === "ab") {
      const ans = (p * p - r * r) / 4;
      return NQ(t, `If ${a} + ${b} = ${p} and ${a} − ${b} = ${r}, find the value of ${a}${b}.`, `यदि ${a} + ${b} = ${p} और ${a} − ${b} = ${r} है, तो ${a}${b} का मान ज्ञात कीजिए।`,
        ans, [(p * p - r * r) / 2, p * r, p * p - r * r], () => A * B,
        `4${a}${b} = (${a} + ${b})^2 − (${a} − ${b})^2 = ${p * p} − ${r * r} = ${p * p - r * r}, so ${a}${b} = ${p * p - r * r} ÷ 4 = ${ans}.`,
        `4${a}${b} = (${a} + ${b})^2 − (${a} − ${b})^2 = ${p * p} − ${r * r} = ${p * p - r * r}, अतः ${a}${b} = ${p * p - r * r} ÷ 4 = ${ans}।`);
    }
    const ans = (p * p + r * r) / 2;
    return NQ(t, `If ${a} + ${b} = ${p} and ${a} − ${b} = ${r}, find the value of ${a}^2 + ${b}^2.`, `यदि ${a} + ${b} = ${p} और ${a} − ${b} = ${r} है, तो ${a}^2 + ${b}^2 का मान ज्ञात कीजिए।`,
      ans, [p * p + r * r, (p * p - r * r) / 2, p * r], () => A * A + B * B,
      `2(${a}^2 + ${b}^2) = (${a} + ${b})^2 + (${a} − ${b})^2 = ${p * p} + ${r * r} = ${p * p + r * r}, so ${a}^2 + ${b}^2 = ${ans}.`,
      `2(${a}^2 + ${b}^2) = (${a} + ${b})^2 + (${a} − ${b})^2 = ${p * p} + ${r * r} = ${p * p + r * r}, अतः ${a}^2 + ${b}^2 = ${ans}।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
const cubeSum = {
  id: "cubeSum", levels: ["medium", "hard"],
  cands: () => sumProd(3, 16).map(([p, q]) => [p, q]),
  build: (t, [p, q]) => {
    const [a, b] = vv([p, q, 2]); const ans = p ** 3 - 3 * p * q;
    return NQ(t, `If ${a} + ${b} = ${p} and ${a}${b} = ${q}, find the value of ${a}^3 + ${b}^3.`, `यदि ${a} + ${b} = ${p} और ${a}${b} = ${q} है, तो ${a}^3 + ${b}^3 का मान ज्ञात कीजिए।`,
      ans, [p ** 3 + 3 * p * q, p ** 3 - 3 * q, p ** 3 - p * q], () => { const d = Math.sqrt(p * p - 4 * q); const r = (p + d) / 2, s = (p - d) / 2; return r ** 3 + s ** 3; },
      `${a}^3 + ${b}^3 = (${a} + ${b})^3 − 3${a}${b}(${a} + ${b}) = ${p}^3 − 3 × ${q} × ${p} = ${p ** 3} − ${3 * p * q} = ${ans}.`,
      `${a}^3 + ${b}^3 = (${a} + ${b})^3 − 3${a}${b}(${a} + ${b}) = ${p}^3 − 3 × ${q} × ${p} = ${p ** 3} − ${3 * p * q} = ${ans}।`, { positive: true });
  },
};

const cubeDiff = {
  id: "cubeDiff", levels: ["medium", "hard"],
  cands: () => pairs(3, 16).map(([a, b]) => [a - b, a * b]),
  build: (t, [p, q]) => {
    const [a, b] = vv([p, q, 3]); const ans = p ** 3 + 3 * p * q;
    return NQ(t, `If ${a} − ${b} = ${p} and ${a}${b} = ${q}, find the value of ${a}^3 − ${b}^3.`, `यदि ${a} − ${b} = ${p} और ${a}${b} = ${q} है, तो ${a}^3 − ${b}^3 का मान ज्ञात कीजिए।`,
      ans, [p ** 3 - 3 * p * q, p ** 3 + 3 * q, p ** 3 + p * q], () => { const s = (-p + Math.sqrt(p * p + 4 * q)) / 2; const r = s + p; return r ** 3 - s ** 3; },
      `${a}^3 − ${b}^3 = (${a} − ${b})^3 + 3${a}${b}(${a} − ${b}) = ${p}^3 + 3 × ${q} × ${p} = ${p ** 3} + ${3 * p * q} = ${ans}.`,
      `${a}^3 − ${b}^3 = (${a} − ${b})^3 + 3${a}${b}(${a} − ${b}) = ${p}^3 + 3 × ${q} × ${p} = ${p ** 3} + ${3 * p * q} = ${ans}।`, { positive: true });
  },
};

// (a^3 ± b^3) ÷ (a^2 ∓ ab + b^2) with numbers: the answer is a ± b.
const cubeFrac = {
  id: "cubeFrac", levels: ["medium"],
  cands: () => cross(pairs(12, 99).filter(([a, b]) => a - b >= 5), ["plus", "minus"]).map(([[a, b], w]) => [a, b, w]).filter(([a, b], i) => (a * 7 + b * 3) % 5 === 0),
  build: (t, [a, b, w]) => {
    const plus = w === "plus"; const ans = plus ? a + b : a - b;
    const q = plus ? `(${a}^3 + ${b}^3) ÷ (${a}^2 − ${a} × ${b} + ${b}^2)` : `(${a}^3 − ${b}^3) ÷ (${a}^2 + ${a} × ${b} + ${b}^2)`;
    return NQ(t, `Simplify: ${q}`, `सरल कीजिए: ${q}`,
      ans, [plus ? a - b : a + b, a * b, plus ? 2 * (a + b) : 2 * (a - b)], () => (plus ? (a ** 3 + b ** 3) / (a * a - a * b + b * b) : (a ** 3 - b ** 3) / (a * a + a * b + b * b)),
      plus ? `a^3 + b^3 = (a + b)(a^2 − ab + b^2), so the value is a + b = ${a} + ${b} = ${ans}.` : `a^3 − b^3 = (a − b)(a^2 + ab + b^2), so the value is a − b = ${a} − ${b} = ${ans}.`,
      plus ? `a^3 + b^3 = (a + b)(a^2 − ab + b^2), अतः मान = a + b = ${a} + ${b} = ${ans}।` : `a^3 − b^3 = (a − b)(a^2 + ab + b^2), अतः मान = a − b = ${a} − ${b} = ${ans}।`);
  },
};

// (x^2 − y^2) ÷ (x − y) and friends with decimals: 0.87 and 0.13.
const decIdentity = {
  id: "decIdentity", levels: ["medium", "hard"],
  cands: () => cross(pairs(11, 98).filter(([a, b]) => a + b <= 120 && (a + b) % 5 === 0 && a !== b), ["sq", "cube"]).map(([[a, b], w]) => [a, b, w]).filter(([a, b]) => (a * 13 + b) % 4 === 0),
  build: (t, [A, B, w]) => {
    const a = A / 100, b = B / 100, as = a.toFixed(2), bs = b.toFixed(2), ans = clean((A + B) / 100);
    const q = w === "sq" ? `(${as} × ${as} − ${bs} × ${bs}) ÷ (${as} − ${bs})` : `(${as} × ${as} × ${as} + ${bs} × ${bs} × ${bs}) ÷ (${as} × ${as} − ${as} × ${bs} + ${bs} × ${bs})`;
    return NQ(t, `Find the value of ${q}.`, `${q} का मान ज्ञात कीजिए।`,
      ans, [clean((A - B) / 100), clean((A * B) / 10000), clean(ans + 0.1)], () => (w === "sq" ? (a * a - b * b) / (a - b) : (a ** 3 + b ** 3) / (a * a - a * b + b * b)),
      w === "sq" ? `(a^2 − b^2) ÷ (a − b) = a + b = ${as} + ${bs} = ${N(ans)}.` : `(a^3 + b^3) ÷ (a^2 − ab + b^2) = a + b = ${as} + ${bs} = ${N(ans)}.`,
      w === "sq" ? `(a^2 − b^2) ÷ (a − b) = a + b = ${as} + ${bs} = ${N(ans)}।` : `(a^3 + b^3) ÷ (a^2 − ab + b^2) = a + b = ${as} + ${bs} = ${N(ans)}।`, { step: 0.01 });
  },
};

// a^2 + b^2 = s, ab = q (a, b > 0): a + b.
const sumFromSq = {
  id: "sumFromSq", levels: ["medium", "hard", "advanced"],
  cands: () => pairs(2, 30).map(([a, b]) => [a * a + b * b, a * b]),
  build: (t, [s, q]) => {
    const [a, b] = vv([s, q, 4]); const ans = Math.sqrt(s + 2 * q);
    return NQ(t, `If ${a}^2 + ${b}^2 = ${s} and ${a}${b} = ${q}, where ${a} and ${b} are positive, find ${a} + ${b}.`, `यदि ${a}^2 + ${b}^2 = ${s} और ${a}${b} = ${q} है, जहाँ ${a} और ${b} धनात्मक हैं, तो ${a} + ${b} ज्ञात कीजिए।`,
      ans, [Math.sqrt(s - 2 * q), s + 2 * q, ans + 1], () => { for (let x = 1; x < 100; x++) for (let y = 1; y < 100; y++) if (x * x + y * y === s && x * y === q) return x + y; return NaN; },
      `(${a} + ${b})^2 = ${a}^2 + ${b}^2 + 2${a}${b} = ${s} + ${2 * q} = ${s + 2 * q}, so ${a} + ${b} = ${ans}.`,
      `(${a} + ${b})^2 = ${a}^2 + ${b}^2 + 2${a}${b} = ${s} + ${2 * q} = ${s + 2 * q}, अतः ${a} + ${b} = ${ans}।`, { positive: true });
  },
};

// The expansion of a cube with numbers: 47^3 + 3 × 47^2 × 3 + 3 × 47 × 9 + 27.
const cubeExpand = {
  id: "cubeExpand", levels: ["medium"],
  cands: () => cross(range(11, 99), range(1, 9), [1, -1]).filter(([a, b, s]) => [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].includes(a + s * b)),
  build: (t, [a, b, s]) => {
    const r = a + s * b; const ans = r ** 3; const op = s > 0 ? "+" : "−";
    const q = `${a}^3 ${op} 3 × ${a}^2 × ${b} + 3 × ${a} × ${b * b} ${op} ${b ** 3}`;
    return NQ(t, `Find the value of ${q}.`, `${q} का मान ज्ञात कीजिए।`,
      ans, [(a - s * b) ** 3, r * r, ans + 1000], () => a ** 3 + s * 3 * a * a * b + 3 * a * b * b + s * b ** 3,
      `This is (a ${op} b)^3 with a = ${a}, b = ${b}: (${a} ${op} ${b})^3 = ${r}^3 = ${ans}.`,
      `यह (a ${op} b)^3 है, जहाँ a = ${a}, b = ${b}: (${a} ${op} ${b})^3 = ${r}^3 = ${ans}।`);
  },
};

// ---------------------------------------------------------------- HARD
const triples = (lo, hi) => { const o = []; for (let a = lo; a <= hi; a++) for (let b = lo; b < a; b++) for (let c = lo; c < b; c++) o.push([a, b, c]); return o; };
const abcSq = {
  id: "abcSq", levels: ["hard"],
  cands: () => thin(triples(1, 15).map(([a, b, c]) => [a + b + c, a * b + b * c + c * a]), (x) => x),
  build: (t, [p, q]) => {
    const ans = p * p - 2 * q;
    return NQ(t, `If a + b + c = ${p} and ab + bc + ca = ${q}, find the value of a^2 + b^2 + c^2.`, `यदि a + b + c = ${p} और ab + bc + ca = ${q} है, तो a^2 + b^2 + c^2 का मान ज्ञात कीजिए।`,
      ans, [p * p + 2 * q, p * p - q, p * p - 3 * q], () => { for (const [a, b, c] of triples(1, 15)) if (a + b + c === p && a * b + b * c + c * a === q) return a * a + b * b + c * c; return NaN; },
      `a^2 + b^2 + c^2 = (a + b + c)^2 − 2(ab + bc + ca) = ${p}^2 − 2 × ${q} = ${p * p} − ${2 * q} = ${ans}.`,
      `a^2 + b^2 + c^2 = (a + b + c)^2 − 2(ab + bc + ca) = ${p}^2 − 2 × ${q} = ${p * p} − ${2 * q} = ${ans}।`, { positive: true });
  },
};

const abcCube = {
  id: "abcCube", levels: ["hard", "advanced"],
  cands: () => thin(triples(1, 12).map(([a, b, c]) => [a + b + c, a * b + b * c + c * a]), (x) => x),
  build: (t, [p, q]) => {
    const ans = p * (p * p - 3 * q);
    return NQ(t, `If a + b + c = ${p} and ab + bc + ca = ${q}, find the value of a^3 + b^3 + c^3 − 3abc.`, `यदि a + b + c = ${p} और ab + bc + ca = ${q} है, तो a^3 + b^3 + c^3 − 3abc का मान ज्ञात कीजिए।`,
      ans, [p * (p * p - 2 * q), p * (p * p - q), p ** 3 - 3 * q], () => { for (const [a, b, c] of triples(1, 12)) if (a + b + c === p && a * b + b * c + c * a === q) return a ** 3 + b ** 3 + c ** 3 - 3 * a * b * c; return NaN; },
      `a^2 + b^2 + c^2 = ${p}^2 − 2 × ${q} = ${p * p - 2 * q}. a^3 + b^3 + c^3 − 3abc = (a + b + c)(a^2 + b^2 + c^2 − ab − bc − ca) = ${p} × (${p * p - 2 * q} − ${q}) = ${p} × ${p * p - 3 * q} = ${ans}.`,
      `a^2 + b^2 + c^2 = ${p}^2 − 2 × ${q} = ${p * p - 2 * q}। a^3 + b^3 + c^3 − 3abc = (a + b + c)(a^2 + b^2 + c^2 − ab − bc − ca) = ${p} × (${p * p - 2 * q} − ${q}) = ${p} × ${p * p - 3 * q} = ${ans}।`);
  },
};

// a + b + c = 0, so a^3 + b^3 + c^3 = 3abc.
const zeroSum = {
  id: "zeroSum", levels: ["hard", "advanced"],
  cands: () => { const o = []; for (let a = 5; a <= 40; a++) for (let b = 2; b < a - 1; b++) { const c = a - b; if (c > b) o.push([a, b, c]); } return o; },
  build: (t, [a, b, c]) => {
    const ans = 3 * a * -b * -c;
    return NQ(t, `Find the value of ${a}^3 + (−${b})^3 + (−${c})^3.`, `${a}^3 + (−${b})^3 + (−${c})^3 का मान ज्ञात कीजिए।`,
      ans, [-ans, a * b * c, ans + 3 * a], () => a ** 3 - b ** 3 - c ** 3,
      `${a} + (−${b}) + (−${c}) = 0, and when x + y + z = 0, x^3 + y^3 + z^3 = 3xyz. So the value = 3 × ${a} × (−${b}) × (−${c}) = ${ans}.`,
      `${a} + (−${b}) + (−${c}) = 0, और जब x + y + z = 0 हो, तब x^3 + y^3 + z^3 = 3xyz। अतः मान = 3 × ${a} × (−${b}) × (−${c}) = ${ans}।`);
  },
};

// x − y = p, y − z = q: x^2 + y^2 + z^2 − xy − yz − zx = ½[p^2 + q^2 + (p + q)^2].
const symDiff = {
  id: "symDiff", levels: ["hard", "advanced"],
  cands: () => pairs(2, 20).flatMap(([p, q]) => [[p, q], [q, p]]),
  build: (t, [p, q]) => {
    const ans = (p * p + q * q + (p + q) ** 2) / 2;
    return NQ(t, `If x − y = ${p} and y − z = ${q}, find the value of x^2 + y^2 + z^2 − xy − yz − zx.`, `यदि x − y = ${p} और y − z = ${q} है, तो x^2 + y^2 + z^2 − xy − yz − zx का मान ज्ञात कीजिए।`,
      ans, [p * p + q * q + (p + q) ** 2, (p * p + q * q) / 2, p * q * (p + q)], () => { const z = 3, y = z + q, x = y + p; return x * x + y * y + z * z - x * y - y * z - z * x; },
      `z − x = −(${p} + ${q}) = −${p + q}. The expression = ½[(x − y)^2 + (y − z)^2 + (z − x)^2] = ½[${p * p} + ${q * q} + ${(p + q) ** 2}] = ${N(ans)}.`,
      `z − x = −(${p} + ${q}) = −${p + q}। व्यंजक = ½[(x − y)^2 + (y − z)^2 + (z − x)^2] = ½[${p * p} + ${q * q} + ${(p + q) ** 2}] = ${N(ans)}।`);
  },
};

const fourth = {
  id: "fourth", levels: ["hard", "advanced"],
  cands: () => cross(pairs(2, 12), ["sum", "diff"]).map(([[a, b], w]) => [w === "sum" ? a + b : a - b, a * b, w]),
  build: (t, [p, q, w]) => {
    const [a, b] = vv([p, q, 5]); const sq = w === "sum" ? p * p - 2 * q : p * p + 2 * q; const ans = sq * sq - 2 * q * q;
    const sign = w === "sum" ? "+" : "−";
    return NQ(t, `If ${a} ${sign} ${b} = ${p} and ${a}${b} = ${q}, find the value of ${a}^4 + ${b}^4.`, `यदि ${a} ${sign} ${b} = ${p} और ${a}${b} = ${q} है, तो ${a}^4 + ${b}^4 का मान ज्ञात कीजिए।`,
      ans, [sq * sq, sq * sq + 2 * q * q, sq * sq - q * q], () => { const s = w === "sum" ? (p - Math.sqrt(p * p - 4 * q)) / 2 : (-p + Math.sqrt(p * p + 4 * q)) / 2; const r = w === "sum" ? p - s : s + p; return r ** 4 + s ** 4; },
      `${a}^2 + ${b}^2 = (${a} ${sign} ${b})^2 ${w === "sum" ? "−" : "+"} 2${a}${b} = ${p * p} ${w === "sum" ? "−" : "+"} ${2 * q} = ${sq}. ${a}^4 + ${b}^4 = (${a}^2 + ${b}^2)^2 − 2(${a}${b})^2 = ${sq * sq} − ${2 * q * q} = ${ans}.`,
      `${a}^2 + ${b}^2 = (${a} ${sign} ${b})^2 ${w === "sum" ? "−" : "+"} 2${a}${b} = ${p * p} ${w === "sum" ? "−" : "+"} ${2 * q} = ${sq}। ${a}^4 + ${b}^4 = (${a}^2 + ${b}^2)^2 − 2(${a}${b})^2 = ${sq * sq} − ${2 * q * q} = ${ans}।`, { positive: true });
  },
};

// (a + b)^3 − (a − b)^3 − 6a^2b = 2b^3: the trick a paper likes.
const cubeTrick = {
  id: "cubeTrick", levels: ["hard", "advanced"],
  cands: () => pairs(11, 60).filter(([a, b]) => b <= 12),
  build: (t, [a, b]) => {
    const ans = 2 * b ** 3;
    return NQ(t, `Find the value of (${a} + ${b})^3 − (${a} − ${b})^3 − 6 × ${a}^2 × ${b}.`, `(${a} + ${b})^3 − (${a} − ${b})^3 − 6 × ${a}^2 × ${b} का मान ज्ञात कीजिए।`,
      ans, [b ** 3, 6 * a * b * b, ans + 2 * b], () => (a + b) ** 3 - (a - b) ** 3 - 6 * a * a * b,
      `(a + b)^3 − (a − b)^3 = 6a^2b + 2b^3, so the value is 2b^3 = 2 × ${b}^3 = ${ans}.`,
      `(a + b)^3 − (a − b)^3 = 6a^2b + 2b^3, अतः मान = 2b^3 = 2 × ${b}^3 = ${ans}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
// a + b = p and a^3 + b^3 = r: find ab.
const abFromCube = {
  id: "abFromCube", levels: ["advanced"],
  cands: () => pairs(3, 18).map(([a, b]) => [a + b, a ** 3 + b ** 3]),
  build: (t, [p, r]) => {
    const [a, b] = vv([p, r, 6]); const ans = (p ** 3 - r) / (3 * p);
    return NQ(t, `If ${a} + ${b} = ${p} and ${a}^3 + ${b}^3 = ${r}, find the value of ${a}${b}.`, `यदि ${a} + ${b} = ${p} और ${a}^3 + ${b}^3 = ${r} है, तो ${a}${b} का मान ज्ञात कीजिए।`,
      ans, [(p ** 3 - r) / 3, (p ** 3 - r) / p, ans + p], () => { for (let x = 1; x < 40; x++) { const y = p - x; if (y > 0 && x ** 3 + y ** 3 === r) return x * y; } return NaN; },
      `(${a} + ${b})^3 = ${a}^3 + ${b}^3 + 3${a}${b}(${a} + ${b}): ${p ** 3} = ${r} + 3${a}${b} × ${p}, so ${a}${b} = (${p ** 3} − ${r}) ÷ ${3 * p} = ${ans}.`,
      `(${a} + ${b})^3 = ${a}^3 + ${b}^3 + 3${a}${b}(${a} + ${b}): ${p ** 3} = ${r} + 3${a}${b} × ${p}, अतः ${a}${b} = (${p ** 3} − ${r}) ÷ ${3 * p} = ${ans}।`, { positive: true });
  },
};

// (a − b)^3 + (b − c)^3 + (c − a)^3 = 3(a − b)(b − c)(c − a), with numbers.
const cyclic = {
  id: "cyclic", levels: ["advanced"],
  cands: () => triples(2, 40).filter(([a, b, c]) => a - c <= 24 && (a + b + c) % 3 === 0).map(([a, b, c]) => [c, a, b]),
  build: (t, [a, b, c]) => {
    const ans = 3 * (a - b) * (b - c) * (c - a);
    return NQ(t, `If a = ${a}, b = ${b} and c = ${c}, find the value of (a − b)^3 + (b − c)^3 + (c − a)^3.`, `यदि a = ${a}, b = ${b} और c = ${c} है, तो (a − b)^3 + (b − c)^3 + (c − a)^3 का मान ज्ञात कीजिए।`,
      ans, [-ans, (a - b) * (b - c) * (c - a), ans * 2], () => (a - b) ** 3 + (b - c) ** 3 + (c - a) ** 3,
      `(a − b) + (b − c) + (c − a) = 0, so the sum of their cubes is 3(a − b)(b − c)(c − a) = 3 × (${N(a - b)}) × (${N(b - c)}) × (${N(c - a)}) = ${N(ans)}.`,
      `(a − b) + (b − c) + (c − a) = 0, अतः इनके घनों का योग = 3(a − b)(b − c)(c − a) = 3 × (${N(a - b)}) × (${N(b - c)}) × (${N(c - a)}) = ${N(ans)}।`);
  },
};

// a^2 + b^2 + c^2 and a + b + c given: ab + bc + ca.
const abcPair = {
  id: "abcPair", levels: ["advanced"],
  cands: () => thin(triples(1, 18).map(([a, b, c]) => [a + b + c, a * a + b * b + c * c]), (x) => x),
  build: (t, [p, s]) => {
    const ans = (p * p - s) / 2;
    return NQ(t, `If a + b + c = ${p} and a^2 + b^2 + c^2 = ${s}, find the value of ab + bc + ca.`, `यदि a + b + c = ${p} और a^2 + b^2 + c^2 = ${s} है, तो ab + bc + ca का मान ज्ञात कीजिए।`,
      ans, [p * p - s, (s - p) / 2, (p * p + s) / 2], () => { for (const [a, b, c] of triples(1, 18)) if (a + b + c === p && a * a + b * b + c * c === s) return a * b + b * c + c * a; return NaN; },
      `(a + b + c)^2 = a^2 + b^2 + c^2 + 2(ab + bc + ca): ${p * p} = ${s} + 2(ab + bc + ca), so ab + bc + ca = (${p * p} − ${s}) ÷ 2 = ${ans}.`,
      `(a + b + c)^2 = a^2 + b^2 + c^2 + 2(ab + bc + ca): ${p * p} = ${s} + 2(ab + bc + ca), अतः ab + bc + ca = (${p * p} − ${s}) ÷ 2 = ${ans}।`, { positive: true });
  },
};

// a^3 + b^3 + c^3 − 3abc with numbers, through (a + b + c)·½Σ(a − b)^2.
const abcNumeric = {
  id: "abcNumeric", levels: ["advanced"],
  cands: () => { const o = []; for (let c = 10; c <= 90; c++) for (const d of [1, 2, 3]) o.push([c + 2 * d, c + d, c]); return o; },
  build: (t, [a, b, c]) => {
    const ans = a ** 3 + b ** 3 + c ** 3 - 3 * a * b * c;
    const half = ((a - b) ** 2 + (b - c) ** 2 + (c - a) ** 2) / 2;
    return NQ(t, `Find the value of ${a}^3 + ${b}^3 + ${c}^3 − 3 × ${a} × ${b} × ${c}.`, `${a}^3 + ${b}^3 + ${c}^3 − 3 × ${a} × ${b} × ${c} का मान ज्ञात कीजिए।`,
      ans, [(a + b + c) * half * 2, a + b + c, ans + (a + b + c)], () => { let s = 0n; for (const x of [a, b, c]) s += BigInt(x) ** 3n; return Number(s - 3n * BigInt(a) * BigInt(b) * BigInt(c)); },
      `a^3 + b^3 + c^3 − 3abc = ½(a + b + c)[(a − b)^2 + (b − c)^2 + (c − a)^2] = ½ × ${a + b + c} × (${(a - b) ** 2} + ${(b - c) ** 2} + ${(c - a) ** 2}) = ${a + b + c} × ${half} = ${ans}.`,
      `a^3 + b^3 + c^3 − 3abc = ½(a + b + c)[(a − b)^2 + (b − c)^2 + (c − a)^2] = ½ × ${a + b + c} × (${(a - b) ** 2} + ${(b - c) ** 2} + ${(c - a) ** 2}) = ${a + b + c} × ${half} = ${ans}।`);
  },
};

// (x + 1/2)... no: the square of a binomial with a fraction - (2x + 3y)^2 coefficient of xy.
const coefXY = {
  id: "coefXY", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => cross(range(1, 9), range(1, 9), [1, -1], ["sq", "cube"]).filter(([a, b, s, w]) => (a > 1 || b > 1) && (w === "sq" || (a <= 5 && b <= 5))),
  build: (t, [a, b, s, w]) => {
    const op = s > 0 ? "+" : "−"; const A = a === 1 ? "" : String(a), B = b === 1 ? "" : String(b);
    if (w === "sq") {
      const k = 2 * a * b * s;
      return NQ(t, `What is the coefficient of xy in the expansion of (${A}x ${op} ${B}y)^2?`, `(${A}x ${op} ${B}y)^2 के प्रसार में xy का गुणांक क्या है?`,
        k, [-k, a * b * s, a * a + b * b], () => 2 * a * (s * b),
        `(${A}x ${op} ${B}y)^2 = ${a * a === 1 ? "" : a * a}x^2 ${op} 2 × ${a} × ${b}xy + ${b * b === 1 ? "" : b * b}y^2, so the coefficient of xy is ${N(k)}.`,
        `(${A}x ${op} ${B}y)^2 = ${a * a === 1 ? "" : a * a}x^2 ${op} 2 × ${a} × ${b}xy + ${b * b === 1 ? "" : b * b}y^2, अतः xy का गुणांक ${N(k)} है।`);
    }
    const k = 3 * a * a * b * s;
    return NQ(t, `What is the coefficient of x^2y in the expansion of (${A}x ${op} ${B}y)^3?`, `(${A}x ${op} ${B}y)^3 के प्रसार में x^2y का गुणांक क्या है?`,
      k, [-k, a * a * b * s, 3 * a * b * b * s], () => 3 * a * a * (s * b),
      `(p ${op} q)^3 = p^3 ${op} 3p^2q + 3pq^2 ${op} q^3 with p = ${A}x, q = ${B}y. The x^2y term is ${op === "+" ? "" : "−"}3 × ${a * a} × ${b}x^2y, so the coefficient is ${N(k)}.`,
      `(p ${op} q)^3 = p^3 ${op} 3p^2q + 3pq^2 ${op} q^3, जहाँ p = ${A}x, q = ${B}y। x^2y वाला पद ${op === "+" ? "" : "−"}3 × ${a * a} × ${b}x^2y है, अतः गुणांक ${N(k)} है।`);
  },
};

const KINDS = guard([sqNear, prodNear, diffSq, sumSq, diffSqSum, expandK, completeSq, pmSq, fourAB, cubeSum, cubeDiff, cubeFrac, decIdentity, sumFromSq, cubeExpand, abcSq, abcCube, zeroSum, symDiff, fourth, cubeTrick, abFromCube, cyclic, abcPair, abcNumeric, coefXY]);
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
