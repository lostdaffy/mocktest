// Profit & Loss · Discount and Marked Price: every kind of question, level
// by level. gen.js fills the tests; every answer is worked out again in `v`.
// The wrong options are the usual slips: adding successive discounts,
// taking a discount on the cost price, taking a markup off the marked price.
const L = require("./pl-lib");
const { Q, choices, n, pct, clean, cross, whole, nicePct, money, stepOf, f, who, seller, itemFor, PRICES, ratio } = L;
const { pl, plH, SQ } = require("./pl-cpsp");
const { fillTopic } = require("./gen");

const thin = (list, key) => { const m = new Map(); for (const p of list) { const k = JSON.stringify(key(p)); const h = L.hashOf(p); if (!m.has(k) || h < m.get(k)[0]) m.set(k, [h, p]); } return [...m.values()].map((x) => x[1]); };
const MPS = PRICES.filter((p) => p >= 200 && p <= 60000);
const DISCS = [5, 8, 10, 12, 15, 16, 20, 25, 30, 35, 40, 50];
const MARKUPS = [20, 25, 30, 35, 40, 50, 60, 75, 80, 100];

// ---------------------------------------------------------------- EASY
const spFromMP = {
  id: "spFromMP", group: "md", levels: ["easy"],
  cands: () => cross(MPS, DISCS).filter(([M, d]) => whole(M * d / 100) && !(M === 200 && d === 10) && !(M === 500 && d === 20)),
  build: (t, prm) => {
    const [M, d] = prm; const it = itemFor(M, prm);
    const S = clean(M * (1 - d / 100));
    return Q(t, `The marked price of ${it.en} is ₹${n(M)}. The shop offers a discount of ${d}% on it. How much does a customer pay?`,
      `${it.hi} का अंकित मूल्य ₹${n(M)} है। दुकान इस पर ${d}% की छूट देती है। ग्राहक कितना भुगतान करता है?`,
      choices(S, money, [M * d / 100, M * (1 + d / 100), M - d], { step: stepOf(S) }), 0, () => money(clean(M - M * d / 100)),
      `Discount = ${d}% of ${n(M)} = ₹${n(M * d / 100)}. Price paid = ${n(M)} − ${n(M * d / 100)} = ${money(S)}.`,
      `छूट = ${n(M)} का ${d}% = ₹${n(M * d / 100)}। भुगतान = ${n(M)} − ${n(M * d / 100)} = ${money(S)}।`);
  },
};

const discPct = {
  id: "discPct", group: "md", levels: ["easy"],
  cands: () => cross(MPS, DISCS).filter(([M, d]) => whole(M * d / 100)),
  build: (t, prm) => {
    const [M, d] = prm; const w = who(prm); const it = itemFor(M, prm);
    const S = clean(M * (1 - d / 100));
    return Q(t, `${w.name} buys ${it.en} marked at ₹${n(M)} for ₹${n(S)}. What rate of discount did ${w.he} get?`,
      `${it.hi} का अंकित मूल्य ₹${n(M)} है। ${w.nameH} इसे ₹${n(S)} में ${w.v("खरीदता", "खरीदती")} है। उसे कितने प्रतिशत छूट मिली?`,
      choices(d, pct, [(M - S) / S * 100, d + 5, 100 - d], { step: 5 }), 0, () => pct(clean((M - S) / M * 100)),
      `Discount = ${n(M)} − ${n(S)} = ₹${n(M - S)}, always on the marked price: ${n(M - S)} ÷ ${n(M)} × 100 = ${pct(d)}.`,
      `छूट = ${n(M)} − ${n(S)} = ₹${n(M - S)}, सदा अंकित मूल्य पर: ${n(M - S)} ÷ ${n(M)} × 100 = ${pct(d)}।`);
  },
};

const mpFromSP = {
  id: "mpFromSP", group: "md", levels: ["easy", "medium"],
  cands: () => cross(MPS, DISCS).filter(([M, d]) => whole(M * d / 100)),
  build: (t, prm) => {
    const [M, d] = prm; const w = who(prm); const it = itemFor(M, prm);
    const S = clean(M * (1 - d / 100));
    return Q(t, `After a discount of ${d}%, ${w.name} pays ₹${n(S)} for ${it.en}. What is its marked price?`,
      `${d}% छूट के बाद ${w.nameH} ${it.hi} के लिए ₹${n(S)} ${w.v("चुकाता", "चुकाती")} है। इसका अंकित मूल्य कितना है?`,
      choices(M, money, [S * (1 + d / 100), S + d, S * (1 + d / 50)], { step: stepOf(M) }), 0, () => money(clean(S * 100 / (100 - d))),
      `Marked price × ${f(-d)} = ${n(S)}, so the marked price = ${n(S)} ÷ ${f(-d)} = ${money(M)}. (Adding ${d}% to ${n(S)} is wrong: the discount is on the marked price.)`,
      `अंकित मूल्य × ${f(-d)} = ${n(S)}, अतः अंकित मूल्य = ${n(S)} ÷ ${f(-d)} = ${money(M)}। (${n(S)} में ${d}% जोड़ना गलत है: छूट अंकित मूल्य पर है।)`);
  },
};

const discAmt = {
  id: "discAmt", group: "md", levels: ["easy"],
  cands: () => cross(MPS, DISCS).filter(([M, d]) => whole(M * d / 100)),
  build: (t, prm) => {
    const [M, d] = prm; const it = itemFor(M, prm);
    const D = clean(M * d / 100);
    return Q(t, `In a sale, ${it.en} marked at ₹${n(M)} is offered at ${d}% off. How much does a buyer save?`,
      `एक सेल में ${it.hi} का अंकित मूल्य ₹${n(M)} है और उस पर ${d}% छूट दी जाती है। खरीदार की कितनी बचत होती है?`,
      choices(D, money, [M - D, D * 2, M * (d + 5) / 100], { step: stepOf(D) }), 0, () => money(clean(M * d / 100)),
      `Saving = discount = ${d}% of ${n(M)} = ${n(M)} × ${d}/100 = ${money(D)}.`,
      `बचत = छूट = ${n(M)} का ${d}% = ${n(M)} × ${d}/100 = ${money(D)}।`);
  },
};

const markupProfit = {
  id: "markupProfit", group: "md2", levels: ["easy", "medium"],
  cands: () => cross(MARKUPS, DISCS).filter(([m, d]) => { const o = (1 + m / 100) * (1 - d / 100) * 100 - 100; return o >= 2 && L.near2(o) && !["40,25", "50,20", "40,20", "40,15"].includes(`${m},${d}`); }),
  build: (t, prm) => {
    const [m, d] = prm; const s0 = seller(prm);
    const o = clean((1 + m / 100) * (1 - d / 100) * 100 - 100);
    return Q(t, `${s0.en} marks his goods ${m}% above the cost price and gives a discount of ${d}%. What is his profit percentage?`,
      `${s0.hi} अपने सामान पर क्रय मूल्य से ${m}% अधिक मूल्य अंकित करता है और ${d}% छूट देता है। उसका लाभ प्रतिशत कितना है?`,
      choices(o, pct, [m - d, (m - d) / 2, m - d + m * d / 100], { step: 5 }), 0, () => pct(clean((100 + m) * (100 - d) / 100 - 100)),
      `Take the cost as 100: marked price ${100 + m}; after ${d}% off: ${100 + m} × ${f(-d)} = ${n(100 + o)}. Profit = ${pct(o)}. (Not ${m} − ${d}: the discount is on the larger, marked price.)`,
      `क्रय मूल्य 100 लें: अंकित मूल्य ${100 + m}; ${d}% छूट के बाद: ${100 + m} × ${f(-d)} = ${n(100 + o)}। लाभ = ${pct(o)}। (${m} − ${d} नहीं: छूट बड़े, अंकित मूल्य पर है।)`);
  },
};

const twoDiscSP = {
  id: "twoDiscSP", levels: ["easy", "medium"],
  cands: () => cross(MPS.filter((M) => M >= 500), [10, 15, 20, 25, 30, 40], [5, 10, 12, 15, 20, 25]).filter(([M, a, b]) => a >= b && whole(M * (1 - a / 100)) && whole(M * (1 - a / 100) * (1 - b / 100))),
  build: (t, prm) => {
    const [M, a, b] = prm; const it = itemFor(M, prm);
    const s1 = clean(M * (1 - a / 100)), S = clean(s1 * (1 - b / 100));
    return Q(t, `${it.en[0].toUpperCase() + it.en.slice(1)} is marked at ₹${n(M)}. The shop gives successive discounts of ${a}% and ${b}%. What is the selling price?`,
      `${it.hi} का अंकित मूल्य ₹${n(M)} है। दुकान ${a}% और ${b}% की क्रमागत छूटें देती है। विक्रय मूल्य कितना है?`,
      choices(S, money, [M * (1 - (a + b) / 100), s1, M * (1 - (a + b) / 100) - M * a * b / 10000], { step: stepOf(S) }), 0, () => money(clean(M * (100 - a) * (100 - b) / 10000)),
      `After ${a}%: ${n(M)} × ${f(-a)} = ₹${n(s1)}. After ${b}% more: ${n(s1)} × ${f(-b)} = ${money(S)}. (The second discount is on ₹${n(s1)}, not on ₹${n(M)}.)`,
      `${a}% के बाद: ${n(M)} × ${f(-a)} = ₹${n(s1)}। फिर ${b}% के बाद: ${n(s1)} × ${f(-b)} = ${money(S)}। (दूसरी छूट ₹${n(s1)} पर है, ₹${n(M)} पर नहीं।)`);
  },
};

const equivDisc = {
  id: "equivDisc", levels: ["easy", "medium"],
  cands: () => cross([10, 12, 15, 20, 25, 30, 40, 50], [5, 8, 10, 12, 15, 20, 25, 30]).filter(([a, b]) => a >= b && L.near2(a + b - a * b / 100)).flatMap((p) => [[...p, 1], [...p, 2]]),
  build: (t, prm) => {
    const [a, b, form] = prm;
    const e = clean(a + b - a * b / 100);
    return Q(t, form === 1 ? `A store offers two successive discounts of ${a}% and ${b}%. What single discount is equal to them?` : `A store takes ${a}% off the price and then a further ${b}% off the reduced price. What single discount is this equal to?`,
      form === 1 ? `एक स्टोर ${a}% और ${b}% की दो क्रमागत छूटें देता है। इनके बराबर एकल छूट कितनी है?` : `एक स्टोर मूल्य पर ${a}% छूट देता है और फिर घटे हुए मूल्य पर ${b}% की और छूट देता है। यह कितनी एकल छूट के बराबर है?`,
      choices(e, pct, [a + b, (a + b) / 2, a + b + a * b / 100], { step: 2 }), 0, () => pct(clean(100 - (100 - a) * (100 - b) / 100)),
      `Pay ${f(-a)} × ${f(-b)} = ${n((1 - a / 100) * (1 - b / 100))} of the price, so the discount is ${a} + ${b} − (${a} × ${b})/100 = ${pct(e)}.`,
      `मूल्य का ${f(-a)} × ${f(-b)} = ${n((1 - a / 100) * (1 - b / 100))} भाग चुकाना पड़ता है, अतः छूट = ${a} + ${b} − (${a} × ${b})/100 = ${pct(e)}।`);
  },
};

const OFFERS = [[1, 1], [2, 1], [3, 1], [4, 1], [3, 2], [5, 1], [7, 3], [9, 1], [3, 3], [4, 4]];
const offerBuyGet = {
  id: "offerBuyGet", levels: ["easy", "medium"],
  cands: () => OFFERS.filter(([x, y]) => L.gcd(x, y) === 1 && nicePct(y / (x + y) * 100)).map(([x, y]) => [x, y, L.hashOf([x, y, 5]) % 3 + 1]),
  build: (t, prm) => {
    const [x, y, form] = prm;
    const [it, itH] = [["shirts", "कमीज़ों"], ["soaps", "साबुन"], ["notebooks", "कॉपियों"]][form - 1];
    const e = clean(y / (x + y) * 100);
    return Q(t, `A shop runs an offer: "Buy ${x}, get ${y} free" on ${it}. What is the effective discount?`,
      `एक दुकान ${itH} पर "${x} खरीदें, ${y} मुफ़्त पाएँ" की योजना चलाती है। प्रभावी छूट कितनी है?`,
      choices(e, pct, [y / x * 100, y / (x + y) * 50, 100 - e], { step: 5 }), 0, () => pct(clean(100 - x / (x + y) * 100)),
      `You get ${x + y} items and pay for ${x}: ${y} free out of ${x + y}, i.e. ${y} ÷ ${x + y} × 100 = ${pct(e)} off.`,
      `${x + y} वस्तुएँ मिलती हैं और भुगतान ${x} का: ${x + y} में ${y} मुफ़्त, यानी ${y} ÷ ${x + y} × 100 = ${pct(e)} छूट।`);
  },
};

const cpFromMarkup = {
  id: "cpFromMarkup", group: "mm", levels: ["easy"],
  cands: () => cross(MPS, MARKUPS).filter(([C, m]) => whole(C * (1 + m / 100)) && C * (1 + m / 100) <= 60000),
  build: (t, prm) => {
    const [C, m] = prm; const s0 = seller(prm); const it = itemFor(C, prm);
    const M = clean(C * (1 + m / 100));
    return Q(t, `${s0.en} marks ${it.en} at ₹${n(M)}, which is ${m}% above its cost price. What is its cost price?`,
      `${s0.hi} ${it.hi} पर ₹${n(M)} अंकित करता है, जो उसके क्रय मूल्य से ${m}% अधिक है। इसका क्रय मूल्य कितना है?`,
      choices(C, money, [M * (1 - m / 100), M - m, M / (1 + m / 50)], { step: stepOf(C) }), 0, () => money(clean(M * 100 / (100 + m))),
      `Cost × ${f(m)} = ${n(M)}, so cost = ${n(M)} ÷ ${f(m)} = ${money(C)}.`,
      `क्रय मूल्य × ${f(m)} = ${n(M)}, अतः क्रय मूल्य = ${n(M)} ÷ ${f(m)} = ${money(C)}।`);
  },
};

const mpFromCPdisc = {
  id: "mpFromCPdisc", levels: ["easy", "medium"],
  cands: () => cross(MPS.filter((C) => C <= 40000), [10, 12, 15, 20, 25, 30, 40, 50], [5, 10, 12, 15, 20, 25]).filter(([C, g, d]) => whole(C * (1 + g / 100) / (1 - d / 100)) && whole(C * (1 + g / 100))),
  build: (t, prm) => {
    const [C, g, d] = prm; const s0 = seller(prm); const it = itemFor(C, prm);
    const S = clean(C * (1 + g / 100)), M = clean(S / (1 - d / 100));
    return Q(t, `${s0.en} buys ${it.en} for ₹${n(C)}. He wants a profit of ${g}% after giving a discount of ${d}%. What price should he mark on it?`,
      `${s0.hi} ${it.hi} ₹${n(C)} में खरीदता है। वह ${d}% छूट देने के बाद भी ${g}% लाभ चाहता है। उसे इस पर कितना मूल्य अंकित करना चाहिए?`,
      choices(M, money, [C * (1 + (g + d) / 100), S * (1 + d / 100), S], { step: stepOf(M) }), 0, () => money(clean(C * (100 + g) / (100 - d))),
      `Selling price needed: ${n(C)} × ${f(g)} = ₹${n(S)}. This is ${100 - d}% of the marked price, so marked price = ${n(S)} ÷ ${f(-d)} = ${money(M)}.`,
      `आवश्यक विक्रय मूल्य: ${n(C)} × ${f(g)} = ₹${n(S)}। यह अंकित मूल्य का ${100 - d}% है, अतः अंकित मूल्य = ${n(S)} ÷ ${f(-d)} = ${money(M)}।`);
  },
};

const mpFromDiscAmt = {
  id: "mpFromDiscAmt", group: "md", levels: ["easy"],
  cands: () => cross(MPS, DISCS).filter(([M, d]) => whole(M * d / 100)),
  build: (t, prm) => {
    const [M, d] = prm; const w = who(prm); const it = itemFor(M, prm);
    const D = clean(M * d / 100);
    return Q(t, `${w.name} gets a discount of ${d}% on ${it.en} and saves ₹${n(D)}. What is the marked price?`,
      `${w.nameH} को ${it.hi} पर ${d}% छूट मिलती है और उसकी ₹${n(D)} की बचत होती है। अंकित मूल्य कितना है?`,
      choices(M, money, [M - D, D * (100 - d) / d, D * (100 + d) / d], { step: stepOf(M) }), 0, () => money(clean(D * 100 / d)),
      `${d}% of the marked price = ${n(D)}, so the marked price = ${n(D)} × 100/${d} = ${money(M)}.`,
      `अंकित मूल्य का ${d}% = ${n(D)}, अतः अंकित मूल्य = ${n(D)} × 100/${d} = ${money(M)}।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
const markupNeeded = {
  id: "markupNeeded", group: "gd", levels: ["medium", "hard", "advanced"],
  cands: () => cross([4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 24, 25, 26, 28, 30, 32, 35, 36, 40, 44, 45, 50, 60], [4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 25, 28, 30, 32, 35, 36, 40]).filter(([g, d]) => { const m = (1 + g / 100) / (1 - d / 100) * 100 - 100; return nicePct(m) && m <= 150; }),
  build: (t, prm) => {
    const [g, d] = prm; const s0 = seller(prm);
    const m = clean((1 + g / 100) / (1 - d / 100) * 100 - 100);
    return Q(t, `${s0.en} wants to make a profit of ${g}% even after giving a discount of ${d}%. By what percentage above the cost price should he mark his goods?`,
      `${s0.hi} ${d}% छूट देने के बाद भी ${g}% लाभ कमाना चाहता है। उसे अपने सामान पर क्रय मूल्य से कितने प्रतिशत अधिक मूल्य अंकित करना चाहिए?`,
      choices(m, pct, [g + d, g + d + g * d / 100, g / (1 - d / 100)], { step: 5 }), 0, () => pct(clean(((100 + g) / (100 - d) - 1) * 100)),
      `Cost 100 → selling price ${100 + g}. Marked price × ${f(-d)} = ${100 + g}, so marked price = ${n(100 + m)}: ${pct(m)} above the cost.`,
      `क्रय मूल्य 100 → विक्रय मूल्य ${100 + g}। अंकित मूल्य × ${f(-d)} = ${100 + g}, अतः अंकित मूल्य = ${n(100 + m)}: क्रय मूल्य से ${pct(m)} अधिक।`);
  },
};

const discForProfit = {
  id: "discForProfit", levels: ["medium", "hard", "advanced"],
  cands: () => cross([20, 25, 30, 32, 35, 40, 44, 50, 54, 60, 65, 68, 75, 80, 100], [4, 5, 8, 10, 12, 15, 17, 20, 25, 30, 32, 40]).filter(([m, g]) => { const d = 100 - (100 + g) / (1 + m / 100); return g < m && d >= 4 && nicePct(d); }),
  build: (t, prm) => {
    const [m, g] = prm; const s0 = seller(prm);
    const d = clean(100 - (100 + g) / (1 + m / 100));
    return Q(t, `${s0.en} marks his goods ${m}% above the cost price. What discount can he give and still make a profit of ${g}%?`,
      `${s0.hi} अपने सामान पर क्रय मूल्य से ${m}% अधिक मूल्य अंकित करता है। वह कितनी छूट दे कि फिर भी उसे ${g}% लाभ हो?`,
      choices(d, pct, [m - g, (m - g) / (1 + g / 100), (m - g) / 2], { step: 5 }), 0, () => pct(clean((1 - (1 + g / 100) / (1 + m / 100)) * 100)),
      `Cost 100: marked ${100 + m}, wanted selling price ${100 + g}. Discount = ${m - g} on ${100 + m}: ${m - g} ÷ ${100 + m} × 100 = ${pct(d)}.`,
      `क्रय मूल्य 100: अंकित ${100 + m}, आवश्यक विक्रय मूल्य ${100 + g}। छूट = ${100 + m} पर ${m - g}: ${m - g} ÷ ${100 + m} × 100 = ${pct(d)}।`);
  },
};

const threeDiscSP = {
  id: "threeDiscSP", levels: ["medium", "hard"],
  cands: () => cross(MPS.filter((M) => M >= 1000), [10, 20, 25, 30], [10, 20, 25], [5, 10, 20]).filter(([M, a, b, c]) => a >= b && b >= c && whole(M * (1 - a / 100)) && whole(M * (1 - a / 100) * (1 - b / 100)) && whole(M * (1 - a / 100) * (1 - b / 100) * (1 - c / 100))),
  build: (t, prm) => {
    const [M, a, b, c] = prm; const it = itemFor(M, prm);
    const s1 = clean(M * (1 - a / 100)), s2 = clean(s1 * (1 - b / 100)), S = clean(s2 * (1 - c / 100));
    return Q(t, `The list price of ${it.en} is ₹${n(M)}. A buyer gets successive discounts of ${a}%, ${b}% and ${c}%. How much does the buyer pay?`,
      `${it.hi} का सूची मूल्य ₹${n(M)} है। एक खरीदार को ${a}%, ${b}% और ${c}% की क्रमागत छूटें मिलती हैं। खरीदार कितना भुगतान करता है?`,
      choices(S, money, [M * (1 - (a + b + c) / 100), s2, M * (1 - (a + b) / 100) * (1 - c / 100)], { step: stepOf(S) }), 0, () => money(clean(M * (100 - a) * (100 - b) * (100 - c) / 1e6)),
      `${n(M)} × ${f(-a)} = ₹${n(s1)}; × ${f(-b)} = ₹${n(s2)}; × ${f(-c)} = ${money(S)}.`,
      `${n(M)} × ${f(-a)} = ₹${n(s1)}; × ${f(-b)} = ₹${n(s2)}; × ${f(-c)} = ${money(S)}।`);
  },
};

const cpFromMPdiscGain = {
  id: "cpFromMPdiscGain", levels: ["medium", "hard", "advanced"],
  cands: () => cross(MPS, [5, 10, 12, 15, 20, 25, 30], [5, 8, 10, 12, 15, 20, 25, 30, 40, 50]).filter(([M, d, g]) => whole(M * (1 - d / 100)) && whole(M * (1 - d / 100) / (1 + g / 100)) && !(M === 280 && d === 10)),
  build: (t, prm) => {
    const [M, d, g] = prm; const s0 = seller(prm); const it = itemFor(M, prm);
    const S = clean(M * (1 - d / 100)), C = clean(S / (1 + g / 100));
    return Q(t, `${s0.en} gives a discount of ${d}% on ${it.en} marked at ₹${n(M)} and still makes a profit of ${g}%. What is its cost price?`,
      `${s0.hi} ${it.hi} का अंकित मूल्य ₹${n(M)} रखता है और उस पर ${d}% छूट देता है, फिर भी उसे ${g}% लाभ होता है। इसका क्रय मूल्य कितना है?`,
      choices(C, money, [S * (1 - g / 100), M / (1 + g / 100), M * (1 - (d + g) / 100)], { step: stepOf(C) }), 0, () => money(clean(M * (100 - d) / (100 + g))),
      `Selling price = ${n(M)} × ${f(-d)} = ₹${n(S)}. Cost × ${f(g)} = ${n(S)}, so cost = ${n(S)} ÷ ${f(g)} = ${money(C)}.`,
      `विक्रय मूल्य = ${n(M)} × ${f(-d)} = ₹${n(S)}। क्रय मूल्य × ${f(g)} = ${n(S)}, अतः क्रय मूल्य = ${n(S)} ÷ ${f(g)} = ${money(C)}।`);
  },
};

const discVsTwo = {
  id: "discVsTwo", levels: ["medium", "hard"],
  cands: () => cross(MPS.filter((M) => M >= 1000), [10, 15, 20, 25, 30], [5, 10, 15, 20]).filter(([M, a, b]) => a >= b && whole(M * a * b / 10000)),
  build: (t, prm) => {
    const [M, a, b] = prm; const it = itemFor(M, prm);
    const D = clean(M * a * b / 10000);
    return Q(t, `On ${it.en} marked at ₹${n(M)}, how much more does a buyer save with a single discount of ${a + b}% than with two successive discounts of ${a}% and ${b}%?`,
      `${it.hi} का अंकित मूल्य ₹${n(M)} है। इस पर ${a}% और ${b}% की दो क्रमागत छूटों की तुलना में ${a + b}% की एकल छूट से खरीदार की कितनी अधिक बचत होती है?`,
      choices(D, money, [M * (a + b) / 100, M * a * b / 1000, D * 2], { step: stepOf(D) }), 0, () => money(clean(M * (1 - a / 100) * (1 - b / 100) - M * (1 - (a + b) / 100))),
      `Single: pays ${n(M)} × ${f(-(a + b))} = ₹${n(M * (1 - (a + b) / 100))}. Successive: ${n(M)} × ${f(-a)} × ${f(-b)} = ₹${n(M * (1 - a / 100) * (1 - b / 100))}. Difference = ${money(D)} (= ${a}% of ${b}% of ${n(M)}).`,
      `एकल: भुगतान ${n(M)} × ${f(-(a + b))} = ₹${n(M * (1 - (a + b) / 100))}। क्रमागत: ${n(M)} × ${f(-a)} × ${f(-b)} = ₹${n(M * (1 - a / 100) * (1 - b / 100))}। अंतर = ${money(D)} (= ${n(M)} के ${b}% का ${a}%)।`);
  },
};

const freeAndDisc = {
  id: "freeAndDisc", levels: ["medium", "hard"],
  cands: () => cross([[2, 1], [3, 1], [4, 1], [3, 2], [5, 1], [9, 1], [7, 3], [4, 3], [5, 3]], [4, 5, 8, 10, 12, 15, 16, 20, 25, 30]).map(([o, d]) => [...o, d]).filter(([x, y, d]) => nicePct(100 - x / (x + y) * (100 - d))),
  build: (t, prm) => {
    const [x, y, d] = prm;
    const e = clean(100 - x / (x + y) * (100 - d));
    return Q(t, `A shop offers "Buy ${x}, get ${y} free" and, on top of it, ${L.P.an(d)} ${d}% discount on the bill. What is the effective discount on the goods?`,
      `एक दुकान "${x} खरीदें, ${y} मुफ़्त पाएँ" के साथ बिल पर ${d}% की छूट भी देती है। सामान पर प्रभावी छूट कितनी है?`,
      choices(e, pct, [y / (x + y) * 100 + d, y / x * 100 + d, 100 - x / (x + y) * 100], { step: 5 }), 0, () => pct(clean((1 - x * (1 - d / 100) / (x + y)) * 100)),
      `For ${x + y} items worth ${x + y} units you pay for ${x}, less ${d}%: ${x} × ${f(-d)} = ${n(x * (1 - d / 100))}. Saving ${n(x + y - x * (1 - d / 100))} of ${x + y}: ${pct(e)}.`,
      `${x + y} वस्तुओं (मूल्य ${x + y} इकाई) के लिए भुगतान ${x} का, ${d}% कम: ${x} × ${f(-d)} = ${n(x * (1 - d / 100))}। ${x + y} में बचत ${n(x + y - x * (1 - d / 100))}: ${pct(e)}।`);
  },
};

const ratioCPMP = {
  id: "ratioCPMP", group: "gd", levels: ["medium"],
  cands: () => cross([5, 10, 12, 15, 20, 25, 30, 40, 50], [5, 10, 12, 15, 20, 25, 30]).filter(([g, d]) => g !== d),
  build: (t, prm) => {
    const [g, d] = prm; const s0 = seller(prm);
    const ans = ratio(100 - d, 100 + g);
    const opts = [ans, ratio(100 + g, 100 - d), ratio(100 - g, 100 + d), ratio(100, 100 + g + d)].filter((v, i, a) => a.indexOf(v) === i);
    if (opts.length < 4) opts.push(ratio(100 - d, 100 + g + 5));
    return Q(t, `${s0.en} gives a discount of ${d}% and still makes a profit of ${g}%. What is the ratio of the cost price to the marked price?`,
      `${s0.hi} ${d}% छूट देता है और फिर भी उसे ${g}% लाभ होता है। क्रय मूल्य और अंकित मूल्य का अनुपात क्या है?`,
      opts.slice(0, 4), 0, () => ratio((100 - d) / 100, (100 + g) / 100),
      `Selling price = ${f(g)} × cost = ${f(-d)} × marked price, so cost : marked = ${f(-d)} : ${f(g)} = ${ans}.`,
      `विक्रय मूल्य = ${f(g)} × क्रय मूल्य = ${f(-d)} × अंकित मूल्य, अतः क्रय मूल्य : अंकित मूल्य = ${f(-d)} : ${f(g)} = ${ans}।`);
  },
};

const mpFromDiscDiff = {
  id: "mpFromDiscDiff", levels: ["medium"],
  cands: () => cross(MPS, [10, 15, 20, 25, 30, 40], [5, 8, 10, 12, 15, 20]).filter(([M, a, b]) => a > b && whole(M * (a - b) / 100)),
  build: (t, prm) => {
    const [M, a, b] = prm; const it = itemFor(M, prm);
    const D = clean(M * (a - b) / 100);
    return Q(t, `A buyer saves ₹${n(D)} more on ${it.en} with a discount of ${a}% than with a discount of ${b}%. What is its marked price?`,
      `${it.hi} पर ${b}% छूट की तुलना में ${a}% छूट से खरीदार की ₹${n(D)} अधिक बचत होती है। इसका अंकित मूल्य कितना है?`,
      choices(M, money, [D * 100 / a, D * 100 / b, D * 100 / (a + b)], { step: stepOf(M) }), 0, () => money(clean(D * 100 / (a - b))),
      `The two discounts differ by ${a} − ${b} = ${a - b}% of the marked price. ${a - b}% = ${n(D)}, so the marked price = ${n(D)} × 100/${a - b} = ${money(M)}.`,
      `दोनों छूटों में अंकित मूल्य के ${a} − ${b} = ${a - b}% का अंतर है। ${a - b}% = ${n(D)}, अतः अंकित मूल्य = ${n(D)} × 100/${a - b} = ${money(M)}।`);
  },
};

// ---------------------------------------------------------------- HARD
const secondDisc = {
  id: "secondDisc", levels: ["hard", "advanced"],
  cands: () => cross(MPS.filter((M) => M >= 1000), [10, 15, 20, 25, 30], [4, 5, 8, 10, 12, 15, 20, 25]).filter(([M, a, b]) => whole(M * (1 - a / 100)) && whole(M * (1 - a / 100) * (1 - b / 100)) && a !== b),
  build: (t, prm) => {
    const [M, a, b] = prm; const it = itemFor(M, prm);
    const s1 = clean(M * (1 - a / 100)), S = clean(s1 * (1 - b / 100));
    return Q(t, `${it.en[0].toUpperCase() + it.en.slice(1)} marked at ₹${n(M)} is sold for ₹${n(S)} after two successive discounts. The first discount is ${a}%. What is the second?`,
      `${it.hi} का अंकित मूल्य ₹${n(M)} है। दो क्रमागत छूटों के बाद इसका विक्रय मूल्य ₹${n(S)} रह जाता है। पहली छूट ${a}% है। दूसरी छूट कितनी है?`,
      choices(b, pct, [(M - S) / M * 100 - a, (s1 - S) / M * 100, (s1 - S) / S * 100], { step: 5 }), 0, () => pct(clean((M * (1 - a / 100) - S) / (M * (1 - a / 100)) * 100)),
      `After ${a}%: ${n(M)} × ${f(-a)} = ₹${n(s1)}. The second discount takes it from ${n(s1)} to ${n(S)}: ${n(s1 - S)} ÷ ${n(s1)} × 100 = ${pct(b)}.`,
      `${a}% के बाद: ${n(M)} × ${f(-a)} = ₹${n(s1)}। दूसरी छूट इसे ${n(s1)} से ${n(S)} करती है: ${n(s1 - S)} ÷ ${n(s1)} × 100 = ${pct(b)}।`);
  },
};

const changeDisc = {
  id: "changeDisc", levels: ["hard", "advanced"],
  cands: () => cross([5, 10, 12, 15, 20, 25], [10, 12, 15, 20, 25, 30, 32, 40, 44, 50], [10, 15, 20, 25, 30, 40]).filter(([d1, g1, d2]) => { const o = (1 - d2 / 100) / (1 - d1 / 100) * (1 + g1 / 100) * 100 - 100; return d2 > d1 && Math.abs(o) >= 1 && L.near2(o); }),
  build: (t, prm) => {
    const [d1, g1, d2] = prm; const s0 = seller(prm);
    const o = clean((1 - d2 / 100) / (1 - d1 / 100) * (1 + g1 / 100) * 100 - 100);
    const M = clean(100 * (1 + g1 / 100) / (1 - d1 / 100));
    return SQ(t, `${s0.en} gives a discount of ${d1}% and makes a profit of ${g1}%. What would his profit or loss percentage be if he gave a discount of ${d2}% instead?`,
      `${s0.hi} ${d1}% छूट देता है और उसे ${g1}% लाभ होता है। यदि वह ${d2}% छूट दे, तो उसका लाभ या हानि प्रतिशत क्या होगा?`,
      o, [g1 - (d2 - d1), g1 - (d2 - d1) * 2, (1 + g1 / 100) * (1 - (d2 - d1) / 100) * 100 - 100], () => (M * (1 - d2 / 100) - 100),
      `Cost 100 → selling price ${100 + g1} = ${f(-d1)} × marked price, so marked price = ${n(M)}. With ${d2}% off: ${n(M)} × ${f(-d2)} = ${n(100 + o)}: ${pl(o)}.`,
      `क्रय मूल्य 100 → विक्रय मूल्य ${100 + g1} = ${f(-d1)} × अंकित मूल्य, अतः अंकित मूल्य = ${n(M)}। ${d2}% छूट पर: ${n(M)} × ${f(-d2)} = ${n(100 + o)}: ${plH(o)}।`);
  },
};

const markupTwoDisc = {
  id: "markupTwoDisc", levels: ["hard", "advanced"],
  cands: () => cross(MARKUPS, [10, 15, 20, 25, 30], [5, 10, 15, 20, 25]).filter(([m, a, b]) => { const o = (1 + m / 100) * (1 - a / 100) * (1 - b / 100) * 100 - 100; return a >= b && Math.abs(o) >= 1 && L.near2(o) && !(m === 40 && a === 20 && b === 10); }),
  build: (t, prm) => {
    const [m, a, b] = prm; const s0 = seller(prm);
    const o = clean((1 + m / 100) * (1 - a / 100) * (1 - b / 100) * 100 - 100);
    return SQ(t, `${s0.en} marks his goods ${m}% above the cost price and then allows successive discounts of ${a}% and ${b}%. What is his profit or loss percentage?`,
      `${s0.hi} अपने सामान पर क्रय मूल्य से ${m}% अधिक मूल्य अंकित करता है और फिर ${a}% और ${b}% की क्रमागत छूटें देता है। उसका लाभ या हानि प्रतिशत क्या है?`,
      o, [m - a - b, (1 + m / 100) * (1 - (a + b) / 100) * 100 - 100, m - a], () => (100 + m) * (100 - a) * (100 - b) / 10000 - 100,
      `Cost 100 → marked ${100 + m} → ${n((100 + m) * (1 - a / 100))} → ${n(100 + o)}: ${pl(o)}.`,
      `क्रय मूल्य 100 → अंकित ${100 + m} → ${n((100 + m) * (1 - a / 100))} → ${n(100 + o)}: ${plH(o)}।`);
  },
};

const noDiscountProfit = {
  id: "noDiscountProfit", group: "gd", levels: ["hard", "advanced"],
  cands: () => cross([4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 24, 25, 26, 28, 30, 32, 35, 36, 40, 44, 45, 50, 60], [4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 25, 28, 30, 32, 35, 36, 40]).filter(([g, d]) => { const m = (1 + g / 100) / (1 - d / 100) * 100 - 100; return nicePct(m) && m <= 150; }),
  build: (t, prm) => {
    const [g, d] = prm; const w = who(prm);
    const m = clean((1 + g / 100) / (1 - d / 100) * 100 - 100);
    return Q(t, `By giving a discount of ${d}%, ${w.name} makes a profit of ${g}%. What would ${w.his} profit percentage be if ${w.he} gave no discount?`,
      `${d}% छूट देकर ${w.nameH} को ${g}% लाभ होता है। यदि ${w.v("वह", "वह")} कोई छूट न दे, तो उसका लाभ प्रतिशत कितना होगा?`,
      choices(m, pct, [g + d, g + d + g * d / 100, g / (1 - d / 100)], { step: 5 }), 0, () => pct(clean(((100 + g) / (100 - d) - 1) * 100)),
      `Cost 100 → selling price ${100 + g} = ${f(-d)} × marked price. Marked price = ${100 + g} ÷ ${f(-d)} = ${n(100 + m)}, so with no discount the profit is ${pct(m)}.`,
      `क्रय मूल्य 100 → विक्रय मूल्य ${100 + g} = ${f(-d)} × अंकित मूल्य। अंकित मूल्य = ${100 + g} ÷ ${f(-d)} = ${n(100 + m)}, अतः बिना छूट लाभ ${pct(m)} होगा।`);
  },
};

const ratioDiscProfit = {
  id: "ratioDiscProfit", levels: ["hard", "advanced"],
  cands: () => cross([2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 15, 16, 20], [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 21, 25], [5, 8, 10, 12, 15, 20, 25, 30])
    .filter(([a, b, d]) => { const o = b * (1 - d / 100) / a * 100 - 100; return a < b && b <= a * 2 && L.gcd(a, b) === 1 && Math.abs(o) >= 2 && L.near2(o); }),
  build: (t, prm) => {
    const [a, b, d] = prm; const s0 = seller(prm);
    const o = clean(b * (1 - d / 100) / a * 100 - 100);
    return SQ(t, `The cost price and the marked price of an article are in the ratio ${a} : ${b}. ${s0.en} sells it at a discount of ${d}%. What is his profit or loss percentage?`,
      `एक वस्तु के क्रय मूल्य और अंकित मूल्य का अनुपात ${a} : ${b} है। ${s0.hi} इसे ${d}% छूट पर बेचता है। उसका लाभ या हानि प्रतिशत क्या है?`,
      o, [(b - a) / a * 100 - d, (b - a) / b * 100 - d, b * (1 - d / 100) / a * 100 - 100 + d / 2], () => (b * (100 - d) / 100 - a) / a * 100,
      `Cost ${a}, marked ${b}. Selling price = ${b} × ${f(-d)} = ${n(b * (1 - d / 100))}. ${o >= 0 ? "Profit" : "Loss"} = ${n(Math.abs(b * (1 - d / 100) - a))} on ${a}: ${pl(o)}.`,
      `क्रय मूल्य ${a}, अंकित ${b}। विक्रय मूल्य = ${b} × ${f(-d)} = ${n(b * (1 - d / 100))}। ${a} पर ${o >= 0 ? "लाभ" : "हानि"} = ${n(Math.abs(b * (1 - d / 100) - a))}: ${plH(o)}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
const freeDiscMarkup = {
  id: "freeDiscMarkup", levels: ["advanced"],
  cands: () => cross([[2, 1], [3, 1], [4, 1], [3, 2], [5, 1], [9, 1]], [5, 10, 20, 25], [5, 8, 10, 12, 20, 25, 30]).map(([o, d, g]) => [...o, d, g]).filter(([x, y, d, g]) => { const m = (1 + g / 100) / (x / (x + y) * (1 - d / 100)) * 100 - 100; return nicePct(m) && m <= 150; }),
  build: (t, prm) => {
    const [x, y, d, g] = prm; const s0 = seller(prm);
    const k = clean(x / (x + y) * (1 - d / 100)), m = clean((1 + g / 100) / k * 100 - 100);
    return Q(t, `${s0.en} offers "Buy ${x}, get ${y} free" and also ${L.P.an(d)} ${d}% discount on the bill, and still makes a profit of ${g}%. By what percentage above the cost price are his goods marked?`,
      `${s0.hi} "${x} खरीदें, ${y} मुफ़्त पाएँ" और बिल पर ${d}% छूट भी देता है, और फिर भी उसे ${g}% लाभ होता है। उसके सामान पर क्रय मूल्य से कितने प्रतिशत अधिक मूल्य अंकित है?`,
      choices(m, pct, [g + d + y / (x + y) * 100, (1 + g / 100) / (1 - d / 100) * 100 - 100, g + y / x * 100], { step: 10 }), 0, () => pct(clean(((x + y) * (100 + g) / (x * (100 - d)) - 1) * 100)),
      `Let each item cost 1 and be marked at M. For ${x + y} items (cost ${x + y}) he gets ${x}M × ${f(-d)} = ${n(x * (1 - d / 100))}M, which must be ${n((x + y) * (1 + g / 100))}. So M = ${n(100 + m)}/100: ${pct(m)} above the cost.`,
      `मान लें एक वस्तु का क्रय मूल्य 1 और अंकित मूल्य M है। ${x + y} वस्तुओं (क्रय मूल्य ${x + y}) पर उसे ${x}M × ${f(-d)} = ${n(x * (1 - d / 100))}M मिलता है, जो ${n((x + y) * (1 + g / 100))} होना चाहिए। अतः M = ${n(100 + m)}/100: क्रय मूल्य से ${pct(m)} अधिक।`);
  },
};

const cpFromProfitAmt = {
  id: "cpFromProfitAmt", levels: ["advanced"],
  cands: () => cross(MPS.filter((C) => C <= 40000), MARKUPS, [5, 10, 12, 15, 20, 25]).filter(([C, m, d]) => { const p = C * ((1 + m / 100) * (1 - d / 100) - 1); return p > 0 && whole(p) && whole(C * (1 + m / 100)); }),
  build: (t, prm) => {
    const [C, m, d] = prm; const w = who(prm); const it = itemFor(C, prm);
    const k = clean((1 + m / 100) * (1 - d / 100) - 1), P = clean(C * k), M = clean(C * (1 + m / 100));
    return Q(t, `${w.name} marks ${it.en} ${m}% above its cost price and sells it at a discount of ${d}%, making a profit of ₹${n(P)}. What is its cost price?`,
      `${w.nameH} ${it.hi} पर उसके क्रय मूल्य से ${m}% अधिक मूल्य अंकित ${w.v("करता", "करती")} है और ${d}% छूट पर बेचकर ₹${n(P)} लाभ ${w.v("कमाता", "कमाती")} है। इसका क्रय मूल्य कितना है?`,
      choices(C, money, [P * 100 / (m - d), P * 100 / m, M], { step: stepOf(C) }), 0, () => money(clean(P / ((100 + m) * (100 - d) / 10000 - 1))),
      `Cost C → marked ${f(m)}C → sold for ${f(m)} × ${f(-d)}C = ${n(1 + k)}C. Profit ${n(k)}C = ${n(P)}, so C = ${money(C)}.`,
      `क्रय मूल्य C → अंकित ${f(m)}C → विक्रय ${f(m)} × ${f(-d)}C = ${n(1 + k)}C। लाभ ${n(k)}C = ${n(P)}, अतः C = ${money(C)}।`);
  },
};

const shopsCompare = {
  id: "shopsCompare", levels: ["advanced"],
  cands: () => cross(MPS.filter((M) => M >= 2000), [10, 15, 20, 25, 30], [5, 10, 15, 20], [20, 25, 30, 35, 40]).filter(([M, a, b, c]) => { const A = M * (1 - a / 100) * (1 - b / 100), B = M * (1 - c / 100); return a >= b && whole(A) && whole(B) && Math.abs(A - B) >= 10 && c !== a + b; }),
  build: (t, prm) => {
    const [M, a, b, c] = prm; const it = itemFor(M, prm);
    const A = clean(M * (1 - a / 100) * (1 - b / 100)), B = clean(M * (1 - c / 100)), D = clean(Math.abs(A - B));
    const cheap = A < B ? "Shop A" : "Shop B", dear = A < B ? "Shop B" : "Shop A";
    const H = { "Shop A": "दुकान A", "Shop B": "दुकान B" };
    const wrongD = clean(Math.abs(M * (1 - (a + b) / 100) - B)) || D * 2;
    const opts = [`${cheap}, by ${money(D)}`, `${dear}, by ${money(D)}`, `${cheap}, by ${money(wrongD === D ? D * 2 : wrongD)}`, "Both cost the same"];
    const optsH = [`${H[cheap]}, ${money(D)} से`, `${H[dear]}, ${money(D)} से`, `${H[cheap]}, ${money(wrongD === D ? D * 2 : wrongD)} से`, "दोनों में बराबर"];
    return Q(t, `${it.en[0].toUpperCase() + it.en.slice(1)} is marked at ₹${n(M)} in two shops. Shop A gives successive discounts of ${a}% and ${b}%; Shop B gives a single discount of ${c}%. Which shop is cheaper, and by how much?`,
      `दो दुकानों में ${it.theH} का अंकित मूल्य ₹${n(M)} है। दुकान A ${a}% और ${b}% की क्रमागत छूटें देती है; दुकान B ${c}% की एकल छूट देती है। कौन-सी दुकान सस्ती है, और कितने से?`,
      opts, 0, () => `${(M * (100 - a) * (100 - b) / 10000) < (M * (100 - c) / 100) ? "Shop A" : "Shop B"}, by ${money(Math.abs(M * (100 - a) * (100 - b) / 10000 - M * (100 - c) / 100))}`,
      `Shop A: ${n(M)} × ${f(-a)} × ${f(-b)} = ₹${n(A)}. Shop B: ${n(M)} × ${f(-c)} = ₹${n(B)}. ${cheap} is cheaper by ${money(D)}.`,
      `दुकान A: ${n(M)} × ${f(-a)} × ${f(-b)} = ₹${n(A)}। दुकान B: ${n(M)} × ${f(-c)} = ₹${n(B)}। ${H[cheap]} ${money(D)} सस्ती है।`, optsH);
  },
};

const mpFromNet3 = {
  id: "mpFromNet3", levels: ["advanced"],
  cands: () => cross(MPS.filter((M) => M >= 1000), [10, 20, 25, 30], [10, 20, 25], [5, 10, 20]).filter(([M, a, b, c]) => a >= b && b >= c && whole(M * (1 - a / 100) * (1 - b / 100) * (1 - c / 100))),
  build: (t, prm) => {
    const [M, a, b, c] = prm; const w = who(prm); const it = itemFor(M, prm);
    const k = clean((1 - a / 100) * (1 - b / 100) * (1 - c / 100)), S = clean(M * k);
    return Q(t, `After successive discounts of ${a}%, ${b}% and ${c}%, ${w.name} pays ₹${n(S)} for ${it.en}. What was its marked price?`,
      `${a}%, ${b}% और ${c}% की क्रमागत छूटों के बाद ${w.nameH} ${it.hi} के लिए ₹${n(S)} ${w.v("चुकाता", "चुकाती")} है। इसका अंकित मूल्य कितना था?`,
      choices(M, money, [S / (1 - (a + b + c) / 100), S * (1 + (a + b + c) / 100), S / ((1 - a / 100) * (1 - b / 100))], { step: stepOf(M) }), 0, () => money(clean(S * 1e6 / ((100 - a) * (100 - b) * (100 - c)))),
      `Marked price × ${f(-a)} × ${f(-b)} × ${f(-c)} = ${n(S)}. The multiplier is ${n(k)}, so the marked price = ${n(S)} ÷ ${n(k)} = ${money(M)}.`,
      `अंकित मूल्य × ${f(-a)} × ${f(-b)} × ${f(-c)} = ${n(S)}। गुणक ${n(k)} है, अतः अंकित मूल्य = ${n(S)} ÷ ${n(k)} = ${money(M)}।`);
  },
};

const KINDS = [
  spFromMP, discPct, mpFromSP, discAmt, markupProfit, twoDiscSP, equivDisc, offerBuyGet, cpFromMarkup, mpFromCPdisc, mpFromDiscAmt,
  markupNeeded, discForProfit, threeDiscSP, cpFromMPdiscGain, discVsTwo, freeAndDisc, ratioCPMP, mpFromDiscDiff,
  secondDisc, changeDisc, markupTwoDisc, noDiscountProfit, ratioDiscProfit,
  freeDiscMarkup, cpFromProfitAmt, shopsCompare, mpFromNet3,
];
const THIN = {
  twoDiscSP: (p) => [p[0]], threeDiscSP: (p) => [p[0], p[1]], mpFromCPdisc: (p) => [p[0], p[1]], cpFromMPdiscGain: (p) => [p[0], p[1]], discVsTwo: (p) => [p[0], p[1]],
  mpFromDiscDiff: (p) => [p[0]], secondDisc: (p) => [p[0], p[1]], cpFromProfitAmt: (p) => [p[0], p[1]], shopsCompare: (p) => [p[0], p[1]], mpFromNet3: (p) => [p[0], p[1]],
};
for (const k of KINDS) if (THIN[k.id]) { const orig = k.cands; k.cands = () => thin(orig(), THIN[k.id]); }

const PREFIX = "Profit & Loss · Discount and Marked Price";
const topic = () => { require("./pl-cpsp").topic(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED }); };
module.exports = { KINDS, topic, PREFIX };
