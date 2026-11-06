// Algebra · Quadratic Equations: every kind of question, level by level.
// Every equation is built from its roots (so they are rational), and v()
// checks the printed equation itself: roots by substitution, sums and
// products from the actual roots, an equation option by comparing its roots.
const L = require("./alg-lib");
const { N, F, NQ, FQ, XQ, P, cross, crossF, range, isInt, clean, gcd, pick, thin, evalP, mulP, guard } = L;
const { fillTopic } = require("./gen");

const PREFIX = "Algebra · Quadratic Equations";
// (a1·x − b1)(a2·x − b2) → [A, B, C], with roots b1/a1 and b2/a2.
const fromRoots = (b1, a1 = 1, b2 = 0, a2 = 1) => mulP([a1, -b1], [a2, -b2]);
const eqT = (c, v = "x") => `${P(c, v)} = 0`;
// The real roots of A·x^2 + B·x + C (numerically), for the checks.
const roots = ([A, B, C]) => { const D = B * B - 4 * A * C; if (D < 0) return []; const s = Math.sqrt(D); return [(-B + s) / (2 * A), (-B - s) / (2 * A)]; };
const isRoot = (c, x) => Math.abs(evalP(c, x)) < 1e-7;
const nz = (x) => x !== 0;
// A number inside working: negatives in brackets, so (−2)^2 is never −2^2.
const pn = (x) => (x < 0 ? `(${N(x)})` : N(x));
const pairT = (p, q) => `${p} and ${q}`;
const pairH = (p, q) => `${p} और ${q}`;
// Parse "3 and −5/2" back into numbers - the judge reads the option text.
const parsePair = (s) => String(s).split(/ and | और /).map(L.fval);
const sameSet = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).every((x, i) => Math.abs(x - [...b].sort((p, q) => p - q)[i]) < 1e-9);

// ---------------------------------------------------------------- EASY
const rootsMonic = {
  id: "rootsMonic", levels: ["easy", "medium"],
  cands: () => crossF([range(-12, 15), range(-12, 15)], ([p, q]) => p > q && nz(p) && nz(q) && p !== -q),
  build: (t, [p, q]) => {
    const c = fromRoots(p, 1, q, 1);
    const sets = [[p, q], [-p, -q], [p, -q], [-p, q]];
    const o = sets.map(([a, b]) => pairT(N(a), N(b))), oh = sets.map(([a, b]) => pairH(N(a), N(b)));
    return XQ(t, `Find the roots of the equation ${eqT(c)}.`, `समीकरण ${eqT(c)} के मूल ज्ञात कीजिए।`, o, oh,
      (i) => { const v = parsePair(o[i]); return v.every((x) => isRoot(c, x)) && sameSet(v, roots(c)); },
      `${P(c)} = (x ${p > 0 ? "−" : "+"} ${Math.abs(p)})(x ${q > 0 ? "−" : "+"} ${Math.abs(q)}) = 0, so x = ${N(p)} or x = ${N(q)}.`,
      `${P(c)} = (x ${p > 0 ? "−" : "+"} ${Math.abs(p)})(x ${q > 0 ? "−" : "+"} ${Math.abs(q)}) = 0, अतः x = ${N(p)} या x = ${N(q)}।`);
  },
};

// Sum / product of the roots of ax^2 + bx + c = 0 (a ≠ 1, fractions allowed).
const sumProd = {
  id: "sumProd", levels: ["easy", "medium"],
  cands: () => crossF([range(2, 9), range(-20, 20), range(-20, 20), ["sum", "prod"]], ([a, b, c]) => nz(b) && nz(c) && b * b - 4 * a * c > 0 && gcd(gcd(a, b), c) === 1),
  build: (t, [a, b, c, w]) => {
    const e = [a, b, c]; const sum = w === "sum";
    const [p, r] = sum ? [-b, a] : [c, a];
    return FQ(t, `What is the ${sum ? "sum" : "product"} of the roots of the equation ${eqT(e)}?`, `समीकरण ${eqT(e)} के मूलों का ${sum ? "योग" : "गुणनफल"} क्या है?`,
      [p, r], sum ? [[b, a], [-a, b], [c, a]] : [[-c, a], [a, c], [-b, a]],
      () => { const [x, y] = roots(e); return sum ? x + y : x * y; },
      sum ? `For ax^2 + bx + c = 0 the sum of the roots is −b/a = −(${N(b)})/${a} = ${F(-b, a)}.` : `For ax^2 + bx + c = 0 the product of the roots is c/a = ${N(c)}/${a} = ${F(c, a)}.`,
      sum ? `ax^2 + bx + c = 0 के मूलों का योग −b/a = −(${N(b)})/${a} = ${F(-b, a)} होता है।` : `ax^2 + bx + c = 0 के मूलों का गुणनफल c/a = ${N(c)}/${a} = ${F(c, a)} होता है।`);
  },
};

// x = r is a root of x^2 + kx + c = 0: find k.
const findK = {
  id: "findK", levels: ["easy", "medium"],
  cands: () => crossF([range(-9, 9), range(-30, 30)], ([r, c]) => nz(r) && nz(c) && isInt((r * r + c) / r) && (r * r + c) / r !== 0),
  build: (t, [r, c]) => {
    const k = -(r * r + c) / r;
    return NQ(t, `If x = ${N(r)} is a root of the equation x^2 + kx ${c < 0 ? "−" : "+"} ${Math.abs(c)} = 0, find the value of k.`, `यदि x = ${N(r)} समीकरण x^2 + kx ${c < 0 ? "−" : "+"} ${Math.abs(c)} = 0 का एक मूल है, तो k का मान ज्ञात कीजिए।`,
      k, [-k, (r * r - c) / r, k + 1], () => { for (let K = -200; K <= 200; K++) if (r * r + K * r + c === 0) return K; return NaN; },
      `Put x = ${N(r)}: (${N(r)})^2 + k(${N(r)}) ${c < 0 ? "−" : "+"} ${Math.abs(c)} = 0 → ${r * r} ${r < 0 ? "−" : "+"} ${Math.abs(r) === 1 ? "" : Math.abs(r)}k ${c < 0 ? "−" : "+"} ${Math.abs(c)} = 0, so k = ${N(k)}.`,
      `x = ${N(r)} रखने पर: (${N(r)})^2 + k(${N(r)}) ${c < 0 ? "−" : "+"} ${Math.abs(c)} = 0 → ${r * r} ${r < 0 ? "−" : "+"} ${Math.abs(r) === 1 ? "" : Math.abs(r)}k ${c < 0 ? "−" : "+"} ${Math.abs(c)} = 0, अतः k = ${N(k)}।`);
  },
};

const disc = {
  id: "disc", levels: ["easy"],
  cands: () => crossF([range(1, 9), range(-15, 15), range(-15, 15)], ([a, b, c]) => nz(b) && nz(c) && gcd(gcd(a, b), c) === 1),
  build: (t, [a, b, c]) => {
    const e = [a, b, c]; const D = b * b - 4 * a * c;
    return NQ(t, `Find the discriminant of the quadratic equation ${eqT(e)}.`, `द्विघात समीकरण ${eqT(e)} का विविक्तकर (discriminant) ज्ञात कीजिए।`,
      D, [b * b + 4 * a * c, b * b - 2 * a * c, -D], () => e[1] ** 2 - 4 * e[0] * e[2],
      `D = b^2 − 4ac = ${pn(b)}^2 − 4 × ${a} × ${pn(c)} = ${b * b} ${4 * a * c < 0 ? "+" : "−"} ${Math.abs(4 * a * c)} = ${N(D)}.`,
      `D = b^2 − 4ac = ${pn(b)}^2 − 4 × ${a} × ${pn(c)} = ${b * b} ${4 * a * c < 0 ? "+" : "−"} ${Math.abs(4 * a * c)} = ${N(D)}।`);
  },
};

const formEq = {
  id: "formEq", levels: ["easy", "medium"],
  cands: () => crossF([range(-12, 12), range(-12, 12)], ([p, q]) => p > q && nz(p) && nz(q) && p !== -q),
  build: (t, [p, q]) => {
    const right = fromRoots(p, 1, q, 1);
    const wrong = [fromRoots(-p, 1, -q, 1), [1, -(p + q), -p * q], [1, p + q, -p * q]];
    const all = [right, ...wrong]; const o = all.map((c) => eqT(c));
    return XQ(t, `Which quadratic equation has the roots ${N(p)} and ${N(q)}?`, `किस द्विघात समीकरण के मूल ${N(p)} और ${N(q)} हैं?`, o, null,
      (i) => isRoot(all[i], p) && isRoot(all[i], q),
      `x^2 − (sum of roots)x + (product of roots) = 0: sum = ${N(p + q)}, product = ${N(p * q)}, so ${eqT(right)}.`,
      `x^2 − (मूलों का योग)x + (मूलों का गुणनफल) = 0: योग = ${N(p + q)}, गुणनफल = ${N(p * q)}, अतः ${eqT(right)}।`);
  },
};

// Word problems with a positive answer.
const consecProd = {
  id: "consecProd", levels: ["easy", "medium"],
  cands: () => cross(range(5, 40), ["int", "even", "odd"], ["big", "small"]).filter(([n, ty]) => ty === "int" || (ty === "even" ? n % 2 === 0 : n % 2 === 1)),
  build: (t, [n, ty, ask]) => {
    const d = ty === "int" ? 1 : 2; const m = n + d; const P2 = n * m; const ans = ask === "big" ? m : n;
    const en = ty === "int" ? "consecutive positive integers" : ty === "even" ? "consecutive positive even numbers" : "consecutive positive odd numbers";
    const hi = ty === "int" ? "क्रमागत धनात्मक पूर्णांकों" : ty === "even" ? "क्रमागत धनात्मक सम संख्याओं" : "क्रमागत धनात्मक विषम संख्याओं";
    return NQ(t, `The product of two ${en} is ${P2}. Find the ${ask === "big" ? "larger" : "smaller"} number.`, `दो ${hi} का गुणनफल ${P2} है। ${ask === "big" ? "बड़ी" : "छोटी"} संख्या ज्ञात कीजिए।`,
      ans, [ask === "big" ? n : m, ans + 2 * d, Math.round(Math.sqrt(P2)) + 3], () => { for (let x = 1; x < 200; x++) if (x * (x + d) === P2) return ask === "big" ? x + d : x; return NaN; },
      `Let the numbers be x and x + ${d}. x(x + ${d}) = ${P2} → ${P([1, d, -P2])} = 0 → (x − ${n})(x + ${m}) = 0, so x = ${n} (positive). The numbers are ${n} and ${m}.`,
      `माना संख्याएँ x और x + ${d} हैं। x(x + ${d}) = ${P2} → ${P([1, d, -P2])} = 0 → (x − ${n})(x + ${m}) = 0, अतः x = ${n} (धनात्मक)। संख्याएँ ${n} और ${m} हैं।`, { positive: true, whole: true, step: d });
  },
};

// The sum of a number and its square / a number squared minus k times it.
const numSquare = {
  id: "numSquare", levels: ["easy", "medium"],
  cands: () => cross(range(4, 40), range(1, 9)).filter(([x, k]) => x > k + 1),
  build: (t, [x, k]) => {
    const S = x * x - k * x;
    return NQ(t, `When ${k === 1 ? "a positive number" : `${k} times a positive number`} is subtracted from its square, the result is ${S}. Find the number.`,
      `एक धनात्मक संख्या के वर्ग में से ${k === 1 ? "वही संख्या" : `उसका ${k} गुना`} घटाने पर ${S} प्राप्त होता है। संख्या ज्ञात कीजिए।`,
      x, [x - k, x + 1, k], () => { for (let y = 1; y < 500; y++) if (y * y - k * y === S) return y; return NaN; },
      `x^2 − ${k === 1 ? "" : k}x = ${S} → x^2 − ${k === 1 ? "" : k}x − ${S} = 0 → (x − ${x})(x + ${x - k}) = 0, so x = ${x} (the positive root).`,
      `x^2 − ${k === 1 ? "" : k}x = ${S} → x^2 − ${k === 1 ? "" : k}x − ${S} = 0 → (x − ${x})(x + ${x - k}) = 0, अतः x = ${x} (धनात्मक मूल)।`, { positive: true, whole: true });
  },
};

// Larger / smaller root of ax^2 + bx + c (factorable, a ≠ 1).
const rootOf = {
  id: "rootOf", levels: ["easy", "medium", "hard"],
  cands: () => crossF([range(2, 6), range(-9, 9), range(1, 3), range(-9, 9), ["big", "small"]], ([a1, b1, a2, b2]) => nz(b1) && nz(b2) && gcd(a1, Math.abs(b1)) === 1 && gcd(a2, Math.abs(b2)) === 1 && b1 / a1 !== b2 / a2 && (a2 === 1 || b1 * a2 !== b2 * a1)),
  build: (t, [a1, b1, a2, b2, w]) => {
    const e = fromRoots(b1, a1, b2, a2); const g = gcd(gcd(Math.abs(e[0]), Math.abs(e[1])), Math.abs(e[2])); const E = e.map((x) => x / g);
    const r1 = b1 / a1, r2 = b2 / a2; const big = w === "big"; const want = big ? Math.max(r1, r2) : Math.min(r1, r2);
    const [p, r] = want === r1 ? [b1, a1] : [b2, a2]; const [op, or] = want === r1 ? [b2, a2] : [b1, a1];
    return FQ(t, `What is the ${big ? "larger" : "smaller"} root of ${eqT(E)}?`, `${eqT(E)} का ${big ? "बड़ा" : "छोटा"} मूल क्या है?`,
      [p, r], [[op, or], [-p, r], [-op, or]], () => (big ? Math.max(...roots(E)) : Math.min(...roots(E))),
      `${P(E)} = 0 → (${P([a1, -b1])})(${P([a2, -b2])}) = 0, so x = ${F(b1, a1)} or x = ${F(b2, a2)}. The ${big ? "larger" : "smaller"} root is ${F(p, r)}.`,
      `${P(E)} = 0 → (${P([a1, -b1])})(${P([a2, -b2])}) = 0, अतः x = ${F(b1, a1)} या x = ${F(b2, a2)}। ${big ? "बड़ा" : "छोटा"} मूल ${F(p, r)} है।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
const NATURE = ["Real and distinct", "Real and equal", "Not real (no real roots)", "Cannot be determined"];
const NATURE_H = ["वास्तविक और भिन्न", "वास्तविक और समान", "वास्तविक नहीं (कोई वास्तविक मूल नहीं)", "ज्ञात नहीं किया जा सकता"];
const nature = {
  id: "nature", levels: ["easy", "medium", "hard"],
  cands: () => crossF([range(1, 9), range(-16, 16), range(-16, 16)], ([a, b, c]) => nz(b) && nz(c) && gcd(gcd(a, Math.abs(b)), Math.abs(c)) === 1 && (b * b - 4 * a * c !== 0 || L.hashOf([a, b, c]) % 1 === 0)),
  build: (t, [a, b, c]) => {
    const e = [a, b, c]; const D = b * b - 4 * a * c; const k = D > 0 ? 0 : D === 0 ? 1 : 2;
    const order = [k, ...[0, 1, 2, 3].filter((i) => i !== k)];
    const o = order.map((i) => NATURE[i]), oh = order.map((i) => NATURE_H[i]);
    return XQ(t, `What is the nature of the roots of ${eqT(e)}?`, `${eqT(e)} के मूलों की प्रकृति क्या है?`, o, oh,
      (i) => { const d = e[1] ** 2 - 4 * e[0] * e[2]; const truth = d > 0 ? NATURE[0] : d === 0 ? NATURE[1] : NATURE[2]; return o[i] === truth; },
      `D = b^2 − 4ac = ${b * b} ${4 * a * c < 0 ? "+" : "−"} ${Math.abs(4 * a * c)} = ${N(D)}, which is ${D > 0 ? "positive, so the roots are real and distinct" : D === 0 ? "zero, so the roots are real and equal" : "negative, so there are no real roots"}.`,
      `D = b^2 − 4ac = ${b * b} ${4 * a * c < 0 ? "+" : "−"} ${Math.abs(4 * a * c)} = ${N(D)}, जो ${D > 0 ? "धनात्मक है, अतः मूल वास्तविक और भिन्न हैं" : D === 0 ? "शून्य है, अतः मूल वास्तविक और समान हैं" : "ऋणात्मक है, अतः कोई वास्तविक मूल नहीं है"}।`);
  },
};

// Equal roots: find the positive k.
const equalK = {
  id: "equalK", levels: ["medium", "hard"],
  cands: () => cross(range(1, 9), range(1, 12), ["b", "a"]).filter(([p, q]) => gcd(p, q) === 1),
  build: (t, [p, q, w]) => {
    // (p x + q)^2 = p^2x^2 + 2pq x + q^2
    const A = p * p, B = 2 * p * q, C = q * q;
    if (w === "b") {
      return NQ(t, `For what positive value of k does ${A === 1 ? "" : A}x^2 + kx + ${C} = 0 have equal roots?`, `k के किस धनात्मक मान के लिए ${A === 1 ? "" : A}x^2 + kx + ${C} = 0 के मूल समान होंगे?`,
        B, [p * q, B * 2, A + C], () => { for (let k = 1; k < 1000; k++) if (k * k - 4 * A * C === 0) return k; return NaN; },
        `Equal roots when b^2 = 4ac: k^2 = 4 × ${A} × ${C} = ${4 * A * C}, so k = ${B}.`, `समान मूलों के लिए b^2 = 4ac: k^2 = 4 × ${A} × ${C} = ${4 * A * C}, अतः k = ${B}।`, { positive: true, whole: true });
    }
    return NQ(t, `For what value of k does kx^2 − ${B}x + ${C} = 0 have equal roots?`, `k के किस मान के लिए kx^2 − ${B}x + ${C} = 0 के मूल समान होंगे?`,
      A, [B / C, A * 2, p], () => { for (let k = 1; k < 1000; k++) if (B * B - 4 * k * C === 0) return k; return NaN; },
      `Equal roots when b^2 = 4ac: ${B}^2 = 4 × k × ${C} → ${B * B} = ${4 * C}k, so k = ${A}.`, `समान मूलों के लिए b^2 = 4ac: ${B}^2 = 4 × k × ${C} → ${B * B} = ${4 * C}k, अतः k = ${A}।`, { positive: true });
  },
};

// α^2 + β^2, 1/α + 1/β, (α + 1)(β + 1) for x^2 − sx + p = 0.
const SYM = {
  sq: ["α^2 + β^2", (s, p) => s * s - 2 * p, (s, p) => `α^2 + β^2 = (α + β)^2 − 2αβ = ${pn(s)}^2 − 2 × ${pn(p)} = ${N(s * s - 2 * p)}`],
  plus1: ["(α + 1)(β + 1)", (s, p) => p + s + 1, (s, p) => `(α + 1)(β + 1) = αβ + (α + β) + 1 = ${N(p)} + ${pn(s)} + 1 = ${N(p + s + 1)}`],
  minus: ["(α − 1)(β − 1)", (s, p) => p - s + 1, (s, p) => `(α − 1)(β − 1) = αβ − (α + β) + 1 = ${N(p)} − ${pn(s)} + 1 = ${N(p - s + 1)}`],
};
const symRoot = {
  id: "symRoot", levels: ["medium", "hard"],
  cands: () => crossF([range(-9, 12), range(-9, 12), ["sq", "plus1", "minus"]], ([r1, r2]) => r1 > r2 && nz(r1) && nz(r2) && r1 !== -r2).map(([r1, r2, w]) => [r1 + r2, r1 * r2, w]),
  build: (t, [s, p, w]) => {
    const e = [1, -s, p]; const [name, f, how] = SYM[w]; const ans = f(s, p);
    return NQ(t, `If α and β are the roots of ${eqT(e)}, find the value of ${name}.`, `यदि α और β, ${eqT(e)} के मूल हैं, तो ${name} का मान ज्ञात कीजिए।`,
      ans, [w === "sq" ? s * s + 2 * p : p + s, w === "sq" ? s * s - p : p - s, ans + 2], () => { const [a, b] = roots(e); return w === "sq" ? a * a + b * b : w === "plus1" ? (a + 1) * (b + 1) : (a - 1) * (b - 1); },
      `α + β = ${N(s)} and αβ = ${N(p)}. ${how(s, p)}.`, `α + β = ${N(s)} और αβ = ${N(p)}। ${how(s, p)}।`);
  },
};

const recipSum = {
  id: "recipSum", levels: ["medium", "hard"],
  cands: () => crossF([range(2, 6), range(-12, 12), range(-12, 12)], ([a, b, c]) => nz(b) && nz(c) && b * b - 4 * a * c > 0 && gcd(gcd(a, Math.abs(b)), Math.abs(c)) === 1 && Math.abs(b) !== Math.abs(c)),
  build: (t, [a, b, c]) => {
    const e = [a, b, c];
    return FQ(t, `If α and β are the roots of ${eqT(e)}, find the value of 1/α + 1/β.`, `यदि α और β, ${eqT(e)} के मूल हैं, तो 1/α + 1/β का मान ज्ञात कीजिए।`,
      [-b, c], [[b, c], [-c, b], [c, b]], () => { const [x, y] = roots(e); return 1 / x + 1 / y; },
      `1/α + 1/β = (α + β)/αβ = (−b/a) ÷ (c/a) = −b/c = −(${N(b)})/${pn(c)} = ${F(-b, c)}.`, `1/α + 1/β = (α + β)/αβ = (−b/a) ÷ (c/a) = −b/c = −(${N(b)})/${pn(c)} = ${F(-b, c)}।`);
  },
};

const diffRoots = {
  id: "diffRoots", levels: ["easy", "medium", "hard"],
  cands: () => crossF([range(-10, 15), range(-10, 15)], ([r1, r2]) => r1 > r2 && nz(r1) && nz(r2) && r1 !== -r2).map(([r1, r2]) => [r1 + r2, r1 * r2]),
  build: (t, [s, p]) => {
    const e = [1, -s, p]; const D = s * s - 4 * p; const ans = Math.sqrt(D);
    return NQ(t, `What is the positive difference between the roots of ${eqT(e)}?`, `${eqT(e)} के मूलों का धनात्मक अंतर क्या है?`,
      ans, [D, s, ans + 2], () => { const [a, b] = roots(e); return Math.abs(a - b); },
      `(α − β)^2 = (α + β)^2 − 4αβ = ${pn(s)}^2 − 4 × ${pn(p)} = ${D}, so |α − β| = ${ans}.`, `(α − β)^2 = (α + β)^2 − 4αβ = ${pn(s)}^2 − 4 × ${pn(p)} = ${D}, अतः |α − β| = ${ans}।`, { positive: true });
  },
};

// Rectangle: length k more than breadth, area A - the breadth.
const rectArea = {
  id: "rectArea", levels: ["medium", "hard"],
  cands: () => cross(range(3, 40), range(1, 20)),
  build: (t, [b, k]) => {
    const A = b * (b + k);
    return NQ(t, `The length of a rectangle is ${k} m more than its breadth and its area is ${A} sq m. Find its breadth.`, `एक आयत की लंबाई उसकी चौड़ाई से ${k} m अधिक है और उसका क्षेत्रफल ${A} वर्ग m है। उसकी चौड़ाई ज्ञात कीजिए।`,
      b, [b + k, Math.round(A / k), b + 1], () => { for (let x = 1; x < 500; x++) if (x * (x + k) === A) return x; return NaN; },
      `x(x + ${k}) = ${A} → x^2 + ${k}x − ${A} = 0 → (x − ${b})(x + ${b + k}) = 0, so the breadth is ${b} m.`, `x(x + ${k}) = ${A} → x^2 + ${k}x − ${A} = 0 → (x − ${b})(x + ${b + k}) = 0, अतः चौड़ाई ${b} m है।`,
      { positive: true, whole: true, fmtv: (z) => `${N(z)} m` });
  },
};

// ---------------------------------------------------------------- HARD
const cubeRoots = {
  id: "cubeRoots", levels: ["hard", "advanced"],
  cands: () => crossF([range(-8, 10), range(-8, 10)], ([r1, r2]) => r1 > r2 && nz(r1) && nz(r2) && r1 !== -r2).map(([r1, r2]) => [r1 + r2, r1 * r2]),
  build: (t, [s, p]) => {
    const e = [1, -s, p]; const ans = s ** 3 - 3 * p * s;
    return NQ(t, `If α and β are the roots of ${eqT(e)}, find the value of α^3 + β^3.`, `यदि α और β, ${eqT(e)} के मूल हैं, तो α^3 + β^3 का मान ज्ञात कीजिए।`,
      ans, [s ** 3 + 3 * p * s, s ** 3 - 3 * p, ans + s], () => { const [a, b] = roots(e); return a ** 3 + b ** 3; },
      `α^3 + β^3 = (α + β)^3 − 3αβ(α + β) = ${pn(s)}^3 − 3 × ${pn(p)} × ${pn(s)} = ${N(s ** 3)} ${3 * p * s < 0 ? "+" : "−"} ${Math.abs(3 * p * s)} = ${N(ans)}.`,
      `α^3 + β^3 = (α + β)^3 − 3αβ(α + β) = ${pn(s)}^3 − 3 × ${pn(p)} × ${pn(s)} = ${N(s ** 3)} ${3 * p * s < 0 ? "+" : "−"} ${Math.abs(3 * p * s)} = ${N(ans)}।`);
  },
};

const ratioSum = {
  id: "ratioSum", levels: ["hard", "advanced"],
  cands: () => crossF([range(-9, 12), range(-9, 12)], ([r1, r2]) => r1 > r2 && nz(r1) && nz(r2) && r1 !== -r2).map(([r1, r2]) => [r1 + r2, r1 * r2]),
  build: (t, [s, p]) => {
    const e = [1, -s, p];
    return FQ(t, `If α and β are the roots of ${eqT(e)}, find the value of α/β + β/α.`, `यदि α और β, ${eqT(e)} के मूल हैं, तो α/β + β/α का मान ज्ञात कीजिए।`,
      [s * s - 2 * p, p], [[s * s, p], [s * s + 2 * p, p], [p, s * s - 2 * p]], () => { const [a, b] = roots(e); return a / b + b / a; },
      `α/β + β/α = (α^2 + β^2)/αβ = [(α + β)^2 − 2αβ]/αβ = (${N(s * s)} − ${pn(2 * p)})/${pn(p)} = ${F(s * s - 2 * p, p)}.`,
      `α/β + β/α = (α^2 + β^2)/αβ = [(α + β)^2 − 2αβ]/αβ = (${N(s * s)} − ${pn(2 * p)})/${pn(p)} = ${F(s * s - 2 * p, p)}।`);
  },
};

// The equation whose roots are 2α, 2β / α + 1, β + 1 / α^2, β^2.
const NEW = {
  dbl: ["2α and 2β", "2α और 2β", (a) => 2 * a],
  plus: ["α + 1 and β + 1", "α + 1 और β + 1", (a) => a + 1],
  sq: ["α^2 and β^2", "α^2 और β^2", (a) => a * a],
};
const newEq = {
  id: "newEq", levels: ["hard", "advanced"],
  cands: () => crossF([range(-7, 9), range(-7, 9), ["dbl", "plus", "sq"]], ([r1, r2, w]) => r1 > r2 && nz(r1) && nz(r2) && r1 !== -r2 && (w !== "sq" || (Math.abs(r1) <= 6 && Math.abs(r2) <= 6))),
  build: (t, [r1, r2, w]) => {
    const e = fromRoots(r1, 1, r2, 1); const [en, hi, f] = NEW[w]; const n1 = f(r1), n2 = f(r2);
    const right = fromRoots(n1, 1, n2, 1);
    const wrong = [fromRoots(-n1, 1, -n2, 1), [1, -(n1 + n2), -n1 * n2], w === "dbl" ? fromRoots(r1 / 2 * 1, 1, r2 * 1, 1).map((x) => x) : fromRoots(n1 + 1, 1, n2 + 1, 1)];
    const all = [right, ...wrong.map((c) => c.map((x) => clean(x)))]; const o = all.map((c) => eqT(c));
    return XQ(t, `If α and β are the roots of ${eqT(e)}, which equation has the roots ${en}?`, `यदि α और β, ${eqT(e)} के मूल हैं, तो किस समीकरण के मूल ${hi} हैं?`, o, null,
      (i) => { const [a, b] = roots(e); return isRoot(all[i], f(a)) && isRoot(all[i], f(b)) && all[i][0] === 1; },
      `The roots of ${eqT(e)} are ${N(r1)} and ${N(r2)}, so the new roots are ${N(n1)} and ${N(n2)}: sum ${N(n1 + n2)}, product ${N(n1 * n2)}. The equation is ${eqT(right)}.`,
      `${eqT(e)} के मूल ${N(r1)} और ${N(r2)} हैं, अतः नए मूल ${N(n1)} और ${N(n2)} हैं: योग ${N(n1 + n2)}, गुणनफल ${N(n1 * n2)}। समीकरण ${eqT(right)} है।`);
  },
};

// One root is m times the other: x^2 − kx + c = 0, find positive k.
const rootTimes = {
  id: "rootTimes", levels: ["hard", "advanced"],
  cands: () => cross([2, 3, 4, 5], range(1, 9)),
  build: (t, [m, r]) => {
    const c = m * r * r, k = (m + 1) * r;
    return NQ(t, `One root of x^2 − kx + ${c} = 0 is ${m} times the other. If k is positive, find k.`, `x^2 − kx + ${c} = 0 का एक मूल दूसरे का ${m} गुना है। यदि k धनात्मक है, तो k ज्ञात कीजिए।`,
      k, [m * r, r * r, k + m], () => { for (let K = 1; K < 500; K++) { const rs = roots([1, -K, c]); if (rs.length && Math.abs(Math.max(...rs) - m * Math.min(...rs)) < 1e-9) return K; } return NaN; },
      `Let the roots be a and ${m}a. a × ${m}a = ${c} → a^2 = ${r * r} → a = ${r}. Sum of roots = k = a + ${m}a = ${m + 1} × ${r} = ${k}.`,
      `माना मूल a और ${m}a हैं। a × ${m}a = ${c} → a^2 = ${r * r} → a = ${r}। मूलों का योग = k = a + ${m}a = ${m + 1} × ${r} = ${k}।`, { positive: true, whole: true });
  },
};

// The roots differ by d: x^2 − kx + c = 0, find positive k.
const rootGap = {
  id: "rootGap", levels: ["hard", "advanced"],
  cands: () => cross(range(1, 15), range(1, 12)).filter(([r, d]) => r > 0),
  build: (t, [r, d]) => {
    const c = r * (r + d), k = 2 * r + d;
    return NQ(t, `The roots of x^2 − kx + ${c} = 0 differ by ${d}. If k is positive, find k.`, `x^2 − kx + ${c} = 0 के मूलों का अंतर ${d} है। यदि k धनात्मक है, तो k ज्ञात कीजिए।`,
      k, [Math.sqrt(4 * c), d * d + 4 * c, k + 1].map((x) => (isInt(x) ? x : k + 2)), () => { for (let K = 1; K < 500; K++) { const rs = roots([1, -K, c]); if (rs.length && Math.abs(Math.abs(rs[0] - rs[1]) - d) < 1e-9) return K; } return NaN; },
      `(α − β)^2 = (α + β)^2 − 4αβ: ${d}^2 = k^2 − 4 × ${c} → k^2 = ${d * d} + ${4 * c} = ${k * k}, so k = ${k}.`,
      `(α − β)^2 = (α + β)^2 − 4αβ: ${d}^2 = k^2 − 4 × ${c} → k^2 = ${d * d} + ${4 * c} = ${k * k}, अतः k = ${k}।`, { positive: true, whole: true });
  },
};

// A number plus its reciprocal.
const recipWord = {
  id: "recipWord", levels: ["hard", "advanced"],
  cands: () => crossF([range(2, 12), range(1, 11)], ([p, q]) => p > q && gcd(p, q) === 1),
  build: (t, [p, q]) => {
    const S = [p * p + q * q, p * q];
    return FQ(t, `The sum of a number and its reciprocal is ${F(S[0], S[1])}. If the number is greater than 1, find it.`, `एक संख्या और उसके व्युत्क्रम का योग ${F(S[0], S[1])} है। यदि संख्या 1 से बड़ी है, तो वह संख्या ज्ञात कीजिए।`,
      [p, q], [[q, p], [S[0], S[1]], [p + 1, q]], () => { const rs = roots([S[1], -S[0], S[1]]); return Math.max(...rs); },
      `x + 1/x = ${F(S[0], S[1])} → ${S[1]}x^2 − ${S[0]}x + ${S[1]} = 0 → (${q}x − ${p})(${p}x − ${q}) = 0, so x = ${F(p, q)} or ${F(q, p)}. The one greater than 1 is ${F(p, q)}.`,
      `x + 1/x = ${F(S[0], S[1])} → ${S[1]}x^2 − ${S[0]}x + ${S[1]} = 0 → (${q}x − ${p})(${p}x − ${q}) = 0, अतः x = ${F(p, q)} या ${F(q, p)}। 1 से बड़ी संख्या ${F(p, q)} है।`);
  },
};

// Minimum value of x^2 − bx + c (or maximum of −x^2 + bx + c).
const minVal = {
  id: "minVal", levels: ["hard", "advanced"],
  cands: () => cross(range(2, 30, 2), range(-20, 60), ["min", "max"]).filter(([b, c]) => nz(c)),
  build: (t, [b, c, w]) => {
    const h = b / 2;
    if (w === "min") {
      const ans = c - h * h;
      return NQ(t, `What is the minimum value of x^2 − ${b}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}?`, `x^2 − ${b}x ${c < 0 ? "−" : "+"} ${Math.abs(c)} का न्यूनतम मान क्या है?`,
        ans, [c, h, c + h * h], () => { let m = Infinity; for (let k = -2000; k <= 2000; k++) { const x = k / 20; m = Math.min(m, x * x - b * x + c); } return m; },
        `x^2 − ${b}x ${c < 0 ? "−" : "+"} ${Math.abs(c)} = (x − ${h})^2 ${ans < 0 ? "−" : "+"} ${Math.abs(ans)}. A square is never negative, so the minimum is ${N(ans)} (at x = ${h}).`,
        `x^2 − ${b}x ${c < 0 ? "−" : "+"} ${Math.abs(c)} = (x − ${h})^2 ${ans < 0 ? "−" : "+"} ${Math.abs(ans)}। वर्ग कभी ऋणात्मक नहीं होता, अतः न्यूनतम मान ${N(ans)} है (x = ${h} पर)।`);
    }
    const ans = c + h * h;
    return NQ(t, `What is the maximum value of ${c < 0 ? "−" : ""}${Math.abs(c)} + ${b}x − x^2?`, `${c < 0 ? "−" : ""}${Math.abs(c)} + ${b}x − x^2 का अधिकतम मान क्या है?`,
      ans, [c, h, c - h * h], () => { let m = -Infinity; for (let k = -2000; k <= 2000; k++) { const x = k / 20; m = Math.max(m, c + b * x - x * x); } return m; },
      `${N(c)} + ${b}x − x^2 = ${N(ans)} − (x − ${h})^2. A square is never negative, so the maximum is ${N(ans)} (at x = ${h}).`,
      `${N(c)} + ${b}x − x^2 = ${N(ans)} − (x − ${h})^2। वर्ग कभी ऋणात्मक नहीं होता, अतः अधिकतम मान ${N(ans)} है (x = ${h} पर)।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
const fourthRoots = {
  id: "fourthRoots", levels: ["advanced"],
  cands: () => crossF([range(-6, 8), range(-6, 8)], ([r1, r2]) => r1 > r2 && nz(r1) && nz(r2) && r1 !== -r2).map(([r1, r2]) => [r1 + r2, r1 * r2]),
  build: (t, [s, p]) => {
    const e = [1, -s, p]; const q = s * s - 2 * p; const ans = q * q - 2 * p * p;
    return NQ(t, `If α and β are the roots of ${eqT(e)}, find the value of α^4 + β^4.`, `यदि α और β, ${eqT(e)} के मूल हैं, तो α^4 + β^4 का मान ज्ञात कीजिए।`,
      ans, [q * q, q * q + 2 * p * p, ans + 2], () => { const [a, b] = roots(e); return a ** 4 + b ** 4; },
      `α^2 + β^2 = ${pn(s)}^2 − 2 × ${pn(p)} = ${q}. α^4 + β^4 = (α^2 + β^2)^2 − 2(αβ)^2 = ${q * q} − ${2 * p * p} = ${ans}.`,
      `α^2 + β^2 = ${pn(s)}^2 − 2 × ${pn(p)} = ${q}। α^4 + β^4 = (α^2 + β^2)^2 − 2(αβ)^2 = ${q * q} − ${2 * p * p} = ${ans}।`);
  },
};

// x^2 − sx + k = 0 with m·α + n·β = r: find k.
const condK = {
  id: "condK", levels: ["advanced"],
  cands: () => crossF([range(-6, 12), range(-6, 12), range(2, 4), range(1, 3)], ([a, b, m, n]) => a !== b && nz(a) && nz(b) && m !== n),
  build: (t, [a, b, m, n]) => {
    const s = a + b, r = m * a + n * b, k = a * b;
    return NQ(t, `If α and β are the roots of x^2 ${s < 0 ? "+" : "−"} ${Math.abs(s)}x + k = 0 and ${m}α ${n === 1 ? "+ β" : `+ ${n}β`} = ${N(r)}, find the value of k.`.replace("x^2 − 0x", "x^2"),
      `यदि α और β, x^2 ${s < 0 ? "+" : "−"} ${Math.abs(s)}x + k = 0 के मूल हैं और ${m}α ${n === 1 ? "+ β" : `+ ${n}β`} = ${N(r)} है, तो k का मान ज्ञात कीजिए।`.replace("x^2 − 0x", "x^2"),
      k, [-k, a + b, k + s], () => { const A = (r - n * s) / (m - n); const B = s - A; return A * B; },
      `α + β = ${N(s)}. ${m}α + ${n}β = ${n}(α + β) + ${m - n}α → ${N(r)} = ${N(n * s)} + ${m - n}α, so α = ${N(a)}, β = ${N(b)} and k = αβ = ${N(k)}.`,
      `α + β = ${N(s)}। ${m}α + ${n}β = ${n}(α + β) + ${m - n}α → ${N(r)} = ${N(n * s)} + ${m - n}α, अतः α = ${N(a)}, β = ${N(b)} और k = αβ = ${N(k)}।`);
  },
};

// Biquadratic: x^4 − (p^2 + q^2)x^2 + p^2q^2 = 0 - the sum of the positive roots.
const biquad = {
  id: "biquad", levels: ["advanced"],
  cands: () => crossF([range(1, 12), range(1, 12), ["sum", "prod"]], ([p, q]) => p < q),
  build: (t, [p, q, w]) => {
    const e = [1, 0, -(p * p + q * q), 0, p * p * q * q]; const ans = w === "sum" ? p + q : p * q;
    return NQ(t, `What is the ${w === "sum" ? "sum" : "product"} of the positive roots of ${P(e)} = 0?`, `${P(e)} = 0 के धनात्मक मूलों का ${w === "sum" ? "योग" : "गुणनफल"} क्या है?`,
      ans, [w === "sum" ? p * p + q * q : p * p * q * q, w === "sum" ? p * q : p + q, ans + 1], () => { const pos = []; for (let k = 1; k <= 400; k++) { const x = k / 2; if (Math.abs(evalP(e, x)) < 1e-6) pos.push(x); } return w === "sum" ? pos.reduce((a, b) => a + b, 0) : pos.reduce((a, b) => a * b, 1); },
      `Put y = x^2: y^2 − ${p * p + q * q}y + ${p * p * q * q} = 0 → (y − ${p * p})(y − ${q * q}) = 0, so x^2 = ${p * p} or ${q * q}. The positive roots are ${p} and ${q}; their ${w === "sum" ? "sum" : "product"} is ${ans}.`,
      `y = x^2 रखने पर: y^2 − ${p * p + q * q}y + ${p * p * q * q} = 0 → (y − ${p * p})(y − ${q * q}) = 0, अतः x^2 = ${p * p} या ${q * q}। धनात्मक मूल ${p} और ${q} हैं; इनका ${w === "sum" ? "योग" : "गुणनफल"} ${ans} है।`, { positive: true, whole: true });
  },
};

// √(x + a) = x − b: one root is false (it makes the right side negative).
const sqrtEq = {
  id: "sqrtEq", levels: ["advanced"],
  cands: () => crossF([range(1, 20), range(1, 20)], ([r, b]) => r > b).flatMap(([r, b]) => { const a = (r - b) ** 2 - r; const other = (2 * b + 1) - r; return a > 0 && other !== r && other - b < 0 && other + a >= 0 ? [[a, b]] : []; }),
  build: (t, [a, b]) => {
    // squaring: x + a = (x − b)^2 → x^2 − (2b + 1)x + (b^2 − a) = 0
    const e = [1, -(2 * b + 1), b * b - a]; const rs = roots(e); const good = rs.filter((x) => x - b >= 0 && Math.abs(Math.sqrt(x + a) - (x - b)) < 1e-9); const bad = rs.filter((x) => !good.includes(x));
    if (good.length !== 1 || !isInt(good[0])) throw new Error("skip");
    const x = good[0], y = bad[0];
    return NQ(t, `Solve: √(x + ${a}) = x − ${b}`, `हल कीजिए: √(x + ${a}) = x − ${b}`,
      x, [y, x + y, x + 1], () => { const s = []; for (let k = -500; k <= 500; k++) if (k + a >= 0 && k - b >= 0 && Math.abs(Math.sqrt(k + a) - (k - b)) < 1e-9) s.push(k); return s.length === 1 ? s[0] : NaN; },
      `Squaring: x + ${a} = (x − ${b})^2 → ${eqT(e)} → x = ${N(x)} or x = ${N(y)}. For x = ${N(y)} the right side x − ${b} is negative, which a square root can never equal, so x = ${N(x)}.`,
      `वर्ग करने पर: x + ${a} = (x − ${b})^2 → ${eqT(e)} → x = ${N(x)} या x = ${N(y)}। x = ${N(y)} पर दायाँ पक्ष x − ${b} ऋणात्मक है, जो वर्गमूल के बराबर नहीं हो सकता, अतः x = ${N(x)}।`);
  },
};

// 2^(2x) − (p + q)·2^x + pq = 0 with p, q powers of 2: the sum of the solutions.
const expQuad = {
  id: "expQuad", levels: ["advanced"],
  cands: () => cross([2, 3, 5], range(0, 5), range(0, 5)).filter(([b, m, n]) => m < n && b ** n <= 3125),
  build: (t, [b, m, n]) => {
    const p = b ** m, q = b ** n; const ans = m + n;
    return NQ(t, `Find the sum of all values of x that satisfy ${b}^(2x) − ${p + q} × ${b}^x + ${p * q} = 0.`, `${b}^(2x) − ${p + q} × ${b}^x + ${p * q} = 0 को संतुष्ट करने वाले x के सभी मानों का योग ज्ञात कीजिए।`,
      ans, [p + q, m * n, ans + 1], () => { const s = []; for (let x = -5; x <= 10; x++) if (Math.abs(b ** (2 * x) - (p + q) * b ** x + p * q) < 1e-9) s.push(x); return s.reduce((x, y) => x + y, 0); },
      `Put y = ${b}^x: y^2 − ${p + q}y + ${p * q} = 0 → (y − ${p})(y − ${q}) = 0, so ${b}^x = ${p} or ${q}, i.e. x = ${m} or x = ${n}. Their sum is ${ans}.`,
      `y = ${b}^x रखने पर: y^2 − ${p + q}y + ${p * q} = 0 → (y − ${p})(y − ${q}) = 0, अतः ${b}^x = ${p} या ${q}, अर्थात x = ${m} या x = ${n}। इनका योग ${ans} है।`, { whole: true });
  },
};

const KINDS = guard([rootsMonic, sumProd, findK, disc, formEq, consecProd, numSquare, rootOf, nature, equalK, symRoot, recipSum, diffRoots, rectArea, cubeRoots, ratioSum, newEq, rootTimes, rootGap, recipWord, minVal, fourthRoots, condK, biquad, sqrtEq, expQuad]);
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
