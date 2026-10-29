// HCF & LCM · HCF and LCM Word Problems: bells, lights, buses and runners
// coming together (LCM), sharing out, measuring, tiling and cutting with
// nothing left over (HCF), and the counts that follow (how many tiles,
// tins, pieces, rows, rooms, cubes). Sizes are real sizes: rooms 3-15 m,
// steps 30-90 cm, bells every few seconds or minutes. gen.js fills the
// tests; every answer is worked out again in `v` by a different route
// (walking the clock / trying every size); the wrong options are the slips
// students make (HCF for LCM, the size for the count, one item left out).
const L = require("./hl-lib");
const { N, gcd, lcm, gcdA, lcmA, hcfSlow, lcmSlow, divisors, factor, pf, isPrime, range, cap, pick, AQ, SQ, clock, guard, cross, andE, andH } = L;
const { fillTopic } = require("./gen");

const inc = (xs) => xs.every((v, i) => i === 0 || v > xs[i - 1]);
// k numbers from a pool, none dividing another, LCM in [minL, maxL].
const sets = (pool, k, maxL, minL = 0) => cross(...Array(k).fill(pool)).filter((xs) => inc(xs) && xs.every((v, i) => xs.every((w, j) => i === j || w % v !== 0)) && lcmA(xs) <= maxL && lcmA(xs) >= minL);
// k numbers sharing exactly the HCF g (the multipliers have HCF 1, two of them more).
const shared = (gs, xs, k, lo, hi) => cross(gs, ...Array(k).fill(xs)).filter(([g, ...m]) => inc(m) && gcdA(m) === 1 && (k === 2 || gcd(m[0], m[1]) > 1) && g * m[0] >= lo && g * m[k - 1] <= hi);
const sumOf = (xs) => xs.reduce((a, b) => a + b, 0);
const NUM = { 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six" };
const NUMH = { 2: "दो", 3: "तीन", 4: "चार", 5: "पाँच", 6: "छह" };
const lcmLine = (xs) => `LCM(${xs.join(", ")}) = ${lcmA(xs)}`;
const hcfLine = (xs) => `HCF(${xs.join(", ")}) = ${gcdA(xs)}`;
const minsec = (s) => (s % 60 === 0 ? `${s / 60} minutes` : s > 60 ? `${Math.floor(s / 60)} minutes ${s % 60} seconds` : `${s} seconds`);
const minsecH = (s) => (s % 60 === 0 ? `${s / 60} मिनट` : s > 60 ? `${Math.floor(s / 60)} मिनट ${s % 60} सेकंड` : `${s} सेकंड`);
const mcm = (c) => (c % 100 === 0 ? `${c / 100} m` : c > 100 ? `${Math.floor(c / 100)} m ${c % 100} cm` : `${c} cm`);

// ------------------------------------------------------------ TOGETHER AGAIN (LCM)
// Bells (or lights) every a, b, c units: after how long together again?
const bells = (id, levels, k, pool, unit, maxL, minL, max = 400) => ({
  id, levels,
  cands: () => cap(sets(pool, k, maxL, minL), max),
  build: (t, prm) => {
    const xs = prm; const Lc = lcmA(xs); const u = unit === "min" ? "minutes" : "seconds"; const uh = unit === "min" ? "मिनट" : "सेकंड";
    const thing = pick([["bells ring", "घंटियाँ", "बजती हैं", "बजेंगी", "बजीं"], ["lights flash", "बत्तियाँ", "चमकती हैं", "चमकेंगी", "चमकीं"]], prm);
    return AQ(t, `${NUM[k]} ${thing[0]} at intervals of ${andE(xs)} ${u} respectively. If they ${thing[0].split(" ")[1]} together now, after how many ${u} will they next ${thing[0].split(" ")[1]} together?`,
      `${NUMH[k]} ${thing[1]} क्रमशः ${andH(xs)} ${uh} के अंतराल पर ${thing[2]}। यदि वे अभी एक साथ ${thing[2]}, तो कितने ${uh} बाद वे फिर एक साथ ${thing[3]}?`,
      Lc, [gcdA(xs) > 1 ? gcdA(xs) : sumOf(xs), lcmA(xs.slice(0, -1)) === Lc ? Lc * 2 : lcmA(xs.slice(0, -1)), Lc * 2, xs.reduce((a, b) => a * b, 1)], () => lcmSlow(xs),
      `They are together again after a time that is a multiple of every interval - the least is the LCM. ${xs.map((v) => `${v} = ${pf(v)}`).join(", ")}, so ${lcmLine(xs)} ${u}.`,
      `वे फिर उस समय साथ होंगी जो हर अंतराल का गुणज हो - सबसे कम LCM है। ${xs.map((v) => `${v} = ${pf(v)}`).join(", ")}, अतः ${lcmLine(xs)} ${uh}।`, unit);
  },
});

// ... at a clock time.
const clockTimes = (start, Lc, slipsL, withSec) => [clock(start + Lc, withSec), ...slipsL.filter((d) => d > 0 && d !== Lc).map((d) => clock(start + d, withSec))];
const atClock = (id, levels, k, pool, unit, maxL, minL, ctx, max = 400) => ({
  id, levels,
  cands: () => cap(cross(sets(pool, k, maxL, minL), [6, 7, 8, 9, 10, 11, 13, 14, 15, 16], [0, 15, 30, 45]).filter(() => true), max),
  build: (t, prm) => {
    const [xs, h, m] = prm; const Lc = lcmA(xs); const sec = unit === "sec"; const d = sec ? Lc : Lc * 60; const start = h * 3600 + m * 60;
    const slips = [lcmA(xs.slice(0, -1)), lcmA(xs.slice(1)), sumOf(xs), Lc * 2, Lc / 2, xs.reduce((a, b) => a * b, 1), lcmA([xs[0], xs[xs.length - 1]])].filter((v) => v >= Math.max(...xs) && v <= Lc * 3).map((v) => (sec ? v : v * 60)).filter((v) => Number.isInteger(v) && v < 86400 - start);
    const opts = clockTimes(start, d, slips, sec).filter((v, i, a) => a.indexOf(v) === i);
    const T0 = clock(start, sec);
    const C = ctx === "bus"
      ? [`Buses on ${NUM[k].toLowerCase()} routes leave a depot every ${andE(xs)} ${sec ? "seconds" : "minutes"} respectively. If buses on all ${NUM[k].toLowerCase()} routes leave together at ${T0}, at what time will they next leave together?`,
        `एक डिपो से ${NUMH[k]} मार्गों की बसें क्रमशः हर ${andH(xs)} ${sec ? "सेकंड" : "मिनट"} पर चलती हैं। यदि ${T0} पर सभी मार्गों की बसें एक साथ चलीं, तो अगली बार वे एक साथ कब चलेंगी?`]
      : ctx === "light"
        ? [`The traffic lights at ${NUM[k].toLowerCase()} crossings change every ${andE(xs)} seconds respectively. If they all change together at ${T0}, at what time will they next change together?`,
          `${NUMH[k]} चौराहों की ट्रैफिक लाइटें क्रमशः हर ${andH(xs)} सेकंड पर बदलती हैं। यदि वे सब ${T0} पर एक साथ बदलीं, तो अगली बार वे एक साथ कब बदलेंगी?`]
        : [`${NUM[k]} bells ring at intervals of ${andE(xs)} ${sec ? "seconds" : "minutes"} respectively. If they ring together at ${T0}, at what time will they next ring together?`,
          `${NUMH[k]} घंटियाँ क्रमशः ${andH(xs)} ${sec ? "सेकंड" : "मिनट"} के अंतराल पर बजती हैं। यदि वे ${T0} पर एक साथ बजीं, तो अगली बार वे एक साथ कब बजेंगी?`];
    return SQ(t, C[0], C[1], opts[0], opts.slice(1), () => { let s = start + 1; while (!xs.every((v) => (s - start) % (sec ? v : v * 60) === 0)) s++; return clock(s, sec); },
      `${lcmLine(xs)} ${sec ? `seconds = ${minsec(Lc)}` : `minutes${Lc >= 60 ? ` = ${minsec(Lc * 60)}` : ""}`}. ${T0} + ${sec ? minsec(Lc) : minsec(Lc * 60)} = ${opts[0]}.`,
      `${lcmLine(xs)} ${sec ? `सेकंड = ${minsecH(Lc)}` : `मिनट${Lc >= 60 ? ` = ${minsecH(Lc * 60)}` : ""}`}। ${T0} + ${sec ? minsecH(Lc) : minsecH(Lc * 60)} = ${opts[0]}।`);
  },
});

// How many times together in a span (counting the start).
const count = (id, levels, k, pool, maxL, minL, hours, withStart, max = 400) => ({
  id, levels,
  cands: () => cap(cross(sets(pool, k, maxL, minL), hours).filter(([xs, H]) => (H * 3600) % lcmA(xs) === 0 && (H * 3600) / lcmA(xs) <= 200), max),
  build: (t, prm) => {
    const [xs, H] = prm; const Lc = lcmA(xs); const span = H * 3600; const n = span / Lc; const ans = withStart ? n + 1 : n;
    const hrs = H === 1 ? "1 hour" : `${H} hours`; const hrsH = `${H} घंटे`;
    return AQ(t, `${NUM[k]} bells start ringing together and ring at intervals of ${andE(xs)} seconds respectively. How many times will they ring together in ${hrs}${withStart ? ", counting the time they start" : ", not counting the time they start"}?`,
      `${NUMH[k]} घंटियाँ एक साथ बजना शुरू करती हैं और क्रमशः ${andH(xs)} सेकंड के अंतराल पर बजती हैं। ${hrsH} में वे कितनी बार एक साथ बजेंगी (${withStart ? "आरंभ वाली बार सहित" : "आरंभ वाली बार को छोड़कर"})?`,
      ans, [withStart ? n : n + 1, withStart ? n + 2 : n - 1, span / lcmA(xs.slice(0, -1)) + (withStart ? 1 : 0), 2 * ans], () => { let c = 0; for (let s = withStart ? 0 : 1; s <= span; s++) if (xs.every((v) => s % v === 0)) c++; return c; },
      `${lcmLine(xs)} seconds, so they ring together every ${minsec(Lc)}. In ${hrs} = ${span} seconds that is ${span} ÷ ${Lc} = ${n} times after the start${withStart ? `, and 1 more at the start: ${ans}` : `: ${ans}`}.`,
      `${lcmLine(xs)} सेकंड, अतः वे हर ${minsecH(Lc)} पर साथ बजती हैं। ${hrsH} = ${span} सेकंड में आरंभ के बाद ${span} ÷ ${Lc} = ${n} बार${withStart ? `, और 1 बार आरंभ में: ${ans}` : `: ${ans}`}।`, "times");
  },
});

// Runners: lap times given, or a track and speeds.
const laps = (id, levels, k, pool, maxL, minL, max = 400) => ({
  id, levels,
  cands: () => cap(sets(pool, k, maxL, minL), max),
  build: (t, prm) => {
    const xs = prm; const Lc = lcmA(xs);
    return AQ(t, `${NUM[k]} runners go round a circular track in ${andE(xs)} seconds respectively. If they start together from the same point, after how many seconds will they all be at the starting point together again?`,
      `${NUMH[k]} धावक एक वृत्ताकार पथ का एक चक्कर क्रमशः ${andH(xs)} सेकंड में लगाते हैं। यदि वे एक ही बिंदु से एक साथ दौड़ना शुरू करें, तो कितने सेकंड बाद वे सब फिर आरंभ-बिंदु पर एक साथ होंगे?`,
      Lc, [gcdA(xs) > 1 ? gcdA(xs) : sumOf(xs), Lc * 2, lcmA(xs.slice(0, -1)) === Lc ? sumOf(xs) * 2 : lcmA(xs.slice(0, -1)), xs.reduce((a, b) => a * b, 1)], () => lcmSlow(xs),
      `Each is back at the start after a whole number of rounds, i.e. at a multiple of his round time; all together first at ${lcmLine(xs)} seconds (${minsec(Lc)}).`,
      `हर धावक पूरे चक्करों के बाद, यानी अपने चक्कर-समय के गुणज पर, आरंभ-बिंदु पर होता है; सब एक साथ पहली बार ${lcmLine(xs)} सेकंड (${minsecH(Lc)}) पर।`, "sec");
  },
});
const speeds = (id, levels, k, km, max = 400) => ({
  id, levels,
  cands: () => cap(cross(km ? [3, 4, 5, 6, 8, 9, 10, 12, 15] : [200, 240, 300, 360, 400, 480, 600, 720, 800, 900, 1000, 1200], ...Array(k).fill(km ? [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20] : [2, 3, 4, 5, 6, 8, 9, 10])).filter(([D, ...s]) => inc(s) && s.every((v) => ((km ? 60 : 1) * D) % v === 0)).filter(([D, ...s]) => { const ts = s.map((v) => ((km ? 60 : 1) * D) / v); return lcmA(ts) > Math.max(...ts) && lcmA(ts) <= (km ? 600 : 3600); }), max),
  build: (t, prm) => {
    const [D, ...s] = prm; const f = km ? 60 : 1; const ts = s.map((v) => (f * D) / v); const Lc = lcmA(ts);
    const u = km ? "km/h" : "m/s"; const len = km ? `${D} km` : `${D} m`; const tu = km ? "minutes" : "seconds"; const tuh = km ? "मिनट" : "सेकंड";
    return AQ(t, `${NUM[k]} cyclists ride round a circular track ${len} long at ${andE(s)} ${u} respectively. If they start together from the same point, after how many ${tu} will they all be at the starting point together again?`,
      `${NUMH[k]} साइकिल सवार ${len} लंबे वृत्ताकार पथ पर क्रमशः ${andH(s)} ${u} की चाल से चलते हैं। यदि वे एक ही बिंदु से एक साथ चलें, तो कितने ${tuh} बाद वे सब फिर आरंभ-बिंदु पर एक साथ होंगे?`,
      Lc, [Math.max(...ts), ts.reduce((a, b) => a * b, 1) / gcdA(ts), (f * D) / gcdA(s), Lc * 2].filter((v) => v !== Lc), () => { for (let m = 1; ; m++) if (s.every((v) => (v * m) % (f * D) === 0)) return m; },
      `Time for one round = length ÷ speed: ${s.map((v, i) => `${km ? `${D} × 60` : D} ÷ ${v} = ${ts[i]}`).join(", ")} ${tu}. All are back at the start together first at ${lcmLine(ts)} ${tu}.`,
      `एक चक्कर का समय = लंबाई ÷ चाल: ${s.map((v, i) => `${km ? `${D} × 60` : D} ÷ ${v} = ${ts[i]}`).join(", ")} ${tuh}। सब एक साथ पहली बार ${lcmLine(ts)} ${tuh} पर आरंभ-बिंदु पर होंगे।`, km ? "min" : "sec");
  },
});

// Three friends visit every a, b, c days.
const visits = (id, levels, pool, maxL, max = 300) => ({
  id, levels,
  cands: () => cap(sets(pool, 3, maxL, 12), max),
  build: (t, prm) => {
    const xs = prm; const Lc = lcmA(xs); const place = pick([["library", "पुस्तकालय"], ["gym", "जिम"], ["temple", "मंदिर"], ["market", "बाज़ार"]], prm);
    return AQ(t, `Three friends visit the ${place[0]} every ${andE(xs)} days respectively. They all visited it today. After how many days will they next visit it on the same day?`,
      `तीन मित्र क्रमशः हर ${andH(xs)} दिन पर ${place[1]} जाते हैं। आज तीनों वहाँ गए। कितने दिन बाद वे फिर एक ही दिन वहाँ जाएँगे?`,
      Lc, [sumOf(xs), gcdA(xs) > 1 ? gcdA(xs) : Lc * 2, xs.reduce((a, b) => a * b, 1), lcmA(xs.slice(0, -1)) === Lc ? Lc + xs[0] : lcmA(xs.slice(0, -1))], () => lcmSlow(xs),
      `They meet on a day that is a multiple of each gap; the first such day is ${lcmLine(xs)} days from today.`,
      `वे उस दिन मिलेंगे जो हर अंतराल का गुणज हो; ऐसा पहला दिन आज से ${lcmLine(xs)} दिन बाद है।`, "day");
  },
});

// Least number of students in rows of a, b or c (and a square).
const rows = (id, levels, pool, maxL, square, max = 300) => ({
  id, levels,
  cands: () => cap(sets(pool, 3, maxL, 30).filter((xs) => { if (!square) return true; const Lc = lcmA(xs); const m = factor(Lc).filter(([, e]) => e % 2).reduce((a, [p]) => a * p, 1); return m > 1 && Lc * m <= 20000; }), max),
  build: (t, prm) => {
    const xs = prm; const Lc = lcmA(xs); const odd = factor(Lc).filter(([, e]) => e % 2).map(([p]) => p); const m = odd.reduce((a, b) => a * b, 1); const ans = square ? Lc * m : Lc;
    const q = square
      ? `What is the least number of soldiers that can stand in rows of ${andE(xs)} with none left over, and can also stand in a square (as many rows as in each row)?`
      : `What is the least number of students who can stand in rows of ${andE(xs)} each, with no one left over whichever row size is used?`;
    const qh = square
      ? `सैनिकों की वह न्यूनतम संख्या क्या है जो ${andH(xs)} की पंक्तियों में बिना किसी के बचे खड़े हो सकें और एक वर्ग के रूप में भी (जितनी पंक्तियाँ, उतने ही प्रत्येक पंक्ति में) खड़े हो सकें?`
      : `विद्यार्थियों की वह न्यूनतम संख्या क्या है जिन्हें ${andH(xs)} की पंक्तियों में खड़ा किया जा सके, चाहे कोई भी पंक्ति-आकार लें, कोई न बचे?`;
    return AQ(t, q, qh, ans, square ? [Lc, ans * 4, Lc * 2, ans / odd[0] * (odd[0] === 2 ? 3 : 2)] : [sumOf(xs), Lc * 2, xs.reduce((a, b) => a * b, 1), gcdA(xs) > 1 ? gcdA(xs) : Lc / 2],
      () => { for (let s = 1; ; s++) { const v = square ? s * s : s; if (xs.every((d) => v % d === 0)) return v; } },
      square
        ? `The number must be a multiple of ${lcmLine(xs)} = ${pf(Lc)} and a perfect square, so every power must be even: ${Lc} × ${odd.join(" × ")} = ${ans} = ${Math.sqrt(ans)} × ${Math.sqrt(ans)}.`
        : `The number must divide exactly by each row size: the least is ${lcmLine(xs)}.`,
      square
        ? `संख्या ${lcmLine(xs)} = ${pf(Lc)} की गुणज और पूर्ण वर्ग होनी चाहिए, अतः हर घात सम हो: ${Lc} × ${odd.join(" × ")} = ${ans} = ${Math.sqrt(ans)} × ${Math.sqrt(ans)}।`
        : `संख्या हर पंक्ति-आकार से पूरी विभाज्य हो: सबसे छोटी ${lcmLine(xs)}।`);
  },
});

// Least length measured exactly by rods / covered in whole steps.
const measureLcm = (id, levels, pool, maxL, ctx, max = 300) => ({
  id, levels,
  cands: () => cap(sets(pool, 3, maxL, 60), max),
  build: (t, prm) => {
    const xs = prm; const Lc = lcmA(xs);
    const C = ctx === "steps"
      ? [`Three people walk with steps of ${andE(xs.map((v) => `${v} cm`))} respectively. What is the least distance each of them can cover in a whole number of steps?`,
        `तीन व्यक्तियों के एक कदम की लंबाई क्रमशः ${andH(xs.map((v) => `${v} cm`))} है। वह न्यूनतम दूरी कितनी है जिसे उनमें से प्रत्येक पूरे-पूरे कदमों में तय कर सके?`]
      : [`What is the least length of cloth that can be measured exactly by any of three rods of ${andE(xs.map((v) => `${v} cm`))}?`,
        `कपड़े की वह न्यूनतम लंबाई क्या है जिसे ${andH(xs.map((v) => `${v} cm`))} की तीन छड़ों में से किसी से भी पूरा-पूरा मापा जा सके?`];
    return AQ(t, C[0], C[1], Lc, [gcdA(xs) > 1 ? gcdA(xs) : sumOf(xs), Lc * 2, xs.reduce((a, b) => a * b, 1), lcmA(xs.slice(0, -1)) === Lc ? sumOf(xs) * 3 : lcmA(xs.slice(0, -1))], () => lcmSlow(xs),
      `The length must be a whole number of each: the least is ${lcmLine(xs)} cm${Lc >= 100 ? ` (${mcm(Lc)})` : ""}.`,
      `लंबाई हर एक की पूरी गुणज हो: सबसे कम ${lcmLine(xs)} cm${Lc >= 100 ? ` (${mcm(Lc)})` : ""}।`, "cm");
  },
});

// Sweets left over: LCM + r (at least one box filled), or also divisible by p.
const leftOver = (id, levels, pool, maxL, withP, max = 300) => ({
  id, levels,
  cands: () => cap(cross(sets(pool, 3, maxL, 24), range(1, 5), withP ? [7, 11, 13] : [0]).filter(([xs, r, p]) => r < Math.min(...xs) && (!p || (gcd(lcmA(xs), p) === 1 && xs.every((v) => v % p !== 0)))).filter(([xs, r, p]) => { if (!p) return true; let k = 1; while ((lcmA(xs) * k + r) % p) k++; return k >= 2 && k <= 12; }), max),
  build: (t, prm) => {
    const [xs, r, p] = prm; const Lc = lcmA(xs); let k = 1; if (p) while ((Lc * k + r) % p) k++; const ans = Lc * k + r;
    if (!p) {
      return AQ(t, `A sweet seller packs his laddoos in boxes of ${andE(xs)}. Whichever box size he uses, at least one box is filled and ${r} laddoo${r > 1 ? "s are" : " is"} left over. What is the least number of laddoos he can have?`,
        `एक मिठाई वाला अपने लड्डू ${andH(xs)} के डिब्बों में पैक करता है। वह कोई भी डिब्बा-आकार ले, कम से कम एक डिब्बा भरता है और ${r} लड्डू बच जाते हैं। उसके पास कम से कम कितने लड्डू हैं?`,
        ans, [Lc, Lc - r, 2 * Lc + r, Lc + 2 * r], () => { for (let m = Math.min(...xs) + r; ; m++) if (xs.every((v) => m % v === r)) return m; },
        `Leaving ${r} each time means (the number − ${r}) divides by each box size; with a box filled it is not 0, so it is at least ${lcmLine(xs)}. Least number = ${Lc} + ${r} = ${ans}.`,
        `हर बार ${r} बचने का अर्थ है (संख्या − ${r}) हर डिब्बा-आकार से विभाज्य है; एक डिब्बा भरा है तो यह 0 नहीं, अतः कम से कम ${lcmLine(xs)}। न्यूनतम संख्या = ${Lc} + ${r} = ${ans}।`);
    }
    const tried = range(1, k).map((j) => Lc * j + r);
    return AQ(t, `When the eggs in a basket are counted in ${andE(xs.map((v) => `${v}s`))}, ${r} ${r > 1 ? "are" : "is"} left over each time, but when they are counted in ${p}s none is left over. What is the least number of eggs in the basket?`,
      `एक टोकरी के अंडों को ${andH(xs)} के समूहों में गिनने पर हर बार ${r} बचते हैं, पर ${p} के समूहों में गिनने पर कोई नहीं बचता। टोकरी में कम से कम कितने अंडे हैं?`,
      ans, [Lc + r, ans + Lc, Lc * k, Lc * p + r], () => { for (let m = r + 1; ; m++) if (xs.every((v) => m % v === r) && m % p === 0) return m; },
      `The number is ${Lc}k + ${r} (${lcmLine(xs)}). Try k = 1, 2, ...: ${tried.map((v) => `${v} ÷ ${p} ${v % p ? `leaves ${v % p}` : "is exact"}`).join("; ")}. Least = ${ans}.`,
      `संख्या = ${Lc}k + ${r} (${lcmLine(xs)})। k = 1, 2, ... रखें: ${tried.map((v) => `${v} ÷ ${p} ${v % p ? `शेष ${v % p}` : "पूरा"}`).join("; ")}। न्यूनतम = ${ans}।`);
  },
});

// Bricks a × b × c stacked into the smallest solid cube.
const brickCube = {
  id: "brickCube", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(4, 30), range(4, 30), range(4, 30)).filter(([a, b, c]) => a > b && b > c && lcmA([a, b, c]) <= 120 && lcmA([a, b, c]) > a && lcmA([a, b, c]) ** 3 / (a * b * c) <= 2000), 300),
  build: (t, prm) => {
    const [a, b, c] = prm; const s = lcmA([a, b, c]); const n = s ** 3 / (a * b * c);
    return AQ(t, `Bricks measuring ${a} cm × ${b} cm × ${c} cm are stacked to make a solid cube. What is the least number of bricks needed?`, `${a} cm × ${b} cm × ${c} cm माप की ईंटों को जमाकर एक ठोस घन बनाना है। कम से कम कितनी ईंटें चाहिए?`,
      n, [s, (s / a) * (s / b), n * 8, (s * s * s) / (a * b)], () => { for (let x = a; ; x++) if ([a, b, c].every((v) => x % v === 0)) return (x / a) * (x / b) * (x / c); },
      `The side of the cube must be a multiple of each edge: the least is ${lcmLine([a, b, c])} cm. Bricks = (${s} ÷ ${a}) × (${s} ÷ ${b}) × (${s} ÷ ${c}) = ${s / a} × ${s / b} × ${s / c} = ${n}.`,
      `घन की भुजा हर किनारे की गुणज हो: सबसे कम ${lcmLine([a, b, c])} cm। ईंटें = (${s} ÷ ${a}) × (${s} ÷ ${b}) × (${s} ÷ ${c}) = ${s / a} × ${s / b} × ${s / c} = ${n}।`);
  },
};
// Gears with a and b teeth: turns of the first before the marked teeth meet again.
const gears = {
  id: "gears", levels: ["advanced"],
  cands: () => cap(cross(range(12, 90), range(12, 90)).filter(([a, b]) => a < b && gcd(a, b) > 1 && gcd(a, b) < a && b % a !== 0), 300),
  build: (t, prm) => {
    const [a, b] = prm; const Lc = lcm(a, b); const n = Lc / a;
    return AQ(t, `Two gear wheels with ${a} and ${b} teeth turn together. A marked tooth of each is touching now. After how many complete turns of the smaller wheel will the two marked teeth touch again?`,
      `${a} और ${b} दाँतों वाले दो गियर पहिये साथ घूमते हैं। दोनों का एक-एक निशान लगा दाँत अभी आपस में मिला है। छोटे पहिये के कितने पूरे चक्करों के बाद दोनों निशान लगे दाँत फिर मिलेंगे?`,
      n, [Lc / b, Lc, b / gcd(a, b) + a / gcd(a, b), n * 2], () => { for (let k = 1; ; k++) if ((k * a) % b === 0) return k; },
      `They meet again when the number of teeth passed is a multiple of both ${a} and ${b}: ${lcmLine([a, b])} teeth. The smaller wheel then makes ${Lc} ÷ ${a} = ${n} turns.`,
      `वे फिर तब मिलेंगे जब गुज़रे दाँतों की संख्या ${a} और ${b} दोनों की गुणज हो: ${lcmLine([a, b])} दाँत। तब छोटा पहिया ${Lc} ÷ ${a} = ${n} चक्कर लगाता है।`, "times");
  },
};

// ------------------------------------------------------------ SHARING / MEASURING (HCF)
const ITEMS = [["pens", "पेन"], ["pencils", "पेंसिलें"], ["erasers", "रबड़"], ["notebooks", "कॉपियाँ"], ["bananas", "केले"], ["apples", "सेब"]];
const share = (id, levels, k, gs, xs, lo, hi, ask, max = 400) => ({
  id, levels,
  cands: () => cap(shared(gs, xs, k, lo, hi).filter(([g]) => g >= 4), max),
  build: (t, prm) => {
    const [g, ...m] = prm; const v = m.map((x) => x * g); const off = (prm[1] * 7 + prm[0]) % 4; const it = Array.from({ length: k }, (_, i) => ITEMS[(off + i) % ITEMS.length]);
    const list = v.map((x, i) => `${x} ${it[i][0]}`); const listH = v.map((x, i) => `${x} ${it[i][1]}`);
    const lastE = it[k - 1][0], lastH = it[k - 1][1];
    const base = `${andE(list)} are to be shared among the greatest possible number of children so that each child gets the same number of each item, with nothing left over.`;
    const baseH = `${andH(listH)} को अधिक से अधिक बच्चों में इस प्रकार बाँटना है कि हर बच्चे को हर वस्तु समान संख्या में मिले और कुछ न बचे।`;
    if (ask === "each") {
      return AQ(t, `${base} How many ${lastE} does each child get?`, `${baseH} हर बच्चे को कितने ${lastH} मिलेंगे?`,
        m[k - 1], [g, sumOf(m), m[0], m[k - 1] * 2], () => { const n = hcfSlow(v); return v[k - 1] / n; },
        `The number of children is the HCF: ${hcfLine(v)}. Each child gets ${v[k - 1]} ÷ ${g} = ${m[k - 1]} ${lastE}.`,
        `बच्चों की संख्या HCF है: ${hcfLine(v)}। हर बच्चे को ${v[k - 1]} ÷ ${g} = ${m[k - 1]} ${lastH} मिलेंगे।`);
    }
    return AQ(t, `${base} How many children can there be at most?`, `${baseH} अधिक से अधिक कितने बच्चे हो सकते हैं?`,
      g, [gcd(v[0], v[1]) === g ? g * 2 : gcd(v[0], v[1]), lcmA(v) <= 99999 ? lcmA(v) : g * 3, g / factor(g)[0][0], sumOf(m)], () => hcfSlow(v),
      `Each item must split equally, so the number of children divides every count; the greatest is ${hcfLine(v)}.`,
      `हर वस्तु बराबर बँटे, अतः बच्चों की संख्या हर गिनती को विभाजित करे; सबसे बड़ी ${hcfLine(v)}।`);
  },
});

// Largest vessel / length that measures each exactly; least number of tins / pieces.
const LIQ = [["milk", "दूध"], ["oil", "तेल"], ["juice", "जूस"], ["water", "पानी"]];
const LIQ_KINDS = [["oil", "तेल"], ["juice", "जूस"], ["milk", "दूध"]];
const measure = (id, levels, k, gs, xs, lo, hi, ctx, ask, max = 400) => ({
  id, levels,
  cands: () => cap(shared(gs, xs, k, lo, hi).filter(([g]) => g >= 3), max),
  build: (t, prm) => {
    const [g, ...m] = prm; const v = m.map((x) => x * g); const n = sumOf(m);
    const liq = pick(ask === "tins" ? LIQ_KINDS : LIQ, prm); const cm = ctx === "rope" && ask !== "m"; const asMcm = ctx === "rope" && ask === "mcm";
    const show = (x) => (ctx === "rope" ? (asMcm ? mcm(x) : `${x} ${ask === "m" ? "m" : "cm"}`) : `${x} litres`);
    const showH = (x) => (ctx === "rope" ? (asMcm ? mcm(x) : `${x} ${ask === "m" ? "m" : "cm"}`) : `${x} लीटर`);
    let q, qh, ans, slips, unit, s, sh;
    if (ctx === "liquid") {
      const ctr = `${NUMH[k]} बर्तनों में क्रमशः ${andH(v.map(showH))} ${liq[1]} है।`;
      if (ask === "size") {
        q = `${NUM[k]} containers hold ${andE(v.map(show))} of ${liq[0]} respectively. What is the largest measuring jar that can measure the ${liq[0]} of each container exactly?`;
        qh = `${ctr} वह सबसे बड़ा मापक बर्तन कितने लीटर का है जिससे हर बर्तन का ${liq[1]} पूरा-पूरा मापा जा सके?`;
        ans = g; slips = [gcd(v[0], v[1]) === g ? g * 2 : gcd(v[0], v[1]), g / factor(g)[0][0], n, lcmA(v) <= 999999 ? lcmA(v) : g * 3]; unit = "lt";
        s = `The jar must divide every quantity exactly; the largest is ${hcfLine(v)} litres.`; sh = `मापक हर मात्रा को पूरा विभाजित करे; सबसे बड़ा ${hcfLine(v)} लीटर।`;
      } else {
        q = `A shopkeeper has ${andE(v.map(show))} of ${k === 2 ? "two" : "three"} kinds of ${liq[0]}. He fills them, without mixing, into tins of one size so that every tin is full. What is the least number of tins he needs?`;
        qh = `एक दुकानदार के पास ${NUMH[k]} प्रकार का ${liq[1]} क्रमशः ${andH(v.map(showH))} है। वह इन्हें बिना मिलाए एक ही आकार के डिब्बों में भरता है ताकि हर डिब्बा पूरा भरा हो। उसे कम से कम कितने डिब्बे चाहिए?`;
        ans = n; slips = [g, n + 1, sumOf(v) / (g / factor(g)[0][0]), n - 1]; unit = "none";
        s = `Fewest tins means the biggest tin: ${hcfLine(v)} litres. Tins = ${v.map((x) => `${x} ÷ ${g}`).join(" + ")} = ${m.join(" + ")} = ${n}.`;
        sh = `कम से कम डिब्बे यानी सबसे बड़ा डिब्बा: ${hcfLine(v)} लीटर। डिब्बे = ${v.map((x) => `${x} ÷ ${g}`).join(" + ")} = ${m.join(" + ")} = ${n}।`;
      }
    } else {
      const what = pick([["ropes", "रस्सियों"], ["wires", "तारों"], ["rods", "छड़ों"]], prm);
      const head = `${NUM[k]} ${what[0]} are ${andE(v.map(show))} long. They are to be cut into pieces all of the same length, with nothing left over.`;
      const headH = `${NUMH[k]} ${what[1]} की लंबाई क्रमशः ${andH(v.map(showH))} है। इन्हें बिना कुछ बचे एक ही लंबाई के टुकड़ों में काटना है।`;
      const u = ask === "m" ? "m" : "cm";
      if (ask === "count" || ask === "mcm") {
        q = `${head} What is the least number of pieces?`; qh = `${headH} कम से कम कितने टुकड़े होंगे?`;
        ans = n; slips = [g, n + 1, n - 1, sumOf(v) / (g / factor(g)[0][0])]; unit = "none";
        s = `Fewest pieces means the longest piece: ${asMcm ? `in cm the lengths are ${v.join(", ")}; ` : ""}${hcfLine(v)} ${u}. Pieces = ${v.map((x) => `${x} ÷ ${g}`).join(" + ")} = ${m.join(" + ")} = ${n}.`;
        sh = `कम से कम टुकड़े यानी सबसे लंबा टुकड़ा: ${asMcm ? `cm में लंबाइयाँ ${v.join(", ")}; ` : ""}${hcfLine(v)} ${u}। टुकड़े = ${v.map((x) => `${x} ÷ ${g}`).join(" + ")} = ${m.join(" + ")} = ${n}।`;
      } else {
        q = `${head} What is the greatest possible length of each piece?`; qh = `${headH} हर टुकड़े की अधिकतम लंबाई कितनी हो सकती है?`;
        ans = g; slips = [gcd(v[0], v[1]) === g ? g * 2 : gcd(v[0], v[1]), g / factor(g)[0][0], n, Math.min(...v) - g]; unit = u === "m" ? "m" : "cm";
        s = `The piece must divide every length exactly; the longest is ${hcfLine(v)} ${u}.`; sh = `टुकड़ा हर लंबाई को पूरा विभाजित करे; सबसे लंबा ${hcfLine(v)} ${u}।`;
      }
    }
    return AQ(t, q, qh, ans, slips, () => { let best = 0; for (let d = 1; d <= Math.min(...v); d++) if (v.every((x) => x % d === 0)) best = d; return ans === g && !(ask === "count" || ask === "mcm" || ask === "tins") ? best : sumOf(v.map((x) => x / best)); }, s, sh, unit);
  },
});

// Square tiles on a floor: largest tile, or least number of tiles.
const tiles = (id, levels, gs, xs, lo, hi, ask, max = 400) => ({
  id, levels,
  cands: () => cap(cross(gs, xs, xs).filter(([g, x, y]) => x < y && gcd(x, y) === 1 && g * y <= hi && g * x >= lo && (x * y) <= 1500), max),
  build: (t, prm) => {
    const [g, x, y] = prm; const Ln = g * y, B = g * x; const n = x * y; const mixed = ask === "countM";
    const sz = (c) => (mixed ? mcm(c) : `${c} cm`);
    const head = `A room is ${sz(Ln)} long and ${sz(B)} wide. Its floor is to be covered with square tiles, all of the same size, without cutting any tile.`;
    const headH = `एक कमरा ${sz(Ln)} लंबा और ${sz(B)} चौड़ा है। इसके फ़र्श पर एक ही आकार की वर्गाकार टाइलें बिना काटे लगानी हैं।`;
    if (ask === "side") {
      return AQ(t, `${head} What is the side of the largest tile that can be used?`, `${headH} सबसे बड़ी संभव टाइल की भुजा कितनी होगी?`,
        g, [g / factor(g)[0][0], Ln - B === g ? g * 2 : Ln - B, n, g * 2], () => { let best = 0; for (let d = 1; d <= B; d++) if (Ln % d === 0 && B % d === 0) best = d; return best; },
        `The tile side must divide both the length and the width: the largest is HCF(${Ln}, ${B}) = ${g} cm.`, `टाइल की भुजा लंबाई और चौड़ाई दोनों को विभाजित करे: सबसे बड़ी HCF(${Ln}, ${B}) = ${g} cm।`, "cm");
    }
    return AQ(t, `${head} What is the least number of tiles needed?`, `${headH} कम से कम कितनी टाइलें लगेंगी?`,
      n, [x + y, n * factor(g)[0][0] ** 2, 2 * (x + y), g], () => { let best = 0; for (let d = 1; d <= B; d++) if (Ln % d === 0 && B % d === 0) best = d; return (Ln / best) * (B / best); },
      `Fewest tiles means the largest tile: ${mixed ? `in cm the floor is ${Ln} × ${B}; ` : ""}HCF(${Ln}, ${B}) = ${g} cm. Tiles = (${Ln} ÷ ${g}) × (${B} ÷ ${g}) = ${y} × ${x} = ${n}.`,
      `कम से कम टाइलें यानी सबसे बड़ी टाइल: ${mixed ? `cm में फ़र्श ${Ln} × ${B} है; ` : ""}HCF(${Ln}, ${B}) = ${g} cm। टाइलें = (${Ln} ÷ ${g}) × (${B} ÷ ${g}) = ${y} × ${x} = ${n}।`);
  },
});

// Trees in rows (one kind per row, equal rows): most per row / fewest rows.
const TREES = [["mango", "आम"], ["guava", "अमरूद"], ["lemon", "नींबू"], ["neem", "नीम"]];
const orchard = (id, levels, k, gs, xs, lo, hi, ask, max = 400) => ({
  id, levels,
  cands: () => cap(shared(gs, xs, k, lo, hi).filter(([g]) => g >= 4), max),
  build: (t, prm) => {
    const [g, ...m] = prm; const v = m.map((x) => x * g); const n = sumOf(m); const off = prm[0] % 2;
    const kinds = v.map((x, i) => `${x} ${TREES[(off + i) % 4][0]}`); const kindsH = v.map((x, i) => `${x} ${TREES[(off + i) % 4][1]}`);
    const head = `${andE(kinds)} trees are to be planted in rows, with the same number of trees in every row and only one kind of tree in a row.`;
    const headH = `${andH(kindsH)} के पेड़ पंक्तियों में लगाने हैं: हर पंक्ति में पेड़ों की संख्या समान हो और एक पंक्ति में एक ही प्रकार के पेड़ हों।`;
    if (ask === "rows") {
      return AQ(t, `${head} What is the least number of rows needed?`, `${headH} कम से कम कितनी पंक्तियाँ चाहिए?`,
        n, [g, n + 1, n * 2, n - 1], () => { let best = 0; for (let d = 1; d <= Math.min(...v); d++) if (v.every((x) => x % d === 0)) best = d; return sumOf(v.map((x) => x / best)); },
        `Fewest rows means the most trees in a row: ${hcfLine(v)}. Rows = ${v.map((x) => `${x} ÷ ${g}`).join(" + ")} = ${m.join(" + ")} = ${n}.`,
        `कम से कम पंक्तियाँ यानी हर पंक्ति में अधिकतम पेड़: ${hcfLine(v)}। पंक्तियाँ = ${v.map((x) => `${x} ÷ ${g}`).join(" + ")} = ${m.join(" + ")} = ${n}।`);
    }
    return AQ(t, `${head} What is the greatest number of trees there can be in a row?`, `${headH} एक पंक्ति में अधिक से अधिक कितने पेड़ हो सकते हैं?`,
      g, [gcd(v[0], v[1]) === g ? g * 2 : gcd(v[0], v[1]), g / factor(g)[0][0], n, lcmA(v) <= 99999 ? lcmA(v) : g * 3], () => { let best = 0; for (let d = 1; d <= Math.min(...v); d++) if (v.every((x) => x % d === 0)) best = d; return best; },
      `The trees in a row must divide each count exactly; the most is ${hcfLine(v)}.`, `एक पंक्ति के पेड़ हर गिनती को पूरा विभाजित करें; अधिकतम ${hcfLine(v)}।`);
  },
});

// Exam rooms: equal numbers per room, one subject per room.
const rooms = {
  id: "rooms", levels: ["hard", "advanced"],
  cands: () => cap(shared(range(6, 40), range(2, 20), 3, 40, 600).filter(([g]) => g >= 8 && g <= 40), 400),
  build: (t, prm) => {
    const [g, ...m] = prm; const v = m.map((x) => x * g); const n = sumOf(m);
    return AQ(t, `In an exam ${v[0]} students take Hindi, ${v[1]} take English and ${v[2]} take Maths. Every room must seat the same number of students, all taking the same subject. What is the least number of rooms needed?`,
      `एक परीक्षा में ${v[0]} विद्यार्थी हिंदी, ${v[1]} अंग्रेज़ी और ${v[2]} गणित की परीक्षा दे रहे हैं। हर कमरे में समान संख्या में विद्यार्थी बैठें और एक कमरे में सब एक ही विषय के हों। कम से कम कितने कमरे चाहिए?`,
      n, [g, n + 1, sumOf(v) / (gcd(v[0], v[1]) === g ? g / factor(g)[0][0] : gcd(v[0], v[1])), n - 1], () => { let best = 0; for (let d = 1; d <= Math.min(...v); d++) if (v.every((x) => x % d === 0)) best = d; return sumOf(v.map((x) => x / best)); },
      `Fewest rooms means the most students in a room: ${hcfLine(v)}. Rooms = ${v.map((x) => `${x} ÷ ${g}`).join(" + ")} = ${m.join(" + ")} = ${n}.`,
      `कम से कम कमरे यानी हर कमरे में अधिकतम विद्यार्थी: ${hcfLine(v)}। कमरे = ${v.map((x) => `${x} ÷ ${g}`).join(" + ")} = ${m.join(" + ")} = ${n}।`);
  },
};
// A block cut into the largest equal cubes: how many?
const cubes = {
  id: "cubes", levels: ["hard", "advanced"],
  cands: () => cap(cross(range(3, 24), range(1, 12), range(1, 12), range(1, 12)).filter(([g, x, y, z]) => x > y && y > z && gcdA([x, y, z]) === 1 && g * x <= 150 && x * y * z <= 600), 400),
  build: (t, prm) => {
    const [g, x, y, z] = prm; const [a, b, c] = [x, y, z].map((v) => v * g); const n = x * y * z;
    return AQ(t, `A wooden block ${a} cm × ${b} cm × ${c} cm is cut into identical cubes, as large as possible, with no wood left over. How many cubes are made?`,
      `${a} cm × ${b} cm × ${c} cm के एक लकड़ी के गुटके को बिना कुछ बचे एक जैसे, यथासंभव बड़े घनों में काटा जाता है। कितने घन बनेंगे?`,
      n, [g, x + y + z, n * 8, x * y], () => { let best = 0; for (let d = 1; d <= c; d++) if (a % d === 0 && b % d === 0 && c % d === 0) best = d; return (a / best) * (b / best) * (c / best); },
      `The cube's edge must divide all three edges: the largest is ${hcfLine([a, b, c])} cm. Cubes = (${a} ÷ ${g}) × (${b} ÷ ${g}) × (${c} ÷ ${g}) = ${x} × ${y} × ${z} = ${n}.`,
      `घन का किनारा तीनों किनारों को विभाजित करे: सबसे बड़ा ${hcfLine([a, b, c])} cm। घन = (${a} ÷ ${g}) × (${b} ÷ ${g}) × (${c} ÷ ${g}) = ${x} × ${y} × ${z} = ${n}।`);
  },
};

const KINDS = guard([
  bells("bellsMin", ["easy"], 3, range(2, 40), "min", 180, 12),
  bells("bellsSecE", ["easy"], 2, range(4, 60), "sec", 240, 20),
  bells("bellsSec", ["medium"], 3, range(4, 72), "sec", 900, 60),
  bells("bellsSec4", ["hard"], 4, range(4, 60), "sec", 1800, 120),
  atClock("bellsClockE", ["easy"], 3, range(3, 30), "min", 120, 12, "bell"),
  atClock("bellsClockM", ["medium"], 3, range(4, 60), "sec", 900, 60, "bell"),
  atClock("busClock", ["medium", "hard"], 3, range(5, 45), "min", 300, 30, "bus"),
  atClock("lightClock", ["hard", "advanced"], 3, range(12, 90), "sec", 1800, 120, "light"),
  atClock("bellsClock4", ["advanced"], 4, range(4, 60), "sec", 3000, 300, "bell"),
  count("bellsCountM", ["medium"], 3, range(2, 30), 360, 30, [1], true),
  count("bellsCountH", ["hard", "advanced"], 4, range(2, 40), 900, 60, [1, 2, 3], true),
  count("bellsCountX", ["advanced"], 4, range(2, 40), 900, 60, [1, 2, 3, 4], false),
  laps("lapsE", ["easy"], 2, range(10, 90), 600, 40),
  laps("lapsM", ["medium"], 3, range(12, 120), 1800, 120),
  laps("lapsH", ["hard"], 4, range(12, 120), 3600, 240),
  speeds("speedsH", ["hard"], 3, false),
  speeds("speedsA", ["advanced"], 3, true),
  visits("visitsE", ["easy"], range(2, 16), 200),
  visits("visitsM", ["medium"], range(3, 20), 400),
  rows("rowsE", ["easy"], range(3, 20), 360),
  rows("rowsM", ["medium"], range(4, 30), 1200),
  rows("rowsSquare", ["hard", "advanced"], range(4, 30), 600, true),
  measureLcm("rodsE", ["easy"], range(10, 60, 2), 600, "rods"),
  measureLcm("rodsM", ["medium"], range(12, 90), 3000, "rods"),
  measureLcm("stepsM", ["medium", "hard"], range(30, 90), 5000, "steps"),
  leftOver("sweetsH", ["hard"], range(3, 16), 400, false),
  leftOver("eggsA", ["advanced"], range(2, 12), 120, true),
  brickCube, gears,
  share("shareE", ["easy"], 2, range(4, 30), range(2, 15), 12, 200, "max"),
  share("shareM", ["medium"], 3, range(4, 40), range(2, 15), 20, 500, "max"),
  share("shareEach", ["medium", "hard"], 3, range(4, 40), range(2, 15), 20, 500, "each"),
  measure("jarE", ["easy"], 2, range(3, 40), range(2, 15), 20, 300, "liquid", "size"),
  measure("jarM", ["medium"], 3, range(5, 60), range(2, 15), 40, 900, "liquid", "size"),
  measure("tinsM", ["medium", "hard"], 3, range(5, 60), range(2, 15), 40, 1200, "liquid", "tins"),
  measure("tinsA", ["advanced"], 3, range(11, 99), range(3, 25), 200, 3000, "liquid", "tins"),
  measure("ropeE", ["easy"], 2, range(3, 20), range(2, 12), 6, 120, "rope", "m"),
  measure("tinsE", ["easy"], 2, range(4, 40), range(2, 12), 20, 300, "liquid", "tins"),
  measure("piecesE", ["easy"], 2, range(5, 40), range(2, 12), 20, 300, "rope", "count"),
  measure("ropeM", ["medium"], 3, range(5, 60), range(2, 15), 40, 900, "rope", "cm"),
  measure("piecesH", ["hard"], 3, range(5, 60), range(2, 15), 40, 1200, "rope", "count"),
  measure("piecesA", ["advanced"], 3, range(15, 99), range(3, 20), 150, 1600, "rope", "mcm"),
  tiles("tileSideE", ["easy"], range(10, 60, 5), range(2, 12), 150, 900, "side"),
  tiles("tileCountE", ["easy"], range(20, 90, 5), range(2, 8), 100, 720, "count"),
  tiles("tileSideM", ["medium"], range(12, 90), range(2, 15), 200, 1500, "side"),
  tiles("tileCountM", ["medium", "hard"], range(10, 90), range(2, 25), 250, 1500, "count"),
  tiles("tileCountA", ["advanced"], range(11, 99), range(3, 40), 300, 2000, "countM"),
  orchard("treesE", ["easy"], 2, range(4, 30), range(2, 12), 12, 300, "max"),
  orchard("treesRowsH", ["hard", "advanced"], 3, range(6, 40), range(2, 15), 30, 600, "rows"),
  rooms, cubes,
]);

const PREFIX = "HCF & LCM · HCF and LCM Word Problems";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
