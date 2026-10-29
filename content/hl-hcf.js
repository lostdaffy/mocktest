// HCF & LCM · HCF of Numbers: the HCF of two, three or four numbers, by
// prime factors and by division, of decimals and fractions, with
// remainders, from ratios, and how many pairs or common factors there are.
// gen.js fills the tests; every answer is worked out again in `v` by a
// different route (trying every divisor, not the formula); the wrong
// options are the slips students make (a common factor that is not the
// highest, the LCM, forgetting to take off the remainder).
const L = require("./hl-lib");
const { N, gcd, lcm, gcdA, lcmA, hcfSlow, divisors, factor, pf, isPrime, range, cap, pick, AQ, SQ, frac, guard, cross, andE, andH, clean, isInt } = L;
const { fillTopic } = require("./gen");

const sp = (g) => factor(g)[0][0]; // smallest prime factor
const below = (g) => (isPrime(g) ? 1 : g / sp(g)); // a common factor, not the highest
const prime = (x) => isPrime(x);
// Pairs g·x, g·y (x < y co-prime): numbers whose HCF is exactly g.
const pairs = (gs, xs, lo, hi) => cross(gs, xs, xs).filter(([g, x, y]) => x < y && gcd(x, y) === 1 && g * y <= hi && g * x >= lo);
const gline = (g) => (isPrime(g) ? `${g}` : `${pf(g)} = ${g}`);
const factorLine = (xs) => xs.map((x) => `${x} = ${pf(x)}`).join(", ");

// The HCF of two numbers, by prime factors.
const two = (id, levels, gs, xs, lo, hi, max = 500) => ({
  id, levels,
  cands: () => cap(pairs(gs, xs, lo, hi).filter(([g]) => g > 1), max),
  build: (t, prm) => {
    const [g, x, y] = prm; const a = g * x, b = g * y;
    const ask = pick([`Find the HCF of ${a} and ${b}.`, `What is the HCF of ${a} and ${b}?`, `What is the highest common factor of ${a} and ${b}?`], prm);
    return AQ(t, ask, `${a} और ${b} का HCF (महत्तम समापवर्तक) क्या है?`,
      g, [isPrime(g) ? b - a : below(g), lcm(a, b), g * 2, g * sp(x * y > 1 ? x * y : 2)], () => hcfSlow([a, b]),
      `${factorLine([a, b])}. The common prime factors, each with its lower power: ${gline(g)}. So the HCF is ${g}.`,
      `${factorLine([a, b])}। उभयनिष्ठ अभाज्य गुणनखंड, प्रत्येक अपनी छोटी घात के साथ: ${gline(g)}। अतः HCF = ${g}।`);
  },
});

// The HCF of two large numbers, by the division method (each step shown).
const euclid = (a, b) => { const st = []; let [p, q] = [Math.max(a, b), Math.min(a, b)]; while (q) { st.push([p, Math.floor(p / q), q, p % q]); [p, q] = [q, p % q]; } return st; };
const division = (id, levels, gs, xs, lo, hi, max = 400) => ({
  id, levels,
  cands: () => cap(pairs(gs, xs, lo, hi).filter(([g, x, y]) => g > 1 && x > 1 && euclid(g * x, g * y).length >= 3 && euclid(g * x, g * y).length <= 6), max),
  build: (t, prm) => {
    const [g, x, y] = prm; const a = g * x, b = g * y; const st = euclid(a, b);
    const steps = st.map(([p, k, q, r]) => `${p} = ${k} × ${q} + ${r}`).join("; ");
    return AQ(t, `Find the HCF of ${a} and ${b} by the division method.`, `भाग विधि से ${a} और ${b} का HCF ज्ञात कीजिए।`,
      g, [...st.map((s) => s[3]).filter((r) => r && r !== g), below(g), g * 2], () => hcfSlow([a, b]),
      `Divide the larger by the smaller, then the divisor by the remainder, until the remainder is 0: ${steps}. The last divisor, ${g}, is the HCF.`,
      `बड़ी संख्या को छोटी से, फिर भाजक को शेषफल से भाग दें, जब तक शेषफल 0 न हो: ${steps}। अंतिम भाजक ${g} ही HCF है।`);
  },
});

// The HCF of three (or four) numbers.
const many = (id, levels, k, gs, xs, lo, hi, max = 500) => ({
  id, levels,
  cands: () => cap(cross(gs, ...Array(k).fill(xs)).filter((p) => { const [g, ...r] = p; return g > 1 && r.every((v, i) => i === 0 || v > r[i - 1]) && gcdA(r) === 1 && gcd(r[0], r[1]) > 1 && g * r[k - 1] <= hi && g * r[0] >= lo; }), max),
  build: (t, prm) => {
    const [g, ...r] = prm; const xs = r.map((v) => v * g); const g2 = gcd(xs[0], xs[1]);
    return AQ(t, pick([`Find the HCF of ${andE(xs)}.`, `What is the HCF of ${andE(xs)}?`], prm),
      `${andH(xs)} का HCF ज्ञात कीजिए।`,
      g, [g2, below(g), gcd(xs[1], xs[2]), g * 2], () => hcfSlow(xs),
      `${factorLine(xs)}. Only the primes common to all ${k} numbers count, each with its lowest power: ${gline(g)}. (${xs[0]} and ${xs[1]} alone have HCF ${g2}, but ${xs[2]}${k > 3 ? ` or ${xs[3]}` : ""} does not share all of it.)`,
      `${factorLine(xs)}। केवल वे अभाज्य जो सभी ${k} संख्याओं में हैं, अपनी सबसे छोटी घात के साथ: ${gline(g)}। (${xs[0]} और ${xs[1]} का HCF ${g2} है, पर ${xs[2]}${k > 3 ? ` या ${xs[3]}` : ""} में वह पूरा नहीं है।)`);
  },
});

// Two numbers written as products of primes.
const PF = [[2, 3], [2, 5], [3, 5], [2, 7], [3, 7], [2, 3, 5], [2, 3, 7], [2, 5, 7]];
const powForm = (ps, es) => ps.map((p, i) => (es[i] > 1 ? `${p}^${es[i]}` : `${p}`)).join(" × ");
const powVal = (ps, es) => ps.reduce((v, p, i) => v * p ** es[i], 1);
const primeForm = {
  id: "hcfPrimeForm", levels: ["easy", "medium"],
  cands: () => cap(cross(PF, [[1, 2], [2, 1], [3, 1], [1, 3], [2, 2], [3, 2], [2, 3], [4, 1], [1, 4]], [[2, 1], [1, 2], [3, 2], [2, 3], [1, 1], [4, 2], [2, 4], [3, 1]], [0, 1]).filter(([ps, e1, e2]) => ps.length === 2 && e1.some((e, i) => e !== e2[i]) && powVal(ps, e1.map((e, i) => Math.min(e, e2[i]))) <= 300), 300),
  build: (t, prm) => {
    const [ps, e1, e2, extra] = prm;
    const A = powForm(ps, e1) + (extra ? " × 11" : ""); const B = powForm(ps, e2) + (extra ? "" : " × 13");
    const lo = ps.map((p, i) => Math.min(e1[i], e2[i])); const hi = ps.map((p, i) => Math.max(e1[i], e2[i]));
    const h = powVal(ps, lo);
    return AQ(t, `What is the HCF of ${A} and ${B}?`, `${A} और ${B} का HCF क्या है?`,
      h, [powVal(ps, [hi[0], lo[1]]), powVal(ps, [lo[0], hi[1]]), powVal(ps, hi), ps[0] * ps[1]], () => hcfSlow([powVal(ps, e1) * (extra ? 11 : 1), powVal(ps, e2) * (extra ? 1 : 13)]),
      `Take only the primes in both, each with its lower power: ${powForm(ps, lo)} = ${h}. (${extra ? 11 : 13} is in only one of them.)`,
      `केवल दोनों में आने वाले अभाज्य, प्रत्येक अपनी छोटी घात के साथ: ${powForm(ps, lo)} = ${h}। (${extra ? 11 : 13} केवल एक में है।)`);
  },
};

// "The greatest number that divides a and b exactly."
const divides = (id, levels, gs, xs, lo, hi, max = 400) => ({
  id, levels,
  cands: () => cap(pairs(gs, xs, lo, hi).filter(([g, x]) => g > 2 && x > 1), max),
  build: (t, prm) => {
    const [g, x, y] = prm; const a = g * x, b = g * y;
    return AQ(t, `What is the greatest number that divides both ${a} and ${b} exactly?`, `वह सबसे बड़ी संख्या कौन-सी है जिससे ${a} और ${b} दोनों पूरी तरह विभाजित हो जाते हैं?`,
      g, [below(g), b - a === g ? g * 2 : b - a, lcm(a, b), g * 2], () => hcfSlow([a, b]),
      `The greatest number dividing both exactly is their HCF. ${factorLine([a, b])}, so the HCF is ${g}. Check: ${a} ÷ ${g} = ${x} and ${b} ÷ ${g} = ${y}.`,
      `दोनों को पूरी तरह विभाजित करने वाली सबसे बड़ी संख्या उनका HCF है। ${factorLine([a, b])}, अतः HCF = ${g}। जाँच: ${a} ÷ ${g} = ${x} और ${b} ÷ ${g} = ${y}।`);
  },
});

// "Which of these is co-prime to N?" - exactly one option shares no factor with N.
const COMPOSITE = range(10, 99).filter((x) => !isPrime(x));
const coprime = {
  id: "hcfCoprime", levels: ["easy", "medium"],
  cands: () => cap(range(24, 150).filter((x) => factor(x).length >= 2 && COMPOSITE.filter((c) => gcd(c, x) === 1).length >= 3), 120),
  build: (t, prm) => {
    const X = prm;
    const good = COMPOSITE.filter((c) => gcd(c, X) === 1 && c !== X);
    const ans = pick(good, [X]);
    const bad = COMPOSITE.filter((c) => gcd(c, X) > 1 && c !== X && c !== ans).sort((a, b) => Math.abs(a - ans) - Math.abs(b - ans) || a - b).slice(0, 3);
    const share = (c) => gcd(c, X);
    return SQ(t, `Which of the following numbers is co-prime to ${X}?`, `निम्नलिखित में से कौन-सी संख्या ${X} के साथ सह-अभाज्य (co-prime) है?`,
      String(ans), bad.map(String), () => { const o = [ans, ...bad].filter((c) => hcfSlow([c, X]) === 1); return o.length === 1 ? o[0] : "none"; },
      `Two numbers are co-prime when their HCF is 1. ${X} = ${pf(X)}. ${bad.map((c) => `${c} shares ${share(c)}`).join(", ")}; ${ans} = ${pf(ans)} shares no prime with ${X}, so HCF(${X}, ${ans}) = 1.`,
      `दो संख्याएँ सह-अभाज्य होती हैं जब उनका HCF 1 हो। ${X} = ${pf(X)}। ${bad.map((c) => `${c} में ${share(c)} उभयनिष्ठ है`).join(", ")}; ${ans} = ${pf(ans)} में ${X} का कोई अभाज्य नहीं, अतः HCF(${X}, ${ans}) = 1।`);
  },
};

// Product and LCM given: HCF = product ÷ LCM.
const fromLcm = (id, levels, gs, xs, maxP, max = 300) => ({
  id, levels,
  cands: () => cap(pairs(gs, xs, 1, 1e9).filter(([g, x, y]) => g > 1 && x > 1 && g * g * x * y <= maxP), max),
  build: (t, prm) => {
    const [g, x, y] = prm; const P = g * g * x * y, Lc = g * x * y;
    return AQ(t, `The product of two numbers is ${P} and their LCM is ${Lc}. What is their HCF?`, `दो संख्याओं का गुणनफल ${P} है और उनका LCM ${Lc} है। उनका HCF क्या है?`,
      g, [x * y, g * 2, below(g), Lc / x], () => { for (let h = 1; h <= Lc; h++) if (h * Lc === P) return h; return 0; },
      `For two numbers, HCF × LCM = product. So HCF = ${P} ÷ ${Lc} = ${g}.`,
      `दो संख्याओं के लिए HCF × LCM = गुणनफल। अतः HCF = ${P} ÷ ${Lc} = ${g}।`);
  },
});
// HCF and LCM given: the product.
const product = {
  id: "hcfLcmProduct", levels: ["easy"],
  cands: () => cap(pairs(range(2, 20), range(2, 12), 1, 1e9).filter(([g, x, y]) => g * x * y <= 400), 300),
  build: (t, prm) => {
    const [g, x, y] = prm; const Lc = g * x * y;
    return AQ(t, `The HCF of two numbers is ${g} and their LCM is ${Lc}. What is the product of the two numbers?`, `दो संख्याओं का HCF ${g} और LCM ${Lc} है। दोनों संख्याओं का गुणनफल क्या है?`,
      g * Lc, [Lc / g, Lc + g, Lc - g, Lc], () => (g * x) * (g * y),
      `For two numbers, product = HCF × LCM = ${g} × ${Lc} = ${g * Lc}. (For example ${g * x} × ${g * y} = ${g * Lc}.)`,
      `दो संख्याओं के लिए गुणनफल = HCF × LCM = ${g} × ${Lc} = ${g * Lc}। (उदाहरण: ${g * x} × ${g * y} = ${g * Lc}।)`);
  },
};

// Two numbers in a ratio (lowest terms), with their sum / difference / LCM.
const RATIOS = cross(range(1, 13), range(2, 15)).filter(([a, b]) => a < b && gcd(a, b) === 1);
const ratioSum = {
  id: "hcfRatioSum", levels: ["easy", "medium"],
  cands: () => cap(cross(RATIOS, range(2, 40)).filter(([[a, b], k]) => (a + b) * k <= 400 && a * b > 2), 400),
  build: (t, prm) => {
    const [[a, b], k] = prm; const S = (a + b) * k;
    return AQ(t, `Two numbers are in the ratio ${a} : ${b} and their sum is ${S}. What is their HCF?`, `दो संख्याएँ ${a} : ${b} के अनुपात में हैं और उनका योग ${S} है। उनका HCF क्या है?`,
      k, [a * k, b * k, a * b * k], () => hcfSlow([a * S / (a + b), b * S / (a + b)]),
      `The numbers are ${a}k and ${b}k; ${a} and ${b} are co-prime, so the HCF is k. ${a + b}k = ${S} gives k = ${k}: the numbers are ${a * k} and ${b * k}, HCF ${k}.`,
      `संख्याएँ ${a}k और ${b}k हैं; ${a} और ${b} सह-अभाज्य हैं, अतः HCF = k। ${a + b}k = ${S} से k = ${k}: संख्याएँ ${a * k} और ${b * k}, HCF ${k}।`);
  },
};
const ratioDiff = {
  id: "hcfRatioDiff", levels: ["easy", "medium"],
  cands: () => cap(cross(RATIOS, range(2, 40)).filter(([[a, b], k]) => b * k <= 300 && b - a > 1), 400),
  build: (t, prm) => {
    const [[a, b], k] = prm; const D = (b - a) * k;
    return AQ(t, `Two numbers are in the ratio ${a} : ${b} and their difference is ${D}. What is their HCF?`, `दो संख्याएँ ${a} : ${b} के अनुपात में हैं और उनका अंतर ${D} है। उनका HCF क्या है?`,
      k, [D, a * k, b * k, a * b * k], () => hcfSlow([a * D / (b - a), b * D / (b - a)]),
      `The numbers are ${a}k and ${b}k with HCF k (${a} and ${b} are co-prime). ${b - a}k = ${D} gives k = ${k}: the numbers are ${a * k} and ${b * k}, HCF ${k}.`,
      `संख्याएँ ${a}k और ${b}k हैं, HCF = k (${a} और ${b} सह-अभाज्य हैं)। ${b - a}k = ${D} से k = ${k}: संख्याएँ ${a * k} और ${b * k}, HCF ${k}।`);
  },
};
const ratioLcm = {
  id: "hcfRatioLcm", levels: ["medium", "hard"],
  cands: () => cap(cross(RATIOS, range(2, 40)).filter(([[a, b], k]) => a > 1 && a * b * k <= 3000), 400),
  build: (t, prm) => {
    const [[a, b], k] = prm; const Lc = a * b * k;
    return AQ(t, `Two numbers are in the ratio ${a} : ${b} and their LCM is ${Lc}. What is their HCF?`, `दो संख्याएँ ${a} : ${b} के अनुपात में हैं और उनका LCM ${Lc} है। उनका HCF क्या है?`,
      k, [a * k, b * k, Lc / (a + b), k * 2], () => { for (let h = 1; ; h++) if (lcm(a * h, b * h) === Lc) return h; },
      `The numbers are ${a}k and ${b}k; ${a} and ${b} are co-prime, so HCF = k and LCM = ${a} × ${b} × k = ${a * b}k. ${a * b}k = ${Lc} gives k = ${k}. The HCF is ${k} (numbers ${a * k} and ${b * k}).`,
      `संख्याएँ ${a}k और ${b}k हैं; ${a} और ${b} सह-अभाज्य हैं, अतः HCF = k और LCM = ${a} × ${b} × k = ${a * b}k। ${a * b}k = ${Lc} से k = ${k}। HCF = ${k} (संख्याएँ ${a * k} और ${b * k})।`);
  },
};
const R3 = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [2, 3, 5], [1, 3, 5], [2, 5, 6], [3, 4, 6], [2, 3, 7], [3, 5, 7], [4, 5, 6], [1, 2, 5], [2, 4, 5], [3, 5, 6], [4, 6, 9], [2, 7, 8]];
const ratio3Lcm = {
  id: "hcfRatio3Lcm", levels: ["hard", "advanced"],
  cands: () => cap(cross(R3, range(3, 60)).filter(([r, k]) => gcdA(r) === 1 && lcmA(r) * k <= 6000), 400),
  build: (t, prm) => {
    const [r, k] = prm; const Lr = lcmA(r); const Lc = Lr * k; const xs = r.map((v) => v * k);
    return AQ(t, `Three numbers are in the ratio ${r.join(" : ")} and their LCM is ${Lc}. What is their HCF?`, `तीन संख्याएँ ${r.join(" : ")} के अनुपात में हैं और उनका LCM ${Lc} है। उनका HCF क्या है?`,
      k, [r[0] * r[1] * r[2] === Lr ? k * 2 : Lc / (r[0] * r[1] * r[2]), xs[0], Lc / r.reduce((a, b) => a + b, 0), k * 2], () => hcfSlow(xs),
      `The numbers are ${r.map((v) => `${v}k`).join(", ")}, so their HCF is k and their LCM is k × LCM(${r.join(", ")}) = ${Lr}k. ${Lr}k = ${Lc} gives k = ${k}. The HCF is ${k} (numbers ${xs.join(", ")}).`,
      `संख्याएँ ${r.map((v) => `${v}k`).join(", ")} हैं, अतः उनका HCF = k और LCM = k × LCM(${r.join(", ")}) = ${Lr}k। ${Lr}k = ${Lc} से k = ${k}। HCF = ${k} (संख्याएँ ${xs.join(", ")})।`);
  },
};

// Greatest number that divides a, b (, c) leaving remainder r in each case.
const rem = (id, levels, k, gs, xs, lo, hi, max = 400) => ({
  id, levels,
  cands: () => cap(cross(gs, range(1, 15), ...Array(k).fill(xs)).filter(([g, r, ...m]) => r < g && m.every((v, i) => i === 0 || v > m[i - 1]) && gcdA(m) === 1 && g * m[k - 1] + r <= hi && g * m[0] + r >= lo && gcdA(m.map((v) => g * v + r)) !== g), max),
  build: (t, prm) => {
    const [g, r, ...m] = prm; const xs = m.map((v) => g * v + r); const ys = xs.map((v) => v - r);
    return AQ(t, `What is the greatest number that divides ${andE(xs)}, leaving a remainder of ${r} in each case?`, `वह सबसे बड़ी संख्या कौन-सी है जिससे ${andH(xs)} को भाग देने पर प्रत्येक दशा में ${r} शेष बचता है?`,
      g, [gcdA(xs), below(g), g + r, g - r], () => { for (let d = Math.min(...xs); d > r; d--) if (xs.every((v) => v % d === r)) return d; return 0; },
      `Take off the remainder: ${xs.map((v, i) => `${v} − ${r} = ${ys[i]}`).join(", ")}. The number must divide all of these exactly: HCF(${ys.join(", ")}) = ${g}, and ${g} is more than ${r}, so the answer is ${g}.`,
      `शेषफल घटाएँ: ${xs.map((v, i) => `${v} − ${r} = ${ys[i]}`).join(", ")}। संख्या इन सबको पूरा विभाजित करे: HCF(${ys.join(", ")}) = ${g}, और ${g} > ${r}, अतः उत्तर ${g}।`);
  },
});
// ... leaving remainders r1, r2, r3 respectively.
const remDiff = (id, levels, gs, xs, lo, hi, max = 400) => ({
  id, levels,
  cands: () => cap(cross(gs, xs, xs, xs, range(1, 10)).filter(([g, a, b, c, s]) => a < b && b < c && gcdA([a, b, c]) === 1 && g > 12 && s + 2 < g && g * c + s <= hi && g * a >= lo), max),
  build: (t, prm) => {
    const [g, a, b, c, s] = prm; const rs = [s, (s + 4) % g, (s * 2 + 1) % g].map((v, i) => v || i + 1);
    const xs = [a, b, c].map((v, i) => g * v + rs[i]); const ys = xs.map((v, i) => v - rs[i]);
    const ok = new Set(rs).size === 3 && rs.every((v) => v < g);
    if (!ok) throw new Error("remainders");
    return AQ(t, `Find the greatest number that divides ${andE(xs)}, leaving remainders ${andE(rs)} respectively.`, `वह सबसे बड़ी संख्या ज्ञात कीजिए जिससे ${andH(xs)} को भाग देने पर क्रमशः ${andH(rs)} शेष बचते हैं।`,
      g, [gcdA(xs) === 1 ? below(g) : gcdA(xs), below(g), g * 2, g + 1], () => { for (let d = Math.min(...xs); d > Math.max(...rs); d--) if (xs.every((v, i) => v % d === rs[i])) return d; return 0; },
      `Take off each remainder: ${xs.map((v, i) => `${v} − ${rs[i]} = ${ys[i]}`).join(", ")}. HCF(${ys.join(", ")}) = ${g}; ${ys.map((v) => `${v} = ${g} × ${v / g}`).join(", ")}. The answer is ${g}.`,
      `प्रत्येक शेषफल घटाएँ: ${xs.map((v, i) => `${v} − ${rs[i]} = ${ys[i]}`).join(", ")}। HCF(${ys.join(", ")}) = ${g}; ${ys.map((v) => `${v} = ${g} × ${v / g}`).join(", ")}। उत्तर ${g}।`);
  },
});
// ... leaving the same remainder in each case: the HCF of the differences.
const sameRem = (id, levels, gs, lo, hi, max = 400) => ({
  id, levels,
  cands: () => cap(cross(gs, range(2, 30), range(1, 15), range(1, 15), range(1, 12)).filter(([g, a, d1, d2, r]) => r < g && gcd(d1, d2) === 1 && d1 !== d2 && g * (a + d1 + d2) + r <= hi && g * a + r >= lo), max),
  build: (t, prm) => {
    const [g, a, d1, d2, r] = prm; const xs = [a, a + d1, a + d1 + d2].map((v) => g * v + r);
    const D = [xs[1] - xs[0], xs[2] - xs[1], xs[2] - xs[0]];
    return AQ(t, `Find the greatest number that divides ${andE(xs)}, leaving the same remainder in each case.`, `वह सबसे बड़ी संख्या ज्ञात कीजिए जिससे ${andH(xs)} को भाग देने पर प्रत्येक दशा में समान शेषफल बचता है।`,
      g, [D[0], D[1], below(g), gcdA(xs) === g ? g * 2 : gcdA(xs)].filter((v) => v !== g), () => { for (let d = xs[2] - xs[0]; d >= 1; d--) if (xs.every((v) => v % d === xs[0] % d)) return d; return 0; },
      `If all three leave the same remainder, their differences divide exactly: ${xs[1]} − ${xs[0]} = ${D[0]}, ${xs[2]} − ${xs[1]} = ${D[1]}, ${xs[2]} − ${xs[0]} = ${D[2]}. HCF(${D.join(", ")}) = ${g}. (Each leaves remainder ${r}.)`,
      `यदि तीनों समान शेषफल छोड़ें, तो उनके अंतर पूरे विभाजित होते हैं: ${xs[1]} − ${xs[0]} = ${D[0]}, ${xs[2]} − ${xs[1]} = ${D[1]}, ${xs[2]} − ${xs[0]} = ${D[2]}। HCF(${D.join(", ")}) = ${g}। (प्रत्येक में शेषफल ${r} बचता है।)`);
  },
});

// Decimals: written as whole numbers of tenths / hundredths.
const decimals = (id, levels, k, gs, xs, places, max = 300) => ({
  id, levels,
  cands: () => cap(cross(gs, places, ...Array(k).fill(xs)).filter(([g, p, ...m]) => g > 1 && m.every((v, i) => i === 0 || v > m[i - 1]) && gcdA(m) === 1 && g * m[k - 1] < 10 ** p * 10 && (g * m[0]) % 10 !== 0), max),
  build: (t, prm) => {
    const [g, p, ...m] = prm; const S = 10 ** p; const ints = m.map((v) => v * g); const xs = ints.map((v) => clean(v / S));
    const word = p === 1 ? "tenths" : "hundredths"; const wordH = p === 1 ? "दशांश" : "शतांश";
    return AQ(t, `Find the HCF of ${andE(xs.map(N))}.`, `${andH(xs.map(N))} का HCF ज्ञात कीजिए।`,
      clean(g / S), [g, clean(g * 10 / S), clean(below(g) / S), clean(lcmA(ints) / S)], () => { const h = hcfSlow(ints); return h / S; },
      `Write them in ${word}: ${ints.join(", ")}. HCF(${ints.join(", ")}) = ${g}, so the HCF is ${g} ${word} = ${N(g / S)}.`,
      `इन्हें ${wordH} में लिखें: ${ints.join(", ")}। HCF(${ints.join(", ")}) = ${g}, अतः HCF = ${g}/${S} = ${N(g / S)}।`);
  },
});

// Fractions in lowest terms: HCF = HCF of numerators / LCM of denominators.
const DENS = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 35];
const fractions = (id, levels, k, max = 300) => ({
  id, levels,
  cands: () => cap(cross(range(2, 6), ...Array(k).fill(range(1, 7)), ...Array(k).fill(DENS)).filter(([g, ...r]) => {
    const a = r.slice(0, k), d = r.slice(k);
    if (!a.every((v, i) => i === 0 || v > a[i - 1]) || gcdA(a) !== 1) return false;
    if (!d.every((v, i) => i === 0 || v !== d[i - 1]) || new Set(d).size !== k) return false;
    if (!a.every((v, i) => gcd(g * v, d[i]) === 1 && g * v !== d[i])) return false;
    return lcmA(d) <= 120 && gcdA(d) > 1;
  }).map(([g, ...r]) => [g, ...r.slice(0, k).map((v, i) => [g * v, r[k + i]])]), max),
  build: (t, prm) => {
    const [g, ...f] = prm; const nums = f.map((x) => x[0]); const dens = f.map((x) => x[1]);
    const H = gcdA(nums), Ld = lcmA(dens), Ln = lcmA(nums), Hd = gcdA(dens);
    const fs = f.map(([p, q]) => `${p}/${q}`);
    return SQ(t, `Find the HCF of ${andE(fs)}.`, `${andH(fs)} का HCF ज्ञात कीजिए।`,
      frac(H, Ld), [frac(Ln, Hd), frac(H, Hd), frac(Ln, Ld), frac(H, dens.reduce((a, b) => a * b, 1)), frac(H + 1, Ld)], () => { const D = lcmA(dens); const w = f.map(([p, q]) => p * D / q); return frac(hcfSlow(w), D); },
      `HCF of fractions = HCF of the numerators ÷ LCM of the denominators = HCF(${nums.join(", ")}) ÷ LCM(${dens.join(", ")}) = ${H}/${Ld}${frac(H, Ld) !== `${H}/${Ld}` ? ` = ${frac(H, Ld)}` : ""}.`,
      `भिन्नों का HCF = अंशों का HCF ÷ हरों का LCM = HCF(${nums.join(", ")}) ÷ LCM(${dens.join(", ")}) = ${H}/${Ld}${frac(H, Ld) !== `${H}/${Ld}` ? ` = ${frac(H, Ld)}` : ""}।`);
  },
});

// How many common factors: the number of divisors of the HCF.
const count = (id, levels, gs, xs, lo, hi, max = 300) => ({
  id, levels,
  cands: () => cap(pairs(gs, xs, lo, hi).filter(([g, x]) => x > 1 && divisors(g).length >= 4), max),
  build: (t, prm) => {
    const [g, x, y] = prm; const a = g * x, b = g * y; const d = divisors(g);
    return AQ(t, `How many common factors do ${a} and ${b} have?`, `${a} और ${b} के कितने उभयनिष्ठ गुणनखंड हैं?`,
      d.length, [d.length - 1, d.length + 1, factor(g).length, d.length - 2], () => divisors(a).filter((v) => b % v === 0).length,
      `The common factors of two numbers are the factors of their HCF. HCF(${a}, ${b}) = ${g} = ${pf(g)}, whose factors are ${d.join(", ")}: ${d.length} in all (1 and ${g} included).`,
      `दो संख्याओं के उभयनिष्ठ गुणनखंड उनके HCF के गुणनखंड होते हैं। HCF(${a}, ${b}) = ${g} = ${pf(g)}, जिसके गुणनखंड ${d.join(", ")} हैं: कुल ${d.length} (1 और ${g} सहित)।`);
  },
});

// How many pairs: sum and HCF / product and HCF / HCF and LCM.
const coprimeSplits = (m) => range(1, Math.floor((m - 1) / 2)).filter((a) => gcd(a, m - a) === 1);
const coprimeFactorPairs = (m) => divisors(m).filter((a) => a * a < m && gcd(a, m / a) === 1);
const sumPairs = {
  id: "hcfSumPairs", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(6, 40), range(5, 22)).filter(([h, m]) => coprimeSplits(m).length >= 2 && h * m <= 800), 300),
  build: (t, prm) => {
    const [h, m] = prm; const S = h * m; const ps = coprimeSplits(m);
    return AQ(t, `The sum of two numbers is ${S} and their HCF is ${h}. How many such pairs of numbers are possible?`, `दो संख्याओं का योग ${S} है और उनका HCF ${h} है। ऐसे कितने संख्या-युग्म संभव हैं?`,
      ps.length, [ps.length + 1, ps.length - 1, Math.floor((m - 1) / 2), ps.length * 2], () => { let c = 0; for (let a = h; a < S - a; a += h) if (hcfSlow([a, S - a]) === h) c++; return c; },
      `Let the numbers be ${h}a and ${h}b with a, b co-prime: ${h}(a + b) = ${S}, so a + b = ${m}. Co-prime pairs adding to ${m}: ${ps.map((a) => `(${a}, ${m - a})`).join(", ")} - ${ps.length} pairs.`,
      `संख्याएँ ${h}a और ${h}b लें, a, b सह-अभाज्य: ${h}(a + b) = ${S}, अतः a + b = ${m}। ${m} योग वाले सह-अभाज्य युग्म: ${ps.map((a) => `(${a}, ${m - a})`).join(", ")} - कुल ${ps.length}।`);
  },
};
const prodPairs = {
  id: "hcfProdPairs", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(4, 30), range(6, 120)).filter(([h, m]) => coprimeFactorPairs(m).length >= 2 && h * h * m <= 30000), 300),
  build: (t, prm) => {
    const [h, m] = prm; const P = h * h * m; const ps = coprimeFactorPairs(m); const all = divisors(m).filter((a) => a * a < m).length;
    return AQ(t, `The product of two numbers is ${P} and their HCF is ${h}. How many such pairs of numbers are possible?`, `दो संख्याओं का गुणनफल ${P} है और उनका HCF ${h} है। ऐसे कितने संख्या-युग्म संभव हैं?`,
      ps.length, [all === ps.length ? ps.length + 1 : all, ps.length + 1, ps.length - 1, ps.length * 2], () => { let c = 0; for (let a = h; a * a < P; a += h) if (P % a === 0 && hcfSlow([a, P / a]) === h) c++; return c; },
      `Let the numbers be ${h}a and ${h}b with a, b co-prime: ${h * h}ab = ${P}, so ab = ${m}. Co-prime pairs with product ${m}: ${ps.map((a) => `(${a}, ${m / a})`).join(", ")} - ${ps.length} pairs.`,
      `संख्याएँ ${h}a और ${h}b लें, a, b सह-अभाज्य: ${h * h}ab = ${P}, अतः ab = ${m}। ${m} गुणनफल वाले सह-अभाज्य युग्म: ${ps.map((a) => `(${a}, ${m / a})`).join(", ")} - कुल ${ps.length}।`);
  },
};
const lcmPairs = {
  id: "hcfLcmPairs", levels: ["advanced"],
  cands: () => cap(cross(range(4, 40), range(6, 210)).filter(([h, m]) => coprimeFactorPairs(m).length >= 2 && h * m <= 6000), 300),
  build: (t, prm) => {
    const [h, m] = prm; const Lc = h * m; const ps = coprimeFactorPairs(m); const all = divisors(m).filter((a) => a * a < m).length;
    return AQ(t, `The HCF of two numbers is ${h} and their LCM is ${Lc}. How many such pairs of numbers are possible?`, `दो संख्याओं का HCF ${h} और LCM ${Lc} है। ऐसे कितने संख्या-युग्म संभव हैं?`,
      ps.length, [all === ps.length ? ps.length + 1 : all, ps.length + 1, ps.length - 1, ps.length * 2], () => { let c = 0; for (let a = h; a * a < h * Lc; a += h) { const b = (h * Lc) / a; if (Number.isInteger(b) && hcfSlow([a, b]) === h) c++; } return c; },
      `Let the numbers be ${h}a and ${h}b with a, b co-prime: their LCM is ${h}ab = ${Lc}, so ab = ${m}. Co-prime pairs with product ${m}: ${ps.map((a) => `(${a}, ${m / a})`).join(", ")} - ${ps.length} pairs.`,
      `संख्याएँ ${h}a और ${h}b लें, a, b सह-अभाज्य: उनका LCM ${h}ab = ${Lc}, अतः ab = ${m}। ${m} गुणनफल वाले सह-अभाज्य युग्म: ${ps.map((a) => `(${a}, ${m / a})`).join(", ")} - कुल ${ps.length}।`);
  },
};

const G = { s: range(2, 15), m: range(4, 40), l: range(8, 99), xl: range(11, 199) };
const X = { s: range(1, 12), m: range(2, 18), l: range(2, 40), xl: range(3, 90) };
const KINDS = guard([
  two("hcfTwoS", ["easy"], G.s, X.s, 8, 120),
  two("hcfTwoM", ["medium"], G.m, X.m, 60, 600),
  two("hcfTwoL", ["hard"], G.l, X.l, 300, 3000),
  division("hcfDivisionL", ["hard", "advanced"], G.l, X.xl, 400, 9999),
  division("hcfDivisionXL", ["advanced"], G.xl, X.xl, 2000, 30000),
  many("hcfThreeS", ["easy"], 3, G.s, X.s, 8, 150),
  many("hcfThreeM", ["medium"], 3, G.m, X.m, 40, 700),
  many("hcfThreeL", ["hard", "advanced"], 3, G.l, X.l, 200, 5000),
  many("hcfFour", ["advanced"], 4, G.m, X.m, 60, 1200),
  primeForm,
  divides("hcfDividesS", ["easy"], G.s, X.s, 10, 150),
  divides("hcfDividesM", ["medium"], G.m, X.m, 80, 900),
  coprime, product,
  fromLcm("hcfFromLcmS", ["easy"], G.s, X.s, 3000),
  fromLcm("hcfFromLcmM", ["medium"], G.m, X.m, 60000),
  ratioSum, ratioDiff, ratioLcm, ratio3Lcm,
  rem("hcfRemS", ["easy"], 2, range(5, 15), range(2, 9), 15, 140),
  rem("hcfRemM", ["medium"], 2, range(6, 40), X.m, 40, 900),
  rem("hcfRemL", ["hard"], 3, range(9, 60), range(2, 25), 100, 2500),
  remDiff("hcfRemDiff", ["hard", "advanced"], range(13, 80), range(2, 25), 150, 3000),
  sameRem("hcfSameRem", ["hard", "advanced"], range(7, 99), 80, 5000),
  decimals("hcfDecM", ["medium"], 2, range(2, 30), range(2, 15), [1, 2]),
  decimals("hcfDecL", ["hard", "advanced"], 3, range(2, 30), range(2, 15), [1, 2]),
  fractions("hcfFrac3H", ["hard"], 3),
  fractions("hcfFrac3", ["advanced"], 3),
  count("hcfCountS", ["easy"], range(4, 30), X.s, 12, 150),
  count("hcfCountM", ["medium", "hard"], range(12, 99), X.m, 60, 1500),
  count("hcfCountL", ["advanced"], range(24, 300), X.l, 300, 9000),
  sumPairs, prodPairs, lcmPairs,
]);

const PREFIX = "HCF & LCM · HCF of Numbers";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
