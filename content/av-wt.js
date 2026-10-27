// Average · Replacement and Weighted Average: every kind of question, level
// by level. Every answer is worked out again in `v`; the wrong options are
// the usual slips (the plain average of two averages, the change taken once
// instead of for the whole group, the old count used after a change).
const L = require("./av-lib");
const { n, clean, isInt, cross, who, AQ, thin, pick, range, dec2, guard, gcd } = L;
const { fillTopic } = require("./gen");

const ordEn = (k) => `${k}${k % 10 === 1 && k % 100 !== 11 ? "st" : k % 10 === 2 && k % 100 !== 12 ? "nd" : k % 10 === 3 && k % 100 !== 13 ? "rd" : "th"}`;
const ratio = (a, b) => { const g = gcd(a, b); return `${a / g} : ${b / g}`; };

// ---------------------------------------------------------------- EASY
const PEOPLE = [["men", "पुरुषों", "man", "पुरुष"], ["students", "विद्यार्थियों", "student", "विद्यार्थी"], ["players", "खिलाड़ियों", "player", "खिलाड़ी"]];
const replaceOne = {
  id: "replaceOne", levels: ["easy", "medium"],
  cands: () => thin(cross([0, 1, 2], [4, 5, 6, 8, 10, 12, 15, 20], [0.5, 1, 1.5, 2, 2.5, 3], range(40, 80), ["up", "down"]).filter(([g, N, d, w, dir]) => { const x = dir === "up" ? w + N * d : w - N * d; return isInt(x) && x >= 45 && x <= 95 && N * d <= 25; }), (p) => [p[1], p[2], p[4]]),
  build: (t, prm) => {
    const [g, N, d, w, dir] = prm; const [en, hi, one, oneH] = PEOPLE[g]; const up = dir === "up"; const x = up ? w + N * d : w - N * d;
    return AQ(t, `The average weight of ${N} ${en} ${up ? "increases" : "decreases"} by ${n(d)} kg when one of them, who weighs ${w} kg, is replaced by a new ${one}. What is the weight of the new ${one}?`,
      `${N} ${hi} का औसत भार ${n(d)} kg ${up ? "बढ़ जाता" : "घट जाता"} है जब उनमें से ${w} kg भार वाले एक ${oneH} के स्थान पर एक नया ${oneH} आता है। नए ${oneH} का भार कितना है?`,
      x, [up ? w + d : w - d, up ? w + (N - 1) * d : w - (N - 1) * d, up ? w + (N + 1) * d : w - (N + 1) * d].filter((v) => v !== x), () => w + (up ? 1 : -1) * N * d,
      `The total weight ${up ? "rises" : "falls"} by ${N} × ${n(d)} = ${n(N * d)} kg, all because of the swap. So the new ${one} weighs ${w} ${up ? "+" : "−"} ${n(N * d)} = ${n(x)} kg.`,
      `कुल भार ${N} × ${n(d)} = ${n(N * d)} kg ${up ? "बढ़ता" : "घटता"} है, जो केवल इस बदलाव से है। अतः नए ${oneH} का भार = ${w} ${up ? "+" : "−"} ${n(N * d)} = ${n(x)} kg।`, "kg", 1);
  },
};

const combineGroups = {
  id: "combineGroups", levels: ["easy", "medium"],
  cands: () => thin(cross([15, 20, 24, 25, 30, 35, 40], range(40, 80), [15, 20, 24, 25, 30, 35, 40], range(40, 80)).filter(([n1, a1, n2, a2]) => n1 !== n2 && a1 !== a2 && Math.abs(a1 - a2) <= 20 && dec2((n1 * a1 + n2 * a2) / (n1 + n2))), (p) => [p[0], p[2], p[1] % 5]),
  build: (t, prm) => {
    const [n1, a1, n2, a2] = prm; const A = clean((n1 * a1 + n2 * a2) / (n1 + n2));
    return AQ(t, `Section A of a class has ${n1} students whose average mark is ${a1}, and section B has ${n2} students whose average mark is ${a2}. What is the average mark of all the students together?`,
      `एक कक्षा के अनुभाग A में ${n1} विद्यार्थी हैं जिनके औसत अंक ${a1} हैं, और अनुभाग B में ${n2} विद्यार्थी हैं जिनके औसत अंक ${a2} हैं। सभी विद्यार्थियों के औसत अंक क्या हैं?`,
      A, [(a1 + a2) / 2, (n1 * a2 + n2 * a1) / (n1 + n2), A + 1], () => (a1 * n1 + a2 * n2) / (n1 + n2),
      `Total marks = ${n1} × ${a1} + ${n2} × ${a2} = ${n1 * a1 + n2 * a2} for ${n1 + n2} students. Average = ${n1 * a1 + n2 * a2} ÷ ${n1 + n2} = ${n(A)}. (The plain average of ${a1} and ${a2} is wrong: the sections are of different sizes.)`,
      `कुल अंक = ${n1} × ${a1} + ${n2} × ${a2} = ${n1 * a1 + n2 * a2}, ${n1 + n2} विद्यार्थियों के। औसत = ${n1 * a1 + n2 * a2} ÷ ${n1 + n2} = ${n(A)}। (${a1} और ${a2} का सीधा औसत गलत है: अनुभाग बराबर नहीं हैं।)`, "none", 1);
  },
};

// Two things bought: [English plural, Hindi plural, English one, Hindi one, price range]
const GOODS = [["chairs", "कुर्सियाँ", "chair", "कुर्सी", 300, 1500], ["fans", "पंखे", "fan", "पंखे", 1000, 3000], ["shirts", "कमीज़ें", "shirt", "कमीज़", 300, 1200], ["books", "पुस्तकें", "book", "पुस्तक", 100, 600], ["bags", "थैले", "bag", "थैले", 200, 900]];
const costAvg = {
  id: "costAvg", levels: ["easy"],
  cands: () => thin(cross([0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [2, 3, 4, 5, 6, 8, 10, 12], range(100, 3000, 50), [2, 3, 4, 5, 6, 8, 10], range(100, 3000, 50)).filter(([i, j, q1, p1, q2, p2]) => i < j && q1 !== q2 && p1 !== p2 && p1 >= GOODS[i][4] && p1 <= GOODS[i][5] && p2 >= GOODS[j][4] && p2 <= GOODS[j][5] && dec2((q1 * p1 + q2 * p2) / (q1 + q2)) && isInt((q1 * p1 + q2 * p2) / (q1 + q2))), (p) => [p[0], p[1], p[2], p[4]]),
  build: (t, prm) => {
    const [i, j, q1, p1, q2, p2] = prm; const [e1, h1, o1, ho1] = GOODS[i], [e2, h2, o2, ho2] = GOODS[j]; const A = (q1 * p1 + q2 * p2) / (q1 + q2);
    return AQ(t, `A shopkeeper buys ${q1} ${e1} at ₹${n(p1)} each and ${q2} ${e2} at ₹${n(p2)} each. What is the average cost of one article?`,
      `एक दुकानदार ₹${n(p1)} प्रति ${ho1} की दर से ${q1} ${h1} और ₹${n(p2)} प्रति ${ho2} की दर से ${q2} ${h2} खरीदता है। एक वस्तु का औसत मूल्य क्या है?`,
      A, [(p1 + p2) / 2, (q1 * p2 + q2 * p1) / (q1 + q2), A + 50], () => (p1 * q1 + p2 * q2) / (q1 + q2),
      `Total cost = ${q1} × ${n(p1)} + ${q2} × ${n(p2)} = ₹${n(q1 * p1 + q2 * p2)} for ${q1 + q2} articles. Average = ${n(q1 * p1 + q2 * p2)} ÷ ${q1 + q2} = ₹${n(A)}.`,
      `कुल मूल्य = ${q1} × ${n(p1)} + ${q2} × ${n(p2)} = ₹${n(q1 * p1 + q2 * p2)}, ${q1 + q2} वस्तुओं का। औसत = ${n(q1 * p1 + q2 * p2)} ÷ ${q1 + q2} = ₹${n(A)}।`, "rs", 10);
  },
};

const GRAIN = [["rice", "चावल"], ["wheat", "गेहूँ"], ["sugar", "चीनी"], ["dal", "दाल"], ["tea", "चाय"]];
const mixPrice = {
  id: "mixPrice", levels: ["easy", "medium"],
  cands: () => thin(cross([0, 1, 2, 3, 4], [5, 8, 10, 12, 15, 20, 25, 30], range(20, 120), [5, 8, 10, 12, 15, 20, 25, 30], range(20, 120)).filter(([g, q1, p1, q2, p2]) => q1 !== q2 && Math.abs(p1 - p2) >= 6 && Math.abs(p1 - p2) <= 40 && dec2((q1 * p1 + q2 * p2) / (q1 + q2))), (p) => [p[0], p[1], p[3]]),
  build: (t, prm) => {
    const [g, q1, p1, q2, p2] = prm; const [e, h] = GRAIN[g]; const A = clean((q1 * p1 + q2 * p2) / (q1 + q2));
    return AQ(t, `A grocer mixes ${q1} kg of ${e} costing ₹${p1} per kg with ${q2} kg of ${e} costing ₹${p2} per kg. What is the average cost of the mixture per kg?`,
      `एक दुकानदार ₹${p1} प्रति kg वाले ${q1} kg ${h} को ₹${p2} प्रति kg वाले ${q2} kg ${h} में मिलाता है। मिश्रण का प्रति kg औसत मूल्य क्या है?`,
      A, [(p1 + p2) / 2, (q1 * p2 + q2 * p1) / (q1 + q2), A + 2], () => (p1 * q1 + p2 * q2) / (q1 + q2),
      `Total cost = ${q1} × ${p1} + ${q2} × ${p2} = ₹${n(q1 * p1 + q2 * p2)} for ${q1 + q2} kg. Average = ${n(q1 * p1 + q2 * p2)} ÷ ${q1 + q2} = ₹${n(A)} per kg.`,
      `कुल मूल्य = ${q1} × ${p1} + ${q2} × ${p2} = ₹${n(q1 * p1 + q2 * p2)}, ${q1 + q2} kg का। औसत = ${n(q1 * p1 + q2 * p2)} ÷ ${q1 + q2} = ₹${n(A)} प्रति kg।`, "rs", 1);
  },
};

// A batsman: n innings, then one more of r runs lifts the average by d.
// Real batting averages: 15 to 60 runs after the innings.
const BAT = () => cross(range(8, 30), range(40, 150), [1, 1.5, 2, 2.5, 3, 4, 5]).filter(([N, r, d]) => isInt(r - N * d) && r - N * d >= 15 && r - N * d <= 60 && r - N * d < r - 10);
const batsmanNew = {
  id: "batsmanNew", group: "bat", levels: ["easy", "medium"],
  cands: BAT,
  build: (t, prm) => {
    const [N, r, d] = prm; const w = who(prm); const B = r - N * d;
    return AQ(t, `${w.name} scores ${r} runs in the ${ordEn(N + 1)} innings, which raises ${w.his} batting average by ${n(d)} runs. What is ${w.his} average after the ${ordEn(N + 1)} innings?`,
      `${w.nameH} ${N + 1}वीं पारी में ${r} रन बनाता/बनाती है, जिससे उसका बल्लेबाज़ी औसत ${n(d)} रन बढ़ जाता है। ${N + 1}वीं पारी के बाद उसका औसत क्या है?`.replace("बनाता/बनाती", w.v("बनाता", "बनाती")),
      B, [B - d, r - (N + 1) * d, r / (N + 1)].filter((v) => v !== B), () => r - d * N,
      `Let the new average be A, so the old one was A − ${n(d)}. ${N} × (A − ${n(d)}) + ${r} = ${N + 1} × A, which gives A = ${r} − ${N} × ${n(d)} = ${n(B)}.`,
      `नया औसत A लें, तो पुराना A − ${n(d)} था। ${N} × (A − ${n(d)}) + ${r} = ${N + 1} × A, जिससे A = ${r} − ${N} × ${n(d)} = ${n(B)}।`, "none", 1);
  },
};

const batsmanOld = {
  id: "batsmanOld", group: "bat", levels: ["medium", "hard", "advanced"],
  cands: BAT,
  build: (t, prm) => {
    const [N, r, d] = prm; const w = who(prm); const old = r - (N + 1) * d;
    return AQ(t, `After ${N} innings a batsman has a certain average. In the ${ordEn(N + 1)} innings he scores ${r} runs, and his average rises by ${n(d)}. What was his average before the ${ordEn(N + 1)} innings?`,
      `${N} पारियों के बाद एक बल्लेबाज़ का एक निश्चित औसत है। ${N + 1}वीं पारी में वह ${r} रन बनाता है, और उसका औसत ${n(d)} बढ़ जाता है। ${N + 1}वीं पारी से पहले उसका औसत क्या था?`,
      old, [r - N * d, old - d, old + 2 * d].filter((v) => v !== old && v > 0), () => (r - d * (N + 1)),
      `Old average x: ${N}x + ${r} = ${N + 1}(x + ${n(d)}), so x = ${r} − ${N + 1} × ${n(d)} = ${n(old)}.`,
      `पुराना औसत x: ${N}x + ${r} = ${N + 1}(x + ${n(d)}), अतः x = ${r} − ${N + 1} × ${n(d)} = ${n(old)}।`, "none", 1);
  },
};

const batsmanNeed = {
  id: "batsmanNeed", levels: ["easy", "medium"],
  cands: () => cross(range(6, 25), range(20, 55), [1, 2, 3, 4, 5]).filter(([N, a, d]) => a + (N + 1) * d <= 150),
  build: (t, prm) => {
    const [N, a, d] = prm; const x = a + (N + 1) * d;
    return AQ(t, `A batsman has an average of ${a} runs after ${N} innings. How many runs must he score in the next innings to raise his average by ${d}?`,
      `${N} पारियों के बाद एक बल्लेबाज़ का औसत ${a} रन है। अपना औसत ${d} बढ़ाने के लिए उसे अगली पारी में कितने रन बनाने होंगे?`,
      x, [a + d, a + N * d, (N + 1) * (a + d) - N * a + d].filter((v) => v !== x), () => (a + d) * (N + 1) - a * N,
      `Runs so far = ${N} × ${a} = ${N * a}. To average ${a + d} over ${N + 1} innings he needs ${N + 1} × ${a + d} = ${(N + 1) * (a + d)}. Next innings = ${(N + 1) * (a + d)} − ${N * a} = ${x}.`,
      `अब तक के रन = ${N} × ${a} = ${N * a}। ${N + 1} पारियों में ${a + d} का औसत चाहिए: ${N + 1} × ${a + d} = ${(N + 1) * (a + d)}। अगली पारी = ${(N + 1) * (a + d)} − ${N * a} = ${x}।`, "run", 1);
  },
};

const salaryAdd = {
  id: "salaryAdd", levels: ["easy", "medium"],
  cands: () => thin(cross(range(8, 30), range(12, 40), range(1, 12)).map(([N, a, d]) => [N, a * 500, a * 500 + d * 100]).filter(([N, a, b]) => (N + 1) * b - N * a <= 120000), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [N, a, b] = prm; const M = (N + 1) * b - N * a;
    return AQ(t, `The average monthly salary of ${N} employees of an office is ₹${n(a)}. When the manager's salary is also counted, the average rises to ₹${n(b)}. What is the manager's monthly salary?`,
      `एक कार्यालय के ${N} कर्मचारियों का औसत मासिक वेतन ₹${n(a)} है। प्रबंधक का वेतन भी जोड़ने पर औसत ₹${n(b)} हो जाता है। प्रबंधक का मासिक वेतन कितना है?`,
      M, [b + (b - a) * N, a + (b - a), N * b - (N - 1) * a + (b - a) * 2].filter((v) => v !== M), () => b * (N + 1) - a * N,
      `Employees' total = ${N} × ${n(a)} = ₹${n(N * a)}. With the manager: ${N + 1} × ${n(b)} = ₹${n((N + 1) * b)}. Manager = ${n((N + 1) * b)} − ${n(N * a)} = ₹${n(M)}.`,
      `कर्मचारियों का कुल वेतन = ${N} × ${n(a)} = ₹${n(N * a)}। प्रबंधक सहित: ${N + 1} × ${n(b)} = ₹${n((N + 1) * b)}। प्रबंधक = ${n((N + 1) * b)} − ${n(N * a)} = ₹${n(M)}।`, "rs", 100);
  },
};

const replaceValue = {
  id: "replaceValue", levels: ["easy"],
  cands: () => thin(cross([5, 6, 7, 8, 9, 10, 12], range(20, 60), range(10, 90), range(10, 90)).filter(([N, A, x, y]) => x !== y && Math.abs(x - y) >= 6 && dec2(A + (y - x) / N)), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [N, A, x, y] = prm; const B = clean(A + (y - x) / N);
    return AQ(t, `The average of ${N} numbers is ${A}. If one of the numbers, ${x}, is replaced by ${y}, what is the new average?`,
      `${N} संख्याओं का औसत ${A} है। यदि इनमें से एक संख्या ${x} के स्थान पर ${y} रख दी जाए, तो नया औसत क्या होगा?`,
      B, [A + (y - x), A - (y - x) / N, A + (y - x) / (N - 1)], () => (A * N - x + y) / N,
      `Sum = ${N} × ${A} = ${N * A}. New sum = ${N * A} − ${x} + ${y} = ${N * A - x + y}. New average = ${N * A - x + y} ÷ ${N} = ${n(B)}.`,
      `योग = ${N} × ${A} = ${N * A}। नया योग = ${N * A} − ${x} + ${y} = ${N * A - x + y}। नया औसत = ${N * A - x + y} ÷ ${N} = ${n(B)}।`, "none", 1);
  },
};

const groupFind = {
  id: "groupFind", levels: ["easy", "medium"],
  cands: () => thin(cross([10, 12, 15, 16, 20, 24, 25], range(40, 80), [30, 35, 40, 45, 50, 60], range(40, 80)).filter(([b, x, N, c]) => N > b + 5 && x !== c && dec2((N * c - b * x) / (N - b)) && (N * c - b * x) / (N - b) > 20 && (N * c - b * x) / (N - b) <= 95), (p) => [p[0], p[2], p[1] % 4]),
  build: (t, prm) => {
    const [b, x, N, c] = prm; const g = N - b; const G = clean((N * c - b * x) / g);
    return AQ(t, `In a class of ${N} students, the average mark of the ${b} boys is ${x} and the average mark of the whole class is ${c}. What is the average mark of the ${g} girls?`,
      `${N} विद्यार्थियों की एक कक्षा में ${b} लड़कों के औसत अंक ${x} हैं और पूरी कक्षा के औसत अंक ${c} हैं। ${g} लड़कियों के औसत अंक क्या हैं?`,
      G, [2 * c - x, (N * c - b * x) / N, (N * c + b * x) / g].filter((v) => v !== G), () => (c * N - x * b) / (N - b),
      `Class total = ${N} × ${c} = ${N * c}. Boys' total = ${b} × ${x} = ${b * x}. Girls' total = ${N * c - b * x}, average ${N * c - b * x} ÷ ${g} = ${n(G)}.`,
      `कक्षा का कुल = ${N} × ${c} = ${N * c}। लड़कों का कुल = ${b} × ${x} = ${b * x}। लड़कियों का कुल = ${N * c - b * x}, औसत ${N * c - b * x} ÷ ${g} = ${n(G)}।`, "none", 1);
  },
};

const threeSections = {
  id: "threeSections", levels: ["easy", "medium"],
  cands: () => thin(cross([20, 25, 30, 35, 40], range(50, 75), [20, 25, 30, 35, 40], range(50, 75), [20, 25, 30, 35, 40], range(50, 75)).filter(([n1, a1, n2, a2, n3, a3]) => n1 !== n2 && n2 !== n3 && a1 !== a2 && a2 !== a3 && a1 !== a3 && dec2((n1 * a1 + n2 * a2 + n3 * a3) / (n1 + n2 + n3))), (p) => [p[0], p[2], p[4], p[1] % 3]),
  build: (t, prm) => {
    const [n1, a1, n2, a2, n3, a3] = prm; const S = n1 * a1 + n2 * a2 + n3 * a3, N = n1 + n2 + n3; const A = clean(S / N);
    return AQ(t, `Three sections of a class have ${n1}, ${n2} and ${n3} students, whose average marks are ${a1}, ${a2} and ${a3} respectively. What is the average mark of all the students?`,
      `एक कक्षा के तीन अनुभागों में क्रमशः ${n1}, ${n2} और ${n3} विद्यार्थी हैं, जिनके औसत अंक क्रमशः ${a1}, ${a2} और ${a3} हैं। सभी विद्यार्थियों के औसत अंक क्या हैं?`,
      A, [(a1 + a2 + a3) / 3, S / (N - 1), A + 1], () => (a1 * n1 + a2 * n2 + a3 * n3) / (n1 + n2 + n3),
      `Total = ${n1} × ${a1} + ${n2} × ${a2} + ${n3} × ${a3} = ${S} for ${N} students. Average = ${S} ÷ ${N} = ${n(A)}.`,
      `कुल = ${n1} × ${a1} + ${n2} × ${a2} + ${n3} × ${a3} = ${S}, ${N} विद्यार्थियों का। औसत = ${S} ÷ ${N} = ${n(A)}।`, "none", 1);
  },
};

// ---------------------------------------------------------------- MEDIUM
const replaceTwo = {
  id: "replaceTwo", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross([6, 8, 10, 12, 15, 20], [0.5, 1, 1.5, 2, 2.5, 3], range(40, 75), range(45, 80)).filter(([N, d, a, b]) => b > a && isInt((a + b + N * d) / 2) && (a + b + N * d) / 2 <= 90), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [N, d, a, b] = prm; const W = (a + b + N * d) / 2;
    return AQ(t, `The average weight of ${N} persons increases by ${n(d)} kg when two of them, weighing ${a} kg and ${b} kg, are replaced by two new persons. What is the average weight of the two new persons?`,
      `${N} व्यक्तियों का औसत भार ${n(d)} kg बढ़ जाता है जब उनमें से ${a} kg और ${b} kg भार वाले दो व्यक्तियों के स्थान पर दो नए व्यक्ति आते हैं। दोनों नए व्यक्तियों का औसत भार क्या है?`,
      W, [(a + b) / 2 + d, (a + b) / 2 + N * d, (a + b + 2 * N * d) / 2].filter((v) => v !== W), () => (a + b + d * N) / 2,
      `The total rises by ${N} × ${n(d)} = ${n(N * d)} kg. The new pair weighs ${a} + ${b} + ${n(N * d)} = ${n(a + b + N * d)} kg, an average of ${n(W)} kg.`,
      `कुल भार ${N} × ${n(d)} = ${n(N * d)} kg बढ़ता है। नए दोनों का भार ${a} + ${b} + ${n(N * d)} = ${n(a + b + N * d)} kg, औसत ${n(W)} kg।`, "kg", 1);
  },
};

const countFromAvgs = {
  id: "countFromAvgs", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross([4, 5, 6, 7, 8, 10, 12], range(10, 30), range(4, 12), range(5, 20)).map(([k, t1, r, w]) => [k, t1 * 1000, r * 1000, w * 1000]).filter(([k, T, R, W]) => T > W && W > R && isInt(k * (T - W) / (W - R)) && k * (T - W) / (W - R) >= 3), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [k, T, R, W] = prm; const rest = k * (T - W) / (W - R); const N = k + rest;
    return AQ(t, `The average monthly salary of all the workers in a workshop is ₹${n(W)}. The average salary of ${k} technicians is ₹${n(T)} and the average salary of the rest is ₹${n(R)}. How many workers are there in the workshop?`,
      `एक कार्यशाला के सभी कर्मचारियों का औसत मासिक वेतन ₹${n(W)} है। ${k} तकनीशियनों का औसत वेतन ₹${n(T)} और शेष का औसत वेतन ₹${n(R)} है। कार्यशाला में कुल कितने कर्मचारी हैं?`,
      N, [rest, N + k, k * (T - R) / (W - R)].filter((v) => v !== N && isInt(v)), () => k + k * (T - W) / (W - R),
      `Each technician is ₹${n(T - W)} above the average, ${k} of them ₹${n(k * (T - W))} in all. Each other worker is ₹${n(W - R)} below it, so there are ${n(k * (T - W))} ÷ ${n(W - R)} = ${rest} of them. Total = ${k} + ${rest} = ${N}.`,
      `हर तकनीशियन औसत से ₹${n(T - W)} ऊपर है, ${k} मिलकर ₹${n(k * (T - W))}। शेष हर कर्मचारी औसत से ₹${n(W - R)} नीचे है, अतः वे ${n(k * (T - W))} ÷ ${n(W - R)} = ${rest} हैं। कुल = ${k} + ${rest} = ${N}।`, "none", 1);
  },
};

const twoInnings = {
  id: "twoInnings", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(8, 30), range(25, 55), [2, 3, 4, 5, 6]).map(([N, a, d]) => [N, a, a + d]).filter(([N, a, b]) => (N + 2) * b - N * a <= 260),
  build: (t, prm) => {
    const [N, a, b] = prm; const x = (N + 2) * b - N * a;
    return AQ(t, `A batsman's average after ${N} innings is ${a} runs. How many runs in all must he score in the next 2 innings to make his average ${b}?`,
      `${N} पारियों के बाद एक बल्लेबाज़ का औसत ${a} रन है। अपना औसत ${b} करने के लिए उसे अगली 2 पारियों में कुल कितने रन बनाने होंगे?`,
      x, [2 * b, (N + 1) * b - N * a, x / 2, 2 * (b - a) + 2 * b].filter((v) => v !== x), () => b * (N + 2) - a * N,
      `Runs so far = ${N} × ${a} = ${N * a}. Needed after ${N + 2} innings = ${N + 2} × ${b} = ${(N + 2) * b}. In the 2 innings: ${(N + 2) * b} − ${N * a} = ${x}.`,
      `अब तक के रन = ${N} × ${a} = ${N * a}। ${N + 2} पारियों के बाद चाहिए = ${N + 2} × ${b} = ${(N + 2) * b}। 2 पारियों में: ${(N + 2) * b} − ${N * a} = ${x}।`, "run", 1);
  },
};

const pctFromAvgs = {
  id: "pctFromAvgs", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(40, 80), range(45, 90), range(42, 88)).filter(([b, g, c]) => b < c && c < g && g - c !== c - b && isInt((g - c) / (g - b) * 100)),
  build: (t, prm) => {
    const [b, g, c] = prm; const P = clean((g - c) / (g - b) * 100);
    return AQ(t, `In a class, the average mark of the boys is ${b}, that of the girls is ${g}, and that of the whole class is ${c}. What percentage of the class are boys?`,
      `एक कक्षा में लड़कों के औसत अंक ${b}, लड़कियों के ${g} और पूरी कक्षा के ${c} हैं। कक्षा में लड़के कितने प्रतिशत हैं?`,
      P, [100 - P, (c - b) / (g - b) * 100 + (P === 50 ? 10 : 0), P + 5].filter((v) => v !== P && v > 0 && v < 100), () => 100 * (g - c) / ((g - c) + (c - b)),
      `Boys are ${c - b} below the class average and girls ${g - c} above it, so boys : girls = ${g - c} : ${c - b}. Boys = ${g - c} ÷ ${g - b} × 100 = ${n(P)}%.`,
      `लड़के कक्षा के औसत से ${c - b} नीचे और लड़कियाँ ${g - c} ऊपर हैं, अतः लड़के : लड़कियाँ = ${g - c} : ${c - b}। लड़के = ${g - c} ÷ ${g - b} × 100 = ${n(P)}%।`, "pct", 5);
  },
};

const ratioFromAvgs = {
  id: "ratioFromAvgs", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(40, 80), range(45, 90), range(42, 88)).filter(([b, g, c]) => b < c && c < g && (g - c) !== (c - b) && g - b <= 30),
  build: (t, prm) => {
    const [b, g, c] = prm; const ans = ratio(g - c, c - b);
    const o = [ans, ratio(c - b, g - c), ratio(g - b, c - b), ratio(g - c, g - b)].filter((x, i, a) => a.indexOf(x) === i);
    for (let k = 1; o.length < 4; k++) { const r = ratio(g - c + k, c - b); if (!o.includes(r)) o.push(r); }
    return L.Q(t, `In a class, the average mark of the boys is ${b} and that of the girls is ${g}. The average mark of the whole class is ${c}. What is the ratio of the number of boys to the number of girls?`,
      `एक कक्षा में लड़कों के औसत अंक ${b} और लड़कियों के ${g} हैं। पूरी कक्षा के औसत अंक ${c} हैं। लड़कों और लड़कियों की संख्या का अनुपात क्या है?`,
      o, 0, () => ratio(g - c, c - b),
      `Let there be B boys and G girls: ${b}B + ${g}G = ${c}(B + G), so ${c - b}B = ${g - c}G and B : G = ${g - c} : ${c - b}${ans === `${g - c} : ${c - b}` ? "" : ` = ${ans}`}.`,
      `B लड़के और G लड़कियाँ हों: ${b}B + ${g}G = ${c}(B + G), अतः ${c - b}B = ${g - c}G और B : G = ${g - c} : ${c - b}${ans === `${g - c} : ${c - b}` ? "" : ` = ${ans}`}।`, o);
  },
};

const salaryRaise = {
  id: "salaryRaise", levels: ["medium", "hard"],
  cands: () => thin(cross(range(10, 30), range(16, 40), range(2, 15)).map(([N, a, d]) => [N, a * 500, d * 100]).filter(([N, a, d]) => a + (N + 1) * d <= 100000), (p) => [p[0], p[2]]),
  build: (t, prm) => {
    const [N, a, d] = prm; const M = a + (N + 1) * d;
    return AQ(t, `The average monthly salary of ${N} workers is ₹${n(a)}. When the supervisor's salary is added, the average rises by ₹${n(d)}. What is the supervisor's salary?`,
      `${N} कर्मचारियों का औसत मासिक वेतन ₹${n(a)} है। पर्यवेक्षक का वेतन जोड़ने पर औसत ₹${n(d)} बढ़ जाता है। पर्यवेक्षक का वेतन कितना है?`,
      M, [a + N * d, a + d, a + (N - 1) * d].filter((v) => v !== M), () => (a + d) * (N + 1) - a * N,
      `The supervisor brings the average of ₹${n(a + d)} for ${N + 1} people: ₹${n(a + d)} for himself plus ₹${n(d)} for each of the other ${N}. Salary = ${n(a + d)} + ${N} × ${n(d)} = ₹${n(M)}.`,
      `पर्यवेक्षक ${N + 1} लोगों का औसत ₹${n(a + d)} बनाता है: अपने लिए ₹${n(a + d)} और बाकी ${N} में से हर एक के लिए ₹${n(d)}। वेतन = ${n(a + d)} + ${N} × ${n(d)} = ₹${n(M)}।`, "rs", 100);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
// A bowler: W wickets at r runs a wicket; then w wickets for x runs, and
// the average falls by d.
const bowler = {
  id: "bowler", levels: ["hard", "advanced"],
  cands: () => {
    const out = [];
    for (const W of range(40, 150, 5)) for (const r of range(10, 20, 0.2)) for (const w of [3, 4, 5, 6]) for (const x of range(10, 40)) {
      const d = clean(r - (W * r + x) / (W + w));
      if (d > 0 && d <= 1 && isInt(d * 10) && isInt(clean(W * r)) && x / w < r) out.push([W, r, w, x]);
    }
    return thin(out, (p) => [p[0], p[2]]);
  },
  build: (t, prm) => {
    const [W, r, w, x] = prm; const d = clean(r - (W * r + x) / (W + w));
    return AQ(t, `A bowler's average is ${n(r)} runs per wicket. In his next match he takes ${w} wickets for ${x} runs, and his average falls by ${n(d)}. How many wickets had he taken before this match?`,
      `एक गेंदबाज़ का औसत ${n(r)} रन प्रति विकेट है। अगले मैच में वह ${x} रन देकर ${w} विकेट लेता है, जिससे उसका औसत ${n(d)} घट जाता है। इस मैच से पहले उसने कितने विकेट लिए थे?`,
      W, [W + w, W - w, W + 5].filter((v) => v !== W && v > 0), () => (w * (r - d) - x) / d,
      `With W wickets before: ${n(r)}W + ${x} = ${n(r - d)}(W + ${w}). So ${n(d)}W = ${w} × ${n(r - d)} − ${x} = ${n(w * (r - d) - x)}, and W = ${n(w * (r - d) - x)} ÷ ${n(d)} = ${W}.`,
      `पहले W विकेट हों: ${n(r)}W + ${x} = ${n(r - d)}(W + ${w})। अतः ${n(d)}W = ${w} × ${n(r - d)} − ${x} = ${n(w * (r - d) - x)}, और W = ${n(w * (r - d) - x)} ÷ ${n(d)} = ${W}।`, "none", 5);
  },
};

const highLow = {
  id: "highLow", levels: ["hard", "advanced"],
  cands: () => thin(cross([20, 25, 30, 32, 36, 40, 44, 46, 50], range(35, 60), range(100, 190), range(-4, -1)).map(([N, A, D, d]) => [N, A, D, A + d]).filter(([N, A, D, B]) => { const S = N * A - (N - 2) * B; const H = (S + D) / 2, Lw = (S - D) / 2; return isInt(H) && Lw >= 0 && H <= 200; }), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [N, A, D, B] = prm; const S = N * A - (N - 2) * B; const H = (S + D) / 2, Lw = (S - D) / 2;
    return AQ(t, `A batsman's average over ${N} innings is ${A} runs. His highest score exceeds his lowest score by ${D} runs. If these two innings are left out, his average over the remaining ${N - 2} innings is ${B} runs. What is his highest score?`,
      `${N} पारियों में एक बल्लेबाज़ का औसत ${A} रन है। उसका सर्वाधिक स्कोर न्यूनतम स्कोर से ${D} रन अधिक है। इन दो पारियों को छोड़ देने पर शेष ${N - 2} पारियों का औसत ${B} रन है। उसका सर्वाधिक स्कोर क्या है?`,
      H, [Lw, S, D + Lw / 2].filter((v) => v !== H && isInt(v) && v > 0), () => ((A * N - B * (N - 2)) + D) / 2,
      `Highest + lowest = ${N} × ${A} − ${N - 2} × ${B} = ${N * A} − ${(N - 2) * B} = ${S}. Highest − lowest = ${D}. So the highest = (${S} + ${D}) ÷ 2 = ${H}.`,
      `सर्वाधिक + न्यूनतम = ${N} × ${A} − ${N - 2} × ${B} = ${N * A} − ${(N - 2) * B} = ${S}। सर्वाधिक − न्यूनतम = ${D}। अतः सर्वाधिक = (${S} + ${D}) ÷ 2 = ${H}।`, "run", 2);
  },
};

const passFail = {
  id: "passFail", levels: ["hard", "advanced"],
  cands: () => thin(cross([60, 80, 100, 120, 150, 200], range(45, 75), range(10, 30), range(30, 60)).filter(([N, p, f, c]) => f < c && c < p && isInt(N * (c - f) / (p - f)) && N * (c - f) / (p - f) < N), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [N, p, f, c] = prm; const P = N * (c - f) / (p - f);
    return AQ(t, `In an examination taken by ${N} candidates, the average mark is ${c}. The average mark of those who passed is ${p} and of those who failed is ${f}. How many candidates passed?`,
      `${N} परीक्षार्थियों की एक परीक्षा में औसत अंक ${c} हैं। उत्तीर्ण परीक्षार्थियों के औसत अंक ${p} और अनुत्तीर्ण के ${f} हैं। कितने परीक्षार्थी उत्तीर्ण हुए?`,
      P, [N - P, N * (p - c) / (p - f) + 1, P + 10].filter((v) => v !== P && v > 0), () => (c * N - f * N) / (p - f),
      `With P passing: ${p}P + ${f}(${N} − P) = ${c} × ${N}. So ${p - f}P = ${c * N} − ${f * N} = ${(c - f) * N}, and P = ${(c - f) * N} ÷ ${p - f} = ${P}.`,
      `P उत्तीर्ण हों: ${p}P + ${f}(${N} − P) = ${c} × ${N}। अतः ${p - f}P = ${c * N} − ${f * N} = ${(c - f) * N}, और P = ${(c - f) * N} ÷ ${p - f} = ${P}।`, "none", 5);
  },
};

const newGroupAvg = {
  id: "newGroupAvg", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross([20, 24, 25, 30, 32, 35, 40], range(40, 60), [4, 5, 6, 8, 10, 12, 15], range(-4, 4)).map(([n1, a1, n2, d]) => [n1, a1, n2, a1 + d]).filter(([n1, a1, n2, b]) => b !== a1 && dec2(((n1 + n2) * b - n1 * a1) / n2) && Math.abs(((n1 + n2) * b - n1 * a1) / n2 - a1) <= 12), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [n1, a1, n2, b] = prm; const X = clean(((n1 + n2) * b - n1 * a1) / n2);
    return AQ(t, `The average weight of ${n1} students in a class is ${a1} kg. When ${n2} new students join, the average weight of the class becomes ${b} kg. What is the average weight of the new students?`,
      `एक कक्षा के ${n1} विद्यार्थियों का औसत भार ${a1} kg है। ${n2} नए विद्यार्थियों के आने पर कक्षा का औसत भार ${b} kg हो जाता है। नए विद्यार्थियों का औसत भार क्या है?`,
      X, [2 * b - a1, b + (b - a1), a1 - (a1 - b) * n2 / n1].filter((v) => v !== X && v > 20), () => (b * (n1 + n2) - a1 * n1) / n2,
      `Before: ${n1} × ${a1} = ${n1 * a1} kg. After: ${n1 + n2} × ${b} = ${(n1 + n2) * b} kg. The ${n2} newcomers weigh ${(n1 + n2) * b - n1 * a1} kg, an average of ${(n1 + n2) * b - n1 * a1} ÷ ${n2} = ${n(X)} kg.`,
      `पहले: ${n1} × ${a1} = ${n1 * a1} kg। बाद में: ${n1 + n2} × ${b} = ${(n1 + n2) * b} kg। ${n2} नए विद्यार्थियों का भार ${(n1 + n2) * b - n1 * a1} kg, औसत ${(n1 + n2) * b - n1 * a1} ÷ ${n2} = ${n(X)} kg।`, "kg", 1);
  },
};

const KINDS = guard([
  replaceOne, combineGroups, costAvg, mixPrice, batsmanNew, batsmanNeed, salaryAdd, replaceValue, groupFind, threeSections,
  replaceTwo, countFromAvgs, batsmanOld, twoInnings, pctFromAvgs, ratioFromAvgs, salaryRaise, newGroupAvg,
  bowler, highLow, passFail,
]);

const PREFIX = "Average · Replacement and Weighted Average";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
