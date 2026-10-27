// Simple & Compound Interest · Simple Interest: every kind of question, level
// by level, with the numbers each can be asked with. gen.js fills the tests;
// every answer is worked out again in `v`, and the wrong options are the
// slips students make (one year's interest for the whole time, the amount
// for the interest, months taken as years, m instead of m − 1).
const L = require("./sci-lib");
const { Q, choices, n, pct, clean, isInt, cross, whole, stepOf, who, money, nicePct, yrs, YQ, thin, pick, PRINC, SI_RATES, TIMES, times, timesH, become, becomeH, guard } = L;
const { fillTopic } = require("./gen");

const si = (P, R, T) => clean(P * R * T / 100);
const ra = (r) => `${pct(r)} per annum`;
const raH = (r) => `${pct(r)} वार्षिक दर`;
const PRT = () => cross(PRINC, SI_RATES, TIMES).filter(([P, R, T]) => whole(P * R * T / 100) && P * R * T / 100 >= 100);
const step = (x) => Math.max(stepOf(x), 10);

// ---------------------------------------------------------------- EASY
const siFind = {
  id: "siFind", group: "prt", levels: ["easy"],
  cands: PRT,
  build: (t, prm) => {
    const [P, R, T] = prm; const I = si(P, R, T);
    const [q, qh] = pick([
      [`What is the simple interest on ₹${n(P)} at ${ra(R)} for ${T} years?`, `₹${n(P)} पर ${raH(R)} से ${T} वर्ष का साधारण ब्याज कितना होगा?`],
      [`Find the simple interest on a loan of ₹${n(P)} taken for ${T} years at ${ra(R)}.`, `${T} वर्ष के लिए ${raH(R)} से लिए गए ₹${n(P)} के ऋण पर साधारण ब्याज ज्ञात कीजिए।`],
    ], prm);
    return Q(t, q, qh, choices(I, money, [P * R / 100, P + I, I * 2], { step: step(I) }), 0, () => money(P * T * R / 100),
      `SI = P × R × T ÷ 100 = ${n(P)} × ${n(R)} × ${T} ÷ 100 = ${money(I)}.`,
      `साधारण ब्याज = P × R × T ÷ 100 = ${n(P)} × ${n(R)} × ${T} ÷ 100 = ${money(I)}।`);
  },
};

const amtFind = {
  id: "amtFind", group: "prt", levels: ["easy"],
  cands: PRT,
  build: (t, prm) => {
    const [P, R, T] = prm; const I = si(P, R, T), A = clean(P + I); const w = who(prm);
    return Q(t, `${w.name} deposits ₹${n(P)} at ${ra(R)} simple interest. How much will ${w.he} get back after ${T} years?`,
      `${w.nameH} ₹${n(P)}, ${pct(R)} वार्षिक साधारण ब्याज पर जमा ${w.v("करता", "करती")} है। ${T} वर्ष बाद उसे कुल कितनी राशि मिलेगी?`,
      choices(A, money, [I, P + P * R / 100, A + P * R / 100], { step: step(A) }), 0, () => money(P * (1 + R * T / 100)),
      `Interest = ${n(P)} × ${n(R)} × ${T} ÷ 100 = ₹${n(I)}. Amount = ${n(P)} + ${n(I)} = ${money(A)}.`,
      `ब्याज = ${n(P)} × ${n(R)} × ${T} ÷ 100 = ₹${n(I)}। मिश्रधन = ${n(P)} + ${n(I)} = ${money(A)}।`);
  },
};

const rateFromSI = {
  id: "rateFromSI", group: "prt", levels: ["easy"],
  cands: PRT,
  build: (t, prm) => {
    const [P, R, T] = prm; const I = si(P, R, T);
    return Q(t, `The simple interest on ₹${n(P)} for ${T} years is ₹${n(I)}. What is the rate of interest per annum?`,
      `₹${n(P)} पर ${T} वर्ष का साधारण ब्याज ₹${n(I)} है। वार्षिक ब्याज दर कितनी है?`,
      choices(R, pct, [R * T, R / 2, R + 2], { step: 1 }), 0, () => pct(I * 100 / (P * T)),
      `R = SI × 100 ÷ (P × T) = ${n(I)} × 100 ÷ (${n(P)} × ${T}) = ${pct(R)}.`,
      `दर = ब्याज × 100 ÷ (मूलधन × समय) = ${n(I)} × 100 ÷ (${n(P)} × ${T}) = ${pct(R)}।`);
  },
};

const rateFromAmt = {
  id: "rateFromAmt", group: "prt", levels: ["easy"],
  cands: PRT,
  build: (t, prm) => {
    const [P, R, T] = prm; const I = si(P, R, T), A = clean(P + I);
    return Q(t, `A sum of ₹${n(P)} amounts to ₹${n(A)} in ${T} years at simple interest. What is the rate of interest per annum?`,
      `₹${n(P)} की राशि साधारण ब्याज पर ${T} वर्ष में ₹${n(A)} हो जाती है। वार्षिक ब्याज दर कितनी है?`,
      choices(R, pct, [R * T, A * 100 / (P * T) - 100, R + 2], { step: 1 }), 0, () => pct((A - P) * 100 / (P * T)),
      `Interest = ${n(A)} − ${n(P)} = ₹${n(I)}. Rate = ${n(I)} × 100 ÷ (${n(P)} × ${T}) = ${pct(R)}.`,
      `ब्याज = ${n(A)} − ${n(P)} = ₹${n(I)}। दर = ${n(I)} × 100 ÷ (${n(P)} × ${T}) = ${pct(R)}।`);
  },
};

const timeFromSI = {
  id: "timeFromSI", group: "prt", levels: ["easy"],
  cands: PRT,
  build: (t, prm) => {
    const [P, R, T] = prm; const I = si(P, R, T);
    return YQ(t, `In how many years will ₹${n(P)} earn a simple interest of ₹${n(I)} at ${ra(R)}?`,
      `₹${n(P)} पर ${raH(R)} से कितने वर्ष में ₹${n(I)} का साधारण ब्याज मिलेगा?`,
      T, [T + 1, T - 1, T * 2], () => I * 100 / (P * R),
      `T = SI × 100 ÷ (P × R) = ${n(I)} × 100 ÷ (${n(P)} × ${n(R)}) = ${yrs(T)}.`,
      `समय = ब्याज × 100 ÷ (मूलधन × दर) = ${n(I)} × 100 ÷ (${n(P)} × ${n(R)}) = ${T} वर्ष।`);
  },
};

const timeFromAmt = {
  id: "timeFromAmt", group: "prt", levels: ["easy", "medium"],
  cands: PRT,
  build: (t, prm) => {
    const [P, R, T] = prm; const I = si(P, R, T), A = clean(P + I);
    return YQ(t, `In how many years will ₹${n(P)} amount to ₹${n(A)} at ${ra(R)} simple interest?`,
      `₹${n(P)} की राशि ${pct(R)} वार्षिक साधारण ब्याज पर कितने वर्ष में ₹${n(A)} हो जाएगी?`,
      T, [T + 1, T - 1, T + 2], () => (A - P) * 100 / (P * R),
      `Interest needed = ${n(A)} − ${n(P)} = ₹${n(I)}. One year's interest = ${n(P)} × ${n(R)} ÷ 100 = ₹${n(P * R / 100)}. Time = ${n(I)} ÷ ${n(P * R / 100)} = ${yrs(T)}.`,
      `आवश्यक ब्याज = ${n(A)} − ${n(P)} = ₹${n(I)}। एक वर्ष का ब्याज = ${n(P)} × ${n(R)} ÷ 100 = ₹${n(P * R / 100)}। समय = ${n(I)} ÷ ${n(P * R / 100)} = ${T} वर्ष।`);
  },
};

const principalFromSI = {
  id: "principalFromSI", group: "prt", levels: ["easy"],
  cands: PRT,
  build: (t, prm) => {
    const [P, R, T] = prm; const I = si(P, R, T);
    return Q(t, `On what sum will the simple interest at ${ra(R)} for ${T} years be ₹${n(I)}?`,
      `किस राशि पर ${raH(R)} से ${T} वर्ष का साधारण ब्याज ₹${n(I)} होगा?`,
      choices(P, money, [I * 100 / R, I * R * T / 100, P + I], { step: step(P) }), 0, () => money(I * 100 / (R * T)),
      `P = SI × 100 ÷ (R × T) = ${n(I)} × 100 ÷ (${n(R)} × ${T}) = ${money(P)}.`,
      `मूलधन = ब्याज × 100 ÷ (दर × समय) = ${n(I)} × 100 ÷ (${n(R)} × ${T}) = ${money(P)}।`);
  },
};

const principalFromAmt = {
  id: "principalFromAmt", group: "prt", levels: ["easy", "medium"],
  cands: PRT,
  build: (t, prm) => {
    const [P, R, T] = prm; const A = clean(P + si(P, R, T)); const RT = clean(R * T);
    return Q(t, `What sum of money will amount to ₹${n(A)} in ${T} years at ${ra(R)} simple interest?`,
      `कौन-सी राशि ${pct(R)} वार्षिक साधारण ब्याज पर ${T} वर्ष में ₹${n(A)} हो जाएगी?`,
      choices(P, money, [A * (1 - RT / 100), A - A * R / 100, A * 100 / (100 + R)], { step: step(P) }), 0, () => money(A / (1 + R * T / 100)),
      `In ${T} years the sum grows by ${n(R)} × ${T} = ${n(RT)}%, so amount = P × ${n(100 + RT)}/100. P = ${n(A)} × 100 ÷ ${n(100 + RT)} = ${money(P)}. (Taking ${n(RT)}% off ${n(A)} is wrong: the interest is on P, not on the amount.)`,
      `${T} वर्ष में राशि ${n(R)} × ${T} = ${n(RT)}% बढ़ती है, अतः मिश्रधन = P × ${n(100 + RT)}/100। P = ${n(A)} × 100 ÷ ${n(100 + RT)} = ${money(P)}। (${n(A)} में से ${n(RT)}% घटाना गलत है: ब्याज मूलधन पर लगता है, मिश्रधन पर नहीं।)`);
  },
};

const nTimesRate = {
  id: "nTimesRate", levels: ["easy", "medium"],
  cands: () => cross([2, 3, 4, 5], [2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 25, 30, 40]).filter(([m, T]) => { const R = (m - 1) * 100 / T; return R >= 4 && R <= 50 && nicePct(R) && isInt(R * 2); }),
  build: (t, prm) => {
    const [m, T] = prm; const R = clean((m - 1) * 100 / T);
    return Q(t, `A sum of money ${times(m)} in ${T} years at simple interest. What is the rate of interest per annum?`,
      `कोई राशि साधारण ब्याज पर ${T} वर्ष में ${timesH(m)}। वार्षिक ब्याज दर कितनी है?`,
      choices(R, pct, [m * 100 / T, 100 / T, R * 2], { step: 5 }), 0, () => pct((m - 1) * 100 / T),
      `The interest is ${m} − 1 = ${m - 1} times the sum, i.e. ${n((m - 1) * 100)}% of it in ${T} years. Rate = ${n((m - 1) * 100)} ÷ ${T} = ${pct(R)}.`,
      `ब्याज राशि का ${m} − 1 = ${m - 1} गुना है, यानी ${T} वर्ष में ${n((m - 1) * 100)}%। दर = ${n((m - 1) * 100)} ÷ ${T} = ${pct(R)}।`);
  },
};

const monthsSI = {
  id: "monthsSI", levels: ["easy", "medium"],
  cands: () => cross(PRINC.filter((p) => p <= 100000), [4, 5, 6, 8, 9, 10, 12, 15, 16, 18], [3, 4, 6, 8, 9, 15, 18, 20]).filter(([P, R, M]) => whole(P * R * M / 1200) && P * R * M / 1200 >= 50),
  build: (t, prm) => {
    const [P, R, M] = prm; const I = clean(P * R * M / 1200);
    return Q(t, `What is the simple interest on ₹${n(P)} at ${ra(R)} for ${M} months?`,
      `₹${n(P)} पर ${raH(R)} से ${M} महीने का साधारण ब्याज कितना होगा?`,
      choices(I, money, [P * R * M / 100, P * R / 100, I * 2], { step: step(I) }), 0, () => money(P * R * (M / 12) / 100),
      `${M} months = ${M}/12 year. SI = ${n(P)} × ${n(R)} × ${M} ÷ (100 × 12) = ${money(I)}.`,
      `${M} महीने = ${M}/12 वर्ष। साधारण ब्याज = ${n(P)} × ${n(R)} × ${M} ÷ (100 × 12) = ${money(I)}।`);
  },
};

const lendGain = {
  id: "lendGain", levels: ["easy", "medium"],
  cands: () => cross(PRINC.filter((p) => p >= 5000), [5, 6, 8, 9, 10, 12], [8, 10, 12, 12.5, 14, 15, 16, 18], [2, 3, 4, 5]).filter(([P, r1, r2, T]) => r2 > r1 && r2 - r1 <= 8 && whole(P * (r2 - r1) * T / 100)),
  build: (t, prm) => {
    const [P, r1, r2, T] = prm; const w = who(prm); const G = clean(P * (r2 - r1) * T / 100);
    return Q(t, `${w.name} borrows ₹${n(P)} at ${ra(r1)} simple interest and lends the whole of it at ${ra(r2)} simple interest. What is ${w.his} gain in ${T} years?`,
      `${w.nameH} ₹${n(P)}, ${pct(r1)} वार्षिक साधारण ब्याज पर उधार ${w.v("लेता", "लेती")} है और पूरी राशि ${pct(r2)} वार्षिक साधारण ब्याज पर उधार दे ${w.v("देता", "देती")} है। ${T} वर्ष में उसका लाभ कितना होगा?`,
      choices(G, money, [P * r2 * T / 100, P * (r2 - r1) / 100, P * r1 * T / 100], { step: step(G) }), 0, () => money(P * r2 * T / 100 - P * r1 * T / 100),
      `${w.He} earns ${n(r2)}% and pays ${n(r1)}%, a gain of ${n(r2 - r1)}% a year. Gain = ${n(P)} × ${n(r2 - r1)} × ${T} ÷ 100 = ${money(G)}.`,
      `${w.v("वह", "वह")} ${n(r2)}% कमाता/कमाती है और ${n(r1)}% चुकाता/चुकाती है - हर वर्ष ${n(r2 - r1)}% का लाभ। लाभ = ${n(P)} × ${n(r2 - r1)} × ${T} ÷ 100 = ${money(G)}।`.replace("कमाता/कमाती", w.v("कमाता", "कमाती")).replace("चुकाता/चुकाती", w.v("चुकाता", "चुकाती")));
  },
};

// SI is a/b of the sum in T years.
const FRACS = [[1, 4], [1, 5], [2, 5], [3, 5], [3, 8], [1, 2], [3, 4], [1, 3], [2, 3], [4, 5], [7, 20], [9, 20], [6, 25], [9, 25], [3, 10], [7, 10], [9, 10], [5, 8], [7, 8], [16, 25]];
const siFraction = {
  id: "siFraction", levels: ["easy", "medium"],
  cands: () => cross(FRACS, [2, 3, 4, 5, 6, 8, 10]).map(([[a, b], T]) => [a, b, T]).filter(([a, b, T]) => { const R = a * 100 / (b * T); return R >= 3 && R <= 25 && nicePct(R) && isInt(R * 2); }),
  build: (t, prm) => {
    const [a, b, T] = prm; const R = clean(a * 100 / (b * T));
    return Q(t, `At what rate per annum will the simple interest on a sum be ${a}/${b} of the sum in ${T} years?`,
      `किस वार्षिक दर से किसी राशि पर ${T} वर्ष में साधारण ब्याज उस राशि का ${a}/${b} हो जाएगा?`,
      choices(R, pct, [a * 100 / b, R * 2, (a + b) * 100 / (b * T)], { step: 1 }), 0, () => pct((a / b) * 100 / T),
      `Take the sum as 100: the interest is ${a}/${b} × 100 = ${n(a * 100 / b)} in ${T} years. Rate = ${n(a * 100 / b)} ÷ ${T} = ${pct(R)}.`,
      `राशि 100 मानें: ${T} वर्ष में ब्याज ${a}/${b} × 100 = ${n(a * 100 / b)} है। दर = ${n(a * 100 / b)} ÷ ${T} = ${pct(R)}।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
// [P, R, t1, t2]: the amounts after t1 and t2 years.
const TA = () => cross(PRINC.filter((p) => p <= 100000), [4, 5, 6, 8, 10, 12, 12.5, 15], [2, 3, 4, 5], [3, 4, 5, 6, 7, 8]).filter(([P, R, t1, t2]) => t2 > t1 && whole(P * R / 100));
const twoAmtP = {
  id: "twoAmtP", group: "ta", levels: ["medium", "hard"],
  cands: TA,
  build: (t, prm) => {
    const [P, R, t1, t2] = prm; const y = clean(P * R / 100); const A1 = clean(P + y * t1), A2 = clean(P + y * t2);
    return Q(t, `A sum of money lent at simple interest amounts to ₹${n(A1)} in ${t1} years and to ₹${n(A2)} in ${t2} years. What is the principal?`,
      `साधारण ब्याज पर दी गई एक राशि ${t1} वर्ष में ₹${n(A1)} और ${t2} वर्ष में ₹${n(A2)} हो जाती है। मूलधन कितना है?`,
      choices(P, money, [A1 - (A2 - A1), A1 - y, A2 - y * t1], { step: step(P) }), 0, () => money(A1 - (A2 - A1) / (t2 - t1) * t1),
      `Interest for ${t2 - t1} year${t2 - t1 > 1 ? "s" : ""} = ${n(A2)} − ${n(A1)} = ₹${n(A2 - A1)}, so one year's interest = ₹${n(y)}. Interest for ${t1} years = ₹${n(y * t1)}. Principal = ${n(A1)} − ${n(y * t1)} = ${money(P)}.`,
      `${t2 - t1} वर्ष का ब्याज = ${n(A2)} − ${n(A1)} = ₹${n(A2 - A1)}, अतः एक वर्ष का ब्याज = ₹${n(y)}। ${t1} वर्ष का ब्याज = ₹${n(y * t1)}। मूलधन = ${n(A1)} − ${n(y * t1)} = ${money(P)}।`);
  },
};

const twoAmtR = {
  id: "twoAmtR", group: "ta", levels: ["medium", "hard"],
  cands: TA,
  build: (t, prm) => {
    const [P, R, t1, t2] = prm; const y = clean(P * R / 100); const A1 = clean(P + y * t1), A2 = clean(P + y * t2);
    return Q(t, `A sum of money at simple interest amounts to ₹${n(A1)} in ${t1} years and to ₹${n(A2)} in ${t2} years. What is the rate of interest per annum?`,
      `साधारण ब्याज पर कोई राशि ${t1} वर्ष में ₹${n(A1)} और ${t2} वर्ष में ₹${n(A2)} हो जाती है। वार्षिक ब्याज दर कितनी है?`,
      choices(R, pct, [y * 100 / A1, (A2 - A1) * 100 / A1, y * 100 / A2], { step: 1, near: 0.4 }), 0, () => pct((A2 - A1) / (t2 - t1) * 100 / (A1 - (A2 - A1) / (t2 - t1) * t1)),
      `One year's interest = (${n(A2)} − ${n(A1)}) ÷ ${t2 - t1} = ₹${n(y)}. Principal = ${n(A1)} − ${t1} × ${n(y)} = ₹${n(P)}. Rate = ${n(y)} × 100 ÷ ${n(P)} = ${pct(R)}.`,
      `एक वर्ष का ब्याज = (${n(A2)} − ${n(A1)}) ÷ ${t2 - t1} = ₹${n(y)}। मूलधन = ${n(A1)} − ${t1} × ${n(y)} = ₹${n(P)}। दर = ${n(y)} × 100 ÷ ${n(P)} = ${pct(R)}।`);
  },
};

const nTimesTime = {
  id: "nTimesTime", levels: ["medium", "hard"],
  cands: () => cross([2, 3, 4], [2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20], [3, 4, 5, 6, 7, 8, 9, 10]).filter(([m1, T1, m2]) => m2 > m1 && isInt(T1 * (m2 - 1) / (m1 - 1)) && nicePct((m1 - 1) * 100 / T1) && T1 * (m2 - 1) / (m1 - 1) <= 60),
  build: (t, prm) => {
    const [m1, T1, m2] = prm; const T2 = clean(T1 * (m2 - 1) / (m1 - 1)); const R = clean((m1 - 1) * 100 / T1);
    return YQ(t, `A sum of money ${times(m1)} in ${T1} years at simple interest. In how many years will it ${become(m2)} at the same rate?`,
      `कोई राशि साधारण ब्याज पर ${T1} वर्ष में ${timesH(m1)}। उसी दर पर वह कितने वर्ष में ${becomeH(m2)}?`,
      T2, [T1 * m2 / m1, T1 * (m2 - 1), T1 * m2 / 2], () => (m2 - 1) * 100 / ((m1 - 1) * 100 / T1),
      `${m1 === 2 ? `In ${T1} years the interest equals the sum` : `In ${T1} years the interest is ${m1 - 1} times the sum`} (the rate is ${pct(R)}). To ${become(m2)} the interest must be ${m2 - 1} times the sum, which takes ${T1} × ${m2 - 1}/${m1 - 1} = ${yrs(T2)}.`,
      `${m1 === 2 ? `${T1} वर्ष में ब्याज राशि के बराबर है` : `${T1} वर्ष में ब्याज राशि का ${m1 - 1} गुना है`} (दर ${pct(R)})। ${m2} गुनी होने के लिए ब्याज राशि का ${m2 - 1} गुना होना चाहिए, जिसमें ${T1} × ${m2 - 1}/${m1 - 1} = ${T2} वर्ष लगेंगे।`);
  },
};

const rateHigher = {
  id: "rateHigher", levels: ["medium", "hard"],
  cands: () => cross(PRINC, [1, 2, 3, 4, 5], [2, 3, 4, 5, 6]).filter(([P, d, T]) => whole(P * d * T / 100) && P * d * T / 100 >= 100),
  build: (t, prm) => {
    const [P, d, T] = prm; const X = clean(P * d * T / 100);
    return Q(t, `A sum was lent at simple interest for ${T} years. Had the rate been ${d}% higher, it would have earned ₹${n(X)} more. What was the sum?`,
      `एक राशि ${T} वर्ष के लिए साधारण ब्याज पर दी गई। यदि दर ${d}% अधिक होती, तो उस पर ₹${n(X)} अधिक ब्याज मिलता। वह राशि कितनी थी?`,
      choices(P, money, [X * 100 / d, X * 100 / T, X * d * T], { step: step(P) }), 0, () => money(X * 100 / (d * T)),
      `The extra ${d}% for ${T} years is ${d * T}% of the sum. ${d * T}% of the sum = ${n(X)}, so the sum = ${n(X)} × 100 ÷ ${d * T} = ${money(P)}.`,
      `${T} वर्ष के लिए अतिरिक्त ${d}% राशि का ${d * T}% है। राशि का ${d * T}% = ${n(X)}, अतः राशि = ${n(X)} × 100 ÷ ${d * T} = ${money(P)}।`);
  },
};

const rateEqTime = {
  id: "rateEqTime", levels: ["medium", "hard"],
  cands: () => cross(PRINC, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).filter(([P, R]) => whole(P * R * R / 100)),
  build: (t, prm) => {
    const [P, R] = prm; const I = clean(P * R * R / 100);
    return Q(t, `The simple interest on ₹${n(P)} is ₹${n(I)}. The rate of interest per annum (in %) and the time (in years) are equal. What is the rate?`,
      `₹${n(P)} पर साधारण ब्याज ₹${n(I)} है। वार्षिक ब्याज दर (% में) और समय (वर्षों में) बराबर हैं। दर कितनी है?`,
      choices(R, pct, [R + 1, R - 1, I * 100 / P / 2], { step: 2 }), 0, () => pct(Math.sqrt(I * 100 / P)),
      `SI = P × R × R ÷ 100, so R² = ${n(I)} × 100 ÷ ${n(P)} = ${n(R * R)}. R = ${pct(R)} (and the time is ${R} years).`,
      `ब्याज = P × R × R ÷ 100, अतः R² = ${n(I)} × 100 ÷ ${n(P)} = ${n(R * R)}। R = ${pct(R)} (और समय ${R} वर्ष)।`);
  },
};

// [S, r1, r2, k, T]: k tenths of S at r1%, the rest at r2%, for T years.
const SPLIT = () => cross(PRINC.filter((p) => p >= 5000 && p <= 100000), [4, 5, 6, 8, 10], [6, 8, 10, 12, 15], [2, 3, 4, 6, 7, 8], [1, 2, 3])
  .filter(([S, r1, r2, k, T]) => r2 > r1 && whole(S * k / 10) && whole(S * k / 10 * r1 * T / 100) && whole(S * (10 - k) / 10 * r2 * T / 100));
const splitTwo = {
  id: "splitTwo", levels: ["medium", "hard", "advanced"],
  cands: () => thin(SPLIT(), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [S, r1, r2, k, T] = prm; const x = clean(S * k / 10), y = clean(S - x); const I = clean((x * r1 + y * r2) * T / 100);
    const yr = T === 1 ? "1 year" : `${T} years`;
    return Q(t, `₹${n(S)} is lent in two parts, one at ${ra(r1)} and the other at ${ra(r2)} simple interest. The total interest after ${yr} is ₹${n(I)}. How much is lent at ${pct(r1)}?`,
      `₹${n(S)} दो भागों में उधार दिए जाते हैं, एक भाग ${pct(r1)} और दूसरा ${pct(r2)} वार्षिक साधारण ब्याज पर। ${T} वर्ष बाद कुल ब्याज ₹${n(I)} है। ${pct(r1)} पर कितनी राशि दी गई?`,
      choices(x, money, [y, S / 2, S * r1 / (r1 + r2)], { step: step(x) }), 0, () => money((S * r2 * T / 100 - I) / ((r2 - r1) * T / 100)),
      `If all ₹${n(S)} were at ${pct(r2)}, the interest would be ₹${n(S * r2 * T / 100)}. It is ₹${n(S * r2 * T / 100 - I)} less, and each rupee moved to ${pct(r1)} loses ${n((r2 - r1) * T)}/100. Part at ${pct(r1)} = ${n(S * r2 * T / 100 - I)} × 100 ÷ ${n((r2 - r1) * T)} = ${money(x)}.`,
      `यदि पूरे ₹${n(S)} ${pct(r2)} पर होते, तो ब्याज ₹${n(S * r2 * T / 100)} होता। यह ₹${n(S * r2 * T / 100 - I)} कम है, और ${pct(r1)} पर गया हर रुपया ${n((r2 - r1) * T)}/100 कम कमाता है। ${pct(r1)} वाला भाग = ${n(S * r2 * T / 100 - I)} × 100 ÷ ${n((r2 - r1) * T)} = ${money(x)}।`);
  },
};

const sameSI = {
  id: "sameSI", levels: ["medium", "hard"],
  cands: () => thin(cross(PRINC.filter((p) => p <= 60000), [4, 5, 6, 8, 10, 12], [2, 3, 4, 5, 6], PRINC.filter((p) => p <= 60000), [4, 5, 6, 8, 10, 12, 15])
    .filter(([P1, r1, t1, P2, r2]) => P1 !== P2 && r1 !== r2 && isInt(P1 * r1 * t1 / (P2 * r2)) && P1 * r1 * t1 / (P2 * r2) >= 2 && P1 * r1 * t1 / (P2 * r2) <= 12 && P1 * r1 * t1 / (P2 * r2) !== t1), (p) => [p[0], p[3]]),
  build: (t, prm) => {
    const [P1, r1, t1, P2, r2] = prm; const t2 = clean(P1 * r1 * t1 / (P2 * r2)); const I = clean(P1 * r1 * t1 / 100);
    return YQ(t, `The simple interest on ₹${n(P1)} at ${ra(r1)} for ${t1} years is the same as the simple interest on ₹${n(P2)} at ${ra(r2)} for how many years?`,
      `₹${n(P1)} पर ${raH(r1)} से ${t1} वर्ष का साधारण ब्याज, ₹${n(P2)} पर ${raH(r2)} से कितने वर्ष के साधारण ब्याज के बराबर है?`,
      t2, [t1 * r1 / r2, t1 * P1 / P2, t2 + 1], () => (P1 * r1 * t1 / 100) / (P2 * r2 / 100),
      `First SI = ${n(P1)} × ${n(r1)} × ${t1} ÷ 100 = ₹${n(I)}. The second earns ${n(P2)} × ${n(r2)} ÷ 100 = ₹${n(P2 * r2 / 100)} a year, so it takes ${n(I)} ÷ ${n(P2 * r2 / 100)} = ${yrs(t2)}.`,
      `पहला ब्याज = ${n(P1)} × ${n(r1)} × ${t1} ÷ 100 = ₹${n(I)}। दूसरी राशि पर हर वर्ष ${n(P2)} × ${n(r2)} ÷ 100 = ₹${n(P2 * r2 / 100)} मिलते हैं, अतः समय = ${n(I)} ÷ ${n(P2 * r2 / 100)} = ${t2} वर्ष।`);
  },
};

const changeRT = {
  id: "changeRT", levels: ["medium", "hard"],
  cands: () => thin(cross(PRINC, [4, 5, 6, 8, 10, 12], [2, 3, 4, 5], [5, 6, 8, 10, 12, 15], [2, 3, 4, 5, 6])
    .filter(([P, r1, t1, r2, t2]) => r1 !== r2 && t1 !== t2 && whole(P * r1 * t1 / 100) && whole(P * r2 * t2 / 100) && P * r1 * t1 / 100 >= 200), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [P, r1, t1, r2, t2] = prm; const I1 = clean(P * r1 * t1 / 100), I2 = clean(P * r2 * t2 / 100);
    return Q(t, `The simple interest on a sum at ${ra(r1)} for ${t1} years is ₹${n(I1)}. What will be the simple interest on the same sum at ${ra(r2)} for ${t2} years?`,
      `किसी राशि पर ${raH(r1)} से ${t1} वर्ष का साधारण ब्याज ₹${n(I1)} है। उसी राशि पर ${raH(r2)} से ${t2} वर्ष का साधारण ब्याज कितना होगा?`,
      choices(I2, money, [I1 * r2 / r1, I1 * t2 / t1, P], { step: step(I2) }), 0, () => money(I1 * 100 / (r1 * t1) * r2 * t2 / 100),
      `Sum = ${n(I1)} × 100 ÷ (${n(r1)} × ${t1}) = ₹${n(P)}. New SI = ${n(P)} × ${n(r2)} × ${t2} ÷ 100 = ${money(I2)}.`,
      `राशि = ${n(I1)} × 100 ÷ (${n(r1)} × ${t1}) = ₹${n(P)}। नया ब्याज = ${n(P)} × ${n(r2)} × ${t2} ÷ 100 = ${money(I2)}।`);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
// Equal annual instalments x paid at the end of each of k years: the debt
// due after k years is k·x plus the interest each instalment earns until then.
const INST = () => cross([500, 600, 700, 800, 900, 1000, 1200, 1250, 1500, 1600, 1800, 2000, 2400, 2500, 3000, 3200, 4000, 4500, 5000, 6000, 7500, 8000, 10000], [4, 5, 6, 8, 10, 12, 12.5, 15], [2, 3, 4, 5])
  .filter(([x, r, k]) => whole(x * r * k * (k - 1) / 200));
const debtOf = (x, r, k) => clean(x * k + x * r * k * (k - 1) / 200);
const installSI = {
  id: "installSI", group: "in", levels: ["hard", "advanced"],
  cands: INST,
  build: (t, prm) => {
    const [x, r, k] = prm; const Dt = debtOf(x, r, k); const sumYrs = k * (k - 1) / 2;
    return Q(t, `What equal annual instalment will discharge a debt of ₹${n(Dt)} due in ${k} years at ${ra(r)} simple interest?`,
      `${pct(r)} वार्षिक साधारण ब्याज पर ${k} वर्ष में देय ₹${n(Dt)} का ऋण किस समान वार्षिक किस्त से चुकाया जाएगा?`,
      choices(x, money, [Dt / k, Dt / (k + r * k * (k + 1) / 200), Dt * 100 / (100 * k + r * k * k)], { step: step(x) }), 0, () => money(Dt / (k + r * k * (k - 1) / 200)),
      `Instalments paid at the end of each year earn interest till the debt falls due: for ${[...Array(k).keys()].reverse().join(", ")} years, ${sumYrs} years in all. So ${n(Dt)} = ${k}x + x × ${n(r)} × ${sumYrs} ÷ 100 = x × ${n(k + r * sumYrs / 100)}. x = ${n(Dt)} ÷ ${n(k + r * sumYrs / 100)} = ${money(x)}.`,
      `हर वर्ष के अंत में दी गई किस्त ऋण की देय तिथि तक ब्याज कमाती है: ${[...Array(k).keys()].reverse().join(", ")} वर्ष, कुल ${sumYrs} वर्ष। अतः ${n(Dt)} = ${k}x + x × ${n(r)} × ${sumYrs} ÷ 100 = x × ${n(k + r * sumYrs / 100)}। x = ${n(Dt)} ÷ ${n(k + r * sumYrs / 100)} = ${money(x)}।`);
  },
};

const installDebt = {
  id: "installDebt", group: "in", levels: ["advanced"],
  cands: INST,
  build: (t, prm) => {
    const [x, r, k] = prm; const Dt = debtOf(x, r, k); const sumYrs = k * (k - 1) / 2;
    return Q(t, `A debt due in ${k} years at ${ra(r)} simple interest is cleared by ${k} equal annual instalments of ₹${n(x)} each. What was the debt (the amount due)?`,
      `${pct(r)} वार्षिक साधारण ब्याज पर ${k} वर्ष में देय एक ऋण ₹${n(x)} की ${k} समान वार्षिक किस्तों से चुकाया जाता है। ऋण (देय राशि) कितना था?`,
      choices(Dt, money, [x * k, x * k + x * r * k * (k + 1) / 200, x * k * (1 + r / 100)], { step: step(Dt) }), 0, () => money([...Array(k).keys()].reduce((s, y) => s + x * (1 + r * y / 100), 0)),
      `The instalments earn interest for ${[...Array(k).keys()].reverse().join(", ")} years until the due date. Debt = ${k} × ${n(x)} + ${n(x)} × ${n(r)} × ${sumYrs} ÷ 100 = ${n(x * k)} + ${n(x * r * sumYrs / 100)} = ${money(Dt)}.`,
      `किस्तें देय तिथि तक ${[...Array(k).keys()].reverse().join(", ")} वर्ष ब्याज कमाती हैं। ऋण = ${k} × ${n(x)} + ${n(x)} × ${n(r)} × ${sumYrs} ÷ 100 = ${n(x * k)} + ${n(x * r * sumYrs / 100)} = ${money(Dt)}।`);
  },
};

const equalAmounts = {
  id: "equalAmounts", levels: ["hard", "advanced"],
  cands: () => cross(PRINC.filter((p) => p >= 2000 && p <= 100000), [4, 5, 6, 8, 10, 12, 12.5, 15, 20], [2, 3, 4, 5], [3, 4, 5, 6, 7, 8])
    .filter(([S, r, t1, t2]) => t2 > t1 && whole(S * (100 + r * t2) / (200 + r * (t1 + t2)))),
  build: (t, prm) => {
    const [S, r, t1, t2] = prm; const a = clean(S * (100 + r * t2) / (200 + r * (t1 + t2))), b = clean(S - a);
    const A = clean(a * (1 + r * t1 / 100));
    return Q(t, `₹${n(S)} is divided into two parts such that, at ${ra(r)} simple interest, the amount on the first part after ${t1} years equals the amount on the second part after ${t2} years. What is the first part?`,
      `₹${n(S)} को दो भागों में इस प्रकार बाँटा जाता है कि ${pct(r)} वार्षिक साधारण ब्याज पर पहले भाग का ${t1} वर्ष बाद का मिश्रधन, दूसरे भाग के ${t2} वर्ष बाद के मिश्रधन के बराबर हो। पहला भाग कितना है?`,
      choices(a, money, [b, S / 2, S * t2 / (t1 + t2)], { step: step(a) }), 0, () => money(S / (1 + (100 + r * t1) / (100 + r * t2))),
      `₹100 grows to ${n(100 + r * t1)} in ${t1} years and to ${n(100 + r * t2)} in ${t2} years. Equal amounts need first : second = ${n(100 + r * t2)} : ${n(100 + r * t1)}. First part = ${n(S)} × ${n(100 + r * t2)} ÷ ${n(200 + r * (t1 + t2))} = ${money(a)} (each grows to ₹${n(A)}).`,
      `₹100, ${t1} वर्ष में ${n(100 + r * t1)} और ${t2} वर्ष में ${n(100 + r * t2)} हो जाते हैं। मिश्रधन बराबर होने के लिए पहला : दूसरा = ${n(100 + r * t2)} : ${n(100 + r * t1)}। पहला भाग = ${n(S)} × ${n(100 + r * t2)} ÷ ${n(200 + r * (t1 + t2))} = ${money(a)} (दोनों का मिश्रधन ₹${n(A)})।`);
  },
};

const equalInterest = {
  id: "equalInterest", levels: ["hard", "advanced"],
  cands: () => {
    const R = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
    const out = [];
    for (const [r1, r2, r3] of cross(R, R, R)) {
      if (!(r1 < r2 && r2 < r3)) continue;
      const L0 = [r1, r2, r3].reduce((a, b) => a / L.gcd(a, b) * b);
      const parts = [L0 / r1, L0 / r2, L0 / r3]; const unit = parts.reduce((a, b) => a + b);
      for (const S of PRINC) if (S >= 3000 && S <= 150000 && whole(S / unit) && parts.every((p) => whole(S / unit * p))) out.push([S, r1, r2, r3]);
    }
    return thin(out, (p) => [p[1], p[2], p[3]]).concat(thin(out, (p) => [p[0]]));
  },
  build: (t, prm) => {
    const [S, r1, r2, r3] = prm; const L0 = [r1, r2, r3].reduce((a, b) => a / L.gcd(a, b) * b);
    const parts = [L0 / r1, L0 / r2, L0 / r3]; const unit = parts.reduce((a, b) => a + b); const x = clean(S / unit * parts[0]);
    return Q(t, `₹${n(S)} is divided into three parts so that the simple interest on them at ${pct(r1)}, ${pct(r2)} and ${pct(r3)} per annum respectively, for the same period, is equal. What is the part lent at ${pct(r1)}?`,
      `₹${n(S)} को तीन भागों में इस प्रकार बाँटा जाता है कि उन पर क्रमशः ${pct(r1)}, ${pct(r2)} और ${pct(r3)} वार्षिक दर से समान अवधि का साधारण ब्याज बराबर हो। ${pct(r1)} पर दिया गया भाग कितना है?`,
      choices(x, money, [S / unit * parts[2], S / unit * parts[1], S * r1 / (r1 + r2 + r3)], { step: step(x) }), 0, () => money(S * (1 / r1) / (1 / r1 + 1 / r2 + 1 / r3)),
      `Equal interest means each part × its rate is the same, so the parts are as 1/${n(r1)} : 1/${n(r2)} : 1/${n(r3)} = ${parts.join(" : ")}. Part at ${pct(r1)} = ${n(S)} × ${parts[0]} ÷ ${unit} = ${money(x)}.`,
      `ब्याज बराबर हो तो हर भाग × उसकी दर समान है, अतः भाग 1/${n(r1)} : 1/${n(r2)} : 1/${n(r3)} = ${parts.join(" : ")} के अनुपात में हैं। ${pct(r1)} पर भाग = ${n(S)} × ${parts[0]} ÷ ${unit} = ${money(x)}।`);
  },
};

const rateSteps = {
  id: "rateSteps", levels: ["advanced"],
  cands: () => thin(cross(PRINC.filter((p) => p >= 5000 && p <= 100000), [5, 6, 8, 10], [2, 3], [8, 10, 12], [2, 3, 4], [12, 15, 16, 18], [1, 2, 3])
    .filter(([P, r1, t1, r2, t2, r3, t3]) => r1 < r2 && r2 < r3 && whole(P * (r1 * t1 + r2 * t2 + r3 * t3) / 100)), (p) => [p[0]]),
  build: (t, prm) => {
    const [P, r1, t1, r2, t2, r3, t3] = prm; const k = clean(r1 * t1 + r2 * t2 + r3 * t3); const I = clean(P * k / 100); const T = t1 + t2 + t3;
    return Q(t, `A sum is lent at simple interest: ${pct(r1)} per annum for the first ${t1} years, ${pct(r2)} per annum for the next ${t2} years and ${pct(r3)} per annum after that. The total interest after ${T} years is ₹${n(I)}. What is the sum?`,
      `एक राशि साधारण ब्याज पर दी जाती है: पहले ${t1} वर्ष ${pct(r1)} वार्षिक, अगले ${t2} वर्ष ${pct(r2)} वार्षिक और उसके बाद ${pct(r3)} वार्षिक। ${T} वर्ष बाद कुल ब्याज ₹${n(I)} है। वह राशि कितनी है?`,
      choices(P, money, [I * 100 / ((r1 + r2 + r3) * T / 3), I * 100 / (r1 * t1 + r2 * t2), I * 100 / (r3 * T)], { step: step(P) }), 0, () => money(I / (r1 * t1 / 100 + r2 * t2 / 100 + r3 * t3 / 100)),
      `${t3 > 1 ? `The last ${t3} years are` : "The last year is"} at ${pct(r3)}. Interest = P × (${n(r1)} × ${t1} + ${n(r2)} × ${t2} + ${n(r3)} × ${t3}) ÷ 100 = P × ${n(k)}/100. P = ${n(I)} × 100 ÷ ${n(k)} = ${money(P)}.`,
      `${t3 > 1 ? `अंतिम ${t3} वर्ष ${pct(r3)} पर हैं` : `अंतिम 1 वर्ष ${pct(r3)} पर है`}। ब्याज = P × (${n(r1)} × ${t1} + ${n(r2)} × ${t2} + ${n(r3)} × ${t3}) ÷ 100 = P × ${n(k)}/100। P = ${n(I)} × 100 ÷ ${n(k)} = ${money(P)}।`);
  },
};

const reinvest = {
  id: "reinvest", levels: ["hard", "advanced"],
  cands: () => thin(cross(PRINC.filter((p) => p >= 2000 && p <= 100000), [4, 5, 6, 8, 10, 12], [2, 3, 4, 5], [5, 6, 8, 10, 12, 15], [2, 3, 4])
    .filter(([P, r1, t1, r2, t2]) => whole(P * r1 * t1 / 100) && whole(P * (1 + r1 * t1 / 100) * r2 * t2 / 100)), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [P, r1, t1, r2, t2] = prm; const w = who(prm); const A1 = clean(P * (1 + r1 * t1 / 100)); const A2 = clean(A1 * (1 + r2 * t2 / 100));
    return Q(t, `${w.name} lends ₹${n(P)} at ${ra(r1)} simple interest for ${t1} years. ${w.He} then lends the whole amount received at ${ra(r2)} simple interest for ${t2} more years. How much does ${w.he} have at the end?`,
      `${w.nameH} ₹${n(P)}, ${pct(r1)} वार्षिक साधारण ब्याज पर ${t1} वर्ष के लिए उधार ${w.v("देता", "देती")} है। फिर मिली पूरी राशि को ${pct(r2)} वार्षिक साधारण ब्याज पर ${t2} वर्ष और के लिए उधार दे ${w.v("देता", "देती")} है। अंत में उसके पास कितनी राशि होगी?`,
      choices(A2, money, [P * (1 + (r1 * t1 + r2 * t2) / 100), A1 + P * r2 * t2 / 100, A2 - P], { step: step(A2) }), 0, () => money(P * (100 + r1 * t1) / 100 * (100 + r2 * t2) / 100),
      `After ${t1} years: ${n(P)} × ${n(100 + r1 * t1)}/100 = ₹${n(A1)}. This earns ${n(r2)} × ${t2} = ${n(r2 * t2)}% more: ${n(A1)} × ${n(100 + r2 * t2)}/100 = ${money(A2)}.`,
      `${t1} वर्ष बाद: ${n(P)} × ${n(100 + r1 * t1)}/100 = ₹${n(A1)}। इस पर ${n(r2)} × ${t2} = ${n(r2 * t2)}% और: ${n(A1)} × ${n(100 + r2 * t2)}/100 = ${money(A2)}।`);
  },
};

// [P, R, T, d]: amount A1 at R%, A2 had the rate been d% more.
const RU = () => thin(cross(PRINC.filter((p) => p >= 2000), [4, 5, 6, 8, 10, 12], [2, 3, 4, 5], [1, 2, 3, 4])
  .filter(([P, R, T, d]) => whole(P * R * T / 100) && whole(P * d * T / 100)), (p) => [p[0], p[2]]);
const ruText = (P, R, T, d) => { const A1 = clean(P * (1 + R * T / 100)), A2 = clean(A1 + P * d * T / 100); return [A1, A2,
  `A sum amounts to ₹${n(A1)} in ${T} years at simple interest. Had the rate been ${d}% higher, it would have amounted to ₹${n(A2)}.`,
  `कोई राशि साधारण ब्याज पर ${T} वर्ष में ₹${n(A1)} हो जाती है। यदि दर ${d}% अधिक होती, तो वह ₹${n(A2)} हो जाती।`]; };
const rateUpP = {
  id: "rateUpP", group: "ru", levels: ["hard", "advanced"],
  cands: RU,
  build: (t, prm) => {
    const [P, R, T, d] = prm; const [A1, A2, e, h] = ruText(P, R, T, d);
    return Q(t, `${e} What is the sum?`, `${h} वह राशि कितनी है?`,
      choices(P, money, [(A2 - A1) * 100 / d, A1 - (A2 - A1), (A2 - A1) * 100 / T], { step: step(P) }), 0, () => money((A2 - A1) * 100 / (d * T)),
      `The extra ${d}% for ${T} years = ${d * T}% of the sum = ${n(A2)} − ${n(A1)} = ₹${n(A2 - A1)}. Sum = ${n(A2 - A1)} × 100 ÷ ${d * T} = ${money(P)}.`,
      `${T} वर्ष के लिए अतिरिक्त ${d}% = राशि का ${d * T}% = ${n(A2)} − ${n(A1)} = ₹${n(A2 - A1)}। राशि = ${n(A2 - A1)} × 100 ÷ ${d * T} = ${money(P)}।`);
  },
};
const rateUpR = {
  id: "rateUpR", group: "ru", levels: ["hard", "advanced"],
  cands: RU,
  build: (t, prm) => {
    const [P, R, T, d] = prm; const [A1, A2, e, h] = ruText(P, R, T, d);
    return Q(t, `${e} What was the rate of interest per annum?`, `${h} वार्षिक ब्याज दर कितनी थी?`,
      choices(R, pct, [R + d, (A1 - P) * 100 / A1 / T, R * T], { step: 1, near: 0.4 }), 0, () => { const S = (A2 - A1) * 100 / (d * T); return pct((A1 - S) * 100 / (S * T)); },
      `${d}% for ${T} years = ${d * T}% of the sum = ₹${n(A2 - A1)}, so the sum = ₹${n(P)}. Interest = ${n(A1)} − ${n(P)} = ₹${n(A1 - P)}. Rate = ${n(A1 - P)} × 100 ÷ (${n(P)} × ${T}) = ${pct(R)}.`,
      `${T} वर्ष के लिए ${d}% = राशि का ${d * T}% = ₹${n(A2 - A1)}, अतः राशि = ₹${n(P)}। ब्याज = ${n(A1)} − ${n(P)} = ₹${n(A1 - P)}। दर = ${n(A1 - P)} × 100 ÷ (${n(P)} × ${T}) = ${pct(R)}।`);
  },
};

// Two sums at different rates: after how many years are the amounts equal?
const catchUp = {
  id: "catchUp", levels: ["hard", "advanced"],
  cands: () => cross(PRINC.filter((p) => p <= 60000), PRINC.filter((p) => p <= 80000), [8, 10, 12, 12.5, 15, 16, 18, 20], [2, 3, 4, 5, 6, 8])
    .filter(([P1, P2, r1, r2]) => { const d = P1 * r1 - P2 * r2; if (!(P2 > P1 && d > 0)) return false; const T = 100 * (P2 - P1) / d; return isInt(T) && T >= 2 && T <= 20 && whole(P1 * r1 * T / 100) && whole(P2 * r2 * T / 100); }),
  build: (t, prm) => {
    const [P1, P2, r1, r2] = prm; const T = clean(100 * (P2 - P1) / (P1 * r1 - P2 * r2)); const A = clean(P1 * (1 + r1 * T / 100));
    const a = who(prm), b = who(prm, 5);
    return YQ(t, `${a.name} lends ₹${n(P1)} at ${ra(r1)} and ${b.name} lends ₹${n(P2)} at ${ra(r2)}, both at simple interest. After how many years will the two amounts be equal?`,
      `${a.nameH} ₹${n(P1)}, ${pct(r1)} वार्षिक दर पर और ${b.nameH} ₹${n(P2)}, ${pct(r2)} वार्षिक दर पर, दोनों साधारण ब्याज पर उधार देते हैं। कितने वर्ष बाद दोनों के मिश्रधन बराबर होंगे?`,
      T, [(P2 - P1) * 100 / (P1 * r1), (P2 - P1) * 100 / (P1 * (r1 - r2)), T + 2], () => (P2 - P1) / (P1 * r1 / 100 - P2 * r2 / 100),
      `Each year the first amount grows by ₹${n(P1 * r1 / 100)} and the second by ₹${n(P2 * r2 / 100)}, closing the gap of ₹${n(P2 - P1)} by ₹${n((P1 * r1 - P2 * r2) / 100)}. Time = ${n(P2 - P1)} ÷ ${n((P1 * r1 - P2 * r2) / 100)} = ${yrs(T)} (both then ₹${n(A)}).`,
      `हर वर्ष पहला मिश्रधन ₹${n(P1 * r1 / 100)} और दूसरा ₹${n(P2 * r2 / 100)} बढ़ता है, जिससे ₹${n(P2 - P1)} का अंतर हर वर्ष ₹${n((P1 * r1 - P2 * r2) / 100)} घटता है। समय = ${n(P2 - P1)} ÷ ${n((P1 * r1 - P2 * r2) / 100)} = ${T} वर्ष (तब दोनों ₹${n(A)})।`);
  },
};

const KINDS = guard([
  siFind, amtFind, rateFromSI, rateFromAmt, timeFromSI, timeFromAmt, principalFromSI, principalFromAmt, nTimesRate, monthsSI, lendGain, siFraction,
  twoAmtP, twoAmtR, nTimesTime, rateHigher, rateEqTime, splitTwo, sameSI, changeRT,
  installSI, installDebt, equalAmounts, equalInterest, rateSteps, reinvest, rateUpP, rateUpR, catchUp,
]);

const PREFIX = "Simple & Compound Interest · Simple Interest";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX, si };
