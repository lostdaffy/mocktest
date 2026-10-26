// Percentage · Mixed Practice (the whole chapter): the classic exam kinds
// that belong to no one topic - pass marks, elections, failing in two
// subjects, the error from multiplying by the wrong fraction, water in fresh
// and dried fruit, adding water to a mixture - plus some kinds of the
// chapter's topics, which never reuse a set of numbers already used there
// (one shared list for the whole chapter). Medium, hard and advanced only:
// the easy series was complete. Every answer is worked out again in `v`.
const { Q, P } = require("./pct-builders");
const { choices } = require("./pct-adv-builders");
const { fillTopic } = require("./gen");
const pop = require("./pc-pop");
const ie = require("./pc-ie");
const { n, pct, clean, isInt } = P;
const stepOf = (x) => 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(x) || 1)) - 1);
const whole = (x) => isInt(clean(x));
const cross = (...lists) => lists.reduce((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
const nicePct = (x) => !/\d \d/.test(pct(clean(x)));
const num = (x) => n(Math.round(x));
const near2 = (x) => isInt(clean(x) * 100);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

const marksPass = {
  id: "marksPass", levels: ["medium", "hard"],
  cands: () => cross([200, 250, 300, 400, 500, 600, 750, 800, 900, 1000, 1200], [30, 33, 35, 36, 40, 45, 50], [8, 10, 12, 15, 18, 20, 24, 25, 30, 40]).filter(([M, p, f]) => whole(M * p / 100) && M * p / 100 - f > 0),
  build: (t, [M, p, f]) => {
    const pass = clean(M * p / 100), m = pass - f;
    return Q(t, `A student needs ${p}% of the total marks to pass. He scores ${m} marks and fails by ${f} marks. What are the maximum marks?`,
      `एक छात्र को उत्तीर्ण होने के लिए कुल अंकों के ${p}% चाहिए। वह ${m} अंक लाता है और ${f} अंकों से अनुत्तीर्ण हो जाता है। अधिकतम अंक कितने हैं?`,
      choices(M, num, [m * 100 / p, (m - f) * 100 / p, pass * 100 / (100 - p)], { step: stepOf(M) * 5 }), 0, () => num(clean((m + f) * 100 / p)),
      `Pass marks = ${m} + ${f} = ${pass}, which is ${p}% of the maximum. Maximum = ${pass} × 100/${p} = ${num(M)}.`,
      `उत्तीर्णांक = ${m} + ${f} = ${pass}, जो अधिकतम अंकों का ${p}% है। अधिकतम अंक = ${pass} × 100/${p} = ${num(M)}।`);
  },
};

const votes2 = {
  id: "votes2", levels: ["medium"],
  cands: () => cross([4000, 5000, 6000, 8000, 10000, 12000, 15000, 16000, 20000, 24000, 25000, 30000, 40000, 50000, 60000, 75000, 80000], [52, 54, 55, 56, 58, 60, 62, 65, 70]).filter(([V, p]) => whole(V * (2 * p - 100) / 100)),
  build: (t, [V, p]) => {
    const D = clean(V * (2 * p - 100) / 100);
    return Q(t, `In an election between two candidates, the winner gets ${p}% of the votes and wins by ${n(D)} votes. How many votes were cast?`,
      `दो उम्मीदवारों के बीच एक चुनाव में विजेता को ${p}% मत मिलते हैं और वह ${n(D)} मतों से जीतता है। कुल कितने मत डाले गए?`,
      choices(V, num, [D * 100 / p, D * 100 / (p - 50), D * 100 / (100 - p)], { step: stepOf(V) }), 0, () => num(clean(D * 100 / (2 * p - 100))),
      `The winner has ${p}% and the loser ${100 - p}%, a gap of ${2 * p - 100}% of the votes = ${n(D)}. Total = ${n(D)} × 100/${2 * p - 100} = ${num(V)}.`,
      `विजेता को ${p}% और हारने वाले को ${100 - p}% मत, यानी कुल मतों का ${2 * p - 100}% अंतर = ${n(D)}। कुल मत = ${n(D)} × 100/${2 * p - 100} = ${num(V)}।`);
  },
};

const votesInvalid = {
  id: "votesInvalid", levels: ["hard", "advanced"],
  cands: () => cross([10000, 12000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 80000, 100000], [5, 10, 15, 20, 25], [55, 60, 65, 70]).filter(([V, inv, p]) => whole(V * (100 - inv) / 100 * (2 * p - 100) / 100)),
  build: (t, [V, inv, p]) => {
    const valid = clean(V * (100 - inv) / 100), D = clean(valid * (2 * p - 100) / 100), k = clean((100 - inv) / 100 * (2 * p - 100) / 100);
    return Q(t, `In an election between two candidates, ${inv}% of the votes cast were invalid. The winner got ${p}% of the valid votes and won by ${n(D)} votes. How many votes were cast in all?`,
      `दो उम्मीदवारों के बीच एक चुनाव में डाले गए ${inv}% मत अमान्य थे। विजेता को मान्य मतों का ${p}% मिला और वह ${n(D)} मतों से जीता। कुल कितने मत डाले गए?`,
      choices(V, num, [valid, D * 100 / (2 * p - 100), D * 100 / p], { step: stepOf(V) }), 0, () => num(clean(D / k)),
      `Valid votes are ${100 - inv}% of the total. The gap is ${p}% − ${100 - p}% = ${2 * p - 100}% of the valid votes, i.e. ${n((100 - inv) / 100)} × ${n((2 * p - 100) / 100)} = ${n(k)} of the total = ${n(D)}. Total = ${n(D)} ÷ ${n(k)} = ${num(V)}.`,
      `मान्य मत कुल का ${100 - inv}% हैं। अंतर = मान्य मतों का ${p}% − ${100 - p}% = ${2 * p - 100}%, यानी कुल का ${n((100 - inv) / 100)} × ${n((2 * p - 100) / 100)} = ${n(k)} = ${n(D)}। कुल मत = ${n(D)} ÷ ${n(k)} = ${num(V)}।`);
  },
};

const votes3 = {
  id: "votes3", levels: ["advanced"],
  cands: () => cross([20000, 25000, 40000, 50000, 60000, 80000, 100000, 120000, 150000, 200000], [10, 15, 20, 25], [5, 10, 20], [55, 60, 65]).filter(([V, nv, inv, p]) => whole(V * (100 - nv) / 100 * (100 - inv) / 100 * (2 * p - 100) / 100) && whole(V * (100 - nv) / 100) && whole(V * (100 - nv) / 100 * (100 - inv) / 100)),
  build: (t, [V, nv, inv, p]) => {
    const cast = clean(V * (100 - nv) / 100), valid = clean(cast * (100 - inv) / 100), D = clean(valid * (2 * p - 100) / 100);
    const k = clean((100 - nv) / 100 * (100 - inv) / 100 * (2 * p - 100) / 100);
    return Q(t, `On a voters' list, ${nv}% of the voters did not vote and ${inv}% of the votes cast were invalid. Of the valid votes, the winner of a two-way contest got ${p}% and won by ${n(D)} votes. How many voters are on the list?`,
      `एक मतदाता सूची के ${nv}% मतदाताओं ने मत नहीं डाला, और डाले गए मतों में से ${inv}% अमान्य थे। दो उम्मीदवारों के मुकाबले में विजेता को मान्य मतों का ${p}% मिला और वह ${n(D)} मतों से जीता। सूची में कितने मतदाता हैं?`,
      choices(V, num, [cast, valid, D * 100 / (2 * p - 100) / ((100 - inv) / 100)], { step: stepOf(V) }), 0, () => num(clean(D / k)),
      `The winning gap is ${2 * p - 100}% of the valid votes, which are ${100 - inv}% of the ${100 - nv}% who voted: ${n((100 - nv) / 100)} × ${n((100 - inv) / 100)} × ${n((2 * p - 100) / 100)} = ${n(k)} of the list = ${n(D)}. List = ${n(D)} ÷ ${n(k)} = ${num(V)} (voted ${n(cast)}, valid ${n(valid)}).`,
      `जीत का अंतर मान्य मतों का ${2 * p - 100}% है, और मान्य मत, मत डालने वाले ${100 - nv}% का ${100 - inv}% हैं: ${n((100 - nv) / 100)} × ${n((100 - inv) / 100)} × ${n((2 * p - 100) / 100)} = सूची का ${n(k)} = ${n(D)}। सूची = ${n(D)} ÷ ${n(k)} = ${num(V)} (मत डाले ${n(cast)}, मान्य ${n(valid)})।`);
  },
};

const ratioFromPercent = {
  id: "ratioFromPercent", levels: ["medium"],
  cands: () => cross([10, 12, 15, 16, 20, 24, 25, 30, 35, 40, 45, 48, 50, 60, 64, 75, 80], [10, 12, 15, 16, 20, 24, 25, 30, 32, 40, 45, 50, 60, 75, 80]).filter(([a, b]) => a !== b && nicePct(a / b * 100)),
  build: (t, [a, b]) => {
    const v = clean(a / b * 100);
    return Q(t, `${a}% of a number A is equal to ${b}% of a number B. What percentage of A is B?`,
      `संख्या A का ${a}%, संख्या B के ${b}% के बराबर है। B, A का कितना प्रतिशत है?`,
      choices(v, pct, [b / a * 100, a + b, Math.abs(a - b) + 100], { step: 5 }), 0, () => pct(v),
      `${a}/100 × A = ${b}/100 × B, so B = ${a}/${b} × A = ${pct(v)} of A.`,
      `${a}/100 × A = ${b}/100 × B, अतः B = ${a}/${b} × A, यानी A का ${pct(v)}।`);
  },
};

const examBoth = {
  id: "examBoth", levels: ["medium"],
  cands: () => cross([15, 20, 25, 30, 35, 40, 45], [10, 15, 20, 25, 30, 35], [5, 8, 10, 12, 15, 20]).filter(([h, e, b]) => h !== e && b < Math.min(h, e) && h + e - b < 90),
  build: (t, [h, e, b]) => {
    const pass = 100 - (h + e - b);
    return Q(t, `In an examination, ${h}% of the students failed in Hindi, ${e}% failed in English and ${b}% failed in both. What percentage of the students passed in both subjects?`,
      `एक परीक्षा में ${h}% छात्र हिंदी में, ${e}% अंग्रेज़ी में और ${b}% दोनों में अनुत्तीर्ण हुए। कितने प्रतिशत छात्र दोनों विषयों में उत्तीर्ण हुए?`,
      choices(pass, pct, [100 - h - e, 100 - h - e - b, h + e - b], { step: 5 }), 0, () => pct(pass),
      `Failed in at least one subject: ${h}% + ${e}% − ${b}% = ${h + e - b}% (those failing in both are counted twice). Passed in both: 100% − ${h + e - b}% = ${pct(pass)}.`,
      `कम से कम एक विषय में अनुत्तीर्ण: ${h}% + ${e}% − ${b}% = ${h + e - b}% (दोनों में अनुत्तीर्ण दो बार गिने गए)। दोनों में उत्तीर्ण: 100% − ${h + e - b}% = ${pct(pass)}।`);
  },
};

const examBothCount = {
  id: "examBothCount", levels: ["hard", "advanced"],
  cands: () => cross([20, 25, 30, 35, 40], [15, 20, 25, 30, 35], [5, 10, 12, 15], [200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500]).filter(([h, e, b, N]) => h !== e && b < Math.min(h, e) && h + e - b < 80 && whole(N * (100 - h - e + b) / 100)),
  build: (t, [h, e, b, N]) => {
    const pp = 100 - (h + e - b), passed = clean(N * pp / 100);
    return Q(t, `In an examination, ${h}% of the candidates failed in Mathematics, ${e}% failed in Science and ${b}% failed in both. If ${n(passed)} candidates passed in both subjects, how many candidates appeared?`,
      `एक परीक्षा में ${h}% परीक्षार्थी गणित में, ${e}% विज्ञान में और ${b}% दोनों में अनुत्तीर्ण हुए। यदि ${n(passed)} परीक्षार्थी दोनों विषयों में उत्तीर्ण हुए, तो कुल कितने परीक्षार्थी बैठे?`,
      choices(N, num, [passed * 100 / (100 - h - e), passed * 100 / (h + e - b), passed * (100 + h + e - b) / 100], { step: stepOf(N) * 5 }), 0, () => num(clean(passed * 100 / pp)),
      `Failed in at least one: ${h}% + ${e}% − ${b}% = ${h + e - b}%, so ${pp}% passed in both. ${pp}% of the candidates = ${n(passed)}, so candidates = ${n(passed)} × 100/${pp} = ${num(N)}.`,
      `कम से कम एक में अनुत्तीर्ण: ${h}% + ${e}% − ${b}% = ${h + e - b}%, अतः ${pp}% दोनों में उत्तीर्ण। ${pp}% = ${n(passed)}, अतः परीक्षार्थी = ${n(passed)} × 100/${pp} = ${num(N)}।`);
  },
};

const marksRise = {
  id: "marksRise", levels: ["medium"],
  cands: () => cross([40, 45, 48, 50, 55, 60, 64, 70, 72, 75, 80], [50, 54, 56, 60, 64, 66, 70, 72, 75, 80, 84, 88, 90, 96]).filter(([x, y]) => y > x && nicePct((y - x) / x * 100)),
  build: (t, [x, y]) => {
    const v = clean((y - x) / x * 100);
    return Q(t, `A student's score rose from ${x}% of the maximum marks in one test to ${y}% in the next (both tests had the same maximum). By what percentage did his marks increase?`,
      `एक छात्र के अंक एक परीक्षा में अधिकतम अंकों के ${x}% से बढ़कर अगली परीक्षा में ${y}% हो गए (दोनों परीक्षाओं के अधिकतम अंक समान थे)। उसके अंक कितने प्रतिशत बढ़े?`,
      choices(v, pct, [y - x, (y - x) / y * 100, (y - x) * 2], { step: 5 }), 0, () => pct(v),
      `The rise is ${y - x} percentage points on a starting ${x}: ${y - x} ÷ ${x} × 100 = ${pct(v)}. (It is not ${y - x}% - that is the rise in percentage points.)`,
      `वृद्धि ${y - x} प्रतिशत-अंक है, शुरुआती ${x} पर: ${y - x} ÷ ${x} × 100 = ${pct(v)}। (यह ${y - x}% नहीं है - वह प्रतिशत-अंकों में वृद्धि है।)`);
  },
};

const playShare = {
  id: "playShare", levels: ["medium"],
  cands: () => cross([30, 35, 40, 45, 55, 60], [20, 25, 30, 40, 50, 60], [20, 25, 30, 40, 50, 60]).filter(([g, a, b]) => a !== b && near2(g * a / 100 + (100 - g) * b / 100)),
  build: (t, [g, a, b]) => {
    const v = clean(g * a / 100 + (100 - g) * b / 100);
    return Q(t, `In a school, ${g}% of the students are girls. ${a}% of the girls and ${b}% of the boys play a sport. What percentage of all the students play a sport?`,
      `एक विद्यालय में ${g}% छात्र लड़कियाँ हैं। ${a}% लड़कियाँ और ${b}% लड़के कोई खेल खेलते हैं। कुल छात्रों में से कितने प्रतिशत कोई खेल खेलते हैं?`,
      choices(v, pct, [(a + b) / 2, a + b, g * a / 100 + g * b / 100], { step: 3 }), 0, () => pct(v),
      `Take 100 students: ${g} girls and ${100 - g} boys. Players: ${a}% of ${g} = ${n(g * a / 100)} and ${b}% of ${100 - g} = ${n((100 - g) * b / 100)}, together ${n(v)} of 100 = ${pct(v)}.`,
      `100 छात्र लें: ${g} लड़कियाँ और ${100 - g} लड़के। खिलाड़ी: ${g} का ${a}% = ${n(g * a / 100)} और ${100 - g} का ${b}% = ${n((100 - g) * b / 100)}, कुल 100 में ${n(v)} = ${pct(v)}।`);
  },
};

const lessThan = {
  id: "lessThan", levels: ["medium"],
  cands: () => cross([200, 250, 300, 400, 450, 500, 600, 750, 800, 900, 1200, 1500], [15, 20, 25, 30, 35, 40], [40, 45, 50, 55, 60, 65, 70]).filter(([N, x, y]) => y > x && whole(N * (y - x) / 100)),
  build: (t, [N, x, y]) => {
    const D = clean(N * (y - x) / 100);
    return Q(t, `${x}% of a number is ${n(D)} less than ${y}% of the same number. What is the number?`,
      `किसी संख्या का ${x}%, उसी संख्या के ${y}% से ${n(D)} कम है। संख्या क्या है?`,
      choices(N, num, [D * 100 / x, D * 100 / y, D * 100 / (x + y)], { step: stepOf(N) * 5 }), 0, () => num(clean(D * 100 / (y - x))),
      `The gap is ${y}% − ${x}% = ${y - x}% of the number = ${n(D)}. The number = ${n(D)} × 100/${y - x} = ${num(N)}.`,
      `अंतर = संख्या का ${y}% − ${x}% = ${y - x}% = ${n(D)}। संख्या = ${n(D)} × 100/${y - x} = ${num(N)}।`);
  },
};

const wrongOp = {
  id: "wrongOp", levels: ["medium", "hard"],
  cands: () => [2, 4, 5, 10, 20, 25].map((a) => [a, 0]).concat(
    [[1, 2], [2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [4, 7], [5, 6], [5, 7], [5, 8], [4, 9], [8, 9]].filter(([a, b]) => nicePct((b * b - a * a) / (a * a) * 100))
  ),
  build: (t, prm) => {
    const [a, b] = prm;
    if (!b) {
      const v = clean((1 - 1 / (a * a)) * 100);
      return Q(t, `A number was to be multiplied by ${a}, but by mistake it was divided by ${a}. What is the percentage error in the result?`,
        `एक संख्या को ${a} से गुणा करना था, पर गलती से ${a} से भाग दे दिया गया। परिणाम में कितने प्रतिशत की त्रुटि है?`,
        choices(v, pct, [100 - 100 / a, (a - 1) * 100, 100 / (a * a)], { step: 2 }), 0, () => pct(v),
        `Take the number as ${n(a * a)}. Right answer: ${n(a * a)} × ${a} = ${n(a ** 3)}. Wrong answer: ${n(a * a)} ÷ ${a} = ${a}. Error: ${n(a ** 3 - a)} on ${n(a ** 3)}: ${n(a ** 3 - a)} ÷ ${n(a ** 3)} × 100 = ${pct(v)}.`,
        `संख्या ${n(a * a)} लें। सही उत्तर: ${n(a * a)} × ${a} = ${n(a ** 3)}। गलत उत्तर: ${n(a * a)} ÷ ${a} = ${a}। त्रुटि: ${n(a ** 3)} पर ${n(a ** 3 - a)}: ${n(a ** 3 - a)} ÷ ${n(a ** 3)} × 100 = ${pct(v)}।`);
    }
    // multiplied by b/a instead of a/b (a < b): error relative to the right answer
    const right = a / b, wrong = b / a, v = clean((wrong - right) / right * 100);
    return Q(t, `Instead of multiplying a number by ${a}/${b}, a student multiplied it by ${b}/${a}. By what percentage is his answer more than the correct one?`,
      `किसी संख्या को ${a}/${b} से गुणा करने के बजाय एक छात्र ने उसे ${b}/${a} से गुणा कर दिया। उसका उत्तर सही उत्तर से कितने प्रतिशत अधिक है?`,
      choices(v, pct, [(wrong - right) / wrong * 100, (b - a) / a * 100, (b * b - a * a) / (b * b) * 100], { step: 5 }), 0, () => pct(v),
      `Take the number as ${a * b}. Correct: ${a * b} × ${a}/${b} = ${a * a}. His: ${a * b} × ${b}/${a} = ${b * b}. More by ${b * b - a * a} on ${a * a}: ${b * b - a * a} ÷ ${a * a} × 100 = ${pct(v)}.`,
      `संख्या ${a * b} लें। सही: ${a * b} × ${a}/${b} = ${a * a}। उसका: ${a * b} × ${b}/${a} = ${b * b}। ${a * a} पर ${b * b - a * a} अधिक: ${b * b - a * a} ÷ ${a * a} × 100 = ${pct(v)}।`);
  },
};

const passRatio = {
  id: "passRatio", levels: ["hard", "advanced"],
  cands: () => cross([3, 4, 5, 3, 2], [2, 3, 1, 4], [50, 60, 65, 70, 75, 80], [50, 60, 70, 75, 80, 90]).filter(([rb, rg, pb, pg]) => rb !== rg && gcd(rb, rg) === 1 && pb !== pg && nicePct((rb * pb + rg * pg) / (rb + rg))),
  build: (t, [rb, rg, pb, pg]) => {
    const v = clean((rb * pb + rg * pg) / (rb + rg));
    return Q(t, `In an examination, the numbers of boys and girls are in the ratio ${rb} : ${rg}. ${pb}% of the boys and ${pg}% of the girls passed. What percentage of all the candidates passed?`,
      `एक परीक्षा में लड़कों और लड़कियों की संख्या का अनुपात ${rb} : ${rg} है। ${pb}% लड़के और ${pg}% लड़कियाँ उत्तीर्ण हुए। कुल परीक्षार्थियों में से कितने प्रतिशत उत्तीर्ण हुए?`,
      choices(v, pct, [(pb + pg) / 2, (rg * pb + rb * pg) / (rb + rg), pb + pg - 100], { step: 2 }), 0, () => pct(v),
      `Take ${rb * 100} boys and ${rg * 100} girls. Passed: ${pb}% of ${rb * 100} = ${rb * pb} and ${pg}% of ${rg * 100} = ${rg * pg}, i.e. ${rb * pb + rg * pg} of ${(rb + rg) * 100} = ${pct(v)}.`,
      `${rb * 100} लड़के और ${rg * 100} लड़कियाँ लें। उत्तीर्ण: ${rb * 100} का ${pb}% = ${rb * pb} और ${rg * 100} का ${pg}% = ${rg * pg}, यानी ${(rb + rg) * 100} में ${rb * pb + rg * pg} = ${pct(v)}।`);
  },
};

const waterContent = {
  id: "waterContent", levels: ["hard", "advanced"],
  cands: () => cross([20, 30, 40, 50, 60, 80, 100, 120, 150, 200], [80, 84, 85, 88, 90, 92, 95], [10, 12, 15, 16, 20, 25, 40, 50, 60]).filter(([W, fw, dw]) => near2(W * (100 - fw) / (100 - dw))),
  build: (t, [W, fw, dw]) => {
    const fruit = [["grapes", "ताज़े अंगूर", "raisins", "किशमिश"], ["plums", "ताज़े आलूबुखारे", "prunes", "सूखे आलूबुखारे"], ["apricots", "ताज़ी खुबानी", "dried apricots", "सूखी खुबानी"], ["figs", "ताज़े अंजीर", "dried figs", "सूखे अंजीर"]][(W + fw + dw) % 4];
    const solid = clean(W * (100 - fw) / 100), d = clean(solid * 100 / (100 - dw));
    return Q(t, `Fresh ${fruit[0]} contain ${fw}% water, and ${fruit[2]} contain ${dw}% water. How many kilograms of ${fruit[2]} can be made from ${W} kg of fresh ${fruit[0]}?`,
      `${fruit[1]} में ${fw}% पानी होता है, और ${fruit[3]} में ${dw}% पानी। ${W} kg ${fruit[1]} से कितने किलोग्राम ${fruit[3]} बनेंगे?`,
      choices(d, (x) => n(clean(x)), [W * (100 - fw) / 100, W * (dw / fw), W * (100 - fw + dw) / 100], { step: 1, near: 0.05 }), 0, () => n(d),
      `The pulp (not water) does not change: ${100 - fw}% of ${W} kg = ${n(solid)} kg. In the dried fruit it is ${100 - dw}% of the weight, so the weight is ${n(solid)} × 100/${100 - dw} = ${n(d)} kg.`,
      `गूदा (पानी के अलावा) नहीं बदलता: ${W} kg का ${100 - fw}% = ${n(solid)} kg। सूखे फल में यह भार का ${100 - dw}% है, अतः भार = ${n(solid)} × 100/${100 - dw} = ${n(d)} kg।`);
  },
};

const twoAboveThird = {
  id: "twoAboveThird", levels: ["hard", "advanced"],
  cands: () => cross([10, 20, 25, 30, 40, 50, 60, 75, 80], [10, 20, 25, 30, 40, 50, 60, 75, 80]).filter(([a, b]) => a !== b && nicePct((100 + a) / (100 + b) * 100)),
  build: (t, [a, b]) => {
    const v = clean((100 + a) / (100 + b) * 100);
    return Q(t, `Two numbers are ${a}% and ${b}% more than a third number. What percentage of the second number is the first?`,
      `दो संख्याएँ एक तीसरी संख्या से क्रमशः ${a}% और ${b}% अधिक हैं। पहली संख्या, दूसरी संख्या का कितना प्रतिशत है?`,
      choices(v, pct, [a / b * 100, 100 + a - b, (100 + b) / (100 + a) * 100], { step: 5 }), 0, () => pct(v),
      `Take the third number as 100: the first is ${100 + a}, the second ${100 + b}. ${100 + a} ÷ ${100 + b} × 100 = ${pct(v)}.`,
      `तीसरी संख्या 100 लें: पहली ${100 + a}, दूसरी ${100 + b}। ${100 + a} ÷ ${100 + b} × 100 = ${pct(v)}।`);
  },
};

const mixtureWater = {
  id: "mixtureWater", levels: ["hard", "advanced"],
  cands: () => cross([20, 30, 40, 50, 60, 80, 90, 100, 120], [5, 10, 15, 20, 25], [20, 25, 30, 40, 50]).filter(([V, s, tg]) => tg > s && near2(V * (tg - s) / (100 - tg))),
  build: (t, [V, s, tg]) => {
    const w = clean(V * (tg - s) / (100 - tg)), milk = clean(V * (100 - s) / 100);
    return Q(t, `A ${V}-litre mixture of milk and water has ${s}% water. How many litres of water must be added to make the water ${tg}% of the mixture?`,
      `दूध और पानी के ${V} लीटर मिश्रण में ${s}% पानी है। कितने लीटर पानी मिलाया जाए कि मिश्रण में पानी ${tg}% हो जाए?`,
      choices(w, (x) => n(clean(x)), [V * (tg - s) / 100, V * (tg - s) / tg, V * tg / 100 - V * s / 100 + 1], { step: 1, near: 0.05 }), 0, () => n(w),
      `The milk stays ${100 - s}% of ${V} = ${n(milk)} litres. When water is ${tg}%, milk is ${100 - tg}%, so the mixture is ${n(milk)} × 100/${100 - tg} = ${n(V + w)} litres. Water to add: ${n(V + w)} − ${V} = ${n(w)} litres.`,
      `दूध ${V} का ${100 - s}% = ${n(milk)} लीटर ही रहता है। जब पानी ${tg}% हो, दूध ${100 - tg}% होगा, अतः मिश्रण = ${n(milk)} × 100/${100 - tg} = ${n(V + w)} लीटर। मिलाना है: ${n(V + w)} − ${V} = ${n(w)} लीटर।`);
  },
};

// Kinds of the chapter's topics, asked again here with numbers not used there.
const clone = (k, levels) => ({ ...k, levels });
const fromTopics = (list, levels) => list.map((id) => {
  const k = [...pop.KINDS, ...ie.KINDS].find((x) => x.id === id);
  if (!k) throw new Error(`no kind ${id}`);
  return clone(k, levels);
});

const KINDS = [
  marksPass, votes2, votesInvalid, votes3, ratioFromPercent, examBoth, examBothCount, marksRise, playShare, lessThan, wrongOp, passRatio, waterContent, twoAboveThird, mixtureWater,
  ...fromTopics(["popAgo2", "migration1", "remainder", "bothRise"], ["medium"]),
  ...fromTopics(["back3", "giftsChain", "literacy"], ["hard"]),
  ...fromTopics(["gendersBack", "findSpendShare", "savingsFromIncrease", "thirdYearInc"], ["advanced"]),
];
for (const k of [marksPass]) k.levels.push("advanced");

const PREFIX = "Percentage · Mixed Practice";
const topic = () => { ie.topic(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: pop.USED, levels: ["medium", "hard", "advanced"] }); };
module.exports = { KINDS, topic, PREFIX };
