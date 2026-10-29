// Time & Work · Work and Efficiency: together and alone, part of a work,
// men × days (× hours), efficiency in times and per cent, leaving and
// joining, pairs, men and women, alternate days, contractors.
// gen.js fills the tests; every answer is worked out again in `v` by a
// different route - the work is simulated day by day (or hour by hour) in
// whole units, not taken from the formula; the wrong options are the slips
// students make (adding the days, averaging them, the other person's time).
const L = require("./tw-lib");
const { N, gcd, lcm, lcmA, range, cap, pick, AQ, SQ, guard, cross, mixedFrac, isInt } = L;
const { fillTopic } = require("./gen");

const W = [["A", "B", "C"], ["P", "Q", "R"], ["Ravi", "Amit", "Mohan"], ["X", "Y", "Z"]];
const WH = { A: "A", B: "B", C: "C", P: "P", Q: "Q", R: "R", X: "X", Y: "Y", Z: "Z", Ravi: "रवि", Amit: "अमित", Mohan: "मोहन" };
const who = (prm, s = 0) => { const n = pick(W, prm, s); return { e: n, h: n.map((x) => WH[x]) }; };
const JOB = [["a piece of work", "एक काम"], ["a job", "एक कार्य"], ["a task", "एक काम"]];
const job = (prm) => pick(JOB, prm, 3);
// Days for a work of `units` at `rate` units a day, by walking day by day.
const walk = (units, rates) => { let done = 0, d = 0; while (done < units) { done += rates(d); d++; if (d > 100000) return NaN; } return d; };
const days = (x) => `${N(x)} days`;
const daysH = (x) => `${N(x)} दिन`;
const pairs2 = (lo, hi) => cross(range(lo, hi), range(lo, hi)).filter(([a, b]) => a < b);

// ------------------------------------------------------------ TOGETHER / ALONE
const together = (id, levels, lo, hi, max = 300) => ({
  id, levels,
  cands: () => cap(pairs2(lo, hi).filter(([a, b]) => isInt((a * b) / (a + b)) && b < 7 * a), max),
  build: (t, prm) => {
    const [a, b] = prm; const T = (a * b) / (a + b); const [p, q] = who(prm).e; const [ph, qh] = who(prm).h; const [je, jh] = job(prm); const U = lcm(a, b);
    return AQ(t, `${p} can finish ${je} in ${a} days and ${q} can finish it in ${b} days. In how many days will they finish it working together?`,
      `${ph} ${jh} ${a} दिन में और ${qh} उसे ${b} दिन में पूरा कर सकता है। दोनों मिलकर उसे कितने दिन में पूरा करेंगे?`,
      T, [(a + b) / 2, b - a, a + b, T + 2], () => walk(U, () => U / a + U / b),
      `Take the work as LCM(${a}, ${b}) = ${U} units. ${p} does ${U / a} units a day and ${q} does ${U / b}: together ${U / a + U / b} a day. Time = ${U} ÷ ${U / a + U / b} = ${N(T)} days.`,
      `काम = LCM(${a}, ${b}) = ${U} इकाई। ${ph} प्रतिदिन ${U / a} और ${qh} ${U / b} इकाई करता है: मिलकर ${U / a + U / b} प्रतिदिन। समय = ${U} ÷ ${U / a + U / b} = ${N(T)} दिन।`, "day");
  },
});
const alone = (id, levels, lo, hi, max = 300) => ({
  id, levels,
  cands: () => cap(pairs2(lo, hi).filter(([a, b]) => isInt((a * b) / (a + b)) && b < 7 * a).flatMap(([a, b]) => [[(a * b) / (a + b), a, b], [(a * b) / (a + b), b, a]]), max),
  build: (t, prm) => {
    const [T, a, b] = prm; const [p, q] = who(prm).e; const [ph, qh] = who(prm).h; const [je, jh] = job(prm); const U = lcm(T, a);
    return AQ(t, `${p} and ${q} together can finish ${je} in ${T} days. ${p} alone can finish it in ${a} days. In how many days can ${q} alone finish it?`,
      `${ph} और ${qh} मिलकर ${jh} ${T} दिन में पूरा कर सकते हैं। ${ph} अकेला उसे ${a} दिन में पूरा कर सकता है। ${qh} अकेला उसे कितने दिन में पूरा करेगा?`,
      b, [a - T, a + T, (a * T) / (a + T), b / 2], () => walk(U, () => U / T - U / a),
      `Work = LCM(${T}, ${a}) = ${U} units. Together ${U / T} a day, ${p} ${U / a} a day, so ${q} does ${U / T} − ${U / a} = ${U / T - U / a} a day. ${q} alone: ${U} ÷ ${U / T - U / a} = ${b} days.`,
      `काम = LCM(${T}, ${a}) = ${U} इकाई। मिलकर ${U / T} प्रतिदिन, ${ph} ${U / a} प्रतिदिन, अतः ${qh} ${U / T} − ${U / a} = ${U / T - U / a} प्रतिदिन। ${qh} अकेला: ${U} ÷ ${U / T - U / a} = ${b} दिन।`, "day");
  },
});
const three = (id, levels, lo, hi, max = 300) => ({
  id, levels,
  cands: () => cap(cross(range(lo, hi), range(lo, hi), range(lo, hi)).filter(([a, b, c]) => a < b && b < c && isInt(1 / (1 / a + 1 / b + 1 / c)) && c < 5 * a), max),
  build: (t, prm) => {
    const [a, b, c] = prm; const U = lcmA([a, b, c]); const r = U / a + U / b + U / c; const T = U / r; const n = who(prm).e, nh = who(prm).h;
    return AQ(t, `${n[0]}, ${n[1]} and ${n[2]} can do a piece of work in ${a}, ${b} and ${c} days respectively. In how many days will they finish it working together?`,
      `${nh[0]}, ${nh[1]} और ${nh[2]} एक काम को क्रमशः ${a}, ${b} और ${c} दिन में कर सकते हैं। तीनों मिलकर उसे कितने दिन में पूरा करेंगे?`,
      T, [(a + b + c) / 3, a, T * 2, (a * b) / (a + b)], () => walk(U, () => r),
      `Work = LCM(${a}, ${b}, ${c}) = ${U} units. A day: ${U / a} + ${U / b} + ${U / c} = ${r} units. Time = ${U} ÷ ${r} = ${N(T)} days.`,
      `काम = LCM(${a}, ${b}, ${c}) = ${U} इकाई। प्रतिदिन: ${U / a} + ${U / b} + ${U / c} = ${r} इकाई। समय = ${U} ÷ ${r} = ${N(T)} दिन।`, "day");
  },
});
const part = {
  id: "partOfWork", levels: ["easy"],
  cands: () => cap(cross([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 5], [5, 6], [3, 8], [5, 8], [4, 5], [2, 7]], range(2, 30)).filter(([[p, q], d]) => isInt((d * q) / p) && (d * q) / p <= 90), 300),
  build: (t, prm) => {
    const [[p, q], d] = prm; const T = (d * q) / p; const [a] = who(prm).e; const [ah] = who(prm).h;
    return AQ(t, `${a} can do ${p}/${q} of a piece of work in ${d} days. In how many days can ${a} do the whole work?`, `${ah} एक काम का ${p}/${q} भाग ${d} दिन में कर सकता है। ${ah} पूरा काम कितने दिन में करेगा?`,
      T, [d * q, (d * p) / q, d + q, T - d], () => walk(q * d, () => p),
      `${p}/${q} of the work takes ${d} days. The whole work is ${q}/${p} times as much: ${d} × ${q} ÷ ${p} = ${N(T)} days.`,
      `काम का ${p}/${q} भाग ${d} दिन में, अतः पूरा काम ${d} × ${q} ÷ ${p} = ${N(T)} दिन में।`, "day");
  },
};

// ------------------------------------------------------------ MEN × DAYS (× HOURS)
const mdDays = {
  id: "mdDays", levels: ["easy", "medium"],
  cands: () => cap(cross(range(4, 40), range(4, 40), range(4, 60)).filter(([m1, d1, m2]) => m1 !== m2 && isInt((m1 * d1) / m2) && (m1 * d1) / m2 !== d1 && (m1 * d1) / m2 <= 90), 400),
  build: (t, prm) => {
    const [m1, d1, m2] = prm; const d2 = (m1 * d1) / m2; const what = pick([["build a wall", "एक दीवार बना"], ["paint a house", "एक घर रंग"], ["dig a canal", "एक नहर खोद"], ["repair a road", "एक सड़क की मरम्मत कर"]], prm);
    return AQ(t, `${m1} men can ${what[0]} in ${d1} days. In how many days can ${m2} men ${what[0]}?`, `${m1} आदमी ${d1} दिन में ${what[1]} सकते हैं। ${m2} आदमी यही काम कितने दिन में कर सकेंगे?`,
      d2, [(m2 * d1) / m1, d1 + m1 - m2, (d1 * m2) / m1 + 1, d2 * 2], () => walk(m1 * d1, () => m2),
      `The work is ${m1} × ${d1} = ${m1 * d1} man-days. ${m2} men take ${m1 * d1} ÷ ${m2} = ${N(d2)} days.`,
      `काम = ${m1} × ${d1} = ${m1 * d1} आदमी-दिन। ${m2} आदमी ${m1 * d1} ÷ ${m2} = ${N(d2)} दिन लेंगे।`, "day");
  },
};
const mdMen = {
  id: "mdMen", levels: ["easy", "medium"],
  cands: () => cap(cross(range(4, 40), range(4, 40), range(3, 40), [0, 1]).filter(([m1, d1, d2]) => d1 !== d2 && isInt((m1 * d1) / d2) && (m1 * d1) / d2 <= 200), 400),
  build: (t, prm) => {
    const [m1, d1, d2, more] = prm; const m2 = (m1 * d1) / d2; const extra = more && m2 > m1;
    const ans = extra ? m2 - m1 : m2;
    return AQ(t, extra ? `${m1} workers can finish a job in ${d1} days. How many more workers are needed to finish it in ${d2} days?` : `${m1} workers can finish a job in ${d1} days. How many workers are needed to finish it in ${d2} days?`,
      extra ? `${m1} मज़दूर एक काम ${d1} दिन में पूरा कर सकते हैं। उसे ${d2} दिन में पूरा करने के लिए कितने और मज़दूर चाहिए?` : `${m1} मज़दूर एक काम ${d1} दिन में पूरा कर सकते हैं। उसे ${d2} दिन में पूरा करने के लिए कितने मज़दूर चाहिए?`,
      ans, [extra ? m2 : m2 - m1 > 0 ? m2 - m1 : m2 * 2, (m1 * d2) / d1, m1 + d1 - d2, ans + 2], () => { let m = 1; while (m * d2 < m1 * d1) m++; return extra ? m - m1 : m; },
      `Work = ${m1} × ${d1} = ${m1 * d1} man-days. In ${d2} days: ${m1 * d1} ÷ ${d2} = ${m2} workers${extra ? `, i.e. ${m2} − ${m1} = ${ans} more` : ""}.`,
      `काम = ${m1} × ${d1} = ${m1 * d1} आदमी-दिन। ${d2} दिन में: ${m1 * d1} ÷ ${d2} = ${m2} मज़दूर${extra ? `, यानी ${m2} − ${m1} = ${ans} और` : ""}।`);
  },
};
const mdh = {
  id: "mdh", levels: ["medium", "hard"],
  cands: () => cap(cross(range(6, 40), range(6, 30), [6, 7, 8, 9, 10, 12], range(6, 30), [6, 7, 8, 9, 10, 12]).filter(([m1, d1, h1, d2, h2]) => (d1 !== d2 || h1 !== h2) && isInt((m1 * d1 * h1) / (d2 * h2)) && (m1 * d1 * h1) / (d2 * h2) <= 120 && (m1 * d1 * h1) / (d2 * h2) !== m1), 400),
  build: (t, prm) => {
    const [m1, d1, h1, d2, h2] = prm; const m2 = (m1 * d1 * h1) / (d2 * h2);
    return AQ(t, `Working ${h1} hours a day, ${m1} men can complete a project in ${d1} days. How many men are needed to complete it in ${d2} days, working ${h2} hours a day?`,
      `प्रतिदिन ${h1} घंटे काम करके ${m1} आदमी एक परियोजना ${d1} दिन में पूरी कर सकते हैं। प्रतिदिन ${h2} घंटे काम करके उसे ${d2} दिन में पूरा करने के लिए कितने आदमी चाहिए?`,
      m2, [(m1 * d2 * h2) / (d1 * h1), (m1 * d1) / d2, (m1 * h1) / h2, m2 + 3], () => { let m = 1; while (m * d2 * h2 < m1 * d1 * h1) m++; return m; },
      `Work = men × days × hours = ${m1} × ${d1} × ${h1} = ${m1 * d1 * h1} man-hours. Men = ${m1 * d1 * h1} ÷ (${d2} × ${h2}) = ${m2}.`,
      `काम = आदमी × दिन × घंटे = ${m1} × ${d1} × ${h1} = ${m1 * d1 * h1} आदमी-घंटे। आदमी = ${m1 * d1 * h1} ÷ (${d2} × ${h2}) = ${m2}।`);
  },
};
const mdhw = {
  id: "mdhw", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(10, 60, 2), range(6, 24), range(40, 400, 20), range(4, 24), range(40, 600, 20)).filter(([m1, d1, w1, d2, w2]) => w1 !== w2 && isInt((m1 * d1 * w2) / (w1 * d2)) && (m1 * d1 * w2) / (w1 * d2) <= 150 && (m1 * d1 * w2) / (w1 * d2) !== m1), 400),
  build: (t, prm) => {
    const [m1, d1, w1, d2, w2] = prm; const m2 = (m1 * d1 * w2) / (w1 * d2);
    return AQ(t, `${m1} men can build a wall ${w1} m long in ${d1} days. How many men can build a wall ${w2} m long in ${d2} days?`,
      `${m1} आदमी ${w1} m लंबी दीवार ${d1} दिन में बना सकते हैं। ${w2} m लंबी दीवार ${d2} दिन में कितने आदमी बना सकेंगे?`,
      m2, [(m1 * d1 * w1) / (w2 * d2), (m1 * w2) / w1, (m1 * d1) / d2, m2 + 5], () => { let m = 1; while ((m * d2) / w2 < (m1 * d1) / w1 - 1e-9) m++; return m; },
      `Men × days ÷ length is the same: ${m1} × ${d1} ÷ ${w1} = M × ${d2} ÷ ${w2}. M = ${m1} × ${d1} × ${w2} ÷ (${w1} × ${d2}) = ${m2}.`,
      `आदमी × दिन ÷ लंबाई समान रहता है: ${m1} × ${d1} ÷ ${w1} = M × ${d2} ÷ ${w2}। M = ${m1} × ${d1} × ${w2} ÷ (${w1} × ${d2}) = ${m2}।`);
  },
};

// ------------------------------------------------------------ EFFICIENCY
const timesEff = {
  id: "timesEff", levels: ["easy"],
  cands: () => cap(cross([2, 3, 4, 5], range(6, 90), [0, 1]).filter(([k, d]) => isInt(d / k)), 300),
  build: (t, prm) => {
    const [k, d, rev] = prm; const [a, b] = who(prm).e; const [ah, bh] = who(prm).h; const kw = { 2: ["twice", "दोगुना"], 3: ["three times", "तीन गुना"], 4: ["four times", "चार गुना"], 5: ["five times", "पाँच गुना"] }[k];
    const ans = rev ? d * k : d / k;
    return AQ(t, rev ? `${a} is ${kw[0]} as efficient as ${b}. If ${a} can finish a work in ${d} days, how many days will ${b} take?` : `${a} is ${kw[0]} as efficient as ${b}. If ${b} can finish a work in ${d} days, how many days will ${a} take?`,
      rev ? `${ah}, ${bh} से ${kw[1]} कुशल है। यदि ${ah} एक काम ${d} दिन में पूरा करता है, तो ${bh} कितने दिन लेगा?` : `${ah}, ${bh} से ${kw[1]} कुशल है। यदि ${bh} एक काम ${d} दिन में पूरा करता है, तो ${ah} कितने दिन लेगा?`,
      ans, [rev ? d / k : d * k, d + k, rev ? d * (k + 1) : d / (k + 1), ans + k], () => walk(rev ? d * k : d, () => (rev ? 1 : k)),
      rev ? `Time goes the other way to efficiency: ${b} is 1/${k} as fast, so ${b} takes ${k} × ${d} = ${ans} days.` : `Time goes the other way to efficiency: ${a} is ${k} times as fast, so ${a} takes ${d} ÷ ${k} = ${ans} days.`,
      rev ? `समय कुशलता के उल्टे अनुपात में: ${bh} की गति 1/${k} है, अतः ${bh} ${k} × ${d} = ${ans} दिन लेगा।` : `समय कुशलता के उल्टे अनुपात में: ${ah} ${k} गुना तेज़ है, अतः ${ah} ${d} ÷ ${k} = ${ans} दिन लेगा।`, "day");
  },
};
const pctEff = {
  id: "pctEff", levels: ["easy", "medium"],
  cands: () => cap(cross([10, 20, 25, 50, 60, 75, 100, 150], range(6, 90)).filter(([p, d]) => isInt((d * 100) / (100 + p))), 300),
  build: (t, prm) => {
    const [p, d] = prm; const ans = (d * 100) / (100 + p); const [a, b] = who(prm).e; const [ah, bh] = who(prm).h;
    return AQ(t, `${a} can finish a work in ${d} days. ${b} is ${p}% more efficient than ${a}. In how many days can ${b} finish the same work?`,
      `${ah} एक काम ${d} दिन में पूरा कर सकता है। ${bh}, ${ah} से ${p}% अधिक कुशल है। ${bh} वही काम कितने दिन में पूरा करेगा?`,
      ans, [d - (d * p) / 100, (d * (100 + p)) / 100, d - p / 10, ans - 1], () => walk(d * 100, () => 100 + p),
      `Efficiencies ${a} : ${b} = 100 : ${100 + p}, so times are ${100 + p} : 100. ${b} takes ${d} × 100 ÷ ${100 + p} = ${N(ans)} days.`,
      `कुशलता ${ah} : ${bh} = 100 : ${100 + p}, अतः समय ${100 + p} : 100। ${bh} ${d} × 100 ÷ ${100 + p} = ${N(ans)} दिन लेगा।`, "day");
  },
};
const timesTogether = {
  id: "timesTogether", levels: ["easy", "medium", "hard"],
  cands: () => cap(cross([2, 3, 4], range(4, 40), [0, 1]).filter(([k, T, b]) => b || isInt(((k + 1) * T) / k)), 300),
  build: (t, prm) => {
    const [k, T, askB] = prm; const units = (k + 1) * T; const ans = askB ? units : units / k; const [a, b] = who(prm).e; const [ah, bh] = who(prm).h;
    if (!isInt(ans)) throw new Error("x");
    const kw = { 2: ["twice", "दोगुना"], 3: ["three times", "तीन गुना"], 4: ["four times", "चार गुना"] }[k];
    return AQ(t, `${a} is ${kw[0]} as good a workman as ${b}. Together they finish a work in ${T} days. In how many days can ${askB ? b : a} alone finish it?`,
      `${ah}, ${bh} से ${kw[1]} कुशल कारीगर है। दोनों मिलकर एक काम ${T} दिन में पूरा करते हैं। ${askB ? bh : ah} अकेला उसे कितने दिन में पूरा करेगा?`,
      ans, [askB ? units / k : units, T * k, T * 2, ans + T], () => walk(units, () => (askB ? 1 : k)),
      `Efficiencies ${a} : ${b} = ${k} : 1, together ${k + 1} units a day. Work = ${k + 1} × ${T} = ${units} units. ${askB ? b : a} alone: ${units} ÷ ${askB ? 1 : k} = ${ans} days.`,
      `कुशलता ${ah} : ${bh} = ${k} : 1, मिलकर ${k + 1} इकाई प्रतिदिन। काम = ${k + 1} × ${T} = ${units} इकाई। ${askB ? bh : ah} अकेला: ${units} ÷ ${askB ? 1 : k} = ${ans} दिन।`, "day");
  },
};
const effRatio = {
  id: "effRatio", levels: ["easy", "medium"],
  cands: () => cap(cross([[1, 2], [2, 3], [3, 4], [3, 5], [4, 5], [2, 5], [5, 6], [3, 7], [5, 7], [4, 7]], range(6, 90)).filter(([[p, q], d]) => isInt((d * q) / p)), 300),
  build: (t, prm) => {
    const [[p, q], d] = prm; const ans = (d * q) / p; const [a, b] = who(prm).e; const [ah, bh] = who(prm).h;
    return AQ(t, `The efficiencies of ${a} and ${b} are in the ratio ${q} : ${p}. If ${a} can finish a work in ${d} days, how many days will ${b} take?`,
      `${ah} और ${bh} की कुशलता का अनुपात ${q} : ${p} है। यदि ${ah} एक काम ${d} दिन में पूरा करता है, तो ${bh} कितने दिन लेगा?`,
      ans, [(d * p) / q, d + q - p, ans + p, d * q], () => walk(d * q, () => p),
      `Time goes the other way to efficiency: times ${a} : ${b} = ${p} : ${q}. ${b} takes ${d} × ${q} ÷ ${p} = ${N(ans)} days.`,
      `समय कुशलता के उल्टे अनुपात में: समय ${ah} : ${bh} = ${p} : ${q}। ${bh} ${d} × ${q} ÷ ${p} = ${N(ans)} दिन लेगा।`, "day");
  },
};
const lessDays = {
  id: "lessDays", levels: ["medium", "hard"],
  cands: () => cap(cross([2, 3, 4, 5], range(4, 40)).filter(([k, d]) => isInt(d / (k - 1)) && isInt((k * d / (k - 1)) / (k + 1))), 300),
  build: (t, prm) => {
    const [k, d] = prm; const a = d / (k - 1); const b = k * a; const T = b / (k + 1); const [x, y] = who(prm).e; const [xh, yh] = who(prm).h;
    return AQ(t, `${x} is ${k} times as efficient as ${y} and takes ${d} days less than ${y} to finish a work. In how many days can they finish it together?`,
      `${xh}, ${yh} से ${k} गुना कुशल है और एक काम पूरा करने में ${yh} से ${d} दिन कम लेता है। दोनों मिलकर उसे कितने दिन में पूरा करेंगे?`,
      T, [a, b, d / 2, (a + b) / 2], () => walk(b, () => k + 1),
      `Times ${x} : ${y} = 1 : ${k}; the gap is ${k - 1} part${k > 2 ? "s" : ""} = ${d} days, so a part is ${a}. ${x} takes ${a}, ${y} takes ${b}. Work = ${b} units; together ${k + 1} a day: ${b} ÷ ${k + 1} = ${N(T)} days.`,
      `समय ${xh} : ${yh} = 1 : ${k}; अंतर ${k - 1} भाग = ${d} दिन, अतः एक भाग = ${a}। ${xh} ${a}, ${yh} ${b} दिन। काम = ${b} इकाई; मिलकर ${k + 1} प्रतिदिन: ${b} ÷ ${k + 1} = ${N(T)} दिन।`, "day");
  },
};

// ------------------------------------------------------------ IN PAIRS
const pairs = (id, levels, ask, max = 300) => ({
  id, levels,
  cands: () => cap(cross(range(4, 90), range(4, 90), range(4, 90)).filter(([x, y, z]) => {
    if (!(x < y && y < z)) return false;
    const U = lcmA([x, y, z]); const s2 = U / x + U / y + U / z; if (s2 % 2) return false; const s = s2 / 2;
    const A = s - U / y, C = s - U / x; if (A <= 0 || C <= 0 || s - U / z <= 0) return false;
    return ask === "all" ? isInt(U / s) && U / s !== x : isInt(U / A) && U / A <= 200;
  }), max),
  build: (t, prm) => {
    const [x, y, z] = prm; const U = lcmA([x, y, z]); const s = (U / x + U / y + U / z) / 2; const A = s - U / y; const ans = ask === "all" ? U / s : U / A; const n = who(prm).e, nh = who(prm).h;
    const head = `${n[0]} and ${n[1]} can do a work in ${x} days, ${n[1]} and ${n[2]} in ${y} days, and ${n[2]} and ${n[0]} in ${z} days.`;
    const headH = `${nh[0]} और ${nh[1]} एक काम ${x} दिन में, ${nh[1]} और ${nh[2]} ${y} दिन में, तथा ${nh[2]} और ${nh[0]} ${z} दिन में कर सकते हैं।`;
    return AQ(t, ask === "all" ? `${head} In how many days can all three together finish it?` : `${head} In how many days can ${n[0]} alone finish it?`,
      ask === "all" ? `${headH} तीनों मिलकर उसे कितने दिन में पूरा करेंगे?` : `${headH} ${nh[0]} अकेला उसे कितने दिन में पूरा करेगा?`,
      ans, ask === "all" ? [(x + y + z) / 3, U / (2 * s), x / 2, ans + 2] : [U / s, x + z - y, ans / 2, (x + z) / 2], () => walk(U, () => (ask === "all" ? s : A)),
      `Work = LCM(${x}, ${y}, ${z}) = ${U} units. Pairs do ${U / x}, ${U / y} and ${U / z} a day; added, that is twice all three: ${U / x + U / y + U / z}, so all three do ${s} a day.${ask === "all" ? ` Time = ${U} ÷ ${s} = ${N(ans)} days.` : ` ${n[0]} = ${s} − (${n[1]} + ${n[2]}) = ${s} − ${U / y} = ${A} a day. ${n[0]} alone: ${U} ÷ ${A} = ${N(ans)} days.`}`,
      `काम = LCM(${x}, ${y}, ${z}) = ${U} इकाई। जोड़े प्रतिदिन ${U / x}, ${U / y} और ${U / z} करते हैं; जोड़ने पर तीनों का दोगुना: ${U / x + U / y + U / z}, अतः तीनों ${s} प्रतिदिन।${ask === "all" ? ` समय = ${U} ÷ ${s} = ${N(ans)} दिन।` : ` ${nh[0]} = ${s} − ${U / y} = ${A} प्रतिदिन। ${nh[0]} अकेला: ${U} ÷ ${A} = ${N(ans)} दिन।`}`, "day");
  },
});

// ------------------------------------------------------------ PART OF THE TIME
const fractionLeft = {
  id: "fractionLeft", levels: ["easy", "medium"],
  cands: () => cap(cross(range(6, 40), range(6, 40), range(2, 10)).filter(([a, b, d]) => a < b && lcm(a, b) <= 120 && d * (lcm(a, b) / a + lcm(a, b) / b) < lcm(a, b)), 300),
  build: (t, prm) => {
    const [a, b, d] = prm; const U = lcm(a, b); const r = U / a + U / b; const left = U - d * r; const [p, q] = who(prm).e; const [ph, qh] = who(prm).h;
    const f = (x, y) => L.frac(x, y);
    return SQ(t, `${p} can do a work in ${a} days and ${q} in ${b} days. They work together for ${d} days. What fraction of the work is left?`,
      `${ph} एक काम ${a} दिन में और ${qh} ${b} दिन में कर सकता है। दोनों ${d} दिन साथ काम करते हैं। कितना काम बचा रहता है?`,
      f(left, U), [f(d * r, U), f(U - d * (U / a), U), f(U - d * (U / b), U), f(left + U / a, U)].filter((x) => x !== f(left, U) && !x.startsWith("0")), () => { let w = 0; for (let i = 0; i < d; i++) w += r; return f(U - w, U); },
      `Work = LCM(${a}, ${b}) = ${U} units; together ${U / a} + ${U / b} = ${r} a day. In ${d} days: ${d * r} units. Left: ${U} − ${d * r} = ${left} units = ${f(left, U)} of the work.`,
      `काम = LCM(${a}, ${b}) = ${U} इकाई; मिलकर ${U / a} + ${U / b} = ${r} प्रतिदिन। ${d} दिन में: ${d * r} इकाई। शेष: ${U} − ${d * r} = ${left} इकाई = काम का ${f(left, U)}।`);
  },
};
const leaveAfter = {
  id: "leaveAfter", levels: ["medium", "hard"],
  cands: () => cap(cross(range(6, 45), range(6, 45), range(2, 15)).filter(([a, b, d]) => a < b && d * (lcm(a, b) / a + lcm(a, b) / b) < lcm(a, b) && isInt((lcm(a, b) - d * (lcm(a, b) / a + lcm(a, b) / b)) / (lcm(a, b) / b))), 300),
  build: (t, prm) => {
    const [a, b, d] = prm; const U = lcm(a, b); const r = U / a + U / b; const left = U - d * r; const ans = left / (U / b); const [p, q] = who(prm).e; const [ph, qh] = who(prm).h;
    return AQ(t, `${p} can do a work in ${a} days and ${q} in ${b} days. They work together for ${d} days, and then ${p} leaves. In how many more days will ${q} finish the work?`,
      `${ph} एक काम ${a} दिन में और ${qh} ${b} दिन में कर सकता है। दोनों ${d} दिन साथ काम करते हैं, फिर ${ph} चला जाता है। ${qh} बचा काम कितने और दिन में पूरा करेगा?`,
      ans, [b - d, left / (U / a), ans + d, (a * b) / (a + b)], () => walk(U, (i) => (i < d ? r : U / b)) - d,
      `Work = ${U} units; ${p} ${U / a}, ${q} ${U / b} a day. ${d} days together: ${d} × ${r} = ${d * r}. Left ${left} units; ${q} alone: ${left} ÷ ${U / b} = ${N(ans)} days.`,
      `काम = ${U} इकाई; ${ph} ${U / a}, ${qh} ${U / b} प्रतिदिन। ${d} दिन साथ: ${d} × ${r} = ${d * r}। शेष ${left} इकाई; ${qh} अकेला: ${left} ÷ ${U / b} = ${N(ans)} दिन।`, "day");
  },
};
const leaveBefore = {
  id: "leaveBefore", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(6, 45), range(6, 45), range(2, 10), [0, 1]).filter(([a, b, k]) => { if (a >= b) return false; const U = lcm(a, b); const x = (U + k * (U / a)) / (U / a + U / b); return isInt(x) && x > k + 1; }), 300),
  build: (t, prm) => {
    const [a, b, k, askA] = prm; const U = lcm(a, b); const x = (U + k * (U / a)) / (U / a + U / b); const ans = askA ? x - k : x; const [p, q] = who(prm).e; const [ph, qh] = who(prm).h;
    return AQ(t, `${p} and ${q} can finish a work in ${a} and ${b} days respectively. They start together, but ${p} leaves ${k} days before the work is finished. ${askA ? `For how many days did ${p} work?` : "In how many days was the work finished?"}`,
      `${ph} और ${qh} एक काम क्रमशः ${a} और ${b} दिन में पूरा कर सकते हैं। दोनों साथ शुरू करते हैं, पर काम पूरा होने से ${k} दिन पहले ${ph} चला जाता है। ${askA ? `${ph} ने कितने दिन काम किया?` : "काम कितने दिन में पूरा हुआ?"}`,
      ans, [askA ? x : x - k, (a * b) / (a + b), ans + 1, ans - 1], () => { for (let n = k + 1; n < 1000; n++) if ((n - k) * (U / a) + n * (U / b) >= U) return askA ? n - k : n; },
      `Work = ${U} units; ${p} ${U / a}, ${q} ${U / b} a day. If it took x days, ${p} worked x − ${k}: ${U / a}(x − ${k}) + ${U / b}x = ${U}, so ${U / a + U / b}x = ${U + k * (U / a)} and x = ${x}.${askA ? ` ${p} worked ${x} − ${k} = ${ans} days.` : ""}`,
      `काम = ${U} इकाई; ${ph} ${U / a}, ${qh} ${U / b} प्रतिदिन। यदि x दिन लगे, ${ph} ने x − ${k} दिन काम किया: ${U / a}(x − ${k}) + ${U / b}x = ${U}, अतः ${U / a + U / b}x = ${U + k * (U / a)} और x = ${x}।${askA ? ` ${ph} ने ${x} − ${k} = ${ans} दिन काम किया।` : ""}`, "day");
  },
};
const joinLater = {
  id: "joinLater", levels: ["medium", "hard"],
  cands: () => cap(cross(range(6, 45), range(6, 45), range(2, 12)).filter(([a, b, k]) => { const U = lcm(a, b); const rest = U - k * (U / a); return a !== b && rest > 0 && isInt(rest / (U / a + U / b)); }), 300),
  build: (t, prm) => {
    const [a, b, k] = prm; const U = lcm(a, b); const rest = U - k * (U / a); const m = rest / (U / a + U / b); const ans = k + m; const [p, q] = who(prm).e; const [ph, qh] = who(prm).h;
    return AQ(t, `${p} can do a work in ${a} days and ${q} in ${b} days. ${p} starts the work alone and ${q} joins after ${k} days. In how many days in all is the work finished?`,
      `${ph} एक काम ${a} दिन में और ${qh} ${b} दिन में कर सकता है। ${ph} अकेले काम शुरू करता है और ${k} दिन बाद ${qh} साथ आ जाता है। काम कुल कितने दिन में पूरा होता है?`,
      ans, [m, (a * b) / (a + b) + k, ans + 1, a - k], () => walk(U, (i) => (i < k ? U / a : U / a + U / b)),
      `Work = ${U} units. ${p} alone for ${k} days: ${k * (U / a)}. Left ${rest}; together ${U / a + U / b} a day: ${rest} ÷ ${U / a + U / b} = ${m} days. In all ${k} + ${m} = ${ans} days.`,
      `काम = ${U} इकाई। ${ph} अकेला ${k} दिन: ${k * (U / a)}। शेष ${rest}; मिलकर ${U / a + U / b} प्रतिदिन: ${rest} ÷ ${U / a + U / b} = ${m} दिन। कुल ${k} + ${m} = ${ans} दिन।`, "day");
  },
};

// ------------------------------------------------------------ MEN, WOMEN, BOYS
const mw1 = {
  id: "menOrWomen", levels: ["medium", "hard"],
  cands: () => cap(cross(range(4, 30), range(4, 40), range(6, 40), range(1, 12), range(1, 12)).filter(([m, w, d, p, q]) => p > 1 && q > 1 && m < w && gcd(m, w) > 1 && isInt((m * w * d) / (p * w + q * m)) && (m * w * d) / (p * w + q * m) !== d && p * w + q * m !== m * w), 400),
  build: (t, prm) => {
    const [m, w, d, p, q] = prm; const ans = (m * w * d) / (p * w + q * m);
    return AQ(t, `${m} men or ${w} women can do a piece of work in ${d} days. In how many days can ${p} men and ${q} women do it?`,
      `${m} आदमी या ${w} औरतें एक काम ${d} दिन में कर सकते हैं। ${p} आदमी और ${q} औरतें उसे कितने दिन में करेंगे?`,
      ans, [(d * (m + w)) / (p + q), d, ans + 2, (m * d) / (p + q)], () => walk(m * w * d, () => p * w + q * m),
      `${m} men = ${w} women, so a man does the work of ${L.frac(w, m)} women. Count in women: work = ${w} × ${d} = ${w * d} woman-days; ${p} men and ${q} women = ${N((p * w) / m)} + ${q} = ${N((p * w) / m + q)} women. Time = ${w * d} ÷ ${N((p * w) / m + q)} = ${N(ans)} days.`,
      `${m} आदमी = ${w} औरतें, अतः एक आदमी = ${L.frac(w, m)} औरत। औरतों में गिनें: काम = ${w} × ${d} = ${w * d} औरत-दिन; ${p} आदमी और ${q} औरतें = ${N((p * w) / m)} + ${q} = ${N((p * w) / m + q)} औरतें। समय = ${w * d} ÷ ${N((p * w) / m + q)} = ${N(ans)} दिन।`, "day");
  },
};
// Two crews give the man : woman rate; a third crew's time.
const mw2 = {
  id: "twoCrews", levels: ["hard", "advanced"],
  cands: () => cap(cross([[1, 1], [2, 1], [3, 1], [3, 2], [4, 3], [5, 2], [5, 3]], range(1, 12), range(1, 12), range(4, 16), range(1, 12), range(1, 12)).filter(() => true).map(([r, m1, w1, d1, m2, w2]) => [r, m1, w1, d1, m2, w2, 1 + ((m1 + w2) % 5), 1 + ((w1 + m2) % 6)]).filter(([[mr, wr], m1, w1, d1, m2, w2, m3, w3]) => {
    const work = (m1 * mr + w1 * wr) * d1; const r2 = m2 * mr + w2 * wr; const r3 = m3 * mr + w3 * wr;
    return (m1 !== m2 || w1 !== w2) && m1 * w2 !== m2 * w1 && isInt(work / r2) && work / r2 !== d1 && isInt(work / r3) && work / r3 <= 120 && (m3 !== m1 || w3 !== w1) && (m3 !== m2 || w3 !== w2);
  }), 400),
  build: (t, prm) => {
    const [[mr, wr], m1, w1, d1, m2, w2, m3, w3] = prm; const work = (m1 * mr + w1 * wr) * d1; const d2 = work / (m2 * mr + w2 * wr); const ans = work / (m3 * mr + w3 * wr);
    return AQ(t, `${m1} men and ${w1} women can do a piece of work in ${d1} days, while ${m2} men and ${w2} women can do it in ${d2} days. In how many days can ${m3} men and ${w3} women do it?`,
      `${m1} आदमी और ${w1} औरतें एक काम ${d1} दिन में कर सकते हैं, जबकि ${m2} आदमी और ${w2} औरतें उसे ${d2} दिन में कर सकते हैं। ${m3} आदमी और ${w3} औरतें उसे कितने दिन में करेंगे?`,
      ans, [(d1 + d2) / 2, (d1 * (m1 + w1)) / (m3 + w3), ans + 4, ans - 2], () => {
        // Solve the rate ratio from the two crews by trying rates.
        for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) if ((m1 * a + w1 * b) * d1 === (m2 * a + w2 * b) * d2 && gcd(a, b) === 1) return ((m1 * a + w1 * b) * d1) / (m3 * a + w3 * b);
        return 0;
      },
      `${d1}(${m1}M + ${w1}W) = ${d2}(${m2}M + ${w2}W) gives M : W = ${mr} : ${wr}. With a man = ${mr} and a woman = ${wr} units a day, work = ${d1} × ${m1 * mr + w1 * wr} = ${work} units. ${m3} men and ${w3} women do ${m3 * mr + w3 * wr} a day: ${work} ÷ ${m3 * mr + w3 * wr} = ${N(ans)} days.`,
      `${d1}(${m1}M + ${w1}W) = ${d2}(${m2}M + ${w2}W) से M : W = ${mr} : ${wr}। आदमी = ${mr}, औरत = ${wr} इकाई प्रतिदिन लें: काम = ${d1} × ${m1 * mr + w1 * wr} = ${work} इकाई। ${m3} आदमी और ${w3} औरतें ${m3 * mr + w3 * wr} प्रतिदिन: ${work} ÷ ${m3 * mr + w3 * wr} = ${N(ans)} दिन।`, "day");
  },
};

// ------------------------------------------------------------ MEN JOIN / ABSENT / CONTRACTOR
const moreJoin = {
  id: "moreJoin", levels: ["medium", "hard"],
  cands: () => cap(cross(range(6, 40), range(8, 40), range(2, 20), range(2, 30)).filter(([m, d, k, x]) => k < d && isInt((m * (d - k)) / (m + x))), 400),
  build: (t, prm) => {
    const [m, d, k, x] = prm; const ans = (m * (d - k)) / (m + x);
    return AQ(t, `${m} men can finish a work in ${d} days. After ${k} days, ${x} more men join them. In how many more days is the rest of the work finished?`,
      `${m} आदमी एक काम ${d} दिन में पूरा कर सकते हैं। ${k} दिन बाद ${x} और आदमी आ जाते हैं। बचा काम कितने और दिन में पूरा होगा?`,
      ans, [d - k, (m * d) / (m + x), ans + k, (x * (d - k)) / (m + x)].filter((v) => v !== ans), () => walk(m * d, (i) => (i < k ? m : m + x)) - k,
      `Work = ${m} × ${d} = ${m * d} man-days. In ${k} days: ${m * k}. Left ${m * (d - k)}; now ${m + x} men: ${m * (d - k)} ÷ ${m + x} = ${N(ans)} days.`,
      `काम = ${m} × ${d} = ${m * d} आदमी-दिन। ${k} दिन में: ${m * k}। शेष ${m * (d - k)}; अब ${m + x} आदमी: ${m * (d - k)} ÷ ${m + x} = ${N(ans)} दिन।`, "day");
  },
};
const absent = {
  id: "absent", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(6, 60), range(2, 20), range(4, 40)).filter(([d1, x, d2]) => d2 > d1 && isInt((x * d2) / (d2 - d1)) && (x * d2) / (d2 - d1) > x), 300),
  build: (t, prm) => {
    const [d1, x, d2] = prm; const n = (x * d2) / (d2 - d1);
    return AQ(t, `A group of workers was to finish a work in ${d1} days. But ${x} of them did not turn up, and the rest finished it in ${d2} days. How many workers were in the group at first?`,
      `कुछ मज़दूरों को एक काम ${d1} दिन में पूरा करना था। पर उनमें से ${x} नहीं आए, और बाकी ने वह ${d2} दिन में पूरा किया। समूह में शुरू में कितने मज़दूर थे?`,
      n, [n - x, (x * d1) / (d2 - d1), n + x, d2 - d1 + x].filter((v) => v !== n), () => { for (let m = x + 1; m < 10000; m++) if (m * d1 === (m - x) * d2) return m; return 0; },
      `Work is the same: N × ${d1} = (N − ${x}) × ${d2}. So ${d2 - d1}N = ${x * d2} and N = ${n}.`,
      `काम समान है: N × ${d1} = (N − ${x}) × ${d2}। अतः ${d2 - d1}N = ${x * d2} और N = ${n}।`);
  },
};
const contractor = {
  id: "contractor", levels: ["advanced"],
  cands: () => cap(cross(range(30, 120, 5), range(10, 100, 5), [[1, 4], [1, 3], [2, 5], [1, 2], [3, 5], [2, 3], [3, 8]], range(5, 80, 5)).filter(([D, M, [p, q], d]) => {
    if (d >= D) return false; const total = (M * d * q) / p; const need = total - M * d; const days = D - d; const men = need / days; return isInt(total) && isInt(men) && men > M && p / q < d / D;
  }), 300),
  build: (t, prm) => {
    const [D, M, [p, q], d] = prm; const total = (M * d * q) / p; const need = total - M * d; const men = need / (D - d); const ans = men - M;
    return AQ(t, `A contractor undertook to finish a work in ${D} days and put ${M} men on it. After ${d} days he found that only ${p}/${q} of the work was done. How many more men must he employ to finish the work on time?`,
      `एक ठेकेदार ने एक काम ${D} दिन में पूरा करने का ज़िम्मा लिया और ${M} आदमी लगाए। ${d} दिन बाद उसने देखा कि केवल ${p}/${q} काम हुआ है। समय पर काम पूरा करने के लिए उसे कितने और आदमी लगाने होंगे?`,
      ans, [men, (M * (q - p)) / p, ans + 10, ans / 2], () => { for (let x = 1; x < 10000; x++) if ((M + x) * (D - d) * p >= M * d * (q - p)) return x; return 0; },
      `${M} men did ${p}/${q} in ${d} days, so the whole work is ${M} × ${d} × ${q}/${p} = ${total} man-days. Left: ${total} − ${M * d} = ${need} man-days in ${D - d} days, needing ${need} ÷ ${D - d} = ${men} men: ${men} − ${M} = ${ans} more.`,
      `${M} आदमियों ने ${d} दिन में ${p}/${q} काम किया, अतः पूरा काम ${M} × ${d} × ${q}/${p} = ${total} आदमी-दिन। शेष: ${total} − ${M * d} = ${need} आदमी-दिन, ${D - d} दिन में, अतः ${need} ÷ ${D - d} = ${men} आदमी: ${men} − ${M} = ${ans} और।`);
  },
};
const delay = {
  id: "delay", levels: ["advanced"],
  cands: () => cap(cross(range(20, 90, 5), range(20, 150, 10), range(10, 150, 10), range(5, 85, 5)).filter(([D, M, x, d]) => d < D && isInt(((M * d + (M + x) * (D - d)) / M) - D) && ((M * d + (M + x) * (D - d)) / M) - D > 0), 300),
  build: (t, prm) => {
    const [D, M, x, d] = prm; const work = M * d + (M + x) * (D - d); const ans = work / M - D;
    return AQ(t, `A contractor planned to finish a work in ${D} days and employed ${M} men. After ${d} days he employed ${x} more men and the work was finished on time. How many days late would it have been without the extra men?`,
      `एक ठेकेदार ने एक काम ${D} दिन में पूरा करने के लिए ${M} आदमी लगाए। ${d} दिन बाद उसने ${x} और आदमी लगाए और काम समय पर पूरा हुआ। अतिरिक्त आदमियों के बिना काम कितने दिन देर से पूरा होता?`,
      ans, [D - d, (x * (D - d)) / (M + x), ans + 2, work / M], () => walk(work, () => M) - D,
      `Work = ${M} × ${d} + ${M + x} × ${D - d} = ${work} man-days. With ${M} men only: ${work} ÷ ${M} = ${work / M} days, i.e. ${ans} days late.`,
      `काम = ${M} × ${d} + ${M + x} × ${D - d} = ${work} आदमी-दिन। केवल ${M} आदमियों से: ${work} ÷ ${M} = ${work / M} दिन, यानी ${ans} दिन देर।`, "day");
  },
};

// ------------------------------------------------------------ PATTERNS
const sqrtTogether = {
  id: "sqrtTogether", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(2, 40), range(2, 40)).filter(([a, b]) => a < b && isInt(Math.sqrt(a * b)) && Math.sqrt(a * b) > 2), 200),
  build: (t, prm) => {
    const [a, b] = prm; const x = Math.sqrt(a * b); const [p, q] = who(prm).e; const [ph, qh] = who(prm).h;
    return AQ(t, `Working alone, ${p} would take ${a} hours more than ${p} and ${q} take together, and ${q} would take ${b} hours more. How long do they take together?`,
      `अकेले काम करने पर ${ph} को दोनों के साथ के समय से ${a} घंटे अधिक और ${qh} को ${b} घंटे अधिक लगते। दोनों साथ कितना समय लेते हैं?`,
      x, [(a + b) / 2, b - a, a + b, x + 2], () => { for (let t2 = 1; t2 < 1000; t2++) if ((t2 + a) * (t2 + b) === t2 * (2 * t2 + a + b)) return t2; return 0; },
      `If together they take x hours: 1/(x + ${a}) + 1/(x + ${b}) = 1/x, which simplifies to x² = ${a} × ${b} = ${a * b}. So x = ${x} hours.`,
      `यदि साथ में x घंटे लगें: 1/(x + ${a}) + 1/(x + ${b}) = 1/x, जिससे x² = ${a} × ${b} = ${a * b}। अतः x = ${x} घंटे।`, "hr");
  },
};
// Alternate days, starting with the first; the answer can end part-way through a day.
const alternate = {
  id: "alternate", levels: ["hard", "advanced"],
  cands: () => cap(pairs2(4, 40).filter(([a, b]) => b < 3 * a), 300),
  build: (t, prm) => {
    const [a, b] = prm; const U = lcm(a, b); const ra = U / a, rb = U / b; const [p, q] = who(prm).e; const [ph, qh] = who(prm).h;
    let done = 0, d = 0; while (true) { const r = d % 2 === 0 ? ra : rb; if (done + r >= U) { const part = U - done; const [num, den] = [part, r]; const ansS = mixedFrac(d * den + num, den); const pairsDone = Math.floor(d / 2); return SQ(t, `${p} can do a work in ${a} days and ${q} in ${b} days. They work on alternate days, ${p} on the first day. In how many days is the work finished?`,
      `${ph} एक काम ${a} दिन में और ${qh} ${b} दिन में कर सकता है। वे बारी-बारी एक-एक दिन काम करते हैं, पहले दिन ${ph}। काम कितने दिन में पूरा होगा?`,
      `${ansS} days`, [`${mixedFrac(2 * U, ra + rb)} days`, `${mixedFrac(a * b, a + b)} days`, `${d + 1 + (num === den ? 1 : 0)} days`, `${mixedFrac(d * den + num + den, den)} days`, `${(a + b) / 2} days`], () => { let w = 0, k = 0; while (w + (k % 2 ? rb : ra) < U) { w += k % 2 ? rb : ra; k++; } const left = U - w; return `${mixedFrac(k * (k % 2 ? rb : ra) + left, k % 2 ? rb : ra)} days`; },
      `Work = LCM(${a}, ${b}) = ${U} units; ${p} ${ra}, ${q} ${rb} a day. Each 2-day pair does ${ra + rb}. After ${pairsDone} pairs (${2 * pairsDone} days): ${pairsDone * (ra + rb)}.${d % 2 ? ` Day ${d}: ${p} adds ${ra} = ${done}.` : ""} The last ${part} units take ${part}/${r} of day ${d + 1}: ${ansS} days in all.`,
      `काम = ${U} इकाई; ${ph} ${ra}, ${qh} ${rb} प्रतिदिन। हर 2 दिन में ${ra + rb}। ${pairsDone} जोड़ों (${2 * pairsDone} दिन) में: ${pairsDone * (ra + rb)}।${d % 2 ? ` दिन ${d}: ${ph} के ${ra} जुड़कर ${done}।` : ""} अंतिम ${part} इकाई में दिन ${d + 1} का ${part}/${r} लगता है: कुल ${ansS} दिन।`, `${ansS} दिन`, [`${mixedFrac(2 * U, ra + rb)} दिन`, `${mixedFrac(a * b, a + b)} दिन`, `${d + 1 + (num === den ? 1 : 0)} दिन`, `${mixedFrac(d * den + num + den, den)} दिन`, `${(a + b) / 2} दिन`]); }
      done += r; d++; }
  },
};
// A works every day; B and C join on every third day.
const everyThird = {
  id: "everyThird", levels: ["advanced"],
  cands: () => cap(cross(range(6, 40), range(6, 60), range(8, 90)).filter(([a, b, c]) => a < b && b < c && isInt(lcmA([a, b, c]) / (3 * (lcmA([a, b, c]) / a) + lcmA([a, b, c]) / b + lcmA([a, b, c]) / c)) && !(a === 20 && b === 30 && c === 60)), 300),
  build: (t, prm) => {
    const [a, b, c] = prm; const U = lcmA([a, b, c]); const ra = U / a, rb = U / b, rc = U / c; const cyc = 3 * ra + rb + rc; const n = U / cyc; const ans = 3 * n; const nm = who(prm).e, nh = who(prm).h;
    return AQ(t, `${nm[0]}, ${nm[1]} and ${nm[2]} can do a work in ${a}, ${b} and ${c} days respectively. ${nm[0]} works every day and is helped by ${nm[1]} and ${nm[2]} on every third day. In how many days is the work finished?`,
      `${nh[0]}, ${nh[1]} और ${nh[2]} एक काम क्रमशः ${a}, ${b} और ${c} दिन में कर सकते हैं। ${nh[0]} हर दिन काम करता है और हर तीसरे दिन ${nh[1]} व ${nh[2]} उसकी मदद करते हैं। काम कितने दिन में पूरा होगा?`,
      ans, [n, U / (ra + rb + rc), a - n, ans + 3], () => walk(U, (i) => (i % 3 === 2 ? ra + rb + rc : ra)),
      `Work = ${U} units; ${nm[0]} ${ra}, ${nm[1]} ${rb}, ${nm[2]} ${rc} a day. Every 3 days: ${ra} + ${ra} + (${ra} + ${rb} + ${rc}) = ${cyc} units. ${U} ÷ ${cyc} = ${n} such blocks = ${ans} days.`,
      `काम = ${U} इकाई; ${nh[0]} ${ra}, ${nh[1]} ${rb}, ${nh[2]} ${rc} प्रतिदिन। हर 3 दिन में: ${ra} + ${ra} + (${ra} + ${rb} + ${rc}) = ${cyc} इकाई। ${U} ÷ ${cyc} = ${n} खंड = ${ans} दिन।`, "day");
  },
};

const KINDS = guard([
  together("together2E", ["easy"], 3, 72), together("together2M", ["medium", "hard"], 10, 90),
  alone("aloneE", ["easy"], 3, 72), alone("aloneM", ["medium", "hard"], 10, 90),
  three("threeE", ["easy", "medium"], 4, 40), three("threeH", ["hard", "advanced"], 8, 90),
  part, mdDays, mdMen, mdh, mdhw, timesEff, pctEff, effRatio, timesTogether, lessDays,
  pairs("pairsAll", ["medium", "hard", "advanced"], "all"), pairs("pairsAlone", ["hard", "advanced"], "alone"),
  fractionLeft, leaveAfter, leaveBefore, joinLater, mw1, mw2, moreJoin, absent, contractor, delay,
  sqrtTogether, alternate, everyThird,
]);

const PREFIX = "Time & Work · Work and Efficiency";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
