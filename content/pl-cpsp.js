// Profit & Loss · Cost Price and Selling Price: every kind of question,
// level by level, with the numbers each can be asked with. gen.js fills the
// tests; every answer is worked out again in `v`, and the wrong options are
// the slips students make (profit on the selling price instead of the cost
// price, forgetting overheads, adding percentages that must be multiplied).
const L = require("./pl-lib");
const { Q, choices, n, pct, clean, cross, whole, nicePct, money, stepOf, f, who, seller, itemFor, PRICES, GAINS, LOSSES } = L;
const { fillTopic } = require("./gen");

// "25% profit" / "12½% loss": the options when the answer may be either.
const word = (x) => (x >= 0 ? "profit" : "loss");
const wordH = (x) => (x >= 0 ? "लाभ" : "हानि");
const pl = (x) => `${pct(Math.abs(clean(x)))} ${word(x)}`;
const plH = (x) => `${pct(Math.abs(clean(x)))} ${wordH(x)}`;
function signed(ans, slips, step = 5) {
  const vals = [ans];
  const add = (x) => {
    if (vals.length >= 4 || !Number.isFinite(x) || Math.abs(clean(x)) < 1e-9 || !nicePct(Math.abs(x))) return;
    if (vals.some((v) => pl(v) === pl(x))) return;
    vals.push(x);
  };
  slips.forEach(add);
  add(-ans);
  for (let k = 1; vals.length < 4 && k < 40; k++) [ans + step * k, ans - step * k].forEach(add);
  if (vals.length < 4) throw new Error(`not enough options for ${pl(ans)}`);
  return { o: vals.map(pl), oh: vals.map(plH) };
}
const SQ = (t, q, qh, ans, slips, value, s, sh, step) => { const { o, oh } = signed(ans, slips, step); return Q(t, q, qh, o, 0, () => pl(value()), s, sh, oh); };

const CHEAP = PRICES.filter((p) => p <= 60000);
// One set of numbers per key (e.g. per cost price and repair bill), so two
// questions of a test never share most of their numbers.
const thin = (list, key) => { const m = new Map(); for (const p of list) { const k = JSON.stringify(key(p)); const h = L.hashOf(p); if (!m.has(k) || h < m.get(k)[0]) m.set(k, [h, p]); } return [...m.values()].map((x) => x[1]); };
const lcmOf = (a, b) => a / L.gcd(a, b) * b;
const FRUITS = [["oranges", "संतरे"], ["bananas", "केले"], ["mangoes", "आम"], ["apples", "सेब"], ["lemons", "नींबू"], ["guavas", "अमरूद"]];
const pick = (list, prm, salt = 0) => list[(L.hashOf(prm) + salt) % list.length];
// Two of a kind, priced like the real thing (Hindi plural = singular).
const PAIRS = [["radios", "रेडियो", 300, 2500], ["ceiling fans", "सीलिंग फ़ैन", 800, 5000], ["mixers", "मिक्सर", 1200, 7000], ["coolers", "कूलर", 3000, 16000], ["mobile phones", "मोबाइल फ़ोन", 4000, 30000], ["TVs", "टीवी", 8000, 45000], ["fridges", "फ्रिज", 10000, 45000], ["laptops", "लैपटॉप", 18000, 80000]];
const pairFor = (lo, hi, prm) => { const fit = PAIRS.filter(([, , a, b]) => lo >= a && hi <= b); return fit.length ? fit[L.hashOf(prm) % fit.length] : null; };

// ---------------------------------------------------------------- EASY
const gainPct = {
  id: "gainPct", group: "cg", levels: ["easy"],
  cands: () => cross(CHEAP, GAINS).filter(([c, g]) => whole(c * g / 100)),
  build: (t, prm) => {
    const [c, g] = prm; const w = who(prm); const it = itemFor(c, prm);
    const s = clean(c * (1 + g / 100)), p = clean(s - c);
    return Q(t, `${w.name} buys ${it.en} for ₹${n(c)} and sells it for ₹${n(s)}. What is ${w.his} profit percentage?`,
      `${w.nameH} ${it.hi} ₹${n(c)} में ${w.v("खरीदता", "खरीदती")} है और उसे ₹${n(s)} में ${w.v("बेचता", "बेचती")} है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [p / s * 100, g + 5, p / c * 50], { step: 5 }), 0, () => pct(clean((s - c) / c * 100)),
      `Profit = ${n(s)} − ${n(c)} = ₹${n(p)}. Profit % = ${n(p)} ÷ ${n(c)} × 100 = ${pct(g)} (always on the cost price).`,
      `लाभ = ${n(s)} − ${n(c)} = ₹${n(p)}। लाभ % = ${n(p)} ÷ ${n(c)} × 100 = ${pct(g)} (लाभ सदा क्रय मूल्य पर)।`);
  },
};

const lossPct = {
  id: "lossPct", group: "cl", levels: ["easy"],
  cands: () => cross(CHEAP, LOSSES).filter(([c, l]) => whole(c * l / 100)),
  build: (t, prm) => {
    const [c, l] = prm; const w = who(prm); const it = itemFor(c, prm);
    const s = clean(c * (1 - l / 100)), d = clean(c - s);
    return Q(t, `${w.name} buys ${it.en} for ₹${n(c)} and has to sell it for ₹${n(s)}. What is ${w.his} loss percentage?`,
      `${w.nameH} ${it.hi} ₹${n(c)} में ${w.v("खरीदता", "खरीदती")} है और उसे ₹${n(s)} में बेचना पड़ता है। उसका हानि प्रतिशत कितना है?`,
      choices(l, pct, [d / s * 100, l + 5, l * 2], { step: 5 }), 0, () => pct(clean((c - s) / c * 100)),
      `Loss = ${n(c)} − ${n(s)} = ₹${n(d)}. Loss % = ${n(d)} ÷ ${n(c)} × 100 = ${pct(l)}.`,
      `हानि = ${n(c)} − ${n(s)} = ₹${n(d)}। हानि % = ${n(d)} ÷ ${n(c)} × 100 = ${pct(l)}।`);
  },
};

const spGain = {
  id: "spGain", group: "cg", levels: ["easy"],
  cands: () => cross(CHEAP, GAINS).filter(([c, g]) => whole(c * g / 100)),
  build: (t, prm) => {
    const [c, g] = prm; const w = who(prm); const it = itemFor(c, prm);
    const s = clean(c * (1 + g / 100));
    return Q(t, `${w.name} buys ${it.en} for ₹${n(c)}. At what price must ${w.he} sell it to make a profit of ${g}%?`,
      `${w.nameH} ${it.hi} ₹${n(c)} में ${w.v("खरीदता", "खरीदती")} है। ${g}% लाभ कमाने के लिए उसे इसे किस मूल्य पर बेचना चाहिए?`,
      choices(s, money, [c * (1 - g / 100), c * 100 / (100 - g), c + g], { step: stepOf(s) }), 0, () => money(clean(c + c * g / 100)),
      `Selling price = ${n(c)} × ${f(g)} = ${money(s)}.`,
      `विक्रय मूल्य = ${n(c)} × ${f(g)} = ${money(s)}।`);
  },
};

const spLoss = {
  id: "spLoss", group: "cl", levels: ["easy"],
  cands: () => cross(CHEAP, LOSSES).filter(([c, l]) => whole(c * l / 100)),
  build: (t, prm) => {
    const [c, l] = prm; const s0 = seller(prm); const it = itemFor(c, prm);
    const s = clean(c * (1 - l / 100));
    return Q(t, `${s0.en} buys ${it.en} for ₹${n(c)} and sells it at a loss of ${l}%. What is the selling price?`,
      `${s0.hi} ${it.hi} ₹${n(c)} में खरीदता है और उसे ${l}% हानि पर बेचता है। विक्रय मूल्य कितना है?`,
      choices(s, money, [c * (1 + l / 100), c * 100 / (100 + l), c - l], { step: stepOf(s) }), 0, () => money(clean(c - c * l / 100)),
      `Selling price = ${n(c)} × ${f(-l)} = ${money(s)}.`,
      `विक्रय मूल्य = ${n(c)} × ${f(-l)} = ${money(s)}।`);
  },
};

const cpFromGain = {
  id: "cpFromGain", group: "cg", levels: ["easy", "medium"],
  cands: () => cross(CHEAP, GAINS).filter(([c, g]) => whole(c * g / 100)),
  build: (t, prm) => {
    const [c, g] = prm; const w = who(prm); const it = itemFor(c, prm);
    const s = clean(c * (1 + g / 100));
    return Q(t, `By selling ${it.en} for ₹${n(s)}, ${w.name} makes a profit of ${g}%. What is its cost price?`,
      `${it.hi} ₹${n(s)} में बेचकर ${w.nameH} को ${g}% लाभ होता है। इसका क्रय मूल्य कितना है?`,
      choices(c, money, [s * (1 - g / 100), s - g, s * 100 / (100 - g)], { step: stepOf(c) }), 0, () => money(clean(s * 100 / (100 + g))),
      `Cost price × ${f(g)} = ${n(s)}, so cost price = ${n(s)} ÷ ${f(g)} = ${money(c)}. (Taking ${g}% off ${n(s)} is wrong: the ${g}% is of the cost price.)`,
      `क्रय मूल्य × ${f(g)} = ${n(s)}, अतः क्रय मूल्य = ${n(s)} ÷ ${f(g)} = ${money(c)}। (${n(s)} में से ${g}% घटाना गलत है: ${g}% क्रय मूल्य का है।)`);
  },
};

const cpFromLoss = {
  id: "cpFromLoss", group: "cl", levels: ["easy", "medium"],
  cands: () => cross(CHEAP, LOSSES).filter(([c, l]) => whole(c * l / 100)),
  build: (t, prm) => {
    const [c, l] = prm; const w = who(prm); const it = itemFor(c, prm);
    const s = clean(c * (1 - l / 100));
    return Q(t, `${w.name} sells ${it.en} for ₹${n(s)} and makes a loss of ${l}%. What is its cost price?`,
      `${w.nameH} ${it.hi} ₹${n(s)} में ${w.v("बेचता", "बेचती")} है और उसे ${l}% हानि होती है। इसका क्रय मूल्य कितना है?`,
      choices(c, money, [s * (1 + l / 100), s + l, s * 100 / (100 + l)], { step: stepOf(c) }), 0, () => money(clean(s * 100 / (100 - l))),
      `Cost price × ${f(-l)} = ${n(s)}, so cost price = ${n(s)} ÷ ${f(-l)} = ${money(c)}.`,
      `क्रय मूल्य × ${f(-l)} = ${n(s)}, अतः क्रय मूल्य = ${n(s)} ÷ ${f(-l)} = ${money(c)}।`);
  },
};

const profitAmt = {
  id: "profitAmt", group: "cg", levels: ["easy"],
  cands: () => cross(CHEAP, GAINS).filter(([c, g]) => whole(c * g / 100)),
  build: (t, prm) => {
    const [c, g] = prm; const s0 = seller(prm); const it = itemFor(c, prm);
    const p = clean(c * g / 100), s = clean(c + p);
    return Q(t, `${s0.en} buys ${it.en} for ₹${n(c)} and sells it at a profit of ${g}%. How much profit does he make?`,
      `${s0.hi} ${it.hi} ₹${n(c)} में खरीदता है और उसे ${g}% लाभ पर बेचता है। उसे कितना लाभ होता है?`,
      choices(p, money, [s, s * g / 100, p * 2], { step: stepOf(p) }), 0, () => money(clean(c * (1 + g / 100) - c)),
      `Profit = ${g}% of ${n(c)} = ${n(c)} × ${g}/100 = ${money(p)} (he sells it for ₹${n(s)}).`,
      `लाभ = ${n(c)} का ${g}% = ${n(c)} × ${g}/100 = ${money(p)} (वह इसे ₹${n(s)} में बेचता है)।`);
  },
};

const repairs = {
  id: "repairs", levels: ["easy", "medium"],
  cands: () => cross(CHEAP.filter((c) => c >= 500 && c <= 30000), [50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000], GAINS.concat(LOSSES.map((l) => -l)))
    .filter(([c, r, g]) => r * 20 >= c && r * 3 <= c && whole((c + r) * g / 100)).filter((p, i, a) => true),
  build: (t, prm) => {
    const [c, r, g] = prm; const w = who(prm); const it = itemFor(c, prm);
    const T = c + r, s = clean(T * (1 + g / 100));
    const nm = it.en.replace(/^an? /, "");
    return SQ(t, `${w.name} buys a second-hand ${nm} for ₹${n(c)} and spends ₹${n(r)} on its repair. ${w.He} then sells it for ₹${n(s)}. What is ${w.his} profit or loss percentage?`,
      `${w.nameH} ₹${n(c)} में एक सेकंड-हैंड ${it.theH} ${w.v("खरीदता", "खरीदती")} है और उसकी मरम्मत पर ₹${n(r)} खर्च ${w.v("करता", "करती")} है। फिर ${w.v("वह", "वह")} इसे ₹${n(s)} में ${w.v("बेचता", "बेचती")} है। उसका लाभ या हानि प्रतिशत क्या है?`,
      g, [(s - c) / c * 100, (s - T) / s * 100], () => (s - (c + r)) / (c + r) * 100,
      `The repair is part of the cost: cost = ${n(c)} + ${n(r)} = ₹${n(T)}. ${g >= 0 ? "Profit" : "Loss"} = ₹${n(Math.abs(s - T))}, which is ${n(Math.abs(s - T))} ÷ ${n(T)} × 100 = ${pl(g)}.`,
      `मरम्मत भी लागत में जुड़ती है: लागत = ${n(c)} + ${n(r)} = ₹${n(T)}। ${g >= 0 ? "लाभ" : "हानि"} = ₹${n(Math.abs(s - T))}, जो ${n(Math.abs(s - T))} ÷ ${n(T)} × 100 = ${plH(g)} है।`);
  },
};

const perPiece = {
  id: "perPiece", levels: ["easy"],
  cands: () => cross([10, 12, 15, 20, 24, 25, 30, 36, 40, 48, 50, 60, 72, 80, 100], [2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 25], [10, 20, 25, 40, 50, 60, 75, 100])
    .filter(([N, u, g]) => whole(u * (1 + g / 100)) && !(N === 15 && u === 2)),
  build: (t, prm) => {
    const [N, u, g] = prm; const [it, itH] = pick([["pens", "पेन"], ["notebooks", "कॉपियाँ"], ["pencil boxes", "पेंसिल बॉक्स"], ["erasers", "रबड़"], ["key rings", "चाबी के छल्ले"]], prm);
    const T = N * u, p = clean(u * (1 + g / 100)), R = N * p;
    return Q(t, `A stationer buys ${N} ${it} for ₹${n(T)} and sells them at ₹${n(p)} each. What is his profit percentage?`,
      `एक स्टेशनरी विक्रेता ${N} ${itH} ₹${n(T)} में खरीदता है और हर एक को ₹${n(p)} में बेचता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [(R - T) / R * 100, (p - u) * 10, g / 2], { step: 5 }), 0, () => pct(clean((N * p - T) / T * 100)),
      `Cost of one = ${n(T)} ÷ ${N} = ₹${n(u)}. Profit on one = ${n(p)} − ${n(u)} = ₹${n(p - u)}, so profit % = ${n(p - u)} ÷ ${n(u)} × 100 = ${pct(g)}.`,
      `एक का क्रय मूल्य = ${n(T)} ÷ ${N} = ₹${n(u)}। एक पर लाभ = ${n(p)} − ${n(u)} = ₹${n(p - u)}, अतः लाभ % = ${n(p - u)} ÷ ${n(u)} × 100 = ${pct(g)}।`);
  },
};

const gainFromAmt = {
  id: "gainFromAmt", group: "cg", levels: ["easy"],
  cands: () => cross(CHEAP, GAINS).filter(([c, g]) => whole(c * g / 100)),
  build: (t, prm) => {
    const [c, g] = prm; const s0 = seller(prm); const it = itemFor(c, prm);
    const p = clean(c * g / 100), s = clean(c + p);
    return Q(t, `${s0.en} sells ${it.en} for ₹${n(s)} and makes a profit of ₹${n(p)}. What is his profit percentage?`,
      `${s0.hi} ${it.hi} ₹${n(s)} में बेचता है और उसे ₹${n(p)} का लाभ होता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [p / s * 100, g + 5, g - 2], { step: 5 }), 0, () => pct(clean(p / (s - p) * 100)),
      `Cost price = ${n(s)} − ${n(p)} = ₹${n(c)}. Profit % = ${n(p)} ÷ ${n(c)} × 100 = ${pct(g)}.`,
      `क्रय मूल्य = ${n(s)} − ${n(p)} = ₹${n(c)}। लाभ % = ${n(p)} ÷ ${n(c)} × 100 = ${pct(g)}।`);
  },
};

const lossFromAmt = {
  id: "lossFromAmt", group: "cl", levels: ["easy"],
  cands: () => cross(CHEAP, LOSSES).filter(([c, l]) => whole(c * l / 100)),
  build: (t, prm) => {
    const [c, l] = prm; const w = who(prm); const it = itemFor(c, prm);
    const d = clean(c * l / 100), s = clean(c - d);
    return Q(t, `${w.name} sells ${it.en} for ₹${n(s)} and loses ₹${n(d)} on it. What is ${w.his} loss percentage?`,
      `${w.nameH} ${it.hi} ₹${n(s)} में ${w.v("बेचता", "बेचती")} है और उसे इस पर ₹${n(d)} की हानि होती है। उसका हानि प्रतिशत कितना है?`,
      choices(l, pct, [d / s * 100, l + 5, l * 2], { step: 5 }), 0, () => pct(clean(d / (s + d) * 100)),
      `Cost price = ${n(s)} + ${n(d)} = ₹${n(c)}. Loss % = ${n(d)} ÷ ${n(c)} × 100 = ${pct(l)}.`,
      `क्रय मूल्य = ${n(s)} + ${n(d)} = ₹${n(c)}। हानि % = ${n(d)} ÷ ${n(c)} × 100 = ${pct(l)}।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
const newTarget = {
  id: "newTarget", group: "clg", levels: ["medium", "hard"],
  cands: () => cross(CHEAP.filter((c) => c >= 400), LOSSES, GAINS).filter(([c, l, g]) => whole(c * l / 100) && whole(c * g / 100) && !(c * (1 - l / 100) === 960)),
  build: (t, prm) => {
    const [c, l, g] = prm; const w = who(prm); const it = itemFor(c, prm);
    const s1 = clean(c * (1 - l / 100)), s2 = clean(c * (1 + g / 100));
    return Q(t, `${w.name} sells ${it.en} for ₹${n(s1)} and makes a loss of ${l}%. At what price should ${w.he} have sold it to make a profit of ${g}%?`,
      `${w.nameH} ${it.hi} ₹${n(s1)} में ${w.v("बेचता", "बेचती")} है और उसे ${l}% हानि होती है। ${g}% लाभ कमाने के लिए उसे इसे किस मूल्य पर बेचना चाहिए था?`,
      choices(s2, money, [s1 * (1 + g / 100), s1 * (1 + (g + l) / 100), c], { step: stepOf(s2) }), 0, () => money(clean(s1 / (1 - l / 100) * (1 + g / 100))),
      `Cost price = ${n(s1)} ÷ ${f(-l)} = ₹${n(c)}. For ${g}% profit: ${n(c)} × ${f(g)} = ${money(s2)}.`,
      `क्रय मूल्य = ${n(s1)} ÷ ${f(-l)} = ₹${n(c)}। ${g}% लाभ के लिए: ${n(c)} × ${f(g)} = ${money(s2)}।`);
  },
};

const diffSP = {
  id: "diffSP", group: "clg", levels: ["medium", "hard"],
  cands: () => cross(CHEAP.filter((c) => c >= 400), LOSSES, GAINS).filter(([c, l, g]) => whole(c * (g + l) / 100) && g !== l),
  build: (t, prm) => {
    const [c, l, g] = prm; const s0 = seller(prm); const it = itemFor(c, prm);
    const D = clean(c * (g + l) / 100);
    return Q(t, `If ${s0.low} sells ${it.en} at a profit of ${g}% instead of a loss of ${l}%, he gets ₹${n(D)} more. What is its cost price?`,
      `यदि ${s0.hi} ${it.hi} को ${l}% हानि के स्थान पर ${g}% लाभ पर बेचता है, तो उसे ₹${n(D)} अधिक मिलते हैं। इसका क्रय मूल्य कितना है?`,
      choices(c, money, [D * 100 / Math.abs(g - l), D * 100 / g, D * 100 / l], { step: stepOf(c) }), 0, () => money(clean(D / ((g + l) / 100))),
      `From ${l}% below the cost price to ${g}% above it is a jump of ${g} + ${l} = ${g + l}% of the cost price. ${g + l}% of cost = ${n(D)}, so cost = ${n(D)} × 100/${g + l} = ${money(c)}.`,
      `क्रय मूल्य से ${l}% कम से ${g}% अधिक तक का अंतर क्रय मूल्य का ${g} + ${l} = ${g + l}% है। क्रय मूल्य का ${g + l}% = ${n(D)}, अतः क्रय मूल्य = ${n(D)} × 100/${g + l} = ${money(c)}।`);
  },
};

const articlesEq = {
  id: "articlesEq", group: "nk", levels: ["medium", "hard", "advanced"],
  cands: () => cross([5, 6, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30, 32, 35, 36, 40, 45, 48, 50, 60], [5, 6, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30, 32, 35, 36, 40, 45, 48, 50, 60])
    .filter(([x, y]) => x !== y && Math.abs(x - y) * 4 <= Math.max(x, y) && nicePct((x - y) / y * 100) && !["10,8", "15,12", "20,25", "15,10", "8,10", "12,15", "25,20", "10,15"].includes(`${x},${y}`)),
  build: (t, prm) => {
    const [x, y] = prm; const [it, itH] = pick([["pens", "पेन"], ["toys", "खिलौनों"], ["chairs", "कुर्सियों"], ["shirts", "कमीज़ों"], ["bags", "थैलों"], ["articles", "वस्तुओं"]], prm);
    const itH2 = itH === "पेन" ? "पेन" : itH;
    const g = clean((x - y) / y * 100);
    return SQ(t, `The cost price of ${x} ${it} is equal to the selling price of ${y} ${it}. What is the profit or loss percentage?`,
      `${x} ${itH2} का क्रय मूल्य ${y} ${itH2} के विक्रय मूल्य के बराबर है। लाभ या हानि प्रतिशत क्या है?`,
      g, [(x - y) / x * 100, -(x - y) / x * 100], () => (x / y - 1) * 100,
      `Let each ${it.replace(/s$/, "")} cost ₹1: then ${x} cost ₹${x}, and ${y} also sell for ₹${x}. Cost of those ${y} = ₹${y}, so the ${g >= 0 ? "profit" : "loss"} is ${Math.abs(x - y)} on ${y}. ${g >= 0 ? "Profit" : "Loss"} % = ${Math.abs(x - y)} ÷ ${y} × 100 = ${pl(g)}.`,
      `मान लें एक का क्रय मूल्य ₹1 है: ${x} का ₹${x}, और ${y} का विक्रय भी ₹${x}। उन ${y} का क्रय मूल्य ₹${y} है, अतः ${g >= 0 ? "लाभ" : "हानि"} ${y} पर ${Math.abs(x - y)} है। ${g >= 0 ? "लाभ" : "हानि"} % = ${Math.abs(x - y)} ÷ ${y} × 100 = ${plH(g)}।`);
  },
};

const buyXsellY = {
  id: "buyXsellY", levels: ["medium", "hard"],
  // A fruit costs ₹2-₹25 either way; the counts differ, so it is not a
  // plain price comparison.
  cands: () => cross([4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 25], [20, 30, 40, 50, 60, 80, 100, 120], [4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 25], [20, 30, 40, 50, 60, 80, 100, 120])
    .filter(([a, p, b, q]) => {
      const g = (q * a) / (p * b) * 100 - 100, u = p / a, v = q / b;
      return a !== b && u >= 2 && u <= 25 && v >= 2 && v <= 25 && g >= -30 && g <= 50 && Math.abs(g) >= 4 && nicePct(g) && !(a === 25 && p === 100 && b === 20 && q === 100);
    }),
  build: (t, prm) => {
    const [a, p, b, q] = prm; const [fr, frH] = pick(FRUITS, prm);
    const g = clean((q * a) / (p * b) * 100 - 100);
    const N = lcmOf(a, b), C = N / a * p, S = N / b * q;
    return SQ(t, `A fruit seller buys ${fr} at ${a} for ₹${p} and sells them at ${b} for ₹${q}. What is his profit or loss percentage?`,
      `एक फल विक्रेता ₹${p} के ${a} ${frH} के भाव से खरीदता है और ₹${q} के ${b} के भाव से बेचता है। उसका लाभ या हानि प्रतिशत क्या है?`,
      g, [(p * b) / (q * a) * 100 - 100, (q - p) / p * 100], () => ((q / b) / (p / a) - 1) * 100,
      `Take ${N} fruits (a multiple of ${a} and ${b}). They cost ${N / a} × ${p} = ₹${n(C)} and sell for ${N / b} × ${q} = ₹${n(S)}. ${g >= 0 ? "Profit" : "Loss"} = ₹${n(Math.abs(S - C))} on ₹${n(C)}: ${pl(g)}.`,
      `${N} फल लें (${a} और ${b} दोनों का गुणज)। इनका क्रय मूल्य ${N / a} × ${p} = ₹${n(C)} और विक्रय मूल्य ${N / b} × ${q} = ₹${n(S)}। ₹${n(C)} पर ${g >= 0 ? "लाभ" : "हानि"} ₹${n(Math.abs(S - C))}: ${plH(g)}।`);
  },
};

const gainEqSP = {
  id: "gainEqSP", group: "nk", levels: ["medium", "hard", "advanced"],
  cands: () => cross([8, 10, 12, 15, 16, 18, 20, 21, 24, 25, 28, 30, 32, 33, 35, 36, 40, 42, 44, 45, 48, 50, 55, 56, 60, 66, 70, 72, 80], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16])
    .filter(([N, k]) => k * 3 <= N && nicePct(k / (N - k) * 100)),
  build: (t, prm) => {
    const [N, k] = prm;
    const g = clean(k / (N - k) * 100);
    return Q(t, `By selling ${N} metres of cloth, a shopkeeper gains the selling price of ${k} metres. What is his profit percentage?`,
      `${N} मीटर कपड़ा बेचकर एक दुकानदार को ${k} मीटर कपड़े के विक्रय मूल्य के बराबर लाभ होता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [k / N * 100, k / (N + k) * 100, g + 5], { step: 5 }), 0, () => pct(clean(k / (N - k) * 100)),
      `SP of ${N} m − CP of ${N} m = SP of ${k} m, so CP of ${N} m = SP of ${N - k} m. The profit is ${k} on ${N - k}: ${k} ÷ ${N - k} × 100 = ${pct(g)}.`,
      `${N} मीटर का वि.मू. − ${N} मीटर का क्र.मू. = ${k} मीटर का वि.मू., अतः ${N} मीटर का क्र.मू. = ${N - k} मीटर का वि.मू.। लाभ ${N - k} पर ${k} है: ${k} ÷ ${N - k} × 100 = ${pct(g)}।`);
  },
};

const gainEqCP = {
  id: "gainEqCP", group: "nk", levels: ["medium"],
  cands: () => cross([8, 10, 12, 15, 16, 18, 20, 24, 25, 30, 32, 36, 40, 45, 48, 50, 60, 64, 75, 80], [2, 3, 4, 5, 6, 8, 9, 10, 12, 15])
    .filter(([N, k]) => k * 3 <= N && nicePct(k / N * 100)),
  build: (t, prm) => {
    const [N, k] = prm; const [it, itH] = pick([["chairs", "कुर्सियाँ"], ["toys", "खिलौने"], ["bags", "बैग"], ["lamps", "लैंप"]], prm);
    const g = clean(k / N * 100);
    return Q(t, `A trader sells ${N} ${it} and gains the cost price of ${k} of them. What is his profit percentage?`,
      `एक व्यापारी ${N} ${itH} बेचता है और उसे ${k} के क्रय मूल्य के बराबर लाभ होता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [k / (N - k) * 100, k / (N + k) * 100, g + 5], { step: 5 }), 0, () => pct(clean(k / N * 100)),
      `Let one cost ₹1. The ${N} cost ₹${N} and the profit is ₹${k}, so profit % = ${k} ÷ ${N} × 100 = ${pct(g)}.`,
      `मान लें एक का क्रय मूल्य ₹1 है। ${N} का क्रय मूल्य ₹${N} और लाभ ₹${k}, अतः लाभ % = ${k} ÷ ${N} × 100 = ${pct(g)}।`);
  },
};

const onSP = {
  id: "onSP", levels: ["medium", "hard"],
  cands: () => [4, 5, 8, 10, 12, 12.5, 15, 16, 20, 25, 28, 30, 33, 37.5, 40, 44, 50, 60].filter((p) => nicePct(p / (100 - p) * 100)).map((p) => [p, L.hashOf([p]) % 2 + 1]),
  build: (t, prm) => {
    const [p, form] = prm;
    const g = clean(p / (100 - p) * 100);
    const [a, aH] = form === 1 ? ["A trader's profit", "एक व्यापारी का लाभ उसके"] : ["A shopkeeper's profit", "एक दुकानदार का लाभ उसके"];
    return Q(t, `${a} is ${pct(p)} of his selling price. What is his profit as a percentage of the cost price?`,
      `${aH} विक्रय मूल्य का ${pct(p)} है। क्रय मूल्य पर उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [p, p / (100 + p) * 100, 100 - p], { step: 5 }), 0, () => pct(clean(p / (100 - p) * 100)),
      `Take the selling price as 100: profit ${n(p)}, cost ${n(100 - p)}. Profit on cost = ${n(p)} ÷ ${n(100 - p)} × 100 = ${pct(g)}.`,
      `विक्रय मूल्य 100 लें: लाभ ${n(p)}, क्रय मूल्य ${n(100 - p)}। क्रय मूल्य पर लाभ = ${n(p)} ÷ ${n(100 - p)} × 100 = ${pct(g)}।`);
  },
};

const chainAB = {
  id: "chainAB", levels: ["medium", "hard", "advanced"],
  cands: () => cross(CHEAP.filter((c) => c >= 500), [5, 10, 12, 15, 20, 25, 30, 40, 50], [-20, -15, -10, -5, 5, 10, 12, 15, 20, 25, 30])
    .filter(([c, a, b]) => whole(c * (1 + a / 100)) && whole(c * (1 + a / 100) * (1 + b / 100)) && !(a === 10 && b === 20)),
  build: (t, prm) => {
    const [c, a, b] = prm; const it = itemFor(c, prm);
    const x1 = clean(c * (1 + a / 100)), X = clean(x1 * (1 + b / 100));
    return Q(t, `A sells ${it.en} to B at a profit of ${a}%, and B sells it to C at a ${word(b)} of ${Math.abs(b)}%. If C pays ₹${n(X)}, what did it cost A?`,
      `A, B को ${it.hi} ${a}% लाभ पर बेचता है, और B उसे C को ${Math.abs(b)}% ${wordH(b)} पर बेचता है। यदि C ₹${n(X)} देता है, तो A के लिए इसका क्रय मूल्य कितना था?`,
      choices(c, money, [X * (1 - a / 100) * (1 - b / 100), X / (1 + (a + b) / 100), x1], { step: stepOf(c) }), 0, () => money(clean(X / ((1 + a / 100) * (1 + b / 100)))),
      `A's cost × ${f(a)} × ${f(b)} = ${n(X)}, so A's cost = ${n(X)} ÷ ${n((1 + a / 100) * (1 + b / 100))} = ${money(c)} (B paid ₹${n(x1)}).`,
      `A का क्र.मू. × ${f(a)} × ${f(b)} = ${n(X)}, अतः A का क्र.मू. = ${n(X)} ÷ ${n((1 + a / 100) * (1 + b / 100))} = ${money(c)} (B ने ₹${n(x1)} दिए)।`);
  },
};

const sameLossGain = {
  id: "sameLossGain", levels: ["medium"],
  cands: () => cross(CHEAP.filter((c) => c >= 300 && c <= 30000), [20, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1500, 2000])
    .filter(([c, d]) => d * 20 <= c * 4 && d * 25 >= c),
  build: (t, prm) => {
    const [c, d] = prm; const w = who(prm); const it = itemFor(c, prm);
    const s1 = c - d, s2 = c + d;
    return Q(t, `The loss ${w.name} makes by selling ${it.en} for ₹${n(s1)} is equal to the profit ${w.he} makes by selling it for ₹${n(s2)}. What is its cost price?`,
      `${it.hi} ₹${n(s1)} में बेचने पर ${w.nameH} को जितनी हानि होती है, उतना ही लाभ इसे ₹${n(s2)} में बेचने पर होता है। इसका क्रय मूल्य कितना है?`,
      choices(c, money, [s2 - s1, c + d / 2, (s2 - s1) * 2], { step: stepOf(c) }), 0, () => money((s1 + s2) / 2),
      `Cost − ${n(s1)} = ${n(s2)} − cost, so 2 × cost = ${n(s1)} + ${n(s2)} = ${n(s1 + s2)} and cost = ${money(c)}.`,
      `क्र.मू. − ${n(s1)} = ${n(s2)} − क्र.मू., अतः 2 × क्र.मू. = ${n(s1)} + ${n(s2)} = ${n(s1 + s2)} और क्र.मू. = ${money(c)}।`);
  },
};

const repairsTarget = {
  id: "repairsTarget", levels: ["medium"],
  cands: () => cross(CHEAP.filter((c) => c >= 500 && c <= 30000), [50, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1500, 2000, 3000], GAINS)
    .filter(([c, r, g]) => r * 20 >= c && r * 4 <= c && whole((c + r) * g / 100)),
  build: (t, prm) => {
    const [c, r, g] = prm; const w = who(prm); const it = itemFor(c, prm);
    const T = c + r, s = clean(T * (1 + g / 100));
    return Q(t, `${w.name} buys ${it.en} for ₹${n(c)} and pays ₹${n(r)} to have it delivered. At what price must ${w.he} sell it to make a profit of ${g}%?`,
      `${w.nameH} ${it.hi} ₹${n(c)} में ${w.v("खरीदता", "खरीदती")} है और उसे घर तक पहुँचाने के लिए ₹${n(r)} ${w.v("देता", "देती")} है। ${g}% लाभ कमाने के लिए उसे इसे किस मूल्य पर बेचना चाहिए?`,
      choices(s, money, [c * (1 + g / 100) + r, c * (1 + g / 100), T + g], { step: stepOf(s) }), 0, () => money(clean((c + r) * (100 + g) / 100)),
      `Delivery is part of the cost: ${n(c)} + ${n(r)} = ₹${n(T)}. Selling price = ${n(T)} × ${f(g)} = ${money(s)}.`,
      `पहुँचाने का खर्च भी लागत है: ${n(c)} + ${n(r)} = ₹${n(T)}। विक्रय मूल्य = ${n(T)} × ${f(g)} = ${money(s)}।`);
  },
};

const twoItemsSP = {
  id: "twoItemsSP", group: "two", levels: ["medium", "hard"],
  cands: () => cross([600, 720, 900, 960, 1080, 1200, 1350, 1440, 1500, 1800, 2160, 2400, 2700, 2880, 3000, 3600, 4320, 4500, 4800, 5400, 6000, 7200, 9000], [5, 10, 12, 15, 20, 25, 30, 40, 50])
    .filter(([S, g]) => whole(S / (1 + g / 100)) && whole(S / (1 - g / 100)) && !["990,10", "1500,25", "1800,25", "1800,20", "2400,20"].includes(`${S},${g}`)),
  build: (t, prm) => {
    const [S, g] = prm; const w = who(prm);
    const L2 = clean(g * g / 100);
    return SQ(t, `${w.name} sells two cycles for ₹${n(S)} each. On one ${w.he} makes a profit of ${g}% and on the other a loss of ${g}%. What is ${w.his} overall profit or loss percentage?`,
      `${w.nameH} दो साइकिलें ₹${n(S)} प्रति साइकिल की दर से ${w.v("बेचता", "बेचती")} है। एक पर उसे ${g}% लाभ और दूसरी पर ${g}% हानि होती है। कुल मिलाकर उसका लाभ या हानि प्रतिशत क्या है?`,
      -L2, [L2, -g / 10, -2 * L2], () => { const c1 = S / (1 + g / 100), c2 = S / (1 - g / 100); return (2 * S - c1 - c2) / (c1 + c2) * 100; },
      `Same selling price, same % profit and loss: there is always a loss of (${g}²/100)% = ${pct(L2)}. (Costs: ₹${n(S / (1 + g / 100))} and ₹${n(S / (1 - g / 100))}.)`,
      `समान विक्रय मूल्य और समान % लाभ-हानि पर सदा (${g}²/100)% = ${pct(L2)} हानि होती है। (क्रय मूल्य: ₹${n(S / (1 + g / 100))} और ₹${n(S / (1 - g / 100))}।)`);
  },
};

const brokenItems = {
  id: "brokenItems", levels: ["medium", "hard"],
  cands: () => cross([50, 60, 80, 100, 120, 144, 150, 200, 240, 300], [5, 6, 8, 10, 12, 15, 20, 25, 30], [4, 5, 6, 8, 10, 12, 15, 20, 25, 30], [6, 8, 10, 12, 15, 18, 20, 24, 25, 30, 36, 40])
    .filter(([N, u, k, p]) => k * 5 <= N && p > u && p <= u * 2 && whole(N * u) && L.near2(((N - k) * p - N * u) / (N * u) * 100) && Math.abs(((N - k) * p - N * u) / (N * u) * 100) >= 2 && Math.abs(((N - k) * p - N * u) / (N * u) * 100) <= 50),
  build: (t, prm) => {
    const [N, u, k, p] = prm;
    const T = N * u, R = (N - k) * p, g = clean((R - T) / T * 100);
    return SQ(t, `A shopkeeper buys ${N} glasses at ₹${u} each. ${k} of them break, and he sells the rest at ₹${p} each. What is his profit or loss percentage?`,
      `एक दुकानदार ₹${u} प्रति गिलास की दर से ${N} गिलास खरीदता है। इनमें से ${k} टूट जाते हैं, और वह बाकी गिलास ₹${p} प्रति गिलास की दर से बेचता है। उसका लाभ या हानि प्रतिशत क्या है?`,
      g, [(p - u) / u * 100, (N * p - T) / T * 100], () => ((N - k) * p / (N * u) - 1) * 100,
      `Cost = ${N} × ${u} = ₹${n(T)}. He sells ${N - k} glasses: ${N - k} × ${p} = ₹${n(R)}. ${g >= 0 ? "Profit" : "Loss"} = ₹${n(Math.abs(R - T))}, i.e. ${n(Math.abs(R - T))} ÷ ${n(T)} × 100 = ${pl(g)}.`,
      `क्रय मूल्य = ${N} × ${u} = ₹${n(T)}। वह ${N - k} गिलास बेचता है: ${N - k} × ${p} = ₹${n(R)}। ${g >= 0 ? "लाभ" : "हानि"} = ₹${n(Math.abs(R - T))}, यानी ${n(Math.abs(R - T))} ÷ ${n(T)} × 100 = ${plH(g)}।`);
  },
};

// ---------------------------------------------------------------- HARD
const twoItemsAmt = {
  id: "twoItemsAmt", group: "two", levels: ["hard", "advanced"],
  cands: () => twoItemsSP.cands().filter(([S, g]) => g <= 30 && pairFor(S / (1 + g / 100), S / (1 - g / 100), [S, g])),
  build: (t, prm) => {
    const [S, g] = prm; const [it, itH] = pairFor(S / (1 + g / 100), S / (1 - g / 100), prm);
    const c1 = clean(S / (1 + g / 100)), c2 = clean(S / (1 - g / 100)), d = clean(c1 + c2 - 2 * S);
    return Q(t, `A dealer sells two ${it} for ₹${n(S)} each, making a profit of ${g}% on one and a loss of ${g}% on the other. How much does he gain or lose in all?`,
      `एक विक्रेता दो ${itH} ₹${n(S)} प्रति नग की दर से बेचता है, एक पर ${g}% लाभ और दूसरे पर ${g}% हानि उठाकर। कुल मिलाकर उसे कितना लाभ या हानि होती है?`,
      [`Loss of ${money(d)}`, `Profit of ${money(d)}`, `Loss of ${money(2 * S * g * g / 10000)}`, "No profit, no loss"].filter((v, i, a) => a.indexOf(v) === i).concat([`Loss of ${money(d * 2)}`]).slice(0, 4), 0,
      () => `Loss of ${money(clean(S / (1 + g / 100) + S / (1 - g / 100) - 2 * S))}`,
      `Costs: ${n(S)} ÷ ${f(g)} = ₹${n(c1)} and ${n(S)} ÷ ${f(-g)} = ₹${n(c2)}, total ₹${n(c1 + c2)}. He gets ₹${n(2 * S)}: a loss of ${money(d)}.`,
      `क्रय मूल्य: ${n(S)} ÷ ${f(g)} = ₹${n(c1)} और ${n(S)} ÷ ${f(-g)} = ₹${n(c2)}, कुल ₹${n(c1 + c2)}। उसे ₹${n(2 * S)} मिलते हैं: ${money(d)} की हानि।`,
      [`${money(d)} की हानि`, `${money(d)} का लाभ`, `${money(2 * S * g * g / 10000)} की हानि`, "न लाभ, न हानि"].filter((v, i, a) => a.indexOf(v) === i).concat([`${money(d * 2)} की हानि`]).slice(0, 4));
  },
};

const twoItemsTotal = {
  id: "twoItemsTotal", group: "pair", levels: ["hard", "advanced"],
  cands: () => cross(CHEAP.filter((c) => c >= 1000 && c <= 40000), GAINS.filter((g) => g <= 30), LOSSES.filter((l) => l <= 25))
    .filter(([c1, g, l]) => whole(c1 * (1 + g / 100) / (1 - l / 100)) && whole(c1 * (1 + g / 100)) && pairFor(c1, c1 * (1 + g / 100) / (1 - l / 100), [c1, g, l])),
  build: (t, prm) => {
    const [c1, g, l] = prm; const w = who(prm); const [it, itH] = pairFor(c1, c1 * (1 + g / 100) / (1 - l / 100), prm);
    const c2 = clean(c1 * (1 + g / 100) / (1 - l / 100)), T = clean(c1 + c2), S = clean(c1 * (1 + g / 100));
    return Q(t, `${w.name} buys two ${it} for ₹${n(T)} in all. ${w.He} sells one at a profit of ${g}% and the other at a loss of ${l}%, and gets the same price for each. What did ${w.he} pay for the one sold at a profit?`,
      `${w.nameH} कुल ₹${n(T)} में दो ${itH} ${w.v("खरीदता", "खरीदती")} है। ${w.v("वह", "वह")} एक को ${g}% लाभ पर और दूसरे को ${l}% हानि पर ${w.v("बेचता", "बेचती")} है, और दोनों का विक्रय मूल्य बराबर रहता है। जिस पर लाभ हुआ, उसका क्रय मूल्य कितना था?`,
      choices(c1, money, [c2, T / 2, T * l / (g + l)], { step: stepOf(c1) }), 0, () => money(clean(T * (100 - l) / ((100 + g) + (100 - l)))),
      `${f(g)} × first = ${f(-l)} × second, so the costs are in the ratio ${n(1 - l / 100)} : ${n(1 + g / 100)}. First = ${n(T)} × ${n(1 - l / 100)}/${n(2 + (g - l) / 100)} = ${money(c1)} (second ₹${n(c2)}; each sold for ₹${n(S)}).`,
      `${f(g)} × पहला = ${f(-l)} × दूसरा, अतः क्रय मूल्य ${n(1 - l / 100)} : ${n(1 + g / 100)} के अनुपात में हैं। पहला = ${n(T)} × ${n(1 - l / 100)}/${n(2 + (g - l) / 100)} = ${money(c1)} (दूसरा ₹${n(c2)}; दोनों ₹${n(S)} में बिके)।`);
  },
};

const noPnl = {
  id: "noPnl", group: "pair", levels: ["hard", "advanced"],
  cands: () => cross([2000, 2400, 3000, 3600, 4000, 4500, 4800, 5000, 6000, 7200, 8000, 9000, 10000, 12000, 15000, 16000, 18000, 20000, 24000, 30000, 36000, 40000], GAINS, LOSSES)
    .filter(([T, g, l]) => g !== l && g <= 30 && l <= 25 && whole(T * l / (g + l)) && whole(T * g / (g + l)) && whole(T * l / (g + l) * g / 100) && pairFor(Math.min(T * l, T * g) / (g + l), Math.max(T * l, T * g) / (g + l), [T, g, l])),
  build: (t, prm) => {
    const [T, g, l] = prm; const w = who(prm); const [it, itH] = pairFor(Math.min(T * l, T * g) / (g + l), Math.max(T * l, T * g) / (g + l), prm);
    const c1 = clean(T * l / (g + l)), c2 = clean(T - c1);
    return Q(t, `${w.name} buys two ${it} for ₹${n(T)} in all. ${w.He} sells one at a profit of ${g}% and the other at a loss of ${l}%, and on the whole ${w.he} neither gains nor loses. What is the cost price of the one sold at a profit?`,
      `${w.nameH} कुल ₹${n(T)} में दो ${itH} ${w.v("खरीदता", "खरीदती")} है। ${w.v("वह", "वह")} एक को ${g}% लाभ पर और दूसरे को ${l}% हानि पर ${w.v("बेचता", "बेचती")} है, और कुल मिलाकर उसे न लाभ होता है न हानि। जिस पर लाभ हुआ, उसका क्रय मूल्य कितना है?`,
      choices(c1, money, [c2, T / 2, T * g / (g + l) / 2], { step: stepOf(c1) }), 0, () => money(clean(T * l / (g + l))),
      `Profit on the first = loss on the second: ${g}% of first = ${l}% of second, so the costs are in the ratio ${l} : ${g}. First = ${n(T)} × ${l}/${g + l} = ${money(c1)} (second ₹${n(c2)}).`,
      `पहले पर लाभ = दूसरे पर हानि: पहले का ${g}% = दूसरे का ${l}%, अतः क्रय मूल्य ${l} : ${g} के अनुपात में हैं। पहला = ${n(T)} × ${l}/${g + l} = ${money(c1)} (दूसरा ₹${n(c2)})।`);
  },
};

const cheaperDeal = {
  id: "cheaperDeal", levels: ["hard", "advanced"],
  cands: () => cross(CHEAP.filter((c) => c >= 200 && c <= 20000), [5, 10, 12, 15, 20, 25], [5, 10, 20, 25], [10, 20, 25, 30, 40, 50])
    .filter(([c, g1, x, g2]) => { const d = c * (1 + g1 / 100) - c * (1 - x / 100) * (1 + g2 / 100); return g2 > g1 && d > 0 && whole(d) && whole(c * (1 + g1 / 100)) && d * 50 >= c && !(x === 10 && d === 18); }),
  build: (t, prm) => {
    const [c, g1, x, g2] = prm; const w = who(prm); const it = itemFor(c, prm);
    const s = clean(c * (1 + g1 / 100)), c2 = clean(c * (1 - x / 100)), d = clean(s - c2 * (1 + g2 / 100));
    const k = clean((1 + g1 / 100) - (1 - x / 100) * (1 + g2 / 100));
    return Q(t, `${w.name} sells ${it.en} at a profit of ${g1}%. Had ${w.he} bought it for ${x}% less and sold it for ₹${n(d)} less, ${w.he} would have made a profit of ${g2}%. What is its cost price?`,
      `${w.nameH} ${it.hi} ${g1}% लाभ पर ${w.v("बेचता", "बेचती")} है। यदि ${w.v("वह", "वह")} इसे ${x}% कम में ${w.v("खरीदता", "खरीदती")} और ₹${n(d)} कम में ${w.v("बेचता", "बेचती")}, तो उसे ${g2}% लाभ होता। इसका क्रय मूल्य कितना है?`,
      choices(c, money, [d * 100 / (g2 - g1), d * 100 / x, d / k * 1.25], { step: stepOf(c) }), 0, () => money(clean(d / k)),
      `Let the cost be C. Now SP = ${f(g1)}C. New cost ${f(-x)}C, new SP ${f(-x)} × ${f(g2)}C = ${n((1 - x / 100) * (1 + g2 / 100))}C. Difference ${n(k)}C = ${n(d)}, so C = ${money(c)}.`,
      `क्रय मूल्य C लें। अभी वि.मू. = ${f(g1)}C। नया क्र.मू. ${f(-x)}C, नया वि.मू. ${f(-x)} × ${f(g2)}C = ${n((1 - x / 100) * (1 + g2 / 100))}C। अंतर ${n(k)}C = ${n(d)}, अतः C = ${money(c)}।`);
  },
};

const GOODS = [["rice", "चावल"], ["wheat", "गेहूँ"], ["sugar", "चीनी"], ["pulses", "दाल"]];
const partSale = {
  id: "partSale", group: "part", levels: ["hard", "advanced"],
  cands: () => cross([60, 80, 100, 120, 150, 200, 240, 300, 400, 500, 600], [1 / 4, 1 / 3, 2 / 5, 1 / 2, 3 / 5, 2 / 3, 3 / 4], [10, 12, 15, 20, 25, 30, 40], [5, 8, 10, 12, 15, 20])
    .filter(([Q0, fr, g, l]) => { const q1 = Q0 * fr; const o = fr * g - (1 - fr) * l; return whole(q1) && Math.abs(o) >= 1 && nicePct(o); }),
  build: (t, prm) => {
    const [Q0, fr, g, l] = prm; const [gd, gdH] = pick(GOODS, prm);
    const q1 = clean(Q0 * fr), o = clean(fr * g - (1 - fr) * l);
    return SQ(t, `A grocer buys ${Q0} kg of ${gd}. He sells ${n(q1)} kg at a profit of ${g}% and the rest at a loss of ${l}%. What is his overall profit or loss percentage?`,
      `एक पंसारी ${Q0} kg ${gdH} खरीदता है। वह ${n(q1)} kg ${g}% लाभ पर और बाकी ${l}% हानि पर बेचता है। कुल मिलाकर उसका लाभ या हानि प्रतिशत क्या है?`,
      o, [g - l, (g - l) / 2, fr * g], () => (q1 * g - (Q0 - q1) * l) / Q0,
      `Take the cost as ₹1 per kg. Profit on ${n(q1)} kg = ${n(q1 * g / 100)}; loss on ${n(Q0 - q1)} kg = ${n((Q0 - q1) * l / 100)}. Net ${n(Math.abs(q1 * g / 100 - (Q0 - q1) * l / 100))} on ${Q0}: ${pl(o)}.`,
      `क्रय मूल्य ₹1 प्रति kg लें। ${n(q1)} kg पर लाभ = ${n(q1 * g / 100)}; ${n(Q0 - q1)} kg पर हानि = ${n((Q0 - q1) * l / 100)}। शुद्ध ${n(Math.abs(q1 * g / 100 - (Q0 - q1) * l / 100))}, ${Q0} पर: ${plH(o)}।`);
  },
};

const partSaleFind = {
  id: "partSaleFind", group: "part", levels: ["advanced"],
  cands: () => cross([60, 80, 100, 120, 150, 200, 240, 300, 400, 500, 600], [1 / 4, 1 / 3, 2 / 5, 1 / 2, 3 / 5, 2 / 3, 3 / 4], [5, 8, 10, 12, 15, 20, 25], [10, 12, 15, 20, 25, 30])
    .filter(([Q0, fr, g1, g]) => { const r = (g - fr * g1) / (1 - fr); return whole(Q0 * fr) && g > g1 && r > g && nicePct(r) && r <= 80; }),
  build: (t, prm) => {
    const [Q0, fr, g1, g] = prm; const [gd, gdH] = pick(GOODS, prm, 1);
    const q1 = clean(Q0 * fr), r = clean((g - fr * g1) / (1 - fr));
    return Q(t, `A grocer buys ${Q0} kg of ${gd} and sells ${n(q1)} kg of it at a profit of ${g1}%. At what profit percentage must he sell the rest to make a profit of ${g}% on the whole?`,
      `एक पंसारी ${Q0} kg ${gdH} खरीदता है और उसमें से ${n(q1)} kg ${g1}% लाभ पर बेचता है। पूरे पर ${g}% लाभ कमाने के लिए उसे बाकी कितने प्रतिशत लाभ पर बेचना चाहिए?`,
      choices(r, pct, [2 * g - g1, g + (g - g1), g - g1], { step: 5 }), 0, () => pct(clean((Q0 * g - q1 * g1) / (Q0 - q1))),
      `Take ₹1 per kg. Needed profit: ${g}% of ${Q0} = ${n(Q0 * g / 100)}. The first ${n(q1)} kg give ${n(q1 * g1 / 100)}, so the other ${n(Q0 - q1)} kg must give ${n(Q0 * g / 100 - q1 * g1 / 100)}: ${n(Q0 * g / 100 - q1 * g1 / 100)} ÷ ${n(Q0 - q1)} × 100 = ${pct(r)}.`,
      `₹1 प्रति kg लें। आवश्यक लाभ: ${Q0} का ${g}% = ${n(Q0 * g / 100)}। पहले ${n(q1)} kg से ${n(q1 * g1 / 100)} मिलता है, अतः बाकी ${n(Q0 - q1)} kg से ${n(Q0 * g / 100 - q1 * g1 / 100)} चाहिए: ${n(Q0 * g / 100 - q1 * g1 / 100)} ÷ ${n(Q0 - q1)} × 100 = ${pct(r)}।`);
  },
};

const doubleSP = {
  id: "doubleSP", levels: ["hard", "advanced"],
  cands: () => [[2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 10], [2, 12], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 11], [3, 13]],
  build: (t, prm) => {
    const [m, k] = prm;
    const p = clean((m - 1) / (k - m) * 100);
    const mw = m === 2 ? "doubled" : "tripled", mH = m === 2 ? "दोगुना" : "तिगुना";
    const kw = String(k);
    return Q(t, `If the selling price of an article is made ${m} times as much, the profit becomes ${kw} times as much. What is the profit percentage?`,
      `यदि किसी वस्तु का विक्रय मूल्य ${m} गुना कर दिया जाए, तो लाभ ${k} गुना हो जाता है। लाभ प्रतिशत कितना है?`,
      choices(p, pct, [100 / k * m, (k - m) * 25, 100 / (k - 1)], { step: 10 }), 0, () => pct(clean((m - 1) / (k - m) * 100)),
      `Cost C, profit P, SP = C + P. Then ${m}(C + P) − C = ${k}P, so ${m - 1}C = ${k - m}P and P/C = ${m - 1}/${k - m}: a profit of ${pct(p)}.`,
      `क्र.मू. C, लाभ P, वि.मू. = C + P। तब ${m}(C + P) − C = ${k}P, अतः ${m - 1}C = ${k - m}P और P/C = ${m - 1}/${k - m}: लाभ ${pct(p)}।`);
  },
};

const cpRise = {
  id: "cpRise", levels: ["hard", "advanced"],
  cands: () => cross([20, 25, 30, 32, 40, 44, 50, 60, 65, 75, 80, 100], [4, 5, 8, 10, 12, 15, 20, 25])
    .filter(([p, a]) => { const q = (100 + p) / (100 + a) * 100 - 100; return q > 0 && nicePct(q) && a < p; }),
  build: (t, prm) => {
    const [p, a] = prm; const s0 = seller(prm);
    const q = clean((100 + p) / (100 + a) * 100 - 100);
    return Q(t, `${s0.en} makes a profit of ${p}% on an item. Its cost price then rises by ${a}%, but he keeps the selling price the same. What is his profit percentage now?`,
      `${s0.hi} को एक वस्तु पर ${p}% लाभ होता है। फिर इसका क्रय मूल्य ${a}% बढ़ जाता है, पर वह विक्रय मूल्य वही रखता है। अब उसका लाभ प्रतिशत कितना है?`,
      choices(q, pct, [p - a, (p - a) / (1 + a / 100), p * (1 - a / 100)], { step: 5 }), 0, () => pct(clean(((1 + p / 100) / (1 + a / 100) - 1) * 100)),
      `Take the old cost as 100: SP = ${100 + p}. New cost = ${100 + a}. Profit = ${p - a} on ${100 + a}: ${p - a} ÷ ${100 + a} × 100 = ${pct(q)}.`,
      `पुराना क्र.मू. 100 लें: वि.मू. = ${100 + p}। नया क्र.मू. = ${100 + a}। लाभ = ${100 + a} पर ${p - a}: ${p - a} ÷ ${100 + a} × 100 = ${pct(q)}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
const chain3 = {
  id: "chain3", levels: ["advanced"],
  cands: () => cross(CHEAP.filter((c) => c >= 1000), [10, 20, 25, 50], [-20, -10, 10, 20, 25], [-10, 10, 20, 25])
    .filter(([c, a, b, d]) => whole(c * (1 + a / 100)) && whole(c * (1 + a / 100) * (1 + b / 100)) && whole(c * (1 + a / 100) * (1 + b / 100) * (1 + d / 100))),
  build: (t, prm) => {
    const [c, a, b, d] = prm; const it = itemFor(c, prm);
    const X = clean(c * (1 + a / 100) * (1 + b / 100) * (1 + d / 100)), m = clean((1 + a / 100) * (1 + b / 100) * (1 + d / 100));
    return Q(t, `A manufacturer sells ${it.en} to a wholesaler at a profit of ${a}%. The wholesaler sells it to a retailer at a ${word(b)} of ${Math.abs(b)}%, and the retailer sells it to a customer at a ${word(d)} of ${Math.abs(d)}%. If the customer pays ₹${n(X)}, what did it cost the manufacturer?`,
      `एक निर्माता ${it.hi} एक थोक विक्रेता को ${a}% लाभ पर बेचता है। थोक विक्रेता उसे एक खुदरा विक्रेता को ${Math.abs(b)}% ${wordH(b)} पर, और खुदरा विक्रेता उसे एक ग्राहक को ${Math.abs(d)}% ${wordH(d)} पर बेचता है। यदि ग्राहक ₹${n(X)} देता है, तो निर्माता के लिए इसका क्रय मूल्य कितना था?`,
      choices(c, money, [X / (1 + (a + b + d) / 100), X * (1 - a / 100) * (1 - b / 100) * (1 - d / 100), X / ((1 + a / 100) * (1 + b / 100))], { step: stepOf(c) }), 0, () => money(clean(X / ((1 + a / 100) * (1 + b / 100) * (1 + d / 100)))),
      `Cost × ${f(a)} × ${f(b)} × ${f(d)} = ${n(X)}. The multiplier is ${n(m)}, so the cost = ${n(X)} ÷ ${n(m)} = ${money(c)}.`,
      `क्र.मू. × ${f(a)} × ${f(b)} × ${f(d)} = ${n(X)}। गुणक ${n(m)} है, अतः क्र.मू. = ${n(X)} ÷ ${n(m)} = ${money(c)}।`);
  },
};

const overallTwo = {
  id: "overallTwo", levels: ["advanced"],
  cands: () => cross([2000, 2400, 3000, 3600, 4000, 4500, 5000, 6000, 7500, 8000, 9000, 10000, 12000, 15000], [1500, 2000, 2500, 3000, 4000, 4800, 5000, 6000, 8000, 10000], [10, 12, 15, 20, 25, 30, 40], [5, 8, 10, 12, 15, 20, 25])
    .filter(([c1, c2, g, l]) => { const o = (c1 * g - c2 * l) / (c1 + c2); return c1 !== c2 && Math.abs(o) >= 1 && nicePct(o) && whole(c1 * g / 100) && whole(c2 * l / 100); }),
  build: (t, prm) => {
    const [c1, c2, g, l] = prm; const w = who(prm);
    const o = clean((c1 * g - c2 * l) / (c1 + c2));
    return SQ(t, `${w.name} buys two articles, one for ₹${n(c1)} and the other for ₹${n(c2)}. ${w.He} sells the first at a profit of ${g}% and the second at a loss of ${l}%. What is ${w.his} overall profit or loss percentage?`,
      `${w.nameH} ₹${n(c1)} की एक वस्तु और ₹${n(c2)} की दूसरी वस्तु ${w.v("खरीदता", "खरीदती")} है। ${w.v("वह", "वह")} पहली को ${g}% लाभ पर और दूसरी को ${l}% हानि पर ${w.v("बेचता", "बेचती")} है। कुल मिलाकर उसका लाभ या हानि प्रतिशत क्या है?`,
      o, [g - l, (g - l) / 2, (c1 * g - c2 * l) / c1], () => ((c1 * (1 + g / 100) + c2 * (1 - l / 100)) / (c1 + c2) - 1) * 100,
      `Profit on the first = ${g}% of ${n(c1)} = ₹${n(c1 * g / 100)}; loss on the second = ${l}% of ${n(c2)} = ₹${n(c2 * l / 100)}. Net ₹${n(Math.abs(c1 * g / 100 - c2 * l / 100))} on ₹${n(c1 + c2)}: ${pl(o)}. (The percentages cannot simply be subtracted - the costs differ.)`,
      `पहली पर लाभ = ${n(c1)} का ${g}% = ₹${n(c1 * g / 100)}; दूसरी पर हानि = ${n(c2)} का ${l}% = ₹${n(c2 * l / 100)}। शुद्ध ₹${n(Math.abs(c1 * g / 100 - c2 * l / 100))}, कुल ₹${n(c1 + c2)} पर: ${plH(o)}। (प्रतिशत सीधे घटाए नहीं जा सकते - क्रय मूल्य अलग हैं।)`);
  },
};

const KINDS = [
  gainPct, lossPct, spGain, spLoss, cpFromGain, cpFromLoss, profitAmt, repairs, perPiece, gainFromAmt, lossFromAmt,
  newTarget, diffSP, articlesEq, buyXsellY, gainEqSP, gainEqCP, onSP, chainAB, sameLossGain, repairsTarget, twoItemsSP, brokenItems,
  twoItemsAmt, twoItemsTotal, noPnl, cheaperDeal, partSale, partSaleFind, doubleSP, cpRise,
  chain3, overallTwo,
];

const THIN = {
  repairs: (p) => [p[0], p[1]], repairsTarget: (p) => [p[0], p[1]], newTarget: (p) => [p[0], p[1]], diffSP: (p) => [p[0], p[1]], chainAB: (p) => [p[0], p[1]],
  cheaperDeal: (p) => [p[0], p[1]], brokenItems: (p) => [p[0], p[1], p[2]], partSale: (p) => [p[0], p[1]], partSaleFind: (p) => [p[0], p[1]],
  twoItemsTotal: (p) => [p[0]], noPnl: (p) => [p[0]], overallTwo: (p) => [p[0], p[1]], chain3: (p) => [p[0], p[1]], sameLossGain: (p) => [p[0]],
};
for (const k of KINDS) if (THIN[k.id]) { const orig = k.cands; k.cands = () => thin(orig(), THIN[k.id]); }

const PREFIX = "Profit & Loss · Cost Price and Selling Price";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX, pl, plH, signed, SQ, word, wordH };
