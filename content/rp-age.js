// Ratio & Proportion · Problems on Ages: present, past and future ages from
// ratios, sums, differences and "n times as old". Ages are real ages (a
// child under 18, a parent 20-50 years older). Every answer is worked out
// again in `v`; the wrong options are the usual slips (the other person's
// age, the age at the other time, years added to only one person).
const L = require("./rp-lib");
const { n, clean, isInt, RQ, rat, thin, pick, range, dec2, guard, gcd } = L;
// Ages are whole years, so every wrong option is a whole number too.
const AQ = (t, q, qh, ans, slips, ...rest) => L.AQ(t, q, qh, ans, slips.filter((v) => isInt(v)), ...rest);
const { fillTopic } = require("./gen");

// cross() that filters while it walks, so big pools never sit in memory.
const cross = (...lists) => ({
  filter(ok) {
    const out = []; const acc = [];
    const rec = (i) => { if (i === lists.length) { if (ok(acc)) out.push([...acc]); return; } for (const v of lists[i]) { acc.push(v); rec(i + 1); acc.pop(); } };
    rec(0); return out;
  },
});
const RATIOS = [[1, 2], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [5, 7], [4, 7], [2, 5], [3, 7], [5, 8], [7, 9], [7, 8], [5, 9], [4, 9], [6, 7], [1, 3], [2, 7], [3, 8]];
const yr = (x) => `${n(x)} years`;
const PAIRS = [["A", "B"], ["Ravi", "Mohan"], ["Sita", "Gita"], ["Amit", "Sumit"]];
const PAIRS_H = { A: "A", B: "B", Ravi: "रवि", Mohan: "मोहन", Sita: "सीता", Gita: "गीता", Amit: "अमित", Sumit: "सुमित" };
const okAge = (x) => isInt(x) && x >= 1 && x <= 90;

// ---------------------------------------------------------------- EASY
const ratioSum = {
  id: "ratioSum", levels: ["easy"],
  cands: () => cross(RATIOS, range(20, 140), [0, 1, 2, 3], ["old", "young"]).filter(([[a, b], S]) => isInt(S / (a + b)) && okAge(S * b / (a + b)) && S * a / (a + b) >= 2 && !(a === 3 && b === 4 && (S === 42 || S === 28)) && !(a === 4 && b === 5 && (S === 45 || S === 36))),
  build: (t, prm) => {
    const [[a, b], S, pi, ask] = prm; const [p, q] = PAIRS[pi]; const u = S / (a + b); const x = (ask === "old" ? b : a) * u; const nm = ask === "old" ? q : p;
    return AQ(t, `The ages of ${p} and ${q} are in the ratio ${a} : ${b}, and the sum of their ages is ${S} years. How old is ${nm}?`,
      `${PAIRS_H[p]} और ${PAIRS_H[q]} की आयु ${a} : ${b} के अनुपात में है, और उनकी आयु का योग ${S} वर्ष है। ${PAIRS_H[nm]} की आयु कितनी है?`,
      x, [(ask === "old" ? a : b) * u, S / 2, (b - a) * u].filter((v) => v !== x && v > 0), () => S * (ask === "old" ? b : a) / (a + b),
      `Ages ${a}x and ${b}x: ${a + b}x = ${S}, so x = ${n(u)}. ${nm} = ${ask === "old" ? b : a} × ${n(u)} = ${n(x)} years.`,
      `आयु ${a}x और ${b}x: ${a + b}x = ${S}, अतः x = ${n(u)}। ${PAIRS_H[nm]} = ${ask === "old" ? b : a} × ${n(u)} = ${n(x)} वर्ष।`, "yr", 1);
  },
};

const ratioDiff = {
  id: "ratioDiff", levels: ["easy"],
  cands: () => cross(RATIOS, range(2, 40), [0, 1, 2, 3], ["old", "young"]).filter(([[a, b], D, pi]) => (pi === 0 || D <= 12) && isInt(D / (b - a)) && okAge(D * b / (b - a)) && D * a / (b - a) >= 2),
  build: (t, prm) => {
    const [[a, b], D, pi, ask] = prm; const [p, q] = PAIRS[pi]; const u = D / (b - a); const x = (ask === "old" ? b : a) * u; const nm = ask === "old" ? q : p;
    return AQ(t, `The ages of ${p} and ${q} are in the ratio ${a} : ${b}. ${q} is ${D} years older than ${p}. How old is ${nm}?`,
      `${PAIRS_H[p]} और ${PAIRS_H[q]} की आयु ${a} : ${b} के अनुपात में है। ${PAIRS_H[q]}, ${PAIRS_H[p]} से ${D} वर्ष बड़ा/बड़ी है। ${PAIRS_H[nm]} की आयु कितनी है?`.replace("बड़ा/बड़ी", pi === 2 ? "बड़ी" : "बड़ा"),
      x, [(ask === "old" ? a : b) * u, D * (ask === "old" ? b : a), (a + b) * u].filter((v) => v !== x && v > 0), () => (ask === "old" ? b : a) * D / (b - a),
      `Ages ${a}x and ${b}x differ by ${b - a}x = ${D}, so x = ${n(u)}. ${nm} = ${ask === "old" ? b : a} × ${n(u)} = ${n(x)} years.`,
      `आयु ${a}x और ${b}x का अंतर ${b - a}x = ${D}, अतः x = ${n(u)}। ${PAIRS_H[nm]} = ${ask === "old" ? b : a} × ${n(u)} = ${n(x)} वर्ष।`, "yr", 1);
  },
};

// Present ratio a:b; after (or k years before) the ratio is c:d.
const SHIFT = () => cross(RATIOS, range(2, 15), range(2, 12), ["after", "ago"], ["A", "B", "sum"]).filter(([[a, b], u, k, dir]) => { const A = a * u, B = b * u; const s = dir === "after" ? k : -k; const A2 = A + s, B2 = B + s; return A2 >= 1 && okAge(B2) && okAge(B) && rat(A2, B2) !== rat(a, b) && rat(A2, B2).split(" : ").every((v) => Number(v) <= 20); });
const ratioShift = {
  id: "ratioShift", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => thin(SHIFT(), (p) => [p[0], p[2], p[3]]),
  build: (t, prm) => {
    const [[a, b], u, k, dir, ask] = prm; const A = a * u, B = b * u; const s = dir === "after" ? k : -k; const [c, d] = rat(A + s, B + s).split(" : ").map(Number);
    const ans = ask === "A" ? A : ask === "B" ? B : A + B;
    const tq = dir === "after" ? `After ${k} years the ratio will be ${c} : ${d}` : `${k} years ago the ratio was ${c} : ${d}`;
    const tqH = dir === "after" ? `${k} वर्ष बाद यह अनुपात ${c} : ${d} होगा` : `${k} वर्ष पहले यह अनुपात ${c} : ${d} था`;
    const askE = ask === "A" ? "What is A's present age?" : ask === "B" ? "What is B's present age?" : "What is the sum of their present ages?";
    const askH = ask === "A" ? "A की वर्तमान आयु कितनी है?" : ask === "B" ? "B की वर्तमान आयु कितनी है?" : "उनकी वर्तमान आयु का योग कितना है?";
    return AQ(t, `The present ages of A and B are in the ratio ${a} : ${b}. ${tq}. ${askE}`, `A और B की वर्तमान आयु ${a} : ${b} के अनुपात में है। ${tqH}। ${askH}`,
      ans, [ask === "A" ? A + s : ask === "B" ? B + s : A + B + 2 * s, ask === "A" ? B : ask === "B" ? A : A + B + s, ans + u].filter((v) => v !== ans && v > 0), () => { const x = s * (c - d) / (a * d - b * c); return ask === "A" ? a * x : ask === "B" ? b * x : (a + b) * x; },
      `Ages ${a}x and ${b}x. (${a}x ${s > 0 ? "+" : "−"} ${k}) : (${b}x ${s > 0 ? "+" : "−"} ${k}) = ${c} : ${d}, so ${d}(${a}x ${s > 0 ? "+" : "−"} ${k}) = ${c}(${b}x ${s > 0 ? "+" : "−"} ${k}) and x = ${u}. A = ${A}, B = ${B}${ask === "sum" ? `, sum = ${A + B}` : ""} years.`,
      `आयु ${a}x और ${b}x। (${a}x ${s > 0 ? "+" : "−"} ${k}) : (${b}x ${s > 0 ? "+" : "−"} ${k}) = ${c} : ${d}, अतः ${d}(${a}x ${s > 0 ? "+" : "−"} ${k}) = ${c}(${b}x ${s > 0 ? "+" : "−"} ${k}) और x = ${u}। A = ${A}, B = ${B}${ask === "sum" ? `, योग = ${A + B}` : ""} वर्ष।`, "yr", 1);
  },
};

// Father m times as old as the son; sum S.
const timesNow = {
  id: "timesNow", levels: ["easy"],
  cands: () => cross([2, 3, 4, 5, 6, 7], range(25, 100)).filter(([m, S]) => isInt(S / (m + 1)) && S / (m + 1) >= 3 && (m - 1) * S / (m + 1) >= 20 && m * S / (m + 1) <= 80),
  build: (t, prm) => {
    const [m, S] = prm; const s = S / (m + 1), f = m * s;
    return AQ(t, `A father is ${m} times as old as his son. The sum of their ages is ${S} years. How old is the father?`, `एक पिता की आयु उसके पुत्र की आयु की ${m} गुनी है। उनकी आयु का योग ${S} वर्ष है। पिता की आयु कितनी है?`,
      f, [s, S / m, f + s].filter((v) => v !== f), () => S - S / (m + 1),
      `Son = x, father = ${m}x: ${m + 1}x = ${S}, so x = ${s}. Father = ${m} × ${s} = ${f} years.`,
      `पुत्र = x, पिता = ${m}x: ${m + 1}x = ${S}, अतः x = ${s}। पिता = ${m} × ${s} = ${f} वर्ष।`, "yr", 1);
  },
};

const olderSumLater = {
  id: "olderSumLater", levels: ["easy", "medium"],
  cands: () => cross(range(2, 15), range(3, 40), range(2, 10), [0, 1, 3]).filter(([d, b, k]) => okAge(b + d + k) && b + d >= 5),
  build: (t, prm) => {
    const [d, b, k, pi] = prm; const [p, q] = PAIRS[pi]; const S = 2 * b + d + 2 * k;
    return AQ(t, `${p} is ${d} years older than ${q}. After ${k} years, the sum of their ages will be ${S} years. How old is ${q} now?`,
      `${PAIRS_H[p]}, ${PAIRS_H[q]} से ${d} वर्ष बड़ा है। ${k} वर्ष बाद उनकी आयु का योग ${S} वर्ष होगा। ${PAIRS_H[q]} की वर्तमान आयु कितनी है?`,
      b, [b + d, b + k, (S - d) / 2].filter((v) => v !== b && v > 0 && dec2(v)), () => (S - 2 * k - d) / 2,
      `Now their ages add up to ${S} − 2 × ${k} = ${S - 2 * k}. ${q} = (${S - 2 * k} − ${d}) ÷ 2 = ${b} years.`,
      `अभी उनकी आयु का योग ${S} − 2 × ${k} = ${S - 2 * k} है। ${PAIRS_H[q]} = (${S - 2 * k} − ${d}) ÷ 2 = ${b} वर्ष।`, "yr", 1);
  },
};

const sumBack = {
  id: "sumBack", levels: ["easy"],
  cands: () => cross([3, 4, 5], range(40, 150), range(2, 10), ["ago", "after"]).filter(([c, S, k, dir]) => dir === "after" || S - c * k >= 20),
  build: (t, prm) => {
    const [c, S, k, dir] = prm; const ans = dir === "ago" ? S - c * k : S + c * k;
    return AQ(t, `The present ages of ${c} brothers add up to ${S} years. What ${dir === "ago" ? "was" : "will be"} the sum of their ages ${dir === "ago" ? `${k} years ago` : `after ${k} years`}?`,
      `${c} भाइयों की वर्तमान आयु का योग ${S} वर्ष है। ${dir === "ago" ? `${k} वर्ष पहले` : `${k} वर्ष बाद`} उनकी आयु का योग कितना ${dir === "ago" ? "था" : "होगा"}?`,
      ans, [dir === "ago" ? S - k : S + k, S, dir === "ago" ? S - (c - 1) * k : S + (c - 1) * k].filter((v) => v !== ans), () => S + (dir === "ago" ? -1 : 1) * k * c,
      `Each of the ${c} brothers is ${k} years ${dir === "ago" ? "younger" : "older"} then, so the sum changes by ${c} × ${k} = ${c * k}: ${S} ${dir === "ago" ? "−" : "+"} ${c * k} = ${ans} years.`,
      `उस समय ${c} में से हर भाई ${k} वर्ष ${dir === "ago" ? "छोटा" : "बड़ा"} है, अतः योग ${c} × ${k} = ${c * k} बदलता है: ${S} ${dir === "ago" ? "−" : "+"} ${c * k} = ${ans} वर्ष।`, "yr", 1);
  },
};

const ratioLater = {
  id: "ratioLater", levels: ["easy", "medium"],
  cands: () => cross(RATIOS, range(10, 100), range(2, 12)).filter(([[a, b], S, k]) => isInt(S / (a + b)) && okAge(S * b / (a + b) + k) && rat(S * a / (a + b) + k, S * b / (a + b) + k).split(" : ").every((v) => Number(v) <= 25)),
  build: (t, prm) => {
    const [[a, b], S, k] = prm; const A = S * a / (a + b), B = S * b / (a + b);
    return RQ(t, `The present ages of A and B are in the ratio ${a} : ${b} and their sum is ${S} years. What will be the ratio of their ages after ${k} years?`,
      `A और B की वर्तमान आयु ${a} : ${b} के अनुपात में है और उनका योग ${S} वर्ष है। ${k} वर्ष बाद उनकी आयु का अनुपात क्या होगा?`,
      [A + k, B + k], [[a + k, b + k], [a, b], [A + k, B]], () => [(A + k) * 3, (B + k) * 3],
      `A = ${S} × ${a}/${a + b} = ${A} and B = ${B}. After ${k} years: ${A + k} : ${B + k} = ${rat(A + k, B + k)}.`,
      `A = ${S} × ${a}/${a + b} = ${A} और B = ${B}। ${k} वर्ष बाद: ${A + k} : ${B + k} = ${rat(A + k, B + k)}।`);
  },
};

// Father m times now, n times after k years.
const FS = () => cross(range(3, 20), [3, 4, 5, 6, 7], [2, 3, 4], range(2, 20)).filter(([s, m, nn, k]) => nn < m && m * s + k === nn * (s + k) && m * s <= 70 && (m - 1) * s >= 18);
const fatherTimes = {
  id: "fatherTimes", levels: ["easy", "medium", "hard", "advanced"],
  cands: FS,
  build: (t, prm) => {
    const [s, m, nn, k] = prm; const f = m * s;
    return AQ(t, `A father is ${m} times as old as his son. After ${k} years, he will be ${nn} times as old as his son. How old is the son now?`,
      `एक पिता की आयु अपने पुत्र की आयु की ${m} गुनी है। ${k} वर्ष बाद पिता की आयु पुत्र की आयु की ${nn} गुनी होगी। पुत्र की वर्तमान आयु कितनी है?`,
      s, [s + k, f, k * (nn - 1) / (m - nn) + 1].filter((v) => v !== s && v > 0 && dec2(v)), () => k * (nn - 1) / (m - nn),
      `Son = x, father = ${m}x. ${m}x + ${k} = ${nn}(x + ${k}), so ${m - nn}x = ${nn * k - k} and x = ${s} years (father ${f}).`,
      `पुत्र = x, पिता = ${m}x। ${m}x + ${k} = ${nn}(x + ${k}), अतः ${m - nn}x = ${nn * k - k} और x = ${s} वर्ष (पिता ${f})।`, "yr", 1);
  },
};

const bornWhen = {
  id: "bornWhen", levels: ["easy", "medium"],
  cands: () => cross(range(20, 40), range(2, 30), [0, 1, 2]).filter(([g, c]) => okAge(g + c)),
  build: (t, prm) => {
    const [g, c, kind] = prm; const S = g + 2 * c; const [P, PH, C, CH] = [["mother", "माँ", "daughter", "बेटी"], ["father", "पिता", "son", "बेटे"], ["mother", "माँ", "son", "बेटे"]][kind];
    return AQ(t, `A ${P} was ${g} years old when her${P === "father" ? "" : ""} ${C} was born. Today the sum of their ages is ${S} years. How old is the ${C} now?`.replace("when her ", P === "father" ? "when his " : "when her "),
      `जब ${CH === "बेटी" ? "बेटी" : "बेटे"} का जन्म हुआ, तब ${PH} ${g} वर्ष ${PH === "पिता" ? "के" : "की"} थे/थीं। आज उनकी आयु का योग ${S} वर्ष है। ${CH === "बेटी" ? "बेटी" : "बेटे"} की वर्तमान आयु कितनी है?`.replace(" थे/थीं", PH === "पिता" ? " थे" : " थीं"),
      c, [c + g, S - g, (S + g) / 2].filter((v) => v !== c && v > 0 && dec2(v)), () => (S - g) / 2,
      `The ${P} is always ${g} years older: child = x, ${P} = x + ${g}. 2x + ${g} = ${S}, so x = ${c} years.`,
      `${PH} हमेशा ${g} वर्ष बड़े/बड़ी हैं: बच्चा = x, ${PH} = x + ${g}। 2x + ${g} = ${S}, अतः x = ${c} वर्ष।`.replace("बड़े/बड़ी", PH === "पिता" ? "बड़े" : "बड़ी"), "yr", 1);
  },
};

// ---------------------------------------------------------------- MEDIUM
// k years ago the father was m times the son; their ages now add up to S.
const pastTimes = {
  id: "pastTimes", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(3, 20), [3, 4, 5, 6, 7, 8, 9], range(2, 10)).filter(([s0, m, k]) => (m - 1) * s0 >= 20 && m * s0 + k <= 75),
  build: (t, prm) => {
    const [s0, m, k] = prm; const s = s0 + k, f = m * s0 + k, S = s + f;
    return AQ(t, `${k} years ago, a father was ${m} times as old as his son. The sum of their present ages is ${S} years. How old is the son now?`,
      `${k} वर्ष पहले एक पिता की आयु अपने पुत्र की आयु की ${m} गुनी थी। उनकी वर्तमान आयु का योग ${S} वर्ष है। पुत्र की वर्तमान आयु कितनी है?`,
      s, [s0, S / (m + 1), f].filter((v) => v !== s && v > 0 && dec2(v)), () => (S - 2 * k) / (m + 1) + k,
      `${k} years ago their ages added up to ${S} − 2 × ${k} = ${S - 2 * k}, with the father ${m} times the son: son then = ${S - 2 * k} ÷ ${m + 1} = ${s0}. Son now = ${s0} + ${k} = ${s} years.`,
      `${k} वर्ष पहले उनकी आयु का योग ${S} − 2 × ${k} = ${S - 2 * k} था, और पिता पुत्र के ${m} गुने: तब पुत्र = ${S - 2 * k} ÷ ${m + 1} = ${s0}। पुत्र अभी = ${s0} + ${k} = ${s} वर्ष।`, "yr", 1);
  },
};

const children = {
  id: "children", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => cross([3, 4, 5, 6], [1, 2, 3, 4], range(1, 12)).filter(([c, g, y]) => y + (c - 1) * g <= 25),
  build: (t, prm) => {
    const [c, g, y] = prm; const S = c * y + g * c * (c - 1) / 2;
    return AQ(t, `The ages of ${c} children born at intervals of ${g} years each add up to ${S} years. How old is the youngest child?`,
      `${g}-${g} वर्ष के अंतर पर जन्मे ${c} बच्चों की आयु का योग ${S} वर्ष है। सबसे छोटे बच्चे की आयु कितनी है?`,
      y, [S / c, y + (c - 1) * g, S / c - g].filter((v) => v !== y && v > 0 && dec2(v)), () => (S - g * c * (c - 1) / 2) / c,
      `Ages x, x + ${g}, ..., x + ${(c - 1) * g}: ${c}x + ${g * c * (c - 1) / 2} = ${S}, so ${c}x = ${S - g * c * (c - 1) / 2} and x = ${y} years.`,
      `आयु x, x + ${g}, ..., x + ${(c - 1) * g}: ${c}x + ${g * c * (c - 1) / 2} = ${S}, अतः ${c}x = ${S - g * c * (c - 1) / 2} और x = ${y} वर्ष।`, "yr", 1);
  },
};

const productDiff = {
  id: "productDiff", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(4, 40), range(2, 15)).filter(([y, d]) => y + d <= 60),
  build: (t, prm) => {
    const [y, d] = prm; const P = y * (y + d);
    return AQ(t, `The ages of two brothers differ by ${d} years and the product of their ages is ${P}. How old is the elder brother?`,
      `दो भाइयों की आयु में ${d} वर्ष का अंतर है और उनकी आयु का गुणनफल ${P} है। बड़े भाई की आयु कितनी है?`,
      y + d, [y, Math.round(Math.sqrt(P)), y + 2 * d].filter((v) => v !== y + d && v > 0), () => (d + Math.sqrt(d * d + 4 * P)) / 2,
      `Younger = x: x(x + ${d}) = ${P}, i.e. x² + ${d}x − ${P} = 0, which gives x = ${y}. Elder = ${y} + ${d} = ${y + d} years.`,
      `छोटा = x: x(x + ${d}) = ${P}, यानी x² + ${d}x − ${P} = 0, जिससे x = ${y}। बड़ा = ${y} + ${d} = ${y + d} वर्ष।`, "yr", 1);
  },
};

const threeRatio = {
  id: "threeRatio", levels: ["medium", "hard", "advanced"],
  cands: () => cross([[1, 2, 3], [2, 3, 4], [2, 3, 5], [3, 4, 5], [1, 3, 5], [3, 5, 7], [2, 5, 8], [4, 5, 6], [1, 2, 4], [3, 4, 8]], range(2, 10), range(2, 10), [0, 2]).filter(([r, u, k]) => okAge(r[2] * u + k)),
  build: (t, prm) => {
    const [r, u, k, i] = prm; const now = r.map((x) => x * u); const S = now.reduce((a, b) => a + b, 0) + 3 * k; const nm = ["A", "B", "C"][i]; const ans = now[i];
    return AQ(t, `The present ages of A, B and C are in the ratio ${r.join(" : ")}. After ${k} years, the sum of their ages will be ${S} years. What is ${nm}'s present age?`,
      `A, B और C की वर्तमान आयु ${r.join(" : ")} के अनुपात में है। ${k} वर्ष बाद उनकी आयु का योग ${S} वर्ष होगा। ${nm} की वर्तमान आयु कितनी है?`,
      ans, [S * r[i] / (r[0] + r[1] + r[2]), ans + k, (S - k) * r[i] / (r[0] + r[1] + r[2])].filter((v) => v !== ans && v > 0 && dec2(v)), () => (S - 3 * k) * r[i] / (r[0] + r[1] + r[2]),
      `Now the ages add up to ${S} − 3 × ${k} = ${S - 3 * k}. One ratio part = ${S - 3 * k} ÷ ${r[0] + r[1] + r[2]} = ${u}, so ${nm} = ${r[i]} × ${u} = ${ans} years.`,
      `अभी आयु का योग ${S} − 3 × ${k} = ${S - 3 * k} है। अनुपात का एक भाग = ${S - 3 * k} ÷ ${r[0] + r[1] + r[2]} = ${u}, अतः ${nm} = ${r[i]} × ${u} = ${ans} वर्ष।`, "yr", 1);
  },
};

// The ratio k1 years ago and k2 years from now; the present ages.
const AA = () => cross(range(5, 40), range(8, 60), range(2, 8), range(2, 10)).filter(([A, B, k1, k2]) => A < B && B - A >= 2 && A - k1 >= 1 && rat(A - k1, B - k1) !== rat(A + k2, B + k2) && rat(A - k1, B - k1).split(" : ").every((v) => Number(v) <= 15) && rat(A + k2, B + k2).split(" : ").every((v) => Number(v) <= 15));
const agoAndAfter = {
  id: "agoAndAfter", levels: ["medium", "hard", "advanced"],
  cands: () => thin(AA(), (p) => [p[0], p[2], p[3]]),
  build: (t, prm) => {
    const [A, B, k1, k2] = prm; const [p, q] = rat(A - k1, B - k1).split(" : ").map(Number); const [r, s] = rat(A + k2, B + k2).split(" : ").map(Number);
    return AQ(t, `${k1} years ago the ages of A and B were in the ratio ${p} : ${q}. ${k2} years from now they will be in the ratio ${r} : ${s}. What is the sum of their present ages?`,
      `${k1} वर्ष पहले A और B की आयु ${p} : ${q} के अनुपात में थी। अब से ${k2} वर्ष बाद यह ${r} : ${s} के अनुपात में होगी। उनकी वर्तमान आयु का योग कितना है?`,
      A + B, [A + B - 2 * k1, A + B + 2 * k2, (p + q) * (k1 + k2)].filter((v) => v !== A + B && v > 0), () => { const x = (k1 + k2) * (r - s) / (s * p - r * q); return (p + q) * x + 2 * k1; },
      `${k1} years ago: ${p}x and ${q}x. Then ${p}x + ${k1 + k2} : ${q}x + ${k1 + k2} = ${r} : ${s} gives x = ${n((A - k1) / p)}, so they were ${A - k1} and ${B - k1}. Now: ${A} + ${B} = ${A + B} years.`,
      `${k1} वर्ष पहले: ${p}x और ${q}x। तब ${p}x + ${k1 + k2} : ${q}x + ${k1 + k2} = ${r} : ${s} से x = ${n((A - k1) / p)}, अतः वे ${A - k1} और ${B - k1} थे। अभी: ${A} + ${B} = ${A + B} वर्ष।`, "yr", 1);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
// "I was as old as you are now when you were born": father = 2 × son.
const asOldAs = {
  id: "asOldAs", levels: ["hard", "advanced"],
  cands: () => cross(range(18, 40), range(2, 15)).filter(([s, k]) => 2 * s - k >= 30),
  build: (t, prm) => {
    const [s, k] = prm; const f = 2 * s;
    return AQ(t, `A father tells his son, "I was as old as you are now when you were born." If the father was ${f - k} years old ${k} years ago, how old is the son now?`,
      `एक पिता अपने पुत्र से कहता है, "जब तुम पैदा हुए थे, तब मेरी आयु उतनी थी जितनी आज तुम्हारी है।" यदि ${k} वर्ष पहले पिता ${f - k} वर्ष के थे, तो पुत्र की वर्तमान आयु कितनी है?`,
      s, [f - k, (f - k) / 2, s + k].filter((v) => v !== s && v > 0 && dec2(v)), () => (f - k + k) / 2,
      `The gap between them equals the son's age, so the father is twice the son's age. Father now = ${f - k} + ${k} = ${f}, son = ${f} ÷ 2 = ${s} years.`,
      `दोनों का अंतर पुत्र की आयु के बराबर है, अतः पिता की आयु पुत्र की दोगुनी है। पिता अभी = ${f - k} + ${k} = ${f}, पुत्र = ${f} ÷ 2 = ${s} वर्ष।`, "yr", 1);
  },
};

const threeGen = {
  id: "threeGen", levels: ["hard", "advanced"],
  cands: () => cross([2, 3, 4], [2, 3, 4, 5, 6], range(2, 15)).filter(([p, q, c]) => p * q * c <= 85 && q * c >= 18 && p * q * c - q * c >= 18),
  build: (t, prm) => {
    const [p, q, c] = prm; const b = q * c, a = p * b; const S = a + b + c;
    return AQ(t, `A grandfather is ${p} times as old as his son, and the son is ${q} times as old as his grandson. Their ages add up to ${S} years. How old is the son?`,
      `एक दादा की आयु अपने पुत्र की आयु की ${p} गुनी है, और पुत्र की आयु अपने पुत्र (पोते) की आयु की ${q} गुनी है। तीनों की आयु का योग ${S} वर्ष है। पुत्र की आयु कितनी है?`,
      b, [c, a, S / 3].filter((v) => v !== b && v > 0 && dec2(v)), () => q * S / (1 + q + p * q),
      `Grandson = x, son = ${q}x, grandfather = ${p * q}x: ${1 + q + p * q}x = ${S}, so x = ${c}. Son = ${q} × ${c} = ${b} years.`,
      `पोता = x, पुत्र = ${q}x, दादा = ${p * q}x: ${1 + q + p * q}x = ${S}, अतः x = ${c}। पुत्र = ${q} × ${c} = ${b} वर्ष।`, "yr", 1);
  },
};

const birthGap = {
  id: "birthGap", levels: ["hard", "advanced"],
  cands: () => cross(range(1, 6), [2, 3], range(2, 15)).filter(([d, m, c]) => okAge(m * c + d)),
  build: (t, prm) => {
    const [d, m, c] = prm; const b = m * c, a = b + d; const S = a + b + c;
    return AQ(t, `A is ${d} years older than B, and B is ${m === 2 ? "twice" : "three times"} as old as C. The total of their ages is ${S} years. How old is B?`,
      `A, B से ${d} वर्ष बड़ा है, और B की आयु C की आयु की ${m === 2 ? "दोगुनी" : "तिगुनी"} है। तीनों की आयु का योग ${S} वर्ष है। B की आयु कितनी है?`,
      b, [c, a, (S - d) / 2].filter((v) => v !== b && v > 0 && dec2(v)), () => m * (S - d) / (2 * m + 1),
      `C = x, B = ${m}x, A = ${m}x + ${d}: ${2 * m + 1}x + ${d} = ${S}, so x = ${c}. B = ${m} × ${c} = ${b} years.`,
      `C = x, B = ${m}x, A = ${m}x + ${d}: ${2 * m + 1}x + ${d} = ${S}, अतः x = ${c}। B = ${m} × ${c} = ${b} वर्ष।`, "yr", 1);
  },
};

const ratioPresent = {
  id: "ratioPresent", levels: ["hard", "advanced"],
  cands: () => thin(AA(), (p) => [p[1], p[2], p[3]]),
  build: (t, prm) => {
    const [A, B, k1, k2] = prm; const [p, q] = rat(A - k1, B - k1).split(" : ").map(Number); const [r, s] = rat(A + k2, B + k2).split(" : ").map(Number);
    return RQ(t, `${k1} years ago the ages of A and B were in the ratio ${p} : ${q}. ${k2} years from now they will be in the ratio ${r} : ${s}. What is the ratio of their present ages?`,
      `${k1} वर्ष पहले A और B की आयु ${p} : ${q} के अनुपात में थी। अब से ${k2} वर्ष बाद यह ${r} : ${s} के अनुपात में होगी। उनकी वर्तमान आयु का अनुपात क्या है?`,
      [A, B], [[p + r, q + s], [p, q], [r, s]], () => { const x = (k1 + k2) * (r - s) / (s * p - r * q); return [p * x + k1, q * x + k1].map((v) => Math.round(v * 2)); },
      `${k1} years ago they were ${p}x and ${q}x; ${p}x + ${k1 + k2} : ${q}x + ${k1 + k2} = ${r} : ${s} gives x = ${n((A - k1) / p)}. So they were ${A - k1} and ${B - k1}, and are now ${A} and ${B}: ${rat(A, B)}.`,
      `${k1} वर्ष पहले वे ${p}x और ${q}x थे; ${p}x + ${k1 + k2} : ${q}x + ${k1 + k2} = ${r} : ${s} से x = ${n((A - k1) / p)}। अतः वे ${A - k1} और ${B - k1} थे, और अभी ${A} और ${B} हैं: ${rat(A, B)}।`);
  },
};

const KINDS = guard([
  ratioSum, ratioDiff, ratioShift, timesNow, olderSumLater, sumBack, ratioLater, fatherTimes, bornWhen,
  pastTimes, children, productDiff, threeRatio, agoAndAfter,
  asOldAs, threeGen, birthGap, ratioPresent,
]);

const PREFIX = "Ratio & Proportion · Problems on Ages";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
