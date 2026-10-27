// Profit & Loss · Dishonest Dealer: false weights, short metre rods, water
// in milk - every kind of question, level by level. gen.js fills the tests;
// every answer is worked out again in `v`. Weights are always stated in
// grams ("900 g instead of 1 kg"), never as "cheats by 10%", which books
// read in two different ways. The wrong options are the usual slips:
// dividing the missing grams by 1,000 instead of by what he gives, adding
// the markup and the cheat instead of multiplying them.
const L = require("./pl-lib");
const { Q, choices, n, pct, clean, cross, whole, nicePct, money, stepOf, f, who, seller, ratio } = L;
const { pl, plH, SQ } = require("./pl-cpsp");
const { fillTopic } = require("./gen");

const pick = (list, prm, salt = 0) => list[(L.hashOf(prm) + salt) % list.length];
const GOODS = [["rice", "चावल"], ["sugar", "चीनी"], ["dal", "दाल"], ["wheat flour", "आटा"], ["tea", "चायपत्ती"], ["turmeric", "हल्दी"]];
const KG_PRICES = [20, 24, 25, 30, 32, 36, 40, 45, 48, 50, 60, 64, 72, 75, 80, 90, 96, 100, 120, 125, 150, 160, 180, 200, 240, 250, 300, 400, 450, 500];
const GRAMS = [500, 600, 625, 640, 700, 720, 750, 760, 780, 800, 810, 820, 825, 840, 850, 860, 870, 875, 880, 890, 900, 910, 920, 925, 930, 940, 950, 960, 970, 975, 980, 990];
const gainOf = (w) => (1000 - w) / w * 100;
const OLD_GRAMS = [800, 900];
const r5 = (x) => Math.round(x / 5) * 5; // a wrong option in grams, rounded like a real weight
const thin = (list, key) => { const m = new Map(); for (const p of list) { const k = JSON.stringify(key(p)); const h = L.hashOf(p); if (!m.has(k) || h < m.get(k)[0]) m.set(k, [h, p]); } return [...m.values()].map((x) => x[1]); }; // asked in the old Mixed Practice tests

// ---------------------------------------------------------------- EASY
const falseWt = {
  id: "falseWt", levels: ["easy"],
  cands: () => GRAMS.filter((w) => w >= 600 && nicePct(gainOf(w)) && !OLD_GRAMS.includes(w)).map((w) => [w]),
  build: (t, prm) => {
    const [w] = prm; const [gd, gdH] = pick(GOODS, prm);
    const g = clean(gainOf(w));
    return Q(t, `A dishonest grocer claims to sell ${gd} at cost price, but uses a weight of ${n(w)} g instead of 1 kg. What is his profit percentage?`,
      `एक बेईमान पंसारी ${gdH} को क्रय मूल्य पर बेचने का दावा करता है, पर 1 kg के स्थान पर ${n(w)} g का बाट प्रयोग करता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [(1000 - w) / 10, (1000 - w) / w * 50, g + 5], { step: 5 }), 0, () => pct(clean((1000 / w - 1) * 100)),
      `He gives ${n(w)} g but is paid for 1,000 g: a gain of ${n(1000 - w)} g on the ${n(w)} g he gives. Profit % = ${n(1000 - w)} ÷ ${n(w)} × 100 = ${pct(g)}.`,
      `वह ${n(w)} g देता है पर दाम 1,000 g का लेता है: दिए गए ${n(w)} g पर ${n(1000 - w)} g का लाभ। लाभ % = ${n(1000 - w)} ÷ ${n(w)} × 100 = ${pct(g)}।`);
  },
};

const gainPerKg = {
  id: "gainPerKg", levels: ["easy"],
  cands: () => cross(KG_PRICES, GRAMS.filter((w) => w >= 750)).filter(([p, w]) => whole(p * (1000 - w) / 1000)),
  build: (t, prm) => {
    const [p, w] = prm; const [gd, gdH] = pick(GOODS, prm);
    const e = clean(p * (1000 - w) / 1000);
    return Q(t, `A shopkeeper buys ${gd} at ₹${p} per kg and sells it at the same price, but uses ${L.P.an(n(w))} ${n(w)} g weight for 1 kg. How much does he gain on every "kilogram" he sells?`,
      `एक दुकानदार ${gdH} ₹${p} प्रति kg की दर से खरीदता है और उसी दर पर बेचता है, पर 1 kg के लिए ${n(w)} g का बाट प्रयोग करता है। हर "किलोग्राम" बेचने पर उसे कितना लाभ होता है?`,
      choices(e, L.paise, [p * w / 1000, p * (1000 - w) / w, e * 2], { step: Math.max(1, Math.round(e / 4)), near: 0.01 }), 0, () => L.paise(clean(p - p * w / 1000)),
      `He is paid ₹${p} but gives only ${n(w)} g, which cost him ${p} × ${n(w)}/1,000 = ₹${n(p * w / 1000)}. Gain = ${p} − ${n(p * w / 1000)} = ${L.paise(e)}.`,
      `उसे ₹${p} मिलते हैं पर वह केवल ${n(w)} g देता है, जिसका क्रय मूल्य ${p} × ${n(w)}/1,000 = ₹${n(p * w / 1000)} है। लाभ = ${p} − ${n(p * w / 1000)} = ${L.paise(e)}।`);
  },
};

const trueRate = {
  id: "trueRate", levels: ["easy"],
  cands: () => cross(KG_PRICES, GRAMS.filter((w) => w >= 750)).filter(([p, w]) => whole(p * 1000 / w)),
  build: (t, prm) => {
    const [p, w] = prm; const [gd, gdH] = pick(GOODS, prm, 1);
    const r = clean(p * 1000 / w);
    return Q(t, `A grocer sells ${gd} at ₹${p} per kg, but his "1 kg" weight actually weighs ${n(w)} g. What price is a customer really paying for 1 kg?`,
      `एक पंसारी ${gdH} ₹${p} प्रति kg बेचता है, पर उसका "1 kg" का बाट वास्तव में ${n(w)} g का है। ग्राहक वास्तव में 1 kg के लिए कितना मूल्य चुका रहा है?`,
      choices(r, money, [p * w / 1000, p * (2000 - w) / 1000, r + stepOf(r) * 2], { step: Math.max(1, stepOf(r)) }), 0, () => money(clean(p / (w / 1000))),
      `₹${p} buys only ${n(w)} g, so 1,000 g costs ${p} × 1,000/${n(w)} = ${money(r)}.`,
      `₹${p} में केवल ${n(w)} g मिलता है, अतः 1,000 g का मूल्य = ${p} × 1,000/${n(w)} = ${money(r)}।`);
  },
};

const heavierBuy = {
  id: "heavierBuy", levels: ["easy"],
  cands: () => [40, 50, 60, 80, 100, 120, 125, 150, 160, 200, 240, 250].map((x) => [x]),
  build: (t, prm) => {
    const [x] = prm; const [gd, gdH] = pick(GOODS, prm, 2);
    const g = clean(x / 10);
    return Q(t, `A trader buys ${gd} from a farmer using a false weight that takes ${n(1000 + x)} g as 1 kg. He sells it at the price he paid per kg, using a correct weight. What is his profit percentage?`,
      `एक व्यापारी किसान से ${gdH} एक झूठे बाट से खरीदता है, जिससे वह 1 kg के बदले ${n(1000 + x)} g लेता है। वह इसे सही बाट से उसी दर पर बेचता है जिस दर पर उसने खरीदा। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [x / (1000 + x) * 100, x / 5, g + 5], { step: 5 }), 0, () => pct(clean(((1000 + x) / 1000 - 1) * 100)),
      `For the price of 1,000 g he gets ${n(1000 + x)} g, and sells all of it at that price: a gain of ${x} g on 1,000 g, i.e. ${x} ÷ 1,000 × 100 = ${pct(g)}.`,
      `1,000 g के दाम में उसे ${n(1000 + x)} g मिलता है, और वह सब उसी दर पर बेचता है: 1,000 g पर ${x} g का लाभ, यानी ${x} ÷ 1,000 × 100 = ${pct(g)}।`);
  },
};

const falseMetre = {
  id: "falseMetre", levels: ["easy"],
  cands: () => [75, 80, 84, 88, 90, 92, 95, 96, 98].filter((c) => nicePct((100 - c) / c * 100)).map((c) => [c]),
  build: (t, prm) => {
    const [c] = prm;
    const g = clean((100 - c) / c * 100);
    return Q(t, `A cloth merchant sells cloth at cost price but uses a metre rod that is only ${c} cm long. What is his profit percentage?`,
      `एक कपड़ा व्यापारी क्रय मूल्य पर कपड़ा बेचता है, पर उसकी मीटर की छड़ केवल ${c} cm लंबी है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [100 - c, (100 - c) / 2, g + 5], { step: 5 }), 0, () => pct(clean((100 / c - 1) * 100)),
      `He gives ${c} cm but is paid for 100 cm: ${100 - c} cm gained on ${c} cm given. Profit % = ${100 - c} ÷ ${c} × 100 = ${pct(g)}.`,
      `वह ${c} cm देता है पर दाम 100 cm का लेता है: दिए गए ${c} cm पर ${100 - c} cm का लाभ। लाभ % = ${100 - c} ÷ ${c} × 100 = ${pct(g)}।`);
  },
};

const litreCheat = {
  id: "litreCheat", levels: ["easy"],
  cands: () => GRAMS.filter((w) => w >= 600 && nicePct(gainOf(w))).map((w) => [w, 1]),
  build: (t, prm) => {
    const [w] = prm; const [it, itH] = pick([["oil", "तेल"], ["ghee", "घी"], ["kerosene", "मिट्टी का तेल"]], prm);
    const g = clean(gainOf(w));
    return Q(t, `A shopkeeper sells ${it} at cost price, but his "1 litre" measure holds only ${n(w)} ml. What is his profit percentage?`,
      `एक दुकानदार ${itH} क्रय मूल्य पर बेचता है, पर उसका "1 लीटर" का माप केवल ${n(w)} ml का है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [(1000 - w) / 10, (1000 - w) / w * 50, g + 5], { step: 5 }), 0, () => pct(clean((1000 / w - 1) * 100)),
      `He gives ${n(w)} ml for the price of 1,000 ml: ${n(1000 - w)} ml gained on ${n(w)} ml. Profit % = ${n(1000 - w)} ÷ ${n(w)} × 100 = ${pct(g)}.`,
      `वह 1,000 ml के दाम में ${n(w)} ml देता है: ${n(w)} ml पर ${n(1000 - w)} ml का लाभ। लाभ % = ${n(1000 - w)} ÷ ${n(w)} × 100 = ${pct(g)}।`);
  },
};

const waterMix = {
  id: "waterMix", group: "water", levels: ["easy", "medium"],
  cands: () => cross([2, 3, 4, 5, 6, 8, 10, 12, 15], [20, 24, 25, 30, 32, 40, 45, 48, 50, 60, 64, 75, 80, 100]).filter(([x, y]) => x * 4 <= y && nicePct(x / y * 100)),
  build: (t, prm) => {
    const [x, y] = prm;
    const g = clean(x / y * 100);
    return Q(t, `A milkman mixes ${x} litres of water into ${y} litres of milk and sells the mixture at the cost price of milk. What is his profit percentage?`,
      `एक दूधवाला ${y} लीटर दूध में ${x} लीटर पानी मिलाता है और मिश्रण को दूध के क्रय मूल्य पर बेचता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [x / (x + y) * 100, x, g + 5], { step: 5 }), 0, () => pct(clean(((x + y) / y - 1) * 100)),
      `He pays for ${y} litres and is paid for ${x + y}. Profit = ${x} litres' worth on ${y}: ${x} ÷ ${y} × 100 = ${pct(g)}.`,
      `वह ${y} लीटर का भुगतान करता है और उसे ${x + y} लीटर का दाम मिलता है। लाभ = ${y} पर ${x} लीटर: ${x} ÷ ${y} × 100 = ${pct(g)}।`);
  },
};

const waterRatio = {
  id: "waterRatio", levels: ["easy", "medium"],
  cands: () => [4, 5, 6, 8, 10, 12, 12.5, 15, 16, 20, 24, 25, 30, 32, 40, 50].map((g) => [g]),
  build: (t, prm) => {
    const [g0] = prm; const g = clean(g0);
    const ans = ratio(g, 100);
    const opts = [ans, ratio(100, g), ratio(g, 100 + g), ratio(100 - g, 100), ratio(g + 10, 100), ratio(g, 100 - g)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
    return Q(t, `A milkman makes a profit of ${pct(g)} by adding water to milk and selling the mixture at the cost price of milk. What is the ratio of water to milk in the mixture?`,
      `एक दूधवाला दूध में पानी मिलाकर और मिश्रण को दूध के क्रय मूल्य पर बेचकर ${pct(g)} लाभ कमाता है। मिश्रण में पानी और दूध का अनुपात क्या है?`,
      opts, 0, () => ratio(g / 100, 1),
      `Every litre sold is paid as milk, so the profit comes only from the water: water is ${pct(g)} of the milk. Water : milk = ${n(g)} : 100 = ${ans}.`,
      `हर बिका लीटर दूध के दाम पर जाता है, अतः लाभ केवल पानी से है: पानी दूध का ${pct(g)} है। पानी : दूध = ${n(g)} : 100 = ${ans}।`);
  },
};

const milkProfitAmt = {
  id: "milkProfitAmt", group: "water", levels: ["easy"],
  cands: () => cross([2, 3, 4, 5, 6, 8, 10, 12, 15, 20], [20, 25, 30, 40, 50, 60, 80, 100], [40, 45, 48, 50, 52, 54, 56, 60, 64, 66, 70]).filter(([x, y]) => x * 4 <= y),
  build: (t, prm) => {
    const [x, y, p] = prm;
    const P = x * p;
    return Q(t, `A milkman buys ${y} litres of milk at ₹${p} a litre, adds ${x} litres of water, and sells all of it at ₹${p} a litre. How much profit does he make?`,
      `एक दूधवाला ₹${p} प्रति लीटर की दर से ${y} लीटर दूध खरीदता है, उसमें ${x} लीटर पानी मिलाता है, और सारा मिश्रण ₹${p} प्रति लीटर बेचता है। उसे कितना लाभ होता है?`,
      choices(P, money, [y * p, (x + y) * p, P * 2], { step: stepOf(P) }), 0, () => money((x + y) * p - y * p),
      `Cost = ${y} × ${p} = ₹${n(y * p)}. Sales = ${x + y} × ${p} = ₹${n((x + y) * p)}. Profit = ${money(P)} - the price of the ${x} litres of water.`,
      `क्रय मूल्य = ${y} × ${p} = ₹${n(y * p)}। बिक्री = ${x + y} × ${p} = ₹${n((x + y) * p)}। लाभ = ${money(P)} - ${x} लीटर पानी का दाम।`);
  },
};

const shortCloth = {
  id: "shortCloth", levels: ["easy"],
  cands: () => cross([5, 6, 8, 10, 12, 15, 20, 24, 25, 30, 40, 50], [80, 84, 88, 90, 92, 94, 95, 96, 98]).filter(([Lm, c]) => L.near2(Lm * c / 100)),
  build: (t, prm) => {
    const [Lm, c] = prm; const w = who(prm);
    const got = clean(Lm * c / 100);
    return Q(t, `A shopkeeper's metre rod is only ${c} cm long. ${w.name} buys ${Lm} "metres" of cloth from him. How much cloth does ${w.he} actually get?`,
      `एक दुकानदार की मीटर की छड़ केवल ${c} cm लंबी है। ${w.nameH} उससे ${Lm} "मीटर" कपड़ा ${w.v("खरीदता", "खरीदती")} है। उसे वास्तव में कितना कपड़ा मिलता है?`,
      choices(got, (v) => `${n(v)} m`, [Lm - (100 - c) / 100, Lm * 100 / c, Lm - (100 - c) / 10], { step: 0.5, near: 0.05 }), 0, () => `${n(clean(Lm * (c / 100)))} m`,
      `Each "metre" is ${c} cm = ${n(c / 100)} m, so ${Lm} "metres" = ${Lm} × ${n(c / 100)} = ${n(got)} m.`,
      `हर "मीटर" ${c} cm = ${n(c / 100)} m है, अतः ${Lm} "मीटर" = ${Lm} × ${n(c / 100)} = ${n(got)} m।`);
  },
};

const customerGets = {
  id: "customerGets", levels: ["easy"],
  cands: () => cross([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25], GRAMS.filter((w) => w >= 800)).filter(([N, w]) => L.near2(N * w / 1000) && !OLD_GRAMS.includes(w)),
  build: (t, prm) => {
    const [N, w] = prm; const v = who(prm); const [gd, gdH] = pick(GOODS, prm, 3);
    const got = clean(N * w / 1000);
    return Q(t, `A shopkeeper uses ${L.P.an(n(w))} ${n(w)} g weight as 1 kg. ${v.name} buys ${N} kg of ${gd} from him. How much ${gd} does ${v.he} actually get?`,
      `एक दुकानदार 1 kg के रूप में ${n(w)} g का बाट प्रयोग करता है। ${v.nameH} उससे ${N} kg ${gdH} ${v.v("खरीदता", "खरीदती")} है। उसे वास्तव में कितना माल मिलता है?`,
      choices(got, (x) => `${n(x)} kg`, [N - (1000 - w) / 1000, N * 1000 / w, N - (1000 - w) / 100], { step: 0.5, near: 0.05 }), 0, () => `${n(clean(N * (w / 1000)))} kg`,
      `Each "kg" is ${n(w)} g, so ${N} "kg" = ${N} × ${n(w)} g = ${n(N * w)} g = ${n(got)} kg.`,
      `हर "kg" ${n(w)} g है, अतः ${N} "kg" = ${N} × ${n(w)} g = ${n(N * w)} g = ${n(got)} kg।`);
  },
};

const totalGainWt = {
  id: "totalGainWt", levels: ["easy"],
  cands: () => cross(KG_PRICES.filter((p) => p >= 30), GRAMS.filter((w) => w >= 800), [10, 20, 25, 40, 50, 100]).filter(([p, w, N]) => whole(N * p * (1000 - w) / 1000)),
  build: (t, prm) => {
    const [p, w, N] = prm; const [gd, gdH] = pick(GOODS, prm, 7);
    const P = clean(N * p * (1000 - w) / 1000);
    return Q(t, `A grocer buys ${gd} at ₹${p} per kg and sells it at the same price, but his "1 kg" weight is only ${n(w)} g. How much does he gain by selling ${N} "kg"?`,
      `एक पंसारी ${gdH} ₹${p} प्रति kg की दर से खरीदता है और उसी दर पर बेचता है, पर उसका "1 kg" का बाट केवल ${n(w)} g का है। ${N} "kg" बेचकर उसे कितना लाभ होता है?`,
      choices(P, money, [N * p * w / 1000, P * 2, N * p * (1000 - w) / w], { step: stepOf(P) }), 0, () => money(clean(N * p - N * w / 1000 * p)),
      `He hands over ${N} × ${n(w)} g = ${n(N * w / 1000)} kg but is paid for ${N} kg. Gain = ${n(N - N * w / 1000)} kg × ₹${p} = ${money(P)}.`,
      `वह ${N} × ${n(w)} g = ${n(N * w / 1000)} kg देता है पर दाम ${N} kg का लेता है। लाभ = ${n(N - N * w / 1000)} kg × ₹${p} = ${money(P)}।`);
  },
};

const mixCost = {
  id: "mixCost", levels: ["easy"],
  cands: () => cross([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25], [20, 24, 25, 30, 36, 40, 45, 48, 50, 60, 75, 80, 100], [36, 40, 42, 44, 45, 48, 50, 54, 55, 56, 60, 63, 64, 66, 70, 72]).filter(([x, y, p]) => x * 4 <= y && whole(y * p / (x + y))),
  build: (t, prm) => {
    const [x, y, p] = prm;
    const c = clean(y * p / (x + y));
    return Q(t, `A milkman buys ${y} litres of milk at ₹${p} a litre and mixes ${x} litres of water into it. What does one litre of the mixture cost him?`,
      `एक दूधवाला ₹${p} प्रति लीटर की दर से ${y} लीटर दूध खरीदता है और उसमें ${x} लीटर पानी मिलाता है। मिश्रण का एक लीटर उसे कितने का पड़ता है?`,
      choices(c, money, [p - x, p * (1 - x / 100), p * y / (y - x)], { step: Math.max(1, stepOf(c)) }), 0, () => money(clean(y * p / (y + x))),
      `He pays ${y} × ${p} = ₹${n(y * p)} for ${x + y} litres of mixture, so one litre costs ${n(y * p)} ÷ ${x + y} = ${money(c)}.`,
      `वह ${x + y} लीटर मिश्रण के लिए ${y} × ${p} = ₹${n(y * p)} देता है, अतः एक लीटर = ${n(y * p)} ÷ ${x + y} = ${money(c)}।`);
  },
};

const clothGain = {
  id: "clothGain", levels: ["easy"],
  cands: () => cross([40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500], [80, 84, 88, 90, 92, 94, 95, 96, 98], [10, 20, 25, 30, 40, 50]).filter(([p, c, Lm]) => whole(Lm * p * (100 - c) / 100)),
  build: (t, prm) => {
    const [p, c, Lm] = prm;
    const P = clean(Lm * p * (100 - c) / 100);
    return Q(t, `A cloth seller buys cloth at ₹${p} a metre and sells it at ₹${p} a metre, but his metre rod is only ${c} cm long. How much does he gain on selling ${Lm} "metres"?`,
      `एक कपड़ा विक्रेता ₹${p} प्रति मीटर की दर से कपड़ा खरीदता है और ₹${p} प्रति मीटर बेचता है, पर उसकी मीटर की छड़ केवल ${c} cm लंबी है। ${Lm} "मीटर" बेचकर उसे कितना लाभ होता है?`,
      choices(P, money, [Lm * p * c / 100, P * 2, Lm * p * (100 - c) / c], { step: stepOf(P) }), 0, () => money(clean(Lm * p - Lm * c / 100 * p)),
      `He gives ${Lm} × ${c} cm = ${n(Lm * c / 100)} m but is paid for ${Lm} m. Gain = ${n(Lm - Lm * c / 100)} m × ₹${p} = ${money(P)}.`,
      `वह ${Lm} × ${c} cm = ${n(Lm * c / 100)} m देता है पर दाम ${Lm} m का लेता है। लाभ = ${n(Lm - Lm * c / 100)} m × ₹${p} = ${money(P)}।`);
  },
};

const oilGain = {
  id: "oilGain", levels: ["easy"],
  cands: () => cross([90, 100, 120, 125, 140, 150, 160, 180, 200, 240, 250, 300, 400, 500, 600], GRAMS.filter((w) => w >= 800), [5, 10, 15, 20, 25, 40, 50]).filter(([p, w, N]) => whole(N * p * (1000 - w) / 1000)),
  build: (t, prm) => {
    const [p, w, N] = prm; const [it, itH] = pick([["mustard oil", "सरसों का तेल"], ["ghee", "घी"], ["refined oil", "रिफाइंड तेल"]], prm);
    const P = clean(N * p * (1000 - w) / 1000);
    return Q(t, `A shopkeeper buys ${it} at ₹${p} a litre and sells it at ₹${p} a litre, but his "1 litre" measure holds only ${n(w)} ml. How much does he gain on selling ${N} "litres"?`,
      `एक दुकानदार ${itH} ₹${p} प्रति लीटर की दर से खरीदता है और ₹${p} प्रति लीटर बेचता है, पर उसका "1 लीटर" का माप केवल ${n(w)} ml का है। ${N} "लीटर" बेचकर उसे कितना लाभ होता है?`,
      choices(P, money, [N * p * w / 1000, P * 2, N * p * (1000 - w) / w], { step: stepOf(P) }), 0, () => money(clean(N * p - N * w / 1000 * p)),
      `He gives ${N} × ${n(w)} ml = ${n(N * w / 1000)} litres but is paid for ${N} litres. Gain = ${n(N - N * w / 1000)} litres × ₹${p} = ${money(P)}.`,
      `वह ${N} × ${n(w)} ml = ${n(N * w / 1000)} लीटर देता है पर दाम ${N} लीटर का लेता है। लाभ = ${n(N - N * w / 1000)} लीटर × ₹${p} = ${money(P)}।`);
  },
};

const metreTrueRate = {
  id: "metreTrueRate", levels: ["easy"],
  cands: () => cross([40, 48, 50, 60, 72, 80, 90, 96, 100, 120, 144, 150, 180, 200, 240, 250, 300, 360, 400, 450, 480, 500], [75, 80, 84, 88, 90, 92, 95, 96, 98]).filter(([p, c]) => whole(p * 100 / c)),
  build: (t, prm) => {
    const [p, c] = prm;
    const r = clean(p * 100 / c);
    return Q(t, `A cloth seller charges ₹${p} a metre, but his metre rod is only ${c} cm long. What price is a customer really paying for one metre?`,
      `एक कपड़ा विक्रेता ₹${p} प्रति मीटर लेता है, पर उसकी मीटर की छड़ केवल ${c} cm लंबी है। ग्राहक वास्तव में एक मीटर के लिए कितना मूल्य चुका रहा है?`,
      choices(r, money, [p * c / 100, p * (200 - c) / 100, r + stepOf(r) * 2], { step: Math.max(1, stepOf(r)) }), 0, () => money(clean(p / (c / 100))),
      `₹${p} buys only ${c} cm, so 100 cm costs ${p} × 100/${c} = ${money(r)}.`,
      `₹${p} में केवल ${c} cm मिलता है, अतः 100 cm का मूल्य = ${p} × 100/${c} = ${money(r)}।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
const falseWtFind = {
  id: "falseWtFind", levels: ["medium"],
  cands: () => GRAMS.concat([500]).filter((w) => w < 1000 && nicePct(gainOf(w)) && !OLD_GRAMS.includes(w)).map((w) => [w, 7]),
  build: (t, prm) => {
    const [w] = prm; const [gd, gdH] = pick(GOODS, prm, 4);
    const g = clean(gainOf(w));
    return Q(t, `A dishonest grocer claims to sell ${gd} at cost price but makes a profit of ${pct(g)} by using a false weight. What weight does he use for 1 kg?`,
      `एक बेईमान पंसारी ${gdH} को क्रय मूल्य पर बेचने का दावा करता है, पर झूठे बाट से ${pct(g)} लाभ कमाता है। वह 1 kg के लिए कितने का बाट प्रयोग करता है?`,
      choices(w, (x) => `${n(x)} g`, [r5(1000 - g * 10), r5(1000 * (1 - g / 100)), r5(1000 - (1000 - w) / 2)], { step: 25, near: 1 }), 0, () => `${n(clean(1000 / (1 + g / 100)))} g`,
      `He is paid for 1,000 g but gives W g, and 1,000 = W × ${n(1 + g / 100)}. So W = 1,000 ÷ ${n(1 + g / 100)} = ${n(w)} g.`,
      `उसे 1,000 g का दाम मिलता है पर वह W g देता है, और 1,000 = W × ${n(1 + g / 100)}। अतः W = 1,000 ÷ ${n(1 + g / 100)} = ${n(w)} g।`);
  },
};

const wtPlusMarkup = {
  id: "wtPlusMarkup", group: "wm", levels: ["medium", "hard"],
  cands: () => cross(GRAMS.filter((w) => w >= 750), [5, 8, 10, 12, 15, 20, 25]).filter(([w, m]) => nicePct((1 + m / 100) * 1000 / w * 100 - 100) && !OLD_GRAMS.includes(w)),
  build: (t, prm) => {
    const [w, m] = prm; const s0 = seller(prm);
    const g = clean((1 + m / 100) * 1000 / w * 100 - 100);
    return Q(t, `${s0.en} sells his goods at ${m}% above the cost price and also uses ${L.P.an(n(w))} ${n(w)} g weight for 1 kg. What is his total profit percentage?`,
      `${s0.hi} अपना सामान क्रय मूल्य से ${m}% अधिक पर बेचता है और 1 kg के लिए ${n(w)} g का बाट भी प्रयोग करता है। उसका कुल लाभ प्रतिशत कितना है?`,
      choices(g, pct, [m + gainOf(w), m + (1000 - w) / 10, gainOf(w)], { step: 5 }), 0, () => pct(clean((1000 * (100 + m) / (w * 100) - 1) * 100)),
      `For ${n(w)} g (cost ₹${n(w)} at ₹1 a gram) he charges 1,000 × ${f(m)} = ₹${n(1000 * (1 + m / 100))}. Profit = ${n(1000 * (1 + m / 100) - w)} ÷ ${n(w)} × 100 = ${pct(g)}.`,
      `${n(w)} g (₹1 प्रति ग्राम पर क्रय मूल्य ₹${n(w)}) के लिए वह 1,000 × ${f(m)} = ₹${n(1000 * (1 + m / 100))} लेता है। लाभ = ${n(1000 * (1 + m / 100) - w)} ÷ ${n(w)} × 100 = ${pct(g)}।`);
  },
};

const wtPlusLoss = {
  id: "wtPlusLoss", levels: ["medium", "hard"],
  cands: () => cross(GRAMS.filter((w) => w >= 700), [4, 5, 8, 10, 12, 15, 20]).filter(([w, l]) => { const o = (1 - l / 100) * 1000 / w * 100 - 100; return Math.abs(o) >= 1 && nicePct(o); }),
  build: (t, prm) => {
    const [w, l] = prm; const s0 = seller(prm);
    const o = clean((1 - l / 100) * 1000 / w * 100 - 100);
    return SQ(t, `${s0.en} claims to sell his goods at a loss of ${l}%, but he uses ${L.P.an(n(w))} ${n(w)} g weight for 1 kg. What is his actual profit or loss percentage?`,
      `${s0.hi} अपना सामान ${l}% हानि पर बेचने का दावा करता है, पर वह 1 kg के लिए ${n(w)} g का बाट प्रयोग करता है। उसका वास्तविक लाभ या हानि प्रतिशत क्या है?`,
      o, [gainOf(w) - l, (1000 - w) / 10 - l, -l], () => (1000 * (100 - l) / (w * 100) - 1) * 100,
      `For ${n(w)} g (cost ₹${n(w)} at ₹1 a gram) he charges 1,000 × ${f(-l)} = ₹${n(1000 * (1 - l / 100))}. Result: ${n(Math.abs(1000 * (1 - l / 100) - w))} on ${n(w)} = ${pl(o)}.`,
      `${n(w)} g (₹1 प्रति ग्राम पर क्रय मूल्य ₹${n(w)}) के लिए वह 1,000 × ${f(-l)} = ₹${n(1000 * (1 - l / 100))} लेता है। परिणाम: ${n(w)} पर ${n(Math.abs(1000 * (1 - l / 100) - w))} = ${plH(o)}।`);
  },
};

const wtPlusDisc = {
  id: "wtPlusDisc", levels: ["medium", "hard", "advanced"],
  cands: () => cross(GRAMS.filter((w) => w >= 750), [20, 25, 30, 40, 50], [5, 10, 12, 15, 20]).filter(([w, m, d]) => { const o = (1 + m / 100) * (1 - d / 100) * 1000 / w * 100 - 100; return o > 0 && nicePct(o) && !(m === 40 && d === 15 && w === 900); }),
  build: (t, prm) => {
    const [w, m, d] = prm; const s0 = seller(prm);
    const k = clean((1 + m / 100) * (1 - d / 100)), g = clean(k * 1000 / w * 100 - 100);
    return Q(t, `${s0.en} marks his goods ${m}% above the cost price, gives a discount of ${d}%, and also uses ${L.P.an(n(w))} ${n(w)} g weight for 1 kg. What is his profit percentage?`,
      `${s0.hi} अपने सामान पर क्रय मूल्य से ${m}% अधिक मूल्य अंकित करता है, ${d}% छूट देता है, और 1 kg के लिए ${n(w)} g का बाट भी प्रयोग करता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [m - d + gainOf(w), (k - 1) * 100 + (1000 - w) / 10, (k - 1) * 100], { step: 5 }), 0, () => pct(clean(((100 + m) * (100 - d) * 10 / w - 100))),
      `Price charged for "1 kg" = cost of 1 kg × ${f(m)} × ${f(-d)} = ${n(k)} × cost. He gives ${n(w)} g, so profit = ${n(k)} × 1,000/${n(w)} − 1 = ${pct(g)}.`,
      `"1 kg" का लिया गया दाम = 1 kg का क्रय मूल्य × ${f(m)} × ${f(-d)} = ${n(k)} × क्रय मूल्य। वह ${n(w)} g देता है, अतः लाभ = ${n(k)} × 1,000/${n(w)} − 1 = ${pct(g)}।`);
  },
};

const bothCheat = {
  id: "bothCheat", levels: ["medium", "hard", "advanced"],
  cands: () => cross([50, 80, 100, 120, 125, 150, 200, 250], GRAMS.filter((w) => w >= 750)).filter(([x, w]) => nicePct((1000 + x) / w * 100 - 100)),
  build: (t, prm) => {
    const [x, w] = prm; const s0 = seller(prm);
    const g = clean((1000 + x) / w * 100 - 100);
    return Q(t, `${s0.en} cheats both ways at cost price: when buying he takes ${n(1000 + x)} g for every kg he pays for, and when selling he gives only ${n(w)} g for every kg. What is his profit percentage?`,
      `${s0.hi} क्रय मूल्य पर दोनों ओर बेईमानी करता है: खरीदते समय हर kg के दाम में ${n(1000 + x)} g लेता है, और बेचते समय हर kg के बदले केवल ${n(w)} g देता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [x / 10 + gainOf(w), (x + 1000 - w) / 10, gainOf(w)], { step: 5 }), 0, () => pct(clean(((1000 + x) / w - 1) * 100)),
      `For the price of 1 kg he gets ${n(1000 + x)} g, and he sells ${n(w)} g as 1 kg. So ${n(w)} g costing him ${n(w)}/${n(1000 + x)} kg's price sells for 1 kg's price: profit = ${n(1000 + x)} ÷ ${n(w)} − 1 = ${pct(g)}.`,
      `1 kg के दाम में उसे ${n(1000 + x)} g मिलता है, और वह ${n(w)} g को 1 kg बताकर बेचता है। अतः लाभ = ${n(1000 + x)} ÷ ${n(w)} − 1 = ${pct(g)}।`);
  },
};

const findWtMarkup = {
  id: "findWtMarkup", group: "wm", levels: ["medium", "hard", "advanced"],
  cands: () => cross(GRAMS.filter((w) => w >= 700), [5, 8, 10, 12, 15, 20, 25]).filter(([w, m]) => { const g = (1 + m / 100) * 1000 / w * 100 - 100; return L.near2(g) && g > m; }),
  build: (t, prm) => {
    const [w, m] = prm; const s0 = seller(prm);
    const g = clean((1 + m / 100) * 1000 / w * 100 - 100);
    return Q(t, `${s0.en} sells his goods at ${m}% above the cost price, and by also using a false weight he makes a total profit of ${pct(g)}. What weight does he use for 1 kg?`,
      `${s0.hi} अपना सामान क्रय मूल्य से ${m}% अधिक पर बेचता है, और झूठे बाट का प्रयोग करके कुल ${pct(g)} लाभ कमाता है। वह 1 kg के लिए कितने का बाट प्रयोग करता है?`,
      choices(w, (x) => `${n(x)} g`, [r5(1000 - (g - m) * 10), r5(1000 / (1 + (g - m) / 100)), r5(1000 * (1 - (g - m) / 100))], { step: 25, near: 1 }), 0, () => `${n(clean(1000 * (1 + m / 100) / (1 + g / 100)))} g`,
      `W g sell for the price of 1,000 g × ${f(m)}. So 1,000 × ${f(m)} = W × ${n(1 + g / 100)}, and W = ${n(1000 * (1 + m / 100))} ÷ ${n(1 + g / 100)} = ${n(w)} g.`,
      `W g, 1,000 g × ${f(m)} के दाम में बिकता है। अतः 1,000 × ${f(m)} = W × ${n(1 + g / 100)}, और W = ${n(1000 * (1 + m / 100))} ÷ ${n(1 + g / 100)} = ${n(w)} g।`);
  },
};

const findMarkupWt = {
  id: "findMarkupWt", levels: ["medium", "hard", "advanced"],
  cands: () => cross(GRAMS.filter((w) => w >= 750), [20, 25, 30, 32, 35, 40, 44, 50, 60]).filter(([w, g]) => { const m = (1 + g / 100) * w / 1000 * 100 - 100; return m > 0 && L.near2(m); }),
  build: (t, prm) => {
    const [w, g] = prm; const s0 = seller(prm);
    const m = clean((1 + g / 100) * w / 1000 * 100 - 100);
    return Q(t, `${s0.en} uses ${L.P.an(n(w))} ${n(w)} g weight for 1 kg. At what percentage above the cost price must he sell to make a total profit of ${g}%?`,
      `${s0.hi} 1 kg के लिए ${n(w)} g का बाट प्रयोग करता है। कुल ${g}% लाभ कमाने के लिए उसे क्रय मूल्य से कितने प्रतिशत अधिक पर बेचना चाहिए?`,
      choices(m, pct, [g - gainOf(w), g - (1000 - w) / 10, g * w / 1000], { step: 2 }), 0, () => pct(clean(((100 + g) * w / 1000 - 100))),
      `${n(w)} g cost ${n(w)} (₹1 a gram) and must sell for ${n(w)} × ${f(g)} = ${n(w * (1 + g / 100))}. That is his price for 1,000 g, i.e. ${n(w * (1 + g / 100) / 10)}% of the cost of 1,000 g: ${pct(m)} above the cost price.`,
      `${n(w)} g का क्रय मूल्य ${n(w)} (₹1 प्रति ग्राम) है और विक्रय ${n(w)} × ${f(g)} = ${n(w * (1 + g / 100))} होना चाहिए। यही 1,000 g का उसका दाम है, यानी 1,000 g के क्रय मूल्य का ${n(w * (1 + g / 100) / 10)}%: क्रय मूल्य से ${pct(m)} अधिक।`);
  },
};

const milkMarkup = {
  id: "milkMarkup", levels: ["medium", "hard"],
  cands: () => cross([5, 10, 12, 15, 20, 25, 30], [5, 8, 10, 12, 15, 20, 25]).filter(([x, m]) => L.near2((1 + x / 100) * (1 + m / 100) * 100 - 100)),
  build: (t, prm) => {
    const [x, m] = prm;
    const g = clean((1 + x / 100) * (1 + m / 100) * 100 - 100);
    return Q(t, `A milkman adds water equal to ${x}% of the milk and sells the mixture at ${m}% above the cost price of milk. What is his profit percentage?`,
      `एक दूधवाला दूध में दूध के ${x}% के बराबर पानी मिलाता है और मिश्रण को दूध के क्रय मूल्य से ${m}% अधिक पर बेचता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [x + m, x * m / 100, m], { step: 2 }), 0, () => pct(clean((100 + x) * (100 + m) / 100 - 100)),
      `100 litres of milk cost 100; with water he has ${100 + x} litres, sold at ${f(m)} each: ${100 + x} × ${f(m)} = ${n(100 + g)}. Profit = ${pct(g)}.`,
      `100 लीटर दूध का क्रय मूल्य 100; पानी मिलाकर ${100 + x} लीटर, ${f(m)} प्रति लीटर पर: ${100 + x} × ${f(m)} = ${n(100 + g)}। लाभ = ${pct(g)}।`);
  },
};

const milkLossWater = {
  id: "milkLossWater", levels: ["medium", "hard", "advanced"],
  cands: () => cross([4, 5, 8, 10, 12, 15, 20], [5, 10, 12, 15, 20, 25, 30, 35, 40, 50]).filter(([l, g]) => { const x = (1 + g / 100) / (1 - l / 100) * 100 - 100; return L.near2(x) && x <= 60; }),
  build: (t, prm) => {
    const [l, g] = prm;
    const x = clean((1 + g / 100) / (1 - l / 100) * 100 - 100);
    const ans = ratio(g + l, 100 - l);
    const opts = [ans, ratio(g + l, 100), ratio(g, 100), ratio(g + l, 200 + g)].filter((v, i, a) => a.indexOf(v) === i);
    if (opts.length < 4) opts.push(ratio(100, x));
    return Q(t, `A milkman sells milk mixed with water at ${l}% below the cost price of pure milk, yet makes a profit of ${g}%. What is the ratio of water to milk in the mixture?`,
      `एक दूधवाला पानी मिला दूध शुद्ध दूध के क्रय मूल्य से ${l}% कम पर बेचता है, फिर भी उसे ${g}% लाभ होता है। मिश्रण में पानी और दूध का अनुपात क्या है?`,
      opts.slice(0, 4), 0, () => ratio((100 + g) - (100 - l), 100 - l),
      `Take 100 litres of milk (cost 100) and W litres of water. Sales = (100 + W) × ${f(-l)} = ${100 + g}, so 100 + W = ${n((100 + g) / (1 - l / 100))} and W = ${n(x)}. Water : milk = ${n(x)} : 100 = ${g + l} : ${100 - l} = ${ans}.`,
      `100 लीटर दूध (क्रय मूल्य 100) और W लीटर पानी लें। बिक्री = (100 + W) × ${f(-l)} = ${100 + g}, अतः 100 + W = ${n((100 + g) / (1 - l / 100))} और W = ${n(x)}। पानी : दूध = ${n(x)} : 100 = ${g + l} : ${100 - l} = ${ans}।`);
  },
};

const metreMarkup = {
  id: "metreMarkup", levels: ["medium", "hard"],
  cands: () => cross([75, 80, 84, 88, 90, 92, 95, 96], [5, 8, 10, 12, 15, 20, 25]).filter(([c, m]) => nicePct((1 + m / 100) * 100 / c * 100 - 100)),
  build: (t, prm) => {
    const [c, m] = prm;
    const g = clean((1 + m / 100) * 100 / c * 100 - 100);
    return Q(t, `A cloth seller marks his cloth ${m}% above the cost price and also measures with a metre rod only ${c} cm long. What is his total profit percentage?`,
      `एक कपड़ा विक्रेता अपने कपड़े का मूल्य क्रय मूल्य से ${m}% अधिक रखता है और केवल ${c} cm लंबी मीटर की छड़ से नापता है। उसका कुल लाभ प्रतिशत कितना है?`,
      choices(g, pct, [m + (100 - c), m + (100 - c) / c * 100, (100 - c) / c * 100], { step: 5 }), 0, () => pct(clean(((100 + m) / c - 1) * 100)),
      `For ${c} cm (cost ${c} at ₹1 a cm) he charges for 100 cm at ${f(m)}: ${n(100 + m)}. Profit = ${n(100 + m - c)} ÷ ${c} × 100 = ${pct(g)}.`,
      `${c} cm (₹1 प्रति cm पर क्रय मूल्य ${c}) के लिए वह 100 cm का दाम ${f(m)} पर लेता है: ${n(100 + m)}। लाभ = ${n(100 + m - c)} ÷ ${c} × 100 = ${pct(g)}।`);
  },
};

const realProfit = {
  id: "realProfit", levels: ["medium", "hard", "advanced"],
  cands: () => cross([20, 24, 25, 30, 32, 36, 40, 45, 48, 50, 60, 64, 72, 75, 80, 90, 96, 100, 120], [24, 25, 27, 30, 32, 36, 40, 44, 45, 48, 50, 54, 60, 66, 72, 75, 80, 90, 96, 100, 108, 120, 125, 132, 144, 150], GRAMS.filter((w) => w >= 750))
    .filter(([c, S, w]) => { const g = S * 1000 / w / c * 100 - 100; return S >= c && S <= c * 1.3 && g > 0 && g <= 60 && L.near2(g); }),
  build: (t, prm) => {
    const [c, S, w] = prm; const [gd, gdH] = pick(GOODS, prm, 8);
    const r = clean(S * 1000 / w), g = clean(r / c * 100 - 100);
    return Q(t, `A grocer buys ${gd} at ₹${c} per kg and sells it at ₹${S} per kg, but uses ${L.P.an(n(w))} ${n(w)} g weight for 1 kg. What is his profit percentage?`,
      `एक पंसारी ${gdH} ₹${c} प्रति kg की दर से खरीदता है और ₹${S} प्रति kg बेचता है, पर 1 kg के लिए ${n(w)} g का बाट प्रयोग करता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [(S - c) / c * 100, (S - c) / c * 100 + (1000 - w) / 10, (S - c) / c * 100 + gainOf(w)], { step: 5 }), 0, () => pct(clean((S / (c * w / 1000) - 1) * 100)),
      `${n(w)} g cost him ${c} × ${n(w)}/1,000 = ₹${n(c * w / 1000)} and he gets ₹${S} for them. Profit = ${n(S - c * w / 1000)} ÷ ${n(c * w / 1000)} × 100 = ${pct(g)}.`,
      `${n(w)} g का क्रय मूल्य ${c} × ${n(w)}/1,000 = ₹${n(c * w / 1000)} है और उसे इनके ₹${S} मिलते हैं। लाभ = ${n(S - c * w / 1000)} ÷ ${n(c * w / 1000)} × 100 = ${pct(g)}।`);
  },
};

const milkPriceTarget = {
  id: "milkPriceTarget", levels: ["medium", "hard", "advanced"],
  cands: () => cross([2, 3, 4, 5, 6, 8, 10, 12, 15, 20], [20, 24, 25, 30, 36, 40, 45, 48, 50, 60, 75, 80, 100], [40, 42, 44, 45, 48, 50, 54, 55, 56, 60, 64], [10, 20, 25, 30, 40, 50])
    .filter(([x, y, p, g]) => x * 4 <= y && whole(y * p * (1 + g / 100) / (x + y))),
  build: (t, prm) => {
    const [x, y, p, g] = prm;
    const s = clean(y * p * (1 + g / 100) / (x + y));
    return Q(t, `A milkman buys ${y} litres of milk at ₹${p} a litre and adds ${x} litres of water. At what price per litre must he sell the mixture to make a profit of ${g}%?`,
      `एक दूधवाला ₹${p} प्रति लीटर की दर से ${y} लीटर दूध खरीदता है और उसमें ${x} लीटर पानी मिलाता है। ${g}% लाभ कमाने के लिए उसे मिश्रण किस दर प्रति लीटर बेचना चाहिए?`,
      choices(s, money, [p * (1 + g / 100), y * p * (1 + g / 100) / y - x, p * (1 + g / 100) * (1 - x / 100)], { step: Math.max(1, stepOf(s)) }), 0, () => money(clean(y * p * (100 + g) / (100 * (y + x)))),
      `Cost = ${y} × ${p} = ₹${n(y * p)}; needed sales = ${n(y * p)} × ${f(g)} = ₹${n(y * p * (1 + g / 100))} for ${x + y} litres: ${n(y * p * (1 + g / 100))} ÷ ${x + y} = ${money(s)} a litre.`,
      `क्रय मूल्य = ${y} × ${p} = ₹${n(y * p)}; ${x + y} लीटर से बिक्री ${n(y * p)} × ${f(g)} = ₹${n(y * p * (1 + g / 100))} चाहिए: ${n(y * p * (1 + g / 100))} ÷ ${x + y} = ${money(s)} प्रति लीटर।`);
  },
};

// ---------------------------------------------------------------- HARD
const profitAmtWt = {
  id: "profitAmtWt", levels: ["hard", "advanced"],
  cands: () => cross(KG_PRICES.filter((p) => p >= 30), GRAMS.filter((w) => w >= 800), [5, 10, 20, 25], [10, 20, 25, 40, 50, 100]).filter(([p, w, m, N]) => whole(N * p * (1 + m / 100) - N * w / 1000 * p)),
  build: (t, prm) => {
    const [p, w, m, N] = prm; const [gd, gdH] = pick(GOODS, prm, 5);
    const R = clean(N * p * (1 + m / 100)), C = clean(N * w / 1000 * p), P = clean(R - C);
    return Q(t, `A grocer buys ${gd} at ₹${p} per kg. He sells it at ${m}% above the cost price, but uses ${L.P.an(n(w))} ${n(w)} g weight for 1 kg. How much profit does he make on selling ${N} "kg"?`,
      `एक पंसारी ${gdH} ₹${p} प्रति kg की दर से खरीदता है। वह इसे क्रय मूल्य से ${m}% अधिक पर बेचता है, पर 1 kg के लिए ${n(w)} g का बाट प्रयोग करता है। ${N} "kg" बेचने पर उसे कितना लाभ होता है?`,
      choices(P, money, [N * p * m / 100, N * p * (1 - w / 1000), R - N * p * w / 1000 * (1 + m / 100)], { step: stepOf(P) }), 0, () => money(clean(N * (p * (100 + m) / 100 - p * w / 1000))),
      `He is paid ${N} × ${p} × ${f(m)} = ₹${n(R)}. He hands over ${N} × ${n(w)} g = ${n(N * w / 1000)} kg, costing ${n(N * w / 1000)} × ${p} = ₹${n(C)}. Profit = ${money(P)}.`,
      `उसे ${N} × ${p} × ${f(m)} = ₹${n(R)} मिलते हैं। वह ${N} × ${n(w)} g = ${n(N * w / 1000)} kg देता है, जिसका क्रय मूल्य ${n(N * w / 1000)} × ${p} = ₹${n(C)} है। लाभ = ${money(P)}।`);
  },
};

const cpFromCheat = {
  id: "cpFromCheat", levels: ["hard", "advanced"],
  cands: () => cross([24, 30, 36, 40, 45, 48, 50, 54, 60, 63, 66, 72, 75, 80, 90, 96, 99, 100, 108, 120, 126, 132, 135, 144, 150, 180, 200, 240], GRAMS.filter((w) => w >= 750), [5, 10, 20, 25, 32, 50]).filter(([S, w, g]) => { const c = S * 1000 / (w * (1 + g / 100)); return whole(c) && c >= 15; }),
  build: (t, prm) => {
    const [S, w, g] = prm; const [gd, gdH] = pick(GOODS, prm, 6);
    const c = clean(S * 1000 / (w * (1 + g / 100)));
    return Q(t, `A shopkeeper sells ${gd} at ₹${S} per kg using ${L.P.an(n(w))} ${n(w)} g weight for 1 kg, and makes a profit of ${g}%. What is his cost price per kg?`,
      `एक दुकानदार 1 kg के लिए ${n(w)} g का बाट प्रयोग करके ${gdH} ₹${S} प्रति kg बेचता है, और उसे ${g}% लाभ होता है। उसका क्रय मूल्य प्रति kg कितना है?`,
      choices(c, money, [S / (1 + g / 100), S * w / 1000 / (1 + g / 100), S * w / 1000], { step: Math.max(1, stepOf(c)) }), 0, () => money(clean(S / (w / 1000) / (1 + g / 100))),
      `₹${S} is paid for ${n(w)} g, so he really sells at ${S} × 1,000/${n(w)} = ₹${n(S * 1000 / w)} per kg. This is ${f(g)} × cost, so cost = ${n(S * 1000 / w)} ÷ ${f(g)} = ${money(c)} per kg.`,
      `₹${S} में ${n(w)} g बिकता है, अतः वास्तविक विक्रय मूल्य ${S} × 1,000/${n(w)} = ₹${n(S * 1000 / w)} प्रति kg। यह ${f(g)} × क्रय मूल्य है, अतः क्रय मूल्य = ${n(S * 1000 / w)} ÷ ${f(g)} = ${money(c)} प्रति kg।`);
  },
};

const milkTwoStage = {
  id: "milkTwoStage", levels: ["hard", "advanced"],
  cands: () => cross([40, 45, 48, 50, 54, 56, 60, 64], [5, 8, 10, 12, 15, 20], [40, 50, 60, 80, 100], [40, 42, 44, 45, 48, 50, 52, 54, 55, 56, 60]).filter(([p, x, y, s]) => { const o = (x + y) * s / (y * p) * 100 - 100; return x * 3 <= y && s < p * 1.2 && Math.abs(o) >= 2 && nicePct(o); }),
  build: (t, prm) => {
    const [p, x, y, s] = prm;
    const C = y * p, R = (x + y) * s, o = clean((R - C) / C * 100);
    return SQ(t, `A milkman buys ${y} litres of milk at ₹${p} a litre, mixes in ${x} litres of water, and sells the mixture at ₹${s} a litre. What is his profit or loss percentage?`,
      `एक दूधवाला ₹${p} प्रति लीटर की दर से ${y} लीटर दूध खरीदता है, उसमें ${x} लीटर पानी मिलाता है, और मिश्रण ₹${s} प्रति लीटर बेचता है। उसका लाभ या हानि प्रतिशत क्या है?`,
      o, [(s - p) / p * 100, x / y * 100 + (s - p) / p * 100, (R - C) / R * 100], () => ((x + y) * s / (y * p) - 1) * 100,
      `Cost = ${y} × ${p} = ₹${n(C)}. Sales = ${x + y} × ${s} = ₹${n(R)}. ${o >= 0 ? "Profit" : "Loss"} = ₹${n(Math.abs(R - C))} on ₹${n(C)}: ${pl(o)}.`,
      `क्रय मूल्य = ${y} × ${p} = ₹${n(C)}। बिक्री = ${x + y} × ${s} = ₹${n(R)}। ₹${n(C)} पर ${o >= 0 ? "लाभ" : "हानि"} = ₹${n(Math.abs(R - C))}: ${plH(o)}।`);
  },
};

const waterNeeded = {
  id: "waterNeeded", levels: ["hard", "advanced"],
  cands: () => cross([40, 45, 48, 50, 54, 56, 60, 64], [20, 30, 40, 50, 60, 80, 100], [10, 20, 25, 32, 40, 50], [40, 42, 44, 45, 48, 50, 52, 54, 55, 56, 60]).filter(([p, y, g, s]) => { const x = y * (p * (1 + g / 100) / s - 1); return x > 0 && whole(x) && x * 3 <= y * 2; }),
  build: (t, prm) => {
    const [p, y, g, s] = prm;
    const x = clean(y * (p * (1 + g / 100) / s - 1)), V = clean(y * p * (1 + g / 100) / s);
    const vals = choices(x, (v) => n(v), [y * g / 100, y * (p / s - 1) + y * g / 200, x + 5], { step: Math.max(1, Math.round(x / 4)), near: 0.5 });
    return Q(t, `A milkman has ${y} litres of milk bought at ₹${p} a litre. How many litres of water should he add so that selling the mixture at ₹${s} a litre gives him a profit of ${g}%?`,
      `एक दूधवाले के पास ₹${p} प्रति लीटर की दर से खरीदा गया ${y} लीटर दूध है। उसे कितने लीटर पानी मिलाना चाहिए कि मिश्रण ₹${s} प्रति लीटर बेचने पर उसे ${g}% लाभ हो?`,
      vals.map((v) => `${v} litres`), 0, () => `${n(clean(y * p * (100 + g) / (100 * s) - y))} litres`,
      `Cost = ${y} × ${p} = ₹${n(y * p)}; he needs sales of ${n(y * p)} × ${f(g)} = ₹${n(y * p * (1 + g / 100))}. At ₹${s} a litre that is ${n(V)} litres, so water = ${n(V)} − ${y} = ${n(x)} litres.`,
      `क्रय मूल्य = ${y} × ${p} = ₹${n(y * p)}; बिक्री ${n(y * p)} × ${f(g)} = ₹${n(y * p * (1 + g / 100))} चाहिए। ₹${s} प्रति लीटर पर यह ${n(V)} लीटर है, अतः पानी = ${n(V)} − ${y} = ${n(x)} लीटर।`,
      vals.map((v) => `${v} लीटर`));
  },
};

const bothCheatPrice = {
  id: "bothCheatPrice", levels: ["hard", "advanced"],
  cands: () => cross([20, 24, 25, 30, 32, 36, 40, 48, 50, 60, 64, 72, 80, 96, 100, 120], [50, 100, 125, 200, 250], GRAMS.filter((w) => w >= 800), [0, 5, 10, 20, 25])
    .filter(([c, x, w, m]) => { const g = (1 + m / 100) * (1000 + x) / w * 100 - 100; return whole(c * (1 + m / 100)) && g <= 80 && L.near2(g); }),
  build: (t, prm) => {
    const [c, x, w, m] = prm; const [gd, gdH] = pick(GOODS, prm, 9);
    const S = clean(c * (1 + m / 100)), g = clean((1 + m / 100) * (1000 + x) / w * 100 - 100);
    return Q(t, `A trader pays ₹${c} for each "kg" of ${gd} but makes the farmer give ${n(1000 + x)} g for it. He sells at ₹${n(S)} per kg, giving only ${n(w)} g for each kg. What is his profit percentage?`,
      `एक व्यापारी हर "kg" ${gdH} के लिए ₹${c} देता है, पर किसान से उसके बदले ${n(1000 + x)} g लेता है। वह ₹${n(S)} प्रति kg बेचता है, और हर kg के बदले केवल ${n(w)} g देता है। उसका लाभ प्रतिशत कितना है?`,
      choices(g, pct, [m + x / 10 + gainOf(w), (S - c) / c * 100 + (1000 - w) / 10, (1000 + x) / w * 100 - 100], { step: 5 }), 0, () => pct(clean((S / (c * w / (1000 + x)) - 1) * 100)),
      `₹${c} buys ${n(1000 + x)} g, so ${n(w)} g cost him ${c} × ${n(w)}/${n(1000 + x)} = ₹${n(c * w / (1000 + x))}. He sells them for ₹${n(S)}: profit = ${pct(g)}.`,
      `₹${c} में ${n(1000 + x)} g मिलता है, अतः ${n(w)} g का क्रय मूल्य ${c} × ${n(w)}/${n(1000 + x)} = ₹${n(c * w / (1000 + x))} है। वह इन्हें ₹${n(S)} में बेचता है: लाभ = ${pct(g)}।`);
  },
};

const clothMarkupAmt = {
  id: "clothMarkupAmt", levels: ["hard", "advanced"],
  cands: () => cross([40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400], [80, 84, 88, 90, 92, 95, 96], [10, 20, 25, 50], [10, 20, 25, 30, 40, 50, 100])
    .filter(([p, c, m, Lm]) => whole(Lm * p * (1 + m / 100) - Lm * c / 100 * p)),
  build: (t, prm) => {
    const [p, c, m, Lm] = prm;
    const R = clean(Lm * p * (1 + m / 100)), C = clean(Lm * c / 100 * p), P = clean(R - C);
    return Q(t, `A cloth seller buys cloth at ₹${p} a metre and sells it at ${m}% above the cost price, measuring with a metre rod only ${c} cm long. How much profit does he make on selling ${Lm} "metres"?`,
      `एक कपड़ा विक्रेता ₹${p} प्रति मीटर की दर से कपड़ा खरीदता है और क्रय मूल्य से ${m}% अधिक पर बेचता है, और केवल ${c} cm लंबी मीटर की छड़ से नापता है। ${Lm} "मीटर" बेचकर उसे कितना लाभ होता है?`,
      choices(P, money, [Lm * p * m / 100, Lm * p * (100 - c) / 100, R - Lm * p], { step: stepOf(P) }), 0, () => money(clean(Lm * (p * (100 + m) / 100 - p * c / 100))),
      `He is paid ${Lm} × ${p} × ${f(m)} = ₹${n(R)} and hands over ${Lm} × ${c} cm = ${n(Lm * c / 100)} m, costing ${n(Lm * c / 100)} × ${p} = ₹${n(C)}. Profit = ${money(P)}.`,
      `उसे ${Lm} × ${p} × ${f(m)} = ₹${n(R)} मिलते हैं और वह ${Lm} × ${c} cm = ${n(Lm * c / 100)} m देता है, जिसका क्रय मूल्य ${n(Lm * c / 100)} × ${p} = ₹${n(C)} है। लाभ = ${money(P)}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
const cheatDiscFind = {
  id: "cheatDiscFind", levels: ["advanced"],
  cands: () => cross(GRAMS.filter((w) => w >= 750), [5, 10, 12, 15, 20, 25], [20, 25, 30, 40, 50, 60]).filter(([w, d, g]) => { const m = (1 + g / 100) * w / (1000 * (1 - d / 100)) * 100 - 100; return m > 0 && L.near2(m); }),
  build: (t, prm) => {
    const [w, d, g] = prm; const s0 = seller(prm);
    const m = clean((1 + g / 100) * w / (1000 * (1 - d / 100)) * 100 - 100);
    return Q(t, `${s0.en} uses ${L.P.an(n(w))} ${n(w)} g weight for 1 kg and gives a discount of ${d}% on the marked price. By what percentage above the cost price must he mark his goods to make a total profit of ${g}%?`,
      `${s0.hi} 1 kg के लिए ${n(w)} g का बाट प्रयोग करता है और अंकित मूल्य पर ${d}% छूट देता है। कुल ${g}% लाभ कमाने के लिए उसे अपने सामान पर क्रय मूल्य से कितने प्रतिशत अधिक मूल्य अंकित करना चाहिए?`,
      choices(m, pct, [g + d - gainOf(w), (1 + g / 100) / (1 - d / 100) * 100 - 100], { step: 5 }), 0, () => pct(clean(((100 + g) * w / (10 * (100 - d))) - 100)),
      `${n(w)} g cost ${n(w)} (₹1 a gram) and must bring ${n(w)} × ${f(g)} = ${n(w * (1 + g / 100))}. That is the price after ${d}% off, so the marked price for 1,000 g is ${n(w * (1 + g / 100))} ÷ ${f(-d)} = ${n(w * (1 + g / 100) / (1 - d / 100))}: ${pct(m)} above the cost of 1,000 g.`,
      `${n(w)} g का क्रय मूल्य ${n(w)} (₹1 प्रति ग्राम) है और इससे ${n(w)} × ${f(g)} = ${n(w * (1 + g / 100))} मिलना चाहिए। यह ${d}% छूट के बाद का मूल्य है, अतः 1,000 g का अंकित मूल्य = ${n(w * (1 + g / 100))} ÷ ${f(-d)} = ${n(w * (1 + g / 100) / (1 - d / 100))}: 1,000 g के क्रय मूल्य से ${pct(m)} अधिक।`);
  },
};

const twoWayFind = {
  id: "twoWayFind", levels: ["advanced"],
  cands: () => cross([40, 50, 60, 75, 80, 100, 120, 125, 150, 160, 200, 250, 280, 300], [8, 10, 12, 15, 20, 25, 28, 30, 32, 35, 40, 44, 50, 60, 75]).filter(([x, g]) => { const w = (1000 + x) / (1 + g / 100); return whole(w) && w < 1000 && w >= 700; }),
  build: (t, prm) => {
    const [x, g] = prm; const s0 = seller(prm);
    const w = clean((1000 + x) / (1 + g / 100));
    return Q(t, `${s0.en} takes ${n(1000 + x)} g for every kg when he buys, and sells at cost price using a false weight. If his total profit is ${g}%, what weight does he use for 1 kg when selling?`,
      `${s0.hi} खरीदते समय हर kg के दाम में ${n(1000 + x)} g लेता है, और झूठे बाट से क्रय मूल्य पर बेचता है। यदि उसका कुल लाभ ${g}% है, तो बेचते समय वह 1 kg के लिए कितने का बाट प्रयोग करता है?`,
      choices(w, (v) => `${n(v)} g`, [r5(1000 / (1 + g / 100)), 1000 - (g * 10 - x), r5(1000 * (1 + x / 1000) * (1 - g / 100))], { step: 25, near: 1 }), 0, () => `${n(clean((1000 + x) * 100 / (100 + g)))} g`,
      `For one kg's price he gets ${n(1000 + x)} g; selling W g as 1 kg, those ${n(1000 + x)} g bring ${n(1000 + x)}/W kg's price. So ${n(1000 + x)}/W = ${n(1 + g / 100)} and W = ${n(w)} g.`,
      `1 kg के दाम में उसे ${n(1000 + x)} g मिलता है; W g को 1 kg बताकर बेचने पर ये ${n(1000 + x)} g, ${n(1000 + x)}/W kg का दाम लाते हैं। अतः ${n(1000 + x)}/W = ${n(1 + g / 100)} और W = ${n(w)} g।`);
  },
};

const lossClaimWt = {
  id: "lossClaimWt", levels: ["advanced"],
  cands: () => cross([2, 4, 5, 6, 8, 10, 12, 15, 16, 20, 25], [4, 5, 6, 8, 10, 12, 15, 16, 20, 25, 28, 30, 40, 50]).filter(([l, g]) => { const w = 1000 * (1 - l / 100) / (1 + g / 100); return whole(w) && w >= 600; }),
  build: (t, prm) => {
    const [l, g] = prm; const s0 = seller(prm);
    const w = clean(1000 * (1 - l / 100) / (1 + g / 100));
    return Q(t, `${s0.en} claims to sell his goods at a loss of ${l}%, but by using a false weight he actually makes a profit of ${g}%. What weight does he use for 1 kg?`,
      `${s0.hi} अपना सामान ${l}% हानि पर बेचने का दावा करता है, पर झूठे बाट से उसे वास्तव में ${g}% लाभ होता है। वह 1 kg के लिए कितने का बाट प्रयोग करता है?`,
      choices(w, (v) => `${n(v)} g`, [1000 - (g + l) * 10, r5(1000 / (1 + (g + l) / 100)), 1000 * (1 - (g + l) / 100)], { step: 25, near: 1 }), 0, () => `${n(clean(1000 * (100 - l) / (100 + g)))} g`,
      `He charges ${f(-l)} × the cost of 1 kg for W g, and this is ${f(g)} × the cost of W g. So ${n(1000 * (1 - l / 100))} = W × ${f(g)} (in grams' cost), and W = ${n(1000 * (1 - l / 100))} ÷ ${f(g)} = ${n(w)} g.`,
      `वह W g के लिए 1 kg के क्रय मूल्य का ${f(-l)} गुना लेता है, और यह W g के क्रय मूल्य का ${f(g)} गुना है। अतः ${n(1000 * (1 - l / 100))} = W × ${f(g)}, और W = ${n(1000 * (1 - l / 100))} ÷ ${f(g)} = ${n(w)} g।`);
  },
};

const KINDS = [
  falseWt, gainPerKg, trueRate, heavierBuy, falseMetre, litreCheat, waterMix, waterRatio, milkProfitAmt, shortCloth, customerGets, totalGainWt, mixCost, clothGain, oilGain, metreTrueRate,
  falseWtFind, wtPlusMarkup, wtPlusLoss, wtPlusDisc, bothCheat, findWtMarkup, findMarkupWt, milkMarkup, milkLossWater, metreMarkup, realProfit, milkPriceTarget,
  profitAmtWt, cpFromCheat, milkTwoStage, waterNeeded, bothCheatPrice, clothMarkupAmt,
  cheatDiscFind, twoWayFind, lossClaimWt,
];
const THIN = { findMarkupWt: (p) => [p[0], p[1] >= 40], wtPlusDisc: (p) => [p[0], p[1]], cheatDiscFind: (p) => [p[0], p[1]], profitAmtWt: (p) => [p[1], p[2]], cpFromCheat: (p) => [p[1], p[2]], bothCheatPrice: (p) => [p[2], p[3]], milkTwoStage: (p) => [p[0], p[2]], waterNeeded: (p) => [p[0], p[1]], realProfit: (p) => [p[2], p[0] >= 60], clothMarkupAmt: (p) => [p[1], p[2]], gainPerKg: (p) => [p[1], p[0] >= 100], totalGainWt: (p) => [p[1], p[2]], oilGain: (p) => [p[1], p[2]], customerGets: (p) => [p[1], p[0] > 10] };
for (const k of KINDS) if (THIN[k.id]) { const orig = k.cands; k.cands = () => thin(orig(), THIN[k.id]); }

const PREFIX = "Profit & Loss · Dishonest Dealer";
const topic = () => { require("./pl-dmp").topic(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED }); };
module.exports = { KINDS, topic, PREFIX };
