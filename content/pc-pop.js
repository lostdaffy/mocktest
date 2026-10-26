// Percentage · Population Growth and Depreciation: every kind of question,
// level by level, and the numbers each can be asked with. gen.js fills the
// 40 tests from them; every answer is worked out again in `v`, and the wrong
// options are the slips students make (adding the rates instead of
// compounding them, taking a percentage of the new value to go back, ...).
const { Q, P } = require("./pct-builders");
const { choices } = require("./pct-adv-builders");
const { fillTopic, numbersOf } = require("./gen");
const { n, rs, pct, clean, isInt } = P;
const f = (x) => n(1 + x / 100);
const pop = (x) => n(Math.round(x));
const money = (x) => rs(Math.round(x));
const stepOf = (x) => 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(x) || 1)) - 1);
const grow = (v, ...rs_) => clean(rs_.reduce((m, r) => m * (1 + r / 100), v));
const hashOf = (p) => [...numbersOf(p)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = (list, p) => list[hashOf(p) % list.length];
const whole = (x) => isInt(x);

const PLACES = [["town", "कस्बे"], ["village", "गाँव"], ["city", "शहर"], ["district", "ज़िले"], ["block", "ब्लॉक"], ["tehsil", "तहसील"]];
const ASSETS = [["machine", "मशीन"], ["car", "कार"], ["scooter", "स्कूटर"], ["computer", "कंप्यूटर"], ["tractor", "ट्रैक्टर"], ["printer", "प्रिंटर"], ["generator", "जनरेटर"], ["motorcycle", "मोटरसाइकिल"], ["truck", "ट्रक"], ["photocopier", "फ़ोटोकॉपी मशीन"], ["refrigerator", "फ़्रिज"], ["bus", "बस"]];
const yrs = (k) => (k === 1 ? "1 year" : `${k} years`);

// Number lists.
const POPS = [8000, 10000, 12000, 15000, 16000, 18000, 20000, 24000, 25000, 30000, 32000, 36000, 40000, 45000, 48000, 50000, 60000, 64000, 72000, 75000, 80000, 90000, 96000, 100000, 120000, 125000, 150000, 160000, 200000, 250000];
const VALUES = [8000, 10000, 12000, 15000, 16000, 20000, 24000, 25000, 30000, 40000, 45000, 48000, 50000, 60000, 64000, 75000, 80000, 90000, 100000, 120000, 125000, 150000, 160000, 200000, 250000, 300000, 400000, 500000, 600000, 800000];
const EASY_R = [2, 4, 5, 6, 8, 10, 12, 15, 20, 25];
const R = [2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 25, 30]; // depreciation
// A population does not grow 25-30% a year; 20% is already a lot.
const R_POP = [2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20];
const EASY_POP = [2, 4, 5, 6, 8, 10, 12, 15, 20];
const cross = (...lists) => lists.reduce((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);

// ---------------------------------------------------------------- EASY
const popAfter1 = {
  id: "popAfter1", group: "pop1", levels: ["easy"],
  cands: () => cross(POPS, EASY_POP).filter(([p, r]) => whole(grow(p, r))),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const ans = grow(p, r);
    return Q(t, `The population of a ${pl} is ${n(p)}. It increases by ${r}% in a year. What will the population be after 1 year?`,
      `एक ${plH} की जनसंख्या ${n(p)} है। एक वर्ष में यह ${r}% बढ़ जाती है। 1 वर्ष बाद जनसंख्या कितनी होगी?`,
      choices(ans, pop, [p * r / 100, p * (1 - r / 100), p * (1 + 2 * r / 100)], { step: stepOf(ans) }), 0, () => pop(ans),
      `After 1 year: ${n(p)} × ${f(r)} = ${pop(ans)}.`, `1 वर्ष बाद: ${n(p)} × ${f(r)} = ${pop(ans)}।`);
  },
};

const popAfter2 = {
  id: "popAfter2", group: "pop2", levels: ["easy"],
  cands: () => cross(POPS, EASY_POP).filter(([p, r]) => whole(grow(p, r, r))),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const a1 = grow(p, r), ans = grow(p, r, r);
    return Q(t, `The population of a ${pl} is ${n(p)} and grows by ${r}% every year. What will it be after 2 years?`,
      `एक ${plH} की जनसंख्या ${n(p)} है और हर वर्ष ${r}% बढ़ती है। 2 वर्ष बाद यह कितनी होगी?`,
      choices(ans, pop, [p * (1 + 2 * r / 100), a1, grow(p, r, r, r)], { step: stepOf(ans) }), 0, () => pop(ans),
      `After 1 year: ${n(p)} × ${f(r)} = ${pop(a1)}. After 2 years: ${pop(a1)} × ${f(r)} = ${pop(ans)}.`,
      `1 वर्ष बाद: ${n(p)} × ${f(r)} = ${pop(a1)}। 2 वर्ष बाद: ${pop(a1)} × ${f(r)} = ${pop(ans)}।`);
  },
};

const popAgo1 = {
  id: "popAgo1", group: "pop1", levels: ["easy"],
  cands: () => cross(POPS, EASY_POP).filter(([p, r]) => whole(grow(p, r))),
  build: (t, prm) => {
    const [p0, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const now = grow(p0, r);
    return Q(t, `The population of a ${pl} is ${n(now)} now. It increased by ${r}% during the last year. What was it a year ago?`,
      `एक ${plH} की जनसंख्या अब ${n(now)} है। पिछले वर्ष में यह ${r}% बढ़ी। एक वर्ष पहले जनसंख्या कितनी थी?`,
      choices(p0, pop, [now * (1 - r / 100), now - r * 100, now * (1 - r / 100) - stepOf(p0)], { step: stepOf(p0) }), 0, () => pop(clean(now / (1 + r / 100))),
      `A year ago × ${f(r)} = ${n(now)}, so a year ago it was ${n(now)} ÷ ${f(r)} = ${pop(p0)}.`,
      `एक वर्ष पहले की जनसंख्या × ${f(r)} = ${n(now)}, अतः तब यह ${n(now)} ÷ ${f(r)} = ${pop(p0)} थी।`);
  },
};

const popIncrease2 = {
  id: "popIncrease2", group: "pop2", levels: ["easy"],
  cands: () => cross(POPS, EASY_POP).filter(([p, r]) => whole(grow(p, r, r))),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const end = grow(p, r, r), ans = clean(end - p);
    return Q(t, `The population of a ${pl} is ${n(p)} and grows by ${r}% every year. By how many people will it increase in 2 years?`,
      `एक ${plH} की जनसंख्या ${n(p)} है और हर वर्ष ${r}% बढ़ती है। 2 वर्ष में इसमें कितने लोगों की वृद्धि होगी?`,
      choices(ans, pop, [p * 2 * r / 100, p * r / 100, end], { step: stepOf(ans) }), 0, () => pop(ans),
      `After 2 years: ${n(p)} × ${f(r)} × ${f(r)} = ${pop(end)}. The increase is ${pop(end)} − ${n(p)} = ${pop(ans)}.`,
      `2 वर्ष बाद: ${n(p)} × ${f(r)} × ${f(r)} = ${pop(end)}। वृद्धि = ${pop(end)} − ${n(p)} = ${pop(ans)}।`);
  },
};

const depAfter1 = {
  id: "depAfter1", group: "dep1", levels: ["easy"],
  cands: () => cross(VALUES, EASY_R).filter(([v, r]) => whole(grow(v, -r))),
  build: (t, prm) => {
    const [v, r] = prm; const [as, asH] = pick(ASSETS, prm);
    const ans = grow(v, -r);
    return Q(t, `A ${as} is worth ₹${n(v)}. Its value falls by ${r}% every year. What will it be worth after 1 year?`,
      `एक ${asH} का मूल्य ₹${n(v)} है। इसका मूल्य हर वर्ष ${r}% घटता है। 1 वर्ष बाद इसका मूल्य कितना होगा?`,
      choices(ans, money, [v * r / 100, grow(v, r), grow(v, -2 * r)], { step: stepOf(ans) }), 0, () => money(ans),
      `After 1 year: ${n(v)} × ${f(-r)} = ${money(ans)}.`, `1 वर्ष बाद: ${n(v)} × ${f(-r)} = ${money(ans)}।`);
  },
};

const depAfter2 = {
  id: "depAfter2", group: "dep2", levels: ["easy"],
  cands: () => cross(VALUES, EASY_R).filter(([v, r]) => whole(grow(v, -r, -r))),
  build: (t, prm) => {
    const [v, r] = prm; const [as, asH] = pick(ASSETS, prm);
    const a1 = grow(v, -r), ans = grow(v, -r, -r);
    return Q(t, `A ${as} bought for ₹${n(v)} loses ${r}% of its value every year. What will it be worth after 2 years?`,
      `₹${n(v)} में खरीदी गई एक ${asH} का मूल्य हर वर्ष ${r}% घटता है। 2 वर्ष बाद इसका मूल्य कितना होगा?`,
      choices(ans, money, [grow(v, -2 * r), a1, grow(v, -r, -r, -r)], { step: stepOf(ans) }), 0, () => money(ans),
      `After 1 year: ${n(v)} × ${f(-r)} = ₹${n(a1)}. After 2 years: ${n(a1)} × ${f(-r)} = ${money(ans)}.`,
      `1 वर्ष बाद: ${n(v)} × ${f(-r)} = ₹${n(a1)}। 2 वर्ष बाद: ${n(a1)} × ${f(-r)} = ${money(ans)}।`);
  },
};

const depAgo1 = {
  id: "depAgo1", group: "dep1", levels: ["easy"],
  cands: () => cross(VALUES, EASY_R).filter(([v, r]) => whole(grow(v, -r))),
  build: (t, prm) => {
    const [v0, r] = prm; const [as, asH] = pick(ASSETS, prm);
    const now = grow(v0, -r);
    return Q(t, `After losing ${r}% of its value in a year, a ${as} is now worth ₹${n(now)}. What was it worth a year ago?`,
      `एक वर्ष में ${r}% मूल्य घटने के बाद एक ${asH} का मूल्य अब ₹${n(now)} है। एक वर्ष पहले इसका मूल्य कितना था?`,
      choices(v0, money, [grow(now, r), now + r * 100, grow(now, 2 * r)], { step: stepOf(v0) }), 0, () => money(clean(now / (1 - r / 100))),
      `A year ago × ${f(-r)} = ${n(now)}, so a year ago it was worth ${n(now)} ÷ ${f(-r)} = ${money(v0)}.`,
      `एक वर्ष पहले का मूल्य × ${f(-r)} = ${n(now)}, अतः तब इसका मूल्य ${n(now)} ÷ ${f(-r)} = ${money(v0)} था।`);
  },
};

const depLoss2 = {
  id: "depLoss2", group: "dep2", levels: ["easy"],
  cands: () => cross(VALUES, EASY_R).filter(([v, r]) => whole(grow(v, -r, -r))),
  build: (t, prm) => {
    const [v, r] = prm; const [as, asH] = pick(ASSETS, prm);
    const end = grow(v, -r, -r), ans = clean(v - end);
    return Q(t, `A ${as} is worth ₹${n(v)}, and its value falls by ${r}% every year. By how much will its value fall in 2 years?`,
      `एक ${asH} का मूल्य ₹${n(v)} है, और यह हर वर्ष ${r}% घटता है। 2 वर्ष में इसका मूल्य कुल कितना घटेगा?`,
      choices(ans, money, [v * 2 * r / 100, v * r / 100, end], { step: stepOf(ans) }), 0, () => money(ans),
      `After 2 years: ${n(v)} × ${f(-r)} × ${f(-r)} = ₹${n(end)}. The fall is ${n(v)} − ${n(end)} = ${money(ans)}.`,
      `2 वर्ष बाद: ${n(v)} × ${f(-r)} × ${f(-r)} = ₹${n(end)}। कमी = ${n(v)} − ${n(end)} = ${money(ans)}।`);
  },
};

const birthDeath1 = {
  id: "birthDeath1", levels: ["easy"],
  cands: () => cross(POPS, [3, 4, 5, 6, 7, 8], [1, 2, 3]).filter(([p, b, d]) => b > d && whole(grow(p, b - d))),
  build: (t, prm) => {
    const [p, b, d] = prm; const [pl, plH] = pick(PLACES, prm);
    const ans = grow(p, b - d);
    return Q(t, `The population of a ${pl} is ${n(p)}. In a year the births add ${b}% and the deaths take away ${d}% of it. What is the population after 1 year?`,
      `एक ${plH} की जनसंख्या ${n(p)} है। एक वर्ष में जन्म से इसमें ${b}% की वृद्धि और मृत्यु से ${d}% की कमी होती है। 1 वर्ष बाद जनसंख्या कितनी होगी?`,
      choices(ans, pop, [grow(p, b), grow(p, b + d), grow(p, d - b)], { step: stepOf(ans) }), 0, () => pop(ans),
      `The net growth is ${b}% − ${d}% = ${b - d}%. After 1 year: ${n(p)} × ${f(b - d)} = ${pop(ans)}.`,
      `शुद्ध वृद्धि = ${b}% − ${d}% = ${b - d}%। 1 वर्ष बाद: ${n(p)} × ${f(b - d)} = ${pop(ans)}।`);
  },
};

const rate1 = {
  id: "rate1", group: "pop1", levels: ["easy"],
  cands: () => cross(POPS, EASY_POP).filter(([p, r]) => whole(grow(p, r))),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const q = grow(p, r), inc = clean(q - p);
    return Q(t, `The population of a ${pl} rose from ${n(p)} to ${n(q)} in a year. By what percentage did it grow?`,
      `एक ${plH} की जनसंख्या एक वर्ष में ${n(p)} से बढ़कर ${n(q)} हो गई। यह कितने प्रतिशत बढ़ी?`,
      choices(r, pct, [inc / q * 100, r * 2, r + 5], { step: 1 }), 0, () => pct(clean(inc / p * 100)),
      `The rise is ${n(q)} − ${n(p)} = ${n(inc)}. As a percentage of the starting ${n(p)}: ${n(inc)} ÷ ${n(p)} × 100 = ${pct(r)}.`,
      `वृद्धि = ${n(q)} − ${n(p)} = ${n(inc)}। शुरुआती ${n(p)} पर प्रतिशत: ${n(inc)} ÷ ${n(p)} × 100 = ${pct(r)}।`);
  },
};

const depRate1 = {
  id: "depRate1", group: "dep1", levels: ["easy"],
  cands: () => cross(VALUES, EASY_R).filter(([v, r]) => whole(grow(v, -r))),
  build: (t, prm) => {
    const [v, r] = prm; const [as, asH] = pick(ASSETS, prm);
    const w = grow(v, -r), fall = clean(v - w);
    return Q(t, `In one year the value of a ${as} fell from ₹${n(v)} to ₹${n(w)}. What was the rate of depreciation?`,
      `एक वर्ष में एक ${asH} का मूल्य ₹${n(v)} से घटकर ₹${n(w)} रह गया। मूल्यह्रास की दर कितनी थी?`,
      choices(r, pct, [fall / w * 100, r * 2, r + 5], { step: 1 }), 0, () => pct(clean(fall / v * 100)),
      `The fall is ${n(v)} − ${n(w)} = ${n(fall)}. As a percentage of the starting value: ${n(fall)} ÷ ${n(v)} × 100 = ${pct(r)}.`,
      `कमी = ${n(v)} − ${n(w)} = ${n(fall)}। शुरुआती मूल्य पर प्रतिशत: ${n(fall)} ÷ ${n(v)} × 100 = ${pct(r)}।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
const popAfter3 = {
  id: "popAfter3", group: "pop3", levels: ["medium"],
  cands: () => cross(POPS, [5, 10, 20]).filter(([p, r]) => whole(grow(p, r, r, r))),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const a1 = grow(p, r), a2 = grow(p, r, r), ans = grow(p, r, r, r);
    return Q(t, `The population of a ${pl} is ${n(p)}. If it grows by ${r}% every year, what will it be after 3 years?`,
      `एक ${plH} की जनसंख्या ${n(p)} है। यदि यह हर वर्ष ${r}% बढ़े, तो 3 वर्ष बाद कितनी होगी?`,
      choices(ans, pop, [p * (1 + 3 * r / 100), a2, grow(p, r, r, r, r)], { step: stepOf(ans) }), 0, () => pop(ans),
      `Year by year: ${n(p)} → ${pop(a1)} → ${pop(a2)} → ${pop(ans)} (each × ${f(r)}).`,
      `हर वर्ष × ${f(r)}: ${n(p)} → ${pop(a1)} → ${pop(a2)} → ${pop(ans)}।`);
  },
};

const twoRates = {
  id: "twoRates", levels: ["medium"],
  cands: () => cross(POPS, R_POP, R).filter(([p, a, b]) => a !== b && whole(grow(p, a, b))),
  build: (t, prm) => {
    const [p, a, b] = prm; const [pl, plH] = pick(PLACES, prm);
    const a1 = grow(p, a), ans = grow(p, a, b);
    return Q(t, `The population of a ${pl} is ${n(p)}. It grows by ${a}% in the first year and by ${b}% in the second. What is it after 2 years?`,
      `एक ${plH} की जनसंख्या ${n(p)} है। यह पहले वर्ष ${a}% और दूसरे वर्ष ${b}% बढ़ती है। 2 वर्ष बाद यह कितनी होगी?`,
      choices(ans, pop, [p * (1 + (a + b) / 100), grow(p, a, a), grow(p, b, b)], { step: stepOf(ans) }), 0, () => pop(ans),
      `After the first year: ${n(p)} × ${f(a)} = ${pop(a1)}. After the second: ${pop(a1)} × ${f(b)} = ${pop(ans)}.`,
      `पहले वर्ष बाद: ${n(p)} × ${f(a)} = ${pop(a1)}। दूसरे वर्ष बाद: ${pop(a1)} × ${f(b)} = ${pop(ans)}।`);
  },
};

const upDown = {
  id: "upDown", levels: ["medium"],
  cands: () => cross(POPS, R_POP, [5, 10, 15, 20]).filter(([p, a, b]) => whole(grow(p, a, -b)) && grow(p, a, -b) !== p),
  build: (t, prm) => {
    const [p, a, b] = prm; const [pl, plH] = pick(PLACES, prm);
    const a1 = grow(p, a), ans = grow(p, a, -b);
    return Q(t, `The population of a ${pl} was ${n(p)}. It rose by ${a}% in one year, and an epidemic then brought it down by ${b}% the next year. What was the population after these 2 years?`,
      `एक ${plH} की जनसंख्या ${n(p)} थी। एक वर्ष में यह ${a}% बढ़ी, और अगले वर्ष एक महामारी से ${b}% घट गई। इन 2 वर्षों के बाद जनसंख्या कितनी थी?`,
      choices(ans, pop, [p * (1 + (a - b) / 100), grow(p, -b, -b) + 0, grow(p, a, b)], { step: stepOf(ans) }), 0, () => pop(ans),
      `After the rise: ${n(p)} × ${f(a)} = ${pop(a1)}. After the fall: ${pop(a1)} × ${f(-b)} = ${pop(ans)}.`,
      `वृद्धि के बाद: ${n(p)} × ${f(a)} = ${pop(a1)}। कमी के बाद: ${pop(a1)} × ${f(-b)} = ${pop(ans)}।`);
  },
};

const popAgo2 = {
  id: "popAgo2", group: "pop2", levels: ["medium"],
  cands: () => cross(POPS, R_POP).filter(([p, r]) => whole(grow(p, r, r))),
  build: (t, prm) => {
    const [p0, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const now = grow(p0, r, r), m = clean((1 + r / 100) ** 2);
    return Q(t, `The population of a ${pl} is ${n(now)} now. It has grown by ${r}% every year for the last 2 years. What was it 2 years ago?`,
      `एक ${plH} की जनसंख्या अब ${n(now)} है। पिछले 2 वर्षों से यह हर वर्ष ${r}% बढ़ी है। 2 वर्ष पहले यह कितनी थी?`,
      choices(p0, pop, [now * (1 - 2 * r / 100), grow(now, -r, -r), now / (1 + 2 * r / 100)], { step: stepOf(p0) }), 0, () => pop(clean(now / m)),
      `2 years ago × ${f(r)} × ${f(r)} = ${n(now)}. The multiplier is ${n(m)}, so 2 years ago it was ${n(now)} ÷ ${n(m)} = ${pop(p0)}.`,
      `2 वर्ष पहले की जनसंख्या × ${f(r)} × ${f(r)} = ${n(now)}। गुणक ${n(m)} है, अतः तब यह ${n(now)} ÷ ${n(m)} = ${pop(p0)} थी।`);
  },
};

const depAgo2 = {
  id: "depAgo2", group: "dep2", levels: ["medium"],
  cands: () => cross(VALUES, R).filter(([v, r]) => whole(grow(v, -r, -r))),
  build: (t, prm) => {
    const [v0, r] = prm; const [as, asH] = pick(ASSETS, prm);
    const now = grow(v0, -r, -r), m = clean((1 - r / 100) ** 2);
    return Q(t, `A ${as} loses ${r}% of its value every year. After 2 years it is worth ₹${n(now)}. What did it cost?`,
      `एक ${asH} का मूल्य हर वर्ष ${r}% घटता है। 2 वर्ष बाद इसका मूल्य ₹${n(now)} है। इसे कितने में खरीदा गया था?`,
      choices(v0, money, [now * (1 + 2 * r / 100), grow(now, r, r), now / (1 - 2 * r / 100)], { step: stepOf(v0) }), 0, () => money(clean(now / m)),
      `Cost × ${f(-r)} × ${f(-r)} = ${n(now)}. The multiplier is ${n(m)}, so the cost was ${n(now)} ÷ ${n(m)} = ${money(v0)}.`,
      `क्रय मूल्य × ${f(-r)} × ${f(-r)} = ${n(now)}। गुणक ${n(m)} है, अतः क्रय मूल्य = ${n(now)} ÷ ${n(m)} = ${money(v0)}।`);
  },
};

const rate2 = {
  id: "rate2", group: "pop2", levels: ["medium"],
  cands: () => cross(POPS, [4, 5, 6, 8, 10, 12, 15, 20]).filter(([p, r]) => whole(grow(p, r, r))),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const q = grow(p, r, r), m = clean(q / p);
    return Q(t, `At a steady yearly rate, the population of a ${pl} grew from ${n(p)} to ${n(q)} in 2 years. What was the yearly rate of growth?`,
      `एक स्थिर वार्षिक दर से एक ${plH} की जनसंख्या 2 वर्ष में ${n(p)} से बढ़कर ${n(q)} हो गई। वार्षिक वृद्धि दर कितनी थी?`,
      choices(r, pct, [(m - 1) * 100 / 2, (m - 1) * 100, r + 5], { step: 5 }), 0, () => pct(clean((Math.sqrt(m) - 1) * 100)),
      `(1 + r)² = ${n(q)} ÷ ${n(p)} = ${n(m)}. Since ${f(r)}² = ${n(m)}, 1 + r = ${f(r)} and r = ${pct(r)}.`,
      `(1 + r)² = ${n(q)} ÷ ${n(p)} = ${n(m)}। चूँकि ${f(r)}² = ${n(m)}, 1 + r = ${f(r)} और r = ${pct(r)}।`);
  },
};

const migration1 = {
  id: "migration1", levels: ["medium"],
  cands: () => cross(POPS, R_POP, [200, 300, 500, 600, 800, 1000, 1200, 1500, 2000]).filter(([p, r, m]) => whole(grow(p, r)) && m < p * r / 100),
  build: (t, prm) => {
    const [p, r, m] = prm; const [pl, plH] = pick(PLACES, prm);
    const g = grow(p, r), ans = clean(g - m);
    return Q(t, `The population of a ${pl} is ${n(p)}. In a year it grows naturally by ${r}%, and ${n(m)} people move away. What is the population at the end of the year?`,
      `एक ${plH} की जनसंख्या ${n(p)} है। एक वर्ष में यह प्राकृतिक रूप से ${r}% बढ़ती है, और ${n(m)} लोग यहाँ से चले जाते हैं। वर्ष के अंत में जनसंख्या कितनी होगी?`,
      choices(ans, pop, [g + m, grow(p - m, r), g], { step: stepOf(ans) }), 0, () => pop(ans),
      `Natural growth: ${n(p)} × ${f(r)} = ${pop(g)}. After ${n(m)} leave: ${pop(g)} − ${n(m)} = ${pop(ans)}.`,
      `प्राकृतिक वृद्धि: ${n(p)} × ${f(r)} = ${pop(g)}। ${n(m)} लोगों के जाने के बाद: ${pop(g)} − ${n(m)} = ${pop(ans)}।`);
  },
};

const dep3 = {
  id: "dep3", levels: ["medium"],
  cands: () => cross(VALUES, [10, 20, 25], [10, 20, 25], [10, 20, 25]).filter(([v, a, b, c]) => !(a === b && b === c) && whole(grow(v, -a, -b, -c))),
  build: (t, prm) => {
    const [v, a, b, c] = prm; const [as, asH] = pick(ASSETS, prm);
    const v1 = grow(v, -a), v2 = grow(v, -a, -b), ans = grow(v, -a, -b, -c);
    return Q(t, `A ${as} costs ₹${n(v)}. Its value falls by ${a}% in the first year, ${b}% in the second and ${c}% in the third. What is it worth after 3 years?`,
      `एक ${asH} का मूल्य ₹${n(v)} है। इसका मूल्य पहले वर्ष ${a}%, दूसरे वर्ष ${b}% और तीसरे वर्ष ${c}% घटता है। 3 वर्ष बाद इसका मूल्य कितना होगा?`,
      choices(ans, money, [v * (1 - (a + b + c) / 100), v2, grow(v, -a, -a, -a)], { step: stepOf(ans) }), 0, () => money(ans),
      `${n(v)} → ₹${n(v1)} → ₹${n(v2)} → ${money(ans)} (× ${f(-a)}, × ${f(-b)}, × ${f(-c)}).`,
      `${n(v)} → ₹${n(v1)} → ₹${n(v2)} → ${money(ans)} (× ${f(-a)}, × ${f(-b)}, × ${f(-c)})।`);
  },
};

const diffYears = {
  id: "diffYears", group: "pop2", levels: ["medium"],
  cands: () => cross(POPS, R_POP).filter(([p, r]) => whole(grow(p, r, r)) && whole(grow(p, r))),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const p1 = grow(p, r), p2 = grow(p, r, r), d = clean(p2 - p1), k = clean((1 + r / 100) * r / 100);
    return Q(t, `The population of a ${pl} grows by ${r}% every year. The population after 2 years will be ${n(d)} more than the population after 1 year. What is the population now?`,
      `एक ${plH} की जनसंख्या हर वर्ष ${r}% बढ़ती है। 2 वर्ष बाद की जनसंख्या 1 वर्ष बाद की जनसंख्या से ${n(d)} अधिक होगी। अभी जनसंख्या कितनी है?`,
      choices(p, pop, [d / (r / 100), d / (2 * r / 100), d * 100 / (100 + r)], { step: stepOf(p) }), 0, () => pop(clean(d / k)),
      `With P now: after 1 year ${f(r)}P, after 2 years ${n((1 + r / 100) ** 2)}P. The gap is ${n(k)}P = ${n(d)}, so P = ${n(d)} ÷ ${n(k)} = ${pop(p)}.`,
      `अभी की जनसंख्या P हो: 1 वर्ष बाद ${f(r)}P, 2 वर्ष बाद ${n((1 + r / 100) ** 2)}P। अंतर ${n(k)}P = ${n(d)}, अतः P = ${n(d)} ÷ ${n(k)} = ${pop(p)}।`);
  },
};

const birthDeath2 = {
  id: "birthDeath2", levels: ["medium"],
  cands: () => cross(POPS, [4, 5, 6, 7, 8, 12], [1, 2, 3, 4]).filter(([p, b, d]) => b > d && whole(grow(p, b - d, b - d))),
  build: (t, prm) => {
    const [p, b, d] = prm; const [pl, plH] = pick(PLACES, prm);
    const r = b - d, a1 = grow(p, r), ans = grow(p, r, r);
    return Q(t, `In a ${pl} of ${n(p)} people, births add ${b}% and deaths remove ${d}% of the population every year. What will the population be after 2 years?`,
      `${n(p)} लोगों के एक ${plH} में हर वर्ष जन्म से ${b}% की वृद्धि और मृत्यु से ${d}% की कमी होती है। 2 वर्ष बाद जनसंख्या कितनी होगी?`,
      choices(ans, pop, [grow(p, b, b), p * (1 + 2 * r / 100), grow(p, b + d, b + d)], { step: stepOf(ans) }), 0, () => pop(ans),
      `The net yearly growth is ${b}% − ${d}% = ${r}%. ${n(p)} → ${pop(a1)} → ${pop(ans)} (each × ${f(r)}).`,
      `शुद्ध वार्षिक वृद्धि = ${b}% − ${d}% = ${r}%। ${n(p)} → ${pop(a1)} → ${pop(ans)} (हर बार × ${f(r)})।`);
  },
};

// ---------------------------------------------------------------- HARD
const MEN = [4000, 5000, 6000, 8000, 10000, 12000, 15000, 16000, 20000, 24000, 25000, 30000];
const genders = {
  id: "genders", levels: ["hard"],
  cands: () => cross(MEN, MEN, R_POP, R_POP).filter(([m, w, a, b]) => m !== w && m / w >= 0.7 && m / w <= 1.4 && a !== b && whole(grow(m, a)) && whole(grow(w, b))),
  build: (t, prm) => {
    const [m, w, a, b] = prm; const [pl, plH] = pick(PLACES, prm);
    const m1 = grow(m, a), w1 = grow(w, b), ans = clean(m1 + w1);
    return Q(t, `A ${pl} has ${n(m)} men and ${n(w)} women. In a year the number of men grows by ${a}% and the number of women by ${b}%. What is the total population after the year?`,
      `एक ${plH} में ${n(m)} पुरुष और ${n(w)} महिलाएँ हैं। एक वर्ष में पुरुषों की संख्या ${a}% और महिलाओं की संख्या ${b}% बढ़ती है। वर्ष के बाद कुल जनसंख्या कितनी होगी?`,
      choices(ans, pop, [(m + w) * (1 + (a + b) / 200), grow(m + w, a), grow(m + w, b)], { step: stepOf(ans) }), 0, () => pop(ans),
      `Men: ${n(m)} × ${f(a)} = ${pop(m1)}. Women: ${n(w)} × ${f(b)} = ${pop(w1)}. Total: ${pop(m1)} + ${pop(w1)} = ${pop(ans)}.`,
      `पुरुष: ${n(m)} × ${f(a)} = ${pop(m1)}। महिलाएँ: ${n(w)} × ${f(b)} = ${pop(w1)}। कुल: ${pop(m1)} + ${pop(w1)} = ${pop(ans)}।`);
  },
};

const back3 = {
  id: "back3", levels: ["hard"],
  cands: () => cross(POPS, [5, 10, 20], [-10, -20, 5, 10], [10, 20, -10, 15]).filter(([p, a, b, c]) => whole(grow(p, a, b, c)) && (b < 0 || c < 0)),
  build: (t, prm) => {
    const [p0, a, b, c] = prm; const [pl, plH] = pick(PLACES, prm);
    const now = grow(p0, a, b, c), m = clean((1 + a / 100) * (1 + b / 100) * (1 + c / 100));
    const ch = (x) => (x >= 0 ? `rose by ${x}%` : `fell by ${-x}%`);
    const chH = (x) => (x >= 0 ? `${x}% बढ़ी` : `${-x}% घटी`);
    return Q(t, `Over three years the population of a ${pl} ${ch(a)}, then ${ch(b)}, then ${ch(c)}. It is now ${n(now)}. What was it three years ago?`,
      `तीन वर्षों में एक ${plH} की जनसंख्या पहले ${chH(a)}, फिर ${chH(b)}, फिर ${chH(c)}। अब यह ${n(now)} है। तीन वर्ष पहले यह कितनी थी?`,
      choices(p0, pop, [now / (1 + (a + b + c) / 100), grow(now, -a, -b, -c), now * (1 - (a + b + c) / 100)], { step: stepOf(p0) }), 0, () => pop(clean(now / m)),
      `Then × ${f(a)} × ${f(b)} × ${f(c)} = ${n(now)}. The multiplier is ${n(m)}, so three years ago it was ${n(now)} ÷ ${n(m)} = ${pop(p0)}.`,
      `तब की जनसंख्या × ${f(a)} × ${f(b)} × ${f(c)} = ${n(now)}। गुणक ${n(m)} है, अतः तीन वर्ष पहले यह ${n(now)} ÷ ${n(m)} = ${pop(p0)} थी।`);
  },
};

const halfYear = {
  id: "halfYear", levels: ["hard"],
  cands: () => cross(POPS, [2, 3, 4, 5, 6], [2, 3]).filter(([p, r, k]) => whole(grow(p, ...Array(k).fill(r)))),
  build: (t, prm) => {
    const [p, r, k] = prm; const [pl, plH] = pick(PLACES, prm);
    const steps = Array.from({ length: k }, (_, i) => grow(p, ...Array(i + 1).fill(r)));
    const ans = steps[k - 1];
    const span = k === 2 ? "1 year" : "1½ years", spanH = k === 2 ? "1 वर्ष" : "डेढ़ वर्ष";
    return Q(t, `The population of a ${pl} is ${n(p)} and grows by ${r}% every six months. What will it be after ${span}?`,
      `एक ${plH} की जनसंख्या ${n(p)} है और हर छह महीने में ${r}% बढ़ती है। ${spanH} बाद यह कितनी होगी?`,
      choices(ans, pop, [p * (1 + k * r / 100), grow(p, ...Array(k / 2 | 0 || 1).fill(2 * r)), grow(p, ...Array(k - 1).fill(r))], { step: stepOf(ans) }), 0, () => pop(ans),
      `${span} is ${k} half-years: ${[n(p), ...steps.map(pop)].join(" → ")} (each × ${f(r)}).`,
      `${spanH} में ${k} छमाहियाँ: ${[n(p), ...steps.map(pop)].join(" → ")} (हर बार × ${f(r)})।`);
  },
};

const incFromAmount = {
  id: "incFromAmount", group: "pop2", levels: ["hard"],
  cands: () => cross(POPS, R_POP).filter(([p, r]) => whole(grow(p, r, r))),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const inc = clean(grow(p, r, r) - p), k = clean((1 + r / 100) ** 2 - 1);
    return Q(t, `The population of a ${pl} grows by ${r}% every year. In 2 years it increases by ${n(inc)}. What was the population at the start?`,
      `एक ${plH} की जनसंख्या हर वर्ष ${r}% बढ़ती है। 2 वर्षों में इसमें ${n(inc)} की वृद्धि होती है। शुरुआत में जनसंख्या कितनी थी?`,
      choices(p, pop, [inc / (2 * r / 100), inc / (r / 100), inc / k + inc], { step: stepOf(p) }), 0, () => pop(clean(inc / k)),
      `In 2 years P becomes ${f(r)} × ${f(r)} = ${n(1 + k)} times, a rise of ${n(k)}P. ${n(k)}P = ${n(inc)}, so P = ${pop(p)}.`,
      `2 वर्षों में P, ${f(r)} × ${f(r)} = ${n(1 + k)} गुना हो जाती है, यानी ${n(k)}P की वृद्धि। ${n(k)}P = ${n(inc)}, अतः P = ${pop(p)}।`);
  },
};

const twoTowns = {
  id: "twoTowns", levels: ["hard"],
  cands: () => cross(POPS, R_POP, POPS, [-10, -5, 2, 5, 10]).filter(([pa, a, pb, b]) => pa !== pb && a !== b && whole(grow(pa, a, a)) && whole(grow(pb, b, b)) && grow(pa, a, a) > grow(pb, b, b) && pa < pb * 2),
  build: (t, prm) => {
    const [pa, a, pb, b] = prm;
    const A = grow(pa, a, a), B = grow(pb, b, b), ans = clean(A - B);
    const chB = b >= 0 ? `grows by ${b}%` : `falls by ${-b}%`, chBH = b >= 0 ? `${b}% बढ़ती है` : `${-b}% घटती है`;
    return Q(t, `Town A has ${n(pa)} people and grows by ${a}% a year. Town B has ${n(pb)} people and its population ${chB} a year. After 2 years, how many more people will town A have than town B?`,
      `कस्बे A की जनसंख्या ${n(pa)} है और हर वर्ष ${a}% बढ़ती है। कस्बे B की जनसंख्या ${n(pb)} है और हर वर्ष ${chBH}। 2 वर्ष बाद कस्बे A में कस्बे B से कितने अधिक लोग होंगे?`,
      choices(ans, pop, [pa * (1 + 2 * a / 100) - pb * (1 + 2 * b / 100), grow(pa, a) - grow(pb, b), Math.abs(pa - pb)], { step: stepOf(ans) }), 0, () => pop(ans),
      `A: ${n(pa)} × ${f(a)} × ${f(a)} = ${pop(A)}. B: ${n(pb)} × ${f(b)} × ${f(b)} = ${pop(B)}. The difference is ${pop(A)} − ${pop(B)} = ${pop(ans)}.`,
      `A: ${n(pa)} × ${f(a)} × ${f(a)} = ${pop(A)}। B: ${n(pb)} × ${f(b)} × ${f(b)} = ${pop(B)}। अंतर = ${pop(A)} − ${pop(B)} = ${pop(ans)}।`);
  },
};

const yearsBelow = {
  id: "yearsBelow", levels: ["hard"],
  cands: () => cross(VALUES, [10, 20, 25], [30, 40, 50, 60]).filter(([v, r, x]) => {
    let k = 0, w = v; while (w >= v * x / 100 && k < 20) { w *= 1 - r / 100; k++; }
    return k >= 2 && k <= 8 && Math.abs(v * (1 - r / 100) ** (k - 1) - v * x / 100) > v * 0.005;
  }),
  build: (t, prm) => {
    const [v, r, x] = prm; const [as, asH] = pick(ASSETS, prm);
    const limit = clean(v * x / 100);
    const vals = [v]; while (vals[vals.length - 1] >= limit) vals.push(clean(vals[vals.length - 1] * (1 - r / 100)));
    const k = vals.length - 1;
    const opt = (y) => `${y} years`, optH = (y) => `${y} वर्ष`;
    const ys = [k, k - 1, k + 1, k + 2].filter((y) => y > 0);
    if (ys.length < 4) ys.push(k + 3);
    const show = (y) => n(Math.round(y));
    return Q(t, `A ${as} is worth ₹${n(v)}, and its value falls by ${r}% every year. After how many years will its value first be less than ₹${n(limit)}?`,
      `एक ${asH} का मूल्य ₹${n(v)} है, और यह हर वर्ष ${r}% घटता है। कितने वर्ष बाद इसका मूल्य पहली बार ₹${n(limit)} से कम होगा?`,
      ys.slice(0, 4).map(opt), 0, () => opt(k),
      `Year by year: ₹${vals.map(show).join(" → ₹")}. The value first drops below ₹${n(limit)} after ${k} years.`,
      `हर वर्ष: ₹${vals.map(show).join(" → ₹")}। मूल्य पहली बार ${k} वर्ष बाद ₹${n(limit)} से कम होता है।`, ys.slice(0, 4).map(optH));
  },
};

const literacy = {
  id: "literacy", levels: ["hard"],
  cands: () => cross(POPS, [40, 50, 60, 64, 70, 75, 80], [2, 4, 5, 8, 10], [10, 12, 15, 20, 25, 30]).filter(([p, x, r, s]) => {
    const lit = p * x / 100, after = clean(lit * (1 + s / 100) / (p * (1 + r / 100)) * 100);
    return s > r && whole(lit) && whole(grow(p, r)) && whole(lit * (1 + s / 100)) && isInt(after * 100) && after < 100;
  }),
  build: (t, prm) => {
    const [p, x, r, s] = prm; const [pl, plH] = pick(PLACES, prm);
    const lit = clean(p * x / 100), p1 = grow(p, r), l1 = grow(lit, s), ans = clean(l1 / p1 * 100);
    return Q(t, `A ${pl} has ${n(p)} people, ${x}% of them literate. Next year the population grows by ${r}% and the number of literate people by ${s}%. What percentage of the population is literate then?`,
      `एक ${plH} में ${n(p)} लोग हैं, जिनमें ${x}% साक्षर हैं। अगले वर्ष जनसंख्या ${r}% और साक्षर लोगों की संख्या ${s}% बढ़ती है। तब जनसंख्या का कितने प्रतिशत साक्षर होगा?`,
      choices(ans, pct, [x + s - r, x * (1 + s / 100), x + s], { step: 2 }), 0, () => pct(ans),
      `Literate now: ${x}% of ${n(p)} = ${n(lit)}. Next year: literate ${n(lit)} × ${f(s)} = ${n(l1)}, population ${n(p)} × ${f(r)} = ${n(p1)}. ${n(l1)} ÷ ${n(p1)} × 100 = ${pct(ans)}.`,
      `अभी साक्षर: ${n(p)} का ${x}% = ${n(lit)}। अगले वर्ष: साक्षर ${n(lit)} × ${f(s)} = ${n(l1)}, जनसंख्या ${n(p)} × ${f(r)} = ${n(p1)}। ${n(l1)} ÷ ${n(p1)} × 100 = ${pct(ans)}।`);
  },
};

const migrationBack = {
  id: "migrationBack", levels: ["hard"],
  cands: () => cross(POPS, R_POP, [300, 500, 800, 1000, 1500, 2000, 2500]).filter(([p, r, m]) => whole(grow(p, r)) && m < p * r / 100),
  build: (t, prm) => {
    const [p0, r, m] = prm; const [pl, plH] = pick(PLACES, prm);
    const q = clean(grow(p0, r) - m), g = clean(q + m);
    return Q(t, `In a year the population of a ${pl} grew naturally by ${r}%, and ${n(m)} people moved away. At the end of the year it was ${n(q)}. What was it at the start of the year?`,
      `एक वर्ष में एक ${plH} की जनसंख्या प्राकृतिक रूप से ${r}% बढ़ी, और ${n(m)} लोग यहाँ से चले गए। वर्ष के अंत में यह ${n(q)} थी। वर्ष की शुरुआत में यह कितनी थी?`,
      choices(p0, pop, [q / (1 + r / 100) + m, (q - m) / (1 + r / 100), q / (1 + r / 100)], { step: stepOf(p0) }), 0, () => pop(clean(g / (1 + r / 100))),
      `Before the ${n(m)} left, the population was ${n(q)} + ${n(m)} = ${n(g)}. That is the start × ${f(r)}, so the start was ${n(g)} ÷ ${f(r)} = ${pop(p0)}.`,
      `${n(m)} लोगों के जाने से पहले जनसंख्या ${n(q)} + ${n(m)} = ${n(g)} थी। यह शुरुआती जनसंख्या × ${f(r)} है, अतः शुरुआत में ${n(g)} ÷ ${f(r)} = ${pop(p0)}।`);
  },
};

const depFromLoss = {
  id: "depFromLoss", group: "dep2", levels: ["hard"],
  cands: () => cross(VALUES, R).filter(([v, r]) => whole(grow(v, -r, -r))),
  build: (t, prm) => {
    const [v, r] = prm; const [as, asH] = pick(ASSETS, prm);
    const loss = clean(v - grow(v, -r, -r)), k = clean(1 - (1 - r / 100) ** 2);
    return Q(t, `A ${as} loses ${r}% of its value every year. In 2 years its value falls by ₹${n(loss)} in all. What did it cost?`,
      `एक ${asH} का मूल्य हर वर्ष ${r}% घटता है। 2 वर्षों में इसका मूल्य कुल ₹${n(loss)} घटता है। इसे कितने में खरीदा गया था?`,
      choices(v, money, [loss / (2 * r / 100), loss / (r / 100), loss / k - loss], { step: stepOf(v) }), 0, () => money(clean(loss / k)),
      `After 2 years the value is ${f(-r)} × ${f(-r)} = ${n(1 - k)} of the cost, a fall of ${n(k)} of it. ${n(k)} × cost = ${n(loss)}, so the cost was ${money(v)}.`,
      `2 वर्ष बाद मूल्य क्रय मूल्य का ${f(-r)} × ${f(-r)} = ${n(1 - k)} रह जाता है, यानी ${n(k)} भाग घटता है। ${n(k)} × क्रय मूल्य = ${n(loss)}, अतः क्रय मूल्य = ${money(v)}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
const gendersBack = {
  id: "gendersBack", levels: ["advanced"],
  cands: () => cross(MEN, MEN, [5, 8, 10, 12, 15, 20], [2, 4, 5, 6, 10]).filter(([m, w, a, b]) => m !== w && m / w >= 0.7 && m / w <= 1.4 && a !== b && whole(grow(m, a)) && whole(grow(w, b))),
  build: (t, prm) => {
    const [m, w, a, b] = prm; const [pl, plH] = pick(PLACES, prm);
    const s = m + w, total = clean(grow(m, a) + grow(w, b));
    const solve = clean((total - s * (1 + b / 100)) / ((a - b) / 100));
    return Q(t, `A ${pl} has ${n(s)} people. In a year the men increase by ${a}% and the women by ${b}%, and the population becomes ${n(total)}. How many men were there at the start?`,
      `एक ${plH} में ${n(s)} लोग हैं। एक वर्ष में पुरुषों की संख्या ${a}% और महिलाओं की संख्या ${b}% बढ़ती है, और जनसंख्या ${n(total)} हो जाती है। शुरुआत में कितने पुरुष थे?`,
      choices(m, pop, [w, s / 2, (total - s) / (a / 100)], { step: stepOf(m) }), 0, () => pop(solve),
      `If everyone grew by ${b}%, the total would be ${n(s)} × ${f(b)} = ${n(grow(s, b))}. The extra ${n(total)} − ${n(grow(s, b))} = ${n(clean(total - grow(s, b)))} is the men's extra ${a - b}%: men = ${n(clean(total - grow(s, b)))} ÷ ${n((a - b) / 100)} = ${pop(m)}.`,
      `यदि सब ${b}% बढ़ते, तो कुल ${n(s)} × ${f(b)} = ${n(grow(s, b))} होता। अतिरिक्त ${n(total)} − ${n(grow(s, b))} = ${n(clean(total - grow(s, b)))} पुरुषों की अतिरिक्त ${a - b}% वृद्धि है: पुरुष = ${n(clean(total - grow(s, b)))} ÷ ${n((a - b) / 100)} = ${pop(m)}।`);
  },
};

const bdm2 = {
  id: "bdm2", levels: ["advanced"],
  cands: () => cross(POPS, [5, 6, 8, 10, 12], [1, 2, 3], [100, 200, 300, 400, 500, 1000]).filter(([p, b, d, m]) => {
    const r = b - d; const y1 = grow(p, r) - m; return r > 0 && whole(grow(p, r)) && whole(grow(y1, r)) && y1 > 0;
  }),
  build: (t, prm) => {
    const [p, b, d, m] = prm; const [pl, plH] = pick(PLACES, prm);
    const r = b - d, g1 = grow(p, r), y1 = clean(g1 - m), g2 = grow(y1, r), ans = clean(g2 - m);
    return Q(t, `A ${pl} has ${n(p)} people. Every year births add ${b}% and deaths remove ${d}% of the population, and then ${n(m)} people move away. What is the population after 2 years?`,
      `एक ${plH} में ${n(p)} लोग हैं। हर वर्ष जन्म से ${b}% की वृद्धि और मृत्यु से ${d}% की कमी होती है, और फिर ${n(m)} लोग चले जाते हैं। 2 वर्ष बाद जनसंख्या कितनी होगी?`,
      choices(ans, pop, [grow(p, r, r) - m, grow(p, r, r) - 2 * m, grow(p, b, b) - 2 * m], { step: stepOf(ans) }), 0, () => pop(ans),
      `Net growth ${r}% a year. Year 1: ${n(p)} × ${f(r)} = ${n(g1)}, minus ${n(m)} = ${n(y1)}. Year 2: ${n(y1)} × ${f(r)} = ${n(g2)}, minus ${n(m)} = ${pop(ans)}.`,
      `शुद्ध वृद्धि ${r}% प्रति वर्ष। वर्ष 1: ${n(p)} × ${f(r)} = ${n(g1)}, ${n(m)} घटाकर ${n(y1)}। वर्ष 2: ${n(y1)} × ${f(r)} = ${n(g2)}, ${n(m)} घटाकर ${pop(ans)}।`);
  },
};

const depRate3 = {
  id: "depRate3", levels: ["advanced"],
  cands: () => cross(VALUES, [10, 20, 30, 40, 50]).filter(([v, r]) => whole(grow(v, -r, -r, -r))),
  build: (t, prm) => {
    const [v, r] = prm; const [as, asH] = pick(ASSETS, prm);
    const w = grow(v, -r, -r, -r), m = clean(w / v);
    return Q(t, `At a steady yearly rate of depreciation, the value of a ${as} fell from ₹${n(v)} to ₹${n(w)} in 3 years. What was the yearly rate?`,
      `मूल्यह्रास की एक स्थिर वार्षिक दर से एक ${asH} का मूल्य 3 वर्षों में ₹${n(v)} से घटकर ₹${n(w)} रह गया। वार्षिक दर कितनी थी?`,
      choices(r, pct, [(1 - m) * 100 / 3, (1 - m) * 100, r + 5], { step: 5 }), 0, () => pct(clean((1 - Math.cbrt(m)) * 100)),
      `(1 − r)³ = ${n(w)} ÷ ${n(v)} = ${n(m)}. Since ${f(-r)}³ = ${n(m)}, 1 − r = ${f(-r)} and r = ${pct(r)}.`,
      `(1 − r)³ = ${n(w)} ÷ ${n(v)} = ${n(m)}। चूँकि ${f(-r)}³ = ${n(m)}, 1 − r = ${f(-r)} और r = ${pct(r)}।`);
  },
};

const thirdYearInc = {
  id: "thirdYearInc", levels: ["advanced"],
  cands: () => cross(POPS, [4, 5, 8, 10, 15, 20]).filter(([p, r]) => whole(grow(p, r, r)) && whole(grow(p, r, r) * r / 100)),
  build: (t, prm) => {
    const [p, r] = prm; const [pl, plH] = pick(PLACES, prm);
    const p2 = grow(p, r, r), inc = clean(p2 * r / 100), k = clean((1 + r / 100) ** 2 * r / 100);
    return Q(t, `The population of a ${pl} grows by ${r}% every year. In the third year it grows by ${n(inc)}. What is the population now, at the start of the first year?`,
      `एक ${plH} की जनसंख्या हर वर्ष ${r}% बढ़ती है। तीसरे वर्ष में इसमें ${n(inc)} की वृद्धि होती है। अभी, पहले वर्ष की शुरुआत में, जनसंख्या कितनी है?`,
      choices(p, pop, [inc / (r / 100), inc / (3 * r / 100), inc / (r / 100) / (1 + r / 100)], { step: stepOf(p) }), 0, () => pop(clean(inc / k)),
      `At the start of the third year the population is P × ${f(r)} × ${f(r)} = ${n((1 + r / 100) ** 2)}P, and the third year adds ${r}% of that: ${n(k)}P = ${n(inc)}. So P = ${pop(p)}.`,
      `तीसरे वर्ष की शुरुआत में जनसंख्या P × ${f(r)} × ${f(r)} = ${n((1 + r / 100) ** 2)}P है, और तीसरा वर्ष इसका ${r}% जोड़ता है: ${n(k)}P = ${n(inc)}। अतः P = ${pop(p)}।`);
  },
};

const twoTownsEqual = {
  id: "twoTownsEqual", levels: ["advanced"],
  cands: () => cross(POPS, [5, 8, 10, 15, 20], POPS, [-10, -8, -5]).filter(([pa, a, pb, b]) => {
    if (pa >= pb) return false;
    let k = 0, A = pa, B = pb; while (A <= B && k < 12) { A *= 1 + a / 100; B *= 1 + b / 100; k++; }
    return k >= 2 && k <= 7;
  }),
  build: (t, prm) => {
    const [pa, a, pb, b] = prm;
    const rows = [[pa, pb]]; while (rows[rows.length - 1][0] <= rows[rows.length - 1][1]) { const [A, B] = rows[rows.length - 1]; rows.push([clean(A * (1 + a / 100)), clean(B * (1 + b / 100))]); }
    const k = rows.length - 1;
    const opt = (y) => `${y} years`, optH = (y) => `${y} वर्ष`;
    const ys = [k, k + 1, k - 1, k + 2].filter((y) => y > 0); if (ys.length < 4) ys.push(k + 3);
    const show = (x) => n(Math.round(x));
    return Q(t, `Town A has ${n(pa)} people and grows by ${a}% a year. Town B has ${n(pb)} people and shrinks by ${-b}% a year. After how many years will town A first have more people than town B?`,
      `कस्बे A की जनसंख्या ${n(pa)} है और हर वर्ष ${a}% बढ़ती है। कस्बे B की जनसंख्या ${n(pb)} है और हर वर्ष ${-b}% घटती है। कितने वर्ष बाद कस्बे A में पहली बार कस्बे B से अधिक लोग होंगे?`,
      ys.slice(0, 4).map(opt), 0, () => opt(k),
      `Year by year (A, B): ${rows.map(([A, B]) => `${show(A)}, ${show(B)}`).join(" → ")}. A first passes B after ${k} years.`,
      `हर वर्ष (A, B): ${rows.map(([A, B]) => `${show(A)}, ${show(B)}`).join(" → ")}। A पहली बार ${k} वर्ष बाद B से आगे निकलता है।`, ys.slice(0, 4).map(optH));
  },
};

const migBack2 = {
  id: "migBack2", levels: ["advanced"],
  cands: () => cross(POPS, [5, 10, 20], [4, 5, 10, 20], [500, 1000, 1500, 2000]).filter(([p, a, b, m]) => {
    const y1 = grow(p, a) - m; return whole(grow(p, a)) && y1 > 0 && whole(grow(y1, b));
  }),
  build: (t, prm) => {
    const [p0, a, b, m] = prm; const [pl, plH] = pick(PLACES, prm);
    const y1 = clean(grow(p0, a) - m), now = grow(y1, b);
    return Q(t, `The population of a ${pl} grew by ${a}% in the first year, after which ${n(m)} people moved away. In the second year it grew by ${b}%, reaching ${n(now)}. What was it at the start?`,
      `एक ${plH} की जनसंख्या पहले वर्ष ${a}% बढ़ी, जिसके बाद ${n(m)} लोग चले गए। दूसरे वर्ष यह ${b}% बढ़कर ${n(now)} हो गई। शुरुआत में यह कितनी थी?`,
      choices(p0, pop, [now / ((1 + a / 100) * (1 + b / 100)) + m, (now / (1 + b / 100) - m) / (1 + a / 100), now / ((1 + a / 100) * (1 + b / 100))], { step: stepOf(p0) }), 0, () => pop(clean((now / (1 + b / 100) + m) / (1 + a / 100))),
      `Going back: before the second year's growth it was ${n(now)} ÷ ${f(b)} = ${n(y1)}; before the ${n(m)} left, ${n(y1)} + ${n(m)} = ${n(y1 + m)}; before the first year's growth, ${n(y1 + m)} ÷ ${f(a)} = ${pop(p0)}.`,
      `उल्टा चलें: दूसरे वर्ष की वृद्धि से पहले ${n(now)} ÷ ${f(b)} = ${n(y1)}; ${n(m)} लोगों के जाने से पहले ${n(y1)} + ${n(m)} = ${n(y1 + m)}; पहले वर्ष की वृद्धि से पहले ${n(y1 + m)} ÷ ${f(a)} = ${pop(p0)}।`);
  },
};

const moreThan = {
  id: "moreThan", levels: ["advanced"],
  cands: () => cross([10, 20, 25, 40, 50], [4, 5, 8, 10, 15, 20], [2, 4, 5, 8, 10, 20]).filter(([x, a, b]) => {
    const v = ((1 + x / 100) * (1 + a / 100) / (1 + b / 100) - 1) * 100; return a !== b && v > 0 && isInt(clean(v) * 100);
  }),
  build: (t, prm) => {
    const [x, a, b] = prm;
    const v = clean(((1 + x / 100) * (1 + a / 100) / (1 + b / 100) - 1) * 100);
    const A = clean(100 * (1 + x / 100) * (1 + a / 100)), B = clean(100 * (1 + b / 100));
    return Q(t, `The population of town A is ${x}% more than that of town B. In a year, A grows by ${a}% and B by ${b}%. By what percentage is A's population now more than B's?`,
      `कस्बे A की जनसंख्या कस्बे B से ${x}% अधिक है। एक वर्ष में A की जनसंख्या ${a}% और B की ${b}% बढ़ती है। अब A की जनसंख्या B से कितने प्रतिशत अधिक है?`,
      choices(v, pct, [x + a - b, x + a, x * (1 + a / 100)], { step: 2 }), 0, () => pct(v),
      `Take B = 100, so A = ${n(100 + x)}. After the year, A = ${n(100 + x)} × ${f(a)} = ${n(A)} and B = 100 × ${f(b)} = ${n(B)}. A is more by ${n(clean(A - B))} ÷ ${n(B)} × 100 = ${pct(v)}.`,
      `B = 100 लें, तो A = ${n(100 + x)}। एक वर्ष बाद A = ${n(100 + x)} × ${f(a)} = ${n(A)} और B = 100 × ${f(b)} = ${n(B)}। A अधिक है: ${n(clean(A - B))} ÷ ${n(B)} × 100 = ${pct(v)}।`);
  },
};

const depThenSell = {
  id: "depThenSell", levels: ["advanced"],
  cands: () => cross(VALUES, [10, 20, 25], [5, 10, 15, 20]).filter(([v, r, g]) => whole(grow(v, -r, -r)) && whole(grow(grow(v, -r, -r), g))),
  build: (t, prm) => {
    const [v, r, g] = prm; const [as, asH] = pick(ASSETS, prm);
    const w = grow(v, -r, -r), sp = grow(w, g), loss = clean(v - sp);
    const lossPct = clean(loss / v * 100);
    return Q(t, `A ${as} bought for ₹${n(v)} loses ${r}% of its value every year. After 2 years it is sold for ${g}% more than its value then. What is the loss on the price it was bought for?`,
      `₹${n(v)} में खरीदी गई एक ${asH} का मूल्य हर वर्ष ${r}% घटता है। 2 वर्ष बाद इसे उस समय के मूल्य से ${g}% अधिक में बेचा जाता है। खरीद मूल्य पर कितनी हानि हुई?`,
      choices(loss, money, [v - grow(v, -r, -r), v * (2 * r - g) / 100, v - grow(v, -r)], { step: stepOf(loss), positive: true }), 0, () => money(loss),
      `Value after 2 years: ${n(v)} × ${f(-r)} × ${f(-r)} = ₹${n(w)}. Sold for ${n(w)} × ${f(g)} = ₹${n(sp)}. Loss = ${n(v)} − ${n(sp)} = ${money(loss)} (${pct(lossPct)} of the cost).`,
      `2 वर्ष बाद मूल्य: ${n(v)} × ${f(-r)} × ${f(-r)} = ₹${n(w)}। बिक्री मूल्य: ${n(w)} × ${f(g)} = ₹${n(sp)}। हानि = ${n(v)} − ${n(sp)} = ${money(loss)} (क्रय मूल्य का ${pct(lossPct)})।`);
  },
};

const KINDS = [
  popAfter1, popAfter2, popAgo1, popIncrease2, depAfter1, depAfter2, depAgo1, depLoss2, birthDeath1, rate1, depRate1,
  popAfter3, twoRates, upDown, popAgo2, depAgo2, rate2, migration1, dep3, diffYears, birthDeath2,
  genders, back3, halfYear, incFromAmount, twoTowns, yearsBelow, literacy, migrationBack, depFromLoss,
  gendersBack, bdm2, depRate3, thirdYearInc, twoTownsEqual, migBack2, moreThan, depThenSell,
];
// Hard and advanced also take some medium kinds with harder numbers.
for (const k of [twoRates, upDown, dep3]) k.levels.push("hard");
for (const k of [back3, genders, literacy]) k.levels.push("advanced");

// One set of used numbers for the whole Percentage chapter (pc-ie.js and
// pc-mixed.js build after this, from the same set).
const USED = new Set();
const topic = () => fillTopic({ kinds: KINDS, prefix: "Percentage · Population Growth and Depreciation", used: USED });
// tests(level, from, to) -> the questions of those tests, for build-batch.
const tests = (level, from, to) => topic()[level].slice(from - 1, to).flat();
module.exports = { tests, KINDS, USED, topic };
