// Percentage · Percentage in Income and Expenditure: every kind of question,
// level by level, with the numbers each can be asked with. gen.js fills the
// tests; every answer is worked out again in `v`, and the wrong options are
// the slips students make (taking the second share of the whole income
// instead of the remainder, subtracting rates instead of working with
// amounts, ...). Savings = income − expenditure throughout.
const { Q, P } = require("./pct-builders");
const { choices } = require("./pct-adv-builders");
const { fillTopic, numbersOf } = require("./gen");
const pop = require("./pc-pop");
const { n, rs, pct, clean, isInt } = P;
const f = (x) => n(1 + x / 100);
const money = (x) => rs(Math.round(x));
const stepOf = (x) => 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(x) || 1)) - 1);
const hashOf = (p) => [...numbersOf(p)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
const whole = (x) => isInt(x);
const cross = (...lists) => lists.reduce((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
const clean2 = (x) => isInt(clean(x) * 100);
// A percentage a student can write: 2 decimals at most, or ⅓-style - not 7 11/27%.
const nicePct = (x) => !/\d \d/.test(pct(clean(x)));

// People: English name, Hindi name, feminine?
const PEOPLE = [["Ravi", "रवि", false], ["Sunita", "सुनीता", true], ["Amit", "अमित", false], ["Neha", "नेहा", true], ["Rahul", "राहुल", false], ["Pooja", "पूजा", true], ["Mohan", "मोहन", false], ["Kavita", "कविता", true], ["Arjun", "अर्जुन", false], ["Meena", "मीना", true], ["Suresh", "सुरेश", false], ["Anjali", "अंजलि", true]];
const who = (prm) => {
  const [name, nameH, fem] = PEOPLE[hashOf(prm) % PEOPLE.length];
  return { name, nameH, he: fem ? "she" : "he", He: fem ? "She" : "He", his: fem ? "her" : "his", His: fem ? "Her" : "His", him: fem ? "her" : "him", v: (m, fm) => (fem ? fm : m) };
};
const INCOMES = [12000, 15000, 16000, 18000, 20000, 24000, 25000, 28000, 30000, 32000, 35000, 36000, 40000, 42000, 45000, 48000, 50000, 54000, 56000, 60000, 64000, 70000, 72000, 75000, 80000, 84000, 90000, 96000, 100000, 120000];
const PCTS = [40, 45, 50, 55, 60, 62, 64, 65, 68, 70, 72, 75, 76, 78, 80, 82, 84, 85, 88, 90];

// ---------------------------------------------------------------- EASY
const savingsAmount = {
  id: "savingsAmount", group: "ip", levels: ["easy"],
  cands: () => cross(INCOMES, PCTS).filter(([i, p]) => whole(i * p / 100)),
  build: (t, prm) => {
    const [i, p] = prm; const w = who(prm);
    const s = clean(i * (100 - p) / 100);
    return Q(t, `${w.name} earns ₹${n(i)} a month and spends ${p}% of it. How much does ${w.he} save every month?`,
      `${w.nameH} हर महीने ₹${n(i)} ${w.v("कमाता", "कमाती")} है और अपनी आय का ${p}% खर्च ${w.v("करता", "करती")} है। वह हर महीने कितनी बचत ${w.v("करता", "करती")} है?`,
      choices(s, money, [i * p / 100, i * (100 - p) / 1000, s + stepOf(s) * 2], { step: stepOf(s) }), 0, () => money(s),
      `${w.He} saves ${100 - p}% of ${w.his} income: ${n(i)} × ${100 - p}/100 = ${money(s)}.`,
      `बचत = आय का ${100 - p}%: ${n(i)} × ${100 - p}/100 = ${money(s)}।`);
  },
};

const spendAmount = {
  id: "spendAmount", group: "ip", levels: ["easy"],
  cands: () => cross(INCOMES, [10, 12, 15, 16, 18, 20, 22, 24, 25, 28, 30, 32, 35, 36, 40]).filter(([i, s]) => whole(i * s / 100)),
  build: (t, prm) => {
    const [i, s] = prm; const w = who(prm);
    const e = clean(i * (100 - s) / 100);
    return Q(t, `${w.name}'s monthly income is ₹${n(i)}. ${w.He} saves ${s}% of it. How much does ${w.he} spend in a month?`,
      `${w.nameH} की मासिक आय ₹${n(i)} है। ${w.v("वह", "वह")} इसका ${s}% बचाता`.replace("बचाता", w.v("बचाता", "बचाती")) + ` है। ${w.v("वह", "वह")} एक महीने में कितना खर्च ${w.v("करता", "करती")} है?`,
      choices(e, money, [i * s / 100, i - s * 100, e - stepOf(e) * 2], { step: stepOf(e) }), 0, () => money(e),
      `${w.He} spends the other ${100 - s}%: ${n(i)} × ${100 - s}/100 = ${money(e)}.`,
      `खर्च = आय का शेष ${100 - s}%: ${n(i)} × ${100 - s}/100 = ${money(e)}।`);
  },
};

const incomeFromSaving = {
  id: "incomeFromSaving", group: "ip", levels: ["easy"],
  cands: () => cross(INCOMES, [10, 12, 15, 16, 20, 24, 25, 30, 35, 40]).filter(([i, s]) => whole(i * s / 100)),
  build: (t, prm) => {
    const [i, s] = prm; const w = who(prm);
    const sv = clean(i * s / 100);
    return Q(t, `${w.name} saves ${s}% of ${w.his} monthly income. If ${w.his} savings are ₹${n(sv)} a month, what is ${w.his} monthly income?`,
      `${w.nameH} अपनी मासिक आय का ${s}% ${w.v("बचाता", "बचाती")} है। यदि उसकी मासिक बचत ₹${n(sv)} है, तो उसकी मासिक आय कितनी है?`,
      choices(i, money, [sv * (100 - s) / s, sv / (100 - s) * 100, sv * (100 + s) / s], { step: stepOf(i) }), 0, () => money(clean(sv * 100 / s)),
      `${s}% of the income is ${n(sv)}, so the income is ${n(sv)} × 100/${s} = ${money(i)}.`,
      `आय का ${s}% = ${n(sv)}, अतः आय = ${n(sv)} × 100/${s} = ${money(i)}।`);
  },
};

const incomeFromSpend = {
  id: "incomeFromSpend", group: "ip", levels: ["easy"],
  cands: () => cross(INCOMES, PCTS).filter(([i, p]) => whole(i * p / 100)),
  build: (t, prm) => {
    const [i, p] = prm; const w = who(prm);
    const e = clean(i * p / 100);
    return Q(t, `${w.name} spends ${p}% of ${w.his} income, which comes to ₹${n(e)} a month. What is ${w.his} monthly income?`,
      `${w.nameH} अपनी आय का ${p}% खर्च ${w.v("करता", "करती")} है, जो हर महीने ₹${n(e)} होता है। उसकी मासिक आय कितनी है?`,
      choices(i, money, [e * (100 + p) / 100, e / (100 - p) * 100, e + e * (100 - p) / 100 / 2], { step: stepOf(i) }), 0, () => money(clean(e * 100 / p)),
      `${p}% of the income is ${n(e)}, so the income is ${n(e)} × 100/${p} = ${money(i)}.`,
      `आय का ${p}% = ${n(e)}, अतः आय = ${n(e)} × 100/${p} = ${money(i)}।`);
  },
};

const savingPercent = {
  id: "savingPercent", group: "ip", levels: ["easy"],
  cands: () => cross(INCOMES, PCTS).filter(([i, p]) => whole(i * p / 100)),
  build: (t, prm) => {
    const [i, p] = prm; const w = who(prm);
    const e = clean(i * p / 100), s = clean(i - e), sp = 100 - p;
    return Q(t, `${w.name} earns ₹${n(i)} a month and spends ₹${n(e)}. What percentage of ${w.his} income does ${w.he} save?`,
      `${w.nameH} हर महीने ₹${n(i)} ${w.v("कमाता", "कमाती")} है और ₹${n(e)} खर्च ${w.v("करता", "करती")} है। ${w.v("वह", "वह")} अपनी आय का कितना प्रतिशत ${w.v("बचाता", "बचाती")} है?`,
      choices(sp, pct, [p, s / e * 100, sp + 5], { step: 2 }), 0, () => pct(clean(s / i * 100)),
      `Savings = ${n(i)} − ${n(e)} = ₹${n(s)}. As a percentage of income: ${n(s)} ÷ ${n(i)} × 100 = ${pct(sp)}.`,
      `बचत = ${n(i)} − ${n(e)} = ₹${n(s)}। आय पर प्रतिशत: ${n(s)} ÷ ${n(i)} × 100 = ${pct(sp)}।`);
  },
};

const itemsSpend = {
  id: "itemsSpend", levels: ["easy"],
  cands: () => cross(INCOMES, [15, 20, 25, 30], [10, 15, 20, 25], [5, 8, 10, 12, 15]).filter(([i, a, b, c]) => a !== b && a + b + c < 90 && whole(i * (a + b + c) / 100)),
  build: (t, prm) => {
    const [i, a, b, c] = prm; const w = who(prm);
    const spent = a + b + c, s = clean(i * (100 - spent) / 100);
    return Q(t, `${w.name} earns ₹${n(i)} a month. ${w.He} spends ${a}% on rent, ${b}% on food and ${c}% on travel, and saves the rest. How much does ${w.he} save?`,
      `${w.nameH} हर महीने ₹${n(i)} ${w.v("कमाता", "कमाती")} है। ${w.v("वह", "वह")} ${a}% किराए पर, ${b}% भोजन पर और ${c}% यात्रा पर खर्च ${w.v("करता", "करती")} है, और बाकी ${w.v("बचाता", "बचाती")} है। ${w.v("वह", "वह")} कितना ${w.v("बचाता", "बचाती")} है?`,
      choices(s, money, [i * spent / 100, i * (100 - a - b) / 100, s - i * c / 100], { step: stepOf(s) }), 0, () => money(s),
      `Spent: ${a}% + ${b}% + ${c}% = ${spent}%. Saved: ${100 - spent}% of ${n(i)} = ${money(s)}.`,
      `खर्च: ${a}% + ${b}% + ${c}% = ${spent}%। बचत: ${n(i)} का ${100 - spent}% = ${money(s)}।`);
  },
};

const yearSaving = {
  id: "yearSaving", group: "ip", levels: ["easy"],
  cands: () => cross(INCOMES, PCTS).filter(([i, p]) => whole(i * p / 100) && i <= 60000),
  build: (t, prm) => {
    const [i, p] = prm; const w = who(prm);
    const m = clean(i * (100 - p) / 100), y = clean(m * 12);
    return Q(t, `${w.name}'s monthly salary is ₹${n(i)}, and ${w.he} spends ${p}% of it every month. How much does ${w.he} save in a year?`,
      `${w.nameH} का मासिक वेतन ₹${n(i)} है, और ${w.v("वह", "वह")} हर महीने इसका ${p}% खर्च ${w.v("करता", "करती")} है। ${w.v("वह", "वह")} एक वर्ष में कितनी बचत ${w.v("करता", "करती")} है?`,
      choices(y, money, [m, i * p / 100 * 12, y - m], { step: stepOf(y) }), 0, () => money(y),
      `Monthly savings: ${100 - p}% of ${n(i)} = ₹${n(m)}. In 12 months: ${n(m)} × 12 = ${money(y)}.`,
      `मासिक बचत: ${n(i)} का ${100 - p}% = ₹${n(m)}। 12 महीनों में: ${n(m)} × 12 = ${money(y)}।`);
  },
};

const familyIncome = {
  id: "familyIncome", levels: ["easy"],
  cands: () => cross(INCOMES, INCOMES, [60, 65, 70, 75, 80, 85]).filter(([a, b, p]) => a < b && whole((a + b) * p / 100) && a + b <= 150000),
  build: (t, prm) => {
    const [a, b, p] = prm;
    const tot = a + b, s = clean(tot * (100 - p) / 100);
    return Q(t, `A husband earns ₹${n(b)} and his wife ₹${n(a)} a month. The family spends ${p}% of their total income. How much does it save every month?`,
      `एक पति हर महीने ₹${n(b)} और उसकी पत्नी ₹${n(a)} कमाते हैं। परिवार अपनी कुल आय का ${p}% खर्च करता है। परिवार हर महीने कितनी बचत करता है?`,
      choices(s, money, [tot * p / 100, b * (100 - p) / 100, a * (100 - p) / 100 + b * p / 100], { step: stepOf(s) }), 0, () => money(s),
      `Total income: ${n(b)} + ${n(a)} = ₹${n(tot)}. Savings: ${100 - p}% of ${n(tot)} = ${money(s)}.`,
      `कुल आय: ${n(b)} + ${n(a)} = ₹${n(tot)}। बचत: ${n(tot)} का ${100 - p}% = ${money(s)}।`);
  },
};

const raise1 = {
  id: "raise1", levels: ["easy"],
  cands: () => cross(INCOMES, [5, 8, 10, 12, 15, 20, 25], PCTS).filter(([i, r, p]) => whole(i * (1 + r / 100)) && whole(i * (1 + r / 100) * p / 100)),
  build: (t, prm) => {
    const [i, r, p] = prm; const w = who(prm);
    const ni = clean(i * (1 + r / 100)), s = clean(ni * (100 - p) / 100);
    return Q(t, `${w.name}'s salary of ₹${n(i)} is raised by ${r}%. ${w.He} spends ${p}% of the new salary. How much does ${w.he} save now?`,
      `${w.nameH} का ₹${n(i)} का वेतन ${r}% बढ़ाया जाता है। ${w.v("वह", "वह")} नए वेतन का ${p}% खर्च ${w.v("करता", "करती")} है। अब ${w.v("वह", "वह")} कितना ${w.v("बचाता", "बचाती")} है?`,
      choices(s, money, [i * (100 - p) / 100, ni * p / 100, i * (100 - p) / 100 + i * r / 100], { step: stepOf(s) }), 0, () => money(s),
      `New salary: ${n(i)} × ${f(r)} = ₹${n(ni)}. Savings: ${100 - p}% of ${n(ni)} = ${money(s)}.`,
      `नया वेतन: ${n(i)} × ${f(r)} = ₹${n(ni)}। बचत: ${n(ni)} का ${100 - p}% = ${money(s)}।`);
  },
};

const expensePct = {
  id: "expensePct", group: "ip", levels: ["easy"],
  cands: () => cross(INCOMES, PCTS).filter(([i, p]) => whole(i * p / 100)),
  build: (t, prm) => {
    const [i, p] = prm; const w = who(prm);
    const s = clean(i * (100 - p) / 100);
    return Q(t, `Out of a monthly income of ₹${n(i)}, ${w.name} saves ₹${n(s)}. What percentage of ${w.his} income does ${w.he} spend?`,
      `₹${n(i)} की मासिक आय में से ${w.nameH} ₹${n(s)} ${w.v("बचाता", "बचाती")} है। ${w.v("वह", "वह")} अपनी आय का कितना प्रतिशत खर्च ${w.v("करता", "करती")} है?`,
      choices(p, pct, [100 - p, s / (i - s) * 100, p - 5], { step: 2 }), 0, () => pct(clean((i - s) / i * 100)),
      `Spending = ${n(i)} − ${n(s)} = ₹${n(i - s)}, which is ${n(i - s)} ÷ ${n(i)} × 100 = ${pct(p)} of the income.`,
      `खर्च = ${n(i)} − ${n(s)} = ₹${n(i - s)}, जो आय का ${n(i - s)} ÷ ${n(i)} × 100 = ${pct(p)} है।`);
  },
};

// ---------------------------------------------------------------- MEDIUM
const remainder = {
  id: "remainder", levels: ["medium"],
  cands: () => cross(INCOMES, [20, 25, 30, 40, 50], [10, 20, 25, 30, 40, 50]).filter(([i, a, b]) => whole(i * (100 - a) / 100) && whole(i * (100 - a) / 100 * (100 - b) / 100)),
  build: (t, prm) => {
    const [i, a, b] = prm; const w = who(prm);
    const r1 = clean(i * (100 - a) / 100), s = clean(r1 * (100 - b) / 100);
    return Q(t, `${w.name} earns ₹${n(i)} a month. ${w.He} spends ${a}% of it on food and ${b}% of what is left on rent, and saves the rest. How much does ${w.he} save?`,
      `${w.nameH} हर महीने ₹${n(i)} ${w.v("कमाता", "कमाती")} है। ${w.v("वह", "वह")} इसका ${a}% भोजन पर और बचे हुए का ${b}% किराए पर खर्च ${w.v("करता", "करती")} है, और बाकी ${w.v("बचाता", "बचाती")} है। ${w.v("वह", "वह")} कितना ${w.v("बचाता", "बचाती")} है?`,
      choices(s, money, [i * (100 - a - b) / 100, r1, i * b / 100], { step: stepOf(s) }), 0, () => money(s),
      `After food: ${n(i)} × ${100 - a}/100 = ₹${n(r1)}. Rent takes ${b}% of that, leaving ${n(r1)} × ${100 - b}/100 = ${money(s)}.`,
      `भोजन के बाद: ${n(i)} × ${100 - a}/100 = ₹${n(r1)}। किराया इसका ${b}% लेता है, बचता है ${n(r1)} × ${100 - b}/100 = ${money(s)}।`);
  },
};

const incomeFromRemainder = {
  id: "incomeFromRemainder", levels: ["medium"],
  cands: () => cross(INCOMES, [20, 25, 30, 40, 50], [10, 20, 25, 30, 40, 50]).filter(([i, a, b]) => whole(i * (100 - a) / 100) && whole(i * (100 - a) / 100 * (100 - b) / 100)),
  build: (t, prm) => {
    const [i, a, b] = prm; const w = who(prm);
    const s = clean(i * (100 - a) / 100 * (100 - b) / 100), k = clean((100 - a) / 100 * (100 - b) / 100);
    return Q(t, `${w.name} spends ${a}% of ${w.his} income on household needs and ${b}% of the remainder on ${w.his} children's education. ${w.He} saves ₹${n(s)}. What is ${w.his} income?`,
      `${w.nameH} अपनी आय का ${a}% घरेलू ज़रूरतों पर और शेष का ${b}% बच्चों की शिक्षा पर खर्च ${w.v("करता", "करती")} है। ${w.v("वह", "वह")} ₹${n(s)} ${w.v("बचाता", "बचाती")} है। उसकी आय कितनी है?`,
      choices(i, money, [s * 100 / (100 - a - b), s / ((100 - a) / 100), s / k * (1 + b / 200)], { step: stepOf(i) }), 0, () => money(clean(s / k)),
      `Savings are ${100 - b}% of ${100 - a}% of the income: ${n((100 - a) / 100)} × ${n((100 - b) / 100)} = ${n(k)} of it. Income = ${n(s)} ÷ ${n(k)} = ${money(i)}.`,
      `बचत आय के ${100 - a}% का ${100 - b}% है: ${n((100 - a) / 100)} × ${n((100 - b) / 100)} = ${n(k)}। आय = ${n(s)} ÷ ${n(k)} = ${money(i)}।`);
  },
};

const bothRise = {
  id: "bothRise", levels: ["medium"],
  cands: () => cross(INCOMES, [60, 70, 75, 80], [10, 15, 20, 25], [5, 10, 15, 20]).filter(([i, p, r, q]) => r !== q && whole(i * p / 100) && whole(i * (1 + r / 100)) && whole(i * p / 100 * (1 + q / 100))),
  build: (t, prm) => {
    const [i, p, r, q] = prm; const w = who(prm);
    const e = clean(i * p / 100), ni = clean(i * (1 + r / 100)), ne = clean(e * (1 + q / 100)), ns = clean(ni - ne);
    return Q(t, `${w.name} earns ₹${n(i)} a month and spends ${p}% of it. ${w.His} income rises by ${r}% and ${w.his} spending by ${q}%. What are ${w.his} monthly savings now?`,
      `${w.nameH} हर महीने ₹${n(i)} ${w.v("कमाता", "कमाती")} है और इसका ${p}% खर्च ${w.v("करता", "करती")} है। उसकी आय ${r}% और खर्च ${q}% बढ़ जाता है। अब उसकी मासिक बचत कितनी है?`,
      choices(ns, money, [(i - e) * (1 + (r - q) / 100), (i - e) * (1 + r / 100), ni - e], { step: stepOf(ns) }), 0, () => money(ns),
      `Before: spending ₹${n(e)}. Now: income ${n(i)} × ${f(r)} = ₹${n(ni)}, spending ${n(e)} × ${f(q)} = ₹${n(ne)}. Savings = ${n(ni)} − ${n(ne)} = ${money(ns)}.`,
      `पहले: खर्च ₹${n(e)}। अब: आय ${n(i)} × ${f(r)} = ₹${n(ni)}, खर्च ${n(e)} × ${f(q)} = ₹${n(ne)}। बचत = ${n(ni)} − ${n(ne)} = ${money(ns)}।`);
  },
};

const savingsChange = {
  id: "savingsChange", levels: ["medium"],
  cands: () => cross([60, 70, 75, 80], [10, 15, 20, 25, 30], [5, 10, 15, 20, 25]).filter(([p, r, q]) => r !== q && clean2(((100 + r) - p * (1 + q / 100) - (100 - p)) / (100 - p) * 100) && ((100 + r) - p * (1 + q / 100)) !== 100 - p),
  build: (t, prm) => {
    const [p, r, q] = prm;
    const s0 = 100 - p, s1 = clean(100 + r - p * (1 + q / 100)), ch = clean((s1 - s0) / s0 * 100);
    return Q(t, `A man spends ${p}% of his income. His income rises by ${r}% and his expenditure by ${q}%. By what percentage do his savings ${ch >= 0 ? "increase" : "decrease"}?`,
      `एक व्यक्ति अपनी आय का ${p}% खर्च करता है। उसकी आय ${r}% और खर्च ${q}% बढ़ जाता है। उसकी बचत कितने प्रतिशत ${ch >= 0 ? "बढ़ती" : "घटती"} है?`,
      choices(Math.abs(ch), pct, [Math.abs(r - q), r, Math.abs(r - q) * p / 100], { step: 5 }), 0, () => pct(Math.abs(ch)),
      `Take the income as 100: spending ${p}, savings ${s0}. Now income ${100 + r}, spending ${p} × ${f(q)} = ${n(p * (1 + q / 100))}, savings ${n(s1)}. Change: ${n(Math.abs(s1 - s0))} ÷ ${s0} × 100 = ${pct(Math.abs(ch))}.`,
      `आय 100 लें: खर्च ${p}, बचत ${s0}। अब आय ${100 + r}, खर्च ${p} × ${f(q)} = ${n(p * (1 + q / 100))}, बचत ${n(s1)}। परिवर्तन: ${n(Math.abs(s1 - s0))} ÷ ${s0} × 100 = ${pct(Math.abs(ch))}।`);
  },
};

const keepSaving = {
  id: "keepSaving", levels: ["medium"],
  cands: () => cross([50, 55, 60, 64, 65, 70, 72, 75, 76, 80, 84, 85, 88, 90], [4, 5, 6, 8, 10, 12, 15, 16, 18, 20, 24, 25, 30]).filter(([p, r]) => clean2(r / p * 100)),
  build: (t, prm) => {
    const [p, r] = prm;
    const up = clean(r / p * 100);
    return Q(t, `A woman spends ${p}% of her income. Her income rises by ${r}%, and her savings stay exactly the same. By what percentage has her expenditure increased?`,
      `एक महिला अपनी आय का ${p}% खर्च करती है। उसकी आय ${r}% बढ़ जाती है, और उसकी बचत ठीक उतनी ही रहती है। उसका खर्च कितने प्रतिशत बढ़ा है?`,
      choices(up, pct, [r, r * p / 100, r / (100 - p) * 100], { step: 5 }), 0, () => pct(up),
      `Take the income as 100: spending ${p}, savings ${100 - p}. Now income ${100 + r} with savings ${100 - p}, so spending is ${100 + r - (100 - p)} - up by ${r} on ${p}: ${r} ÷ ${p} × 100 = ${pct(up)}.`,
      `आय 100 लें: खर्च ${p}, बचत ${100 - p}। अब आय ${100 + r}, बचत ${100 - p}, अतः खर्च ${100 + r - (100 - p)} - यानी ${p} पर ${r} की वृद्धि: ${r} ÷ ${p} × 100 = ${pct(up)}।`);
  },
};

const twoRatio = {
  id: "twoRatio", levels: ["medium", "hard"],
  cands: () => cross([3, 4, 5, 7], [2, 3, 4, 5], [2, 3, 5], [1, 2, 3, 4], [1000, 2000, 2500, 4000, 5000]).filter(([a, b, c, d, s]) => {
    if (a <= b || c <= d || a * d === b * c || a / b >= c / d) return false;
    // A: ak − cm = s, B: bk − dm = s  =>  k = s(c − d)/(ad − bc)·(−1) ...
    const det = a * d - b * c; const k = s * (d - c) / det; const m = s * (a - b) / (-det) * -1;
    const mm = (a * s - b * s) / (a * d - b * c) * -1;
    const K = (s * (c - d)) / (c * b - a * d), M = (s * (a - b)) / (c * b - a * d);
    return K > 0 && M > 0 && Number.isInteger(K) && Number.isInteger(M) && a * K - c * M === s && b * K - d * M === s && a * K <= 200000;
  }),
  build: (t, prm) => {
    const [a, b, c, d, s] = prm;
    const K = (s * (c - d)) / (c * b - a * d), M = (s * (a - b)) / (c * b - a * d);
    const ia = a * K, ib = b * K, ea = c * M, eb = d * M;
    const cy = (k) => (k === 1 ? "y" : `${k}y`);
    return Q(t, `The incomes of A and B are in the ratio ${a} : ${b}, and their expenditures in the ratio ${c} : ${d}. Each of them saves ₹${n(s)}. What is A's income?`,
      `A और B की आय का अनुपात ${a} : ${b} है, और उनके खर्च का अनुपात ${c} : ${d} है। दोनों में से प्रत्येक ₹${n(s)} बचाता है। A की आय कितनी है?`,
      choices(ia, money, [ib, s * a, ea], { step: stepOf(ia) }), 0, () => money(ia),
      `Let the incomes be ${a}x and ${b}x, the expenditures ${cy(c)} and ${cy(d)}. Then ${a}x − ${cy(c)} = ${n(s)} and ${b}x − ${cy(d)} = ${n(s)}, which give x = ${n(K)} and y = ${n(M)}. A's income = ${a} × ${n(K)} = ${money(ia)} (expenditure ₹${n(ea)}; B: ₹${n(ib)} and ₹${n(eb)}).`,
      `आय ${a}x और ${b}x, खर्च ${cy(c)} और ${cy(d)} लें। तब ${a}x − ${cy(c)} = ${n(s)} और ${b}x − ${cy(d)} = ${n(s)}, जिससे x = ${n(K)} और y = ${n(M)}। A की आय = ${a} × ${n(K)} = ${money(ia)} (खर्च ₹${n(ea)}; B: ₹${n(ib)} और ₹${n(eb)})।`);
  },
};

const chain3 = {
  id: "chain3", levels: ["medium", "hard"],
  cands: () => cross(INCOMES, [20, 25, 30], [10, 20, 25], [10, 20, 25, 50]).filter(([i, a, b, c]) => {
    const r1 = i * (100 - a - b) / 100; return whole(r1) && whole(r1 * (100 - c) / 100);
  }),
  build: (t, prm) => {
    const [i, a, b, c] = prm; const w = who(prm);
    const r1 = clean(i * (100 - a - b) / 100), s = clean(r1 * (100 - c) / 100);
    return Q(t, `${w.name} earns ₹${n(i)} a month. ${w.He} spends ${a}% on rent and ${b}% on food, then ${c}% of what remains on travel, and saves the rest. How much does ${w.he} save?`,
      `${w.nameH} हर महीने ₹${n(i)} ${w.v("कमाता", "कमाती")} है। ${w.v("वह", "वह")} ${a}% किराए पर और ${b}% भोजन पर, फिर बचे हुए का ${c}% यात्रा पर खर्च ${w.v("करता", "करती")} है, और बाकी ${w.v("बचाता", "बचाती")} है। ${w.v("वह", "वह")} कितना ${w.v("बचाता", "बचाती")} है?`,
      choices(s, money, [i * (100 - a - b - c) / 100, r1, s + i * c / 200], { step: stepOf(s) }), 0, () => money(s),
      `After rent and food (${a + b}%): ${n(i)} × ${100 - a - b}/100 = ₹${n(r1)}. Travel takes ${c}% of that, leaving ${n(r1)} × ${100 - c}/100 = ${money(s)}.`,
      `किराए और भोजन (${a + b}%) के बाद: ${n(i)} × ${100 - a - b}/100 = ₹${n(r1)}। यात्रा इसका ${c}% लेती है, बचता है ${n(r1)} × ${100 - c}/100 = ${money(s)}।`);
  },
};

const cutSpending = {
  id: "cutSpending", levels: ["medium"],
  cands: () => cross([50, 55, 60, 64, 65, 70, 72, 75, 76, 80, 84, 85, 88, 90], [4, 5, 6, 8, 10, 12, 15, 16, 20, 25]).filter(([p, c]) => clean2(p * c / (100 - p))),
  build: (t, prm) => {
    const [p, c] = prm;
    const up = clean(p * c / (100 - p));
    return Q(t, `A man spends ${p}% of his income. His income stays the same, but he cuts his spending by ${c}%. By what percentage do his savings go up?`,
      `एक व्यक्ति अपनी आय का ${p}% खर्च करता है। उसकी आय वही रहती है, पर वह अपना खर्च ${c}% घटा देता है। उसकी बचत कितने प्रतिशत बढ़ती है?`,
      choices(up, pct, [c, c * p / 100, c * (100 - p) / p], { step: 5 }), 0, () => pct(up),
      `Take the income as 100: spending ${p}, savings ${100 - p}. A ${c}% cut saves ${n(p * c / 100)} more, so the savings rise by ${n(p * c / 100)} ÷ ${100 - p} × 100 = ${pct(up)}.`,
      `आय 100 लें: खर्च ${p}, बचत ${100 - p}। ${c}% कटौती से ${n(p * c / 100)} अधिक बचता है, अतः बचत ${n(p * c / 100)} ÷ ${100 - p} × 100 = ${pct(up)} बढ़ती है।`);
  },
};

const moreEarns = {
  id: "moreEarns", levels: ["medium"],
  cands: () => [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80, 100, 125, 150, 300, 400].filter((x) => nicePct(x / (100 + x) * 100)).flatMap((x) => [[x, 1], [x, 2]]),
  build: (t, prm) => {
    const [x, form] = prm;
    const less = clean(x / (100 + x) * 100);
    const [a, b, aH, bH] = form === 1 ? ["Ravi", "Mohan", "रवि", "मोहन"] : ["Sunita", "Meena", "सुनीता", "मीना"];
    return Q(t, `${a} earns ${x}% more than ${b}. By what percentage is ${b}'s income less than ${a}'s?`,
      `${aH} की आय ${bH} से ${x}% अधिक है। ${bH} की आय ${aH} की आय से कितने प्रतिशत कम है?`,
      choices(less, pct, [x, x / 2, 100 - x], { step: 5 }), 0, () => pct(less),
      `Take ${b}'s income as 100, so ${a}'s is ${100 + x}. ${b} earns ${x} less on ${100 + x}: ${x} ÷ ${100 + x} × 100 = ${pct(less)}.`,
      `${bH} की आय 100 लें, तो ${aH} की ${100 + x}। ${bH} की आय ${100 + x} पर ${x} कम है: ${x} ÷ ${100 + x} × 100 = ${pct(less)}।`);
  },
};

const incomeFromItems = {
  id: "incomeFromItems", levels: ["medium"],
  cands: () => cross(INCOMES, [15, 20, 25, 30], [10, 15, 20, 25], [5, 8, 10, 12, 15]).filter(([i, a, b, c]) => a !== b && a + b + c < 90 && whole(i * (100 - a - b - c) / 100)),
  build: (t, prm) => {
    const [i, a, b, c] = prm; const w = who(prm);
    const spent = a + b + c, s = clean(i * (100 - spent) / 100);
    return Q(t, `${w.name} spends ${a}% of ${w.his} income on rent, ${b}% on food and ${c}% on bills, and saves ₹${n(s)}. What is ${w.his} income?`,
      `${w.nameH} अपनी आय का ${a}% किराए पर, ${b}% भोजन पर और ${c}% बिलों पर खर्च ${w.v("करता", "करती")} है, और ₹${n(s)} ${w.v("बचाता", "बचाती")} है। उसकी आय कितनी है?`,
      choices(i, money, [s * 100 / spent, s * 100 / (100 - a - b), s * (100 + spent) / 100], { step: stepOf(i) }), 0, () => money(clean(s * 100 / (100 - spent))),
      `Spent: ${a}% + ${b}% + ${c}% = ${spent}%, so ${100 - spent}% is saved. ${100 - spent}% of the income = ${n(s)}, so the income is ${n(s)} × 100/${100 - spent} = ${money(i)}.`,
      `खर्च: ${a}% + ${b}% + ${c}% = ${spent}%, अतः ${100 - spent}% बचत है। आय का ${100 - spent}% = ${n(s)}, अतः आय = ${n(s)} × 100/${100 - spent} = ${money(i)}।`);
  },
};

const sameSpendRaise = {
  id: "sameSpendRaise", levels: ["medium"],
  cands: () => cross(INCOMES, [60, 64, 70, 75, 80, 84, 90], [5, 10, 20, 25, 50]).filter(([i, p, r]) => {
    const ni = i * (1 + r / 100), e = i * p / 100; return whole(ni) && whole(e) && clean2((ni - e) / ni * 100);
  }),
  build: (t, prm) => {
    const [i, p, r] = prm; const w = who(prm);
    const e = clean(i * p / 100), ni = clean(i * (1 + r / 100)), sh = clean((ni - e) / ni * 100);
    return Q(t, `${w.name} earns ₹${n(i)} and spends ${p}% of it. ${w.His} income rises by ${r}%, but ${w.he} keeps spending the same amount. What percentage of ${w.his} new income does ${w.he} save?`,
      `${w.nameH} ₹${n(i)} ${w.v("कमाता", "कमाती")} है और इसका ${p}% खर्च ${w.v("करता", "करती")} है। उसकी आय ${r}% बढ़ जाती है, पर ${w.v("वह", "वह")} उतनी ही राशि खर्च ${w.v("करता", "करती")} रहता`.replace("रहता", w.v("रहता", "रहती")) + ` है। ${w.v("वह", "वह")} अपनी नई आय का कितना प्रतिशत ${w.v("बचाता", "बचाती")} है?`,
      choices(sh, pct, [100 - p + r, 100 - p, (ni - e) / i * 100], { step: 2 }), 0, () => pct(sh),
      `Spending stays ₹${n(e)}. New income: ${n(i)} × ${f(r)} = ₹${n(ni)}. Savings ₹${n(ni - e)}, which is ${n(ni - e)} ÷ ${n(ni)} × 100 = ${pct(sh)} of it.`,
      `खर्च ₹${n(e)} ही रहता है। नई आय: ${n(i)} × ${f(r)} = ₹${n(ni)}। बचत ₹${n(ni - e)}, जो इसका ${n(ni - e)} ÷ ${n(ni)} × 100 = ${pct(sh)} है।`);
  },
};

// ---------------------------------------------------------------- HARD
const findSpendShare = {
  id: "findSpendShare", levels: ["hard", "advanced"],
  cands: () => cross([8, 10, 12, 15, 16, 20, 24, 25, 30], [4, 5, 6, 8, 10, 12, 15, 20], [20, 24, 25, 30, 32, 40, 45, 50, 60]).filter(([r, q, s]) => {
    // income +r%, spending +q%, savings +s%:  e = (s − r)/(s − q)
    if (!(s > r && r > q)) return false; const e = (s - r) / (s - q) * 100; return e > 30 && e < 95 && clean2(e);
  }),
  build: (t, prm) => {
    const [r, q, s] = prm;
    const e = clean((s - r) / (s - q) * 100);
    return Q(t, `A man's income rises by ${r}%, his expenditure by ${q}%, and as a result his savings rise by ${s}%. What percentage of his income did he spend at first?`,
      `एक व्यक्ति की आय ${r}%, उसका खर्च ${q}% बढ़ता है, और इससे उसकी बचत ${s}% बढ़ जाती है। शुरुआत में वह अपनी आय का कितना प्रतिशत खर्च करता था?`,
      choices(e, pct, [100 - e, (s - r) / s * 100, e + 10], { step: 5 }), 0, () => pct(e),
      `Income 100, spending E, savings 100 − E. Then ${100 + r} − ${f(q)}E = ${f(s)}(100 − E), so ${n(s / 100 - q / 100)}E = ${s - r} and E = ${n(s - r)} ÷ ${n((s - q) / 100)} = ${n(e)}: he spent ${pct(e)} of his income.`,
      `आय 100, खर्च E, बचत 100 − E। तब ${100 + r} − ${f(q)}E = ${f(s)}(100 − E), अतः ${n(s / 100 - q / 100)}E = ${s - r} और E = ${n(s - r)} ÷ ${n((s - q) / 100)} = ${n(e)}: वह आय का ${pct(e)} खर्च करता था।`);
  },
};

const taxThenSpend = {
  id: "taxThenSpend", levels: ["hard"],
  cands: () => cross(INCOMES, [5, 10, 15, 20], [50, 60, 70, 75, 80]).filter(([i, tx, p]) => {
    const a = i * (100 - tx) / 100; return whole(a) && whole(a * (100 - p) / 100);
  }),
  build: (t, prm) => {
    const [i, tx, p] = prm; const w = who(prm);
    const a = clean(i * (100 - tx) / 100), s = clean(a * (100 - p) / 100), k = clean((100 - tx) / 100 * (100 - p) / 100);
    return Q(t, `${w.name} pays ${tx}% of ${w.his} income as tax and spends ${p}% of what is left. ${w.He} saves ₹${n(s)}. What is ${w.his} income?`,
      `${w.nameH} अपनी आय का ${tx}% कर के रूप में देता${w.v("", "")}`.replace("देता", w.v("देता", "देती")) + ` है और शेष का ${p}% खर्च ${w.v("करता", "करती")} है। ${w.v("वह", "वह")} ₹${n(s)} ${w.v("बचाता", "बचाती")} है। उसकी आय कितनी है?`,
      choices(i, money, [s * 100 / (100 - tx - p), s * 100 / (100 - p), s / k * (1 - tx / 200)], { step: stepOf(i) }), 0, () => money(clean(s / k)),
      `Savings are ${100 - p}% of ${100 - tx}% of the income: ${n((100 - tx) / 100)} × ${n((100 - p) / 100)} = ${n(k)}. Income = ${n(s)} ÷ ${n(k)} = ${money(i)}.`,
      `बचत आय के ${100 - tx}% का ${100 - p}% है: ${n((100 - tx) / 100)} × ${n((100 - p) / 100)} = ${n(k)}। आय = ${n(s)} ÷ ${n(k)} = ${money(i)}।`);
  },
};

const giftsChain = {
  id: "giftsChain", levels: ["hard", "advanced"],
  cands: () => cross(INCOMES, [10, 20, 25, 30], [10, 20, 25], [10, 20, 25, 50]).filter(([i, a, b, c]) => {
    const x = i * (100 - a) / 100 * (100 - b) / 100 * (100 - c) / 100; return a !== b && whole(i * (100 - a) / 100) && whole(i * (100 - a) / 100 * (100 - b) / 100) && whole(x);
  }),
  build: (t, prm) => {
    const [i, a, b, c] = prm; const w = who(prm);
    const r1 = clean(i * (100 - a) / 100), r2 = clean(r1 * (100 - b) / 100), x = clean(r2 * (100 - c) / 100);
    const k = clean((100 - a) / 100 * (100 - b) / 100 * (100 - c) / 100);
    return Q(t, `${w.name} gives ${a}% of ${w.his} money to ${w.his} son, ${b}% of the rest to ${w.his} daughter, and ${c}% of what then remains to a charity. ${w.He} is left with ₹${n(x)}. How much money did ${w.he} have?`,
      `${w.nameH} अपने धन का ${a}% अपने बेटे को, शेष का ${b}% अपनी बेटी को, और फिर बचे हुए का ${c}% एक धर्मार्थ संस्था को ${w.v("देता", "देती")} है। ${w.v("उसके", "उसके")} पास ₹${n(x)} बचते हैं। ${w.v("उसके", "उसके")} पास कुल कितना धन था?`,
      choices(i, money, [x * 100 / (100 - a - b - c), x / ((100 - a) / 100 * (100 - b) / 100), x / k * 0.9], { step: stepOf(i) }), 0, () => money(clean(x / k)),
      `${w.He} keeps ${f(-a)} × ${f(-b)} × ${f(-c)} = ${n(k)} of the money. So the money was ${n(x)} ÷ ${n(k)} = ${money(i)} (₹${n(i)} → ₹${n(r1)} → ₹${n(r2)} → ₹${n(x)}).`,
      `${w.v("उसके", "उसके")} पास धन का ${f(-a)} × ${f(-b)} × ${f(-c)} = ${n(k)} भाग बचता है। अतः धन = ${n(x)} ÷ ${n(k)} = ${money(i)} (₹${n(i)} → ₹${n(r1)} → ₹${n(r2)} → ₹${n(x)})।`);
  },
};

const newSavingsShare = {
  id: "newSavingsShare", levels: ["hard"],
  cands: () => cross([60, 70, 75, 80], [10, 20, 25, 50], [5, 10, 20, 25]).filter(([p, r, q]) => r !== q && clean2((100 + r - p * (1 + q / 100)) / (100 + r) * 100)),
  build: (t, prm) => {
    const [p, r, q] = prm;
    const ne = clean(p * (1 + q / 100)), ns = clean(100 + r - ne), share = clean(ns / (100 + r) * 100);
    return Q(t, `A clerk spends ${p}% of his salary. His salary goes up by ${r}% and his expenses by ${q}%. What percentage of his new salary does he save now?`,
      `एक क्लर्क अपने वेतन का ${p}% खर्च करता है। उसका वेतन ${r}% और उसका खर्च ${q}% बढ़ जाता है। अब वह अपने नए वेतन का कितना प्रतिशत बचाता है?`,
      choices(share, pct, [100 - p + r - q, ns, 100 - p], { step: 2 }), 0, () => pct(share),
      `Take the salary as 100: expenses ${p}. Now salary ${100 + r}, expenses ${p} × ${f(q)} = ${n(ne)}, savings ${n(ns)}. Share: ${n(ns)} ÷ ${100 + r} × 100 = ${pct(share)}.`,
      `वेतन 100 लें: खर्च ${p}। अब वेतन ${100 + r}, खर्च ${p} × ${f(q)} = ${n(ne)}, बचत ${n(ns)}। हिस्सा: ${n(ns)} ÷ ${100 + r} × 100 = ${pct(share)}।`);
  },
};

const twoPeopleSave = {
  id: "twoPeopleSave", levels: ["hard", "advanced"],
  cands: () => cross([10, 20, 25, 40, 50], [60, 70, 75, 80], [70, 75, 80, 85, 90]).filter(([x, pa, pb]) => pa !== pb && clean2((100 + x) * (100 - pa) / (100 - pb)) && Math.abs((100 + x) * (100 - pa) - 100 * (100 - pb)) > 1e-6),
  build: (t, prm) => {
    const [x, pa, pb] = prm;
    const sa = clean((100 + x) * (100 - pa) / 100), sb = clean(100 - pb), ratio = clean(sa / sb * 100);
    const g = (A, B) => (B ? g(B, A % B) : A);
    const A = Math.round(sa * 100), B = Math.round(sb * 100), d = g(A, B);
    return Q(t, `A's income is ${x}% more than B's. A spends ${pa}% of his income and B spends ${pb}% of his. What is the ratio of A's savings to B's savings?`,
      `A की आय B की आय से ${x}% अधिक है। A अपनी आय का ${pa}% और B अपनी आय का ${pb}% खर्च करता है। A और B की बचत का अनुपात क्या है?`,
      [[A, B], [B, A], [100 - pa, 100 - pb], [100 + x, 100], [pb, pa], [1, 1], [A + B, B]].map(([u, v]) => { const e = g(u, v); return `${u / e} : ${v / e}`; }).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4), 0, () => `${A / d} : ${B / d}`,
      `Take B's income as 100, so A's is ${100 + x}. A saves ${100 - pa}% of ${100 + x} = ${n(sa)}; B saves ${100 - pb}% of 100 = ${n(sb)}. Ratio ${n(sa)} : ${n(sb)} = ${A / d} : ${B / d}.`,
      `B की आय 100 लें, तो A की ${100 + x}। A की बचत = ${100 + x} का ${100 - pa}% = ${n(sa)}; B की बचत = 100 का ${100 - pb}% = ${n(sb)}। अनुपात ${n(sa)} : ${n(sb)} = ${A / d} : ${B / d}।`);
  },
};

const raiseThenItems = {
  id: "raiseThenItems", levels: ["hard"],
  cands: () => cross(INCOMES, [10, 20, 25], [20, 25, 30], [10, 20, 25]).filter(([i, r, a, b]) => {
    const ni = i * (1 + r / 100); return whole(ni) && whole(ni * (100 - a) / 100) && whole(ni * (100 - a) / 100 * (100 - b) / 100);
  }),
  build: (t, prm) => {
    const [i, r, a, b] = prm; const w = who(prm);
    const ni = clean(i * (1 + r / 100)), r1 = clean(ni * (100 - a) / 100), s = clean(r1 * (100 - b) / 100);
    return Q(t, `${w.name}'s salary of ₹${n(i)} is raised by ${r}%. From the new salary ${w.he} sends ${a}% home and spends ${b}% of the rest on living costs. How much does ${w.he} save?`,
      `${w.nameH} का ₹${n(i)} का वेतन ${r}% बढ़ाया जाता है। नए वेतन में से ${w.v("वह", "वह")} ${a}% घर भेजता${w.v("", "")} है`.replace("भेजता", w.v("भेजता", "भेजती")) + ` और शेष का ${b}% रहने के खर्च पर खर्च ${w.v("करता", "करती")} है। ${w.v("वह", "वह")} कितना ${w.v("बचाता", "बचाती")} है?`,
      choices(s, money, [i * (100 - a) / 100 * (100 - b) / 100, ni * (100 - a - b) / 100, r1], { step: stepOf(s) }), 0, () => money(s),
      `New salary: ${n(i)} × ${f(r)} = ₹${n(ni)}. After sending ${a}% home: ₹${n(r1)}. After living costs: ${n(r1)} × ${100 - b}/100 = ${money(s)}.`,
      `नया वेतन: ${n(i)} × ${f(r)} = ₹${n(ni)}। ${a}% घर भेजने के बाद: ₹${n(r1)}। रहने के खर्च के बाद: ${n(r1)} × ${100 - b}/100 = ${money(s)}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
const savingsFromIncrease = {
  id: "savingsFromIncrease", levels: ["advanced"],
  cands: () => cross(INCOMES, [60, 70, 75, 80], [10, 20, 25], [5, 10, 15]).filter(([i, p, r, q]) => {
    const e = i * p / 100; const ds = i * r / 100 - e * q / 100; return r > q && whole(e) && whole(ds) && ds > 0 && whole(i * r / 100);
  }),
  build: (t, prm) => {
    const [i, p, r, q] = prm; const w = who(prm);
    const e = clean(i * p / 100), ds = clean(i * r / 100 - e * q / 100), k = clean(r / 100 - p / 100 * q / 100);
    return Q(t, `${w.name} spends ${p}% of ${w.his} income. When ${w.his} income rises by ${r}% and ${w.his} spending by ${q}%, ${w.his} savings go up by ₹${n(ds)}. What was ${w.his} income?`,
      `${w.nameH} अपनी आय का ${p}% खर्च ${w.v("करता", "करती")} है। जब उसकी आय ${r}% और खर्च ${q}% बढ़ता है, तो उसकी बचत ₹${n(ds)} बढ़ जाती है। उसकी आय कितनी थी?`,
      choices(i, money, [ds * 100 / (r - q), ds * 100 / r, ds / k * 1.1], { step: stepOf(i) }), 0, () => money(clean(ds / k)),
      `With income I: savings rise by ${r}% of I − ${q}% of ${p}% of I = (${n(r / 100)} − ${n(p / 100 * q / 100)})I = ${n(k)}I = ${n(ds)}. So I = ${money(i)}.`,
      `आय I हो: बचत में वृद्धि = I का ${r}% − I के ${p}% का ${q}% = (${n(r / 100)} − ${n(p / 100 * q / 100)})I = ${n(k)}I = ${n(ds)}। अतः I = ${money(i)}।`);
  },
};

const ratioChange = {
  id: "ratioChange", levels: ["advanced"],
  cands: () => cross([3, 4, 5], [2, 3, 4], [10, 20, 25], [60, 70, 75, 80], [1000, 2000, 3000, 5000]).filter(([a, b, r, p, d]) => a > b),
  build: (t, prm) => {
    const [a, b, r, p, d] = prm;
    // A: a k, B: b k; both spend p%; after A's income rises r%, A saves d more than B.
    const kk = d / ((a * (1 + r / 100) - b) * (100 - p) / 100);
    const ia = clean(a * kk), ib = clean(b * kk);
    return Q(t, `The incomes of A and B are in the ratio ${a} : ${b}, and each spends ${p}% of their income. After A's income rises by ${r}%, A saves ₹${n(d)} more than B. What is B's income?`,
      `A और B की आय का अनुपात ${a} : ${b} है, और दोनों अपनी आय का ${p}% खर्च करते हैं। A की आय ${r}% बढ़ने के बाद A, B से ₹${n(d)} अधिक बचाता है। B की आय कितनी है?`,
      choices(ib, money, [ia, d * b / (a - b), ib * (1 + r / 100)], { step: stepOf(ib), near: 1 }), 0, () => money(ib),
      `Let the incomes be ${a}x and ${b}x. A's new income is ${a}x × ${f(r)} = ${n(a * (1 + r / 100))}x. Both save ${100 - p}%, so the gap is ${n((a * (1 + r / 100) - b) * (100 - p) / 100)}x = ${n(d)}, giving x = ${n(kk)}. B's income = ${b} × ${n(kk)} = ${money(ib)}.`,
      `आय ${a}x और ${b}x लें। A की नई आय ${a}x × ${f(r)} = ${n(a * (1 + r / 100))}x। दोनों ${100 - p}% बचाते हैं, अतः अंतर ${n((a * (1 + r / 100) - b) * (100 - p) / 100)}x = ${n(d)}, जिससे x = ${n(kk)}। B की आय = ${b} × ${n(kk)} = ${money(ib)}।`);
  },
};

const threeYears = {
  id: "threeYears", levels: ["advanced"],
  cands: () => cross([10, 12, 15, 20, 25, 30], [5, 8, 10, 12, 15, 20], [50, 60, 70, 75, 80]).filter(([r, q, p]) => r > q && clean2(((1 + r / 100) ** 2 * 100 - p * (1 + q / 100) ** 2 - (100 - p)) / (100 - p) * 100)),
  build: (t, prm) => {
    const [r, q, p] = prm;
    const i2 = clean(100 * (1 + r / 100) ** 2), e2 = clean(p * (1 + q / 100) ** 2), s2 = clean(i2 - e2), ch = clean((s2 - (100 - p)) / (100 - p) * 100);
    return Q(t, `A shopkeeper spends ${p}% of his income. Each year his income grows by ${r}% and his spending by ${q}%. By what percentage will his savings have changed after 2 years?`,
      `एक दुकानदार अपनी आय का ${p}% खर्च करता है। हर वर्ष उसकी आय ${r}% और उसका खर्च ${q}% बढ़ता है। 2 वर्ष बाद उसकी बचत में कितने प्रतिशत परिवर्तन होगा?`,
      choices(ch, pct, [2 * (r - q), (r - q) * 2 * p / 100, ch / 2], { step: 10 }), 0, () => pct(ch),
      `Income 100 → ${n(i2)} (× ${f(r)} twice); spending ${p} → ${n(e2)} (× ${f(q)} twice); savings ${100 - p} → ${n(s2)}. Change: ${n(s2 - (100 - p))} ÷ ${100 - p} × 100 = ${pct(ch)}.`,
      `आय 100 → ${n(i2)} (दो बार × ${f(r)}); खर्च ${p} → ${n(e2)} (दो बार × ${f(q)}); बचत ${100 - p} → ${n(s2)}। परिवर्तन: ${n(s2 - (100 - p))} ÷ ${100 - p} × 100 = ${pct(ch)}।`);
  },
};

const budgetShift = {
  id: "budgetShift", levels: ["advanced"],
  cands: () => cross(INCOMES, [30, 40, 50], [20, 25, 30], [10, 20, 25], [10, 20]).filter(([i, a, b, r, q]) => {
    const fd = i * a / 100, rt = i * b / 100, other = i - fd - rt; const ni = i * (1 + r / 100), nf = fd * (1 + q / 100);
    return a + b < 90 && whole(fd) && whole(rt) && whole(ni) && whole(nf) && ni - nf - rt > 0 && nicePct((ni - nf - rt - (i - fd - rt)) / (i - fd - rt) * 100);
  }),
  build: (t, prm) => {
    const [i, a, b, r, q] = prm; const w = who(prm);
    const fd = clean(i * a / 100), rt = clean(i * b / 100), s0 = clean(i - fd - rt), ni = clean(i * (1 + r / 100)), nf = clean(fd * (1 + q / 100)), s1 = clean(ni - nf - rt);
    const ch = clean((s1 - s0) / s0 * 100);
    return Q(t, `${w.name} earns ₹${n(i)}, spends ${a}% on food and ${b}% on rent, and saves the rest. ${w.His} income then rises by ${r}%, food costs rise by ${q}%, and the rent stays the same. By what percentage do ${w.his} savings change?`,
      `${w.nameH} ₹${n(i)} ${w.v("कमाता", "कमाती")} है, ${a}% भोजन पर और ${b}% किराए पर खर्च ${w.v("करता", "करती")} है, और बाकी ${w.v("बचाता", "बचाती")} है। फिर उसकी आय ${r}% बढ़ती है, भोजन का खर्च ${q}% बढ़ता है, और किराया वही रहता है। उसकी बचत में कितने प्रतिशत परिवर्तन होता है?`,
      choices(Math.abs(ch), pct, [r - q, r, Math.abs((s1 - s0) / i * 100)], { step: 5 }), 0, () => pct(Math.abs(ch)),
      `Before: food ₹${n(fd)}, rent ₹${n(rt)}, savings ₹${n(s0)}. After: income ₹${n(ni)}, food ₹${n(nf)}, rent ₹${n(rt)}, savings ₹${n(s1)}. Change: ${n(Math.abs(s1 - s0))} ÷ ${n(s0)} × 100 = ${pct(Math.abs(ch))} ${ch >= 0 ? "increase" : "decrease"}.`,
      `पहले: भोजन ₹${n(fd)}, किराया ₹${n(rt)}, बचत ₹${n(s0)}। बाद में: आय ₹${n(ni)}, भोजन ₹${n(nf)}, किराया ₹${n(rt)}, बचत ₹${n(s1)}। परिवर्तन: ${n(Math.abs(s1 - s0))} ÷ ${n(s0)} × 100 = ${pct(Math.abs(ch))} ${ch >= 0 ? "वृद्धि" : "कमी"}।`);
  },
};

const KINDS = [
  savingsAmount, spendAmount, incomeFromSaving, incomeFromSpend, savingPercent, itemsSpend, yearSaving, familyIncome, raise1, expensePct,
  remainder, incomeFromRemainder, bothRise, savingsChange, keepSaving, twoRatio, chain3, cutSpending, moreEarns, incomeFromItems, sameSpendRaise,
  findSpendShare, taxThenSpend, giftsChain, newSavingsShare, twoPeopleSave, raiseThenItems,
  savingsFromIncrease, ratioChange, threeYears, budgetShift,
];
// Harder levels also take some kinds with harder numbers.
for (const k of [bothRise, savingsChange, keepSaving, incomeFromRemainder]) k.levels.push("hard");
for (const k of [taxThenSpend, newSavingsShare, raiseThenItems, twoRatio, chain3]) k.levels.push("advanced");

const PREFIX = "Percentage · Percentage in Income and Expenditure";
const topic = () => { pop.topic(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: pop.USED }); };
const tests = (level, from, to) => topic()[level].slice(from - 1, to).flat();
module.exports = { tests, KINDS, topic, PREFIX };
