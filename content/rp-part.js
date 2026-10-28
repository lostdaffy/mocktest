// Ratio & Proportion · Partnership: profit shared in the ratio of capital ×
// time. Every answer is worked out again in `v`; the wrong options are the
// usual slips (time ignored, the share of the other partner, the months
// counted from the wrong end).
const L = require("./rp-lib");
const { n, clean, isInt, AQ, RQ, rat, thin, pick, range, dec2, guard, gcd } = L;
const { fillTopic } = require("./gen");

// cross() without building every combination first: .filter() walks them one
// at a time and keeps only those that pass (the pools here run to millions).
const cross = (...lists) => ({
  filter(ok) {
    const out = []; const acc = [];
    const rec = (i) => { if (i === lists.length) { if (ok(acc)) out.push([...acc]); return; } for (const v of lists[i]) { acc.push(v); rec(i + 1); acc.pop(); } };
    rec(0); return out;
  },
});

const CAP = [5000, 6000, 8000, 9000, 10000, 12000, 15000, 16000, 18000, 20000, 24000, 25000, 30000, 32000, 36000, 40000, 45000, 48000, 50000, 60000, 75000, 80000, 90000];
const sumOf = (a) => a.reduce((x, y) => x + y, 0);
const mo = (m) => (m === 1 ? "1 month" : `${m} months`);
// Profit P that divides into whole rupees for the given weights.
const P_OK = (w, P) => isInt(P / sumOf(w)) || w.every((x) => isInt(P * x / sumOf(w)));
const PROFITS = range(3000, 60000, 1000);

// ---------------------------------------------------------------- EASY
const share2 = {
  id: "share2", levels: ["easy"],
  cands: () => thin(cross(CAP, CAP, PROFITS, ["A", "B"]).filter(([x, y, P]) => x !== y && P_OK([x, y], P)), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [x, y, P, who] = prm; const [a, b] = rat(x, y).split(" : ").map(Number); const s = P * (who === "A" ? a : b) / (a + b);
    return AQ(t, `A and B start a business with ₹${n(x)} and ₹${n(y)}. Out of a profit of ₹${n(P)} at the end of the year, what is ${who}'s share?`,
      `A और B क्रमशः ₹${n(x)} और ₹${n(y)} लगाकर व्यापार शुरू करते हैं। वर्ष के अंत में ₹${n(P)} के लाभ में ${who} का हिस्सा कितना है?`,
      s, [P - s, P / 2, P * (who === "A" ? b : a) / (a + b) + 100].filter((v) => v !== s && isInt(v)), () => P * (who === "A" ? x : y) / (x + y),
      `Capitals ${n(x)} : ${n(y)} = ${a} : ${b}, for the same time. ${who}'s share = ${n(P)} × ${who === "A" ? a : b}/${a + b} = ₹${n(s)}.`,
      `पूँजी ${n(x)} : ${n(y)} = ${a} : ${b}, समान समय के लिए। ${who} का हिस्सा = ${n(P)} × ${who === "A" ? a : b}/${a + b} = ₹${n(s)}।`, "rs", 500);
  },
};

const share3 = {
  id: "share3", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, CAP, PROFITS, [0, 1, 2]).filter(([x, y, z, P]) => x < y && y !== z && x !== z && P_OK([x, y, z], P)), (p) => [p[0], p[1], p[4]]),
  build: (t, prm) => {
    const [x, y, z, P, i] = prm; const r = rat(x, y, z).split(" : ").map(Number); const nm = ["A", "B", "C"][i]; const s = P * r[i] / sumOf(r);
    return AQ(t, `A, B and C invest ₹${n(x)}, ₹${n(y)} and ₹${n(z)} in a business for a year. If the profit is ₹${n(P)}, what is ${nm}'s share?`,
      `A, B और C एक वर्ष के लिए एक व्यापार में ₹${n(x)}, ₹${n(y)} और ₹${n(z)} लगाते हैं। यदि लाभ ₹${n(P)} है, तो ${nm} का हिस्सा कितना है?`,
      s, [P / 3, P * r[(i + 1) % 3] / sumOf(r), P - s].filter((v) => v !== s && isInt(v)), () => P * [x, y, z][i] / (x + y + z),
      `Capitals ${n(x)} : ${n(y)} : ${n(z)} = ${r.join(" : ")}. ${nm}'s share = ${n(P)} × ${r[i]}/${sumOf(r)} = ₹${n(s)}.`,
      `पूँजी ${n(x)} : ${n(y)} : ${n(z)} = ${r.join(" : ")}। ${nm} का हिस्सा = ${n(P)} × ${r[i]}/${sumOf(r)} = ₹${n(s)}।`, "rs", 500);
  },
};

const timeOnly = {
  id: "timeOnly", levels: ["easy"],
  cands: () => cross(CAP, range(2, 12), range(2, 12)).filter(([x, t1, t2]) => t1 !== t2 && t1 + t2 > 8).filter((_, i) => i % 3 === 0),
  build: (t, prm) => {
    const [x, t1, t2] = prm;
    return RQ(t, `A and B each invest ₹${n(x)} in a business, A for ${mo(t1)} and B for ${mo(t2)}. In what ratio should they share the profit?`,
      `A और B दोनों एक व्यापार में ₹${n(x)} लगाते हैं, A ${t1} महीने के लिए और B ${t2} महीने के लिए। उन्हें लाभ किस अनुपात में बाँटना चाहिए?`,
      [t1, t2], [[t2, t1], [1, 1], [t1 + 1, t2]], () => [x * t1, x * t2],
      `The capitals are equal, so the profit goes by time: ${t1} : ${t2} = ${rat(t1, t2)}.`,
      `पूँजी बराबर है, अतः लाभ समय के अनुपात में: ${t1} : ${t2} = ${rat(t1, t2)}।`);
  },
};

const capTime = {
  id: "capTime", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, range(3, 12), CAP, range(3, 12), PROFITS, ["A", "B"]).filter(([x, t1, y, t2, P]) => (x !== y || t1 !== t2) && t1 !== t2 && P_OK([x * t1, y * t2], P)), (p) => [p[0], p[2], p[1]]),
  build: (t, prm) => {
    const [x, t1, y, t2, P, who] = prm; const r = rat(x * t1, y * t2).split(" : ").map(Number); const s = P * (who === "A" ? r[0] : r[1]) / sumOf(r);
    const wrong = rat(x, y).split(" : ").map(Number);
    return AQ(t, `A invests ₹${n(x)} for ${mo(t1)} and B invests ₹${n(y)} for ${mo(t2)} in a business. If the profit is ₹${n(P)}, what is ${who}'s share?`,
      `एक व्यापार में A ₹${n(x)}, ${t1} महीने के लिए और B ₹${n(y)}, ${t2} महीने के लिए लगाता है। यदि लाभ ₹${n(P)} है, तो ${who} का हिस्सा कितना है?`,
      s, [P * (who === "A" ? wrong[0] : wrong[1]) / sumOf(wrong), P - s, P / 2].filter((v) => v !== s && isInt(v)), () => P * (who === "A" ? x * t1 : y * t2) / (x * t1 + y * t2),
      `Profit goes by capital × time: ${n(x)} × ${t1} : ${n(y)} × ${t2} = ${r.join(" : ")}. ${who}'s share = ${n(P)} × ${who === "A" ? r[0] : r[1]}/${sumOf(r)} = ₹${n(s)}.`,
      `लाभ पूँजी × समय के अनुपात में: ${n(x)} × ${t1} : ${n(y)} × ${t2} = ${r.join(" : ")}। ${who} का हिस्सा = ${n(P)} × ${who === "A" ? r[0] : r[1]}/${sumOf(r)} = ₹${n(s)}।`, "rs", 500);
  },
};

const ratioOfProfit = {
  id: "ratioOfProfit", levels: ["easy", "medium"],
  cands: () => thin(cross(CAP, range(3, 12), CAP, range(3, 12), CAP, range(3, 12)).filter(([x, t1, y, t2, z, t3]) => x !== y && y !== z && t1 !== t3 && rat(x * t1, y * t2, z * t3).split(" : ").every((v) => Number(v) <= 40)), (p) => [p[0], p[2]]),
  build: (t, prm) => {
    const [x, t1, y, t2, z, t3] = prm; const r = [x * t1, y * t2, z * t3];
    return RQ(t, `A invests ₹${n(x)} for ${mo(t1)}, B ₹${n(y)} for ${mo(t2)} and C ₹${n(z)} for ${mo(t3)}. In what ratio will they share the profit?`,
      `A ₹${n(x)}, ${t1} महीने के लिए, B ₹${n(y)}, ${t2} महीने के लिए और C ₹${n(z)}, ${t3} महीने के लिए लगाते हैं। वे लाभ किस अनुपात में बाँटेंगे?`,
      r, [[x, y, z], [t1, t2, t3], [x * t3, y * t2, z * t1]], () => [x * t1 * 2, y * t2 * 2, z * t3 * 2],
      `Capital × time: ${n(x)} × ${t1} : ${n(y)} × ${t2} : ${n(z)} × ${t3} = ${r.map(n).join(" : ")} = ${rat(...r)}.`,
      `पूँजी × समय: ${n(x)} × ${t1} : ${n(y)} × ${t2} : ${n(z)} × ${t3} = ${r.map(n).join(" : ")} = ${rat(...r)}।`);
  },
};

const findInvest = {
  id: "findInvest", levels: ["easy", "medium"],
  cands: () => cross(CAP, [[2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [5, 7], [2, 5], [4, 3], [5, 3], [3, 2], [7, 5]]).filter(([x, [a, b]]) => isInt(x * b / a) && x * b / a <= 150000),
  build: (t, prm) => {
    const [x, [a, b]] = prm; const y = x * b / a;
    return AQ(t, `A and B start a business together, A with ₹${n(x)}. At the end of the year they share the profit in the ratio ${a} : ${b}. How much did B invest?`,
      `A और B मिलकर व्यापार शुरू करते हैं, A ₹${n(x)} से। वर्ष के अंत में वे लाभ ${a} : ${b} के अनुपात में बाँटते हैं। B ने कितनी राशि लगाई?`,
      y, [x * a / b, x + (b - a) * 1000, x * (a + b) / a].filter((v) => v !== y && isInt(v) && v > 0), () => b * (x / a),
      `Same time, so capitals are in the profit ratio: ${n(x)} : B = ${a} : ${b}. B = ${n(x)} × ${b}/${a} = ₹${n(y)}.`,
      `समय समान है, अतः पूँजी लाभ के अनुपात में: ${n(x)} : B = ${a} : ${b}। B = ${n(x)} × ${b}/${a} = ₹${n(y)}।`, "rs", 500);
  },
};

const findTotal = {
  id: "findTotal", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, range(500, 30000, 100)).filter(([x, y, s]) => x !== y && isInt(s * (x + y) / x) && s * (x + y) / x <= 100000), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [x, y, s] = prm; const [a, b] = rat(x, y).split(" : ").map(Number); const P = s * (a + b) / a;
    return AQ(t, `A and B invest ₹${n(x)} and ₹${n(y)} in a business for a year. A's share of the profit is ₹${n(s)}. What is the total profit?`,
      `A और B एक वर्ष के लिए एक व्यापार में ₹${n(x)} और ₹${n(y)} लगाते हैं। लाभ में A का हिस्सा ₹${n(s)} है। कुल लाभ कितना है?`,
      P, [s * b / a, s * 2, s + s * a / b].filter((v) => v !== P && isInt(v)), () => s * (x + y) / x,
      `Capitals ${a} : ${b}. A's ${a} parts = ₹${n(s)}, so one part = ₹${n(s / a)} and the total ${a + b} parts = ₹${n(P)}.`,
      `पूँजी ${a} : ${b}। A के ${a} भाग = ₹${n(s)}, अतः एक भाग = ₹${n(s / a)} और कुल ${a + b} भाग = ₹${n(P)}।`, "rs", 500);
  },
};

const diffShares = {
  id: "diffShares", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, range(4, 12), CAP, range(4, 12), range(200, 9000, 100)).filter(([x, t1, y, t2, D]) => { const [a, b] = rat(x * t1, y * t2).split(" : ").map(Number); return a !== b && isInt(D / Math.abs(a - b)) && D * (a + b) / Math.abs(a - b) <= 100000; }), (p) => [p[0], p[2], p[1]]),
  build: (t, prm) => {
    const [x, t1, y, t2, D] = prm; const [a, b] = rat(x * t1, y * t2).split(" : ").map(Number); const P = D * (a + b) / Math.abs(a - b); const big = a > b ? "A" : "B";
    return AQ(t, `A invests ₹${n(x)} for ${mo(t1)} and B invests ₹${n(y)} for ${mo(t2)}. ${big}'s share of the profit is ₹${n(D)} more than the other's. What is the total profit?`,
      `A ₹${n(x)}, ${t1} महीने के लिए और B ₹${n(y)}, ${t2} महीने के लिए लगाता है। लाभ में ${big} का हिस्सा दूसरे से ₹${n(D)} अधिक है। कुल लाभ कितना है?`,
      P, [D * (a + b), D * Math.max(a, b) / Math.abs(a - b), D * 2].filter((v) => v !== P && isInt(v)), () => D / Math.abs(x * t1 - y * t2) * (x * t1 + y * t2),
      `Ratio = ${n(x)} × ${t1} : ${n(y)} × ${t2} = ${a} : ${b}. The difference of ${Math.abs(a - b)} part${Math.abs(a - b) > 1 ? "s" : ""} = ₹${n(D)}, so one part = ₹${n(D / Math.abs(a - b))} and the total ${a + b} parts = ₹${n(P)}.`,
      `अनुपात = ${n(x)} × ${t1} : ${n(y)} × ${t2} = ${a} : ${b}। ${Math.abs(a - b)} भाग का अंतर = ₹${n(D)}, अतः एक भाग = ₹${n(D / Math.abs(a - b))} और कुल ${a + b} भाग = ₹${n(P)}।`, "rs", 500);
  },
};

const otherShare = {
  id: "otherShare", levels: ["easy"],
  cands: () => thin(cross(CAP, range(3, 12), CAP, range(3, 12), range(500, 20000, 100)).filter(([x, t1, y, t2, s]) => { const [a, b] = rat(x * t1, y * t2).split(" : ").map(Number); return a !== b && isInt(s / a) && s * b / a <= 60000; }), (p) => [p[0], p[2], p[1]]),
  build: (t, prm) => {
    const [x, t1, y, t2, s] = prm; const [a, b] = rat(x * t1, y * t2).split(" : ").map(Number); const B = s * b / a;
    return AQ(t, `A puts ₹${n(x)} into a business for ${mo(t1)} and B puts ₹${n(y)} for ${mo(t2)}. A's share of the profit is ₹${n(s)}. What is B's share?`,
      `A एक व्यापार में ${t1} महीने के लिए ₹${n(x)} और B ${t2} महीने के लिए ₹${n(y)} लगाता है। लाभ में A का हिस्सा ₹${n(s)} है। B का हिस्सा कितना है?`,
      B, [s * y / x, s * a / b, s * t2 / t1].filter((v) => v !== B && isInt(v)), () => s * (y * t2) / (x * t1),
      `A : B = ${n(x)} × ${t1} : ${n(y)} × ${t2} = ${a} : ${b}. B = ${n(s)} × ${b}/${a} = ₹${n(B)}.`,
      `A : B = ${n(x)} × ${t1} : ${n(y)} × ${t2} = ${a} : ${b}। B = ${n(s)} × ${b}/${a} = ₹${n(B)}।`, "rs", 500);
  },
};

// ---------------------------------------------------------------- MEDIUM
const joinLater = {
  id: "joinLater", levels: ["easy", "medium", "hard"],
  cands: () => thin(cross(CAP, CAP, range(2, 9), PROFITS, ["A", "B"]).filter(([x, y, m, P]) => P_OK([x * 12, y * (12 - m)], P) && rat(x * 12, y * (12 - m)).split(" : ").every((v) => Number(v) <= 30)), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [x, y, m, P, who] = prm; const r = rat(x * 12, y * (12 - m)).split(" : ").map(Number); const s = P * (who === "A" ? r[0] : r[1]) / sumOf(r);
    const w2 = rat(x * 12, y * m).split(" : ").map(Number);
    return AQ(t, `A starts a business with ₹${n(x)}. After ${mo(m)}, B joins him with ₹${n(y)}. Out of a profit of ₹${n(P)} at the end of the year, what is ${who}'s share?`,
      `A ₹${n(x)} से एक व्यापार शुरू करता है। ${m} महीने बाद B ₹${n(y)} लेकर उसके साथ जुड़ जाता है। वर्ष के अंत में ₹${n(P)} के लाभ में ${who} का हिस्सा कितना है?`,
      s, [P * (who === "A" ? w2[0] : w2[1]) / sumOf(w2), P * (who === "A" ? x : y) / (x + y), P - s].filter((v) => v !== s && isInt(v)), () => P * (who === "A" ? x * 12 : y * (12 - m)) / (x * 12 + y * (12 - m)),
      `A's money works 12 months, B's ${12 - m} months. Ratio = ${n(x)} × 12 : ${n(y)} × ${12 - m} = ${r.join(" : ")}. ${who}'s share = ${n(P)} × ${who === "A" ? r[0] : r[1]}/${sumOf(r)} = ₹${n(s)}.`,
      `A की पूँजी 12 महीने, B की ${12 - m} महीने लगी। अनुपात = ${n(x)} × 12 : ${n(y)} × ${12 - m} = ${r.join(" : ")}। ${who} का हिस्सा = ${n(P)} × ${who === "A" ? r[0] : r[1]}/${sumOf(r)} = ₹${n(s)}।`, "rs", 500);
  },
};

const withdraw = {
  id: "withdraw", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, range(3, 9), [2000, 3000, 4000, 5000, 6000, 8000, 10000], PROFITS).filter(([x, y, m, w, P]) => w < x && P_OK([x * m + (x - w) * (12 - m), y * 12], P) && rat(x * m + (x - w) * (12 - m), y * 12).split(" : ").every((v) => Number(v) <= 40)), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [x, y, m, w, P] = prm; const A = x * m + (x - w) * (12 - m); const r = rat(A, y * 12).split(" : ").map(Number); const s = P * r[0] / sumOf(r);
    const wr = rat(x, y).split(" : ").map(Number);
    return AQ(t, `A and B start a business with ₹${n(x)} and ₹${n(y)}. After ${mo(m)}, A takes out ₹${n(w)}. Out of a profit of ₹${n(P)} at the end of the year, what is A's share?`,
      `A और B ₹${n(x)} और ₹${n(y)} से व्यापार शुरू करते हैं। ${m} महीने बाद A ₹${n(w)} निकाल लेता है। वर्ष के अंत में ₹${n(P)} के लाभ में A का हिस्सा कितना है?`,
      s, [P * wr[0] / sumOf(wr), P - s, P * (x - w) / (x - w + y)].filter((v) => v !== s && isInt(v)), () => P * (x * 12 - w * (12 - m)) / (x * 12 - w * (12 - m) + y * 12),
      `A: ${n(x)} × ${m} + ${n(x - w)} × ${12 - m} = ${n(A)}. B: ${n(y)} × 12 = ${n(y * 12)}. Ratio ${r.join(" : ")}, so A's share = ${n(P)} × ${r[0]}/${sumOf(r)} = ₹${n(s)}.`,
      `A: ${n(x)} × ${m} + ${n(x - w)} × ${12 - m} = ${n(A)}। B: ${n(y)} × 12 = ${n(y * 12)}। अनुपात ${r.join(" : ")}, अतः A का हिस्सा = ${n(P)} × ${r[0]}/${sumOf(r)} = ₹${n(s)}।`, "rs", 500);
  },
};

const addMore = {
  id: "addMore", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, range(3, 9), [2000, 4000, 5000, 6000, 8000, 10000, 12000], PROFITS).filter(([x, y, m, w, P]) => P_OK([x * 12, y * m + (y + w) * (12 - m)], P) && rat(x * 12, y * m + (y + w) * (12 - m)).split(" : ").every((v) => Number(v) <= 40)), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [x, y, m, w, P] = prm; const B = y * m + (y + w) * (12 - m); const r = rat(x * 12, B).split(" : ").map(Number); const s = P * r[1] / sumOf(r);
    const wr = rat(x, y + w).split(" : ").map(Number);
    return AQ(t, `A and B start a business with ₹${n(x)} and ₹${n(y)}. After ${mo(m)}, B puts in ₹${n(w)} more. Out of a profit of ₹${n(P)} at the end of the year, what is B's share?`,
      `A और B ₹${n(x)} और ₹${n(y)} से व्यापार शुरू करते हैं। ${m} महीने बाद B ₹${n(w)} और लगा देता है। वर्ष के अंत में ₹${n(P)} के लाभ में B का हिस्सा कितना है?`,
      s, [P * wr[1] / sumOf(wr), P - s, P * y / (x + y)].filter((v) => v !== s && isInt(v)), () => P * (y * 12 + w * (12 - m)) / (x * 12 + y * 12 + w * (12 - m)),
      `A: ${n(x)} × 12 = ${n(x * 12)}. B: ${n(y)} × ${m} + ${n(y + w)} × ${12 - m} = ${n(B)}. Ratio ${r.join(" : ")}, so B's share = ${n(P)} × ${r[1]}/${sumOf(r)} = ₹${n(s)}.`,
      `A: ${n(x)} × 12 = ${n(x * 12)}। B: ${n(y)} × ${m} + ${n(y + w)} × ${12 - m} = ${n(B)}। अनुपात ${r.join(" : ")}, अतः B का हिस्सा = ${n(P)} × ${r[1]}/${sumOf(r)} = ₹${n(s)}।`, "rs", 500);
  },
};

const workingPct = {
  id: "workingPct", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, [5, 10, 15, 20, 25], PROFITS).filter(([x, y, k, P]) => x !== y && isInt(P * k / 100) && P_OK([x, y], P * (100 - k) / 100)), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [x, y, k, P] = prm; const m = P * k / 100; const rest = P - m; const [a, b] = rat(x, y).split(" : ").map(Number); const A = m + rest * a / (a + b);
    return AQ(t, `A and B invest ₹${n(x)} and ₹${n(y)} in a business. A runs the business and gets ${k}% of the profit for it; the rest is shared in the ratio of their capitals. If the profit is ₹${n(P)}, how much does A get in all?`,
      `A और B एक व्यापार में ₹${n(x)} और ₹${n(y)} लगाते हैं। A व्यापार चलाता है और इसके लिए लाभ का ${k}% पाता है; शेष उनकी पूँजी के अनुपात में बँटता है। यदि लाभ ₹${n(P)} है, तो A को कुल कितना मिलता है?`,
      A, [P * a / (a + b), rest * a / (a + b), m + P * a / (a + b)].filter((v) => v !== A && isInt(v)), () => P * k / 100 + (P - P * k / 100) * x / (x + y),
      `For running it: ${k}% of ${n(P)} = ₹${n(m)}. The rest ₹${n(rest)} in ${a} : ${b}: A gets ₹${n(rest * a / (a + b))}. Total = ${n(m)} + ${n(rest * a / (a + b))} = ₹${n(A)}.`,
      `व्यापार चलाने के लिए: ${n(P)} का ${k}% = ₹${n(m)}। शेष ₹${n(rest)}, ${a} : ${b} में: A को ₹${n(rest * a / (a + b))}। कुल = ${n(m)} + ${n(rest * a / (a + b))} = ₹${n(A)}।`, "rs", 500);
  },
};

const findMonths = {
  id: "findMonths", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, range(1, 9)).filter(([x, y, m]) => rat(x * 12, y * (12 - m)).split(" : ").every((v) => Number(v) <= 20)), (p) => [p[0], p[1]]),
  build: (t, prm) => {
    const [x, y, m] = prm; const r = rat(x * 12, y * (12 - m));
    return AQ(t, `A starts a business with ₹${n(x)}. Some months later B joins him with ₹${n(y)}. At the end of the year the profit is shared in the ratio ${r}. After how many months did B join?`,
      `A ₹${n(x)} से व्यापार शुरू करता है। कुछ महीने बाद B ₹${n(y)} लेकर जुड़ता है। वर्ष के अंत में लाभ ${r} के अनुपात में बँटता है। B कितने महीने बाद जुड़ा?`,
      m, [12 - m, m + 1, m > 1 ? m - 1 : m + 2].filter((v) => v !== m && v > 0), () => { const [a, b] = r.split(" : ").map(Number); return 12 - x * 12 * b / (a * y); },
      `If B's money worked t months: ${n(x)} × 12 : ${n(y)} × t = ${r}, which gives t = ${12 - m}. So B joined after 12 − ${12 - m} = ${mo(m)}.`,
      `यदि B की पूँजी t महीने लगी: ${n(x)} × 12 : ${n(y)} × t = ${r}, जिससे t = ${12 - m}। अतः B, 12 − ${12 - m} = ${m} महीने बाद जुड़ा।`, "mo", 1);
  },
};

const salaryPartner = {
  id: "salaryPartner", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, [500, 800, 1000, 1200, 1500, 2000], range(20000, 90000, 1000)).filter(([x, y, sal, P]) => x !== y && P > sal * 12 * 1.5 && P_OK([x, y], P - sal * 12)), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [x, y, sal, P] = prm; const S = sal * 12; const rest = P - S; const [a, b] = rat(x, y).split(" : ").map(Number); const A = S + rest * a / (a + b);
    return AQ(t, `A and B invest ₹${n(x)} and ₹${n(y)} in a business. A, who runs it, is paid ₹${n(sal)} a month out of the profit; the rest is shared in the ratio of their capitals. If the year's profit is ₹${n(P)}, how much does A get in all?`,
      `A और B एक व्यापार में ₹${n(x)} और ₹${n(y)} लगाते हैं। A व्यापार चलाता है और उसे लाभ में से ₹${n(sal)} प्रति माह मिलते हैं; शेष पूँजी के अनुपात में बँटता है। यदि वर्ष का लाभ ₹${n(P)} है, तो A को कुल कितना मिलता है?`,
      A, [P * a / (a + b), rest * a / (a + b), sal + (P - sal) * a / (a + b)].filter((v) => v !== A && isInt(v)), () => sal * 12 + (P - sal * 12) * x / (x + y),
      `Salary for the year = 12 × ${n(sal)} = ₹${n(S)}. The rest ₹${n(rest)} in ${a} : ${b}: A gets ₹${n(rest * a / (a + b))}. Total = ${n(S)} + ${n(rest * a / (a + b))} = ₹${n(A)}.`,
      `वर्ष का वेतन = 12 × ${n(sal)} = ₹${n(S)}। शेष ₹${n(rest)}, ${a} : ${b} में: A को ₹${n(rest * a / (a + b))}। कुल = ${n(S)} + ${n(rest * a / (a + b))} = ₹${n(A)}।`, "rs", 500);
  },
};

const threeJoin = {
  id: "threeJoin", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, CAP, range(2, 9), PROFITS).filter(([x, y, z, m, P]) => x !== y && P_OK([x * 12, y * 12, z * (12 - m)], P) && rat(x * 12, y * 12, z * (12 - m)).split(" : ").every((v) => Number(v) <= 30)), (p) => [p[0], p[1], p[3]]),
  build: (t, prm) => {
    const [x, y, z, m, P] = prm; const r = rat(x * 12, y * 12, z * (12 - m)).split(" : ").map(Number); const s = P * r[2] / sumOf(r);
    const wr = rat(x, y, z).split(" : ").map(Number);
    return AQ(t, `A and B start a business with ₹${n(x)} and ₹${n(y)}. After ${mo(m)}, C joins them with ₹${n(z)}. Out of a profit of ₹${n(P)} at the end of the year, what is C's share?`,
      `A और B ₹${n(x)} और ₹${n(y)} से व्यापार शुरू करते हैं। ${m} महीने बाद C ₹${n(z)} लेकर जुड़ता है। वर्ष के अंत में ₹${n(P)} के लाभ में C का हिस्सा कितना है?`,
      s, [P * wr[2] / sumOf(wr), P / 3, P * z * m / (x * 12 + y * 12 + z * m)].filter((v) => v !== s && isInt(v)), () => P * z * (12 - m) / (12 * x + 12 * y + z * (12 - m)),
      `A : B : C = ${n(x)} × 12 : ${n(y)} × 12 : ${n(z)} × ${12 - m} = ${r.join(" : ")}. C's share = ${n(P)} × ${r[2]}/${sumOf(r)} = ₹${n(s)}.`,
      `A : B : C = ${n(x)} × 12 : ${n(y)} × 12 : ${n(z)} × ${12 - m} = ${r.join(" : ")}। C का हिस्सा = ${n(P)} × ${r[2]}/${sumOf(r)} = ₹${n(s)}।`, "rs", 500);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
const timeFromRatios = {
  id: "timeFromRatios", levels: ["hard", "advanced"],
  cands: () => cross([[2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [5, 7], [2, 5], [3, 2], [5, 3], [4, 3]], [[2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [5, 7], [2, 5], [3, 2], [5, 3], [4, 3], [1, 2], [2, 1]]).filter(([[a, b], [c, d]]) => a * d !== b * c),
  build: (t, prm) => {
    const [[a, b], [c, d]] = prm;
    return RQ(t, `A and B invest in a business in the ratio ${a} : ${b}. If they share the profit in the ratio ${c} : ${d}, what is the ratio of the times for which their money was invested?`,
      `A और B एक व्यापार में ${a} : ${b} के अनुपात में पूँजी लगाते हैं। यदि वे लाभ ${c} : ${d} के अनुपात में बाँटते हैं, तो उनकी पूँजी जितने समय के लिए लगी, उसका अनुपात क्या है?`,
      [c * b, d * a], [[c * a, d * b], [d * a, c * b], [a + c, b + d]], () => [c * b * 2, d * a * 2],
      `Profit = capital × time, so time = profit ÷ capital: ${c}/${a} : ${d}/${b} = ${c * b} : ${d * a}${rat(c * b, d * a) === `${c * b} : ${d * a}` ? "" : ` = ${rat(c * b, d * a)}`}.`,
      `लाभ = पूँजी × समय, अतः समय = लाभ ÷ पूँजी: ${c}/${a} : ${d}/${b} = ${c * b} : ${d * a}${rat(c * b, d * a) === `${c * b} : ${d * a}` ? "" : ` = ${rat(c * b, d * a)}`}।`);
  },
};

const capitalFromRatios = {
  id: "capitalFromRatios", levels: ["hard", "advanced"],
  cands: () => cross([[2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [5, 7], [2, 5], [3, 2], [5, 3], [4, 3], [1, 2]], [[2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [2, 5], [3, 2], [5, 3], [4, 3], [2, 1]]).filter(([[a, b], [c, d]]) => a * d !== b * c && !(a === c && b === d)),
  build: (t, prm) => {
    const [[a, b], [c, d]] = prm;
    return RQ(t, `The ratio of the profits of A and B is ${a} : ${b} and the ratio of the times for which they invested is ${c} : ${d}. What is the ratio of their capitals?`,
      `A और B के लाभ का अनुपात ${a} : ${b} है और जितने समय के लिए उन्होंने पूँजी लगाई उसका अनुपात ${c} : ${d} है। उनकी पूँजी का अनुपात क्या है?`,
      [a * d, b * c], [[a * c, b * d], [b * c, a * d], [a, b]], () => [a * d * 2, b * c * 2],
      `Capital = profit ÷ time: ${a}/${c} : ${b}/${d} = ${a * d} : ${b * c}${rat(a * d, b * c) === `${a * d} : ${b * c}` ? "" : ` = ${rat(a * d, b * c)}`}.`,
      `पूँजी = लाभ ÷ समय: ${a}/${c} : ${b}/${d} = ${a * d} : ${b * c}${rat(a * d, b * c) === `${a * d} : ${b * c}` ? "" : ` = ${rat(a * d, b * c)}`}।`);
  },
};

const multiChange = {
  id: "multiChange", levels: ["hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, range(3, 8), [2000, 3000, 5000, 6000, 10000], range(4, 10), [2000, 4000, 5000, 6000, 10000], PROFITS).filter(([x, y, m1, w1, m2, w2, P]) => m1 !== m2 && w2 < y && P_OK([x * m1 + (x + w1) * (12 - m1), y * m2 + (y - w2) * (12 - m2)], P) && rat(x * m1 + (x + w1) * (12 - m1), y * m2 + (y - w2) * (12 - m2)).split(" : ").every((v) => Number(v) <= 40)), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [x, y, m1, w1, m2, w2, P] = prm; const A = x * m1 + (x + w1) * (12 - m1), B = y * m2 + (y - w2) * (12 - m2); const r = rat(A, B).split(" : ").map(Number); const s = P * r[0] / sumOf(r);
    const wr = rat(x, y).split(" : ").map(Number);
    return AQ(t, `A and B start a business with ₹${n(x)} and ₹${n(y)}. After ${mo(m1)} A adds ₹${n(w1)}, and after ${mo(m2)} B takes out ₹${n(w2)}. Out of a profit of ₹${n(P)} at the end of the year, what is A's share?`,
      `A और B ₹${n(x)} और ₹${n(y)} से व्यापार शुरू करते हैं। ${m1} महीने बाद A ₹${n(w1)} और लगाता है, तथा ${m2} महीने बाद B ₹${n(w2)} निकाल लेता है। वर्ष के अंत में ₹${n(P)} के लाभ में A का हिस्सा कितना है?`,
      s, [P * wr[0] / sumOf(wr), P - s, P * (x + w1) / (x + w1 + y - w2)].filter((v) => v !== s && isInt(v)), () => P * (x * 12 + w1 * (12 - m1)) / (x * 12 + w1 * (12 - m1) + y * 12 - w2 * (12 - m2)),
      `A: ${n(x)} × ${m1} + ${n(x + w1)} × ${12 - m1} = ${n(A)}. B: ${n(y)} × ${m2} + ${n(y - w2)} × ${12 - m2} = ${n(B)}. Ratio ${r.join(" : ")}, so A's share = ${n(P)} × ${r[0]}/${sumOf(r)} = ₹${n(s)}.`,
      `A: ${n(x)} × ${m1} + ${n(x + w1)} × ${12 - m1} = ${n(A)}। B: ${n(y)} × ${m2} + ${n(y - w2)} × ${12 - m2} = ${n(B)}। अनुपात ${r.join(" : ")}, अतः A का हिस्सा = ${n(P)} × ${r[0]}/${sumOf(r)} = ₹${n(s)}।`, "rs", 500);
  },
};

const leaveEarly = {
  id: "leaveEarly", levels: ["hard", "advanced"],
  cands: () => thin(cross(CAP, CAP, CAP, range(3, 10), PROFITS).filter(([x, y, z, m, P]) => x !== z && P_OK([x * 12, y * m, z * 12], P) && rat(x * 12, y * m, z * 12).split(" : ").every((v) => Number(v) <= 30)), (p) => [p[0], p[1], p[3]]),
  build: (t, prm) => {
    const [x, y, z, m, P] = prm; const r = rat(x * 12, y * m, z * 12).split(" : ").map(Number); const s = P * r[1] / sumOf(r);
    const wr = rat(x, y, z).split(" : ").map(Number);
    return AQ(t, `A, B and C start a business with ₹${n(x)}, ₹${n(y)} and ₹${n(z)}. B leaves after ${mo(m)}, taking his money out. Out of a profit of ₹${n(P)} at the end of the year, what is B's share?`,
      `A, B और C ₹${n(x)}, ₹${n(y)} और ₹${n(z)} से व्यापार शुरू करते हैं। B ${m} महीने बाद अपनी पूँजी लेकर अलग हो जाता है। वर्ष के अंत में ₹${n(P)} के लाभ में B का हिस्सा कितना है?`,
      s, [P * wr[1] / sumOf(wr), P / 3, P * y * (12 - m) / (x * 12 + y * (12 - m) + z * 12)].filter((v) => v !== s && isInt(v)), () => P * y * m / (12 * x + y * m + 12 * z),
      `A : B : C = ${n(x)} × 12 : ${n(y)} × ${m} : ${n(z)} × 12 = ${r.join(" : ")}. B's share = ${n(P)} × ${r[1]}/${sumOf(r)} = ₹${n(s)}.`,
      `A : B : C = ${n(x)} × 12 : ${n(y)} × ${m} : ${n(z)} × 12 = ${r.join(" : ")}। B का हिस्सा = ${n(P)} × ${r[1]}/${sumOf(r)} = ₹${n(s)}।`, "rs", 500);
  },
};

const KINDS = guard([
  share2, share3, timeOnly, capTime, ratioOfProfit, findInvest, findTotal, diffShares, otherShare,
  joinLater, withdraw, addMore, workingPct, findMonths, salaryPartner, threeJoin,
  timeFromRatios, capitalFromRatios, multiChange, leaveEarly,
]);

const PREFIX = "Ratio & Proportion · Partnership";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
