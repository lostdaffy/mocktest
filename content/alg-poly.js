// Algebra · Polynomials and Factorisation: every kind of question, level by
// level. Every polynomial is built from its factors or its value, and v()
// checks the printed one: a remainder by evaluating, a factorisation option by
// multiplying its factors back out and comparing with the polynomial asked.
const L = require("./alg-lib");
const { N, F, NQ, FQ, XQ, P, lin, cross, crossF, range, isInt, clean, gcd, pick, thin, evalP, mulP, addP, sameP, guard } = L;
const { fillTopic } = require("./gen");

const PREFIX = "Algebra · Polynomials and Factorisation";
const pn = (x) => (x < 0 ? `(${N(x)})` : N(x));
const nz = (x) => x !== 0;
const prod = (fs) => fs.reduce((a, b) => mulP(a, b), [1]);
// An option made of factors: its text and the polynomial it multiplies to.
const factT = (fs, v = "x") => fs.map((f) => (f.length === 1 ? N(f[0]) : f.length === 2 && f[1] === 0 ? (f[0] === 1 ? v : `${N(f[0])}${v}`) : `(${P(f, v)})`)).join("");
const factorOpts = (target, right, wrongs) => {
  const all = [right, ...wrongs];
  const o = all.map((fs) => factT(fs));
  return { o, judge: (i) => sameP(prod(all[i]), target) };
};

// ---------------------------------------------------------------- EASY
// A cubic / quadratic with small coefficients.
const polys = (deg) => crossF(deg === 3 ? [[1, 2], range(-5, 5), range(-9, 9), range(-12, 12)] : [[1, 2, 3], range(-9, 9), range(-15, 15)], (c) => c.slice(1).filter(nz).length >= (deg === 3 ? 2 : 2));

const remThm = {
  id: "remThm", levels: ["easy", "medium"],
  cands: () => crossF([polys(3).filter((c, i) => i % 7 === 0), range(-4, 4)], ([c, a]) => nz(a)).map(([c, a]) => [...c, a]),
  build: (t, prm) => {
    const c = prm.slice(0, 4), a = prm[4]; const r = evalP(c, a);
    return NQ(t, `What is the remainder when ${P(c)} is divided by (x ${a > 0 ? "−" : "+"} ${Math.abs(a)})?`, `${P(c)} को (x ${a > 0 ? "−" : "+"} ${Math.abs(a)}) से भाग देने पर शेषफल क्या होगा?`,
      r, [evalP(c, -a), r + 2 * a, c[c.length - 1]], () => { let q = 0; for (const k of c) q = q * a + k; return q; },
      `By the remainder theorem the remainder is p(${N(a)}) = ${c.map((k, i) => { const p = c.length - 1 - i; return k ? (p && k === 1 ? `${pn(a)}${p > 1 ? `^${p}` : ""}` : `${pn(k)}${p ? ` × ${pn(a)}${p > 1 ? `^${p}` : ""}` : ""}`) : null; }).filter(Boolean).join(" + ")} = ${N(r)}.`,
      `शेषफल प्रमेय से शेषफल = p(${N(a)}) = ${c.map((k, i) => { const p = c.length - 1 - i; return k ? (p && k === 1 ? `${pn(a)}${p > 1 ? `^${p}` : ""}` : `${pn(k)}${p ? ` × ${pn(a)}${p > 1 ? `^${p}` : ""}` : ""}`) : null; }).filter(Boolean).join(" + ")} = ${N(r)}।`);
  },
};

const valueP = {
  id: "valueP", levels: ["easy"],
  cands: () => crossF([polys(2), range(-5, 5)], ([c, a]) => nz(a) && L.hashOf([...c, a]) % 2 === 0).map(([c, a]) => [...c, a]),
  build: (t, prm) => {
    const c = prm.slice(0, 3), a = prm[3]; const r = evalP(c, a);
    return NQ(t, `If p(x) = ${P(c)}, find the value of p(${N(a)}).`, `यदि p(x) = ${P(c)} है, तो p(${N(a)}) का मान ज्ञात कीजिए।`,
      r, [evalP(c, -a), r + c[0] * 2, c[0] * a * a + c[1] * a], () => c[0] * a * a + c[1] * a + c[2],
      `p(${N(a)}) = ${c[0]} × ${pn(a)}^2 + ${pn(c[1])} × ${pn(a)} + ${pn(c[2])} = ${N(c[0] * a * a)} + ${pn(c[1] * a)} + ${pn(c[2])} = ${N(r)}.`,
      `p(${N(a)}) = ${c[0]} × ${pn(a)}^2 + ${pn(c[1])} × ${pn(a)} + ${pn(c[2])} = ${N(c[0] * a * a)} + ${pn(c[1] * a)} + ${pn(c[2])} = ${N(r)}।`);
  },
};

// Degree of a polynomial written out of order.
const degree = {
  id: "degree", levels: ["easy"],
  cands: () => crossF([range(2, 9), range(2, 9), range(1, 9), range(1, 9), range(1, 15)], ([d1, d2, a, b, c]) => d1 !== d2 && a !== b),
  build: (t, [d1, d2, a, b, c]) => {
    const deg = Math.max(d1, d2); const text = `${a}x^${d1} − ${b}x^${d2} + ${c}x − ${c + 2}`;
    return NQ(t, `What is the degree of the polynomial ${text}?`, `बहुपद ${text} की घात क्या है?`,
      deg, [Math.min(d1, d2), d1 + d2, Math.max(a, b)], () => Math.max(d1, d2, 1),
      `The degree is the highest power of x with a non-zero coefficient. The powers are ${d1}, ${d2}, 1 and 0, so the degree is ${deg}.`,
      `घात x की वह सबसे बड़ी घात है जिसका गुणांक शून्य न हो। घातें ${d1}, ${d2}, 1 और 0 हैं, अतः घात ${deg} है।`, { positive: true, whole: true });
  },
};

const zeroLin = {
  id: "zeroLin", levels: ["easy"],
  cands: () => crossF([range(2, 12), range(-30, 30)], ([a, b]) => nz(b) && gcd(a, Math.abs(b)) === 1 || (nz(b) && b % a === 0)),
  build: (t, [a, b]) => {
    return FQ(t, `What is the zero of the polynomial ${P([a, b])}?`, `बहुपद ${P([a, b])} का शून्यक क्या है?`,
      [-b, a], [[b, a], [a, b], [-a, b]], () => -b / a,
      `${P([a, b])} = 0 → ${a}x = ${N(-b)} → x = ${F(-b, a)}.`, `${P([a, b])} = 0 → ${a}x = ${N(-b)} → x = ${F(-b, a)}।`);
  },
};

const factorMonic = {
  id: "factorMonic", levels: ["easy", "medium"],
  cands: () => crossF([range(-12, 15), range(-12, 15)], ([p, q]) => p > q && nz(p) && nz(q) && p !== -q),
  build: (t, [p, q]) => {
    const target = mulP([1, -p], [1, -q]);
    const { o, judge } = factorOpts(target, [[1, -p], [1, -q]], [[[1, p], [1, q]], [[1, -p], [1, q]], [[1, p], [1, -q]]]);
    return XQ(t, `Factorise: ${P(target)}`, `गुणनखंड कीजिए: ${P(target)}`, o, null, judge,
      `Find two numbers whose product is ${N(p * q)} and sum is ${N(-target[1])}: ${N(-p)} and ${N(-q)}. So ${P(target)} = ${o[0]}.`,
      `ऐसी दो संख्याएँ जिनका गुणनफल ${N(p * q)} और योग ${N(-target[1])} हो: ${N(-p)} और ${N(-q)}। अतः ${P(target)} = ${o[0]}।`);
  },
};

const commonFac = {
  id: "commonFac", levels: ["easy"],
  cands: () => crossF([range(2, 9), range(1, 9), range(-12, 12)], ([g, a, b]) => nz(b) && gcd(a, Math.abs(b)) === 1 && a > 1),
  build: (t, [g, a, b]) => {
    const target = [g * a, g * b, 0];
    const right = [[g, 0], [a, b]];
    const wrongs = [[[g, 0], [a, -b]], [[g, 0], [b > 0 ? b : -b, a]], [[g], [a, b]]];
    const { o, judge } = factorOpts(target, right, wrongs);
    return XQ(t, `Factorise: ${P(target)}`, `गुणनखंड कीजिए: ${P(target)}`, o, null, judge,
      `The common factor of ${g * a}x^2 and ${N(g * b)}x is ${g}x. So ${P(target)} = ${o[0]}.`, `${g * a}x^2 और ${N(g * b)}x का उभयनिष्ठ गुणनखंड ${g}x है। अतः ${P(target)} = ${o[0]}।`);
  },
};

const diffSqFac = {
  id: "diffSqFac", levels: ["easy", "medium"],
  cands: () => crossF([range(1, 12), range(1, 15)], ([a, b]) => gcd(a, b) === 1 && (a > 1 || b > 1)),
  build: (t, [a, b]) => {
    const target = [a * a, 0, -b * b];
    const { o, judge } = factorOpts(target, [[a, -b], [a, b]], [[[a, -b], [a, -b]], [[a, b], [a, b]], [[a * a, -b], [1, b]]]);
    return XQ(t, `Factorise: ${P(target)}`, `गुणनखंड कीजिए: ${P(target)}`, o, null, judge,
      `${P(target)} = (${a === 1 ? "" : a}x)^2 − ${b}^2 = ${o[0]}, using a^2 − b^2 = (a − b)(a + b).`, `${P(target)} = (${a === 1 ? "" : a}x)^2 − ${b}^2 = ${o[0]}, क्योंकि a^2 − b^2 = (a − b)(a + b)।`);
  },
};

// Coefficient of x / constant term of a product of two linear factors.
const coefLin = {
  id: "coefLin", levels: ["easy", "medium"],
  cands: () => crossF([range(1, 7), range(-12, 12), range(1, 7), range(-12, 12), ["x", "c"]], ([a, b, c, d]) => nz(b) && nz(d) && (a > 1 || c > 1)),
  build: (t, [a, b, c, d, w]) => {
    const e = mulP([a, b], [c, d]); const ans = w === "x" ? e[1] : e[2];
    return NQ(t, w === "x" ? `What is the coefficient of x in ${lin(a, b)}${lin(c, d)}?` : `What is the constant term of ${lin(a, b)}${lin(c, d)}?`,
      w === "x" ? `${lin(a, b)}${lin(c, d)} में x का गुणांक क्या है?` : `${lin(a, b)}${lin(c, d)} का अचर पद क्या है?`,
      ans, w === "x" ? [b + d, a * c, a * b + c * d] : [b + d, -ans, a * c], () => evalP(mulP([a, b], [c, d]), w === "x" ? 1 : 0) - (w === "x" ? e[0] + e[2] : 0),
      `${lin(a, b)}${lin(c, d)} = ${P(e)}, so the ${w === "x" ? "coefficient of x" : "constant term"} is ${N(ans)}.`,
      `${lin(a, b)}${lin(c, d)} = ${P(e)}, अतः ${w === "x" ? "x का गुणांक" : "अचर पद"} ${N(ans)} है।`);
  },
};

// Which of these is a factor of x^2 + bx + c?
const factorCheck = {
  id: "factorCheck", levels: ["easy", "medium"],
  cands: () => crossF([range(-12, 12), range(-12, 12)], ([p, q]) => p > q && nz(p) && nz(q) && p !== -q && Math.abs(p) !== Math.abs(q)),
  build: (t, [p, q]) => {
    const e = mulP([1, -p], [1, -q]); const cand = [-p, q + p, -q + 1];
    const facs = [p, ...cand.filter((r) => r !== p && r !== q && nz(r) && evalP(e, r) !== 0)].slice(0, 4);
    while (facs.length < 4) facs.push(facs[facs.length - 1] + 7);
    const o = facs.map((r) => `(x ${r > 0 ? "−" : "+"} ${Math.abs(r)})`);
    return XQ(t, `Which of the following is a factor of ${P(e)}?`, `निम्नलिखित में से कौन ${P(e)} का एक गुणनखंड है?`, o, null,
      (i) => evalP(e, facs[i]) === 0,
      `(x − a) is a factor when p(a) = 0. p(${N(p)}) = ${N(p * p)} ${e[1] < 0 ? "−" : "+"} ${Math.abs(e[1] * p)} ${e[2] < 0 ? "−" : "+"} ${Math.abs(e[2])} = 0, so ${o[0]} is a factor (${P(e)} = ${lin(1, -p)}${lin(1, -q)}).`,
      `(x − a) गुणनखंड तब होता है जब p(a) = 0 हो। p(${N(p)}) = ${N(p * p)} ${e[1] < 0 ? "−" : "+"} ${Math.abs(e[1] * p)} ${e[2] < 0 ? "−" : "+"} ${Math.abs(e[2])} = 0, अतः ${o[0]} एक गुणनखंड है (${P(e)} = ${lin(1, -p)}${lin(1, -q)})।`);
  },
};

// Grouping: x^2 + (a + b)… written as x^2 + ax + bx + ab with y: x^2 + xy + 2x + 2y.
const groupFac = {
  id: "groupFac", levels: ["easy", "medium"],
  cands: () => crossF([range(1, 9), range(1, 9), ["xy"]], ([a, b]) => a !== b),
  build: (t, [a, b]) => {
    // (x + a·y)(x + b) = x^2 + a·xy + b·x + ab·y
    const text = `x^2 + ${a === 1 ? "" : a}xy + ${b}x + ${a * b}y`;
    const f = (x, y) => x * x + a * x * y + b * x + a * b * y;
    const opts = [[a, b], [b, a], [a, -b], [-a, b]];
    const o = opts.map(([p, q]) => `(x + ${p < 0 ? `(${N(p)})` : p === 1 ? "" : p}y)(x ${q < 0 ? "−" : "+"} ${Math.abs(q)})`.replace("(x + (−", "(x − (").replace(/\(x − \((\d+)\)y\)/, "(x − $1y)"));
    const fo = opts.map(([p, q]) => (x, y) => (x + p * y) * (x + q));
    return XQ(t, `Factorise: ${text}`, `गुणनखंड कीजिए: ${text}`, o, null,
      (i) => [[1, 2], [3, -1], [-2, 5], [4, 7]].every(([x, y]) => fo[i](x, y) === f(x, y)),
      `Group the terms: x(x + ${a === 1 ? "" : a}y) + ${b}(x + ${a === 1 ? "" : a}y) = (x + ${a === 1 ? "" : a}y)(x + ${b}).`,
      `पदों को समूहित करने पर: x(x + ${a === 1 ? "" : a}y) + ${b}(x + ${a === 1 ? "" : a}y) = (x + ${a === 1 ? "" : a}y)(x + ${b})।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
// (x − a) is a factor of x^3 + kx^2 + bx + c: find k.
const kFactor = {
  id: "kFactor", levels: ["medium", "hard"],
  cands: () => crossF([range(-4, 4), range(-9, 9), range(-20, 20), range(-6, 6)], ([a, b, c, k]) => nz(a) && nz(b) && nz(c) && nz(k) && a ** 3 + k * a * a + b * a + c === 0),
  build: (t, [a, b, c, k]) => {
    const text = `x^3 + kx^2 ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}`;
    return NQ(t, `If (x ${a > 0 ? "−" : "+"} ${Math.abs(a)}) is a factor of ${text}, find the value of k.`, `यदि (x ${a > 0 ? "−" : "+"} ${Math.abs(a)}), ${text} का एक गुणनखंड है, तो k का मान ज्ञात कीजिए।`,
      k, [-k, k + 1, k * 2], () => { for (let K = -100; K <= 100; K++) if (a ** 3 + K * a * a + b * a + c === 0) return K; return NaN; },
      `p(${N(a)}) = 0: ${pn(a)}^3 + k × ${pn(a)}^2 + ${pn(b)} × ${pn(a)} + ${pn(c)} = 0 → ${N(a ** 3)} + ${a * a === 1 ? "" : a * a}k + ${pn(b * a)} + ${pn(c)} = 0 → ${a * a === 1 ? "" : a * a}k = ${N(-(a ** 3) - b * a - c)}, so k = ${N(k)}.`,
      `p(${N(a)}) = 0: ${pn(a)}^3 + k × ${pn(a)}^2 + ${pn(b)} × ${pn(a)} + ${pn(c)} = 0 → ${N(a ** 3)} + ${a * a === 1 ? "" : a * a}k + ${pn(b * a)} + ${pn(c)} = 0 → ${a * a === 1 ? "" : a * a}k = ${N(-(a ** 3) - b * a - c)}, अतः k = ${N(k)}।`);
  },
};

const factorNonMonic = {
  id: "factorNonMonic", levels: ["medium", "hard"],
  cands: () => crossF([range(2, 6), range(-9, 9), range(1, 5), range(-9, 9)], ([a, b, c, d]) => nz(b) && nz(d) && gcd(a, Math.abs(b)) === 1 && gcd(c, Math.abs(d)) === 1 && b * c !== a * d && a * d + b * c !== 0 && (c > 1 || a > 1) && a >= c),
  build: (t, [a, b, c, d]) => {
    const target = mulP([a, b], [c, d]);
    const { o, judge } = factorOpts(target, [[a, b], [c, d]], [[[a, -b], [c, -d]], [[a, b], [c, -d]], [[a, -b], [c, d]]]);
    if (new Set(o).size !== 4) throw new Error("collide");
    return XQ(t, `Factorise: ${P(target)}`, `गुणनखंड कीजिए: ${P(target)}`, o, null, judge,
      `Split the middle term: ${N(target[0] * target[2])} = ${N(a * d)} × ${N(b * c)} and ${N(a * d)} + ${pn(b * c)} = ${N(target[1])}. ${P(target)} = ${o[0]}.`,
      `मध्य पद को विभाजित करने पर: ${N(target[0] * target[2])} = ${N(a * d)} × ${N(b * c)} और ${N(a * d)} + ${pn(b * c)} = ${N(target[1])}। ${P(target)} = ${o[0]}।`);
  },
};

// Sum / product of the zeros of a cubic.
const zerosCubic = {
  id: "zerosCubic", levels: ["medium", "hard", "advanced"],
  cands: () => crossF([range(1, 6), range(-12, 12), range(-12, 12), range(-12, 12), ["sum", "prod", "pairs"]], ([a, b, c, d]) => nz(b) && nz(c) && nz(d) && gcd(gcd(a, Math.abs(b)), gcd(Math.abs(c), Math.abs(d))) === 1 && L.hashOf([a, b, c, d]) % 3 === 0),
  build: (t, [a, b, c, d, w]) => {
    const e = [a, b, c, d]; const nm = { sum: ["sum of the zeros", "शून्यकों का योग", [-b, a], "−b/a"], prod: ["product of the zeros", "शून्यकों का गुणनफल", [-d, a], "−d/a"], pairs: ["sum of the products of the zeros taken two at a time", "दो-दो लेकर शून्यकों के गुणनफलों का योग", [c, a], "c/a"] }[w];
    return FQ(t, `What is the ${nm[0]} of the polynomial ${P(e)}?`, `बहुपद ${P(e)} के ${nm[1]} क्या है?`,
      nm[2], w === "sum" ? [[b, a], [-c, a], [d, a]] : w === "prod" ? [[d, a], [c, a], [-b, a]] : [[-c, a], [-b, a], [d, a]],
      () => { const [A, B, C, D] = e; return w === "sum" ? -B / A : w === "prod" ? -D / A : C / A; },
      `For ax^3 + bx^2 + cx + d the ${nm[0]} is ${nm[3]} = ${F(nm[2][0], nm[2][1])}.`, `ax^3 + bx^2 + cx + d के ${nm[1]} ${nm[3]} = ${F(nm[2][0], nm[2][1])} होता है।`);
  },
};

// The quotient of p(x) ÷ (x − a).
const quotient = {
  id: "quotient", levels: ["medium", "hard", "advanced"],
  cands: () => crossF([range(-6, 6), range(-6, 6), range(-9, 9), range(-6, 6)], ([a, q1, q2, r]) => nz(a) && nz(q1) && nz(q2) && L.hashOf([a, q1, q2, r]) % 2 === 0),
  build: (t, [a, q1, q2, r]) => {
    const q = [1, q1, q2]; const p = addP(mulP(q, [1, -a]), [r]);
    const wrongs = [[1, q1 + 1, q2], [1, -q1, q2], [1, q1, q2 + a]];
    const o = [q, ...wrongs].map((c) => P(c));
    if (new Set(o).size !== 4) throw new Error("collide");
    return XQ(t, `What is the quotient when ${P(p)} is divided by (x ${a > 0 ? "−" : "+"} ${Math.abs(a)})?`, `${P(p)} को (x ${a > 0 ? "−" : "+"} ${Math.abs(a)}) से भाग देने पर भागफल क्या होगा?`, o, null,
      (i) => { const cs = [q, ...wrongs][i]; const back = addP(mulP(cs, [1, -a]), [evalP(p, a)]); return sameP(back, p); },
      `Synthetic division by ${N(a)}: the coefficients 1, ${N(p[1])}, ${N(p[2])}, ${N(p[3])} give 1, ${N(q1)}, ${N(q2)} with remainder ${N(r)}. So the quotient is ${P(q)}.`,
      `${N(a)} से संश्लेषित भाग: गुणांक 1, ${N(p[1])}, ${N(p[2])}, ${N(p[3])} से 1, ${N(q1)}, ${N(q2)} और शेषफल ${N(r)} मिलता है। अतः भागफल ${P(q)} है।`);
  },
};

// Remainder on dividing by (2x − 1) / (3x + 2): p(1/2), a fraction.
const remHalf = {
  id: "remHalf", levels: ["medium", "hard", "advanced"],
  cands: () => crossF([[2, 3], [1, -1, 2, -2], range(1, 6), range(-6, 6), range(-9, 9), range(-12, 12)], ([m, n, A, B, C, D]) => gcd(m, Math.abs(n)) === 1 && nz(B) && nz(C) && nz(D) && L.hashOf([m, n, A, B, C, D]) % 11 === 0),
  build: (t, [m, n, A, B, C, D]) => {
    // divisor m·x − n, root n/m
    const e = [A, B, C, D]; const num = A * n ** 3 + B * n * n * m + C * n * m * m + D * m ** 3; const den = m ** 3;
    return FQ(t, `What is the remainder when ${P(e)} is divided by (${P([m, -n])})?`, `${P(e)} को (${P([m, -n])}) से भाग देने पर शेषफल क्या होगा?`,
      [num, den], [[-num, den], [A * n + B + C + D, 1], [num, m]], () => evalP(e, n / m),
      `(${P([m, -n])}) = 0 gives x = ${F(n, m)}. Remainder = p(${F(n, m)}) = ${F(num, den)}.`, `(${P([m, -n])}) = 0 से x = ${F(n, m)}। शेषफल = p(${F(n, m)}) = ${F(num, den)}।`);
  },
};

const cubeFac = {
  id: "cubeFac", levels: ["medium", "hard"],
  cands: () => crossF([range(1, 5), range(1, 9), [1, -1]], ([a, b]) => gcd(a, b) === 1 && (a > 1 || b > 1)),
  build: (t, [a, b, s]) => {
    // a^3x^3 ± b^3 = (ax ± b)(a^2x^2 ∓ abx + b^2)
    const target = [a ** 3, 0, 0, s * b ** 3];
    const right = [[a, s * b], [a * a, -s * a * b, b * b]];
    const wrongs = [[[a, s * b], [a * a, s * a * b, b * b]], [[a, -s * b], [a * a, s * a * b, b * b]], [[a, s * b], [a * a, -s * 2 * a * b, b * b]]];
    const { o, judge } = factorOpts(target, right, wrongs);
    return XQ(t, `Factorise: ${P(target)}`, `गुणनखंड कीजिए: ${P(target)}`, o, null, judge,
      `${P(target)} = (${a === 1 ? "" : a}x)^3 ${s > 0 ? "+" : "−"} ${b}^3 and a^3 ${s > 0 ? "+" : "−"} b^3 = (a ${s > 0 ? "+" : "−"} b)(a^2 ${s > 0 ? "−" : "+"} ab + b^2), so it equals ${o[0]}.`,
      `${P(target)} = (${a === 1 ? "" : a}x)^3 ${s > 0 ? "+" : "−"} ${b}^3 और a^3 ${s > 0 ? "+" : "−"} b^3 = (a ${s > 0 ? "+" : "−"} b)(a^2 ${s > 0 ? "−" : "+"} ab + b^2), अतः यह ${o[0]} के बराबर है।`);
  },
};

// The remainder of x^3 + kx^2 + bx + c on (x − a) is R: find k.
const kFromRem = {
  id: "kFromRem", levels: ["medium", "hard"],
  cands: () => crossF([range(-3, 3), range(-9, 9), range(-15, 15), range(-6, 6)], ([a, b, c, k]) => nz(a) && Math.abs(a) > 1 && nz(b) && nz(c) && nz(k)),
  build: (t, [a, b, c, k]) => {
    const R = a ** 3 + k * a * a + b * a + c;
    const text = `x^3 + kx^2 ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}x ${c < 0 ? "−" : "+"} ${Math.abs(c)}`;
    return NQ(t, `When ${text} is divided by (x ${a > 0 ? "−" : "+"} ${Math.abs(a)}), the remainder is ${N(R)}. Find k.`, `${text} को (x ${a > 0 ? "−" : "+"} ${Math.abs(a)}) से भाग देने पर शेषफल ${N(R)} आता है। k ज्ञात कीजिए।`,
      k, [-k, k + 1, (R - c) / (a * a)].map((x) => (isInt(x) ? x : k + 3)), () => { for (let K = -100; K <= 100; K++) if (a ** 3 + K * a * a + b * a + c === R) return K; return NaN; },
      `p(${N(a)}) = ${N(R)}: ${N(a ** 3)} + ${a * a === 1 ? "" : a * a}k + ${pn(b * a)} + ${pn(c)} = ${N(R)} → ${a * a === 1 ? "" : a * a}k = ${N(R - a ** 3 - b * a - c)}, so k = ${N(k)}.`,
      `p(${N(a)}) = ${N(R)}: ${N(a ** 3)} + ${a * a === 1 ? "" : a * a}k + ${pn(b * a)} + ${pn(c)} = ${N(R)} → ${a * a === 1 ? "" : a * a}k = ${N(R - a ** 3 - b * a - c)}, अतः k = ${N(k)}।`);
  },
};

// ---------------------------------------------------------------- HARD
// x^3 + ax^2 + bx + c has the factors (x − p) and (x − q): find a (or a + b, or b).
const twoFactors = {
  id: "twoFactors", levels: ["hard", "advanced"],
  cands: () => crossF([range(-4, 4), range(-4, 4), range(-6, 6), ["a", "b", "ab"]], ([p, q, r]) => p > q && nz(p) && nz(q) && nz(r) && r !== p && r !== q),
  build: (t, [p, q, r, w]) => {
    const e = prod([[1, -p], [1, -q], [1, -r]]); const [, a, b, c] = e; const ans = w === "a" ? a : w === "b" ? b : a + b;
    if (!a || !b) throw new Error("skip");
    return NQ(t, `If (x ${p > 0 ? "−" : "+"} ${Math.abs(p)}) and (x ${q > 0 ? "−" : "+"} ${Math.abs(q)}) are factors of x^3 + ax^2 + bx ${c < 0 ? "−" : "+"} ${Math.abs(c)}, find the value of ${w === "ab" ? "a + b" : w}.`,
      `यदि (x ${p > 0 ? "−" : "+"} ${Math.abs(p)}) और (x ${q > 0 ? "−" : "+"} ${Math.abs(q)}), x^3 + ax^2 + bx ${c < 0 ? "−" : "+"} ${Math.abs(c)} के गुणनखंड हैं, तो ${w === "ab" ? "a + b" : w} का मान ज्ञात कीजिए।`,
      ans, w === "ab" ? [a - b, -ans, ans + 1] : [w === "a" ? b : a, -ans, ans + 1], () => {
        // p(p) = 0 and p(q) = 0: p^2·a + p·b = −p^3 − c, q^2·a + q·b = −q^3 − c
        const D = p * p * q - q * q * p; const A = ((-(p ** 3) - c) * q - (-(q ** 3) - c) * p) / D; const B = (p * p * (-(q ** 3) - c) - q * q * (-(p ** 3) - c)) / D; return w === "a" ? A : w === "b" ? B : A + B; },
      `p(${N(p)}) = 0 and p(${N(q)}) = 0 give two equations in a and b: ${p * p}a + ${pn(p)}b = ${N(-(p ** 3) - c)} and ${q * q}a + ${pn(q)}b = ${N(-(q ** 3) - c)}. Solving, a = ${N(a)} and b = ${N(b)}, so ${w === "ab" ? "a + b" : w} = ${N(ans)}.`,
      `p(${N(p)}) = 0 और p(${N(q)}) = 0 से a और b में दो समीकरण: ${p * p}a + ${pn(p)}b = ${N(-(p ** 3) - c)} और ${q * q}a + ${pn(q)}b = ${N(-(q ** 3) - c)}। हल करने पर a = ${N(a)} और b = ${N(b)}, अतः ${w === "ab" ? "a + b" : w} = ${N(ans)}।`);
  },
};

const factorCubic = {
  id: "factorCubic", levels: ["hard", "advanced"],
  cands: () => crossF([range(-5, 6), range(-5, 6), range(-5, 6)], ([p, q, r]) => p > q && q > r && nz(p) && nz(q) && nz(r) && p !== -q && q !== -r && p !== -r),
  build: (t, [p, q, r]) => {
    const target = prod([[1, -p], [1, -q], [1, -r]]);
    const right = [[1, -p], [1, -q], [1, -r]];
    const wrongs = [[[1, p], [1, q], [1, r]], [[1, -p], [1, q], [1, -r]], [[1, p], [1, -q], [1, r]]];
    const { o, judge } = factorOpts(target, right, wrongs);
    if (new Set(o).size !== 4) throw new Error("collide");
    return XQ(t, `Factorise: ${P(target)}`, `गुणनखंड कीजिए: ${P(target)}`, o, null, judge,
      `p(${N(p)}) = 0, so (x ${p > 0 ? "−" : "+"} ${Math.abs(p)}) is a factor; dividing leaves ${P(mulP([1, -q], [1, -r]))} = ${lin(1, -q)}${lin(1, -r)}. So ${P(target)} = ${o[0]}.`,
      `p(${N(p)}) = 0, अतः (x ${p > 0 ? "−" : "+"} ${Math.abs(p)}) एक गुणनखंड है; भाग देने पर ${P(mulP([1, -q], [1, -r]))} = ${lin(1, -q)}${lin(1, -r)} बचता है। अतः ${P(target)} = ${o[0]}।`);
  },
};

// x^n + c divided by (x + 1) or (x − 1).
const bigPow = {
  id: "bigPow", levels: ["hard", "advanced"],
  cands: () => crossF([range(11, 99), range(1, 99), [1, -1]], ([n, c]) => n !== c && L.hashOf([n, c]) % 3 === 0),
  build: (t, [n, c, s]) => {
    const val = (s > 0 ? -1 : 1); // divisor x + 1 → x = −1; x − 1 → x = 1
    const ans = (val === -1 ? (n % 2 ? -1 : 1) : 1) + c;
    return NQ(t, `What is the remainder when x^${n} + ${c} is divided by (x ${s > 0 ? "+" : "−"} 1)?`, `x^${n} + ${c} को (x ${s > 0 ? "+" : "−"} 1) से भाग देने पर शेषफल क्या होगा?`,
      ans, [c + (ans - c === 1 ? -1 : 1), c, n + c], () => { let r = 1; for (let i = 0; i < n; i++) r *= val; return r + c; },
      `Remainder = p(${N(val)}) = (${N(val)})^${n} + ${c} = ${N(val === -1 ? (n % 2 ? -1 : 1) : 1)} + ${c} = ${N(ans)}${val === -1 ? ` (${n} is ${n % 2 ? "odd" : "even"})` : ""}.`,
      `शेषफल = p(${N(val)}) = (${N(val)})^${n} + ${c} = ${N(val === -1 ? (n % 2 ? -1 : 1) : 1)} + ${c} = ${N(ans)}${val === -1 ? ` (${n} ${n % 2 ? "विषम" : "सम"} है)` : ""}।`);
  },
};

// Two polynomials leave the same remainder on (x − r): find a.
const sameRem = {
  id: "sameRem", levels: ["hard", "advanced"],
  cands: () => crossF([range(-3, 3), range(-9, 9), range(-9, 9), range(-9, 9)], ([r, b, c, d]) => nz(r) && Math.abs(r) > 1 && nz(b) && nz(c) && nz(d)),
  build: (t, [r, b, c, d]) => {
    // ax^3 + bx^2 + c  and  2x^3 + ... with a: a·r^3 + b·r^2 + c = r^3 + d·r + a → a(r^3 − 1) = r^3 + d·r − b·r^2 − c
    const num = r ** 3 + d * r - b * r * r - c, den = r ** 3 - 1;
    if (num % den !== 0) throw new Error("skip");
    const a = num / den;
    const p1 = `ax^3 ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}x^2 ${c < 0 ? "−" : "+"} ${Math.abs(c)}`, p2 = `x^3 ${d < 0 ? "−" : "+"} ${Math.abs(d) === 1 ? "" : Math.abs(d)}x + a`;
    return NQ(t, `The polynomials ${p1} and ${p2} leave the same remainder when divided by (x ${r > 0 ? "−" : "+"} ${Math.abs(r)}). Find a.`, `बहुपद ${p1} और ${p2} को (x ${r > 0 ? "−" : "+"} ${Math.abs(r)}) से भाग देने पर समान शेषफल बचता है। a ज्ञात कीजिए।`,
      a, [-a, a + 1, num], () => { for (let A = -200; A <= 200; A++) if (A * r ** 3 + b * r * r + c === r ** 3 + d * r + A) return A; return NaN; },
      `Equal remainders: ${N(r ** 3)}a + ${pn(b * r * r)} + ${pn(c)} = ${N(r ** 3)} + ${pn(d * r)} + a → ${N(den)}a = ${N(num)}, so a = ${N(a)}.`,
      `समान शेषफल: ${N(r ** 3)}a + ${pn(b * r * r)} + ${pn(c)} = ${N(r ** 3)} + ${pn(d * r)} + a → ${N(den)}a = ${N(num)}, अतः a = ${N(a)}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
// Remainder on dividing by (x − a)(x − b), given p(a) and p(b): a linear remainder.
const remQuad = {
  id: "remQuad", levels: ["advanced"],
  cands: () => crossF([range(-4, 5), range(-4, 5), range(-6, 6), range(-15, 15)], ([a, b, m, n]) => a > b && nz(m) && nz(n) && isInt(m) && (a - b) !== 0),
  build: (t, [a, b, m, n]) => {
    const pa = m * a + n, pb = m * b + n;
    const o = [P([m, n]), P([n, m]), P([m, -n]), P([-m, n])];
    if (new Set(o).size !== 4) throw new Error("collide");
    const coefs = [[m, n], [n, m], [m, -n], [-m, n]];
    return XQ(t, `When a polynomial p(x) is divided by (x ${a > 0 ? "−" : "+"} ${Math.abs(a)}) it leaves ${N(pa)}, and when divided by (x ${b > 0 ? "−" : "+"} ${Math.abs(b)}) it leaves ${N(pb)}. What is the remainder when p(x) is divided by (x ${a > 0 ? "−" : "+"} ${Math.abs(a)})(x ${b > 0 ? "−" : "+"} ${Math.abs(b)})?`.replace("(x − 0)", "x").replace("(x + 0)", "x"),
      `एक बहुपद p(x) को (x ${a > 0 ? "−" : "+"} ${Math.abs(a)}) से भाग देने पर ${N(pa)} और (x ${b > 0 ? "−" : "+"} ${Math.abs(b)}) से भाग देने पर ${N(pb)} शेष बचता है। p(x) को (x ${a > 0 ? "−" : "+"} ${Math.abs(a)})(x ${b > 0 ? "−" : "+"} ${Math.abs(b)}) से भाग देने पर शेषफल क्या होगा?`.replace("(x − 0)", "x").replace("(x + 0)", "x"),
      o, null, (i) => { const [M, Nn] = coefs[i]; return M * a + Nn === pa && M * b + Nn === pb; },
      `The remainder is linear, say mx + n. m(${N(a)}) + n = ${N(pa)} and m(${N(b)}) + n = ${N(pb)}. Subtracting, ${N(a - b)}m = ${N(pa - pb)}, so m = ${N(m)} and n = ${N(n)}. Remainder = ${o[0]}.`,
      `शेषफल रैखिक होगा, माना mx + n। m(${N(a)}) + n = ${N(pa)} और m(${N(b)}) + n = ${N(pb)}। घटाने पर ${N(a - b)}m = ${N(pa - pb)}, अतः m = ${N(m)} और n = ${N(n)}। शेषफल = ${o[0]}।`);
  },
};

// x^4 + 4k^4 = (x^2 + 2kx + 2k^2)(x^2 − 2kx + 2k^2).
const sophie = {
  id: "sophie", levels: ["advanced"],
  cands: () => range(1, 6).map((k) => [k]),
  build: (t, [k]) => {
    const target = [1, 0, 0, 0, 4 * k ** 4];
    const right = [[1, 2 * k, 2 * k * k], [1, -2 * k, 2 * k * k]];
    const wrongs = [[[1, 2 * k, 2 * k * k], [1, 2 * k, 2 * k * k]], [[1, 0, 2 * k * k], [1, 0, 2 * k * k]], [[1, 2 * k, -2 * k * k], [1, -2 * k, -2 * k * k]]];
    const { o, judge } = factorOpts(target, right, wrongs);
    return XQ(t, `Factorise: ${P(target)}`, `गुणनखंड कीजिए: ${P(target)}`, o, null, judge,
      `Add and subtract ${4 * k * k}x^2: ${P(target)} = (x^2 + ${2 * k * k})^2 − (${2 * k}x)^2 = ${o[0]}.`, `${4 * k * k}x^2 जोड़कर घटाने पर: ${P(target)} = (x^2 + ${2 * k * k})^2 − (${2 * k}x)^2 = ${o[0]}।`);
  },
};

// Factorise ax^2 + bxy + cy^2.
const twoVarFac = {
  id: "twoVarFac", levels: ["advanced"],
  cands: () => crossF([range(1, 5), range(-7, 7), range(1, 4), range(-7, 7)], ([a, b, c, d]) => nz(b) && nz(d) && gcd(a, Math.abs(b)) === 1 && gcd(c, Math.abs(d)) === 1 && a * d !== b * c && a * d + b * c !== 0 && a >= c && (a > 1 || c > 1)),
  build: (t, [a, b, c, d]) => {
    // (ax + by)(cx + dy)
    const A = a * c, B = a * d + b * c, C = b * d;
    if (!B) throw new Error("skip");
    const yt = (k) => `${k < 0 ? "−" : "+"} ${Math.abs(k) === 1 ? "" : Math.abs(k)}y`;
    const fx = (p, q, r, s) => `(${p === 1 ? "" : p}x ${yt(q)})(${r === 1 ? "" : r}x ${yt(s)})`;
    const sets = [[a, b, c, d], [a, -b, c, -d], [a, b, c, -d], [a, -b, c, d]];
    const o = sets.map((x) => fx(...x));
    if (new Set(o).size !== 4) throw new Error("collide");
    const text = `${A === 1 ? "" : A}x^2 ${B < 0 ? "−" : "+"} ${Math.abs(B) === 1 ? "" : Math.abs(B)}xy ${C < 0 ? "−" : "+"} ${Math.abs(C) === 1 ? "" : Math.abs(C)}y^2`;
    return XQ(t, `Factorise: ${text}`, `गुणनखंड कीजिए: ${text}`, o, null,
      (i) => { const [p, q, r, s] = sets[i]; return [[1, 2], [3, -1], [-2, 5], [4, 7]].every(([x, y]) => (p * x + q * y) * (r * x + s * y) === A * x * x + B * x * y + C * y * y); },
      `Split the middle term: ${N(A * C)}x^2y^2 = (${N(a * d)}xy)(${N(b * c)}xy) and ${N(a * d)} + ${pn(b * c)} = ${N(B)}. So ${text} = ${o[0]}.`,
      `मध्य पद को विभाजित करने पर: ${N(A * C)}x^2y^2 = (${N(a * d)}xy)(${N(b * c)}xy) और ${N(a * d)} + ${pn(b * c)} = ${N(B)}। अतः ${text} = ${o[0]}।`);
  },
};

// α^2 + β^2 + γ^2 for the zeros of a monic cubic.
const sqZeros = {
  id: "sqZeros", levels: ["advanced"],
  cands: () => crossF([range(-6, 7), range(-6, 7), range(-6, 7)], ([p, q, r]) => p > q && q > r && nz(p) && nz(q) && nz(r)),
  build: (t, [p, q, r]) => {
    const e = prod([[1, -p], [1, -q], [1, -r]]); const s1 = -e[1], s2 = e[2]; const ans = s1 * s1 - 2 * s2;
    return NQ(t, `If α, β and γ are the zeros of ${P(e)}, find the value of α^2 + β^2 + γ^2.`, `यदि α, β और γ, ${P(e)} के शून्यक हैं, तो α^2 + β^2 + γ^2 का मान ज्ञात कीजिए।`,
      ans, [s1 * s1 + 2 * s2, s1 * s1 - s2, ans + 2], () => p * p + q * q + r * r,
      `α + β + γ = ${N(s1)} and αβ + βγ + γα = ${N(s2)}. α^2 + β^2 + γ^2 = ${pn(s1)}^2 − 2 × ${pn(s2)} = ${ans}.`,
      `α + β + γ = ${N(s1)} और αβ + βγ + γα = ${N(s2)}। α^2 + β^2 + γ^2 = ${pn(s1)}^2 − 2 × ${pn(s2)} = ${ans}।`, { positive: true });
  },
};

const KINDS = guard([remThm, valueP, degree, zeroLin, factorMonic, commonFac, diffSqFac, coefLin, factorCheck, groupFac, kFactor, factorNonMonic, zerosCubic, quotient, remHalf, cubeFac, kFromRem, twoFactors, factorCubic, bigPow, sameRem, remQuad, sophie, twoVarFac, sqZeros]);
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
