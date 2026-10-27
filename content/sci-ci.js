// Simple & Compound Interest · Compound Interest: every kind of question,
// level by level. Every sum of money is one that gives an exact answer (₹ and
// paise at most), every answer is worked out again in `v`, and the wrong
// options are the slips students make (simple interest for compound, the
// amount for the interest, the full rate used for a half-year, n·T instead
// of T·log).
const L = require("./sci-lib");
const { Q, choices, n, pct, clean, isInt, cross, whole, stepOf, who, money, paise, near2, nicePct, yrs, YQ, thin, pick, pw, pw1, g, f, PRINC, CI_RATES, become, becomeH, guard } = L;
const { fillTopic } = require("./gen");

const ra = (r) => `${pct(r)} per annum`;
const raH = (r) => `${pct(r)} वार्षिक दर`;
const AN = "compounded annually", ANH = "जबकि ब्याज वार्षिक रूप से संयोजित होता है";
const HY = "compounded half-yearly", HYH = "जबकि ब्याज अर्धवार्षिक रूप से संयोजित होता है";
const QY = "compounded quarterly", QYH = "जबकि ब्याज तिमाही आधार पर संयोजित होता है";
const step = (x) => Math.max(stepOf(x), 10);
const amt = (P, r, T) => clean(P * g(r) ** T);
const ci = (P, r, T) => clean(amt(P, r, T) - P);
const ORD = { 2: ["second", "दूसरे"], 3: ["third", "तीसरे"], 4: ["fourth", "चौथे"] };

// [P, R, T] with an exact (whole-rupee) amount.
const PRT = (Ts) => cross(PRINC, CI_RATES, Ts).filter(([P, R, T]) => whole(amt(P, R, T)));

// ---------------------------------------------------------------- EASY
const ciFind2 = {
  id: "ciFind2", group: "cprt", levels: ["easy"],
  cands: () => PRT([2]),
  build: (t, prm) => {
    const [P, R] = prm; const A = amt(P, R, 2), I = clean(A - P);
    return Q(t, `What is the compound interest on ₹${n(P)} at ${ra(R)} for 2 years, ${AN}?`,
      `₹${n(P)} पर ${raH(R)} से 2 वर्ष का चक्रवृद्धि ब्याज कितना होगा, ${ANH}?`,
      choices(I, money, [P * R * 2 / 100, A, P * R / 100], { step: step(I) }), 0, () => money(P * (1 + R / 100) * (1 + R / 100) - P),
      `Amount = ${n(P)} × (${f(R)})^2 = ${n(P)} × ${n(g(R) ** 2)} = ₹${n(A)}. CI = ${n(A)} − ${n(P)} = ${money(I)}.`,
      `मिश्रधन = ${n(P)} × (${f(R)})^2 = ${n(P)} × ${n(g(R) ** 2)} = ₹${n(A)}। चक्रवृद्धि ब्याज = ${n(A)} − ${n(P)} = ${money(I)}।`);
  },
};

const amtCI = {
  id: "amtCI", group: "cprt", levels: ["easy", "medium"],
  cands: () => PRT([2, 3]),
  build: (t, prm) => {
    const [P, R, T] = prm; const A = amt(P, R, T); const w = who(prm);
    return Q(t, `${w.name} deposits ₹${n(P)} in a bank at ${ra(R)} compound interest, ${AN}. How much will ${w.he} get after ${T} years?`,
      `${w.nameH} ₹${n(P)} एक बैंक में ${pct(R)} वार्षिक चक्रवृद्धि ब्याज पर जमा ${w.v("करता", "करती")} है, ${ANH}। ${T} वर्ष बाद उसे कितनी राशि मिलेगी?`,
      choices(A, money, [P * (1 + R * T / 100), A - P, amt(P, R, T - 1)], { step: step(A) }), 0, () => money([...Array(T)].reduce((x) => x * (1 + R / 100), P)),
      `Amount = ${n(P)} × (${f(R)})^${T} = ${n(P)} × ${n(g(R) ** T)} = ${money(A)}.`,
      `मिश्रधन = ${n(P)} × (${f(R)})^${T} = ${n(P)} × ${n(g(R) ** T)} = ${money(A)}।`);
  },
};

const pFromAmtCI = {
  id: "pFromAmtCI", group: "cprt", levels: ["easy", "medium"],
  cands: () => PRT([2, 3]),
  build: (t, prm) => {
    const [P, R, T] = prm; const A = amt(P, R, T);
    return Q(t, `What sum of money will amount to ₹${n(A)} in ${T} years at ${ra(R)} compound interest, ${AN}?`,
      `कौन-सी राशि ${pct(R)} वार्षिक चक्रवृद्धि ब्याज पर ${T} वर्ष में ₹${n(A)} हो जाएगी, ${ANH}?`,
      choices(P, money, [A * (1 - R / 100) ** T, A / (1 + R * T / 100), A - A * R * T / 100], { step: step(P) }), 0, () => money(A / (1 + R / 100) ** T),
      `P × (${f(R)})^${T} = ${n(A)}, so P = ${n(A)} ÷ ${n(g(R) ** T)} = ${money(P)}.`,
      `P × (${f(R)})^${T} = ${n(A)}, अतः P = ${n(A)} ÷ ${n(g(R) ** T)} = ${money(P)}।`);
  },
};

const rateCI = {
  id: "rateCI", group: "cprt", levels: ["easy", "medium"],
  cands: () => PRT([2, 3]).filter(([, R]) => isInt(R)),
  build: (t, prm) => {
    const [P, R, T] = prm; const A = amt(P, R, T);
    return Q(t, `At what rate per annum, ${AN}, will ₹${n(P)} amount to ₹${n(A)} in ${T} years?`,
      `किस वार्षिक दर से ₹${n(P)} की राशि ${T} वर्ष में ₹${n(A)} हो जाएगी, ${ANH}?`,
      choices(R, pct, [(A - P) * 100 / (P * T), R + 2, R * T], { step: 2, near: 0.4 }), 0, () => pct(((A / P) ** (1 / T) - 1) * 100),
      `(1 + R/100)^${T} = ${n(A)} ÷ ${n(P)} = ${n(A / P)} = (${f(R)})^${T}. So 1 + R/100 = ${f(R)} and R = ${pct(R)}.`,
      `(1 + R/100)^${T} = ${n(A)} ÷ ${n(P)} = ${n(A / P)} = (${f(R)})^${T}। अतः 1 + R/100 = ${f(R)} और R = ${pct(R)}।`);
  },
};

const diff2 = {
  id: "diff2", group: "cd2", levels: ["easy", "medium"],
  cands: () => cross(PRINC, CI_RATES).filter(([P, R]) => whole(P * R * R / 10000) && P * R * R / 10000 >= 10),
  build: (t, prm) => {
    const [P, R] = prm; const Dd = clean(P * R * R / 10000);
    return Q(t, `What is the difference between the compound interest and the simple interest on ₹${n(P)} at ${ra(R)} for 2 years (interest ${AN})?`,
      `₹${n(P)} पर ${raH(R)} से 2 वर्ष के चक्रवृद्धि ब्याज और साधारण ब्याज का अंतर कितना है (ब्याज वार्षिक रूप से संयोजित)?`,
      choices(Dd, money, [2 * Dd, P * R / 100 / 10, Dd * (2 + R / 100)], { step: step(Dd) }), 0, () => money(ci(P, R, 2) - P * R * 2 / 100),
      `For 2 years, CI − SI = P × (R/100)^2 = ${n(P)} × (${n(R / 100)})^2 = ${money(Dd)}.`,
      `2 वर्ष के लिए, चक्रवृद्धि ब्याज − साधारण ब्याज = P × (R/100)^2 = ${n(P)} × (${n(R / 100)})^2 = ${money(Dd)}।`);
  },
};

const halfYear1 = {
  id: "halfYear1", group: "chy", levels: ["easy", "medium"],
  cands: () => cross(PRINC, [4, 6, 8, 10, 12, 16, 20]).filter(([P, R]) => whole(P * (1 + R / 200) ** 2)),
  build: (t, prm) => {
    const [P, R] = prm; const A = clean(P * (1 + R / 200) ** 2), I = clean(A - P);
    return Q(t, `What is the compound interest on ₹${n(P)} for 1 year at ${ra(R)}, ${HY}?`,
      `₹${n(P)} पर ${raH(R)} से 1 वर्ष का चक्रवृद्धि ब्याज कितना होगा, ${HYH}?`,
      choices(I, money, [P * R / 100, A, P * ((1 + R / 100) ** 2 - 1)], { step: Math.max(stepOf(I) / 10, 1) }), 0, () => money(P * (1 + R / 2 / 100) * (1 + R / 2 / 100) - P),
      `Half-yearly: rate ${n(R / 2)}% for each of 2 half-years. Amount = ${n(P)} × (${n(1 + R / 200)})^2 = ₹${n(A)}. CI = ${n(A)} − ${n(P)} = ${money(I)}.`,
      `अर्धवार्षिक: हर छमाही ${n(R / 2)}% की दर, 2 छमाहियाँ। मिश्रधन = ${n(P)} × (${n(1 + R / 200)})^2 = ₹${n(A)}। चक्रवृद्धि ब्याज = ${n(A)} − ${n(P)} = ${money(I)}।`);
  },
};

const halfYearAmt = {
  id: "halfYearAmt", group: "chy", levels: ["easy", "medium"],
  cands: () => cross(PRINC, [4, 6, 8, 10, 12, 16, 20]).filter(([P, R]) => whole(P * (1 + R / 200) ** 2)),
  build: (t, prm) => {
    const [P, R] = prm; const A = clean(P * (1 + R / 200) ** 2); const w = who(prm);
    return Q(t, `${w.name} borrows ₹${n(P)} at ${ra(R)} compound interest, ${HY}. How much must ${w.he} repay after 1 year?`,
      `${w.nameH} ₹${n(P)}, ${pct(R)} वार्षिक चक्रवृद्धि ब्याज पर उधार ${w.v("लेता", "लेती")} है, ${HYH}। 1 वर्ष बाद उसे कितनी राशि चुकानी होगी?`,
      choices(A, money, [P * (1 + R / 100), P * (1 + R / 200), P * (1 + R / 100) ** 2], { step: Math.max(stepOf(A) / 10, 1) }), 0, () => money(P * (1 + R / 200) * (1 + R / 200)),
      `Half-yearly: ${n(R / 2)}% for each half-year, 2 half-years in a year. Amount = ${n(P)} × (${n(1 + R / 200)})^2 = ${money(A)}.`,
      `अर्धवार्षिक: हर छमाही ${n(R / 2)}%, एक वर्ष में 2 छमाहियाँ। मिश्रधन = ${n(P)} × (${n(1 + R / 200)})^2 = ${money(A)}।`);
  },
};

const doublingCI = {
  id: "doublingCI", levels: ["easy", "medium"],
  cands: () => cross([2, 3, 4, 5], [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15], [2, 3, 4]).filter(([b, T, k]) => b ** k <= 625),
  build: (t, prm) => {
    const [b, T, k] = prm; const N = b ** k, T2 = T * k;
    const bt = b === 2 ? "doubles itself" : b === 3 ? "triples itself" : `becomes ${b} times itself`;
    const btH = b === 2 ? "दोगुनी हो जाती है" : b === 3 ? "तिगुनी हो जाती है" : `${b} गुनी हो जाती है`;
    return YQ(t, `At compound interest a sum of money ${bt} in ${T} years. In how many years will it ${become(N)}?`,
      `चक्रवृद्धि ब्याज पर कोई राशि ${T} वर्ष में ${btH}। वह कितने वर्ष में ${becomeH(N)}?`,
      T2, [T * (N - 1) / (b - 1), T * N / b, T * N], () => T * Math.round(Math.log(N) / Math.log(b)),
      `Every ${T} years the sum is multiplied by ${b}. ${N} = ${b}^${k}, so it takes ${k} × ${T} = ${yrs(T2)}.`,
      `हर ${T} वर्ष में राशि ${b} से गुणा हो जाती है। ${N} = ${b}^${k}, अतः ${k} × ${T} = ${T2} वर्ष लगेंगे।`, T);
  },
};

// [P, R]: the interest of the first two years.
const CS2 = () => cross(PRINC, CI_RATES).filter(([P, R]) => whole(amt(P, R, 2)) && whole(P * R / 100));
const ciFromSI2 = {
  id: "ciFromSI2", group: "cs2", levels: ["easy", "medium"],
  cands: CS2,
  build: (t, prm) => {
    const [P, R] = prm; const S = clean(P * R * 2 / 100), C = ci(P, R, 2);
    return Q(t, `The simple interest on a sum for 2 years at ${ra(R)} is ₹${n(S)}. What is the compound interest on the same sum at the same rate for 2 years, ${AN}?`,
      `किसी राशि पर ${raH(R)} से 2 वर्ष का साधारण ब्याज ₹${n(S)} है। उसी राशि पर उसी दर से 2 वर्ष का चक्रवृद्धि ब्याज कितना होगा, ${ANH}?`,
      choices(C, money, [S * (1 + R / 100), S + S * R / 100 / 2 * 2, S * 2], { step: step(C) }), 0, () => money(S * 100 / (R * 2) * ((1 + R / 100) ** 2 - 1)),
      `Sum = ${n(S)} × 100 ÷ (${n(R)} × 2) = ₹${n(P)}. CI = ${n(P)} × ((${f(R)})^2 − 1) = ${n(P)} × ${n(g(R) ** 2 - 1)} = ${money(C)}.`,
      `राशि = ${n(S)} × 100 ÷ (${n(R)} × 2) = ₹${n(P)}। चक्रवृद्धि ब्याज = ${n(P)} × ((${f(R)})^2 − 1) = ${n(P)} × ${n(g(R) ** 2 - 1)} = ${money(C)}।`);
  },
};

const siFromCI2 = {
  id: "siFromCI2", group: "cs2", levels: ["easy", "medium"],
  cands: CS2,
  build: (t, prm) => {
    const [P, R] = prm; const S = clean(P * R * 2 / 100), C = ci(P, R, 2); const k = clean(2 * R + R * R / 100);
    return Q(t, `The compound interest on a sum for 2 years at ${ra(R)}, ${AN}, is ₹${n(C)}. What is the simple interest on the same sum at the same rate for 2 years?`,
      `किसी राशि पर ${raH(R)} से 2 वर्ष का चक्रवृद्धि ब्याज ₹${n(C)} है, ${ANH}। उसी राशि पर उसी दर से 2 वर्ष का साधारण ब्याज कितना होगा?`,
      choices(S, money, [C * (1 - R / 100), C - P * R / 100 / 10, C / (1 + R / 100)], { step: step(S) }), 0, () => money(C / ((1 + R / 100) ** 2 - 1) * R * 2 / 100),
      `CI for 2 years at ${pct(R)} is ${n(R)} + ${n(R)} + ${n(R)} × ${n(R)}/100 = ${n(k)}% of the sum, so the sum = ${n(C)} × 100 ÷ ${n(k)} = ₹${n(P)}. SI = ${n(P)} × ${n(R)} × 2 ÷ 100 = ${money(S)}.`,
      `${pct(R)} पर 2 वर्ष का चक्रवृद्धि ब्याज राशि का ${n(R)} + ${n(R)} + ${n(R)} × ${n(R)}/100 = ${n(k)}% है, अतः राशि = ${n(C)} × 100 ÷ ${n(k)} = ₹${n(P)}। साधारण ब्याज = ${n(P)} × ${n(R)} × 2 ÷ 100 = ${money(S)}।`);
  },
};

const yearN = {
  id: "yearN", group: "cy", levels: ["easy", "medium"],
  cands: () => cross(PRINC, CI_RATES, [2, 3]).filter(([P, R, y]) => whole(amt(P, R, y)) && P * R / 100 >= 50),
  build: (t, prm) => {
    const [P, R, y] = prm; const I = clean(amt(P, R, y) - amt(P, R, y - 1)); const [o, oH] = ORD[y];
    return Q(t, `₹${n(P)} is invested at ${ra(R)} compound interest, ${AN}. How much interest is earned in the ${o} year alone?`,
      `₹${n(P)}, ${pct(R)} वार्षिक चक्रवृद्धि ब्याज पर निवेश किए जाते हैं, ${ANH}। केवल ${oH} वर्ष में कितना ब्याज मिलेगा?`,
      choices(I, money, [P * R / 100, ci(P, R, y), I * g(R)], { step: Math.max(stepOf(I) / 2, 5) }), 0, () => money(amt(P, R, y - 1) * R / 100),
      `At the start of the ${o} year the sum has grown to ${n(P)} × ${pw1(R, y - 1)} = ₹${n(amt(P, R, y - 1))}. Interest that year = ${n(R)}% of ${n(amt(P, R, y - 1))} = ${money(I)}.`,
      `${oH} वर्ष की शुरुआत में राशि ${n(P)} × ${pw1(R, y - 1)} = ₹${n(amt(P, R, y - 1))} हो चुकी है। उस वर्ष का ब्याज = ${n(amt(P, R, y - 1))} का ${n(R)}% = ${money(I)}।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
const ciFind3 = {
  id: "ciFind3", group: "cprt", levels: ["medium", "hard"],
  cands: () => PRT([3]),
  build: (t, prm) => {
    const [P, R] = prm; const A = amt(P, R, 3), I = clean(A - P);
    return Q(t, `Find the compound interest on ₹${n(P)} for 3 years at ${ra(R)}, ${AN}.`,
      `₹${n(P)} पर ${raH(R)} से 3 वर्ष का चक्रवृद्धि ब्याज ज्ञात कीजिए, ${ANH}।`,
      choices(I, money, [P * R * 3 / 100, A, ci(P, R, 2)], { step: step(I) }), 0, () => money(P * ((1 + R / 100) ** 3 - 1)),
      `Amount = ${n(P)} × (${f(R)})^3 = ${n(P)} × ${n(g(R) ** 3)} = ₹${n(A)}. CI = ${n(A)} − ${n(P)} = ${money(I)}.`,
      `मिश्रधन = ${n(P)} × (${f(R)})^3 = ${n(P)} × ${n(g(R) ** 3)} = ₹${n(A)}। चक्रवृद्धि ब्याज = ${n(A)} − ${n(P)} = ${money(I)}।`);
  },
};

const timeCI = {
  id: "timeCI", group: "cprt", levels: ["medium"],
  cands: () => PRT([2, 3, 4]).filter(([, R, T]) => T < 4 || R === 10 || R === 20),
  build: (t, prm) => {
    const [P, R, T] = prm; const A = amt(P, R, T);
    return YQ(t, `In how many years will ₹${n(P)} amount to ₹${n(A)} at ${ra(R)} compound interest, ${AN}?`,
      `₹${n(P)} की राशि ${pct(R)} वार्षिक चक्रवृद्धि ब्याज पर कितने वर्ष में ₹${n(A)} हो जाएगी, ${ANH}?`,
      T, [(A - P) * 100 / (P * R), T + 1, T - 1], () => Math.round(Math.log(A / P) / Math.log(1 + R / 100)),
      `${n(A)} ÷ ${n(P)} = ${n(A / P)} = (${f(R)})^${T}, so the time is ${yrs(T)}.`,
      `${n(A)} ÷ ${n(P)} = ${n(A / P)} = (${f(R)})^${T}, अतः समय ${T} वर्ष है।`);
  },
};

// [P, R]: 3-year CI − SI.
const CD3 = () => cross(PRINC, CI_RATES).filter(([P, R]) => whole(P * R * R * (300 + R) / 1e6) && P * R * R / 10000 >= 5);
const d3 = (P, R) => clean(P * (R / 100) ** 2 * (3 + R / 100));
const diff3 = {
  id: "diff3", group: "cd3", levels: ["medium", "hard"],
  cands: CD3,
  build: (t, prm) => {
    const [P, R] = prm; const Dd = d3(P, R);
    return Q(t, `What is the difference between the compound interest and the simple interest on ₹${n(P)} for 3 years at ${ra(R)} (interest ${AN})?`,
      `₹${n(P)} पर ${raH(R)} से 3 वर्ष के चक्रवृद्धि ब्याज और साधारण ब्याज का अंतर कितना है (ब्याज वार्षिक रूप से संयोजित)?`,
      choices(Dd, money, [P * (R / 100) ** 2, 3 * P * (R / 100) ** 2, P * (R / 100) ** 2 * 2], { step: Math.max(stepOf(Dd) / 2, 5) }), 0, () => money(ci(P, R, 3) - P * R * 3 / 100),
      `For 3 years, CI − SI = P × (R/100)^2 × (3 + R/100) = ${n(P)} × ${n((R / 100) ** 2)} × ${n(3 + R / 100)} = ${money(Dd)}.`,
      `3 वर्ष के लिए, अंतर = P × (R/100)^2 × (3 + R/100) = ${n(P)} × ${n((R / 100) ** 2)} × ${n(3 + R / 100)} = ${money(Dd)}।`);
  },
};

const sumFromDiff2 = {
  id: "sumFromDiff2", group: "cd2", levels: ["medium", "hard"],
  cands: () => cross(PRINC, CI_RATES).filter(([P, R]) => whole(P * R * R / 10000) && P * R * R / 10000 >= 10),
  build: (t, prm) => {
    const [P, R] = prm; const Dd = clean(P * R * R / 10000);
    return Q(t, `The difference between the compound interest (${AN}) and the simple interest on a sum for 2 years at ${ra(R)} is ₹${n(Dd)}. What is the sum?`,
      `किसी राशि पर ${raH(R)} से 2 वर्ष के चक्रवृद्धि ब्याज (वार्षिक संयोजन) और साधारण ब्याज का अंतर ₹${n(Dd)} है। वह राशि कितनी है?`,
      choices(P, money, [Dd * 100 / R, Dd * (100 / R) ** 2 / 2, Dd * 100 * 100 / (R * 2)], { step: step(P) }), 0, () => money(Dd / (R / 100) ** 2),
      `CI − SI = P × (R/100)^2, so P = ${n(Dd)} × (100/${n(R)})^2 = ${n(Dd)} × ${n((100 / R) ** 2)} = ${money(P)}.`,
      `अंतर = P × (R/100)^2, अतः P = ${n(Dd)} × (100/${n(R)})^2 = ${n(Dd)} × ${n((100 / R) ** 2)} = ${money(P)}।`);
  },
};

const sumFromDiff3 = {
  id: "sumFromDiff3", group: "cd3", levels: ["hard", "advanced"],
  cands: CD3,
  build: (t, prm) => {
    const [P, R] = prm; const Dd = d3(P, R);
    return Q(t, `The difference between the compound interest (${AN}) and the simple interest on a sum for 3 years at ${ra(R)} is ₹${n(Dd)}. What is the sum?`,
      `किसी राशि पर ${raH(R)} से 3 वर्ष के चक्रवृद्धि ब्याज (वार्षिक संयोजन) और साधारण ब्याज का अंतर ₹${n(Dd)} है। वह राशि कितनी है?`,
      choices(P, money, [Dd / (R / 100) ** 2, Dd / (3 * (R / 100) ** 2), Dd / ((R / 100) ** 2 * 3.5)], { step: step(P) }), 0, () => money(Dd / (amt(1, R, 3) - 1 - 3 * R / 100)),
      `For 3 years, CI − SI = P × (R/100)^2 × (3 + R/100) = P × ${n((R / 100) ** 2)} × ${n(3 + R / 100)} = P × ${n((R / 100) ** 2 * (3 + R / 100))}. P = ${n(Dd)} ÷ ${n((R / 100) ** 2 * (3 + R / 100))} = ${money(P)}.`,
      `3 वर्ष के लिए, अंतर = P × (R/100)^2 × (3 + R/100) = P × ${n((R / 100) ** 2)} × ${n(3 + R / 100)} = P × ${n((R / 100) ** 2 * (3 + R / 100))}। P = ${n(Dd)} ÷ ${n((R / 100) ** 2 * (3 + R / 100))} = ${money(P)}।`);
  },
};

// [P, R, m]: m months compounded quarterly; paise allowed.
const quarterly = {
  id: "quarterly", levels: ["medium", "hard", "advanced"],
  cands: () => cross(PRINC, [4, 8, 10, 12, 16, 20], [6, 9, 12]).filter(([P, R, m]) => near2(P * (1 + R / 400) ** (m / 3)) && whole(P * R / 400)),
  build: (t, prm) => {
    const [P, R, m] = prm; const q = m / 3; const A = clean(Math.round(P * (1 + R / 400) ** q * 100) / 100), I = clean(A - P);
    const span = m === 12 ? "1 year" : `${m} months`, spanH = m === 12 ? "1 वर्ष" : `${m} महीने`;
    return Q(t, `What is the compound interest on ₹${n(P)} for ${span} at ${ra(R)}, ${QY}?`,
      `₹${n(P)} पर ${raH(R)} से ${spanH} का चक्रवृद्धि ब्याज कितना होगा, ${QYH}?`,
      choices(I, paise, [P * R * m / 1200, P * ((1 + R / 100) ** (m / 12) - 1), P * ((1 + R / 200) ** (m / 6) - 1)].filter((x) => near2(x)), { step: Math.max(stepOf(I) / 10, 1), near: 0.01 }), 0, () => paise(Math.round((P * (1 + R / 4 / 100) ** q - P) * 100) / 100),
      `Quarterly: ${n(R)} ÷ 4 = ${n(R / 4)}% for each quarter, and ${span} = ${q} quarters. Amount = ${n(P)} × (${n(1 + R / 400)})^${q} = ${paise(A)}. CI = ${paise(A)} − ₹${n(P)} = ${paise(I)}.`,
      `तिमाही: हर तिमाही ${n(R)} ÷ 4 = ${n(R / 4)}%, और ${spanH} = ${q} तिमाहियाँ। मिश्रधन = ${n(P)} × (${n(1 + R / 400)})^${q} = ${paise(A)}। चक्रवृद्धि ब्याज = ${paise(A)} − ₹${n(P)} = ${paise(I)}।`);
  },
};

// [P, R, k]: the amounts after k and k + 1 years.
const CC = () => cross(PRINC, CI_RATES, [2, 3]).filter(([P, R, k]) => whole(amt(P, R, k + 1)) && isInt(R));
const consecRate = {
  id: "consecRate", group: "cc", levels: ["medium", "hard"],
  cands: CC,
  build: (t, prm) => {
    const [P, R, k] = prm; const A1 = amt(P, R, k), A2 = amt(P, R, k + 1);
    return Q(t, `A sum of money at compound interest (${AN}) amounts to ₹${n(A1)} in ${k} years and to ₹${n(A2)} in ${k + 1} years. What is the rate of interest per annum?`,
      `चक्रवृद्धि ब्याज (वार्षिक संयोजन) पर कोई राशि ${k} वर्ष में ₹${n(A1)} और ${k + 1} वर्ष में ₹${n(A2)} हो जाती है। वार्षिक ब्याज दर कितनी है?`,
      choices(R, pct, [(A2 - A1) * 100 / A2, R + 2, R / 2], { step: 2, near: 0.4 }), 0, () => pct((A2 - A1) * 100 / A1),
      `In the ${ORD[k + 1][0]} year ₹${n(A1)} earns ${n(A2)} − ${n(A1)} = ₹${n(A2 - A1)}. Rate = ${n(A2 - A1)} × 100 ÷ ${n(A1)} = ${pct(R)}.`,
      `${ORD[k + 1][1]} वर्ष में ₹${n(A1)} पर ${n(A2)} − ${n(A1)} = ₹${n(A2 - A1)} ब्याज मिलता है। दर = ${n(A2 - A1)} × 100 ÷ ${n(A1)} = ${pct(R)}।`);
  },
};

const consecP = {
  id: "consecP", group: "cc", levels: ["hard", "advanced"],
  cands: CC,
  build: (t, prm) => {
    const [P, R, k] = prm; const A1 = amt(P, R, k), A2 = amt(P, R, k + 1);
    return Q(t, `A sum of money at compound interest (${AN}) amounts to ₹${n(A1)} in ${k} years and to ₹${n(A2)} in ${k + 1} years. What is the sum?`,
      `चक्रवृद्धि ब्याज (वार्षिक संयोजन) पर कोई राशि ${k} वर्ष में ₹${n(A1)} और ${k + 1} वर्ष में ₹${n(A2)} हो जाती है। वह राशि कितनी है?`,
      choices(P, money, [A1 - (A2 - A1) * k, A1 / (1 + R * k / 100), A1 - (A2 - A1)], { step: step(P) }), 0, () => money(A1 / (A2 / A1) ** k),
      `Rate = (${n(A2)} − ${n(A1)}) × 100 ÷ ${n(A1)} = ${pct(R)}. Sum = ${n(A1)} ÷ (${f(R)})^${k} = ${n(A1)} ÷ ${n(g(R) ** k)} = ${money(P)}.`,
      `दर = (${n(A2)} − ${n(A1)}) × 100 ÷ ${n(A1)} = ${pct(R)}। राशि = ${n(A1)} ÷ (${f(R)})^${k} = ${n(A1)} ÷ ${n(g(R) ** k)} = ${money(P)}।`);
  },
};

// Different rates in different years.
const VR = [5, 8, 10, 12, 15, 20, 25];
const varRates = {
  id: "varRates", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross(PRINC, VR, VR, [0, ...VR]).filter(([P, a, b, c]) => a !== b && (c === 0 || (c !== a && c !== b)) && whole(P * g(a) * g(b) * (c ? g(c) : 1))), (p) => [p[0], p[3] > 0]),
  build: (t, prm) => {
    const [P, a, b, c] = prm; const rs = c ? [a, b, c] : [a, b]; const A = clean(rs.reduce((x, r) => x * g(r), P)); const I = clean(A - P);
    const list = c ? `${pct(a)} for the first year, ${pct(b)} for the second year and ${pct(c)} for the third year` : `${pct(a)} for the first year and ${pct(b)} for the second year`;
    const listH = c ? `पहले वर्ष ${pct(a)}, दूसरे वर्ष ${pct(b)} और तीसरे वर्ष ${pct(c)}` : `पहले वर्ष ${pct(a)} और दूसरे वर्ष ${pct(b)}`;
    return Q(t, `What is the compound interest on ₹${n(P)} if the rate is ${list}, ${AN}?`,
      `₹${n(P)} पर चक्रवृद्धि ब्याज कितना होगा, यदि ब्याज दर ${listH} है (वार्षिक संयोजन)?`,
      choices(I, money, [P * rs.reduce((x, y) => x + y, 0) / 100, A, ci(P, Math.max(...rs), rs.length)].filter(whole), { step: step(I) }), 0, () => money(P * rs.map((r) => 1 + r / 100).reduce((x, y) => x * y) - P),
      `Amount = ${n(P)} × ${rs.map(f).join(" × ")} = ₹${n(A)}. CI = ${n(A)} − ${n(P)} = ${money(I)}.`,
      `मिश्रधन = ${n(P)} × ${rs.map(f).join(" × ")} = ₹${n(A)}। चक्रवृद्धि ब्याज = ${n(A)} − ${n(P)} = ${money(I)}।`);
  },
};

const halfVsAnnual = {
  id: "halfVsAnnual", levels: ["medium", "hard"],
  cands: () => cross(PRINC, [4, 6, 8, 10, 12, 16, 20]).filter(([P, R]) => whole(P * (R / 200) ** 2) && P * (R / 200) ** 2 >= 4),
  build: (t, prm) => {
    const [P, R] = prm; const Dd = clean(P * (R / 200) ** 2);
    return Q(t, `On ₹${n(P)} at ${ra(R)} for 1 year, how much more is the compound interest when it is ${HY} than when it is ${AN}?`,
      `₹${n(P)} पर ${raH(R)} से 1 वर्ष के लिए, ब्याज अर्धवार्षिक संयोजित होने पर, वार्षिक संयोजित होने की तुलना में कितना अधिक चक्रवृद्धि ब्याज मिलेगा?`,
      choices(Dd, money, [P * (R / 100) ** 2, 2 * Dd, P * R / 200 / 10], { step: Math.max(stepOf(Dd) / 2, 2) }), 0, () => money(P * (1 + R / 200) ** 2 - P * (1 + R / 100)),
      `Annually: ${n(P)} × ${n(R)}% = ₹${n(P * R / 100)}. Half-yearly: ${n(P)} × ((${n(1 + R / 200)})^2 − 1) = ₹${n(P * ((1 + R / 200) ** 2 - 1))}. Difference = interest on the first half-year's interest = ${n(P)} × (${n(R / 200)})^2 = ${money(Dd)}.`,
      `वार्षिक: ${n(P)} × ${n(R)}% = ₹${n(P * R / 100)}। अर्धवार्षिक: ${n(P)} × ((${n(1 + R / 200)})^2 − 1) = ₹${n(P * ((1 + R / 200) ** 2 - 1))}। अंतर = ${n(P)} × (${n(R / 200)})^2 = ${money(Dd)}।`);
  },
};

const effRate = {
  id: "effRate", levels: ["medium", "hard"], once: true,
  cands: () => [[4], [6], [8], [10], [12], [16], [20], [24], [30], [40]].filter(([R]) => nicePct(((1 + R / 200) ** 2 - 1) * 100)),
  build: (t, prm) => {
    const [R] = prm; const E = clean(((1 + R / 200) ** 2 - 1) * 100);
    return Q(t, `A bank pays ${ra(R)} compound interest, ${HY}. What is the effective annual rate of interest?`,
      `एक बैंक ${pct(R)} वार्षिक चक्रवृद्धि ब्याज देता है, ${HYH}। प्रभावी वार्षिक ब्याज दर कितनी है?`,
      choices(E, pct, [R, R / 2, R + (R / 10) ** 2 * 2], { step: 0.5, near: 0.01 }), 0, () => pct(((1 + R / 2 / 100) * (1 + R / 2 / 100) - 1) * 100),
      `₹100 grows to 100 × (${n(1 + R / 200)})^2 = ${n(100 * (1 + R / 200) ** 2)} in a year. Effective rate = ${n(R / 2)} + ${n(R / 2)} + ${n(R / 2)} × ${n(R / 2)}/100 = ${pct(E)}.`,
      `₹100 एक वर्ष में 100 × (${n(1 + R / 200)})^2 = ${n(100 * (1 + R / 200) ** 2)} हो जाते हैं। प्रभावी दर = ${n(R / 2)} + ${n(R / 2)} + ${n(R / 2)} × ${n(R / 2)}/100 = ${pct(E)}।`);
  },
};

// The interest of the third year minus that of the second: P·g·(g − 1)².
const DY = () => cross(PRINC, CI_RATES).filter(([P, R]) => whole(amt(P, R, 3)) && P * g(R) * (R / 100) ** 2 >= 10);
const dyOf = (P, R) => clean(P * g(R) * (R / 100) ** 2);
const diffYears = {
  id: "diffYears", group: "dy", levels: ["medium", "hard"],
  cands: DY,
  build: (t, prm) => {
    const [P, R] = prm; const i2 = clean(amt(P, R, 2) - amt(P, R, 1)), i3 = clean(amt(P, R, 3) - amt(P, R, 2)), Dd = clean(i3 - i2);
    return Q(t, `₹${n(P)} is lent at ${ra(R)} compound interest, ${AN}. By how much does the interest of the third year exceed the interest of the second year?`,
      `₹${n(P)}, ${pct(R)} वार्षिक चक्रवृद्धि ब्याज पर उधार दिए जाते हैं, ${ANH}। तीसरे वर्ष का ब्याज दूसरे वर्ष के ब्याज से कितना अधिक है?`,
      choices(Dd, money, [P * (R / 100) ** 2, i2 - P * R / 100 + Dd / 2, i3 - P * R / 100], { step: Math.max(stepOf(Dd) / 2, 2) }), 0, () => money(dyOf(P, R)),
      `Second year's interest = ${n(R)}% of ${n(amt(P, R, 1))} = ₹${n(i2)}. Third year's = ${n(R)}% of ${n(amt(P, R, 2))} = ₹${n(i3)}. Difference = ${n(i3)} − ${n(i2)} = ${money(Dd)} (the interest on ₹${n(i2)}).`,
      `दूसरे वर्ष का ब्याज = ${n(amt(P, R, 1))} का ${n(R)}% = ₹${n(i2)}। तीसरे वर्ष का = ${n(amt(P, R, 2))} का ${n(R)}% = ₹${n(i3)}। अंतर = ${n(i3)} − ${n(i2)} = ${money(Dd)} (₹${n(i2)} पर ब्याज)।`);
  },
};

const diffYearsP = {
  id: "diffYearsP", group: "dy", levels: ["hard", "advanced"],
  cands: DY,
  build: (t, prm) => {
    const [P, R] = prm; const Dd = dyOf(P, R);
    return Q(t, `A sum is lent at ${ra(R)} compound interest, ${AN}. The interest of the third year is ₹${n(Dd)} more than the interest of the second year. What is the sum?`,
      `एक राशि ${pct(R)} वार्षिक चक्रवृद्धि ब्याज पर उधार दी जाती है, ${ANH}। तीसरे वर्ष का ब्याज दूसरे वर्ष के ब्याज से ₹${n(Dd)} अधिक है। वह राशि कितनी है?`,
      choices(P, money, [Dd / (R / 100) ** 2, Dd * 100 / R, Dd / (R / 100) ** 2 / g(R) ** 2], { step: step(P) }), 0, () => money(Dd / ((1 + R / 100) * (R / 100) ** 2)),
      `Third − second year's interest = P × ${f(R)} × (${n(R / 100)})^2 = P × ${n(g(R) * (R / 100) ** 2)}. P = ${n(Dd)} ÷ ${n(g(R) * (R / 100) ** 2)} = ${money(P)}.`,
      `तीसरे − दूसरे वर्ष का ब्याज = P × ${f(R)} × (${n(R / 100)})^2 = P × ${n(g(R) * (R / 100) ** 2)}। P = ${n(Dd)} ÷ ${n(g(R) * (R / 100) ** 2)} = ${money(P)}।`);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
// A loan repaid in 2 equal annual instalments: P = x/g + x/g².
const IC = () => {
  const out = [];
  for (const R of [4, 5, 8, 10, 12.5, 15, 16, 20, 25]) for (let P = 2000; P <= 200000; P += 100) {
    const x = P * g(R) ** 2 / (1 + g(R));
    if (whole(x) && P % 500 === 0) out.push([P, R]);
  }
  return thin(out, (p) => [p[1], Math.floor(Math.log10(p[0]) * 3)]).concat(thin(out, (p) => [p[0]]));
};
const instOf = (P, R) => clean(P * g(R) ** 2 / (1 + g(R)));
const installCI = {
  id: "installCI", group: "ic", levels: ["hard", "advanced"],
  cands: () => [...new Map(IC().map((p) => [JSON.stringify(p), p])).values()],
  build: (t, prm) => {
    const [P, R] = prm; const x = instOf(P, R);
    return Q(t, `A loan of ₹${n(P)} at ${ra(R)} compound interest (${AN}) is repaid in 2 equal annual instalments. What is each instalment?`,
      `₹${n(P)} का ऋण ${pct(R)} वार्षिक चक्रवृद्धि ब्याज (वार्षिक संयोजन) पर 2 समान वार्षिक किस्तों में चुकाया जाता है। हर किस्त कितनी है?`,
      choices(x, money, [amt(P, R, 2) / 2, P * (1 + R / 100) / 2, P / 2 * (1 + 2 * R / 100)].filter((v) => Math.abs(v - x) >= 1), { step: step(x) }), 0, () => money(P / (1 / (1 + R / 100) + 1 / (1 + R / 100) ** 2)),
      `Each instalment x is worth x ÷ ${f(R)} and x ÷ (${f(R)})^2 today, and together they repay the loan: x × (1/${f(R)} + 1/${n(g(R) ** 2)}) = ${n(P)}. So x = ${n(P)} × ${n(g(R) ** 2)} ÷ ${n(1 + g(R))} = ${money(x)}.`,
      `हर किस्त x का आज का मूल्य x ÷ ${f(R)} और x ÷ (${f(R)})^2 है, और दोनों मिलकर ऋण चुकाती हैं: x × (1/${f(R)} + 1/${n(g(R) ** 2)}) = ${n(P)}। अतः x = ${n(P)} × ${n(g(R) ** 2)} ÷ ${n(1 + g(R))} = ${money(x)}।`);
  },
};

const installLoan = {
  id: "installLoan", group: "ic", levels: ["advanced"],
  cands: () => [...new Map(IC().map((p) => [JSON.stringify(p), p])).values()],
  build: (t, prm) => {
    const [P, R] = prm; const x = instOf(P, R);
    return Q(t, `A sum borrowed at ${ra(R)} compound interest (${AN}) is repaid in 2 equal annual instalments of ₹${n(x)} each. What was the sum borrowed?`,
      `${pct(R)} वार्षिक चक्रवृद्धि ब्याज (वार्षिक संयोजन) पर उधार ली गई एक राशि ₹${n(x)} की 2 समान वार्षिक किस्तों में चुकाई जाती है। उधार ली गई राशि कितनी थी?`,
      choices(P, money, [2 * x, 2 * x / g(R), 2 * x / g(R) ** 2].filter((v) => Math.abs(v - P) >= 1), { step: step(P) }), 0, () => money(x / (1 + R / 100) + x / (1 + R / 100) ** 2),
      `Sum = x ÷ ${f(R)} + x ÷ (${f(R)})^2 = ${n(x)} ÷ ${f(R)} + ${n(x)} ÷ ${n(g(R) ** 2)} = ${n(x / g(R))} + ${n(x / g(R) ** 2)} = ${money(P)}.`,
      `राशि = x ÷ ${f(R)} + x ÷ (${f(R)})^2 = ${n(x)} ÷ ${f(R)} + ${n(x)} ÷ ${n(g(R) ** 2)} = ${n(x / g(R))} + ${n(x / g(R) ** 2)} = ${money(P)}।`);
  },
};

// [P, R]: CI and SI for 2 years are both given.
const CSR = () => cross(PRINC, CI_RATES).filter(([P, R]) => whole(amt(P, R, 2)) && whole(P * R / 100) && isInt(R));
const csText = (P, R) => { const S = clean(P * R * 2 / 100), C = ci(P, R, 2); return [S, C,
  `On a certain sum, the compound interest (${AN}) for 2 years is ₹${n(C)} and the simple interest for 2 years at the same rate is ₹${n(S)}.`,
  `किसी राशि पर 2 वर्ष का चक्रवृद्धि ब्याज (वार्षिक संयोजन) ₹${n(C)} और उसी दर से 2 वर्ष का साधारण ब्याज ₹${n(S)} है।`]; };
const ciSiRate = {
  id: "ciSiRate", group: "csr", levels: ["hard", "advanced"],
  cands: CSR,
  build: (t, prm) => {
    const [P, R] = prm; const [S, C, e, h] = csText(P, R);
    return Q(t, `${e} What is the rate of interest per annum?`, `${h} वार्षिक ब्याज दर कितनी है?`,
      choices(R, pct, [(C - S) * 100 / S, (C - S) * 100 / C, R / 2], { step: 2, near: 0.4 }), 0, () => pct((C - S) * 200 / S),
      `One year's SI = ${n(S)} ÷ 2 = ₹${n(S / 2)}. The extra ₹${n(C - S)} in CI is the second year's interest on that ₹${n(S / 2)}. Rate = ${n(C - S)} × 100 ÷ ${n(S / 2)} = ${pct(R)}.`,
      `एक वर्ष का साधारण ब्याज = ${n(S)} ÷ 2 = ₹${n(S / 2)}। चक्रवृद्धि ब्याज में अतिरिक्त ₹${n(C - S)}, इसी ₹${n(S / 2)} पर दूसरे वर्ष का ब्याज है। दर = ${n(C - S)} × 100 ÷ ${n(S / 2)} = ${pct(R)}।`);
  },
};
const ciSiSum = {
  id: "ciSiSum", group: "csr", levels: ["hard", "advanced"],
  cands: CSR,
  build: (t, prm) => {
    const [P, R] = prm; const [S, C, e, h] = csText(P, R);
    return Q(t, `${e} What is the sum?`, `${h} वह राशि कितनी है?`,
      choices(P, money, [S * 100 / R, C * 100 / (2 * R), S * 100 / (R * 2) * 2], { step: step(P) }), 0, () => { const r = (C - S) * 200 / S; return money(S * 100 / (2 * r)); },
      `One year's SI = ₹${n(S / 2)}; the extra ₹${n(C - S)} is interest on it, so the rate = ${n(C - S)} × 100 ÷ ${n(S / 2)} = ${pct(R)}. Sum = ${n(S / 2)} × 100 ÷ ${n(R)} = ${money(P)}.`,
      `एक वर्ष का साधारण ब्याज = ₹${n(S / 2)}; अतिरिक्त ₹${n(C - S)} उसी पर ब्याज है, अतः दर = ${n(C - S)} × 100 ÷ ${n(S / 2)} = ${pct(R)}। राशि = ${n(S / 2)} × 100 ÷ ${n(R)} = ${money(P)}।`);
  },
};

// Amounts after t and 2t years: P = A1² ÷ A2.
const squareRule = {
  id: "squareRule", levels: ["hard", "advanced"],
  cands: () => cross(PRINC, CI_RATES, [1, 2]).filter(([P, R, t]) => whole(amt(P, R, 2 * t))),
  build: (t, prm) => {
    const [P, R, k] = prm; const A1 = amt(P, R, k), A2 = amt(P, R, 2 * k);
    return Q(t, `A sum of money at compound interest (${AN}) amounts to ₹${n(A1)} in ${k === 1 ? "1 year" : `${k} years`} and to ₹${n(A2)} in ${2 * k} years. What is the sum?`,
      `चक्रवृद्धि ब्याज (वार्षिक संयोजन) पर कोई राशि ${k} वर्ष में ₹${n(A1)} और ${2 * k} वर्ष में ₹${n(A2)} हो जाती है। वह राशि कितनी है?`,
      choices(P, money, [A1 - (A2 - A1), 2 * A1 - A2 + (A2 - A1) / 2, A1 * A1 / A2 * g(R)], { step: step(P) }), 0, () => money(A1 * A1 / A2),
      `Every ${k === 1 ? "year" : `${k} years`} the sum is multiplied by the same factor, so P : ${n(A1)} = ${n(A1)} : ${n(A2)}. P = ${n(A1)}^2 ÷ ${n(A2)} = ${money(P)} (the rate is ${pct(R)}).`,
      `${k === 1 ? "हर वर्ष" : `हर ${k} वर्ष में`} राशि उसी गुणक से बढ़ती है, अतः P : ${n(A1)} = ${n(A1)} : ${n(A2)}। P = ${n(A1)}^2 ÷ ${n(A2)} = ${money(P)} (दर ${pct(R)} है)।`);
  },
};

// n½ years compounded annually: the last half-year at half the rate.
const fracYears = {
  id: "fracYears", levels: ["hard", "advanced"],
  cands: () => cross(PRINC, [4, 5, 8, 10, 12, 15, 16, 20], [1, 2]).filter(([P, R, k]) => whole(P * g(R) ** k * (1 + R / 200))),
  build: (t, prm) => {
    const [P, R, k] = prm; const A = clean(P * g(R) ** k * (1 + R / 200)), I = clean(A - P);
    return Q(t, `What is the compound interest on ₹${n(P)} for ${k}½ years at ${ra(R)}, ${AN}? (For the part of a year, simple interest is taken at the same rate.)`,
      `₹${n(P)} पर ${raH(R)} से ${k}½ वर्ष का चक्रवृद्धि ब्याज कितना होगा, ${ANH}? (वर्ष के भाग के लिए उसी दर से साधारण ब्याज लिया जाता है।)`,
      choices(I, money, [P * R * (k + 0.5) / 100, ci(P, R, k + 1), ci(P, R, k)], { step: step(I) }), 0, () => money(amt(P, R, k) * (1 + R / 2 / 100) - P),
      `${k === 1 ? "1 year" : `${k} years`} at ${pct(R)}: ${n(P)} × (${f(R)})^${k} = ₹${n(amt(P, R, k))}. The last half-year at ${n(R / 2)}%: ${n(amt(P, R, k))} × ${n(1 + R / 200)} = ₹${n(A)}. CI = ${n(A)} − ${n(P)} = ${money(I)}.`,
      `${k} वर्ष ${pct(R)} पर: ${n(P)} × (${f(R)})^${k} = ₹${n(amt(P, R, k))}। अंतिम छमाही ${n(R / 2)}% पर: ${n(amt(P, R, k))} × ${n(1 + R / 200)} = ₹${n(A)}। चक्रवृद्धि ब्याज = ${n(A)} − ${n(P)} = ${money(I)}।`);
  },
};

const halfYear15 = {
  id: "halfYear15", levels: ["hard", "advanced"],
  cands: () => cross(PRINC, [4, 8, 10, 12, 16, 20], [3, 4]).filter(([P, R, h]) => whole(P * (1 + R / 200) ** h)),
  build: (t, prm) => {
    const [P, R, h] = prm; const A = clean(P * (1 + R / 200) ** h); const span = h === 3 ? "1½ years" : "2 years", spanH = h === 3 ? "1½ वर्ष" : "2 वर्ष";
    return Q(t, `What amount will ₹${n(P)} grow to in ${span} at ${ra(R)} compound interest, ${HY}?`,
      `₹${n(P)} की राशि ${pct(R)} वार्षिक चक्रवृद्धि ब्याज पर ${spanH} में कितनी हो जाएगी, ${HYH}?`,
      choices(A, money, [P * (1 + R * h / 200), P * g(R) ** (h / 2), P * g(R) ** h].filter(whole), { step: step(A) }), 0, () => money([...Array(h)].reduce((x) => x * (1 + R / 2 / 100), P)),
      `Half-yearly: ${n(R / 2)}% for each of ${h} half-years. Amount = ${n(P)} × (${n(1 + R / 200)})^${h} = ${money(A)}.`,
      `अर्धवार्षिक: ${h} छमाहियों में से हर एक में ${n(R / 2)}%। मिश्रधन = ${n(P)} × (${n(1 + R / 200)})^${h} = ${money(A)}।`);
  },
};

const borrowSiLendCi = {
  id: "borrowSiLendCi", levels: ["advanced"],
  cands: () => cross(PRINC.filter((p) => p >= 5000), [8, 10, 12, 16, 20], [1, 2]).filter(([P, R, T]) => whole(P * (1 + R / 200) ** (2 * T)) && P * ((1 + R / 200) ** (2 * T) - 1 - R * T / 100) >= 10),
  build: (t, prm) => {
    const [P, R, T] = prm; const w = who(prm); const C = clean(P * (1 + R / 200) ** (2 * T) - P), S = clean(P * R * T / 100), G = clean(C - S);
    const span = T === 1 ? "1 year" : `${T} years`;
    return Q(t, `${w.name} borrows ₹${n(P)} at ${ra(R)} simple interest and at once lends it at the same rate of compound interest, ${HY}. What does ${w.he} gain in ${span}?`,
      `${w.nameH} ₹${n(P)}, ${pct(R)} वार्षिक साधारण ब्याज पर उधार ${w.v("लेता", "लेती")} है और तुरंत उसे उसी दर के चक्रवृद्धि ब्याज पर उधार दे ${w.v("देता", "देती")} है, ${HYH}। ${T} वर्ष में उसका लाभ कितना होगा?`,
      choices(G, money, [P * ((1 + R / 100) ** T - 1) - S, C, P * (R / 200) ** 2], { step: Math.max(stepOf(G) / 2, 2) }), 0, () => money(P * ((1 + R / 2 / 100) ** (T * 2) - 1) - P * R * T / 100),
      `${w.He} receives ${n(P)} × ((${n(1 + R / 200)})^${2 * T} − 1) = ₹${n(C)} and pays ${n(P)} × ${n(R)} × ${T} ÷ 100 = ₹${n(S)}. Gain = ${n(C)} − ${n(S)} = ${money(G)}.`,
      `उसे ${n(P)} × ((${n(1 + R / 200)})^${2 * T} − 1) = ₹${n(C)} मिलते हैं और ${n(P)} × ${n(R)} × ${T} ÷ 100 = ₹${n(S)} ${w.v("चुकाता", "चुकाती")} है। लाभ = ${n(C)} − ${n(S)} = ${money(G)}।`);
  },
};

// The same deposit at the start of each year; the total at the end of the last year.
const deposits = {
  id: "deposits", levels: ["advanced"],
  cands: () => cross([1000, 2000, 2500, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 16000, 20000, 25000, 40000, 50000], [4, 5, 8, 10, 12, 15, 20, 25], [2, 3]).filter(([x, R, k]) => whole([...Array(k)].reduce((s, _, i) => s + x * g(R) ** (i + 1), 0))),
  build: (t, prm) => {
    const [x, R, k] = prm; const w = who(prm); const parts = [...Array(k)].map((_, i) => clean(x * g(R) ** (k - i))); const A = clean(parts.reduce((a, b) => a + b, 0));
    return Q(t, `At the start of each year ${w.name} deposits ₹${n(x)} in a scheme paying ${ra(R)} compound interest, ${AN}. How much will ${w.he} have at the end of ${k} years?`,
      `${w.nameH} हर वर्ष की शुरुआत में ₹${n(x)} एक ऐसी योजना में जमा ${w.v("करता", "करती")} है जो ${pct(R)} वार्षिक चक्रवृद्धि ब्याज देती है, ${ANH}। ${k} वर्ष के अंत में उसके पास कितनी राशि होगी?`,
      choices(A, money, [x * k * g(R), x * k * (1 + R * k / 100), A - parts[0] + x].filter(whole), { step: step(A) }), 0, () => money([...Array(k)].reduce((s, _, i) => (s + x) * (1 + R / 100), 0)),
      `The first deposit grows for ${k} years, the next for ${k - 1}${k === 3 ? ", the last for 1" : ""}: ${parts.map((p, i) => `${n(x)} × ${pw1(R, k - i)} = ₹${n(p)}`).join("; ")}. Total = ${parts.map(n).join(" + ")} = ${money(A)}.`,
      `पहली जमा ${k} वर्ष बढ़ती है, अगली ${k - 1}${k === 3 ? ", अंतिम 1" : ""}: ${parts.map((p, i) => `${n(x)} × ${pw1(R, k - i)} = ₹${n(p)}`).join("; ")}। कुल = ${parts.map(n).join(" + ")} = ${money(A)}।`);
  },
};

const KINDS = guard([
  ciFind2, amtCI, pFromAmtCI, rateCI, diff2, halfYear1, halfYearAmt, doublingCI, ciFromSI2, siFromCI2, yearN,
  ciFind3, timeCI, diff3, sumFromDiff2, sumFromDiff3, quarterly, consecRate, consecP, varRates, halfVsAnnual, effRate, diffYears, diffYearsP,
  installCI, installLoan, ciSiRate, ciSiSum, squareRule, fracYears, halfYear15, borrowSiLendCi, deposits,
]);

const PREFIX = "Simple & Compound Interest · Compound Interest";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
