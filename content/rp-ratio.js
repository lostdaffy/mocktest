// Ratio & Proportion · Ratio: every kind of question, level by level. gen.js
// fills the tests; every answer is worked out again in `v` by a different
// route; the wrong options are the slips students make (the ratio turned
// round, the wrong share, the parts not added).
const L = require("./rp-lib");
const { n, clean, isInt, cross, who, AQ, RQ, FQ, rat, frac, thin, pick, range, dec2, guard, gcd } = L;
const { fillTopic } = require("./gen");

const lcm = (a, b) => a / gcd(a, b) * b;
const RATIOS = [[1, 2], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [5, 7], [4, 7], [2, 5], [3, 7], [5, 8], [7, 9], [7, 8], [5, 9], [4, 9], [7, 10], [9, 11]];
const R3 = [[1, 2, 3], [2, 3, 4], [2, 3, 5], [3, 4, 5], [1, 3, 5], [3, 5, 7], [2, 5, 8], [4, 5, 6], [1, 2, 4], [3, 4, 8], [2, 4, 5], [5, 6, 9], [3, 6, 7], [4, 6, 9]];
const sumOf = (a) => a.reduce((x, y) => x + y, 0);
const NAMES = [["A", "B", "C"], ["P", "Q", "R"], ["X", "Y", "Z"]];

// ---------------------------------------------------------------- EASY
const splitTwo = {
  id: "splitTwo", levels: ["easy"],
  cands: () => cross(RATIOS, range(300, 12000, 50), ["big", "small"]).filter(([[a, b], S]) => isInt(S / (a + b)) && S / (a + b) >= 20),
  build: (t, prm) => {
    const [[a, b], S, ask] = prm; const u = S / (a + b); const x = (ask === "big" ? b : a) * u; const [p, q] = pick(NAMES, prm);
    return AQ(t, `₹${n(S)} is divided between ${p} and ${q} in the ratio ${a} : ${b}. What is ${ask === "big" ? q : p}'s share?`,
      `₹${n(S)} को ${p} और ${q} में ${a} : ${b} के अनुपात में बाँटा जाता है। ${ask === "big" ? q : p} का हिस्सा कितना है?`,
      x, [(ask === "big" ? a : b) * u, S / 2, S * (ask === "big" ? b : a) / (b - a + (b === a ? 1 : 0))], () => S * (ask === "big" ? b : a) / (a + b),
      `Total parts = ${a} + ${b} = ${a + b}. One part = ${n(S)} ÷ ${a + b} = ₹${n(u)}. ${ask === "big" ? q : p}'s share = ${ask === "big" ? b : a} × ${n(u)} = ₹${n(x)}.`,
      `कुल भाग = ${a} + ${b} = ${a + b}। एक भाग = ${n(S)} ÷ ${a + b} = ₹${n(u)}। ${ask === "big" ? q : p} का हिस्सा = ${ask === "big" ? b : a} × ${n(u)} = ₹${n(x)}।`, "rs", 50);
  },
};

const splitThree = {
  id: "splitThree", levels: ["easy", "medium"],
  cands: () => cross(R3, range(900, 18000, 100), [0, 1, 2, 3]).filter(([r, S]) => isInt(S / sumOf(r)) && S / sumOf(r) >= 30),
  build: (t, prm) => {
    const [r, S, ask] = prm; const u = S / sumOf(r); const [A, B, C] = pick(NAMES, prm); const nm = [A, B, C];
    if (ask === 3) {
      const d = (r[2] - r[0]) * u;
      return AQ(t, `₹${n(S)} is divided among ${A}, ${B} and ${C} in the ratio ${r.join(" : ")}. How much more does ${C} get than ${A}?`,
        `₹${n(S)} को ${A}, ${B} और ${C} में ${r.join(" : ")} के अनुपात में बाँटा जाता है। ${C} को ${A} से कितना अधिक मिलता है?`,
        d, [r[2] * u, (r[2] - r[1]) * u, (r[1] - r[0]) * u].filter((v) => v !== d), () => S * r[2] / sumOf(r) - S * r[0] / sumOf(r),
        `One part = ${n(S)} ÷ ${sumOf(r)} = ₹${n(u)}. ${C} gets ${r[2] - r[0]} parts more than ${A}: ${r[2] - r[0]} × ${n(u)} = ₹${n(d)}.`,
        `एक भाग = ${n(S)} ÷ ${sumOf(r)} = ₹${n(u)}। ${C} को ${A} से ${r[2] - r[0]} भाग अधिक मिलते हैं: ${r[2] - r[0]} × ${n(u)} = ₹${n(d)}।`, "rs", 50);
    }
    const x = r[ask] * u;
    return AQ(t, `₹${n(S)} is divided among ${A}, ${B} and ${C} in the ratio ${r.join(" : ")}. What is ${nm[ask]}'s share?`,
      `₹${n(S)} को ${A}, ${B} और ${C} में ${r.join(" : ")} के अनुपात में बाँटा जाता है। ${nm[ask]} का हिस्सा कितना है?`,
      x, r.filter((_, i) => i !== ask).map((k) => k * u).concat([S / 3]), () => S * r[ask] / sumOf(r),
      `Total parts = ${r.join(" + ")} = ${sumOf(r)}. One part = ${n(S)} ÷ ${sumOf(r)} = ₹${n(u)}. ${nm[ask]}'s share = ${r[ask]} × ${n(u)} = ₹${n(x)}.`,
      `कुल भाग = ${r.join(" + ")} = ${sumOf(r)}। एक भाग = ${n(S)} ÷ ${sumOf(r)} = ₹${n(u)}। ${nm[ask]} का हिस्सा = ${r[ask]} × ${n(u)} = ₹${n(x)}।`, "rs", 50);
  },
};

const sumToNums = {
  id: "sumToNums", levels: ["easy"],
  cands: () => cross(RATIOS, range(24, 400), ["big", "small"]).filter(([[a, b], S]) => isInt(S / (a + b))),
  build: (t, prm) => {
    const [[a, b], S, ask] = prm; const u = S / (a + b); const x = (ask === "big" ? b : a) * u;
    return AQ(t, `Two numbers are in the ratio ${a} : ${b} and their sum is ${S}. What is the ${ask === "big" ? "larger" : "smaller"} number?`,
      `दो संख्याएँ ${a} : ${b} के अनुपात में हैं और उनका योग ${S} है। ${ask === "big" ? "बड़ी" : "छोटी"} संख्या क्या है?`,
      x, [(ask === "big" ? a : b) * u, S / 2, u * (b - a)].filter((v) => v !== x), () => S - S * (ask === "big" ? a : b) / (a + b),
      `Let the numbers be ${a}k and ${b}k: ${a + b}k = ${S}, so k = ${n(u)}. The ${ask === "big" ? "larger" : "smaller"} = ${ask === "big" ? b : a} × ${n(u)} = ${n(x)}.`,
      `संख्याएँ ${a}k और ${b}k लें: ${a + b}k = ${S}, अतः k = ${n(u)}। ${ask === "big" ? "बड़ी" : "छोटी"} = ${ask === "big" ? b : a} × ${n(u)} = ${n(x)}।`, "none", 1);
  },
};

const diffToNums = {
  id: "diffToNums", levels: ["easy"],
  cands: () => cross(RATIOS, range(3, 60), ["big", "small"]).filter(([[a, b], D]) => isInt(D / (b - a)) && D / (b - a) >= 2),
  build: (t, prm) => {
    const [[a, b], D, ask] = prm; const u = D / (b - a); const x = (ask === "big" ? b : a) * u;
    return AQ(t, `Two numbers are in the ratio ${a} : ${b}. Their difference is ${D}. What is the ${ask === "big" ? "larger" : "smaller"} number?`,
      `दो संख्याएँ ${a} : ${b} के अनुपात में हैं। उनका अंतर ${D} है। ${ask === "big" ? "बड़ी" : "छोटी"} संख्या क्या है?`,
      x, [(ask === "big" ? a : b) * u, D * (ask === "big" ? b : a), (a + b) * u].filter((v) => v !== x), () => (ask === "big" ? b : a) * D / (b - a),
      `The numbers are ${a}k and ${b}k, so the difference is ${b - a}k = ${D} and k = ${n(u)}. The ${ask === "big" ? "larger" : "smaller"} = ${ask === "big" ? b : a} × ${n(u)} = ${n(x)}.`,
      `संख्याएँ ${a}k और ${b}k हैं, अतः अंतर ${b - a}k = ${D} और k = ${n(u)}। ${ask === "big" ? "बड़ी" : "छोटी"} = ${ask === "big" ? b : a} × ${n(u)} = ${n(x)}।`, "none", 1);
  },
};

const combineAC = {
  id: "combineAC", levels: ["easy", "medium"],
  cands: () => cross(RATIOS, RATIOS, ["AC", "ABC"]).filter(([[a, b], [c, d]]) => b !== c),
  build: (t, prm) => {
    const [[a, b], [c, d], ask] = prm; const B = lcm(b, c); const A = a * B / b, C = d * B / c;
    if (ask === "AC") return RQ(t, `If A : B = ${a} : ${b} and B : C = ${c} : ${d}, what is A : C?`, `यदि A : B = ${a} : ${b} और B : C = ${c} : ${d} है, तो A : C क्या है?`,
      [A, C], [[a, d], [a * c, b * d], [b * c, a * d]], () => [a * c, b * d],
      `A : C = (A/B) × (B/C) = ${a}/${b} × ${c}/${d} = ${a * c}/${b * d}, i.e. A : C = ${rat(A, C)}.`,
      `A : C = (A/B) × (B/C) = ${a}/${b} × ${c}/${d} = ${a * c}/${b * d}, अर्थात् A : C = ${rat(A, C)}।`);
    return RQ(t, `If A : B = ${a} : ${b} and B : C = ${c} : ${d}, what is A : B : C?`, `यदि A : B = ${a} : ${b} और B : C = ${c} : ${d} है, तो A : B : C क्या है?`,
      [A, B, C], [[a, b * c, d], [a * c, b * c, b * d + 1], [a, b, d]], () => [a * c, b * c, b * d],
      `Make B the same in both: B = ${B} (LCM of ${b} and ${c}). A : B = ${n(A)} : ${B} and B : C = ${B} : ${n(C)}, so A : B : C = ${rat(A, B, C)}.`,
      `दोनों में B बराबर करें: B = ${B} (${b} और ${c} का LCM)। A : B = ${n(A)} : ${B} और B : C = ${B} : ${n(C)}, अतः A : B : C = ${rat(A, B, C)}।`);
  },
};

const PCT = [5, 10, 12, 15, 16, 20, 24, 25, 30, 35, 40, 45, 50, 60, 75];
const pctEqual = {
  id: "pctEqual", levels: ["easy", "medium"],
  cands: () => cross(PCT, PCT).filter(([p, q]) => p !== q),
  build: (t, prm) => {
    const [p, q] = prm;
    return RQ(t, `If ${p}% of A is equal to ${q}% of B, what is A : B?`, `यदि A का ${p}%, B के ${q}% के बराबर है, तो A : B क्या है?`,
      [q, p], [[p, q], [p + q, q], [q, p + q]], () => [q * 100, p * 100],
      `${p}/100 × A = ${q}/100 × B, so ${p}A = ${q}B and A : B = ${q} : ${p} = ${rat(q, p)}.`,
      `${p}/100 × A = ${q}/100 × B, अतः ${p}A = ${q}B और A : B = ${q} : ${p} = ${rat(q, p)}।`);
  },
};

const eqMultiples = {
  id: "eqMultiples", levels: ["easy", "medium"],
  cands: () => cross([2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 3, 4, 5, 6, 7, 8, 9, 10]).filter(([p, q, r]) => p < q && q < r),
  build: (t, prm) => {
    const [p, q, r] = prm; const M = lcm(lcm(p, q), r);
    return RQ(t, `If ${p}A = ${q}B = ${r}C, what is A : B : C?`, `यदि ${p}A = ${q}B = ${r}C है, तो A : B : C क्या है?`,
      [M / p, M / q, M / r], [[p, q, r], [r, q, p], [M / r, M / q, M / p]], () => [q * r, p * r, p * q],
      `Let ${p}A = ${q}B = ${r}C = ${M} (LCM of ${p}, ${q}, ${r}). Then A = ${M / p}, B = ${M / q}, C = ${M / r}, so A : B : C = ${rat(M / p, M / q, M / r)}.`,
      `माना ${p}A = ${q}B = ${r}C = ${M} (${p}, ${q}, ${r} का LCM)। तब A = ${M / p}, B = ${M / q}, C = ${M / r}, अतः A : B : C = ${rat(M / p, M / q, M / r)}।`);
  },
};

// Two quantities in different units.
const UNITS = [
  ["minutes", "मिनट", "hours", "घंटे", 60], ["paise", "पैसे", "rupees", "रुपये", 100], ["grams", "ग्राम", "kilograms", "किलोग्राम", 1000],
  ["centimetres", "सेंटीमीटर", "metres", "मीटर", 100], ["metres", "मीटर", "kilometres", "किलोमीटर", 1000], ["seconds", "सेकंड", "minutes", "मिनट", 60],
];
const unitRatio = {
  id: "unitRatio", levels: ["easy"],
  cands: () => cross([0, 1, 2, 3, 4, 5], range(5, 900, 5), [1, 2, 3, 4, 5]).filter(([u, x, y]) => x < UNITS[u][4] * y && x % 5 === 0 && rat(x, UNITS[u][4] * y).split(" : ").every((v) => Number(v) <= 60) && !(u === 0 && x === 45 && y === 2)),
  build: (t, prm) => {
    const [u, x, y] = prm; const [s, sh, b, bh, k] = UNITS[u];
    return RQ(t, `What is the ratio of ${x} ${s} to ${y} ${y === 1 ? b.replace(/s$/, "") : b}?`, `${x} ${sh} का ${y} ${bh} से अनुपात क्या है?`,
      [x, k * y], [[x, y], [x, k * y + k], [k * y, x]], () => [x, y * k],
      `Write both in ${s}: ${y} ${y === 1 ? b.replace(/s$/, "") : b} = ${y} × ${k} = ${k * y} ${s}. Ratio = ${x} : ${k * y} = ${rat(x, k * y)}.`,
      `दोनों को ${sh} में लिखें: ${y} ${bh} = ${y} × ${k} = ${k * y} ${sh}। अनुपात = ${x} : ${k * y} = ${rat(x, k * y)}।`);
  },
};

const givenOneTotal = {
  id: "givenOneTotal", levels: ["easy", "medium"],
  cands: () => cross(RATIOS, range(20, 600, 4), ["girls", "boys"]).filter(([[a, b], G, k]) => isInt(G / (k === "girls" ? a : b)) && !(a === 5 && b === 3)),
  build: (t, prm) => {
    const [[b, g], G, k] = prm; const u = G / (k === "girls" ? b : g); const T = (b + g) * u;
    // ratio boys : girls = g : b here so the larger group varies
    return AQ(t, `In a school the ratio of boys to girls is ${g} : ${b}. If there are ${G} ${k}, how many students are there in all?`,
      `एक विद्यालय में लड़कों और लड़कियों का अनुपात ${g} : ${b} है। यदि ${k === "girls" ? "लड़कियाँ" : "लड़के"} ${G} हैं, तो कुल कितने विद्यार्थी हैं?`,
      T, [G + G * (k === "girls" ? g : b) / (k === "girls" ? b : g) + u, (k === "girls" ? g : b) * u, G * 2], () => G * (b + g) / (k === "girls" ? b : g),
      `${k === "girls" ? "Girls" : "Boys"} are ${k === "girls" ? b : g} parts = ${G}, so one part = ${n(u)}. Total = ${b + g} parts = ${b + g} × ${n(u)} = ${n(T)}.`,
      `${k === "girls" ? "लड़कियाँ" : "लड़के"} ${k === "girls" ? b : g} भाग = ${G}, अतः एक भाग = ${n(u)}। कुल = ${b + g} भाग = ${b + g} × ${n(u)} = ${n(T)}।`, "none", 4);
  },
};

const exprValue = {
  id: "exprValue", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => cross(RATIOS, [2, 3, 4, 5], [1, 2, 3], [2, 3, 4, 5, 7], [1, 2, 3]).filter(([[a, b], p, q, r, s]) => p * a - q * b > 0 && gcd(p * a - q * b, r * a + s * b) < r * a + s * b),
  build: (t, prm) => {
    const [[a, b], p, q, r, s] = prm; const N = p * a - q * b, D = r * a + s * b;
    return FQ(t, `If x : y = ${a} : ${b}, what is the value of (${p}x − ${q}y) / (${r}x + ${s}y)?`, `यदि x : y = ${a} : ${b} है, तो (${p}x − ${q}y) / (${r}x + ${s}y) का मान क्या है?`,
      [N, D], [[p * b - q * a > 0 ? p * b - q * a : N + 2, r * b + s * a], [p * a + q * b, D], [N, r * a - s * b > 0 ? r * a - s * b : D + 3]], () => [p * a * 2 - q * b * 2, r * a * 2 + s * b * 2],
      `Put x = ${a}k and y = ${b}k: (${p * a}k − ${q * b}k) / (${r * a}k + ${s * b}k) = ${N}/${D}${frac(N, D) !== `${N}/${D}` ? ` = ${frac(N, D)}` : ""}.`,
      `x = ${a}k और y = ${b}k रखें: (${p * a}k − ${q * b}k) / (${r * a}k + ${s * b}k) = ${N}/${D}${frac(N, D) !== `${N}/${D}` ? ` = ${frac(N, D)}` : ""}।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
// Two numbers ak, bk; k added to (or taken from) each gives c : d.
const ADD = () => cross(RATIOS, range(2, 15), range(2, 20), ["add", "sub"]).map(([[a, b], u, k, op]) => [a, b, u, k, op]).filter(([a, b, u, k, op]) => { const x = op === "add" ? a * u + k : a * u - k, y = op === "add" ? b * u + k : b * u - k; return x > 0 && rat(x, y) !== rat(a, b) && rat(x, y).split(" : ").every((v) => Number(v) <= 40); });
const addToEach = {
  id: "addToEach", levels: ["medium", "hard", "advanced"],
  cands: () => thin(ADD(), (p) => [p[0], p[1], p[4], p[3] % 5]),
  build: (t, prm) => {
    const [a, b, u, k, op] = prm; const x = op === "add" ? a * u + k : a * u - k, y = op === "add" ? b * u + k : b * u - k; const [c, d] = rat(x, y).split(" : ").map(Number); const ans = a * u;
    return AQ(t, `Two numbers are in the ratio ${a} : ${b}. If ${k} is ${op === "add" ? "added to" : "subtracted from"} each, the ratio becomes ${c} : ${d}. What is the smaller number?`,
      `दो संख्याएँ ${a} : ${b} के अनुपात में हैं। यदि प्रत्येक ${op === "add" ? "में" : "में से"} ${k} ${op === "add" ? "जोड़ा" : "घटाया"} जाए, तो अनुपात ${c} : ${d} हो जाता है। छोटी संख्या क्या है?`,
      ans, [b * u, x, a * u + a, (a + b) * u].filter((v) => v !== ans), () => { const kk = (op === "add" ? 1 : -1) * k * (c - d) / (a * d - b * c); return a * kk; },
      `(${a}u ${op === "add" ? "+" : "−"} ${k}) / (${b}u ${op === "add" ? "+" : "−"} ${k}) = ${c}/${d}, so ${d}(${a}u ${op === "add" ? "+" : "−"} ${k}) = ${c}(${b}u ${op === "add" ? "+" : "−"} ${k}), giving u = ${u}. The numbers are ${a * u} and ${b * u}; the smaller is ${ans}.`,
      `(${a}u ${op === "add" ? "+" : "−"} ${k}) / (${b}u ${op === "add" ? "+" : "−"} ${k}) = ${c}/${d}, अतः ${d}(${a}u ${op === "add" ? "+" : "−"} ${k}) = ${c}(${b}u ${op === "add" ? "+" : "−"} ${k}), जिससे u = ${u}। संख्याएँ ${a * u} और ${b * u} हैं; छोटी ${ans} है।`, "none", 1);
  },
};

// Incomes a:b, expenditures c:d, each saves S.
const INC = () => cross(RATIOS, RATIOS, range(500, 6000, 500)).filter(([[a, b], [c, d], S]) => a * d !== b * c && (d - c) * S % (a * d - b * c) === 0).map(([[a, b], [c, d], S]) => { const x = S * (d - c) / (a * d - b * c); return [a, b, c, d, S, x]; }).filter(([a, b, c, d, S, x]) => x > 0 && a * x > S && b * x > S && a * x <= 200000 && isInt(x));
const incomeSave = {
  id: "incomeSave", levels: ["medium", "hard", "advanced"],
  cands: () => thin(INC(), (p) => [p[0], p[1], p[2], p[3]]),
  build: (t, prm) => {
    const [a, b, c, d, S, x] = prm; const IA = a * x;
    return AQ(t, `The incomes of A and B are in the ratio ${a} : ${b} and their expenditures are in the ratio ${c} : ${d}. If each of them saves ₹${n(S)}, what is A's income?`,
      `A और B की आय ${a} : ${b} के अनुपात में है और उनका व्यय ${c} : ${d} के अनुपात में है। यदि दोनों में से प्रत्येक ₹${n(S)} बचाता है, तो A की आय कितनी है?`,
      IA, [b * x, a * x + S, (a - c) * S].filter((v) => v !== IA && v > 0), () => a * (S * (d - c) / (a * d - b * c)),
      `Incomes ${a}x and ${b}x. (${a}x − ${n(S)}) : (${b}x − ${n(S)}) = ${c} : ${d}, so ${d}(${a}x − ${n(S)}) = ${c}(${b}x − ${n(S)}) and x = ${n(x)}. A's income = ${a} × ${n(x)} = ₹${n(IA)}.`,
      `आय ${a}x और ${b}x। (${a}x − ${n(S)}) : (${b}x − ${n(S)}) = ${c} : ${d}, अतः ${d}(${a}x − ${n(S)}) = ${c}(${b}x − ${n(S)}) और x = ${n(x)}। A की आय = ${a} × ${n(x)} = ₹${n(IA)}।`, "rs", 500);
  },
};

const pctChangeRatio = {
  id: "pctChangeRatio", levels: ["medium", "hard", "advanced"],
  cands: () => cross(R3, [10, 20, 25, 40, 50], [10, 20, 25, 40, 50], [10, 20, 25, 40, 50]).filter(([r, p, q, s]) => !(p === q && q === s)),
  build: (t, prm) => {
    const [r, p, q, s] = prm; const nv = [r[0] * (100 + p), r[1] * (100 + q), r[2] * (100 + s)];
    return RQ(t, `The numbers of employees in three departments are in the ratio ${r.join(" : ")}. If they increase by ${p}%, ${q}% and ${s}% respectively, what is the new ratio?`,
      `तीन विभागों में कर्मचारियों की संख्या ${r.join(" : ")} के अनुपात में है। यदि ये क्रमशः ${p}%, ${q}% और ${s}% बढ़ जाएँ, तो नया अनुपात क्या होगा?`,
      nv, [[r[0] + p, r[1] + q, r[2] + s].map((x) => x * 1), [r[0] * p, r[1] * q, r[2] * s], r], () => [r[0] * (1 + p / 100) * 100, r[1] * (1 + q / 100) * 100, r[2] * (1 + s / 100) * 100],
      `New numbers: ${r[0]} × ${n(1 + p / 100)} : ${r[1]} × ${n(1 + q / 100)} : ${r[2]} × ${n(1 + s / 100)} = ${n(nv[0] / 100)} : ${n(nv[1] / 100)} : ${n(nv[2] / 100)} = ${rat(...nv)}.`,
      `नई संख्याएँ: ${r[0]} × ${n(1 + p / 100)} : ${r[1]} × ${n(1 + q / 100)} : ${r[2]} × ${n(1 + s / 100)} = ${n(nv[0] / 100)} : ${n(nv[1] / 100)} : ${n(nv[2] / 100)} = ${rat(...nv)}।`);
  },
};

const combineFour = {
  id: "combineFour", levels: ["medium", "hard", "advanced"],
  cands: () => cross(RATIOS, RATIOS, RATIOS).filter(([[a, b], [c, d], [e, f]]) => b !== c && d !== e && a * c * e < b * d * f * 3).filter((_, i) => i % 7 === 0),
  build: (t, prm) => {
    const [[a, b], [c, d], [e, f]] = prm;
    return RQ(t, `If a : b = ${a} : ${b}, b : c = ${c} : ${d} and c : d = ${e} : ${f}, what is a : d?`, `यदि a : b = ${a} : ${b}, b : c = ${c} : ${d} और c : d = ${e} : ${f} है, तो a : d क्या है?`,
      [a * c * e, b * d * f], [[a * e, b * f], [a + c + e, b + d + f], [b * d * f, a * c * e]], () => [a * c * e * 2, b * d * f * 2],
      `a/d = (a/b) × (b/c) × (c/d) = ${a}/${b} × ${c}/${d} × ${e}/${f} = ${a * c * e}/${b * d * f}, so a : d = ${rat(a * c * e, b * d * f)}.`,
      `a/d = (a/b) × (b/c) × (c/d) = ${a}/${b} × ${c}/${d} × ${e}/${f} = ${a * c * e}/${b * d * f}, अतः a : d = ${rat(a * c * e, b * d * f)}।`);
  },
};

const sumChain = {
  id: "sumChain", levels: ["medium", "hard", "advanced"],
  cands: () => cross(RATIOS, RATIOS, range(20, 400), [0, 1, 2]).filter(([[a, b], [c, d], S]) => b !== c && isInt(S / ((a * lcm(b, c) / b) + lcm(b, c) + (d * lcm(b, c) / c)))),
  build: (t, prm) => {
    const [[a, b], [c, d], S, ask] = prm; const B = lcm(b, c); const r = [a * B / b, B, d * B / c]; const u = S / sumOf(r); const x = r[ask] * u; const nm = ["first", "second", "third"][ask]; const nh = ["पहली", "दूसरी", "तीसरी"][ask];
    return AQ(t, `The sum of three numbers is ${S}. The ratio of the first to the second is ${a} : ${b} and that of the second to the third is ${c} : ${d}. What is the ${nm} number?`,
      `तीन संख्याओं का योग ${S} है। पहली और दूसरी का अनुपात ${a} : ${b} तथा दूसरी और तीसरी का ${c} : ${d} है। ${nh} संख्या क्या है?`,
      x, [S * [a, b, d][ask] / (a + b + d), r[(ask + 1) % 3] * u, S / 3].filter((v) => v !== x && isInt(v)), () => S * r[ask] / (r[0] + r[1] + r[2]),
      `Make the second number the same: first : second : third = ${r.join(" : ")} (sum ${sumOf(r)} parts). One part = ${S} ÷ ${sumOf(r)} = ${n(u)}, so the ${nm} = ${r[ask]} × ${n(u)} = ${n(x)}.`,
      `दूसरी संख्या बराबर करें: पहली : दूसरी : तीसरी = ${r.join(" : ")} (कुल ${sumOf(r)} भाग)। एक भाग = ${S} ÷ ${sumOf(r)} = ${n(u)}, अतः ${nh} = ${r[ask]} × ${n(u)} = ${n(x)}।`, "none", 1);
  },
};

const leaveJoin = {
  id: "leaveJoin", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross(RATIOS, range(10, 80), range(5, 60)).map(([[g, b], u, k]) => [b, g, u, k]).filter(([b, g, u, k]) => { const B = b * u - k, G = g * u + k; return B > 0 && b > g && rat(B, G).split(" : ").every((v) => Number(v) <= 30) && !(b === 5 && g === 3); }), (p) => [p[0], p[1], p[3]]),
  build: (t, prm) => {
    const [b, g, u, k] = prm; const [c, d] = rat(b * u - k, g * u + k).split(" : ").map(Number); const G = g * u;
    return AQ(t, `The ratio of boys to girls in a school is ${b} : ${g}. If ${k} boys leave and ${k} girls join, the ratio becomes ${c} : ${d}. How many girls were there at first?`,
      `एक विद्यालय में लड़कों और लड़कियों का अनुपात ${b} : ${g} है। यदि ${k} लड़के चले जाएँ और ${k} लड़कियाँ आ जाएँ, तो अनुपात ${c} : ${d} हो जाता है। प्रारंभ में कितनी लड़कियाँ थीं?`,
      G, [b * u, G + k, (b + g) * u].filter((v) => v !== G), () => g * (k * (c + d)) / (b * d - g * c),
      `Boys ${b}x, girls ${g}x: (${b}x − ${k}) : (${g}x + ${k}) = ${c} : ${d}, so ${d}(${b}x − ${k}) = ${c}(${g}x + ${k}) and x = ${u}. Girls at first = ${g} × ${u} = ${G}.`,
      `लड़के ${b}x, लड़कियाँ ${g}x: (${b}x − ${k}) : (${g}x + ${k}) = ${c} : ${d}, अतः ${d}(${b}x − ${k}) = ${c}(${g}x + ${k}) और x = ${u}। प्रारंभ में लड़कियाँ = ${g} × ${u} = ${G}।`, "none", 1);
  },
};

// Coins of three values in a ratio; total value given.
const COINS = [[100, "₹1", "₹1"], [50, "50-paise", "50 पैसे"], [25, "25-paise", "25 पैसे"], [10, "10-paise", "10 पैसे"], [200, "₹2", "₹2"], [500, "₹5", "₹5"]];
const coins = {
  id: "coins", levels: ["medium", "hard", "advanced"],
  cands: () => { const out = []; for (const [i, j, k] of [[0, 1, 2], [1, 2, 3], [4, 0, 1], [5, 4, 0], [0, 2, 3], [4, 1, 2]]) for (const r of R3.concat([[5, 7, 9], [5, 9, 4], [2, 3, 5], [3, 5, 6]])) for (const x of range(4, 80)) { const V = (r[0] * COINS[i][0] + r[1] * COINS[j][0] + r[2] * COINS[k][0]) * x / 100; if (isInt(V) && V <= 3000) out.push([i, j, k, r, x, 1]); } return thin(out, (p) => [p[0], p[3]]); },
  build: (t, prm) => {
    const [i, j, k, r, x] = prm; const ids = [i, j, k]; const V = (r[0] * COINS[i][0] + r[1] * COINS[j][0] + r[2] * COINS[k][0]) * x / 100; const per = (r[0] * COINS[i][0] + r[1] * COINS[j][0] + r[2] * COINS[k][0]) / 100; const ask = 1; const ans = r[ask] * x;
    return AQ(t, `A bag has ${COINS[i][1]}, ${COINS[j][1]} and ${COINS[k][1]} coins in the ratio ${r.join(" : ")}. Their total value is ₹${n(V)}. How many ${COINS[j][1]} coins are there?`,
      `एक थैले में ${COINS[i][2]}, ${COINS[j][2]} और ${COINS[k][2]} के सिक्के ${r.join(" : ")} के अनुपात में हैं। उनका कुल मूल्य ₹${n(V)} है। ${COINS[j][2]} के कितने सिक्के हैं?`,
      ans, [r[0] * x, r[2] * x, V * r[1] / sumOf(r)].filter((v) => v !== ans && isInt(v)), () => r[ask] * V / per,
      `With ${r.join("x, ")}x coins: value = ${r[0]}x × ${n(COINS[i][0] / 100)} + ${r[1]}x × ${n(COINS[j][0] / 100)} + ${r[2]}x × ${n(COINS[k][0] / 100)} = ₹${n(per)}x = ₹${n(V)}, so x = ${x}. ${COINS[j][1]} coins = ${r[1]} × ${x} = ${ans}.`,
      `${r.join("x, ")}x सिक्के लें: मूल्य = ${r[0]}x × ${n(COINS[i][0] / 100)} + ${r[1]}x × ${n(COINS[j][0] / 100)} + ${r[2]}x × ${n(COINS[k][0] / 100)} = ₹${n(per)}x = ₹${n(V)}, अतः x = ${x}। ${COINS[j][2]} के सिक्के = ${r[1]} × ${x} = ${ans}।`, "none", 5);
  },
};

const hcfLcm = {
  id: "hcfLcm", levels: ["medium"],
  cands: () => cross(RATIOS, range(2, 30), ["lcm", "sum"]).filter(([[a, b]]) => gcd(a, b) === 1),
  build: (t, prm) => {
    const [[a, b], h, ask] = prm; const L2 = a * b * h;
    if (ask === "lcm") return AQ(t, `Two numbers are in the ratio ${a} : ${b} and their HCF is ${h}. What is their LCM?`, `दो संख्याएँ ${a} : ${b} के अनुपात में हैं और उनका HCF ${h} है। उनका LCM क्या है?`,
      L2, [a * h + b * h, a * b, h * (a + b) * 2].filter((v) => v !== L2), () => lcm(a * h, b * h),
      `The numbers are ${a} × ${h} = ${a * h} and ${b} × ${h} = ${b * h}. LCM = ${a} × ${b} × ${h} = ${L2}.`,
      `संख्याएँ ${a} × ${h} = ${a * h} और ${b} × ${h} = ${b * h} हैं। LCM = ${a} × ${b} × ${h} = ${L2}।`, "none", h);
    return AQ(t, `Two numbers are in the ratio ${a} : ${b} and their LCM is ${L2}. What is their sum?`, `दो संख्याएँ ${a} : ${b} के अनुपात में हैं और उनका LCM ${L2} है। उनका योग क्या है?`,
      (a + b) * h, [L2 / (a + b), (b - a) * h, a * b * h / 2].filter((v) => v !== (a + b) * h && isInt(v)), () => L2 / (a * b) * (a + b),
      `The numbers are ${a}x and ${b}x with LCM ${a * b}x = ${L2}, so x = ${h}. Sum = ${a + b} × ${h} = ${(a + b) * h}.`,
      `संख्याएँ ${a}x और ${b}x हैं, जिनका LCM ${a * b}x = ${L2}, अतः x = ${h}। योग = ${a + b} × ${h} = ${(a + b) * h}।`, "none", h);
  },
};

const mixAddWater = {
  id: "mixAddWater", levels: ["medium", "hard"],
  cands: () => cross(RATIOS.concat([[3, 1], [5, 3], [7, 3], [4, 1], [3, 2], [5, 2], [7, 2]]), range(20, 120, 5), RATIOS.concat([[2, 1], [3, 2], [1, 1]])).map(([[m, w], V, [c, d]]) => [m, w, V, c, d]).filter(([m, w, V, c, d]) => { if (!isInt(V / (m + w))) return false; const M = V * m / (m + w), W = V * w / (m + w); const x = M * d / c - W; return x > 0 && dec2(x) && x <= V * 0.75; }),
  build: (t, prm) => {
    const [m, w, V, c, d] = prm; const M = V * m / (m + w), W = V * w / (m + w); const x = clean(M * d / c - W);
    return AQ(t, `A ${V}-litre mixture contains milk and water in the ratio ${m} : ${w}. How much water must be added to make the ratio ${c} : ${d}?`,
      `${V} लीटर के एक मिश्रण में दूध और पानी ${m} : ${w} के अनुपात में हैं। अनुपात ${c} : ${d} करने के लिए कितना पानी मिलाना होगा?`,
      x, [V * d / c - V, M * d / c, x + W].filter((v) => v > 0 && v !== x), () => (V * m / (m + w)) * d / c - V * w / (m + w),
      `Milk = ${n(M)} L and water = ${n(W)} L. The milk stays, so for ${c} : ${d} the water must be ${n(M)} × ${d}/${c} = ${n(M * d / c)} L. Add ${n(M * d / c)} − ${n(W)} = ${n(x)} litres.`,
      `दूध = ${n(M)} L और पानी = ${n(W)} L। दूध वही रहता है, अतः ${c} : ${d} के लिए पानी ${n(M)} × ${d}/${c} = ${n(M * d / c)} L होना चाहिए। मिलाना = ${n(M * d / c)} − ${n(W)} = ${n(x)} लीटर।`, "lt", 1);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
const giveTransfer = {
  id: "giveTransfer", levels: ["hard", "advanced"],
  cands: () => { const out = []; for (const r of R3) for (const x of range(50, 2000, 50)) for (const k of range(50, 1000, 50)) { const nw = [r[0] * x + k, r[1] * x, r[2] * x - k]; if (nw[2] > 0 && rat(...nw).split(" : ").every((v) => Number(v) <= 20) && rat(...nw) !== rat(...r)) out.push([r, x, k]); } return thin(out, (p) => [p[0], p[2]]); },
  build: (t, prm) => {
    const [r, x, k] = prm; const nw = rat(r[0] * x + k, r[1] * x, r[2] * x - k); const T = sumOf(r) * x;
    return AQ(t, `A sum of money is divided among A, B and C in the ratio ${r.join(" : ")}. If C gives ₹${n(k)} to A, the ratio becomes ${nw}. What is the total sum?`,
      `एक राशि A, B और C में ${r.join(" : ")} के अनुपात में बाँटी जाती है। यदि C, A को ₹${n(k)} दे दे, तो अनुपात ${nw} हो जाता है। कुल राशि कितनी है?`,
      T, [sumOf(r) * x + k, T / 2, sumOf(nw.split(" : ").map(Number)) * k].filter((v) => v !== T), () => { const [n0, n1] = nw.split(" : ").map(Number); return sumOf(r) * k * n1 / (r[1] * n0 - r[0] * n1); },
      `Shares ${r.map((v) => `${v}x`).join(", ")}. B is unchanged, so ${r[0]}x + ${n(k)} : ${r[1]}x = ${nw.split(" : ")[0]} : ${nw.split(" : ")[1]}, giving x = ${n(x)}. Total = ${sumOf(r)} × ${n(x)} = ₹${n(T)}.`,
      `हिस्से ${r.map((v) => `${v}x`).join(", ")}। B का हिस्सा नहीं बदलता, अतः ${r[0]}x + ${n(k)} : ${r[1]}x = ${nw.split(" : ")[0]} : ${nw.split(" : ")[1]}, जिससे x = ${n(x)}। कुल = ${sumOf(r)} × ${n(x)} = ₹${n(T)}।`, "rs", 100);
  },
};

const savingsRatio = {
  id: "savingsRatio", levels: ["hard", "advanced"],
  cands: () => { const out = []; for (const I of R3.concat([[3, 7, 4], [7, 9, 12], [4, 5, 6]])) for (const E of R3.concat([[4, 3, 5], [8, 9, 15]])) for (const [p, q] of [[1, 3], [1, 4], [1, 5], [2, 5], [1, 2], [3, 10]]) { const y = I[0] * (1 - p / q) / E[0]; const s = I.map((v, i) => v - E[i] * y); if (s.every((v) => v > 0) && dec2(y) && s.every((v) => dec2(v)) && s.every((v) => isInt(v * 60))) out.push([I, E, p, q]); } return out; },
  build: (t, prm) => {
    const [I, E, p, q] = prm; const y = I[0] * (1 - p / q) / E[0]; const s = I.map((v, i) => v - E[i] * y).map((v) => Math.round(v * 60));
    return RQ(t, `The incomes of A, B and C are in the ratio ${I.join(" : ")} and their expenditures in the ratio ${E.join(" : ")}. If A saves ${p}/${q} of his income, what is the ratio of their savings?`,
      `A, B और C की आय ${I.join(" : ")} के अनुपात में है और उनका व्यय ${E.join(" : ")} के अनुपात में। यदि A अपनी आय का ${p}/${q} बचाता है, तो उनकी बचत का अनुपात क्या है?`,
      s, [I.map((v, i) => v - E[i]), E, I.map((v) => v * p)], () => I.map((v, i) => Math.round((v - E[i] * (I[0] * (q - p) / q / E[0])) * 60)),
      `Incomes ${I.map((v) => `${v}x`).join(", ")}; expenditures ${E.map((v) => `${v}y`).join(", ")}. A spends ${n(1 - p / q)} of ${I[0]}x, so ${E[0]}y = ${n(I[0] * (1 - p / q))}x and y = ${n(y)}x. Savings: ${I.map((v, i) => `${v}x − ${n(E[i] * y)}x`).join(", ")} = ${s.map((v) => n(v / 60)).join(" : ")} = ${rat(...s)}.`,
      `आय ${I.map((v) => `${v}x`).join(", ")}; व्यय ${E.map((v) => `${v}y`).join(", ")}। A अपनी आय ${I[0]}x का ${n(1 - p / q)} खर्च करता है, अतः ${E[0]}y = ${n(I[0] * (1 - p / q))}x और y = ${n(y)}x। बचत: ${I.map((v, i) => `${v}x − ${n(E[i] * y)}x`).join(", ")} = ${s.map((v) => n(v / 60)).join(" : ")} = ${rat(...s)}।`);
  },
};

const scholarship = {
  id: "scholarship", levels: ["hard", "advanced"],
  cands: () => cross(RATIOS.concat(RATIOS.map(([a, b]) => [b, a])), [10, 15, 20, 25, 30, 40], [10, 15, 20, 25, 30, 40]).filter(([[b, g], p, q]) => p !== q && isInt(100 - (b * p + g * q) / (b + g))),
  build: (t, prm) => {
    const [[b, g], p, q] = prm; const S = (b * p + g * q) / (b + g); const N = 100 - S;
    return AQ(t, `The ratio of boys to girls in a college is ${b} : ${g}. If ${p}% of the boys and ${q}% of the girls hold scholarships, what percentage of the students do not hold a scholarship?`,
      `एक महाविद्यालय में लड़कों और लड़कियों का अनुपात ${b} : ${g} है। यदि ${p}% लड़कों और ${q}% लड़कियों को छात्रवृत्ति मिलती है, तो कितने प्रतिशत विद्यार्थियों को छात्रवृत्ति नहीं मिलती?`,
      N, [100 - (p + q) / 2, S, 100 - p - q].filter((v) => v !== N && v > 0), () => 100 * (b * (100 - p) + g * (100 - q)) / ((b + g) * 100),
      `Take ${b * 100} boys and ${g * 100} girls. Scholarships: ${b * p} + ${g * q} = ${b * p + g * q} out of ${(b + g) * 100}, i.e. ${n(S)}%. Without = 100 − ${n(S)} = ${n(N)}%.`,
      `${b * 100} लड़के और ${g * 100} लड़कियाँ लें। छात्रवृत्ति: ${b * p} + ${g * q} = ${b * p + g * q}, कुल ${(b + g) * 100} में से, यानी ${n(S)}%। बिना छात्रवृत्ति = 100 − ${n(S)} = ${n(N)}%।`, "pct", 1);
  },
};

const menWomen = {
  id: "menWomen", levels: ["hard", "advanced"],
  cands: () => { const out = []; for (const [p, q] of RATIOS.concat(RATIOS.map(([a, b]) => [b, a]))) for (const [r, s] of RATIOS.concat(RATIOS.map(([a, b]) => [b, a]))) { const M = p * s, W = q * r; const g = gcd(M, W); const m = M / g, w = W / g; if (m + w > 40) continue; for (const k of range(2, 8)) { const N = (m + w) * k; if (N >= 10 && N <= 120) out.push([p, q, r, s, N]); } } return thin(out, (x) => [x[0], x[1], x[2], x[3]]); },
  build: (t, prm) => {
    const [p, q, r, s, N] = prm; const M = p * s, W = q * r; const g = gcd(M, W); const men = N * (M / g) / ((M + W) / g);
    return AQ(t, `A sum of money is shared among ${N} men and women. The men together get ${p} parts for every ${q} parts the women get, but each man gets ${r} parts for every ${s} parts each woman gets (ratio of individual shares ${r} : ${s}). How many men are there?`,
      `एक राशि ${N} पुरुषों और महिलाओं में बाँटी जाती है। सभी पुरुषों को कुल मिलाकर और सभी महिलाओं को कुल मिलाकर ${p} : ${q} के अनुपात में राशि मिलती है, जबकि प्रत्येक पुरुष और प्रत्येक महिला के हिस्से का अनुपात ${r} : ${s} है। पुरुष कितने हैं?`,
      men, [N - men, N * p / (p + q), N * r / (r + s)].filter((v) => v !== men && isInt(v)), () => { const ratioMW = (p / r) / (q / s); return N * ratioMW / (1 + ratioMW); },
      `Men : women (in number) = (total share ÷ share each) = ${p}/${r} : ${q}/${s} = ${p * s} : ${q * r} = ${rat(M, W)}. Men = ${N} × ${M / g} ÷ ${(M + W) / g} = ${men}.`,
      `पुरुष : महिलाएँ (संख्या में) = (कुल हिस्सा ÷ प्रति व्यक्ति हिस्सा) = ${p}/${r} : ${q}/${s} = ${p * s} : ${q * r} = ${rat(M, W)}। पुरुष = ${N} × ${M / g} ÷ ${(M + W) / g} = ${men}।`, "none", 1);
  },
};

const candles = {
  id: "candles", levels: ["hard", "advanced"],
  cands: () => cross(range(3, 12), range(4, 16), [[2, 1], [3, 1], [3, 2], [4, 3], [5, 2], [4, 1]]).filter(([a, b, [p, q]]) => b > a && dec2((p - q) / (p / a - q / b)) && (p - q) / (p / a - q / b) > 0 && (p - q) / (p / a - q / b) < a),
  build: (t, prm) => {
    const [a, b, [p, q]] = prm; const T = clean((p - q) / (p / a - q / b));
    return AQ(t, `Two candles of the same height are lit together. One burns down in ${b} hours and the other in ${a} hours, each at a steady rate. After how many hours will the first be ${p === 2 && q === 1 ? "twice" : `${p}/${q} times`} as tall as the second?`,
      `समान ऊँचाई की दो मोमबत्तियाँ एक साथ जलाई जाती हैं। एक ${b} घंटे में और दूसरी ${a} घंटे में पूरी जल जाती है, दोनों समान दर से। कितने घंटे बाद पहली की ऊँचाई दूसरी की ${p === 2 && q === 1 ? "दोगुनी" : `${p}/${q} गुना`} होगी?`,
      T, [a * b / (a + b), (a + b) / 2, T + 1].filter((v) => v !== T && v > 0), () => { const tt = (p - q) * a * b / (p * b - q * a); return tt; },
      `After t hours the heights are 1 − t/${b} and 1 − t/${a}. ${q}(1 − t/${b}) = ${p}(1 − t/${a}) gives t(${p}/${a} − ${q}/${b}) = ${p - q}, so t = ${n(T)} hours.`,
      `t घंटे बाद ऊँचाइयाँ 1 − t/${b} और 1 − t/${a} हैं। ${q}(1 − t/${b}) = ${p}(1 − t/${a}) से t(${p}/${a} − ${q}/${b}) = ${p - q}, अतः t = ${n(T)} घंटे।`, "hr", 0.5);
  },
};

const salaryRaise = {
  id: "salaryRaise", levels: ["hard", "advanced"],
  cands: () => thin(cross(RATIOS, range(1000, 12000, 500), range(500, 6000, 500), range(500, 6000, 500)).filter(([[a, b], x, i1, i2]) => i1 !== i2 && rat(a * x + i1, b * x + i2).split(" : ").every((v) => Number(v) <= 30) && rat(a * x + i1, b * x + i2) !== rat(a, b)), (p) => [p[0], p[2], p[3]]),
  build: (t, prm) => {
    const [[a, b], x, i1, i2] = prm; const [c, d] = rat(a * x + i1, b * x + i2).split(" : ").map(Number); const S = a * x;
    return AQ(t, `The salaries of A and B are in the ratio ${a} : ${b}. If A's salary is raised by ₹${n(i1)} and B's by ₹${n(i2)}, the ratio becomes ${c} : ${d}. What is A's salary now (before the raise)?`,
      `A और B के वेतन ${a} : ${b} के अनुपात में हैं। यदि A का वेतन ₹${n(i1)} और B का ₹${n(i2)} बढ़ा दिया जाए, तो अनुपात ${c} : ${d} हो जाता है। A का वर्तमान वेतन (वृद्धि से पहले) कितना है?`,
      S, [S + i1, b * x, (a + b) * x].filter((v) => v !== S), () => a * (c * i2 - d * i1) / (a * d - b * c),
      `${d}(${a}x + ${n(i1)}) = ${c}(${b}x + ${n(i2)}) gives x = ${n(x)}, so A's salary = ${a} × ${n(x)} = ₹${n(S)}.`,
      `${d}(${a}x + ${n(i1)}) = ${c}(${b}x + ${n(i2)}) से x = ${n(x)}, अतः A का वेतन = ${a} × ${n(x)} = ₹${n(S)}।`, "rs", 500);
  },
};

const KINDS = guard([
  splitTwo, splitThree, sumToNums, diffToNums, combineAC, pctEqual, eqMultiples, unitRatio, givenOneTotal, exprValue,
  addToEach, incomeSave, pctChangeRatio, combineFour, sumChain, leaveJoin, coins, hcfLcm, mixAddWater,
  giveTransfer, savingsRatio, scholarship, menWomen, candles, salaryRaise,
]);

const PREFIX = "Ratio & Proportion · Ratio";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
