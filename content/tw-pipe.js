// Time & Work · Pipes and Cisterns: pipes filling and emptying a tank,
// together and alone, leaks, pipes opened late or closed early, taps opened
// at clock times, alternate hours, capacity in litres. gen.js fills the
// tests; every answer is worked out again in `v` by filling the tank minute
// by minute in whole units; the wrong options are the slips students make
// (adding the times, subtracting the times, forgetting the leak).
const L = require("./tw-lib");
const { N, gcd, lcm, lcmA, range, cap, pick, AQ, SQ, guard, cross, mixedFrac, clock, isInt } = L;
const { fillTopic } = require("./gen");

const P = [["A", "B", "C"], ["P", "Q", "R"], ["X", "Y", "Z"]];
const pp = (prm, s = 0) => pick(P, prm, s);
const TANK = [["a tank", "एक टंकी", "the tank", "टंकी"], ["a cistern", "एक हौज़", "the cistern", "हौज़"], ["a water tank", "पानी की एक टंकी", "the tank", "टंकी"]];
const tank = (prm) => pick(TANK, prm, 5);
const cap1 = (x) => x[0].toUpperCase() + x.slice(1);
const hrs = (k) => (k === 1 ? "1 hour" : `${k} hours`);
// Time to fill `units` when the tank gains rates(i) units in step i.
const fill = (units, rates) => { let w = 0, i = 0; while (w < units) { w += rates(i); i++; if (i > 100000 || w < -1e6) return NaN; } return i; };
const pairs2 = (lo, hi) => cross(range(lo, hi), range(lo, hi)).filter(([a, b]) => a < b);

const together = (id, levels, lo, hi, u, max = 300) => ({
  id, levels,
  cands: () => cap(pairs2(lo, hi).filter(([a, b]) => isInt((a * b) / (a + b)) && b < 6 * a), max),
  build: (t, prm) => {
    const [a, b] = prm; const T = (a * b) / (a + b); const [x, y] = pp(prm); const tk = tank(prm); const U = lcm(a, b); const ue = u === "min" ? "minutes" : "hours"; const uh = u === "min" ? "मिनट" : "घंटे";
    return AQ(t, `Pipes ${x} and ${y} can fill ${tk[0]} in ${a} and ${b} ${ue} respectively. If both are opened together, in how many ${ue} will ${tk[2]} be full?`,
      `पाइप ${x} और ${y} ${tk[1]} को क्रमशः ${a} और ${b} ${uh} में भर सकते हैं। दोनों को एक साथ खोलने पर ${tk[3]} कितने ${uh} में भरेगी?`,
      T, [(a + b) / 2, b - a, a + b, T + 2], () => fill(U, () => U / a + U / b),
      `Take ${tk[2]} as LCM(${a}, ${b}) = ${U} units. ${x} fills ${U / a} and ${y} fills ${U / b} units ${u === "min" ? "a minute" : "an hour"}: together ${U / a + U / b}. Time = ${U} ÷ ${U / a + U / b} = ${N(T)} ${ue}.`,
      `${tk[3]} = LCM(${a}, ${b}) = ${U} इकाई। ${x} ${U / a} और ${y} ${U / b} इकाई प्रति ${u === "min" ? "मिनट" : "घंटा"} भरता है: मिलकर ${U / a + U / b}। समय = ${U} ÷ ${U / a + U / b} = ${N(T)} ${uh}।`, u);
  },
});
const fillEmpty = (id, levels, lo, hi, u, max = 300) => ({
  id, levels,
  cands: () => cap(pairs2(lo, hi).filter(([a, b]) => isInt((a * b) / (b - a)) && (a * b) / (b - a) <= 3 * b), max),
  build: (t, prm) => {
    const [a, b] = prm; const T = (a * b) / (b - a); const [x, y] = pp(prm); const tk = tank(prm); const U = lcm(a, b); const ue = u === "min" ? "minutes" : "hours"; const uh = u === "min" ? "मिनट" : "घंटे";
    return AQ(t, `Pipe ${x} can fill ${tk[0]} in ${a} ${ue} and pipe ${y} can empty it in ${b} ${ue}. If both are opened when ${tk[2]} is empty, in how many ${ue} will it be full?`,
      `पाइप ${x} ${tk[1]} को ${a} ${uh} में भर सकता है और पाइप ${y} उसे ${b} ${uh} में खाली कर सकता है। खाली ${tk[3]} में दोनों को एक साथ खोलने पर वह कितने ${uh} में भरेगी?`,
      T, [(a * b) / (a + b), b - a, a + b, T / 2], () => fill(U, () => U / a - U / b),
      `${cap1(tk[2])} = LCM(${a}, ${b}) = ${U} units. ${x} fills ${U / a}, ${y} empties ${U / b}: net ${U / a - U / b} ${u === "min" ? "a minute" : "an hour"}. Time = ${U} ÷ ${U / a - U / b} = ${N(T)} ${ue}.`,
      `${tk[3]} = ${U} इकाई। ${x} ${U / a} भरता, ${y} ${U / b} खाली करता है: शुद्ध ${U / a - U / b}। समय = ${U} ÷ ${U / a - U / b} = ${N(T)} ${uh}।`, u);
  },
});
const leak = {
  id: "leak", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => cap(pairs2(2, 36).filter(([a, b]) => isInt((a * b) / (b - a)) && (a * b) / (b - a) <= 4 * b && (a * b) / (b - a) <= 72), 600),
  build: (t, prm) => {
    const [a, b] = prm; const T = (a * b) / (b - a); const tk = tank(prm); const U = lcm(a, b);
    return AQ(t, `A pipe can fill ${tk[0]} in ${a} hours. Because of a leak in the bottom, it takes ${b} hours to fill. In how many hours can the leak alone empty the full ${tk[2].replace("the ", "")}?`,
      `एक पाइप ${tk[1]} को ${a} घंटे में भर सकता है। तली में रिसाव के कारण उसे भरने में ${b} घंटे लगते हैं। रिसाव अकेला भरी ${tk[3]} को कितने घंटे में खाली करेगा?`,
      T, [b - a, a + b, (a * b) / (a + b), T + a], () => fill(U, () => U / a - U / b),
      `${cap1(tk[2])} = LCM(${a}, ${b}) = ${U} units. The pipe fills ${U / a} an hour; with the leak only ${U / b} goes in, so the leak takes out ${U / a} − ${U / b} = ${U / a - U / b} an hour. Leak alone: ${U} ÷ ${U / a - U / b} = ${N(T)} hours.`,
      `${tk[3]} = ${U} इकाई। पाइप ${U / a} प्रति घंटा भरता है; रिसाव के साथ केवल ${U / b} भरता है, अतः रिसाव ${U / a} − ${U / b} = ${U / a - U / b} प्रति घंटा निकालता है। रिसाव अकेला: ${U} ÷ ${U / a - U / b} = ${N(T)} घंटे।`, "hr");
  },
};
const alone = {
  id: "pipeAlone", levels: ["easy", "medium"],
  cands: () => cap(pairs2(3, 72).filter(([a, b]) => isInt((a * b) / (a + b)) && b < 6 * a).flatMap(([a, b]) => [[(a * b) / (a + b), a, b], [(a * b) / (a + b), b, a]]), 300),
  build: (t, prm) => {
    const [T, a, b] = prm; const [x, y] = pp(prm); const tk = tank(prm); const U = lcm(T, a);
    return AQ(t, `Two pipes ${x} and ${y} together fill ${tk[0]} in ${T} hours. ${x} alone fills it in ${a} hours. How long does ${y} alone take?`,
      `दो पाइप ${x} और ${y} मिलकर ${tk[1]} को ${T} घंटे में भरते हैं। ${x} अकेला उसे ${a} घंटे में भरता है। ${y} अकेला कितना समय लेगा?`,
      b, [a - T, a + T, (a * T) / (a + T), b + T], () => fill(U, () => U / T - U / a),
      `${cap1(tk[2])} = LCM(${T}, ${a}) = ${U} units. Together ${U / T} an hour, ${x} ${U / a}, so ${y} fills ${U / T - U / a} an hour: ${U} ÷ ${U / T - U / a} = ${b} hours.`,
      `${tk[3]} = ${U} इकाई। मिलकर ${U / T} प्रति घंटा, ${x} ${U / a}, अतः ${y} ${U / T - U / a} प्रति घंटा: ${U} ÷ ${U / T - U / a} = ${b} घंटे।`, "hr");
  },
};
// Two fill, one empties.
const twoOne = (id, levels, max = 300, big = false) => ({
  id, levels,
  cands: () => cap(cross(range(3, big ? 90 : 40), range(3, big ? 120 : 60), range(4, big ? 150 : 90)).filter(([a, b, c]) => { if (!(a < b)) return false; const U = lcmA([a, b, c]); const r = U / a + U / b - U / c; return r > 0 && isInt(U / r) && U / r <= 3 * b && U / r <= (big ? 72 : 48) && c !== a && c !== b; }), max),
  build: (t, prm) => {
    const [a, b, c] = prm; const U = lcmA([a, b, c]); const r = U / a + U / b - U / c; const T = U / r; const [x, y, z] = pp(prm); const tk = tank(prm);
    return AQ(t, `Pipes ${x} and ${y} can fill ${tk[0]} in ${a} and ${b} hours, and pipe ${z} can empty it in ${c} hours. If all three are opened together on an empty ${tk[2].replace("the ", "")}, in how many hours will it be full?`,
      `पाइप ${x} और ${y} ${tk[1]} को ${a} और ${b} घंटे में भर सकते हैं, और पाइप ${z} उसे ${c} घंटे में खाली कर सकता है। खाली ${tk[3]} में तीनों को एक साथ खोलने पर वह कितने घंटे में भरेगी?`,
      T, [U / (U / a + U / b + U / c), (a * b) / (a + b), T + c, (a + b + c) / 3], () => fill(U, () => r),
      `${cap1(tk[2])} = LCM(${a}, ${b}, ${c}) = ${U} units. An hour: ${U / a} + ${U / b} − ${U / c} = ${r}. Time = ${U} ÷ ${r} = ${N(T)} hours.`,
      `${tk[3]} = ${U} इकाई। प्रति घंटा: ${U / a} + ${U / b} − ${U / c} = ${r}। समय = ${U} ÷ ${r} = ${N(T)} घंटे।`, "hr");
  },
});
// Both open; one is closed after k hours.
const closedAfter = {
  id: "closedAfter", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => cap(cross(range(4, 40), range(4, 40), range(1, 10)).filter(([a, b, k]) => { const U = lcm(a, b); const done = k * (U / a + U / b); return a < b && done < U && isInt((U - done) / (U / b)); }), 600),
  build: (t, prm) => {
    const [a, b, k] = prm; const U = lcm(a, b); const done = k * (U / a + U / b); const m = (U - done) / (U / b); const [x, y] = pp(prm); const tk = tank(prm);
    return AQ(t, `Pipes ${x} and ${y} can fill ${tk[0]} in ${a} and ${b} hours respectively. Both are opened together, and ${x} is closed after ${hrs(k)}. In how many more hours will ${y} fill the rest?`,
      `पाइप ${x} और ${y} ${tk[1]} को क्रमशः ${a} और ${b} घंटे में भर सकते हैं। दोनों एक साथ खोले जाते हैं, और ${k} घंटे बाद ${x} बंद कर दिया जाता है। ${y} बाकी हिस्सा कितने और घंटे में भरेगा?`,
      m, [b - k, m + k, (U - done) / (U / a), (a * b) / (a + b)], () => fill(U, (i) => (i < k ? U / a + U / b : U / b)) - k,
      `${cap1(tk[2])} = ${U} units. ${hrs(k)} together: ${k} × ${U / a + U / b} = ${done}. Left ${U - done}; ${y} fills ${U / b} an hour: ${U - done} ÷ ${U / b} = ${N(m)} hours.`,
      `${tk[3]} = ${U} इकाई। ${k} घंटे साथ: ${k} × ${U / a + U / b} = ${done}। शेष ${U - done}; ${y} ${U / b} प्रति घंटा: ${U - done} ÷ ${U / b} = ${N(m)} घंटे।`, "hr");
  },
};
// One opened later.
const openedLater = {
  id: "openedLater", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => cap(cross(range(4, 40), range(4, 40), range(1, 10)).filter(([a, b, k]) => { const U = lcm(a, b); const rest = U - k * (U / a); return a !== b && rest > 0 && isInt(rest / (U / a + U / b)); }), 600),
  build: (t, prm) => {
    const [a, b, k] = prm; const U = lcm(a, b); const rest = U - k * (U / a); const m = rest / (U / a + U / b); const ans = k + m; const [x, y] = pp(prm); const tk = tank(prm);
    return AQ(t, `Pipes ${x} and ${y} can fill ${tk[0]} in ${a} and ${b} hours respectively. ${x} is opened first and ${y} is opened ${hrs(k)} later. In how many hours from the start will ${tk[2]} be full?`,
      `पाइप ${x} और ${y} ${tk[1]} को क्रमशः ${a} और ${b} घंटे में भर सकते हैं। पहले ${x} खोला जाता है और ${k} घंटे बाद ${y}। शुरू से कितने घंटे में ${tk[3]} भरेगी?`,
      ans, [m, (a * b) / (a + b) + k, ans + 1, a - k], () => fill(U, (i) => (i < k ? U / a : U / a + U / b)),
      `${cap1(tk[2])} = ${U} units. ${x} alone for ${hrs(k)}: ${k * (U / a)}. Left ${rest}; both fill ${U / a + U / b} an hour: ${rest} ÷ ${U / a + U / b} = ${m}. Total ${k} + ${m} = ${ans} hours.`,
      `${tk[3]} = ${U} इकाई। ${x} अकेला ${k} घंटे: ${k * (U / a)}। शेष ${rest}; दोनों ${U / a + U / b} प्रति घंटा: ${rest} ÷ ${U / a + U / b} = ${m}। कुल ${k} + ${m} = ${ans} घंटे।`, "hr");
  },
};
// Taps opened at clock times.
const atTimes = {
  id: "atTimes", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(4, 30), range(4, 30), range(4, 40), range(1, 3), range(1, 4), [5, 6, 7, 8, 9]).filter(([a, b, c, d1, d2]) => {
    if (!(a < b && b < c)) return false; const U = lcmA([a, b, c]);
    const ra = U / a, rb = U / b, rc = U / c; const before = d1 * ra + d2 * (ra + rb); if (before >= U) return false;
    return isInt((U - before) / (ra + rb + rc));
  }), 600),
  build: (t, prm) => {
    const [a, b, c, d1, d2, h0] = prm; const U = lcmA([a, b, c]); const ra = U / a, rb = U / b, rc = U / c; const before = d1 * ra + d2 * (ra + rb); const m = (U - before) / (ra + rb + rc); const end = (h0 + d1 + d2 + m) * 3600; const [x, y, z] = pp(prm); const tk = tank(prm);
    const T0 = clock(h0 * 3600), T1 = clock((h0 + d1) * 3600), T2 = clock((h0 + d1 + d2) * 3600);
    const wrong = [U / (ra + rb + rc), (a * b) / (a + b) + d1, m + d2].map((h) => clock(h0 * 3600 + Math.round(h * 3600)));
    return SQ(t, `Three pipes ${x}, ${y} and ${z} can fill ${tk[0]} in ${a}, ${b} and ${c} hours respectively. ${x} is opened at ${T0}, ${y} at ${T1} and ${z} at ${T2}. At what time will ${tk[2]} be full?`,
      `तीन पाइप ${x}, ${y} और ${z} ${tk[1]} को क्रमशः ${a}, ${b} और ${c} घंटे में भर सकते हैं। ${x} को ${T0} पर, ${y} को ${T1} पर और ${z} को ${T2} पर खोला जाता है। ${tk[3]} किस समय भरेगी?`,
      clock(end), [...wrong, clock(end + 3600)], () => { const h = fill(U, (i) => (i < d1 ? ra : i < d1 + d2 ? ra + rb : ra + rb + rc)); return clock((h0 + h) * 3600); },
      `${cap1(tk[2])} = LCM(${a}, ${b}, ${c}) = ${U} units. ${T0}–${T1}: ${x} alone, ${d1 * ra}. ${T1}–${T2}: ${x} and ${y}, ${d2 * (ra + rb)}. Filled ${before}, left ${U - before}; all three fill ${ra + rb + rc} an hour: ${m} hours more. Full at ${clock(end)}.`,
      `${tk[3]} = ${U} इकाई। ${T0}–${T1}: केवल ${x}, ${d1 * ra}। ${T1}–${T2}: ${x} और ${y}, ${d2 * (ra + rb)}। भरा ${before}, शेष ${U - before}; तीनों ${ra + rb + rc} प्रति घंटा: ${m} घंटे और। ${clock(end)} पर भरेगी।`);
  },
};
// Alternate hours, the first pipe first.
const altHours = {
  id: "altHours", levels: ["hard", "advanced"],
  cands: () => cap(pairs2(3, 40).filter(([a, b]) => b < 4 * a), 600),
  build: (t, prm) => {
    const [a, b] = prm; const U = lcm(a, b); const ra = U / a, rb = U / b; const [x, y] = pp(prm); const tk = tank(prm);
    let w = 0, h = 0; while (w + (h % 2 ? rb : ra) < U) { w += h % 2 ? rb : ra; h++; }
    const r = h % 2 ? rb : ra; const part = U - w; const ans = mixedFrac(h * r + part, r);
    return SQ(t, `Pipes ${x} and ${y} can fill ${tk[0]} in ${a} and ${b} hours respectively. They are opened in turn for an hour each, ${x} first. In how many hours will ${tk[2]} be full?`,
      `पाइप ${x} और ${y} ${tk[1]} को क्रमशः ${a} और ${b} घंटे में भर सकते हैं। दोनों को बारी-बारी एक-एक घंटे खोला जाता है, पहले ${x}। ${tk[3]} कितने घंटे में भरेगी?`,
      `${ans} hours`, [`${mixedFrac(2 * U, ra + rb)} hours`, `${mixedFrac(a * b, a + b)} hours`, `${h + 1 + (part === r ? 1 : 0)} hours`, `${mixedFrac(h * r + part + r, r)} hours`, `${(a + b) / 2} hours`], () => { let s = 0, k = 0; while (s + (k % 2 ? rb : ra) < U) { s += k % 2 ? rb : ra; k++; } const rr = k % 2 ? rb : ra; return `${mixedFrac(k * rr + U - s, rr)} hours`; },
      `${cap1(tk[2])} = ${U} units; ${x} ${ra}, ${y} ${rb} an hour; every 2 hours ${ra + rb}. After ${h} hours: ${w}. The last ${part} units take ${part}/${r} of hour ${h + 1}: ${ans} hours.`,
      `${tk[3]} = ${U} इकाई; ${x} ${ra}, ${y} ${rb} प्रति घंटा; हर 2 घंटे में ${ra + rb}। ${h} घंटे बाद: ${w}। अंतिम ${part} इकाई में घंटा ${h + 1} का ${part}/${r} लगता है: ${ans} घंटे।`,
      `${ans} घंटे`, [`${mixedFrac(2 * U, ra + rb)} घंटे`, `${mixedFrac(a * b, a + b)} घंटे`, `${h + 1 + (part === r ? 1 : 0)} घंटे`, `${mixedFrac(h * r + part + r, r)} घंटे`, `${(a + b) / 2} घंटे`]);
  },
};
// Capacity in litres from a leak's rate.
const capacity = {
  id: "capacity", levels: ["medium", "hard", "advanced"],
  cands: () => cap(cross(range(2, 30), range(2, 40), range(2, 20)).filter(([a, b, l]) => { if (a >= b) return false; const lk = (a * b) / (b - a); return isInt(lk) && lk <= 4 * b && isInt(lk * 60 * l) && lk * 60 * l <= 50000; }), 600),
  build: (t, prm) => {
    const [a, b, l] = prm; const lk = (a * b) / (b - a); const C = lk * 60 * l; const tk = tank(prm);
    return AQ(t, `A pipe can fill ${tk[0]} in ${a} hours, but with a leak it takes ${b} hours. The leak lets out ${l} litres a minute. What is the capacity of ${tk[2]}?`,
      `एक पाइप ${tk[1]} को ${a} घंटे में भर सकता है, पर रिसाव के कारण ${b} घंटे लगते हैं। रिसाव से प्रति मिनट ${l} लीटर पानी निकलता है। ${tk[3]} की क्षमता कितनी है?`,
      C, [b * 60 * l, (b - a) * 60 * l, a * 60 * l, lk * l], () => { for (let x = 1; x <= 100000; x++) if (x * (b - a) === l * 60 * a * b) return x; return 0; },
      `The pipe fills 1/${a} of it an hour; with the leak only 1/${b} stays, so the leak takes out 1/${a} − 1/${b} an hour and empties it alone in ${a} × ${b} ÷ (${b} − ${a}) = ${lk} hours = ${lk * 60} minutes. At ${l} litres a minute that is ${lk * 60} × ${l} = ${C} litres.`,
      `रिसाव अकेला टंकी को ${a} × ${b} ÷ (${b} − ${a}) = ${lk} घंटे = ${lk * 60} मिनट में खाली करता है। ${l} लीटर प्रति मिनट से क्षमता = ${lk * 60} × ${l} = ${C} लीटर।`, "lt");
  },
};
// One pipe k times as fast as the other.
const kTimes = {
  id: "kTimes", levels: ["easy", "medium", "hard"],
  cands: () => cap(cross([2, 3, 4], range(2, 40), [0, 1]).filter(([k, T, s]) => s || isInt(((k + 1) * T) / k)), 300),
  build: (t, prm) => {
    const [k, T, slow] = prm; const units = (k + 1) * T; const ans = slow ? units : units / k; const [x, y] = pp(prm); const tk = tank(prm); const kw = { 2: ["twice", "दोगुनी"], 3: ["three times", "तीन गुनी"], 4: ["four times", "चार गुनी"] }[k];
    return AQ(t, `Pipe ${x} fills ${tk[0]} ${kw[0]} as fast as pipe ${y}. Together they fill it in ${T} hours. How long does the ${slow ? "slower" : "faster"} pipe alone take?`,
      `पाइप ${x}, पाइप ${y} से ${kw[1]} तेज़ी से ${tk[1]} भरता है। दोनों मिलकर उसे ${T} घंटे में भरते हैं। ${slow ? "धीमा" : "तेज़"} पाइप अकेला कितना समय लेगा?`,
      ans, [slow ? units / k : units, T * k, T * 2, ans + T], () => fill(units, () => (slow ? 1 : k)),
      `Rates ${x} : ${y} = ${k} : 1, together ${k + 1} units an hour. ${tk[2]} = ${k + 1} × ${T} = ${units} units. ${slow ? y : x} alone: ${units} ÷ ${slow ? 1 : k} = ${N(ans)} hours.`,
      `दर ${x} : ${y} = ${k} : 1, मिलकर ${k + 1} इकाई प्रति घंटा। ${tk[3]} = ${k + 1} × ${T} = ${units} इकाई। ${slow ? y : x} अकेला: ${units} ÷ ${slow ? 1 : k} = ${N(ans)} घंटे।`, "hr");
  },
};
// What part is full after some time.
const partFull = {
  id: "partFull", levels: ["easy", "medium"],
  cands: () => cap(cross(range(3, 30), range(3, 30), range(1, 6)).filter(([a, b, h]) => a < b && lcm(a, b) <= 120 && h * (lcm(a, b) / a + lcm(a, b) / b) < lcm(a, b)), 300),
  build: (t, prm) => {
    const [a, b, h] = prm; const U = lcm(a, b); const f = h * (U / a + U / b); const [x, y] = pp(prm); const tk = tank(prm);
    return SQ(t, `Pipes ${x} and ${y} can fill ${tk[0]} in ${a} and ${b} hours respectively. Both are opened together on an empty ${tk[2].replace("the ", "")}. What part of it is full after ${h} hour${h > 1 ? "s" : ""}?`,
      `पाइप ${x} और ${y} ${tk[1]} को क्रमशः ${a} और ${b} घंटे में भर सकते हैं। खाली ${tk[3]} में दोनों एक साथ खोले जाते हैं। ${h} घंटे बाद उसका कितना भाग भरा होगा?`,
      L.frac(f, U), [L.frac(U - f, U), L.frac(h * (U / a), U), L.frac(h * 2, a + b), L.frac(h * (U / b), U), L.frac(f + U / a, U)].filter((v) => v !== "1"), () => { let w = 0; for (let i = 0; i < h; i++) w += U / a + U / b; return L.frac(w, U); },
      `${cap1(tk[2])} = LCM(${a}, ${b}) = ${U} units; together ${U / a + U / b} an hour. In ${h} hour${h > 1 ? "s" : ""}: ${f} units = ${L.frac(f, U)} of it.`,
      `${tk[3]} = ${U} इकाई; मिलकर ${U / a + U / b} प्रति घंटा। ${h} घंटे में: ${f} इकाई = ${L.frac(f, U)} भाग।`);
  },
};
// Full tank: a fill pipe and a drain both open - how long to empty?
const drain = {
  id: "drain", levels: ["easy", "medium", "hard", "advanced"],
  cands: () => cap(pairs2(2, 60).filter(([a, b]) => isInt((a * b) / (b - a)) && (a * b) / (b - a) <= 200), 600),
  build: (t, prm) => {
    const [a, b] = prm; const T = (a * b) / (b - a); const [x, y] = pp(prm); const tk = tank(prm); const U = lcm(a, b);
    return AQ(t, `${tk[0][0].toUpperCase() + tk[0].slice(1)} is full. Pipe ${x} can empty it in ${a} hours and pipe ${y} can fill it in ${b} hours. If both are opened together, in how many hours will it be empty?`,
      `${tk[1]} भरी हुई है। पाइप ${x} उसे ${a} घंटे में खाली कर सकता है और पाइप ${y} उसे ${b} घंटे में भर सकता है। दोनों को एक साथ खोलने पर वह कितने घंटे में खाली होगी?`,
      T, [(a * b) / (a + b), b - a, a + b, T / 2], () => fill(U, () => U / a - U / b),
      `${cap1(tk[2])} = ${U} units. ${x} lets out ${U / a}, ${y} puts in ${U / b}: net ${U / a - U / b} out an hour. Time = ${U} ÷ ${U / a - U / b} = ${N(T)} hours.`,
      `${tk[3]} = ${U} इकाई। ${x} ${U / a} निकालता, ${y} ${U / b} भरता है: शुद्ध ${U / a - U / b} प्रति घंटा निकलता है। समय = ${U} ÷ ${U / a - U / b} = ${N(T)} घंटे।`, "hr");
  },
};
// Three fill, all together.
const threeFill = {
  id: "threeFill", levels: ["easy", "medium"],
  cands: () => cap(cross(range(3, 40), range(3, 40), range(3, 60)).filter(([a, b, c]) => a < b && b < c && isInt(1 / (1 / a + 1 / b + 1 / c)) && c < 6 * a), 300),
  build: (t, prm) => {
    const [a, b, c] = prm; const U = lcmA([a, b, c]); const r = U / a + U / b + U / c; const T = U / r; const [x, y, z] = pp(prm); const tk = tank(prm);
    return AQ(t, `Three pipes ${x}, ${y} and ${z} can fill ${tk[0]} in ${a}, ${b} and ${c} hours respectively. If all three are opened together, in how many hours will ${tk[2]} be full?`,
      `तीन पाइप ${x}, ${y} और ${z} ${tk[1]} को क्रमशः ${a}, ${b} और ${c} घंटे में भर सकते हैं। तीनों एक साथ खोलने पर ${tk[3]} कितने घंटे में भरेगी?`,
      T, [(a + b + c) / 3, a, T * 2, (a * b) / (a + b)], () => fill(U, () => r),
      `${cap1(tk[2])} = LCM(${a}, ${b}, ${c}) = ${U} units. An hour: ${U / a} + ${U / b} + ${U / c} = ${r}. Time = ${U} ÷ ${r} = ${N(T)} hours.`,
      `${tk[3]} = ${U} इकाई। प्रति घंटा: ${U / a} + ${U / b} + ${U / c} = ${r}। समय = ${U} ÷ ${r} = ${N(T)} घंटे।`, "hr");
  },
};
// Outlet opened later: two fill pipes open; the outlet opens after k hours.
const outletLater = {
  id: "outletLater", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(3, 30), range(3, 40), range(4, 60), range(1, 6)).filter(([a, b, c, k]) => { if (!(a < b) || c === a || c === b) return false; const U = lcmA([a, b, c]); const r1 = U / a + U / b, r2 = r1 - U / c; const done = k * r1; return r2 > 0 && done < U && isInt((U - done) / r2); }), 600),
  build: (t, prm) => {
    const [a, b, c, k] = prm; const U = lcmA([a, b, c]); const r1 = U / a + U / b, r2 = r1 - U / c; const done = k * r1; const m = (U - done) / r2; const ans = k + m; const [x, y, z] = pp(prm); const tk = tank(prm);
    return AQ(t, `Pipes ${x} and ${y} can fill ${tk[0]} in ${a} and ${b} hours, and pipe ${z} can empty it in ${c} hours. ${x} and ${y} are opened on an empty ${tk[2].replace("the ", "")}, and ${z} is opened ${hrs(k)} later. In how many hours from the start will it be full?`,
      `पाइप ${x} और ${y} ${tk[1]} को ${a} और ${b} घंटे में भर सकते हैं, और पाइप ${z} उसे ${c} घंटे में खाली कर सकता है। खाली ${tk[3]} में ${x} और ${y} खोले जाते हैं, और ${k} घंटे बाद ${z}। शुरू से कितने घंटे में वह भरेगी?`,
      ans, [m, (a * b) / (a + b), ans + 1, U / r2], () => fill(U, (i) => (i < k ? r1 : r2)),
      `${cap1(tk[2])} = LCM(${a}, ${b}, ${c}) = ${U} units. First ${hrs(k)}: ${k} × ${r1} = ${done}. Then ${r1} − ${U / c} = ${r2} an hour for the remaining ${U - done}: ${m} hours. Total ${k} + ${m} = ${ans} hours.`,
      `${tk[3]} = ${U} इकाई। पहले ${k} घंटे: ${k} × ${r1} = ${done}। फिर ${r1} − ${U / c} = ${r2} प्रति घंटा, शेष ${U - done} के लिए ${m} घंटे। कुल ${k} + ${m} = ${ans} घंटे।`, "hr");
  },
};

// One pipe is closed some hours before the tank is full.
const closedBefore = {
  id: "closedBefore", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(3, 40), range(3, 40), range(1, 8)).filter(([a, b, k]) => { if (a >= b) return false; const U = lcm(a, b); const x = (U + k * (U / a)) / (U / a + U / b); return isInt(x) && x > k + 1; }), 600),
  build: (t, prm) => {
    const [a, b, k] = prm; const U = lcm(a, b); const x = (U + k * (U / a)) / (U / a + U / b); const [p, q] = pp(prm); const tk = tank(prm);
    return AQ(t, `Pipes ${p} and ${q} can fill ${tk[0]} in ${a} and ${b} hours respectively. Both are opened together, but ${p} is closed ${hrs(k)} before ${tk[2]} is full. In how many hours is it full?`,
      `पाइप ${p} और ${q} ${tk[1]} को क्रमशः ${a} और ${b} घंटे में भर सकते हैं। दोनों एक साथ खोले जाते हैं, पर ${tk[3]} भरने से ${k} घंटे पहले ${p} बंद कर दिया जाता है। वह कितने घंटे में भरेगी?`,
      x, [x - k, (a * b) / (a + b), x + 1, x - 1], () => { for (let n = k + 1; n < 1000; n++) if ((n - k) * (U / a) + n * (U / b) >= U) return n; },
      `${cap1(tk[2])} = ${U} units; ${p} ${U / a}, ${q} ${U / b} an hour. If it takes x hours, ${p} runs x − ${k}: ${U / a}(x − ${k}) + ${U / b}x = ${U}, so ${U / a + U / b}x = ${U + k * (U / a)} and x = ${x} hours.`,
      `${tk[3]} = ${U} इकाई; ${p} ${U / a}, ${q} ${U / b} प्रति घंटा। यदि x घंटे लगें, ${p} x − ${k} घंटे चला: ${U / a}(x − ${k}) + ${U / b}x = ${U}, अतः ${U / a + U / b}x = ${U + k * (U / a)} और x = ${x} घंटे।`, "hr");
  },
};
// One pipe fills half, then the other is opened too.
const halfThen = {
  id: "halfThen", levels: ["medium", "hard", "advanced"],
  cands: () => cap(pairs2(3, 120).filter(([a, b]) => isInt(a / 2) && isInt((a * b) / (2 * (a + b)))).flatMap(([a, b]) => [[a, b], [b, a]]).filter(([a]) => isInt(a / 2)), 300),
  build: (t, prm) => {
    const [a, b] = prm; const U = 2 * lcm(a, b); const h1 = a / 2; const h2 = (U / 2) / (U / a + U / b); const ans = h1 + h2; const [p, q] = pp(prm); const tk = tank(prm);
    return AQ(t, `Pipes ${p} and ${q} can fill ${tk[0]} in ${a} and ${b} hours respectively. ${p} alone fills half of it, and then ${q} is opened too. In how many hours in all is ${tk[2]} full?`,
      `पाइप ${p} और ${q} ${tk[1]} को क्रमशः ${a} और ${b} घंटे में भर सकते हैं। पहले ${p} अकेला आधी ${tk[3]} भरता है, फिर ${q} भी खोल दिया जाता है। ${tk[3]} कुल कितने घंटे में भरेगी?`,
      ans, [h1, (a * b) / (a + b), (a + b) / 2, h1 + b / 2], () => fill(U, (i) => (i < h1 ? U / a : U / a + U / b)),
      `Half takes ${p} ${a} ÷ 2 = ${h1} hours. The other half, both together: (${a} × ${b} ÷ (${a} + ${b})) ÷ 2 = ${N(h2)} hours. Total ${h1} + ${N(h2)} = ${N(ans)} hours.`,
      `आधी टंकी में ${p} को ${a} ÷ 2 = ${h1} घंटे। बाकी आधी दोनों मिलकर: (${a} × ${b} ÷ (${a} + ${b})) ÷ 2 = ${N(h2)} घंटे। कुल ${h1} + ${N(h2)} = ${N(ans)} घंटे।`, "hr");
  },
};

// Rates in litres a minute.
const litres = (id, levels, two) => ({
  id, levels,
  cands: () => cap(cross([10, 12, 15, 16, 18, 20, 24, 25, 30, 32, 36, 40, 45, 50, 60], two ? [5, 6, 8, 9, 10, 12, 14, 15, 20] : [0], range(300, 12000, 100)).filter(([x, y, C]) => (!two || y < x) && isInt(C / (x + y)) && C / (x + y) >= 5 && C / (x + y) <= 180), 300),
  build: (t, prm) => {
    const [x, y, C] = prm; const T = C / (x + y); const tk = tank(prm); const [p, q] = pp(prm);
    return AQ(t, two ? `Pipe ${p} lets in ${x} litres a minute and pipe ${q} lets in ${y} litres a minute. How long will both together take to fill ${tk[0]} of ${C} litres?` : `A pipe lets in ${x} litres a minute. How long will it take to fill ${tk[0]} of ${C} litres?`,
      two ? `पाइप ${p} प्रति मिनट ${x} लीटर और पाइप ${q} प्रति मिनट ${y} लीटर पानी भरता है। ${C} लीटर की ${tk[3]} को दोनों मिलकर कितने समय में भरेंगे?` : `एक पाइप प्रति मिनट ${x} लीटर पानी भरता है। ${C} लीटर की ${tk[3]} को भरने में कितना समय लगेगा?`,
      T, two ? [C / x, C / (x - y), T * 2, (C / x + C / y) / 2] : [C / (x / 2), T + 5, T - 5, (C * 2) / x], () => fill(C, () => x + y),
      two ? `Together ${x} + ${y} = ${x + y} litres a minute. Time = ${C} ÷ ${x + y} = ${N(T)} minutes.` : `Time = ${C} ÷ ${x} = ${N(T)} minutes.`,
      two ? `मिलकर ${x} + ${y} = ${x + y} लीटर प्रति मिनट। समय = ${C} ÷ ${x + y} = ${N(T)} मिनट।` : `समय = ${C} ÷ ${x} = ${N(T)} मिनट।`, "min");
  },
});

// A filling pipe and an outlet given in litres a minute; the capacity.
const outletLitres = {
  id: "outletLitres", levels: ["advanced"],
  cands: () => cap(cross(range(2, 20), range(3, 40), range(2, 40)).filter(([a, T, x]) => T > a && isInt((60 * x * a * T) / (T - a)) && (60 * x * a * T) / (T - a) <= 60000), 600),
  build: (t, prm) => {
    const [a, T, x] = prm; const C = (60 * x * a * T) / (T - a); const tk = tank(prm); const [p, q] = pp(prm);
    return AQ(t, `Pipe ${p} can fill ${tk[0]} in ${a} hours. Pipe ${q} lets out ${x} litres a minute. With both open, ${tk[2]} fills in ${T} hours. What is its capacity?`,
      `पाइप ${p} ${tk[1]} को ${a} घंटे में भर सकता है। पाइप ${q} प्रति मिनट ${x} लीटर निकालता है। दोनों खुले रहने पर ${tk[3]} ${T} घंटे में भरती है। उसकी क्षमता कितनी है?`,
      C, [60 * x * T, 60 * x * a, (60 * x * a * T) / (T + a), C / 2], () => { for (let c = 1; c <= 100000; c++) if (c * (T - a) === 60 * x * a * T) return c; return 0; },
      `In an hour ${p} puts in C/${a} and ${q} takes out ${x} × 60 = ${60 * x} litres; together C/${T}. So C/${a} − C/${T} = ${60 * x}, i.e. C × ${T - a}/${a * T} = ${60 * x} and C = ${60 * x} × ${a * T} ÷ ${T - a} = ${C} litres.`,
      `एक घंटे में ${p} C/${a} भरता है और ${q} ${x} × 60 = ${60 * x} लीटर निकालता है; मिलकर C/${T}। अतः C/${a} − C/${T} = ${60 * x}, यानी C = ${60 * x} × ${a * T} ÷ ${T - a} = ${C} लीटर।`, "lt");
  },
};

const KINDS = guard([
  together("fill2E", ["easy"], 2, 48, "hr"), together("fill2M", ["medium", "hard"], 6, 90, "min"),
  fillEmpty("fillEmptyE", ["easy", "medium"], 2, 40, "hr"), fillEmpty("fillEmptyH", ["hard", "advanced"], 6, 90, "min"), fillEmpty("fillEmptyA", ["advanced"], 20, 240, "min", 600),
  leak, alone, twoOne("twoOneM", ["medium", "hard"]), twoOne("twoOneA", ["advanced"], 600, true), outletLitres,
  closedAfter, openedLater, atTimes, altHours, capacity, kTimes, partFull, drain, threeFill, outletLater, closedBefore, halfThen, litres("litres1", ["easy"], false), litres("litres2", ["easy", "medium"], true),
]);

const PREFIX = "Time & Work · Pipes and Cisterns";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
