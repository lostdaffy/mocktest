// Average · Average of Numbers: every kind of question, level by level.
// gen.js fills the tests; every answer is worked out again in `v` by a
// different route, and the wrong options are the slips students make
// (dividing by the wrong count, forgetting the overlap, adding the change
// once instead of to every number).
const L = require("./av-lib");
const { n, clean, isInt, cross, who, AQ, thin, pick, range, dec2, guard } = L;
const { fillTopic } = require("./gen");

const sum = (a) => a.reduce((x, y) => x + y, 0);
const listEn = (a) => `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
const listHi = (a) => `${a.slice(0, -1).join(", ")} और ${a[a.length - 1]}`;
// 5 marks out of 100 from a fixed set; the average is whole or one decimal.
const MARKS = [46, 52, 58, 61, 64, 67, 72, 75, 78, 83, 88, 94];
const fives = () => { const o = []; const m = MARKS; for (let a = 0; a < 12; a++) for (let b = a + 1; b < 12; b++) for (let c = b + 1; c < 12; c++) for (let d = c + 1; d < 12; d++) for (let e = d + 1; e < 12; e++) o.push([m[a], m[b], m[c], m[d], m[e]]); return o; };
// Shuffle a list the same way every time, so the marks are not in order.
const mix = (a, prm) => { const r = [...a]; let h = L.hashOf(prm); for (let i = r.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const ORD = (k) => `${k}${k % 10 === 1 && k !== 11 ? "st" : k % 10 === 2 && k !== 12 ? "nd" : k % 10 === 3 && k !== 13 ? "rd" : "th"}`;
const ORDH = (k) => `${k}वाँ`; // masculine nouns (परिणाम, प्रेक्षण)
const ORDHf = (k) => `${k}वीं`; // feminine (संख्या)

// ---------------------------------------------------------------- EASY
const avgList = {
  id: "avgList", levels: ["easy"],
  cands: () => thin(fives().filter((a) => dec2(sum(a) / 5)), (a) => [a[0], a[2], a[4]]),
  build: (t, prm) => {
    const a = mix(prm, prm); const w = who(prm); const s = sum(a), A = clean(s / 5);
    return AQ(t, `${w.name} scored ${listEn(a)} marks in 5 subjects. What is ${w.his} average score?`,
      `${w.nameH} ने 5 विषयों में ${listHi(a)} अंक प्राप्त किए। उसके अंकों का औसत क्या है?`,
      A, [s / 4, s / 6, A + 2], () => a.reduce((x, y) => x + y) / a.length,
      `Sum = ${a.join(" + ")} = ${s}. Average = ${s} ÷ 5 = ${n(A)}.`,
      `योग = ${a.join(" + ")} = ${s}। औसत = ${s} ÷ 5 = ${n(A)}।`, "none", 1);
  },
};

const FIRST = {
  nat: ["the first $n natural numbers", "पहली $n प्राकृत संख्याओं", (N) => (N + 1) / 2, (N) => `(1 + ${N}) ÷ 2`],
  even: ["the first $n even natural numbers", "पहली $n सम प्राकृत संख्याओं", (N) => N + 1, (N) => `(2 + ${2 * N}) ÷ 2`],
  odd: ["the first $n odd natural numbers", "पहली $n विषम प्राकृत संख्याओं", (N) => N, (N) => `(1 + ${2 * N - 1}) ÷ 2`],
};
const avgFirstN = {
  id: "avgFirstN", levels: ["easy", "medium"],
  cands: () => cross(["nat", "even", "odd"], range(8, 80)).concat(cross(["mul"], range(6, 40), [3, 4, 6, 7, 8, 9, 11, 12, 13, 15])).filter(([ty, N]) => ty !== "nat" || N % 2 === 1 || N > 12),
  build: (t, prm) => {
    const [ty, N, k] = prm;
    if (ty === "mul") {
      const A = clean(k * (N + 1) / 2);
      return AQ(t, `What is the average of the first ${N} multiples of ${k}?`, `${k} के पहले ${N} गुणजों का औसत क्या है?`,
        A, [k * N / 2, k * (N - 1) / 2, A * 2], () => sum(range(1, N).map((i) => i * k)) / N,
        `The multiples ${k}, ${2 * k}, ..., ${k * N} are evenly spaced, so the average = (first + last) ÷ 2 = (${k} + ${k * N}) ÷ 2 = ${n(A)}.`,
        `गुणज ${k}, ${2 * k}, ..., ${k * N} समान अंतर पर हैं, अतः औसत = (पहला + अंतिम) ÷ 2 = (${k} + ${k * N}) ÷ 2 = ${n(A)}।`, "none", 1);
    }
    const [en, hi, f, how] = FIRST[ty]; const A = clean(f(N));
    const gen = ty === "nat" ? (i) => i : ty === "even" ? (i) => 2 * i : (i) => 2 * i - 1;
    return AQ(t, `What is the average of ${en.replace("$n", N)}?`, `${hi.replace("$n", N)} का औसत क्या है?`,
      A, [N / 2, A + 1, A - 1, N * 2], () => sum(range(1, N).map(gen)) / N,
      `They are evenly spaced, so the average = (first + last) ÷ 2 = ${how(N)} = ${n(A)}.`,
      `ये समान अंतर पर हैं, अतः औसत = (पहली + अंतिम) ÷ 2 = ${how(N)} = ${n(A)}।`, "none", 1);
  },
};

// m consecutive odd / even / natural numbers with average A.
const CK = { odd: ["odd numbers", "विषम संख्याओं", 2], even: ["even numbers", "सम संख्याओं", 2], nat: ["natural numbers", "प्राकृत संख्याओं", 1] };
const okConsec = ([m, A, ty]) => { const s = CK[ty][2], lo = A - (m - 1) * s / 2; if (!isInt(lo) || lo < 1) return false; return ty === "nat" || (ty === "odd" ? lo % 2 === 1 : lo % 2 === 0); };
const consecLargest = {
  id: "consecLargest", levels: ["easy", "medium"],
  cands: () => cross([4, 5, 6, 7, 8, 9], range(11, 99), ["odd", "even", "nat"], ["big", "small"]).filter(okConsec),
  build: (t, prm) => {
    const [m, A, ty, ask] = prm; const [en, hi, s] = CK[ty]; const d = (m - 1) * s / 2; const ans = ask === "big" ? A + d : A - d;
    return AQ(t, `The average of ${m} consecutive ${en} is ${A}. What is the ${ask === "big" ? "largest" : "smallest"} of them?`,
      `${m} क्रमागत ${hi} का औसत ${A} है। इनमें ${ask === "big" ? "सबसे बड़ी" : "सबसे छोटी"} संख्या कौन-सी है?`,
      ans, [ask === "big" ? A + m - 1 + (s === 1 ? 1 : 0) : A - m + 1 - (s === 1 ? 1 : 0), ask === "big" ? A + m : A - m, ask === "big" ? A + d + s : A - d - s], () => { const lo = A - (m - 1) * s / 2; return ask === "big" ? lo + (m - 1) * s : lo; },
      `Consecutive ${en} are evenly spaced, so the average is the middle value. The ${ask === "big" ? "largest" : "smallest"} is ${n(d)} ${ask === "big" ? "above" : "below"} it: ${A} ${ask === "big" ? "+" : "−"} ${n(d)} = ${n(ans)}.`,
      `क्रमागत ${hi.replace("संख्याओं", "संख्याएँ")} समान अंतर पर होती हैं, अतः औसत बीच का मान है। ${ask === "big" ? "सबसे बड़ी" : "सबसे छोटी"} संख्या उससे ${n(d)} ${ask === "big" ? "अधिक" : "कम"} है: ${A} ${ask === "big" ? "+" : "−"} ${n(d)} = ${n(ans)}।`, "none", s);
  },
};

const OPS = {
  add: ["increased by $c", "में $c जोड़ दिया जाए", (A, c) => A + c, (A, c, N) => A + c * N],
  sub: ["decreased by $c", "में से $c घटा दिया जाए", (A, c) => A - c, (A, c, N) => A - c * N],
  mul: ["multiplied by $c", "को $c से गुणा कर दिया जाए", (A, c) => A * c, (A, c) => A + c],
  div: ["divided by $c", "को $c से भाग दे दिया जाए", (A, c) => A / c, (A, c) => A - c],
};
const constChange = {
  id: "constChange", levels: ["easy"],
  cands: () => cross([5, 6, 7, 8, 9, 10, 12, 15, 20], range(12, 90), ["add", "sub", "mul", "div"], [2, 3, 4, 5, 6, 8, 10, 12]).filter(([N, A, op, c]) => (op !== "sub" || A - c > 0) && (op !== "div" || isInt(A / c)) && (op !== "mul" || c <= 5)),
  build: (t, prm) => {
    const [N, A, op, c] = prm; const [en, hi, f, slip] = OPS[op]; const B = clean(f(A, c));
    return AQ(t, `The average of ${N} numbers is ${A}. If each number is ${en.replace("$c", c)}, what is the new average?`,
      `${N} संख्याओं का औसत ${A} है। यदि प्रत्येक संख्या ${hi.replace("$c", c)}, तो नया औसत क्या होगा?`,
      B, [slip(A, c, N), A, op === "add" || op === "sub" ? f(A, c * 2) : f(A, c) + c], () => { const nums = range(1, N).map((i) => A + (i - (N + 1) / 2)); return sum(nums.map((x) => (op === "add" ? x + c : op === "sub" ? x - c : op === "mul" ? x * c : x / c))) / N; },
      `Doing the same to every number does it to the average too: ${A} ${op === "add" ? "+" : op === "sub" ? "−" : op === "mul" ? "×" : "÷"} ${c} = ${n(B)}.`,
      `हर संख्या के साथ एक ही क्रिया करने से औसत के साथ भी वही होती है: ${A} ${op === "add" ? "+" : op === "sub" ? "−" : op === "mul" ? "×" : "÷"} ${c} = ${n(B)}।`, "none", 1);
  },
};

const removeOne = {
  id: "removeOne", levels: ["easy"],
  cands: () => cross([5, 6, 7, 8, 9, 10, 11, 12], range(15, 80), range(5, 120)).filter(([N, A, x]) => x !== A && dec2((N * A - x) / (N - 1)) && Math.abs(x - A) <= 40),
  build: (t, prm) => {
    const [N, A, x] = prm; const S = N * A, B = clean((S - x) / (N - 1));
    return AQ(t, `The average of ${N} numbers is ${A}. If the number ${x} is removed, what is the average of the remaining numbers?`,
      `${N} संख्याओं का औसत ${A} है। यदि संख्या ${x} को हटा दिया जाए, तो शेष संख्याओं का औसत क्या होगा?`,
      B, [(S - x) / N, A - x / N, (S + x) / (N + 1)], () => (A * N - x) / (N - 1),
      `Sum = ${N} × ${A} = ${S}. Without ${x}: ${S} − ${x} = ${S - x} for ${N - 1} numbers. Average = ${S - x} ÷ ${N - 1} = ${n(B)}.`,
      `योग = ${N} × ${A} = ${S}। ${x} हटाने पर: ${S} − ${x} = ${S - x}, ${N - 1} संख्याओं का। औसत = ${S - x} ÷ ${N - 1} = ${n(B)}।`, "none", 1);
  },
};

const addOne = {
  id: "addOne", levels: ["easy"],
  cands: () => cross([4, 5, 6, 7, 8, 9, 11, 14, 19], range(15, 80), range(5, 140)).filter(([N, A, x]) => x !== A && dec2((N * A + x) / (N + 1)) && Math.abs(x - A) <= 60),
  build: (t, prm) => {
    const [N, A, x] = prm; const S = N * A, B = clean((S + x) / (N + 1));
    return AQ(t, `The average of ${N} numbers is ${A}. If the number ${x} is also included, what is the new average?`,
      `${N} संख्याओं का औसत ${A} है। यदि संख्या ${x} भी शामिल कर ली जाए, तो नया औसत क्या होगा?`,
      B, [(S + x) / N, (A + x) / 2, (S - x) / (N - 1)], () => (A * N + x) / (N + 1),
      `Sum = ${N} × ${A} = ${S}. With ${x}: ${S + x} for ${N + 1} numbers. Average = ${S + x} ÷ ${N + 1} = ${n(B)}.`,
      `योग = ${N} × ${A} = ${S}। ${x} जोड़ने पर: ${N + 1} संख्याओं का योग ${S + x}। औसत = ${S + x} ÷ ${N + 1} = ${n(B)}।`, "none", 1);
  },
};

const missingNum = {
  id: "missingNum", levels: ["easy", "medium"],
  cands: () => thin(cross(fives().filter((a) => isInt(sum(a) / 5)), [0, 1, 2, 3, 4]).map(([a, i]) => [...a, i]), (p) => [p[0], p[2], p[5]]),
  build: (t, prm) => {
    const a = mix(prm.slice(0, 5), prm); const i = prm[5]; const A = sum(a) / 5; const x = a[i];
    const shown = a.map((v, j) => (j === i ? "x" : String(v)));
    const known = sum(a) - x;
    return AQ(t, `The average of ${listEn(shown)} is ${A}. What is the value of x?`,
      `${listHi(shown)} का औसत ${A} है। x का मान क्या है?`,
      x, [A, 5 * A - known + A, 4 * A - known + x * 2].filter((v) => v !== x), () => 5 * A - shown.filter((s) => s !== "x").reduce((s, v) => s + Number(v), 0),
      `Sum of all 5 = 5 × ${A} = ${5 * A}. The other four add up to ${known}, so x = ${5 * A} − ${known} = ${x}.`,
      `पाँचों का योग = 5 × ${A} = ${5 * A}। शेष चार का योग ${known} है, अतः x = ${5 * A} − ${known} = ${x}।`, "none", 1);
  },
};

const excludedNum = {
  id: "excludedNum", levels: ["easy", "medium"],
  cands: () => cross([5, 6, 7, 8, 9, 10, 12], range(14, 70), range(-12, 12)).map(([N, A, d]) => [N, A, A + d]).filter(([N, A, B]) => B !== A && B > 5 && N * A - (N - 1) * B > 0 && N * A - (N - 1) * B < 200),
  build: (t, prm) => {
    const [N, A, B] = prm; const x = N * A - (N - 1) * B;
    return AQ(t, `The average of ${N} numbers is ${A}. If one of the numbers is left out, the average of the rest becomes ${B}. Which number was left out?`,
      `${N} संख्याओं का औसत ${A} है। यदि इनमें से एक संख्या हटा दी जाए, तो शेष का औसत ${B} हो जाता है। कौन-सी संख्या हटाई गई?`,
      x, [Math.abs(A - B) * N, A + B, N * (A - B) + A].filter((v) => v !== x), () => A * N - B * (N - 1),
      `Sum of ${N} = ${N} × ${A} = ${N * A}. Sum of the other ${N - 1} = ${N - 1} × ${B} = ${(N - 1) * B}. Left out = ${N * A} − ${(N - 1) * B} = ${x}.`,
      `${N} संख्याओं का योग = ${N} × ${A} = ${N * A}। शेष ${N - 1} का योग = ${N - 1} × ${B} = ${(N - 1) * B}। हटाई गई संख्या = ${N * A} − ${(N - 1) * B} = ${x}।`, "none", 1);
  },
};

const PRIMES = range(2, 150).filter((p) => range(2, Math.floor(Math.sqrt(p))).every((d) => p % d !== 0));
const primeAvg = {
  id: "primeAvg", levels: ["easy", "medium"],
  cands: () => cross(range(1, 80), range(20, 140)).filter(([a, b]) => b - a >= 15 && b - a <= 40 && !PRIMES.includes(a) && !PRIMES.includes(b) && dec2(sum(PRIMES.filter((p) => p >= a && p <= b)) / PRIMES.filter((p) => p >= a && p <= b).length) && PRIMES.filter((p) => p >= a && p <= b).length >= 4 && PRIMES.filter((p) => p >= a && p <= b).length <= 8),
  build: (t, prm) => {
    const [a, b] = prm; const ps = PRIMES.filter((p) => p >= a && p <= b); const A = clean(sum(ps) / ps.length);
    return AQ(t, `What is the average of all the prime numbers from ${a} to ${b}?`, `${a} से ${b} तक की सभी अभाज्य संख्याओं का औसत क्या है?`,
      A, [sum(ps) / (ps.length + 1), sum(ps) / (ps.length - 1), (a + b) / 2], () => { const q = []; for (let x = a; x <= b; x++) if (x > 1 && [...Array(x).keys()].slice(2).every((d) => x % d)) q.push(x); return q.reduce((s, v) => s + v, 0) / q.length; },
      `The primes from ${a} to ${b} are ${ps.join(", ")}: ${ps.length} of them, adding up to ${sum(ps)}. Average = ${sum(ps)} ÷ ${ps.length} = ${n(A)}.`,
      `${a} से ${b} तक की अभाज्य संख्याएँ ${ps.join(", ")} हैं: कुल ${ps.length}, जिनका योग ${sum(ps)} है। औसत = ${sum(ps)} ÷ ${ps.length} = ${n(A)}।`, "none", 1);
  },
};

const divisors = (N) => range(1, N).filter((d) => N % d === 0);
const factorAvg = {
  id: "factorAvg", levels: ["easy", "medium"],
  cands: () => range(12, 200).filter((N) => divisors(N).length >= 4 && divisors(N).length <= 10 && dec2(sum(divisors(N)) / divisors(N).length)).map((N) => [N]),
  build: (t, prm) => {
    const [N] = prm; const ds = divisors(N); const A = clean(sum(ds) / ds.length);
    return AQ(t, `What is the average of all the factors of ${N}?`, `${N} के सभी गुणनखंडों (भाजकों) का औसत क्या है?`,
      A, [sum(ds) / (ds.length - 1), (sum(ds) - N) / (ds.length - 1), (sum(ds) - N - 1) / (ds.length - 2)], () => { let s = 0, c = 0; for (let d = 1; d <= N; d++) if (N % d === 0) { s += d; c++; } return s / c; },
      `The factors of ${N} are ${ds.join(", ")}: ${ds.length} of them, adding up to ${sum(ds)}. Average = ${sum(ds)} ÷ ${ds.length} = ${n(A)}.`,
      `${N} के गुणनखंड ${ds.join(", ")} हैं: कुल ${ds.length}, जिनका योग ${sum(ds)} है। औसत = ${sum(ds)} ÷ ${ds.length} = ${n(A)}।`, "none", 1);
  },
};

// ---------------------------------------------------------------- MEDIUM
const RES = [["results", "परिणामों", "result", "परिणाम", false], ["numbers", "संख्याओं", "number", "संख्या", true], ["observations", "प्रेक्षणों", "observation", "प्रेक्षण", false]];
const middleResult = {
  id: "middleResult", levels: ["medium", "hard", "advanced"],
  cands: () => cross([3, 4, 5, 6, 7, 8], range(20, 80), range(-6, 6), range(-6, 6)).map(([k, A, d1, d2]) => [k, A, A + d1, A + d2]).filter(([k, A, A1, A2]) => A1 !== A2 && A1 !== A && A2 !== A && k * (A1 + A2) - (2 * k - 1) * A > 0 && k * (A1 + A2) - (2 * k - 1) * A < 150),
  build: (t, prm) => {
    const [k, A, A1, A2] = prm; const N = 2 * k - 1; const [en, hi, one, oneH, fem] = pick(RES, prm); const x = k * A1 + k * A2 - N * A; const oh = fem ? ORDHf(k) : ORDH(k);
    return AQ(t, `The average of ${N} ${en} is ${A}. The average of the first ${k} is ${A1} and the average of the last ${k} is ${A2}. What is the ${ORD(k)} ${one}?`,
      `${N} ${hi} का औसत ${A} है। ${fem ? "पहली" : "पहले"} ${k} का औसत ${A1} और अंतिम ${k} का औसत ${A2} है। ${oh} ${oneH} क्या है?`,
      x, [k * (A1 + A2) - 2 * k * A, (A1 + A2) / 2, x + k].filter((v) => v !== x), () => (A1 * k + A2 * k) - A * N,
      `First ${k} + last ${k} = ${k} × ${A1} + ${k} × ${A2} = ${k * (A1 + A2)}, which counts the ${ORD(k)} ${one} twice. All ${N} add up to ${N} × ${A} = ${N * A}. So the ${ORD(k)} ${one} = ${k * (A1 + A2)} − ${N * A} = ${x}.`,
      `${fem ? "पहली" : "पहले"} ${k} + अंतिम ${k} = ${k} × ${A1} + ${k} × ${A2} = ${k * (A1 + A2)}, जिसमें ${oh} ${oneH} दो बार ${fem ? "गिनी गई" : "गिना गया"} है। सभी ${N} का योग = ${N} × ${A} = ${N * A}। अतः ${oh} ${oneH} = ${k * (A1 + A2)} − ${N * A} = ${x}।`, "none", 1);
  },
};

const wrongRecord = {
  id: "wrongRecord", levels: ["medium", "hard", "advanced"],
  cands: () => cross([10, 12, 15, 16, 20, 24, 25, 30, 40, 50], range(30, 70), range(10, 95), range(10, 95)).filter(([N, A, x, y]) => x !== y && Math.abs(x - y) >= 10 && dec2(A + (x - y) / N) && !isInt((x - y) / N * 10) === false),
  build: (t, prm) => {
    const [N, A, x, y] = prm; const B = clean(A + (x - y) / N); const w = pick([["marks", "अंकों"], ["scores", "प्राप्तांकों"]], prm);
    return AQ(t, `The average of the ${w[0]} of ${N} students was found to be ${A}. Later it was found that one student's ${x} had been written as ${y}. What is the correct average?`,
      `${N} विद्यार्थियों के ${w[1]} का औसत ${A} निकाला गया। बाद में पता चला कि एक विद्यार्थी के ${x} को ${y} लिख दिया गया था। सही औसत क्या है?`,
      B, [A - (x - y) / N, A + (x - y) / (N - 1), A + (x - y)], () => (A * N - y + x) / N,
      `Sum as worked out = ${N} × ${A} = ${N * A}. Correct sum = ${N * A} − ${y} + ${x} = ${N * A - y + x}. Correct average = ${N * A - y + x} ÷ ${N} = ${n(B)}.`,
      `निकाला गया योग = ${N} × ${A} = ${N * A}। सही योग = ${N * A} − ${y} + ${x} = ${N * A - y + x}। सही औसत = ${N * A - y + x} ÷ ${N} = ${n(B)}।`, "none", 0.5);
  },
};

const groupsRest = {
  id: "groupsRest", levels: ["medium", "hard", "advanced"],
  cands: () => thin(cross([10, 12, 15, 20], range(20, 60), [3, 4, 5], range(-8, 8), [3, 4, 5, 6], range(-8, 8)).map(([N, A, p, d1, q, d2]) => [N, A, p, A + d1, q, A + d2]).filter(([N, A, p, A1, q, A2]) => N - p - q >= 2 && A1 !== A2 && dec2((N * A - p * A1 - q * A2) / (N - p - q)) && (N * A - p * A1 - q * A2) / (N - p - q) > 0), (p) => [p[0], p[1], p[2]]),
  build: (t, prm) => {
    const [N, A, p, A1, q, A2] = prm; const r = N - p - q; const R = clean(N * A - p * A1 - q * A2); const B = clean(R / r);
    return AQ(t, `The average of ${N} numbers is ${A}. The average of ${p} of them is ${A1} and the average of another ${q} of them is ${A2}. What is the average of the remaining numbers?`,
      `${N} संख्याओं का औसत ${A} है। इनमें से ${p} का औसत ${A1} और अन्य ${q} का औसत ${A2} है। शेष संख्याओं का औसत क्या है?`,
      B, [3 * A - A1 - A2, R / (r + 1), (N * A - A1 - A2) / r], () => (A * N - (A1 * p + A2 * q)) / (N - p - q),
      `Sum of all = ${N} × ${A} = ${N * A}. The two groups add up to ${p} × ${A1} + ${q} × ${A2} = ${p * A1 + q * A2}. The other ${r} add up to ${R}, so their average = ${R} ÷ ${r} = ${n(B)}.`,
      `सभी का योग = ${N} × ${A} = ${N * A}। दोनों समूहों का योग = ${p} × ${A1} + ${q} × ${A2} = ${p * A1 + q * A2}। शेष ${r} का योग ${R} है, अतः उनका औसत = ${R} ÷ ${r} = ${n(B)}।`, "none", 1);
  },
};

// [English plural, Hindi "of X and Y" phrase, Hindi question, unit]
const PAIRS3 = [["monthly incomes", "की मासिक आय", (w) => `${w} की मासिक आय कितनी है?`, "rs"], ["weights", "के भार", (w) => `${w} का भार कितना है?`, "kg"], ["marks", "के अंकों", (w) => `${w} के अंक कितने हैं?`, "mark"]];
const abcPairs = {
  id: "abcPairs", levels: ["medium", "hard", "advanced"],
  cands: () => cross(["P", "Q", "R"].map((x, i) => i), range(30, 90), range(30, 90), range(30, 90)).filter(([i, a, b, c]) => a !== b && b !== c && a !== c && (a + b) % 2 === 0 && (b + c) % 2 === 0 && (a + c) % 2 === 0 && Math.abs(a - b) <= 30 && Math.abs(b - c) <= 30),
  build: (t, prm) => {
    const [i, a, b, c] = prm; const [en, hiOf, askH, unit] = pick(PAIRS3, prm); const sc = unit === "rs" ? 100 : 1;
    const [A, B, C] = [a * sc, b * sc, c * sc]; const ab = (A + B) / 2, bc = (B + C) / 2, ca = (C + A) / 2; const who3 = ["A", "B", "C"][i]; const ans = [A, B, C][i];
    const other = i === 0 ? bc : i === 1 ? ca : ab;
    return AQ(t, `The average of the ${en} of A and B is ${L.U[unit].en(ab)}, of B and C is ${L.U[unit].en(bc)}, and of C and A is ${L.U[unit].en(ca)}. What is ${who3}'s ${en === "marks" ? "score" : en.replace(/s$/, "")}?`,
      `A और B ${hiOf} का औसत ${L.U[unit].hi(ab)}, B और C ${hiOf} का औसत ${L.U[unit].hi(bc)}, तथा C और A ${hiOf} का औसत ${L.U[unit].hi(ca)} है। ${askH(who3)}`,
      ans, [ab + bc + ca - 2 * other, (ab + bc + ca) / 3, ab + ca - bc + sc].filter((v) => v !== ans), () => (ab + bc + ca) - 2 * other,
      `A + B = ${n(2 * ab)}, B + C = ${n(2 * bc)}, C + A = ${n(2 * ca)}. Adding: 2(A + B + C) = ${n(2 * (ab + bc + ca))}, so A + B + C = ${n(ab + bc + ca)}. ${who3} = ${n(ab + bc + ca)} − ${n(2 * other)} = ${L.U[unit].en(ans)}.`,
      `A + B = ${n(2 * ab)}, B + C = ${n(2 * bc)}, C + A = ${n(2 * ca)}। जोड़ने पर 2(A + B + C) = ${n(2 * (ab + bc + ca))}, अतः A + B + C = ${n(ab + bc + ca)}। ${who3} = ${n(ab + bc + ca)} − ${n(2 * other)} = ${L.U[unit].hi(ans)}।`, unit, sc);
  },
};

const threeAvg = {
  id: "threeAvg", levels: ["medium"],
  cands: () => cross(range(30, 80), range(30, 80), range(30, 80)).filter(([a, b, c]) => a !== b && b !== c && (a + b + c) % 3 === 0 && (a + b) % 2 === 0 && (b + c) % 2 === 0 && Math.abs(a - c) >= 4),
  build: (t, prm) => {
    const [a, b, c] = prm; const x = (a + b + c) / 3, y = (a + b) / 2, z = (b + c) / 2;
    return AQ(t, `The average weight of A, B and C is ${x} kg. The average weight of A and B is ${y} kg and that of B and C is ${z} kg. What is the weight of B?`,
      `A, B और C का औसत भार ${x} kg है। A और B का औसत भार ${y} kg तथा B और C का ${z} kg है। B का भार कितना है?`,
      b, [3 * x - y - z, y + z - x, 2 * y + 2 * z - 3 * x + 2].filter((v) => v !== b), () => 2 * y + 2 * z - 3 * x,
      `A + B + C = 3 × ${x} = ${3 * x}. A + B = ${2 * y} and B + C = ${2 * z}, which add up to A + C + 2B = ${2 * y + 2 * z}. Subtracting: B = ${2 * y + 2 * z} − ${3 * x} = ${b} kg.`,
      `A + B + C = 3 × ${x} = ${3 * x}। A + B = ${2 * y} और B + C = ${2 * z}, जिनका योग A + C + 2B = ${2 * y + 2 * z} है। घटाने पर B = ${2 * y + 2 * z} − ${3 * x} = ${b} kg।`, "kg", 1);
  },
};

const rangeDiv = {
  id: "rangeDiv", levels: ["medium"],
  cands: () => cross(range(1, 60), range(80, 400), [3, 4, 6, 7, 8, 9, 11, 12, 13, 15]).filter(([a, b, k]) => a % k !== 0 && b % k !== 0 && Math.floor(b / k) - Math.ceil(a / k) >= 8),
  build: (t, prm) => {
    const [a, b, k] = prm; const f = Math.ceil(a / k) * k, l = Math.floor(b / k) * k; const A = clean((f + l) / 2); const cnt = (l - f) / k + 1;
    return AQ(t, `What is the average of all the numbers from ${a} to ${b} that are divisible by ${k}?`, `${a} से ${b} तक की उन सभी संख्याओं का औसत क्या है जो ${k} से विभाज्य हैं?`,
      A, [(a + b) / 2, (f + l) / 2 + k / 2, (l - f) / 2], () => { let s = 0, c = 0; for (let x = a; x <= b; x++) if (x % k === 0) { s += x; c++; } return s / c; },
      `The first multiple of ${k} in the range is ${f} and the last is ${l} (${cnt} numbers, evenly spaced). Average = (${f} + ${l}) ÷ 2 = ${n(A)}.`,
      `इस सीमा में ${k} का पहला गुणज ${f} और अंतिम ${l} है (${cnt} संख्याएँ, समान अंतर पर)। औसत = (${f} + ${l}) ÷ 2 = ${n(A)}।`, "none", 1);
  },
};

const consecEnds = {
  id: "consecEnds", levels: ["medium", "hard", "advanced"],
  cands: () => cross([4, 5, 6, 7, 8, 9, 10], range(11, 99), ["odd", "even", "nat"], ["sum", "prod"]).map(([m, A, ty, ask]) => [m, A, ty, ask]).filter(([m, A, ty, ask]) => okConsec([m, A, ty]) && (ask === "sum" || (A <= 40 && isInt(A - (m - 1) * CK[ty][2] / 2)))),
  build: (t, prm) => {
    const [m, A, ty, ask] = prm; const [en, hi, s] = CK[ty]; const d = (m - 1) * s / 2; const lo = A - d, hi2 = A + d; const ans = ask === "sum" ? lo + hi2 : lo * hi2;
    return AQ(t, `The average of ${m} consecutive ${en} is ${A}. What is the ${ask === "sum" ? "sum" : "product"} of the smallest and the largest of them?`,
      `${m} क्रमागत ${hi} का औसत ${A} है। इनमें सबसे छोटी और सबसे बड़ी संख्या का ${ask === "sum" ? "योग" : "गुणनफल"} क्या है?`,
      ans, ask === "sum" ? [A * m, A + d, 2 * A + s] : [A * A, (lo + s) * (hi2 - s), lo * (hi2 + s)], () => { const a = A - (m - 1) * s / 2, b = a + (m - 1) * s; return ask === "sum" ? a + b : a * b; },
      `The average of evenly spaced numbers is the middle value, so the smallest is ${A} − ${n(d)} = ${n(lo)} and the largest is ${A} + ${n(d)} = ${n(hi2)}. ${ask === "sum" ? `Sum = ${n(lo)} + ${n(hi2)}` : `Product = ${n(lo)} × ${n(hi2)}`} = ${n(ans)}.`,
      `समान अंतर वाली संख्याओं का औसत बीच का मान होता है, अतः सबसे छोटी ${A} − ${n(d)} = ${n(lo)} और सबसे बड़ी ${A} + ${n(d)} = ${n(hi2)} है। ${ask === "sum" ? `योग = ${n(lo)} + ${n(hi2)}` : `गुणनफल = ${n(lo)} × ${n(hi2)}`} = ${n(ans)}।`, "none", ask === "sum" ? s : 10);
  },
};

const moreConsec = {
  id: "moreConsec", levels: ["medium", "hard", "advanced"],
  cands: () => cross([5, 6, 7, 8, 9, 10], range(11, 80), ["odd", "even", "nat"], [2, 3, 4, 5, 6]).filter(([m, A, ty, k]) => okConsec([m, A, ty]) && dec2(A + k * CK[ty][2] / 2)),
  build: (t, prm) => {
    const [m, A, ty, k] = prm; const [en, hi, s] = CK[ty]; const B = clean(A + k * s / 2);
    return AQ(t, `The average of ${m} consecutive ${en} is ${A}. If the next ${k} consecutive ${en} are also included, what is the new average?`,
      `${m} क्रमागत ${hi} का औसत ${A} है। यदि अगली ${k} क्रमागत ${hi.replace("संख्याओं", "संख्याएँ")} भी शामिल कर ली जाएँ, तो नया औसत क्या होगा?`,
      B, [A + k * s, A + k, A + (m + k) * s / 2].filter((v) => v !== B), () => { const lo = A - (m - 1) * s / 2; return lo + (m + k - 1) * s / 2; },
      `The smallest number is ${A} − ${n((m - 1) * s / 2)} = ${n(A - (m - 1) * s / 2)}. Now there are ${m + k} evenly spaced numbers from it, so the middle moves up by ${k} × ${s} ÷ 2 = ${n(k * s / 2)}: new average = ${A} + ${n(k * s / 2)} = ${n(B)}.`,
      `सबसे छोटी संख्या ${A} − ${n((m - 1) * s / 2)} = ${n(A - (m - 1) * s / 2)} है। अब उससे शुरू होकर ${m + k} समान अंतर वाली संख्याएँ हैं, अतः बीच का मान ${k} × ${s} ÷ 2 = ${n(k * s / 2)} बढ़ जाता है: नया औसत = ${A} + ${n(k * s / 2)} = ${n(B)}।`, "none", 0.5);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
const powAvg = {
  id: "powAvg", levels: ["hard", "advanced"],
  cands: () => cross(["sq", "cube"], range(5, 40)).filter(([ty, N]) => dec2(ty === "sq" ? (N + 1) * (2 * N + 1) / 6 : N * (N + 1) * (N + 1) / 4)),
  build: (t, prm) => {
    const [ty, N] = prm; const sq = ty === "sq"; const S = sq ? N * (N + 1) * (2 * N + 1) / 6 : (N * (N + 1) / 2) ** 2; const A = clean(S / N);
    return AQ(t, `What is the average of the ${sq ? "squares" : "cubes"} of the first ${N} natural numbers?`, `पहली ${N} प्राकृत संख्याओं के ${sq ? "वर्गों" : "घनों"} का औसत क्या है?`,
      A, sq ? [(N + 1) * (2 * N + 1) / 3, ((N + 1) / 2) ** 2, N * (N + 1) / 2] : [(N * (N + 1) / 2) ** 2 / (N + 1), ((N + 1) / 2) ** 3, N * (N + 1) / 2], () => range(1, N).reduce((s, i) => s + i ** (sq ? 2 : 3), 0) / N,
      sq ? `1^2 + 2^2 + ... + ${N}^2 = n(n + 1)(2n + 1) ÷ 6 = ${N} × ${N + 1} × ${2 * N + 1} ÷ 6 = ${n(S)}. Average = ${n(S)} ÷ ${N} = ${n(A)}.`
        : `1^3 + 2^3 + ... + ${N}^3 = [n(n + 1) ÷ 2]^2 = ${n(N * (N + 1) / 2)}^2 = ${n(S)}. Average = ${n(S)} ÷ ${N} = ${n(A)}.`,
      sq ? `1^2 + 2^2 + ... + ${N}^2 = n(n + 1)(2n + 1) ÷ 6 = ${N} × ${N + 1} × ${2 * N + 1} ÷ 6 = ${n(S)}। औसत = ${n(S)} ÷ ${N} = ${n(A)}।`
        : `1^3 + 2^3 + ... + ${N}^3 = [n(n + 1) ÷ 2]^2 = ${n(N * (N + 1) / 2)}^2 = ${n(S)}। औसत = ${n(S)} ÷ ${N} = ${n(A)}।`, "none", 1);
  },
};

const ratioThree = {
  id: "ratioThree", levels: ["hard", "advanced"],
  cands: () => thin(cross([[1, 2, 3], [2, 3, 4], [2, 3, 5], [3, 4, 5], [1, 3, 5], [3, 5, 7], [2, 5, 8], [4, 5, 6], [1, 2, 4], [3, 4, 8]], range(10, 80), ["big", "small"]).filter(([r, A]) => isInt(3 * A / sum(r))), (p) => [p[0], p[2]]).concat(
    cross([[1, 2, 3], [2, 3, 4], [2, 3, 5], [3, 4, 5], [1, 3, 5], [3, 5, 7], [2, 5, 8], [4, 5, 6], [1, 2, 4], [3, 4, 8]], range(10, 80), ["big", "small"]).filter(([r, A]) => isInt(3 * A / sum(r))).filter((_, i) => i % 3 === 1)),
  build: (t, prm) => {
    const [r, A, ask] = prm; const k = 3 * A / sum(r); const nums = r.map((x) => x * k); const ans = ask === "big" ? nums[2] : nums[0];
    return AQ(t, `Three numbers are in the ratio ${r.join(" : ")} and their average is ${A}. What is the ${ask === "big" ? "largest" : "smallest"} number?`,
      `तीन संख्याएँ ${r.join(" : ")} के अनुपात में हैं और उनका औसत ${A} है। ${ask === "big" ? "सबसे बड़ी" : "सबसे छोटी"} संख्या क्या है?`,
      ans, [A * (ask === "big" ? r[2] : r[0]) / sum(r), A, ask === "big" ? nums[1] : nums[1]].filter((v) => v !== ans), () => 3 * A * (ask === "big" ? r[2] : r[0]) / r.reduce((s, x) => s + x, 0),
      `Sum = 3 × ${A} = ${3 * A}. Ratio parts add up to ${sum(r)}, so one part = ${3 * A} ÷ ${sum(r)} = ${n(k)}. The numbers are ${nums.map(n).join(", ")}; the ${ask === "big" ? "largest" : "smallest"} is ${n(ans)}.`,
      `योग = 3 × ${A} = ${3 * A}। अनुपात के भागों का योग ${sum(r)} है, अतः एक भाग = ${3 * A} ÷ ${sum(r)} = ${n(k)}। संख्याएँ ${nums.map(n).join(", ")} हैं; ${ask === "big" ? "सबसे बड़ी" : "सबसे छोटी"} ${n(ans)} है।`, "none", 1);
  },
};

// 8 numbers: first two, next three, then x, x + d1, x + d2.
const eightNums = {
  id: "eightNums", levels: ["hard", "advanced"],
  cands: () => cross(range(15, 40), range(-6, 6), range(-6, 6), [2, 3, 4, 5], [5, 6, 7, 8, 9]).map(([A, a, b, d1, d2]) => [A, A + a, A + b, d1, d2]).filter(([A, B, C, d1, d2]) => { if (d2 <= d1 || B === C) return false; const rest = 8 * A - 2 * B - 3 * C; const x = (rest - d1 - d2) / 3; return isInt(x) && x > 0; }),
  build: (t, prm) => {
    const [A, B, C, d1, d2] = prm; const rest = 8 * A - 2 * B - 3 * C; const x = (rest - d1 - d2) / 3; const ans = x + d2;
    return AQ(t, `The average of 8 numbers is ${A}. The average of the first 2 is ${B} and the average of the next 3 is ${C}. The 6th number is ${d1} less than the 7th and ${d2} less than the 8th. What is the 8th number?`,
      `8 संख्याओं का औसत ${A} है। पहली 2 का औसत ${B} और अगली 3 का औसत ${C} है। 6वीं संख्या 7वीं से ${d1} कम और 8वीं से ${d2} कम है। 8वीं संख्या क्या है?`,
      ans, [x, x + d1, (rest + d1 + d2) / 3].filter((v) => v !== ans && isInt(v)), () => { const r = A * 8 - B * 2 - C * 3; return (r - d1 - d2) / 3 + d2; },
      `Sum of 8 = ${8 * A}. First 2 = ${2 * B}, next 3 = ${3 * C}, so the last 3 add up to ${8 * A} − ${2 * B} − ${3 * C} = ${rest}. With the 6th = x: x + (x + ${d1}) + (x + ${d2}) = ${rest}, so 3x = ${rest - d1 - d2} and x = ${x}. The 8th = ${x} + ${d2} = ${ans}.`,
      `8 का योग = ${8 * A}। पहली 2 = ${2 * B}, अगली 3 = ${3 * C}, अतः अंतिम 3 का योग = ${8 * A} − ${2 * B} − ${3 * C} = ${rest}। 6वीं = x लें: x + (x + ${d1}) + (x + ${d2}) = ${rest}, अतः 3x = ${rest - d1 - d2} और x = ${x}। 8वीं = ${x} + ${d2} = ${ans}।`, "none", 1);
  },
};

// Some numbers have average A; one more number x makes it B: how many were there?
const avgCount = {
  id: "avgCount", levels: ["hard", "advanced"],
  cands: () => cross(range(12, 60), range(-9, 9), range(4, 30)).map(([A, d, N]) => [A, A + d, N]).filter(([A, B, N]) => B !== A && A + (B - A) * (N + 1) > 0 && A + (B - A) * (N + 1) < 250 && isInt(A + (B - A) * (N + 1))),
  build: (t, prm) => {
    const [A, B, N] = prm; const x = clean(A + (B - A) * (N + 1));
    return AQ(t, `The average of some numbers is ${A}. When the number ${x} is added to them, the average becomes ${B}. How many numbers were there at first?`,
      `कुछ संख्याओं का औसत ${A} है। जब इनमें संख्या ${x} जोड़ दी जाती है, तो औसत ${B} हो जाता है। प्रारंभ में कितनी संख्याएँ थीं?`,
      N, [N + 1, N - 1, Math.abs(x - A) / Math.abs(B - A)].filter((v) => v !== N), () => (x - B) / (B - A),
      `With N numbers: N × ${A} + ${x} = (N + 1) × ${B}, so ${B > A ? `N × (${B} − ${A}) = ${x} − ${B}` : `N × (${A} − ${B}) = ${B} − ${x}`}, i.e. N = ${n(Math.abs(x - B))} ÷ ${n(Math.abs(B - A))} = ${N}.`,
      `N संख्याएँ हों तो: N × ${A} + ${x} = (N + 1) × ${B}, अतः ${B > A ? `N × (${B} − ${A}) = ${x} − ${B}` : `N × (${A} − ${B}) = ${B} − ${x}`}, यानी N = ${n(Math.abs(x - B))} ÷ ${n(Math.abs(B - A))} = ${N}।`, "none", 1);
  },
};

// The k-th number changes by k (1, 2, ..., N): the average changes by (N + 1)/2.
const seqIncrease = {
  id: "seqIncrease", levels: ["hard", "advanced"],
  cands: () => cross(range(5, 20), range(15, 80), ["inc", "dec"]).filter(([N, A, d]) => d === "inc" || A > N),
  build: (t, prm) => {
    const [N, A, d] = prm; const k = clean((N + 1) / 2); const B = clean(d === "inc" ? A + k : A - k);
    return AQ(t, `The average of ${N} numbers is ${A}. If the first number is ${d === "inc" ? "increased" : "decreased"} by 1, the second by 2, the third by 3 and so on up to the ${ORD(N)} number by ${N}, what is the new average?`,
      `${N} संख्याओं का औसत ${A} है। यदि पहली संख्या में 1, दूसरी में 2, तीसरी में 3 और इसी प्रकार ${ORDHf(N)} संख्या में ${N} ${d === "inc" ? "जोड़ दिया जाए" : "की कमी की जाए"}, तो नया औसत क्या होगा?`,
      B, [d === "inc" ? A + N : A - N, d === "inc" ? A + N / 2 : A - N / 2, d === "inc" ? A + N * (N + 1) / 2 : A - k - 1], () => A + (d === "inc" ? 1 : -1) * range(1, N).reduce((s, x) => s + x, 0) / N,
      `The sum changes by 1 + 2 + ... + ${N} = ${N * (N + 1) / 2}, so the average changes by ${N * (N + 1) / 2} ÷ ${N} = ${n(k)}. New average = ${A} ${d === "inc" ? "+" : "−"} ${n(k)} = ${n(B)}.`,
      `योग में 1 + 2 + ... + ${N} = ${N * (N + 1) / 2} का परिवर्तन होता है, अतः औसत में ${N * (N + 1) / 2} ÷ ${N} = ${n(k)} का परिवर्तन। नया औसत = ${A} ${d === "inc" ? "+" : "−"} ${n(k)} = ${n(B)}।`, "none", 0.5);
  },
};

const THIN = {
  avgList: null, constChange: (p) => [p[1], p[2]], removeOne: (p) => [p[0], p[1]], addOne: (p) => [p[0], p[1]], excludedNum: (p) => [p[0], p[1]],
  middleResult: (p) => [p[0], p[1]], wrongRecord: (p) => [p[0], p[1], p[2] % 7], abcPairs: (p) => [p[0], p[1], p[2] % 5], threeAvg: (p) => [p[0], p[1]],
  rangeDiv: (p) => [p[2], p[1] % 37, p[0] % 11], primeAvg: (p) => PRIMES.filter((x) => x >= p[0] && x <= p[1]), eightNums: (p) => [p[0], p[1]], avgCount: (p) => [p[0], p[2]],
};
const thinned = (k) => { if (THIN[k.id]) { const orig = k.cands; k.cands = () => thin(orig(), THIN[k.id]); } return k; };

const KINDS = guard([
  avgList, avgFirstN, consecLargest, constChange, removeOne, addOne, missingNum, excludedNum, primeAvg, factorAvg,
  middleResult, wrongRecord, groupsRest, abcPairs, threeAvg, rangeDiv, consecEnds, moreConsec,
  powAvg, ratioThree, eightNums, avgCount, seqIncrease,
].map(thinned));

const PREFIX = "Average · Average of Numbers";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
