// HCF & LCM · LCM of Numbers: the LCM of two to four numbers, by prime
// factors, of decimals and fractions; HCF × LCM = product; the least number
// leaving given remainders; the greatest / least n-digit number divisible
// by several numbers; least perfect square; what to add or take away.
// gen.js fills the tests; every answer is worked out again in `v` by a
// different route (walking the multiples, not the formula); the wrong
// options are the slips students make (the HCF, the product, the remainder
// added instead of taken off).
const L = require("./hl-lib");
const { N, gcd, lcm, gcdA, lcmA, hcfSlow, lcmSlow, divisors, factor, pf, isPrime, range, cap, pick, AQ, SQ, frac, guard, cross, andE, andH, clean } = L;
const { fillTopic } = require("./gen");

const pairs = (gs, xs, lo, hi) => cross(gs, xs, xs).filter(([g, x, y]) => x < y && gcd(x, y) === 1 && g * y <= hi && g * x >= lo);
const factorLine = (xs) => xs.map((x) => `${x} = ${pf(x)}`).join(", ");
const lline = (v) => (isPrime(v) ? `${v}` : `${pf(v)} = ${v}`);
const inc = (xs) => xs.every((v, i) => i === 0 || v > xs[i - 1]);
// Sets of k numbers from a pool whose LCM is more than the largest (so the
// LCM is never just one of them) and at most maxL.
const sets = (pool, k, maxL, minL = 0) => cross(...Array(k).fill(pool)).filter((xs) => inc(xs) && lcmA(xs) <= maxL && lcmA(xs) > Math.max(...xs) && lcmA(xs) >= minL && xs.every((v, i) => xs.every((w, j) => i === j || w % v !== 0 || v === 1)));
const halfL = (xs) => lcmA(xs.slice(0, -1)); // the LCM of all but the last: a slip

// The LCM of two numbers.
const two = (id, levels, gs, xs, lo, hi, max = 500) => ({
  id, levels,
  cands: () => cap(pairs(gs, xs, lo, hi).filter(([g, x]) => g > 1 && x > 1), max),
  build: (t, prm) => {
    const [g, x, y] = prm; const a = g * x, b = g * y; const Lc = g * x * y;
    return AQ(t, pick([`Find the LCM of ${a} and ${b}.`, `What is the LCM of ${a} and ${b}?`, `What is the least common multiple of ${a} and ${b}?`], prm), `${a} और ${b} का LCM (लघुत्तम समापवर्त्य) क्या है?`,
      Lc, [g, a * b, Lc * 2, Lc / factor(x)[0][0]], () => lcmSlow([a, b]),
      `${factorLine([a, b])}. Every prime that appears, each with its highest power: ${lline(Lc)}. So the LCM is ${Lc}.`,
      `${factorLine([a, b])}। आने वाला हर अभाज्य, अपनी सबसे बड़ी घात के साथ: ${lline(Lc)}। अतः LCM = ${Lc}।`);
  },
});

// The LCM of three or four numbers ("smallest number divisible by each").
const many = (id, levels, k, pool, maxL, minL, wordy, max = 500) => ({
  id, levels,
  cands: () => cap(sets(pool, k, maxL, minL), max),
  build: (t, prm) => {
    const xs = prm; const Lc = lcmA(xs); const h = halfL(xs);
    const q = wordy ? `What is the smallest number that is exactly divisible by each of ${andE(xs)}?` : pick([`Find the LCM of ${andE(xs)}.`, `What is the LCM of ${andE(xs)}?`], prm);
    const qh = wordy ? `वह सबसे छोटी संख्या कौन-सी है जो ${andH(xs)} में से प्रत्येक से पूरी तरह विभाज्य है?` : `${andH(xs)} का LCM ज्ञात कीजिए।`;
    return AQ(t, q, qh,
      Lc, [h === Lc ? Lc * 2 : h, gcdA(xs) > 1 ? gcdA(xs) : Lc / 2, Lc * 2, xs.reduce((a, b) => a * b, 1)], () => lcmSlow(xs),
      `${wordy ? "The smallest number divisible by each is their LCM. " : ""}${factorLine(xs)}. Take every prime with its highest power: ${lline(Lc)}. So the ${wordy ? "number" : "LCM"} is ${Lc}.`,
      `${wordy ? "प्रत्येक से विभाज्य सबसे छोटी संख्या उनका LCM है। " : ""}${factorLine(xs)}। हर अभाज्य उसकी सबसे बड़ी घात के साथ: ${lline(Lc)}। अतः ${wordy ? "संख्या" : "LCM"} = ${Lc}।`);
  },
});

// Two numbers written as products of primes.
const powForm = (ps, es) => ps.map((p, i) => (es[i] > 1 ? `${p}^${es[i]}` : `${p}`)).join(" × ");
const powVal = (ps, es) => ps.reduce((v, p, i) => v * p ** es[i], 1);
const primeForm = {
  id: "lcmPrimeForm", levels: ["easy", "medium"],
  cands: () => cap(cross([[2, 3], [2, 5], [3, 5], [2, 7], [3, 7]], [[1, 2], [2, 1], [3, 1], [1, 3], [2, 2], [3, 2], [2, 3], [4, 1]], [[2, 1], [1, 2], [3, 2], [2, 3], [1, 1], [2, 4], [3, 1]], [5, 7, 11, 13]).filter(([ps, e1, e2, x]) => !ps.includes(x) && e1.some((e, i) => e !== e2[i]) && powVal(ps, e1.map((e, i) => Math.max(e, e2[i]))) * x <= 6000), 300),
  build: (t, prm) => {
    const [ps, e1, e2, x] = prm;
    const A = powForm(ps, e1); const B = powForm(ps, e2) + ` × ${x}`;
    const hi = ps.map((p, i) => Math.max(e1[i], e2[i])); const lo = ps.map((p, i) => Math.min(e1[i], e2[i]));
    const Lc = powVal(ps, hi) * x;
    return AQ(t, `What is the LCM of ${A} and ${B}?`, `${A} और ${B} का LCM क्या है?`,
      Lc, [powVal(ps, hi), powVal(ps, lo), powVal(ps, e1) * powVal(ps, e2) * x], () => lcmSlow([powVal(ps, e1), powVal(ps, e2) * x]),
      `Take every prime that appears in either, each with its higher power: ${powForm(ps, hi)} × ${x} = ${Lc}.`,
      `किसी में भी आने वाला हर अभाज्य, अपनी बड़ी घात के साथ: ${powForm(ps, hi)} × ${x} = ${Lc}।`);
  },
};

// Product and HCF given: LCM = product ÷ HCF.
const fromHcf = (id, levels, gs, xs, maxP, max = 300) => ({
  id, levels,
  cands: () => cap(pairs(gs, xs, 1, 1e9).filter(([g, x]) => g > 1 && x > 1).filter(([g, x, y]) => g * g * x * y <= maxP), max),
  build: (t, prm) => {
    const [g, x, y] = prm; const P = g * g * x * y; const Lc = g * x * y;
    return AQ(t, `The product of two numbers is ${P} and their HCF is ${g}. What is their LCM?`, `दो संख्याओं का गुणनफल ${P} है और उनका HCF ${g} है। उनका LCM क्या है?`,
      Lc, [P * g, x * y, Lc * 2, Lc / 2], () => { for (let m = g; m <= P; m += g) if (m * g === P) return m; return 0; },
      `For two numbers, HCF × LCM = product. So LCM = ${P} ÷ ${g} = ${Lc}.`,
      `दो संख्याओं के लिए HCF × LCM = गुणनफल। अतः LCM = ${P} ÷ ${g} = ${Lc}।`);
  },
});

// Two numbers in a ratio (lowest terms) and their HCF: LCM = a × b × HCF.
const RATIOS = cross(range(2, 13), range(3, 17)).filter(([a, b]) => a < b && gcd(a, b) === 1);
const ratioHcf = {
  id: "lcmRatioHcf", levels: ["easy", "medium"],
  cands: () => cap(cross(RATIOS, range(2, 30)).filter(([[a, b], k]) => a * b * k <= 2000), 400),
  build: (t, prm) => {
    const [[a, b], k] = prm; const Lc = a * b * k;
    return AQ(t, `Two numbers are in the ratio ${a} : ${b} and their HCF is ${k}. What is their LCM?`, `दो संख्याएँ ${a} : ${b} के अनुपात में हैं और उनका HCF ${k} है। उनका LCM क्या है?`,
      Lc, [a * b, (a + b) * k, a * b * k * k, b * k], () => lcmSlow([a * k, b * k]),
      `The numbers are ${a} × ${k} = ${a * k} and ${b} × ${k} = ${b * k}. ${a} and ${b} are co-prime, so LCM = ${a} × ${b} × ${k} = ${Lc}.`,
      `संख्याएँ ${a} × ${k} = ${a * k} और ${b} × ${k} = ${b * k} हैं। ${a} और ${b} सह-अभाज्य हैं, अतः LCM = ${a} × ${b} × ${k} = ${Lc}।`);
  },
};

// HCF, LCM and one number given: the other.
const other = (id, levels, gs, xs, lo, hi, max = 400) => ({
  id, levels,
  cands: () => cap(pairs(gs, xs, lo, hi).filter(([g, x]) => g > 1 && x > 1).flatMap(([g, x, y]) => [[g, x, y, 0], [g, x, y, 1]]), max),
  build: (t, prm) => {
    const [g, x, y, s] = prm; const a = g * (s ? y : x), b = g * (s ? x : y); const Lc = g * x * y;
    return AQ(t, `The HCF of two numbers is ${g} and their LCM is ${Lc}. If one of the numbers is ${a}, what is the other?`, `दो संख्याओं का HCF ${g} और LCM ${Lc} है। यदि एक संख्या ${a} है, तो दूसरी संख्या क्या है?`,
      b, [Lc / g, b * 2, b + g, b - g, Lc / a * g * 2], () => { for (let m = g; m <= Lc; m += g) if (hcfSlow([a, m]) === g && lcmSlow([a, m]) === Lc) return m; return 0; },
      `HCF × LCM = product of the two numbers: ${g} × ${Lc} = ${a} × other. Other = ${g * Lc} ÷ ${a} = ${b}. (Check: HCF(${a}, ${b}) = ${g}.)`,
      `HCF × LCM = दोनों संख्याओं का गुणनफल: ${g} × ${Lc} = ${a} × दूसरी। दूसरी = ${g * Lc} ÷ ${a} = ${b}। (जाँच: HCF(${a}, ${b}) = ${g}।)`);
  },
});

// "The LCM is how many times the HCF?"
const times = {
  id: "lcmHcfTimes", levels: ["easy"],
  cands: () => cap(pairs(range(2, 20), range(2, 11), 6, 200).filter(([g, x]) => x > 1), 300),
  build: (t, prm) => {
    const [g, x, y] = prm; const a = g * x, b = g * y;
    return AQ(t, `The LCM of ${a} and ${b} is how many times their HCF?`, `${a} और ${b} का LCM उनके HCF का कितना गुना है?`,
      x * y, [x + y, g, x * y * g, y], () => lcmSlow([a, b]) / hcfSlow([a, b]),
      `HCF(${a}, ${b}) = ${g} and LCM = ${g * x * y}. ${g * x * y} ÷ ${g} = ${x * y}.`,
      `HCF(${a}, ${b}) = ${g} और LCM = ${g * x * y}। ${g * x * y} ÷ ${g} = ${x * y}।`);
  },
};

// "Which can never be their HCF / LCM?"
const never = (which) => ({
  id: which === "hcf" ? "hcfNever" : "lcmNever", levels: ["easy", "medium"],
  cands: () => cap((which === "hcf" ? range(24, 600) : range(4, 90)).filter((v) => (which === "hcf" ? divisors(v).length >= 8 : !isPrime(v) && divisors(v).length >= 4)), 150),
  build: (t, prm) => {
    const v = prm;
    if (which === "hcf") {
      // The LCM is v: an HCF must divide it.
      const ds = divisors(v).filter((d) => d > 1 && d < v);
      const good = [ds[ds.length - 1], ds[Math.floor(ds.length / 2)], ds[1]];
      const badList = range(Math.floor(v / 10) + 2, v - 1).filter((c) => v % c !== 0 && !good.includes(c));
      const bad = pick(badList, [v]);
      return SQ(t, `The LCM of two numbers is ${v}. Which of the following can never be their HCF?`, `दो संख्याओं का LCM ${v} है। निम्नलिखित में से कौन-सा कभी उनका HCF नहीं हो सकता?`,
        String(bad), good.map(String), () => { const o = [bad, ...good].filter((c) => v % c !== 0); return o.length === 1 ? o[0] : "none"; },
        `The HCF divides both numbers, and the LCM is a multiple of both, so the HCF always divides the LCM. ${v} ÷ ${bad} is not a whole number, while ${good.map((g) => `${v} ÷ ${g} = ${v / g}`).join(", ")}. So ${bad} can never be the HCF.`,
        `HCF दोनों संख्याओं को विभाजित करता है और LCM दोनों का गुणज है, अतः HCF सदा LCM को विभाजित करता है। ${v} ÷ ${bad} पूर्ण संख्या नहीं, जबकि ${good.map((g) => `${v} ÷ ${g} = ${v / g}`).join(", ")}। अतः ${bad} कभी HCF नहीं हो सकता।`);
    }
    // The HCF is v: an LCM must be a multiple of it.
    const good = [v * 3, v * 5, v * 12];
    const bad = v * pick([4, 6, 7, 9], [v]) + 1 + (v * 7 + 3) % (v - 1);
    return SQ(t, `The HCF of two numbers is ${v}. Which of the following can never be their LCM?`, `दो संख्याओं का HCF ${v} है। निम्नलिखित में से कौन-सा कभी उनका LCM नहीं हो सकता?`,
      String(bad), good.map(String), () => { const o = [bad, ...good].filter((c) => c % v !== 0); return o.length === 1 ? o[0] : "none"; },
      `The LCM is a multiple of both numbers, and both are multiples of the HCF, so the LCM is always a multiple of the HCF. ${good.map((g) => `${g} = ${v} × ${g / v}`).join(", ")}, but ${bad} ÷ ${v} is not a whole number. So ${bad} can never be the LCM.`,
      `LCM दोनों संख्याओं का गुणज है और दोनों संख्याएँ HCF की गुणज हैं, अतः LCM सदा HCF का गुणज होता है। ${good.map((g) => `${g} = ${v} × ${g / v}`).join(", ")}, पर ${bad} ÷ ${v} पूर्ण संख्या नहीं। अतः ${bad} कभी LCM नहीं हो सकता।`);
  },
});

// Least number (other than r itself) leaving remainder r with each divisor.
const rem = (id, levels, k, pool, maxL, max = 400) => ({
  id, levels,
  cands: () => cap(cross(sets(pool, k, maxL, 20), range(1, 11)).filter(([xs, r]) => r < Math.min(...xs)).map(([xs, r]) => [...xs, r]), max),
  build: (t, prm) => {
    const xs = prm.slice(0, -1); const r = prm[prm.length - 1]; const Lc = lcmA(xs); const ans = Lc + r;
    return AQ(t, `What is the least number, other than ${r}, which when divided by ${andE(xs)} leaves a remainder of ${r} in each case?`,
      `${r} को छोड़कर वह सबसे छोटी संख्या कौन-सी है जिसे ${andH(xs)} से भाग देने पर प्रत्येक दशा में ${r} शेष बचता है?`,
      ans, [Lc, Lc - r, 2 * Lc + r, Lc + 2 * r], () => { for (let m = r + 1; ; m++) if (xs.every((d) => m % d === r)) return m; },
      `A number leaving remainder ${r} with each is (a common multiple) + ${r}. LCM(${xs.join(", ")}) = ${Lc}, so the least such number after ${r} is ${Lc} + ${r} = ${ans}.`,
      `प्रत्येक से ${r} शेष छोड़ने वाली संख्या = (एक सार्व गुणज) + ${r}। LCM(${xs.join(", ")}) = ${Lc}, अतः ${r} के बाद सबसे छोटी ऐसी संख्या ${Lc} + ${r} = ${ans}।`);
  },
});
// ... leaving remainders that are each k short of the divisor: LCM − k.
const remDiff = (id, levels, k, pool, maxL, max = 400) => ({
  id, levels,
  cands: () => cap(cross(sets(pool, k, maxL, 30), range(1, 9)).filter(([xs, d]) => d < Math.min(...xs) - 1).map(([xs, d]) => [...xs, d]), max),
  build: (t, prm) => {
    const xs = prm.slice(0, -1); const d = prm[prm.length - 1]; const rs = xs.map((v) => v - d); const Lc = lcmA(xs); const ans = Lc - d;
    return AQ(t, `Find the least number which when divided by ${andE(xs)} leaves remainders ${andE(rs)} respectively.`, `वह सबसे छोटी संख्या ज्ञात कीजिए जिसे ${andH(xs)} से भाग देने पर क्रमशः ${andH(rs)} शेष बचते हैं।`,
      ans, [Lc + d, Lc, Lc - rs[0], 2 * Lc - d], () => { for (let m = 1; ; m++) if (xs.every((v, i) => m % v === rs[i])) return m; },
      `Each remainder is ${d} less than its divisor: ${xs.map((v, i) => `${v} − ${rs[i]} = ${d}`).join(", ")}. So the number + ${d} is divisible by all of them: the least is LCM(${xs.join(", ")}) − ${d} = ${Lc} − ${d} = ${ans}.`,
      `प्रत्येक शेषफल अपने भाजक से ${d} कम है: ${xs.map((v, i) => `${v} − ${rs[i]} = ${d}`).join(", ")}। अतः संख्या + ${d} सभी से विभाज्य है: सबसे छोटी = LCM(${xs.join(", ")}) − ${d} = ${Lc} − ${d} = ${ans}।`);
  },
});
// Smallest number which, increased by k, is divisible by each.
const increased = (id, levels, k, pool, maxL, max = 400) => ({
  id, levels,
  cands: () => cap(cross(sets(pool, k, maxL, 30), range(1, 15)).filter(() => true).map(([xs, d]) => [...xs, d]), max),
  build: (t, prm) => {
    const xs = prm.slice(0, -1); const d = prm[prm.length - 1]; const Lc = lcmA(xs); const ans = Lc - d;
    return AQ(t, `What is the smallest number which, when increased by ${d}, is exactly divisible by ${andE(xs)}?`, `वह सबसे छोटी संख्या कौन-सी है जिसमें ${d} जोड़ने पर वह ${andH(xs)} से पूरी तरह विभाज्य हो जाती है?`,
      ans, [Lc + d, Lc, 2 * Lc - d, Lc - 2 * d], () => { for (let m = 1; ; m++) if (xs.every((v) => (m + d) % v === 0)) return m; },
      `The number + ${d} must be a common multiple; the least is LCM(${xs.join(", ")}) = ${Lc}. So the number is ${Lc} − ${d} = ${ans}.`,
      `संख्या + ${d} एक सार्व गुणज होनी चाहिए; सबसे छोटा LCM(${xs.join(", ")}) = ${Lc}। अतः संख्या = ${Lc} − ${d} = ${ans}।`);
  },
});

// Greatest / least n-digit number divisible by each (with remainder r).
const DIG = { 3: "3-digit", 4: "4-digit", 5: "5-digit", 6: "6-digit" };
const DIGH = { 3: "तीन अंकों", 4: "चार अंकों", 5: "पाँच अंकों", 6: "छह अंकों" };
const nDigit = (id, levels, k, pool, minL, maxL, digits, mode, withRem, max = 400) => ({
  id, levels,
  cands: () => cap(cross(sets(pool, k, maxL, minL), digits, withRem ? range(1, 11) : [0]).filter(([xs, D, r]) => r < Math.min(...xs) && lcmA(xs) * 3 < 10 ** D && ((10 ** D - 1) % lcmA(xs)) !== r && (10 ** (D - 1)) % lcmA(xs) !== r).map(([xs, D, r]) => [xs, D, r]), max),
  build: (t, prm) => {
    const [xs, D, r] = prm; const Lc = lcmA(xs); const top = 10 ** D - 1, low = 10 ** (D - 1);
    let ans, steps, stepsH, slips;
    if (mode === "max") {
      const m = top - ((top - r) % Lc); ans = m; const mult = m - r;
      steps = `The greatest ${D}-digit number is ${top}; ${top} ÷ ${Lc} leaves ${top % Lc}, so the greatest multiple of ${Lc} is ${top} − ${top % Lc} = ${top - (top % Lc)}.`;
      stepsH = `सबसे बड़ी ${D} अंकों की संख्या ${top} है; ${top} ÷ ${Lc} का शेषफल ${top % Lc}, अतः ${Lc} का सबसे बड़ा गुणज ${top} − ${top % Lc} = ${top - (top % Lc)}।`;
      if (r) { steps += ` ${top - (top % Lc)} + ${r} = ${top - (top % Lc) + r}${top - (top % Lc) + r > top ? ` is too big, so take ${top - (top % Lc) - Lc} + ${r} = ${ans}` : ""}.`; stepsH += ` ${top - (top % Lc)} + ${r} = ${top - (top % Lc) + r}${top - (top % Lc) + r > top ? ` बहुत बड़ी है, अतः ${top - (top % Lc) - Lc} + ${r} = ${ans}` : ""}।`; }
      slips = [ans - Lc, r ? mult : ans + Lc, top - (top % lcmA(xs.slice(0, -1))) + r, ans - r - (r ? 0 : Lc * 2)];
    } else {
      const m0 = Math.ceil((low - r) / Lc) * Lc + r; ans = m0 < low ? m0 + Lc : m0;
      const firstMult = Math.ceil(low / Lc) * Lc;
      steps = `The least ${D}-digit number is ${low}; ${low} ÷ ${Lc} leaves ${low % Lc}, so the least multiple of ${Lc} that is ${D} digits long is ${low} + (${Lc} − ${low % Lc}) = ${firstMult}.`;
      stepsH = `सबसे छोटी ${D} अंकों की संख्या ${low} है; ${low} ÷ ${Lc} का शेषफल ${low % Lc}, अतः ${Lc} का सबसे छोटा ${D} अंकों का गुणज ${low} + (${Lc} − ${low % Lc}) = ${firstMult}।`;
      if (r) { steps += ` ${firstMult} + ${r} = ${firstMult + r}${firstMult + r !== ans ? `; but ${ans} = ${ans - r} + ${r} is smaller and still ${D} digits` : ""}.`; stepsH += ` ${firstMult} + ${r} = ${firstMult + r}${firstMult + r !== ans ? `; पर ${ans} = ${ans - r} + ${r} छोटी है और ${D} अंकों की है` : ""}।`; }
      slips = [ans + Lc, r ? ans - r : low - (low % Lc), low + (Lc - (low % Lc)) + Lc + r, low + r];
    }
    const big = mode === "max";
    const qE = `Find the ${big ? "greatest" : "least"} ${DIG[D]} number which ${r ? `when divided by ${andE(xs)} leaves a remainder of ${r} in each case` : `is exactly divisible by ${andE(xs)}`}.`;
    const qH = `${DIGH[D]} की वह ${big ? "सबसे बड़ी" : "सबसे छोटी"} संख्या ज्ञात कीजिए जो ${r ? `${andH(xs)} से भाग देने पर प्रत्येक दशा में ${r} शेष छोड़ती है` : `${andH(xs)} से पूरी तरह विभाज्य है`}।`;
    return AQ(t, qE, qH, ans, slips, () => {
      if (big) { for (let m = top; m >= low; m--) if (xs.every((v) => m % v === r)) return m; } else { for (let m = low; m <= top; m++) if (xs.every((v) => m % v === r)) return m; }
      return 0;
    }, `LCM(${xs.join(", ")}) = ${Lc}. ${steps} The answer is ${ans}.`, `LCM(${xs.join(", ")}) = ${Lc}। ${stepsH} उत्तर ${ans}।`);
  },
});

// Least number to add to / take away from N to be divisible by each.
const adjust = (id, levels, k, pool, maxL, mode, max = 400) => ({
  id, levels,
  cands: () => cap(cross(sets(pool, k, maxL, 40), range(1000, 99999, 37)).filter(([xs, n]) => n % lcmA(xs) !== 0 && n > lcmA(xs) * 2 && n % lcmA(xs) !== lcmA(xs) / 2).map(([xs, n]) => [xs, n]), max),
  build: (t, prm) => {
    const [xs, n] = prm; const Lc = lcmA(xs); const r = n % Lc; const ans = mode === "add" ? Lc - r : r;
    const q = mode === "add" ? `What is the least number that must be added to ${n} so that the sum is exactly divisible by ${andE(xs)}?` : `What is the least number that must be subtracted from ${n} so that the result is exactly divisible by ${andE(xs)}?`;
    const qh = mode === "add" ? `${n} में कम से कम कौन-सी संख्या जोड़ी जाए कि योगफल ${andH(xs)} से पूरी तरह विभाज्य हो जाए?` : `${n} में से कम से कम कौन-सी संख्या घटाई जाए कि शेष ${andH(xs)} से पूरी तरह विभाज्य हो जाए?`;
    return AQ(t, q, qh, ans, [mode === "add" ? r : Lc - r, n % xs[xs.length - 1] || ans + 1, ans + Lc, Lc], () => { for (let d = 0; ; d++) if (xs.every((v) => (mode === "add" ? n + d : n - d) % v === 0)) return d; },
      `A number divisible by ${andE(xs)} is a multiple of their LCM, ${Lc}. ${n} ÷ ${Lc} leaves ${r}, so ${mode === "add" ? `add ${Lc} − ${r} = ${ans} to reach ${n + ans}` : `take away ${r} to reach ${n - r}`}.`,
      `${andH(xs)} से विभाज्य संख्या उनके LCM ${Lc} की गुणज है। ${n} ÷ ${Lc} का शेषफल ${r}, अतः ${mode === "add" ? `${Lc} − ${r} = ${ans} जोड़ने पर ${n + ans}` : `${r} घटाने पर ${n - r}`}।`);
  },
});

// Least number leaving remainder r with each, yet divisible by p.
const multipleOf = {
  id: "lcmMultipleOf", levels: ["advanced"],
  cands: () => cap(cross(sets(range(3, 16), 3, 600, 30), range(1, 9), [7, 11, 13, 17, 19, 23]).filter(([xs, r, p]) => r < Math.min(...xs) && gcd(lcmA(xs), p) === 1 && xs.every((v) => v !== p)).filter(([xs, r, p]) => { const Lc = lcmA(xs); let k = 1; while ((Lc * k + r) % p) k++; return k >= 2 && k <= 12; }), 400),
  build: (t, prm) => {
    const [xs, r, p] = prm; const Lc = lcmA(xs); let k = 1; while ((Lc * k + r) % p) k++; const ans = Lc * k + r;
    const tried = range(1, k).map((j) => Lc * j + r);
    return AQ(t, `What is the least number which when divided by ${andE(xs)} leaves a remainder of ${r} in each case, but is exactly divisible by ${p}?`,
      `वह सबसे छोटी संख्या कौन-सी है जिसे ${andH(xs)} से भाग देने पर प्रत्येक दशा में ${r} शेष बचता है, पर जो ${p} से पूरी तरह विभाज्य है?`,
      ans, [Lc + r, ans + Lc, Lc * k, ans - p].filter((v) => v % p !== 0 || v === ans), () => { for (let m = r + 1; ; m++) if (xs.every((v) => m % v === r) && m % p === 0) return m; },
      `The number is ${Lc}k + ${r} (LCM(${xs.join(", ")}) = ${Lc}). Try k = 1, 2, ...: ${tried.map((v) => `${v} ÷ ${p} ${v % p ? `leaves ${v % p}` : "is exact"}`).join("; ")}. The least is ${ans} = ${p} × ${ans / p}.`,
      `संख्या = ${Lc}k + ${r} (LCM(${xs.join(", ")}) = ${Lc})। k = 1, 2, ... रखें: ${tried.map((v) => `${v} ÷ ${p} ${v % p ? `शेष ${v % p}` : "पूरा"}`).join("; ")}। सबसे छोटी ${ans} = ${p} × ${ans / p}।`);
  },
};

// Least perfect square divisible by each.
const square = (id, levels, pool, max = 300) => ({
  id, levels,
  cands: () => cap(sets(pool, 3, 2000, 30).filter((xs) => { const Lc = lcmA(xs); const m = factor(Lc).filter(([, e]) => e % 2 === 1).reduce((a, [p]) => a * p, 1); return m > 1 && Lc * m <= 90000; }), max),
  build: (t, prm) => {
    const xs = prm; const Lc = lcmA(xs); const odd = factor(Lc).filter(([, e]) => e % 2 === 1).map(([p]) => p); const m = odd.reduce((a, b) => a * b, 1); const S = Lc * m;
    return AQ(t, `What is the least perfect square that is exactly divisible by each of ${andE(xs)}?`, `वह सबसे छोटा पूर्ण वर्ग कौन-सा है जो ${andH(xs)} में से प्रत्येक से पूरी तरह विभाज्य है?`,
      S, [Lc, S * 4, S * 9, Lc * 2], () => { for (let q = 1; ; q++) if (xs.every((v) => (q * q) % v === 0)) return q * q; },
      `LCM(${xs.join(", ")}) = ${Lc} = ${pf(Lc)}. For a square every power must be even, so multiply by ${odd.join(" × ")}: ${Lc} × ${m} = ${S} = ${Math.sqrt(S)}^2.`,
      `LCM(${xs.join(", ")}) = ${Lc} = ${pf(Lc)}। वर्ग के लिए हर घात सम होनी चाहिए, अतः ${odd.join(" × ")} से गुणा करें: ${Lc} × ${m} = ${S} = ${Math.sqrt(S)}^2।`);
  },
});

// Fractions in lowest terms: LCM = LCM of numerators / HCF of denominators.
const fractions = (id, levels, k, max = 300) => ({
  id, levels,
  cands: () => cap(cross(...Array(k).fill(range(1, 16)), ...Array(k).fill([2, 3, 4, 5, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27])).filter((r) => {
    const a = r.slice(0, k), d = r.slice(k);
    if (!inc(a) || !a.every((v, i) => gcd(v, d[i]) === 1)) return false;
    return new Set(d).size === k && gcdA(d) > 1 && lcmA(a) <= 300 && gcdA(a) < lcmA(a);
  }).map((r) => r.slice(0, k).map((v, i) => [v, r[k + i]])), max),
  build: (t, prm) => {
    const f = prm; const nums = f.map((x) => x[0]); const dens = f.map((x) => x[1]);
    const Ln = lcmA(nums), Hd = gcdA(dens), Hn = gcdA(nums), Ld = lcmA(dens);
    const fs = f.map(([p, q]) => `${p}/${q}`);
    return SQ(t, `Find the LCM of ${andE(fs)}.`, `${andH(fs)} का LCM ज्ञात कीजिए।`,
      frac(Ln, Hd), [frac(Ln, Ld), frac(Hn, Hd), frac(Hn, Ld), frac(Ln * 2, Hd), frac(Ln, Hd * 2)], () => { const D = lcmA(dens); const w = f.map(([p, q]) => p * D / q); const top = lcmSlow(w); return frac(top, D); },
      `LCM of fractions = LCM of the numerators ÷ HCF of the denominators = LCM(${nums.join(", ")}) ÷ HCF(${dens.join(", ")}) = ${Ln}/${Hd}${frac(Ln, Hd) !== `${Ln}/${Hd}` ? ` = ${frac(Ln, Hd)}` : ""}.`,
      `भिन्नों का LCM = अंशों का LCM ÷ हरों का HCF = LCM(${nums.join(", ")}) ÷ HCF(${dens.join(", ")}) = ${Ln}/${Hd}${frac(Ln, Hd) !== `${Ln}/${Hd}` ? ` = ${frac(Ln, Hd)}` : ""}।`);
  },
});

// Decimals: written as whole numbers of tenths / hundredths.
const decimals = (id, levels, k, max = 300) => ({
  id, levels,
  cands: () => cap(cross([1, 2], ...Array(k).fill(range(2, 40))).filter(([p, ...m]) => inc(m) && lcmA(m) > Math.max(...m) && lcmA(m) <= 600 && m.some((v) => v % 10 !== 0) && m.every((v) => v < 10 ** p * 3) && (p === 1 || m.some((v) => v % 10 !== 0 && v < 100))), max),
  build: (t, prm) => {
    const [p, ...m] = prm; const S = 10 ** p; const xs = m.map((v) => clean(v / S)); const Lc = lcmA(m);
    const word = p === 1 ? "tenths" : "hundredths"; const wordH = p === 1 ? "दशांश" : "शतांश";
    return AQ(t, `Find the LCM of ${andE(xs.map(N))}.`, `${andH(xs.map(N))} का LCM ज्ञात कीजिए।`,
      clean(Lc / S), [Lc, clean(Lc / (S * 10)), clean(gcdA(m) / S), clean(Lc * 2 / S)], () => lcmSlow(m) / S,
      `Write them in ${word}: ${m.join(", ")}. LCM(${m.join(", ")}) = ${Lc}, so the LCM is ${Lc} ${word} = ${N(Lc / S)}.`,
      `इन्हें ${wordH} में लिखें: ${m.join(", ")}। LCM(${m.join(", ")}) = ${Lc}, अतः LCM = ${Lc}/${S} = ${N(Lc / S)}।`);
  },
});

// HCF, LCM and the sum given: the difference of the numbers.
const sumDiff = {
  id: "lcmSumDiff", levels: ["hard", "advanced"],
  cands: () => cap(pairs(range(3, 40), range(2, 25), 1, 1e9).filter(([g, x, y]) => x > 1 && g * x * y <= 3000), 400),
  build: (t, prm) => {
    const [g, x, y] = prm; const a = g * x, b = g * y; const Lc = g * x * y; const S = a + b;
    return AQ(t, `The HCF and LCM of two numbers are ${g} and ${Lc}, and their sum is ${S}. What is the difference between the two numbers?`, `दो संख्याओं का HCF ${g} और LCM ${Lc} है, और उनका योग ${S} है। दोनों संख्याओं का अंतर क्या है?`,
      b - a, [b - a + g, b - a - g, a + b - g, b - a + 2 * g], () => { for (let m = g; m < S; m += g) { const n = S - m; if (n > m && hcfSlow([m, n]) === g && lcmSlow([m, n]) === Lc) return n - m; } return 0; },
      `Let the numbers be ${g}a and ${g}b with a, b co-prime: ${g}(a + b) = ${S} gives a + b = ${x + y}, and ${g}ab = ${Lc} gives ab = ${x * y}. So a = ${x}, b = ${y}: the numbers are ${a} and ${b}, and their difference is ${b - a}.`,
      `संख्याएँ ${g}a और ${g}b लें, a, b सह-अभाज्य: ${g}(a + b) = ${S} से a + b = ${x + y}, और ${g}ab = ${Lc} से ab = ${x * y}। अतः a = ${x}, b = ${y}: संख्याएँ ${a} और ${b}, अंतर ${b - a}।`);
  },
};
// LCM is m times the HCF, HCF + LCM = S, one number given: the other.
const timesSum = {
  id: "lcmTimesSum", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(6, 60), range(3, 45), [0, 1]).filter(([m, h]) => divisors(m).some((x) => x > 1 && x * x < m && gcd(x, m / x) === 1) && h * m <= 4000), 400),
  build: (t, prm) => {
    const [m, h, s] = prm; const xs = divisors(m).filter((x) => x > 1 && x * x < m && gcd(x, m / x) === 1); const x = xs[s % xs.length]; const y = m / x;
    const S = h * (m + 1); const a = h * x, b = h * y;
    return AQ(t, `The LCM of two numbers is ${m} times their HCF, and the sum of the HCF and the LCM is ${S}. If one of the numbers is ${a}, what is the other?`,
      `दो संख्याओं का LCM उनके HCF का ${m} गुना है, और HCF तथा LCM का योग ${S} है। यदि एक संख्या ${a} है, तो दूसरी संख्या क्या है?`,
      b, [h * m, S - a, b + h, a * 2], () => { const H = S / (m + 1); const Lc = H * m; return (H * Lc) / a; },
      `HCF + ${m} × HCF = ${S}, so ${m + 1} × HCF = ${S} and HCF = ${h}; LCM = ${m} × ${h} = ${h * m}. Other number = HCF × LCM ÷ ${a} = ${h} × ${h * m} ÷ ${a} = ${b}.`,
      `HCF + ${m} × HCF = ${S}, अतः ${m + 1} × HCF = ${S} और HCF = ${h}; LCM = ${m} × ${h} = ${h * m}। दूसरी संख्या = HCF × LCM ÷ ${a} = ${h} × ${h * m} ÷ ${a} = ${b}।`);
  },
};

const G = { s: range(2, 15), m: range(3, 30), l: range(6, 60) };
const X = { s: range(1, 9), m: range(2, 14), l: range(2, 25) };
const P = { s: range(2, 24), m: range(4, 45), l: range(6, 60) };
const KINDS = guard([
  two("lcmTwoS", ["easy"], G.s, X.s, 4, 60),
  two("lcmTwoM", ["medium"], G.m, X.m, 20, 300),
  two("lcmTwoL", ["hard"], G.l, X.l, 60, 1200),
  many("lcmThreeS", ["easy"], 3, P.s, 360, 0, false),
  many("lcmThreeM", ["medium"], 3, P.m, 3000, 100, false),
  many("lcmFour", ["hard", "advanced"], 4, P.l, 20000, 300, false),
  many("lcmDivisibleS", ["easy"], 3, P.s, 360, 0, true),
  many("lcmDivisibleM", ["medium"], 3, P.m, 3000, 100, true),
  primeForm,
  fromHcf("lcmFromHcfS", ["easy"], G.s, X.s, 4000),
  fromHcf("lcmFromHcfM", ["medium"], G.m, X.m, 80000),
  ratioHcf,
  other("lcmOtherS", ["easy"], G.s, X.s, 4, 120),
  other("lcmOtherM", ["medium"], G.m, X.m, 20, 600),
  other("lcmOtherL", ["hard"], G.l, X.l, 100, 3000),
  times, never("hcf"), never("lcm"),
  rem("lcmRemS", ["easy"], 3, range(3, 16), 240),
  rem("lcmRemM", ["medium"], 3, range(4, 36), 1500),
  rem("lcmRemL", ["hard"], 4, range(4, 40), 3000),
  remDiff("lcmRemDiffM", ["medium", "hard"], 3, range(6, 40), 2000),
  remDiff("lcmRemDiffL", ["advanced"], 4, range(6, 48), 6000),
  increased("lcmIncreasedM", ["medium"], 3, range(4, 36), 1500),
  increased("lcmIncreasedL", ["hard", "advanced"], 4, range(4, 40), 5000),
  nDigit("lcmMax4", ["medium", "hard"], 3, range(4, 36), 60, 1200, [4], "max", false),
  nDigit("lcmMin4", ["medium", "hard"], 3, range(4, 36), 60, 1200, [4], "min", false),
  nDigit("lcmMax5", ["hard", "advanced"], 4, range(6, 48), 200, 9000, [5], "max", false),
  nDigit("lcmMin5", ["advanced"], 4, range(6, 48), 200, 9000, [5], "min", false),
  nDigit("lcmMaxRem", ["hard", "advanced"], 3, range(6, 40), 100, 3000, [4, 5], "max", true),
  nDigit("lcmMinRem", ["hard", "advanced"], 3, range(6, 40), 100, 3000, [4, 5], "min", true),
  adjust("lcmAdd", ["medium", "hard"], 3, range(4, 36), 1200, "add"),
  adjust("lcmSub", ["medium", "hard"], 3, range(4, 36), 1200, "sub"),
  multipleOf,
  square("lcmSquareH", ["hard"], range(4, 30)),
  square("lcmSquareA", ["advanced"], range(6, 45)),
  fractions("lcmFrac3H", ["hard"], 3),
  fractions("lcmFrac3", ["advanced"], 3),
  decimals("lcmDecM", ["medium"], 2),
  decimals("lcmDecL", ["hard"], 3),
  sumDiff, timesSum,
]);

const PREFIX = "HCF & LCM · LCM of Numbers";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
