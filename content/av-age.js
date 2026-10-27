// Average · Average Age: every kind of question, level by level. Ages are
// those of real people (a teacher 25-60, a child under 12). Every answer is
// worked out again in `v` by a different route; the wrong options are the
// usual slips (forgetting that every member gets older, dividing by the old
// count, adding the change once instead of to everyone).
const L = require("./av-lib");
const { n, clean, isInt, cross, who, AQ, thin, pick, range, dec2, guard } = L;
const { fillTopic } = require("./gen");

const yr = (x) => (clean(x) === 1 ? "1 year" : `${n(x)} years`);
// (N) => "the N students of a class", in English and Hindi.
// Real ages for each group: [lowest average, highest average, youngest member, oldest member].
const AGES = [[12, 18, 10, 20], [20, 32, 18, 38], [25, 50, 18, 70], [25, 45, 21, 60]];
const GROUPS = [[(N) => `the ${N} students of a class`, (N) => `एक कक्षा के ${N} विद्यार्थियों`], [(N) => `the ${N} players of a team`, (N) => `एक टीम के ${N} खिलाड़ियों`], [(N) => `the ${N} members of a club`, (N) => `एक क्लब के ${N} सदस्यों`], [(N) => `the ${N} workers in an office`, (N) => `एक कार्यालय के ${N} कर्मचारियों`]];

// ---------------------------------------------------------------- EASY
const teacherAdd = {
  id: "teacherAdd", levels: ["easy", "medium"],
  cands: () => cross(range(10, 40), range(10, 16), [0.5, 1, 1.5, 2]).filter(([N, a, d]) => { const T = a + (N + 1) * d; return isInt(T) && T >= 25 && T <= 60; }),
  build: (t, prm) => {
    const [N, a, d] = prm; const T = clean(a + (N + 1) * d);
    return AQ(t, `The average age of ${N} students of a class is ${a} years. When the teacher's age is also included, the average rises by ${yr(d)}. How old is the teacher?`,
      `एक कक्षा के ${N} विद्यार्थियों की औसत आयु ${a} वर्ष है। अध्यापक की आयु भी शामिल करने पर औसत ${n(d)} वर्ष बढ़ जाता है। अध्यापक की आयु कितनी है?`,
      T, [a + N * d, a + (N - 1) * d, a + d].filter((v) => v !== T), () => (N + 1) * (a + d) - N * a,
      `Students' total = ${N} × ${a} = ${N * a}. With the teacher, ${N + 1} people average ${n(a + d)}: total ${N + 1} × ${n(a + d)} = ${n((N + 1) * (a + d))}. Teacher = ${n((N + 1) * (a + d))} − ${N * a} = ${n(T)} years.`,
      `विद्यार्थियों की कुल आयु = ${N} × ${a} = ${N * a}। अध्यापक सहित ${N + 1} लोगों का औसत ${n(a + d)}: कुल ${N + 1} × ${n(a + d)} = ${n((N + 1) * (a + d))}। अध्यापक = ${n((N + 1) * (a + d))} − ${N * a} = ${n(T)} वर्ष।`, "yr", 1);
  },
};

const teacherOut = {
  id: "teacherOut", levels: ["easy", "medium"],
  cands: () => cross(range(15, 40), range(12, 18), [0.5, 1, 1.5]).filter(([N, a, d]) => { const T = a + N * d; return isInt(T) && T >= 25 && T <= 60 && dec2(a - d); }),
  build: (t, prm) => {
    const [N, a, d] = prm; const T = clean(a + N * d);
    return AQ(t, `The average age of ${N} students and their teacher is ${a} years. If the teacher's age is left out, the average falls by ${yr(d)}. How old is the teacher?`,
      `${N} विद्यार्थियों और उनके अध्यापक की औसत आयु ${a} वर्ष है। अध्यापक की आयु छोड़ देने पर औसत ${n(d)} वर्ष कम हो जाता है। अध्यापक की आयु कितनी है?`,
      T, [a + (N + 1) * d, a + (N - 1) * d, a + d].filter((v) => v !== T), () => (N + 1) * a - N * (a - d),
      `All ${N + 1} together: ${N + 1} × ${a} = ${(N + 1) * a}. The ${N} students: ${N} × ${n(a - d)} = ${n(N * (a - d))}. Teacher = ${(N + 1) * a} − ${n(N * (a - d))} = ${n(T)} years.`,
      `सभी ${N + 1}: ${N + 1} × ${a} = ${(N + 1) * a}। ${N} विद्यार्थी: ${N} × ${n(a - d)} = ${n(N * (a - d))}। अध्यापक = ${(N + 1) * a} − ${n(N * (a - d))} = ${n(T)} वर्ष।`, "yr", 1);
  },
};

const newJoin = {
  id: "newJoin", levels: ["easy", "medium"],
  cands: () => thin(cross([0, 1, 2, 3], range(5, 24), range(10, 50), [-2, -1, -0.5, 0.5, 1, 2]).map(([g, N, a, d]) => [g, N, a, a + d]).filter(([g, N, a, b]) => { const [lo, hi, y, o] = AGES[g]; const x = (N + 1) * b - N * a; return a >= lo && a <= hi && dec2(b) && isInt(x) && x >= y && x <= o; }), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [g, N, a, b] = prm; const [en, hi] = GROUPS[g]; const x = (N + 1) * b - N * a;
    return AQ(t, `The average age of ${en(N)} is ${a} years. When one more person joins them, the average age becomes ${b} years. How old is the new person?`,
      `${hi(N)} की औसत आयु ${a} वर्ष है। एक और व्यक्ति के जुड़ने पर औसत आयु ${b} वर्ष हो जाती है। नए व्यक्ति की आयु कितनी है?`,
      x, [b + (b - a) * N + (b - a), b - a + a, a + b, N * b - (N - 1) * a].filter((v) => v !== x && v > 0), () => b * (N + 1) - a * N,
      `Total before = ${N} × ${a} = ${N * a}. Total after = ${N + 1} × ${b} = ${(N + 1) * b}. New person = ${(N + 1) * b} − ${N * a} = ${x} years.`,
      `पहले कुल आयु = ${N} × ${a} = ${N * a}। बाद में कुल = ${N + 1} × ${b} = ${(N + 1) * b}। नए व्यक्ति की आयु = ${(N + 1) * b} − ${N * a} = ${x} वर्ष।`, "yr", 1);
  },
};

const leaveOne = {
  id: "leaveOne", levels: ["easy", "medium"],
  cands: () => thin(cross([0, 1, 2, 3], range(5, 20), range(10, 50), range(10, 70)).filter(([g, N, a, x]) => { const [lo, hi, y, o] = AGES[g]; return a >= lo && a <= hi && x >= y && x <= o && Math.abs(x - a) >= 3 && dec2((N * a - x) / (N - 1)); }), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [g, N, a, x] = prm; const [en, hi] = GROUPS[g]; const B = clean((N * a - x) / (N - 1));
    return AQ(t, `The average age of ${en(N)} is ${a} years. One of them, aged ${x} years, leaves. What is the average age of the rest?`,
      `${hi(N)} की औसत आयु ${a} वर्ष है। इनमें से ${x} वर्ष आयु का एक व्यक्ति चला जाता है। शेष की औसत आयु क्या है?`,
      B, [(N * a - x) / N, a - x / N, (N * a + x) / (N + 1)], () => (a * N - x) / (N - 1),
      `Total = ${N} × ${a} = ${N * a}. Without the one who left: ${N * a} − ${x} = ${N * a - x} for ${N - 1} people. Average = ${N * a - x} ÷ ${N - 1} = ${n(B)} years.`,
      `कुल आयु = ${N} × ${a} = ${N * a}। जाने वाले को छोड़कर: ${N * a} − ${x} = ${N * a - x}, ${N - 1} लोगों की। औसत = ${N * a - x} ÷ ${N - 1} = ${n(B)} वर्ष।`, "yr", 1);
  },
};

const yearsShift = {
  id: "yearsShift", levels: ["easy"],
  cands: () => cross([3, 4, 5, 6, 7, 8], range(18, 40), [2, 3, 4, 5, 6, 7, 8, 10], ["ago", "after"]),
  build: (t, prm) => {
    const [N, a, k, dir] = prm; const B = dir === "ago" ? a + k : a + k;
    const q = dir === "ago" ? `${k} years ago, the average age of a family of ${N} members was ${a} years. What is their average age now?` : `The present average age of a family of ${N} members is ${a} years. What will their average age be after ${k} years?`;
    const qh = dir === "ago" ? `${N} सदस्यों वाले एक परिवार की औसत आयु ${k} वर्ष पहले ${a} वर्ष थी। उनकी वर्तमान औसत आयु क्या है?` : `${N} सदस्यों वाले एक परिवार की वर्तमान औसत आयु ${a} वर्ष है। ${k} वर्ष बाद उनकी औसत आयु क्या होगी?`;
    return AQ(t, q, qh, B, [a + N * k, a, a + k * (N - 1)], () => (a * N + k * N) / N,
      `In ${k} years every one of the ${N} members gets ${k} years older, so the total rises by ${N} × ${k} and the average by ${k}: ${a} + ${k} = ${B} years.`,
      `${k} वर्ष में ${N} में से हर सदस्य ${k} वर्ष बड़ा होता है, अतः कुल आयु ${N} × ${k} बढ़ती है और औसत ${k}: ${a} + ${k} = ${B} वर्ष।`, "yr", 1);
  },
};

const ageRatio2 = {
  id: "ageRatio2", levels: ["easy"],
  cands: () => cross([[2, 3], [3, 4], [3, 5], [4, 5], [5, 7], [2, 5], [4, 7], [5, 6], [5, 8], [7, 9]], range(8, 40), ["elder", "younger"]).filter(([[p, q], A]) => isInt(2 * A / (p + q))),
  build: (t, prm) => {
    const [[p, q], A, ask] = prm; const k = 2 * A / (p + q); const ans = (ask === "elder" ? q : p) * k;
    return AQ(t, `The ages of two brothers are in the ratio ${p} : ${q} and their average age is ${A} years. How old is the ${ask} brother?`,
      `दो भाइयों की आयु ${p} : ${q} के अनुपात में है और उनकी औसत आयु ${A} वर्ष है। ${ask === "elder" ? "बड़े" : "छोटे"} भाई की आयु कितनी है?`,
      ans, [(ask === "elder" ? p : q) * k, A * (ask === "elder" ? q : p) / (p + q), ans + k].filter((v) => v !== ans), () => 2 * A * (ask === "elder" ? q : p) / (p + q),
      `Total age = 2 × ${A} = ${2 * A}. Shared ${p} : ${q}, one part = ${2 * A} ÷ ${p + q} = ${n(k)}. The ${ask} brother = ${ask === "elder" ? q : p} × ${n(k)} = ${n(ans)} years.`,
      `कुल आयु = 2 × ${A} = ${2 * A}। ${p} : ${q} में बाँटने पर एक भाग = ${2 * A} ÷ ${p + q} = ${n(k)}। ${ask === "elder" ? "बड़ा" : "छोटा"} भाई = ${ask === "elder" ? q : p} × ${n(k)} = ${n(ans)} वर्ष।`, "yr", 1);
  },
};

const combineAges = {
  id: "combineAges", levels: ["easy", "medium"],
  cands: () => thin(cross(range(8, 30), range(10, 18), range(8, 30), range(10, 18)).filter(([b, x, g, y]) => x !== y && b !== g && dec2((b * x + g * y) / (b + g))), (p) => [p[0], p[2]]),
  build: (t, prm) => {
    const [b, x, g, y] = prm; const A = clean((b * x + g * y) / (b + g));
    return AQ(t, `In a class, the average age of ${b} boys is ${x} years and the average age of ${g} girls is ${y} years. What is the average age of the whole class?`,
      `एक कक्षा में ${b} लड़कों की औसत आयु ${x} वर्ष और ${g} लड़कियों की औसत आयु ${y} वर्ष है। पूरी कक्षा की औसत आयु क्या है?`,
      A, [(x + y) / 2, (b * y + g * x) / (b + g), A + 1], () => (x * b + y * g) / (b + g),
      `Total age = ${b} × ${x} + ${g} × ${y} = ${b * x + g * y} for ${b + g} pupils. Average = ${b * x + g * y} ÷ ${b + g} = ${n(A)} years. (The plain average of ${x} and ${y} is wrong: the groups are of different sizes.)`,
      `कुल आयु = ${b} × ${x} + ${g} × ${y} = ${b * x + g * y}, ${b + g} विद्यार्थियों की। औसत = ${b * x + g * y} ÷ ${b + g} = ${n(A)} वर्ष। (${x} और ${y} का सीधा औसत गलत है: दोनों समूह बराबर नहीं हैं।)`, "yr", 0.5);
  },
};

const abcAge = {
  id: "abcAge", levels: ["easy", "medium"],
  cands: () => cross(range(15, 60), range(15, 60), range(10, 60)).filter(([a, b, c]) => a !== b && c !== a && c !== b && (a + b + c) % 3 === 0 && (a + b) % 2 === 0),
  build: (t, prm) => {
    const [a, b, c] = prm; const x = (a + b + c) / 3, y = (a + b) / 2;
    return AQ(t, `The average age of A, B and C is ${x} years and the average age of A and B is ${y} years. How old is C?`,
      `A, B और C की औसत आयु ${x} वर्ष है तथा A और B की औसत आयु ${y} वर्ष है। C की आयु कितनी है?`,
      c, [x - y, 3 * x - y, x + y].filter((v) => v !== c && v > 0), () => 3 * x - 2 * y,
      `A + B + C = 3 × ${x} = ${3 * x}. A + B = 2 × ${y} = ${2 * y}. C = ${3 * x} − ${2 * y} = ${c} years.`,
      `A + B + C = 3 × ${x} = ${3 * x}। A + B = 2 × ${y} = ${2 * y}। C = ${3 * x} − ${2 * y} = ${c} वर्ष।`, "yr", 1);
  },
};

const fatherSon = {
  id: "fatherSon", levels: ["easy"],
  cands: () => cross(range(20, 45), range(20, 40, 2)).filter(([x, d]) => x - d / 2 >= 5),
  build: (t, prm) => {
    const [x, d] = prm; const s = clean(x - d / 2), f = clean(x + d / 2);
    const [p, ph, c, ch] = pick([["father", "पिता", "son", "पुत्र"], ["mother", "माता", "daughter", "पुत्री"]], prm);
    return AQ(t, `The average age of a ${p} and ${p === "father" ? "his" : "her"} ${c} is ${x} years. The ${p} is ${d} years older than the ${c}. How old is the ${c}?`,
      `एक ${ph} और ${p === "father" ? "उसके" : "उसकी"} ${ch} की औसत आयु ${x} वर्ष है। ${ph} ${ch} से ${d} वर्ष ${p === "father" ? "बड़े हैं" : "बड़ी हैं"}। ${ch} की आयु कितनी है?`,
      s, [x - d, f, 2 * x - d].filter((v) => v !== s), () => (2 * x - d) / 2,
      `Together they are 2 × ${x} = ${2 * x} years. Taking away the ${d}-year gap leaves twice the ${c}'s age: (${2 * x} − ${d}) ÷ 2 = ${n(s)} years.`,
      `दोनों की कुल आयु 2 × ${x} = ${2 * x} वर्ष है। ${d} वर्ष का अंतर हटाने पर ${ch} की आयु का दोगुना बचता है: (${2 * x} − ${d}) ÷ 2 = ${n(s)} वर्ष।`, "yr", 1);
  },
};

const totalToAvg = {
  id: "totalToAvg", levels: ["easy"],
  cands: () => cross([3, 4, 5, 6, 8], range(60, 240), [2, 3, 4, 5, 6, 10]).filter(([N, S, k]) => dec2(S / N) && S / N >= 12 && S / N <= 45),
  build: (t, prm) => {
    const [N, S, k] = prm; const B = clean(S / N + k);
    return AQ(t, `The total age of the ${N} members of a family is ${S} years. What will be their average age after ${k} years?`,
      `एक परिवार के ${N} सदस्यों की कुल आयु ${S} वर्ष है। ${k} वर्ष बाद उनकी औसत आयु क्या होगी?`,
      B, [(S + k) / N, S / N, (S + N * k) / (N + 1)], () => (S + N * k) / N,
      `Now the average is ${S} ÷ ${N} = ${n(S / N)} years. After ${k} years everyone is ${k} years older: ${n(S / N)} + ${k} = ${n(B)} years.`,
      `अभी औसत ${S} ÷ ${N} = ${n(S / N)} वर्ष है। ${k} वर्ष बाद हर सदस्य ${k} वर्ष बड़ा होगा: ${n(S / N)} + ${k} = ${n(B)} वर्ष।`, "yr", 1);
  },
};

// ---------------------------------------------------------------- MEDIUM
const marriedChild = {
  id: "marriedChild", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(21, 30), [2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5]).filter(([a, k, c]) => c < k && dec2((2 * (a + k) + c) / 3)),
  build: (t, prm) => {
    const [a, k, c] = prm; const A = clean((2 * (a + k) + c) / 3);
    return AQ(t, `At the time of their marriage ${k} years ago, the average age of a husband and wife was ${a} years. Today they have a child aged ${yr(c)}. What is the average age of the family now?`,
      `${k} वर्ष पहले विवाह के समय पति-पत्नी की औसत आयु ${a} वर्ष थी। आज उनका ${c} वर्ष का एक बच्चा है। परिवार की वर्तमान औसत आयु क्या है?`,
      A, [(2 * a + c) / 3, (2 * (a + k) + c) / 2, a + k], () => ((a + k) * 2 + c) / 3,
      `The couple now: 2 × (${a} + ${k}) = ${2 * (a + k)} years in all. With the child: ${2 * (a + k)} + ${c} = ${2 * (a + k) + c} for 3 people. Average = ${2 * (a + k) + c} ÷ 3 = ${n(A)} years.`,
      `दंपति की वर्तमान कुल आयु = 2 × (${a} + ${k}) = ${2 * (a + k)} वर्ष। बच्चे सहित: ${2 * (a + k)} + ${c} = ${2 * (a + k) + c}, 3 लोगों की। औसत = ${2 * (a + k) + c} ÷ 3 = ${n(A)} वर्ष।`, "yr", 1);
  },
};

const familyChild = {
  id: "familyChild", levels: ["medium", "hard", "advanced"],
  cands: () => cross([3, 4, 5, 6], range(18, 40), [2, 3, 4, 5, 6], [1, 2, 3, 4, 5]).filter(([m, a, k, c]) => c <= k && dec2((m * (a + k) + c) / (m + 1))),
  build: (t, prm) => {
    const [m, a, k, c] = prm; const S = m * (a + k) + c; const A = clean(S / (m + 1));
    return AQ(t, `${k} years ago, the average age of a family of ${m} members was ${a} years. Since then a child has been born, who is now ${yr(c)} old. What is the present average age of the family?`,
      `${k} वर्ष पहले ${m} सदस्यों वाले एक परिवार की औसत आयु ${a} वर्ष थी। तब से एक बच्चे का जन्म हुआ है, जो अब ${c} वर्ष का है। परिवार की वर्तमान औसत आयु क्या है?`,
      A, [(m * a + c) / (m + 1), a + k, (m * (a + k) + c) / m], () => ((a + k) * m + c) / (m + 1),
      `The ${m} members are now ${m} × (${a} + ${k}) = ${m * (a + k)} years in all. Adding the child: ${S} for ${m + 1} people. Average = ${S} ÷ ${m + 1} = ${n(A)} years.`,
      `${m} सदस्यों की वर्तमान कुल आयु = ${m} × (${a} + ${k}) = ${m * (a + k)} वर्ष। बच्चे को जोड़कर: ${S}, ${m + 1} लोगों की। औसत = ${S} ÷ ${m + 1} = ${n(A)} वर्ष।`, "yr", 1);
  },
};

// Present ages of husband H, wife W, child C.
const hwcCands = () => cross(range(30, 50), range(26, 45), range(4, 15), [2, 3, 4, 5], [3, 4, 5, 6, 7]).filter(([H, W, C, k1, k2]) => H > W && C < W - 18 && k1 !== k2 && C > k2 && isInt((H + W + C - 3 * k1) / 3) && isInt((W + C - 2 * k2) / 2));
const hwc = {
  id: "hwc", levels: ["medium", "hard", "advanced"],
  cands: () => thin(hwcCands(), (p) => [p[0], p[3], p[4]]),
  build: (t, prm) => {
    const [H, W, C, k1, k2] = prm; const x = (H + W + C - 3 * k1) / 3, y = (W + C - 2 * k2) / 2;
    return AQ(t, `${k1} years ago, the average age of a husband, his wife and their child was ${x} years. ${k2} years ago, the average age of the wife and the child was ${y} years. How old is the husband now?`,
      `${k1} वर्ष पहले पति, पत्नी और उनके बच्चे की औसत आयु ${x} वर्ष थी। ${k2} वर्ष पहले पत्नी और बच्चे की औसत आयु ${y} वर्ष थी। पति की वर्तमान आयु कितनी है?`,
      H, [3 * x - 2 * y, H - k1, 3 * (x + k1) - 2 * y].filter((v) => v !== H && v > 0), () => (3 * x + 3 * k1) - (2 * y + 2 * k2),
      `Now: husband + wife + child = 3 × ${x} + 3 × ${k1} = ${3 * x + 3 * k1}. Wife + child now = 2 × ${y} + 2 × ${k2} = ${2 * y + 2 * k2}. Husband = ${3 * x + 3 * k1} − ${2 * y + 2 * k2} = ${H} years.`,
      `अभी: पति + पत्नी + बच्चा = 3 × ${x} + 3 × ${k1} = ${3 * x + 3 * k1}। पत्नी + बच्चा अभी = 2 × ${y} + 2 × ${k2} = ${2 * y + 2 * k2}। पति = ${3 * x + 3 * k1} − ${2 * y + 2 * k2} = ${H} वर्ष।`, "yr", 1);
  },
};

const replaceAge = {
  id: "replaceAge", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross([6, 8, 10, 12, 15], [1, 1.5, 2, 2.5, 3], range(18, 40), range(20, 45)).filter(([N, d, a, b]) => b > a && isInt((a + b + N * d) / 2) && (a + b + N * d) / 2 <= 50), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [N, d, a, b] = prm; const W = (a + b + N * d) / 2;
    return AQ(t, `The average age of ${N} men rises by ${yr(d)} when two of them, aged ${a} and ${b} years, are replaced by two women. What is the average age of the two women?`,
      `${N} पुरुषों की औसत आयु ${n(d)} वर्ष बढ़ जाती है जब उनमें से ${a} और ${b} वर्ष आयु के दो पुरुषों के स्थान पर दो महिलाएँ आ जाती हैं। दोनों महिलाओं की औसत आयु क्या है?`,
      W, [(a + b) / 2 + d, (a + b + 2 * d) / 2 + N * d, (a + b) / 2 + N * d].filter((v) => v !== W), () => (a + b + d * N) / 2,
      `The total rises by ${N} × ${n(d)} = ${n(N * d)} years. So the women together are ${a} + ${b} + ${n(N * d)} = ${n(a + b + N * d)} years, an average of ${n(a + b + N * d)} ÷ 2 = ${n(W)} years.`,
      `कुल आयु ${N} × ${n(d)} = ${n(N * d)} वर्ष बढ़ती है। अतः दोनों महिलाओं की कुल आयु ${a} + ${b} + ${n(N * d)} = ${n(a + b + N * d)} वर्ष है, औसत ${n(a + b + N * d)} ÷ 2 = ${n(W)} वर्ष।`, "yr", 1);
  },
};

const ratioFuture = {
  id: "ratioFuture", levels: ["medium", "hard", "advanced"],
  cands: () => cross([[2, 3], [3, 4], [3, 5], [4, 5], [5, 7], [2, 5], [4, 7], [5, 6], [5, 8], [3, 7]], range(15, 50), [2, 3, 4, 5, 6, 8, 10]).filter(([[p, q], y, k]) => y - k > 5 && isInt(2 * (y - k) / (p + q))),
  build: (t, prm) => {
    const [[p, q], y, k] = prm; const S = 2 * (y - k); const part = S / (p + q); const A = p * part;
    return AQ(t, `The present ages of A and B are in the ratio ${p} : ${q}. After ${k} years, their average age will be ${y} years. What is A's present age?`,
      `A और B की वर्तमान आयु ${p} : ${q} के अनुपात में है। ${k} वर्ष बाद उनकी औसत आयु ${y} वर्ष होगी। A की वर्तमान आयु कितनी है?`,
      A, [2 * y * p / (p + q), (2 * y - k) * p / (p + q), q * part].filter((v) => v !== A && dec2(v)), () => (2 * y - 2 * k) * p / (p + q),
      `After ${k} years their total is 2 × ${y} = ${2 * y}; now it is ${2 * y} − 2 × ${k} = ${S}. One ratio part = ${S} ÷ ${p + q} = ${n(part)}, so A = ${p} × ${n(part)} = ${n(A)} years.`,
      `${k} वर्ष बाद उनकी कुल आयु 2 × ${y} = ${2 * y} होगी; अभी ${2 * y} − 2 × ${k} = ${S} है। अनुपात का एक भाग = ${S} ÷ ${p + q} = ${n(part)}, अतः A = ${p} × ${n(part)} = ${n(A)} वर्ष।`, "yr", 1);
  },
};

const groupAges = {
  id: "groupAges", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross([15, 18, 20, 24, 25, 30], range(12, 18), [4, 5, 6, 8, 10], range(-3, 3), [4, 5, 6, 8, 10], range(-3, 3)).map(([N, a, p, d1, q, d2]) => [N, a, p, a + d1, q, a + d2]).filter(([N, a, p, a1, q, a2]) => N - p - q >= 3 && a1 !== a2 && dec2((N * a - p * a1 - q * a2) / (N - p - q)) && (N * a - p * a1 - q * a2) / (N - p - q) >= 8 && (N * a - p * a1 - q * a2) / (N - p - q) <= 25), (p) => [p[0], p[1], p[2], p[4]]),
  build: (t, prm) => {
    const [N, a, p, a1, q, a2] = prm; const r = N - p - q; const R = N * a - p * a1 - q * a2; const B = clean(R / r);
    return AQ(t, `The average age of ${N} students is ${a} years. The average age of ${p} of them is ${a1} years and that of another ${q} is ${a2} years. What is the average age of the remaining students?`,
      `${N} विद्यार्थियों की औसत आयु ${a} वर्ष है। इनमें से ${p} की औसत आयु ${a1} वर्ष और अन्य ${q} की ${a2} वर्ष है। शेष विद्यार्थियों की औसत आयु क्या है?`,
      B, [3 * a - a1 - a2, R / (r + 1), (N * a - a1 - a2) / r], () => (a * N - a1 * p - a2 * q) / (N - p - q),
      `Total = ${N} × ${a} = ${N * a}. The two groups: ${p} × ${a1} + ${q} × ${a2} = ${p * a1 + q * a2}. The other ${r} total ${R}, average ${R} ÷ ${r} = ${n(B)} years.`,
      `कुल = ${N} × ${a} = ${N * a}। दोनों समूह: ${p} × ${a1} + ${q} × ${a2} = ${p * a1 + q * a2}। शेष ${r} की कुल आयु ${R}, औसत ${R} ÷ ${r} = ${n(B)} वर्ष।`, "yr", 1);
  },
};

const teacherSwap = {
  id: "teacherSwap", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(15, 40), range(12, 16), [1, 1.5, 2], [0.5, 1]).filter(([N, a, d1, d2]) => { const T = a + (N + 1) * d1; const T2 = T - (N + 1) * d2; return d2 < d1 && isInt(T) && isInt(T2) && T <= 60 && T2 >= 25; }),
  build: (t, prm) => {
    const [N, a, d1, d2] = prm; const T = a + (N + 1) * d1, T2 = T - (N + 1) * d2;
    return AQ(t, `The average age of ${N} students is ${a} years. When their teacher's age is included, the average rises by ${yr(d1)}. If this teacher is replaced by a new teacher, the average (with the teacher) falls by ${yr(d2)}. How old is the new teacher?`,
      `${N} विद्यार्थियों की औसत आयु ${a} वर्ष है। उनके अध्यापक की आयु शामिल करने पर औसत ${n(d1)} वर्ष बढ़ जाता है। यदि इस अध्यापक के स्थान पर नया अध्यापक आए, तो (अध्यापक सहित) औसत ${n(d2)} वर्ष घट जाता है। नए अध्यापक की आयु कितनी है?`,
      T2, [T - N * d2, T, a + (N + 1) * (d1 - d2) + 1].filter((v) => v !== T2), () => (N + 1) * (a + d1 - d2) - N * a,
      `Old teacher = ${N + 1} × ${n(a + d1)} − ${N} × ${a} = ${T} years. A fall of ${n(d2)} for ${N + 1} people is ${n((N + 1) * d2)} years, so the new teacher = ${T} − ${n((N + 1) * d2)} = ${T2} years.`,
      `पुराने अध्यापक = ${N + 1} × ${n(a + d1)} − ${N} × ${a} = ${T} वर्ष। ${N + 1} लोगों का औसत ${n(d2)} घटने का अर्थ है कुल ${n((N + 1) * d2)} वर्ष कम, अतः नए अध्यापक = ${T} − ${n((N + 1) * d2)} = ${T2} वर्ष।`, "yr", 1);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
const childSame = {
  id: "childSame", levels: ["hard", "advanced"],
  cands: () => cross([3, 4, 5, 6], range(15, 45), [1, 2, 3, 4, 5, 6]).filter(([m, A, k]) => A - m * k >= 1 && A - m * k <= 10 && k >= A - m * k),
  build: (t, prm) => {
    const [m, A, k] = prm; const c = A - m * k;
    return AQ(t, `${k} years ago, the average age of a family of ${m} members was ${A} years. A child has since been born, and the average age of the family today is still ${A} years. How old is the child?`,
      `${k} वर्ष पहले ${m} सदस्यों वाले एक परिवार की औसत आयु ${A} वर्ष थी। इस बीच एक बच्चे का जन्म हुआ, और आज भी परिवार की औसत आयु ${A} वर्ष ही है। बच्चे की आयु कितनी है?`,
      c, [k, A - k, m * k].filter((v) => v !== c && v > 0), () => (m + 1) * A - m * (A + k),
      `Today the ${m} members total ${m} × (${A} + ${k}) = ${m * (A + k)}. With the child, ${m + 1} people average ${A}: ${(m + 1) * A}. Child = ${(m + 1) * A} − ${m * (A + k)} = ${c} years.`,
      `आज ${m} सदस्यों की कुल आयु ${m} × (${A} + ${k}) = ${m * (A + k)} है। बच्चे सहित ${m + 1} लोगों का औसत ${A}: कुल ${(m + 1) * A}। बच्चा = ${(m + 1) * A} − ${m * (A + k)} = ${c} वर्ष।`, "yr", 1);
  },
};

const committee = {
  id: "committee", levels: ["hard", "advanced"],
  cands: () => cross([5, 6, 7, 8, 10, 12], range(35, 55), [2, 3, 4, 5], range(50, 75)).filter(([N, A, k, x]) => x - N * k >= 25 && x - N * k <= 50),
  build: (t, prm) => {
    const [N, A, k, x] = prm; const y = x - N * k;
    return AQ(t, `${k} years ago, the average age of a committee of ${N} members was ${A} years. Since then a member aged ${x} years (today) has retired and a new member has joined in his place. The average age of the committee today is the same as it was ${k} years ago. How old is the new member?`,
      `${k} वर्ष पहले ${N} सदस्यों वाली एक समिति की औसत आयु ${A} वर्ष थी। तब से ${x} वर्ष (आज की आयु) के एक सदस्य सेवानिवृत्त हो गए और उनके स्थान पर एक नया सदस्य आया। आज समिति की औसत आयु वही है जो ${k} वर्ष पहले थी। नए सदस्य की आयु कितनी है?`,
      y, [x - k, x - (N - 1) * k, x - N * k + k].filter((v) => v !== y), () => x - ((A + k) * N - A * N),
      `Had nobody changed, the total would have grown by ${N} × ${k} = ${N * k} years. For the average to stay at ${A}, the newcomer must be ${N * k} years younger than the one who left: ${x} − ${N * k} = ${y} years.`,
      `कोई बदलाव न होता तो कुल आयु ${N} × ${k} = ${N * k} वर्ष बढ़ जाती। औसत ${A} पर रहने के लिए नया सदस्य जाने वाले से ${N * k} वर्ष छोटा होना चाहिए: ${x} − ${N * k} = ${y} वर्ष।`, "yr", 1);
  },
};

const teamCaptain = {
  id: "teamCaptain", levels: ["hard", "advanced"],
  cands: () => cross(range(24, 34), [2, 3, 4, 5, 6], [1, 2]).filter(([x, k, d]) => { const A = x + k / 2 - 4.5 * d; return isInt(A) && A >= 20 && A < x; }),
  build: (t, prm) => {
    const [x, k, d] = prm; const A = clean(x + k / 2 - 4.5 * d);
    return AQ(t, `The captain of a cricket team of 11 players is ${x} years old and the wicket-keeper is ${k} years older. If the ages of these two are left out, the average age of the other players is ${yr(d)} less than the average age of the whole team. What is the average age of the team?`,
      `11 खिलाड़ियों की एक क्रिकेट टीम का कप्तान ${x} वर्ष का है और विकेटकीपर उससे ${k} वर्ष बड़ा है। इन दोनों की आयु छोड़ देने पर शेष खिलाड़ियों की औसत आयु पूरी टीम की औसत आयु से ${n(d)} वर्ष कम है। टीम की औसत आयु क्या है?`,
      A, [A + d, A - d, x + k / 2 - 9 * d / 2 + 1].filter((v) => v !== A), () => (2 * x + k - 9 * d) / 2,
      `Let the team average be A: 11A = ${x} + ${x + k} + 9(A − ${d}). So 2A = ${2 * x + k} − ${9 * d} = ${2 * x + k - 9 * d}, and A = ${n(A)} years.`,
      `टीम का औसत A लें: 11A = ${x} + ${x + k} + 9(A − ${d})। अतः 2A = ${2 * x + k} − ${9 * d} = ${2 * x + k - 9 * d}, और A = ${n(A)} वर्ष।`, "yr", 1);
  },
};

const hwcChild = {
  id: "hwcChild", levels: ["hard", "advanced"],
  cands: () => thin(cross(range(32, 48), range(28, 44), range(3, 14), [3, 4, 5, 6], [2, 3, 4]).filter(([H, W, C, k1, k2]) => H > W && C < W - 20 && C > k1 && isInt((H + W + C - 3 * k1) / 3) && isInt((H + W + 2 * k2) / 2)), (p) => [p[2], p[3], p[4]]),
  build: (t, prm) => {
    const [H, W, C, k1, k2] = prm; const x = (H + W + C - 3 * k1) / 3, y = (H + W + 2 * k2) / 2;
    return AQ(t, `${k1} years ago, the average age of a couple and their child was ${x} years. ${k2} years from now, the average age of the couple will be ${y} years. How old is the child now?`,
      `${k1} वर्ष पहले एक दंपति और उनके बच्चे की औसत आयु ${x} वर्ष थी। अब से ${k2} वर्ष बाद दंपति की औसत आयु ${y} वर्ष होगी। बच्चे की वर्तमान आयु कितनी है?`,
      C, [3 * x - 2 * y, C + k1, 3 * x + 3 * k1 - 2 * y].filter((v) => v !== C && v > 0), () => (3 * x + 3 * k1) - (2 * y - 2 * k2),
      `All three now: 3 × ${x} + 3 × ${k1} = ${3 * x + 3 * k1}. The couple now: 2 × ${y} − 2 × ${k2} = ${2 * y - 2 * k2}. Child = ${3 * x + 3 * k1} − ${2 * y - 2 * k2} = ${C} years.`,
      `तीनों की वर्तमान कुल आयु: 3 × ${x} + 3 × ${k1} = ${3 * x + 3 * k1}। दंपति की वर्तमान: 2 × ${y} − 2 × ${k2} = ${2 * y - 2 * k2}। बच्चा = ${3 * x + 3 * k1} − ${2 * y - 2 * k2} = ${C} वर्ष।`, "yr", 1);
  },
};

const KINDS = guard([
  teacherAdd, teacherOut, newJoin, leaveOne, yearsShift, ageRatio2, combineAges, abcAge, fatherSon, totalToAvg,
  marriedChild, familyChild, hwc, replaceAge, ratioFuture, groupAges, teacherSwap,
  childSame, committee, teamCaptain, hwcChild,
]);

const PREFIX = "Average · Average Age";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
