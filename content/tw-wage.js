// Time & Work · Work and Wages: wages shared in the ratio of work done
// (efficiency × days), a helper's share, pay per man per day, budgets, and
// men and women on different rates. gen.js fills the tests; every answer is
// worked out again in `v` by sharing the money unit by unit of work (or
// rupee by rupee); the wrong options are the slips students make (sharing
// in the ratio of the days instead of the work, splitting equally).
const L = require("./tw-lib");
const { N, gcd, lcm, lcmA, range, cap, pick, AQ, guard, cross, isInt } = L;
const { fillTopic } = require("./gen");

const W = [["A", "B", "C"], ["P", "Q", "R"], ["Ravi", "Amit", "Mohan"], ["X", "Y", "Z"]];
const WH = { A: "A", B: "B", C: "C", P: "P", Q: "Q", R: "R", X: "X", Y: "Y", Z: "Z", Ravi: "रवि", Amit: "अमित", Mohan: "मोहन" };
const who = (prm, s = 0) => { const n = pick(W, prm, s); return { e: n, h: n.map((x) => WH[x]) }; };
const rs = (x) => `₹${N(x)}`;
const pairs2 = (lo, hi) => cross(range(lo, hi), range(lo, hi)).filter(([a, b]) => a < b);
const MONEY = range(600, 30000, 300);
// The share of `part` units of work out of `total`, rupee by rupee.
const shareOf = (wage, part, total) => { let s = 0; for (let r = 0; r < wage; r++) if ((r * total) % total === 0) s += part / total; return Math.round(s * 100) / 100; };

// Two (or three) share a job's wage in the ratio of their 1-day work.
const share2 = (id, levels, lo, hi, max = 300) => ({
  id, levels,
  cands: () => cap(cross(pairs2(lo, hi), MONEY, [0, 1]).filter(([[a, b], w]) => isInt((w * b) / (a + b)) && b < 5 * a && w <= 400 * (a + b)).map(([[a, b], w, s]) => [a, b, w, s]), max),
  build: (t, prm) => {
    const [a, b, w, s] = prm; const n = who(prm); const U = lcm(a, b); const ea = U / a, eb = U / b; const ans = s ? (w * ea) / (ea + eb) : (w * eb) / (ea + eb);
    const ask = s ? n.e[0] : n.e[1], askH = s ? n.h[0] : n.h[1];
    return AQ(t, `${n.e[0]} can do a work in ${a} days and ${n.e[1]} in ${b} days. Working together they finish it and get ${rs(w)}. What is ${ask}'s share?`,
      `${n.h[0]} एक काम ${a} दिन में और ${n.h[1]} ${b} दिन में कर सकता है। दोनों मिलकर काम पूरा करते हैं और ${rs(w)} पाते हैं। ${askH} का हिस्सा कितना है?`,
      ans, [w - ans, w / 2, (w * (s ? a : b)) / (a + b), ans + 100], () => shareOf(w, s ? ea : eb, ea + eb),
      `Working together, the money goes in the ratio of the work each does in a day. Work = LCM(${a}, ${b}) = ${U} units: ${n.e[0]} ${ea}, ${n.e[1]} ${eb} a day, ratio ${ea / gcd(ea, eb)} : ${eb / gcd(ea, eb)}. ${ask}'s share = ${rs(w)} × ${s ? ea : eb}/${ea + eb} = ${rs(ans)}.`,
      `साथ काम करने पर पैसा प्रतिदिन के काम के अनुपात में बँटता है। काम = ${U} इकाई: ${n.h[0]} ${ea}, ${n.h[1]} ${eb} प्रतिदिन, अनुपात ${ea / gcd(ea, eb)} : ${eb / gcd(ea, eb)}। ${askH} का हिस्सा = ${rs(w)} × ${s ? ea : eb}/${ea + eb} = ${rs(ans)}।`, "rs", 50);
  },
});
const share3 = {
  id: "share3", levels: ["medium", "hard", "advanced"],
  cands: () => cap(cross(range(4, 40), range(4, 40), range(4, 60), MONEY).filter(([a, b, c, w]) => { if (!(a < b && b < c) || c > 5 * a) return false; const U = lcmA([a, b, c]); return isInt((w * (U / c)) / (U / a + U / b + U / c)); }), 300),
  build: (t, prm) => {
    const [a, b, c, w] = prm; const n = who(prm); const U = lcmA([a, b, c]); const e = [U / a, U / b, U / c]; const s = e[0] + e[1] + e[2]; const ans = (w * e[2]) / s;
    return AQ(t, `${n.e[0]}, ${n.e[1]} and ${n.e[2]} can do a work in ${a}, ${b} and ${c} days respectively. Working together they finish it and get ${rs(w)}. What is ${n.e[2]}'s share?`,
      `${n.h[0]}, ${n.h[1]} और ${n.h[2]} एक काम क्रमशः ${a}, ${b} और ${c} दिन में कर सकते हैं। तीनों मिलकर काम पूरा करते हैं और ${rs(w)} पाते हैं। ${n.h[2]} का हिस्सा कितना है?`,
      ans, [w / 3, (w * e[0]) / s, (w * c) / (a + b + c), ans + 100], () => shareOf(w, e[2], s),
      `Work = LCM(${a}, ${b}, ${c}) = ${U} units; a day: ${e.join(", ")}. Money is shared ${e.join(" : ")}, so ${n.e[2]} gets ${rs(w)} × ${e[2]}/${s} = ${rs(ans)}.`,
      `काम = ${U} इकाई; प्रतिदिन: ${e.join(", ")}। पैसा ${e.join(" : ")} में बँटेगा, अतः ${n.h[2]} को ${rs(w)} × ${e[2]}/${s} = ${rs(ans)}।`, "rs", 50);
  },
};
// A and B with C's help finish in T days; C's share.
const helper = {
  id: "helperShare", levels: ["medium", "hard", "advanced"],
  cands: () => cap(cross(range(4, 40), range(4, 40), range(2, 20), MONEY).filter(([a, b, T, w]) => { if (a >= b || T >= a) return false; const U = lcmA([a, b, T]); const c = U / T - U / a - U / b; return c > 0 && isInt((w * c) / (U / T)); }), 300),
  build: (t, prm) => {
    const [a, b, T, w] = prm; const n = who(prm); const U = lcmA([a, b, T]); const ea = U / a, eb = U / b, ec = U / T - ea - eb; const ans = (w * ec) / (U / T);
    return AQ(t, `${n.e[0]} and ${n.e[1]} take a job for ${rs(w)}. ${n.e[0]} alone can do it in ${a} days and ${n.e[1]} alone in ${b} days. With ${n.e[2]}'s help they finish it in ${T} days. How much should ${n.e[2]} get?`,
      `${n.h[0]} और ${n.h[1]} एक काम ${rs(w)} में लेते हैं। ${n.h[0]} अकेला उसे ${a} दिन में और ${n.h[1]} अकेला ${b} दिन में कर सकता है। ${n.h[2]} की मदद से वे उसे ${T} दिन में पूरा करते हैं। ${n.h[2]} को कितना मिलना चाहिए?`,
      ans, [w / 3, (w * T) / (a + b + T), (w * eb) / (U / T), ans + 100], () => shareOf(w, ec * T, U),
      `Work = LCM(${a}, ${b}, ${T}) = ${U} units. All three do ${U / T} a day; ${n.e[0]} ${ea}, ${n.e[1]} ${eb}, so ${n.e[2]} does ${ec}. In ${T} days ${n.e[2]} does ${ec * T} of the ${U} units: ${rs(w)} × ${ec * T}/${U} = ${rs(ans)}.`,
      `काम = ${U} इकाई। तीनों ${U / T} प्रतिदिन; ${n.h[0]} ${ea}, ${n.h[1]} ${eb}, अतः ${n.h[2]} ${ec}। ${T} दिन में ${n.h[2]} ने ${U} में से ${ec * T} इकाई की: ${rs(w)} × ${ec * T}/${U} = ${rs(ans)}।`, "rs", 50);
  },
};
// A works some days alone, B finishes; share by work done.
const workDone = {
  id: "workDoneShare", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(6, 40), range(6, 40), range(2, 20), MONEY).filter(([a, b, d, w]) => { const U = lcm(a, b); const da = d * (U / a); return a !== b && d < a && isInt((U - da) / (U / b)) && isInt((w * da) / U); }), 300),
  build: (t, prm) => {
    const [a, b, d, w] = prm; const n = who(prm); const U = lcm(a, b); const da = d * (U / a); const db = (U - da) / (U / b); const ans = (w * da) / U;
    return AQ(t, `${n.e[0]} can do a work in ${a} days and ${n.e[1]} in ${b} days. ${n.e[0]} works alone for ${d} days and ${n.e[1]} finishes the rest. The whole job pays ${rs(w)}. How much should ${n.e[0]} get?`,
      `${n.h[0]} एक काम ${a} दिन में और ${n.h[1]} ${b} दिन में कर सकता है। ${n.h[0]} अकेला ${d} दिन काम करता है और बाकी ${n.h[1]} पूरा करता है। पूरे काम के ${rs(w)} मिलते हैं। ${n.h[0]} को कितना मिलना चाहिए?`,
      ans, [(w * d) / (d + db), w / 2, w - ans, (w * b) / (a + b)].filter((v) => v !== ans), () => shareOf(w, da, U),
      `Work = ${U} units. ${n.e[0]} does ${U / a} a day: in ${d} days ${da} units, i.e. ${da}/${U} of the work. ${n.e[0]}'s share = ${rs(w)} × ${da}/${U} = ${rs(ans)}. (${n.e[1]} takes ${db} days for the rest.)`,
      `काम = ${U} इकाई। ${n.h[0]} ${U / a} प्रतिदिन: ${d} दिन में ${da} इकाई, यानी काम का ${da}/${U}। ${n.h[0]} का हिस्सा = ${rs(w)} × ${da}/${U} = ${rs(ans)}। (बाकी काम में ${n.h[1]} को ${db} दिन लगते हैं।)`, "rs", 50);
  },
};
// A leaves k days before the end; A's share.
const leftEarly = {
  id: "leftEarlyShare", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(6, 40), range(6, 40), range(2, 8), MONEY).filter(([a, b, k, w]) => { if (a >= b) return false; const U = lcm(a, b); const x = (U + k * (U / a)) / (U / a + U / b); return isInt(x) && x > k + 1 && isInt((w * (x - k) * (U / a)) / U); }), 300),
  build: (t, prm) => {
    const [a, b, k, w] = prm; const n = who(prm); const U = lcm(a, b); const x = (U + k * (U / a)) / (U / a + U / b); const da = (x - k) * (U / a); const ans = (w * da) / U;
    return AQ(t, `${n.e[0]} and ${n.e[1]} can do a work in ${a} and ${b} days respectively. They start together, but ${n.e[0]} leaves ${k} days before the work is finished. The job pays ${rs(w)}. What is ${n.e[0]}'s share?`,
      `${n.h[0]} और ${n.h[1]} एक काम क्रमशः ${a} और ${b} दिन में कर सकते हैं। दोनों साथ शुरू करते हैं, पर काम पूरा होने से ${k} दिन पहले ${n.h[0]} चला जाता है। काम के ${rs(w)} मिलते हैं। ${n.h[0]} का हिस्सा कितना है?`,
      ans, [(w * b) / (a + b), w / 2, w - ans, (w * (x - k)) / (2 * x - k)].filter((v) => v !== ans), () => shareOf(w, da, U),
      `Work = ${U} units; ${n.e[0]} ${U / a}, ${n.e[1]} ${U / b} a day. ${U / a}(x − ${k}) + ${U / b}x = ${U} gives x = ${x} days, so ${n.e[0]} worked ${x - k} days and did ${da} units. Share = ${rs(w)} × ${da}/${U} = ${rs(ans)}.`,
      `काम = ${U} इकाई; ${n.h[0]} ${U / a}, ${n.h[1]} ${U / b} प्रतिदिन। ${U / a}(x − ${k}) + ${U / b}x = ${U} से x = ${x} दिन, अतः ${n.h[0]} ने ${x - k} दिन में ${da} इकाई की। हिस्सा = ${rs(w)} × ${da}/${U} = ${rs(ans)}।`, "rs", 50);
  },
};
// From pairs: all three's daily wage, C's share of it.
const pairsWage = {
  id: "pairsWage", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(4, 60), range(4, 60), range(4, 60), range(300, 6000, 150)).filter(([x, y, z, D]) => {
    if (!(x < y && y < z)) return false; const U = lcmA([x, y, z]); const s2 = U / x + U / y + U / z; if (s2 % 2) return false; const s = s2 / 2; const c = s - U / x;
    return c > 0 && c * 6 >= s && s - U / y > 0 && s - U / z > 0 && isInt((D * c) / s);
  }), 300),
  build: (t, prm) => {
    const [x, y, z, D] = prm; const n = who(prm); const U = lcmA([x, y, z]); const s = (U / x + U / y + U / z) / 2; const c = s - U / x; const ans = (D * c) / s;
    return AQ(t, `${n.e[0]} and ${n.e[1]} can do a work in ${x} days, ${n.e[1]} and ${n.e[2]} in ${y} days, and ${n.e[2]} and ${n.e[0]} in ${z} days. Working together, the three earn ${rs(D)} a day. What is ${n.e[2]}'s daily share?`,
      `${n.h[0]} और ${n.h[1]} एक काम ${x} दिन में, ${n.h[1]} और ${n.h[2]} ${y} दिन में, तथा ${n.h[2]} और ${n.h[0]} ${z} दिन में कर सकते हैं। तीनों साथ काम करके प्रतिदिन ${rs(D)} कमाते हैं। ${n.h[2]} का दैनिक हिस्सा कितना है?`,
      ans, [D / 3, (D * (s - U / y)) / s, (D * (s - U / z)) / s, ans + 50], () => shareOf(D, c, s),
      `Work = ${U} units. The pairs do ${U / x}, ${U / y}, ${U / z} a day; added, twice all three: so all three do ${s}. ${n.e[2]} = ${s} − ${U / x} = ${c} a day. Share = ${rs(D)} × ${c}/${s} = ${rs(ans)}.`,
      `काम = ${U} इकाई। जोड़े प्रतिदिन ${U / x}, ${U / y}, ${U / z} करते हैं; जोड़ने पर तीनों का दोगुना: अतः तीनों ${s}। ${n.h[2]} = ${s} − ${U / x} = ${c} प्रतिदिन। हिस्सा = ${rs(D)} × ${c}/${s} = ${rs(ans)}।`, "rs", 10);
  },
};
// Efficiency in times or per cent; the better worker's share.
const effShare = {
  id: "effShare", levels: ["easy", "medium"],
  cands: () => cap(cross([2, 3, 4, 5], MONEY).filter(([k, w]) => isInt((w * k) / (k + 1))), 300),
  build: (t, prm) => {
    const [k, w] = prm; const n = who(prm); const ans = (w * k) / (k + 1); const kw = { 2: ["twice", "दोगुना"], 3: ["three times", "तीन गुना"], 4: ["four times", "चार गुना"], 5: ["five times", "पाँच गुना"] }[k];
    return AQ(t, `${n.e[0]} is ${kw[0]} as efficient as ${n.e[1]}. Working together they finish a job and get ${rs(w)}. What is ${n.e[0]}'s share?`,
      `${n.h[0]}, ${n.h[1]} से ${kw[1]} कुशल है। दोनों मिलकर एक काम पूरा करते हैं और ${rs(w)} पाते हैं। ${n.h[0]} का हिस्सा कितना है?`,
      ans, [w / (k + 1), w / 2, (w * k) / (k + 2), ans + 100], () => shareOf(w, k, k + 1),
      `Working together, each is paid for the work done: ${n.e[0]} : ${n.e[1]} = ${k} : 1. ${n.e[0]} gets ${rs(w)} × ${k}/${k + 1} = ${rs(ans)}.`,
      `साथ काम करने पर हर किसी को उसके काम के हिसाब से: ${n.h[0]} : ${n.h[1]} = ${k} : 1। ${n.h[0]} को ${rs(w)} × ${k}/${k + 1} = ${rs(ans)}।`, "rs", 50);
  },
};
const pctShare = {
  id: "pctShare", levels: ["easy", "medium", "hard"],
  cands: () => cap(cross([10, 20, 25, 40, 50, 60, 75, 100, 150], MONEY).filter(([p, w]) => isInt((w * (100 + p)) / (200 + p))), 300),
  build: (t, prm) => {
    const [p, w] = prm; const n = who(prm); const ans = (w * (100 + p)) / (200 + p); const g = gcd(100, 100 + p);
    return AQ(t, `${n.e[1]} is ${p}% more efficient than ${n.e[0]}. Working together they finish a job and get ${rs(w)}. What is ${n.e[1]}'s share?`,
      `${n.h[1]}, ${n.h[0]} से ${p}% अधिक कुशल है। दोनों मिलकर एक काम पूरा करते हैं और ${rs(w)} पाते हैं। ${n.h[1]} का हिस्सा कितना है?`,
      ans, [w - ans, w / 2, (w * (50 + p)) / 100, (w * p) / 100], () => shareOf(w, 100 + p, 200 + p),
      `Efficiencies ${n.e[0]} : ${n.e[1]} = 100 : ${100 + p} = ${100 / g} : ${(100 + p) / g}. ${n.e[1]} gets ${rs(w)} × ${(100 + p) / g}/${(200 + p) / g} = ${rs(ans)}.`,
      `कुशलता ${n.h[0]} : ${n.h[1]} = 100 : ${100 + p} = ${100 / g} : ${(100 + p) / g}। ${n.h[1]} को ${rs(w)} × ${(100 + p) / g}/${(200 + p) / g} = ${rs(ans)}।`, "rs", 50);
  },
};
const ratioShare = {
  id: "ratioShare", levels: ["easy", "medium"],
  cands: () => cap(cross([[2, 3], [3, 4], [3, 5], [4, 5], [2, 5], [5, 6], [3, 7], [5, 7], [4, 7], [5, 8]], MONEY, [0, 1]).filter(([[p, q], w]) => isInt((w * p) / (p + q))), 300),
  build: (t, prm) => {
    const [[p, q], w, s] = prm; const n = who(prm); const a = q * 4, b = p * 4; const ans = s ? (w * q) / (p + q) : (w * p) / (p + q);
    return AQ(t, `${n.e[0]} can do a job in ${a} days and ${n.e[1]} in ${b} days. Working together they get ${rs(w)}. What is ${s ? n.e[1] : n.e[0]}'s share?`,
      `${n.h[0]} एक काम ${a} दिन में और ${n.h[1]} ${b} दिन में कर सकता है। दोनों मिलकर ${rs(w)} पाते हैं। ${s ? n.h[1] : n.h[0]} का हिस्सा कितना है?`,
      ans, [w - ans, w / 2, ans + 100, ans - 100], () => shareOf(w, s ? q : p, p + q),
      `The quicker worker does more each day: 1-day work ${n.e[0]} : ${n.e[1]} = 1/${a} : 1/${b} = ${b} : ${a} = ${p} : ${q}. ${s ? n.e[1] : n.e[0]} gets ${rs(w)} × ${s ? q : p}/${p + q} = ${rs(ans)}.`,
      `जो जल्दी करता है वह प्रतिदिन अधिक करता है: ${n.h[0]} : ${n.h[1]} = 1/${a} : 1/${b} = ${b} : ${a} = ${p} : ${q}। ${s ? n.h[1] : n.h[0]} को ${rs(w)} × ${s ? q : p}/${p + q} = ${rs(ans)}।`, "rs", 50);
  },
};
// Pay per man per day: totals, rates, budgets.
const RATES = [250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800];
const dailyTotal = {
  id: "dailyTotal", levels: ["easy"],
  cands: () => cap(cross(range(3, 30), RATES, range(3, 30)).filter(() => true), 300),
  build: (t, prm) => {
    const [m, r, d] = prm; const ans = m * r * d;
    return AQ(t, `${m} labourers work on a site for ${d} days. Each is paid ${rs(r)} a day. What is the total wage bill?`,
      `${m} मज़दूर एक जगह ${d} दिन काम करते हैं। हर एक को प्रतिदिन ${rs(r)} मिलते हैं। कुल मज़दूरी कितनी हुई?`,
      ans, [m * r, r * d, m * d * (r + 50), ans - m * r], () => { let s = 0; for (let i = 0; i < m; i++) for (let j = 0; j < d; j++) s += r; return s; },
      `Total = men × days × daily wage = ${m} × ${d} × ${r} = ${rs(ans)}.`, `कुल = आदमी × दिन × दैनिक मज़दूरी = ${m} × ${d} × ${r} = ${rs(ans)}।`, "rs", 100);
  },
};
const rateFromTotal = {
  id: "rateFromTotal", levels: ["easy", "medium"],
  cands: () => cap(cross(range(3, 30), RATES, range(3, 30)).filter(([m, r, d]) => m !== d), 300),
  build: (t, prm) => {
    const [m, r, d] = prm; const T = m * r * d;
    return AQ(t, `${m} workers were paid ${rs(T)} in all for ${d} days of work. How much did each worker get a day?`,
      `${m} मज़दूरों को ${d} दिन के काम के कुल ${rs(T)} मिले। हर मज़दूर को प्रतिदिन कितने मिले?`,
      r, [T / m, T / d, r + 50, r - 50], () => { for (let x = 1; x <= T; x++) if (x * m * d === T) return x; return 0; },
      `Daily wage = total ÷ (men × days) = ${T} ÷ (${m} × ${d}) = ${rs(r)}.`, `दैनिक मज़दूरी = कुल ÷ (आदमी × दिन) = ${T} ÷ (${m} × ${d}) = ${rs(r)}।`, "rs", 50);
  },
};
const budget = (id, levels, ask) => ({
  id, levels,
  cands: () => cap(cross(range(3, 30), RATES, range(3, 30)).filter(([m, r, d]) => m !== d), 300),
  build: (t, prm) => {
    const [m, r, d] = prm; const B = m * r * d; const ans = ask === "men" ? m : d;
    return AQ(t, ask === "men" ? `A contractor has ${rs(B)} for wages. Each worker is paid ${rs(r)} a day and the job takes ${d} days. How many workers can he employ?` : `A contractor has ${rs(B)} for wages and employs ${m} workers at ${rs(r)} a day each. For how many days can he pay them?`,
      ask === "men" ? `एक ठेकेदार के पास मज़दूरी के लिए ${rs(B)} हैं। हर मज़दूर को प्रतिदिन ${rs(r)} मिलते हैं और काम ${d} दिन चलता है। वह कितने मज़दूर रख सकता है?` : `एक ठेकेदार के पास मज़दूरी के लिए ${rs(B)} हैं और वह ${m} मज़दूर ${rs(r)} प्रतिदिन पर रखता है। वह उन्हें कितने दिन तक मज़दूरी दे सकता है?`,
      ans, ask === "men" ? [B / r, d, m + 2, m - 2] : [B / r, m, d + 2, d - 2], () => { for (let x = 1; x < 10000; x++) if ((ask === "men" ? x * r * d : m * r * x) === B) return x; return 0; },
      ask === "men" ? `Workers = money ÷ (daily wage × days) = ${B} ÷ (${r} × ${d}) = ${m}.` : `Days = money ÷ (workers × daily wage) = ${B} ÷ (${m} × ${r}) = ${d}.`,
      ask === "men" ? `मज़दूर = पैसा ÷ (दैनिक मज़दूरी × दिन) = ${B} ÷ (${r} × ${d}) = ${m}।` : `दिन = पैसा ÷ (मज़दूर × दैनिक मज़दूरी) = ${B} ÷ (${m} × ${r}) = ${d}।`, ask === "men" ? "none" : "day");
  },
});
const mwWage = {
  id: "menWomenWage", levels: ["easy", "medium", "hard"],
  cands: () => cap(cross(range(2, 15), range(2, 15), [400, 450, 500, 550, 600, 650, 700, 750, 800], [300, 350, 400, 450, 500, 550, 600], range(3, 20)).filter(([m, w, x, y]) => x > y), 300),
  build: (t, prm) => {
    const [m, w, x, y, d] = prm; const ans = (m * x + w * y) * d;
    return AQ(t, `A man earns ${rs(x)} a day and a woman ${rs(y)} a day. What do ${m} men and ${w} women earn together in ${d} days?`,
      `एक आदमी प्रतिदिन ${rs(x)} और एक औरत ${rs(y)} कमाती है। ${m} आदमी और ${w} औरतें मिलकर ${d} दिन में कितना कमाएँगे?`,
      ans, [(m + w) * x * d, (m * x + w * y), (m + w) * ((x + y) / 2) * d, ans + 1000], () => { let s = 0; for (let i = 0; i < d; i++) s += m * x + w * y; return s; },
      `A day: ${m} × ${x} + ${w} × ${y} = ${m * x + w * y}. In ${d} days: ${m * x + w * y} × ${d} = ${rs(ans)}.`,
      `प्रतिदिन: ${m} × ${x} + ${w} × ${y} = ${m * x + w * y}। ${d} दिन में: ${m * x + w * y} × ${d} = ${rs(ans)}।`, "rs", 500);
  },
};
// Earnings in proportion to men and days.
const wageProp = {
  id: "wageProp", levels: ["easy", "medium", "hard"],
  cands: () => cap(cross(range(3, 25), range(3, 25), range(3, 25), range(3, 25), RATES).filter(([m1, d1, m2, d2]) => m1 !== m2 || d1 !== d2), 300),
  build: (t, prm) => {
    const [m1, d1, m2, d2, r] = prm; const W1 = m1 * d1 * r; const ans = m2 * d2 * r;
    return AQ(t, `${m1} men earn ${rs(W1)} in ${d1} days. How much will ${m2} men earn in ${d2} days at the same rate?`,
      `${m1} आदमी ${d1} दिन में ${rs(W1)} कमाते हैं। उसी दर से ${m2} आदमी ${d2} दिन में कितना कमाएँगे?`,
      ans, [(W1 * m2) / m1, (W1 * d2) / d1, (W1 * m1 * d1) / (m2 * d2), ans + r], () => { const rate = W1 / (m1 * d1); let s = 0; for (let i = 0; i < m2 * d2; i++) s += rate; return s; },
      `One man earns ${W1} ÷ (${m1} × ${d1}) = ${rs(r)} a day. ${m2} men in ${d2} days: ${m2} × ${d2} × ${r} = ${rs(ans)}.`,
      `एक आदमी प्रतिदिन ${W1} ÷ (${m1} × ${d1}) = ${rs(r)} कमाता है। ${m2} आदमी ${d2} दिन में: ${m2} × ${d2} × ${r} = ${rs(ans)}।`, "rs", 100);
  },
};
const daysFromWage = {
  id: "daysFromWage", levels: ["medium", "hard", "advanced"],
  cands: () => cap(cross(range(3, 25), range(3, 25), range(3, 25), range(3, 25), RATES).filter(([m1, d1, m2, d2]) => m1 !== m2 && d1 !== d2), 300),
  build: (t, prm) => {
    const [m1, d1, m2, d2, r] = prm; const W1 = m1 * d1 * r, W2 = m2 * d2 * r;
    return AQ(t, `${m1} men earn ${rs(W1)} in ${d1} days. In how many days will ${m2} men earn ${rs(W2)} at the same rate?`,
      `${m1} आदमी ${d1} दिन में ${rs(W1)} कमाते हैं। उसी दर से ${m2} आदमी ${rs(W2)} कितने दिन में कमाएँगे?`,
      d2, [(d1 * W2) / W1, (d2 * m2) / m1, d2 + 2, d2 - 2], () => { for (let x = 1; x < 1000; x++) if (m2 * x * r === W2) return x; return 0; },
      `One man earns ${W1} ÷ (${m1} × ${d1}) = ${rs(r)} a day, so ${m2} men earn ${m2 * r} a day. ${W2} ÷ ${m2 * r} = ${d2} days.`,
      `एक आदमी प्रतिदिन ${W1} ÷ (${m1} × ${d1}) = ${rs(r)}, अतः ${m2} आदमी ${m2 * r} प्रतिदिन। ${W2} ÷ ${m2 * r} = ${d2} दिन।`, "day");
  },
};
const hoursWage = {
  id: "hoursWage", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(3, 15), range(3, 15), [8, 9, 10], range(3, 15), range(3, 15), [6, 7, 8], [50, 60, 75, 80, 100]).filter(([m1, d1, h1, m2, d2, h2]) => (m1 !== m2 || d1 !== d2 || h1 !== h2)), 300),
  build: (t, prm) => {
    const [m1, d1, h1, m2, d2, h2, r] = prm; const W1 = m1 * d1 * h1 * r; const ans = m2 * d2 * h2 * r;
    return AQ(t, `${m1} men working ${h1} hours a day earn ${rs(W1)} in ${d1} days. How much will ${m2} men earn in ${d2} days working ${h2} hours a day, at the same rate per hour?`,
      `प्रतिदिन ${h1} घंटे काम करके ${m1} आदमी ${d1} दिन में ${rs(W1)} कमाते हैं। उसी प्रति घंटा दर से ${m2} आदमी प्रतिदिन ${h2} घंटे काम करके ${d2} दिन में कितना कमाएँगे?`,
      ans, [(W1 * m2 * d2) / (m1 * d1), (W1 * h2) / h1, ans + 10 * r, ans - 10 * r], () => { const rate = W1 / (m1 * d1 * h1); return m2 * d2 * h2 * rate; },
      `Rate = ${W1} ÷ (${m1} × ${d1} × ${h1}) = ${rs(r)} an hour. Earnings = ${m2} × ${d2} × ${h2} × ${r} = ${rs(ans)}.`,
      `दर = ${W1} ÷ (${m1} × ${d1} × ${h1}) = ${rs(r)} प्रति घंटा। कमाई = ${m2} × ${d2} × ${h2} × ${r} = ${rs(ans)}।`, "rs", 100);
  },
};
// A starts, B joins after k days; B's share.
const joinShare = {
  id: "joinShare", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(6, 40), range(6, 40), range(2, 10), MONEY).filter(([a, b, k, w]) => { const U = lcm(a, b); const rest = U - k * (U / a); if (a === b || rest <= 0 || !isInt(rest / (U / a + U / b))) return false; const m = rest / (U / a + U / b); return isInt((w * m * (U / b)) / U); }), 300),
  build: (t, prm) => {
    const [a, b, k, w] = prm; const n = who(prm); const U = lcm(a, b); const m = (U - k * (U / a)) / (U / a + U / b); const db = m * (U / b); const ans = (w * db) / U;
    return AQ(t, `${n.e[0]} can do a work in ${a} days and ${n.e[1]} in ${b} days. ${n.e[0]} starts alone and ${n.e[1]} joins after ${k} days. The work pays ${rs(w)}. What is ${n.e[1]}'s share?`,
      `${n.h[0]} एक काम ${a} दिन में और ${n.h[1]} ${b} दिन में कर सकता है। ${n.h[0]} अकेले शुरू करता है और ${k} दिन बाद ${n.h[1]} साथ आता है। काम के ${rs(w)} मिलते हैं। ${n.h[1]} का हिस्सा कितना है?`,
      ans, [(w * a) / (a + b), w / 2, w - ans, (w * m) / (k + 2 * m)].filter((v) => v !== ans), () => shareOf(w, db, U),
      `Work = ${U} units. ${n.e[0]} alone ${k} days: ${k * (U / a)}. The rest, ${U - k * (U / a)}, together at ${U / a + U / b} a day takes ${m} days, in which ${n.e[1]} does ${m} × ${U / b} = ${db}. Share = ${rs(w)} × ${db}/${U} = ${rs(ans)}.`,
      `काम = ${U} इकाई। ${n.h[0]} अकेला ${k} दिन: ${k * (U / a)}। शेष ${U - k * (U / a)} दोनों ${U / a + U / b} प्रतिदिन से ${m} दिन में, जिसमें ${n.h[1]} ${m} × ${U / b} = ${db} करता है। हिस्सा = ${rs(w)} × ${db}/${U} = ${rs(ans)}।`, "rs", 50);
  },
};

// The helper's pay is known; the whole contract is asked.
const helperTotal = {
  id: "helperTotal", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(4, 40), range(4, 40), range(2, 20), range(300, 9000, 150)).filter(([a, b, T, x]) => { if (a >= b || T >= a) return false; const U = lcmA([a, b, T]); const c = U / T - U / a - U / b; return c > 0 && isInt((x * U) / (c * T)) && (x * U) / (c * T) <= 60000; }), 300),
  build: (t, prm) => {
    const [a, b, T, x] = prm; const n = who(prm); const U = lcmA([a, b, T]); const ec = U / T - U / a - U / b; const ans = (x * U) / (ec * T);
    return AQ(t, `${n.e[0]} alone can do a job in ${a} days and ${n.e[1]} alone in ${b} days. With ${n.e[2]}'s help they finish it in ${T} days, and ${n.e[2]} is paid ${rs(x)} for his part. What was the whole job worth?`,
      `${n.h[0]} अकेला एक काम ${a} दिन में और ${n.h[1]} अकेला ${b} दिन में कर सकता है। ${n.h[2]} की मदद से वे उसे ${T} दिन में पूरा करते हैं, और ${n.h[2]} को उसके हिस्से के ${rs(x)} मिलते हैं। पूरा काम कितने का था?`,
      ans, [x * 3, (x * (a + b + T)) / T, ans - x, ans + x], () => { for (let w = 1; w <= 100000; w++) if (w * ec * T === x * U) return w; return 0; },
      `Work = LCM(${a}, ${b}, ${T}) = ${U} units. All three do ${U / T} a day; ${n.e[2]} does ${U / T} − ${U / a} − ${U / b} = ${ec}, so ${ec * T} of the ${U} units in ${T} days. ${ec * T}/${U} of the job = ${rs(x)}, so the whole job = ${x} × ${U} ÷ ${ec * T} = ${rs(ans)}.`,
      `काम = ${U} इकाई। तीनों ${U / T} प्रतिदिन; ${n.h[2]} ${U / T} − ${U / a} − ${U / b} = ${ec}, अतः ${T} दिन में ${U} में से ${ec * T} इकाई। काम का ${ec * T}/${U} = ${rs(x)}, अतः पूरा काम = ${x} × ${U} ÷ ${ec * T} = ${rs(ans)}।`, "rs", 100);
  },
};
// A chain of efficiencies: A is k times B, B is p% more efficient than C.
const chainShare = {
  id: "chainShare", levels: ["hard", "advanced"],
  cands: () => cap(cross([2, 3], [20, 25, 50, 100], MONEY, [0, 1, 2]).filter(([k, p, w, ask]) => { const c = 100, b = 100 + p, a = k * b; const S = a + b + c; return isInt((w * [a, b, c][ask]) / S); }), 300),
  build: (t, prm) => {
    const [k, p, w, ask] = prm; const n = who(prm); const c = 100, b = 100 + p, a = k * b; const g = gcd(gcd(a, b), c); const r = [a / g, b / g, c / g]; const S = r[0] + r[1] + r[2]; const ans = (w * r[ask]) / S; const kw = { 2: ["twice", "दोगुना"], 3: ["three times", "तीन गुना"] }[k];
    return AQ(t, `${n.e[0]} is ${kw[0]} as efficient as ${n.e[1]}, and ${n.e[1]} is ${p}% more efficient than ${n.e[2]}. Working together the three earn ${rs(w)}. What is ${n.e[ask]}'s share?`,
      `${n.h[0]}, ${n.h[1]} से ${kw[1]} कुशल है, और ${n.h[1]}, ${n.h[2]} से ${p}% अधिक कुशल है। तीनों मिलकर ${rs(w)} कमाते हैं। ${n.h[ask]} का हिस्सा कितना है?`,
      ans, [w / 3, (w * r[(ask + 1) % 3]) / S, (w * r[(ask + 2) % 3]) / S, ans + 100].filter((v) => v !== ans), () => shareOf(w, r[ask], S),
      `Take ${n.e[2]} = 100: then ${n.e[1]} = ${b} and ${n.e[0]} = ${k} × ${b} = ${a}. Ratio ${r.join(" : ")}; ${n.e[ask]} gets ${rs(w)} × ${r[ask]}/${S} = ${rs(ans)}.`,
      `${n.h[2]} = 100 लें: तब ${n.h[1]} = ${b} और ${n.h[0]} = ${k} × ${b} = ${a}। अनुपात ${r.join(" : ")}; ${n.h[ask]} को ${rs(w)} × ${r[ask]}/${S} = ${rs(ans)}।`, "rs", 50);
  },
};

const KINDS = guard([
  share2("share2E", ["easy"], 4, 30), share2("share2M", ["medium", "hard"], 8, 60),
  share3, helper, workDone, leftEarly, pairsWage, effShare, pctShare, ratioShare,
  dailyTotal, rateFromTotal, budget("budgetMen", ["easy", "medium"], "men"), budget("budgetDays", ["easy", "medium"], "days"),
  mwWage, wageProp, daysFromWage, hoursWage, joinShare, helperTotal, chainShare,
]);

const PREFIX = "Time & Work · Work and Wages";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
