// Ratio & Proportion · Proportion: fourth, third and mean proportionals,
// direct and inverse proportion, variation. Every answer is worked out again
// in `v`; the wrong options are the usual slips (direct used for inverse,
// the terms taken in the wrong order, the square forgotten).
const L = require("./rp-lib");
const { n, clean, isInt, cross, who, AQ, RQ, rat, thin, pick, range, dec2, guard, gcd } = L;
const { fillTopic } = require("./gen");

const sq = (x) => Math.round(Math.sqrt(x)) ** 2 === x;
const RATIOS = [[1, 2], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [5, 7], [4, 7], [2, 5], [3, 7], [5, 8], [7, 9], [7, 8], [5, 9], [4, 9], [7, 10]];

// ---------------------------------------------------------------- EASY
const fourthProp = {
  id: "fourthProp", levels: ["easy", "medium", "advanced"],
  cands: () => cross(range(2, 30), range(3, 60), range(4, 90)).filter(([a, b, c]) => a !== b && b !== c && isInt(b * c / a) && b * c / a <= 400 && a < c),
  build: (t, prm) => {
    const [a, b, c] = prm; const d = b * c / a;
    return AQ(t, `What is the fourth proportional to ${a}, ${b} and ${c}?`, `${a}, ${b} और ${c} का चतुर्थानुपाती क्या है?`,
      d, [a * c / b, a * b / c, b * b / a].filter((v) => v !== d), () => (c / a) * b,
      `${a} : ${b} = ${c} : x, so ${a}x = ${b} × ${c} = ${b * c} and x = ${b * c} ÷ ${a} = ${n(d)}.`,
      `${a} : ${b} = ${c} : x, अतः ${a}x = ${b} × ${c} = ${b * c} और x = ${b * c} ÷ ${a} = ${n(d)}।`, "none", 1);
  },
};

const thirdProp = {
  id: "thirdProp", levels: ["easy", "medium"],
  cands: () => cross(range(2, 40), range(3, 60)).filter(([a, b]) => a < b && isInt(b * b / a) && b * b / a <= 600),
  build: (t, prm) => {
    const [a, b] = prm; const c = b * b / a;
    return AQ(t, `What is the third proportional to ${a} and ${b}?`, `${a} और ${b} का तृतीयानुपाती क्या है?`,
      c, [a * a / b, Math.sqrt(a * b), 2 * b - a, a * b].filter((v) => v !== c), () => b / a * b,
      `${a} : ${b} = ${b} : x, so x = ${b} × ${b} ÷ ${a} = ${b * b} ÷ ${a} = ${n(c)}.`,
      `${a} : ${b} = ${b} : x, अतः x = ${b} × ${b} ÷ ${a} = ${b * b} ÷ ${a} = ${n(c)}।`, "none", 1);
  },
};

const meanProp = {
  id: "meanProp", levels: ["easy", "medium"],
  cands: () => cross(range(2, 80), range(3, 200)).filter(([a, b]) => a < b && sq(a * b) && a * b !== 144),
  build: (t, prm) => {
    const [a, b] = prm; const m = Math.sqrt(a * b);
    return AQ(t, `What is the mean proportional between ${a} and ${b}?`, `${a} और ${b} का मध्यानुपाती क्या है?`,
      m, [(a + b) / 2, a * b / 2, b * b / a].filter((v) => v !== m), () => Math.sqrt(b * a),
      `${a} : x = x : ${b}, so x² = ${a} × ${b} = ${a * b} and x = √${a * b} = ${n(m)}.`,
      `${a} : x = x : ${b}, अतः x² = ${a} × ${b} = ${a * b} और x = √${a * b} = ${n(m)}।`, "none", 1);
  },
};

const meanPropFind = {
  id: "meanPropFind", levels: ["easy", "medium", "advanced"],
  cands: () => cross(range(2, 40), range(4, 60)).filter(([a, m]) => isInt(m * m / a) && m * m / a !== a && m * m / a <= 900),
  build: (t, prm) => {
    const [a, m] = prm; const x = m * m / a;
    return AQ(t, `The mean proportional between ${a} and a number is ${m}. What is the number?`, `${a} और एक संख्या का मध्यानुपाती ${m} है। वह संख्या क्या है?`,
      x, [2 * m - a, m * a, m * m].filter((v) => v !== x), () => (m / a) * m,
      `${m}² = ${a} × x, so x = ${m * m} ÷ ${a} = ${n(x)}.`, `${m}² = ${a} × x, अतः x = ${m * m} ÷ ${a} = ${n(x)}।`, "none", 1);
  },
};

const ITEMS = [["pens", "पेन", "rs"], ["notebooks", "कॉपियाँ", "rs"], ["kg of rice", "kg चावल", "rs"], ["metres of cloth", "मीटर कपड़ा", "rs"], ["litres of milk", "लीटर दूध", "rs"]];
const directCost = {
  id: "directCost", levels: ["easy"],
  cands: () => cross([0, 1, 2, 3, 4], range(3, 30), range(30, 2000, 10), range(2, 40)).filter(([i, q, c, r]) => r !== q && isInt(c / q) && isInt(c * r / q) && c * r / q <= 5000),
  build: (t, prm) => {
    const [i, q, c, r] = prm; const [en, hi] = ITEMS[i]; const x = c * r / q;
    return AQ(t, `If ${q} ${en} cost ₹${n(c)}, what do ${r} ${en} cost?`, `यदि ${q} ${hi} का मूल्य ₹${n(c)} है, तो ${r} ${hi} का मूल्य क्या होगा?`,
      x, [c * q / r, c + (r - q), x + c / q].filter((v) => v !== x && v > 0), () => r * (c / q),
      `One costs ${n(c)} ÷ ${q} = ₹${n(c / q)}. ${r} cost ${r} × ${n(c / q)} = ₹${n(x)}.`,
      `एक का मूल्य ${n(c)} ÷ ${q} = ₹${n(c / q)}। ${r} का मूल्य ${r} × ${n(c / q)} = ₹${n(x)}।`, "rs", c / q);
  },
};

const inverseWork = {
  id: "inverseWork", levels: ["easy", "medium"],
  cands: () => cross(range(4, 40), range(6, 60), range(3, 60)).filter(([m, d, m2]) => m !== m2 && isInt(m * d / m2) && !(m === 15 && d === 20 && m2 === 12)),
  build: (t, prm) => {
    const [m, d, m2] = prm; const x = m * d / m2;
    return AQ(t, `${m} workers can build a wall in ${d} days. How many days will ${m2} workers take to build the same wall?`,
      `${m} मजदूर एक दीवार ${d} दिनों में बना सकते हैं। ${m2} मजदूर वही दीवार कितने दिनों में बनाएँगे?`,
      x, [d * m2 / m, d + m - m2, x + 1].filter((v) => v !== x && v > 0 && dec2(v)), () => (m / m2) * d,
      `Workers and days are in inverse proportion: ${m} × ${d} = ${m * d} worker-days. ${m * d} ÷ ${m2} = ${n(x)} days.`,
      `मजदूर और दिन व्युत्क्रम अनुपात में हैं: ${m} × ${d} = ${m * d} मजदूर-दिन। ${m * d} ÷ ${m2} = ${n(x)} दिन।`, "day", 1);
  },
};

const DUP = {
  dup: ["duplicate ratio", "वर्गानुपात", (a, b) => [a * a, b * b]],
  trip: ["triplicate ratio", "घनानुपात", (a, b) => [a ** 3, b ** 3]],
  sub: ["sub-duplicate ratio", "वर्गमूलानुपात", (a, b) => [Math.sqrt(a), Math.sqrt(b)]],
  subt: ["sub-triplicate ratio", "घनमूलानुपात", (a, b) => [Math.cbrt(a), Math.cbrt(b)]],
};
const dupRatio = {
  id: "dupRatio", levels: ["easy", "medium"],
  cands: () => { const o = []; for (const [a, b] of RATIOS) { o.push(["dup", a, b], ["trip", a, b]); if (a <= 7 && b <= 9) o.push(["sub", a * a, b * b]); if (a <= 5 && b <= 6) o.push(["subt", a ** 3, b ** 3]); } return o; },
  build: (t, prm) => {
    const [ty, a, b] = prm; const [en, hi, f] = DUP[ty]; const ans = f(a, b).map((x) => Math.round(x));
    return RQ(t, `What is the ${en} of ${a} : ${b}?`, `${a} : ${b} का ${hi} क्या है?`,
      ans, [[a * 2, b * 2], [b, a], ty === "dup" ? [a ** 3, b ** 3] : [a * a, b * b]], () => f(a, b).map((x) => Math.round(x)),
      `The ${en} of a : b is ${ty === "dup" ? "a² : b²" : ty === "trip" ? "a³ : b³" : ty === "sub" ? "√a : √b" : "∛a : ∛b"}: ${rat(...ans)}.`,
      `a : b का ${hi} ${ty === "dup" ? "a² : b²" : ty === "trip" ? "a³ : b³" : ty === "sub" ? "√a : √b" : "∛a : ∛b"} होता है: ${rat(...ans)}।`);
  },
};

const compoundRatio = {
  id: "compoundRatio", levels: ["easy", "medium", "advanced"],
  cands: () => cross(RATIOS, RATIOS, RATIOS).filter(([[a, b], [c, d], [e, f]], i) => i % 11 === 0 && rat(a * c * e, b * d * f).split(" : ").every((v) => Number(v) <= 200)),
  build: (t, prm) => {
    const [[a, b], [c, d], [e, f]] = prm;
    return RQ(t, `What is the compound ratio of ${a} : ${b}, ${c} : ${d} and ${e} : ${f}?`, `${a} : ${b}, ${c} : ${d} और ${e} : ${f} का मिश्रित अनुपात क्या है?`,
      [a * c * e, b * d * f], [[a + c + e, b + d + f], [b * d * f, a * c * e], [a * c, b * d]], () => [a * c * e * 3, b * d * f * 3],
      `The compound ratio multiplies the terms: (${a} × ${c} × ${e}) : (${b} × ${d} × ${f}) = ${a * c * e} : ${b * d * f} = ${rat(a * c * e, b * d * f)}.`,
      `मिश्रित अनुपात में पदों का गुणा होता है: (${a} × ${c} × ${e}) : (${b} × ${d} × ${f}) = ${a * c * e} : ${b * d * f} = ${rat(a * c * e, b * d * f)}।`);
  },
};

const inverseSpeed = {
  id: "inverseSpeed", levels: ["easy", "medium", "advanced"],
  cands: () => cross(range(20, 90, 5), range(2, 12), range(30, 120, 5)).filter(([s, h, s2]) => s !== s2 && dec2(s * h / s2) && isInt(s * h / s2 * 4)),
  build: (t, prm) => {
    const [s, h, s2] = prm; const x = clean(s * h / s2);
    return AQ(t, `A car takes ${h} hours to cover a journey at ${s} km/h. How long will it take at ${s2} km/h?`, `एक कार ${s} km/h की चाल से एक यात्रा ${h} घंटे में पूरी करती है। ${s2} km/h की चाल से उसे कितना समय लगेगा?`,
      x, [h * s2 / s, h + (s - s2) / 10, x + 1].filter((v) => v > 0 && v !== x), () => (s / s2) * h,
      `Distance = ${s} × ${h} = ${s * h} km. Time = ${s * h} ÷ ${s2} = ${n(x)} hours (speed up, time down: inverse proportion).`,
      `दूरी = ${s} × ${h} = ${s * h} km। समय = ${s * h} ÷ ${s2} = ${n(x)} घंटे (चाल बढ़ी, समय घटा: व्युत्क्रम अनुपात)।`, "hr", 0.5);
  },
};

const directDistance = {
  id: "directDistance", levels: ["easy", "medium"],
  cands: () => cross(range(2, 20), range(30, 400, 5), range(3, 40)).filter(([f, d, f2]) => f !== f2 && isInt(d / f) && d / f >= 8 && d / f <= 25 && isInt(d * f2 / f)),
  build: (t, prm) => {
    const [f, d, f2] = prm; const x = d * f2 / f;
    return AQ(t, `A motorbike covers ${d} km on ${f} litres of petrol. How far will it go on ${f2} litres?`, `एक मोटरसाइकिल ${f} लीटर पेट्रोल में ${d} km चलती है। ${f2} लीटर में वह कितनी दूर जाएगी?`,
      x, [d * f / f2, d + (f2 - f) * 10, x + d / f].filter((v) => v > 0 && v !== x && dec2(v)), () => f2 * (d / f),
      `Per litre: ${d} ÷ ${f} = ${n(d / f)} km. On ${f2} litres: ${f2} × ${n(d / f)} = ${n(x)} km.`,
      `प्रति लीटर: ${d} ÷ ${f} = ${n(d / f)} km। ${f2} लीटर में: ${f2} × ${n(d / f)} = ${n(x)} km।`, "km", 1);
  },
};

// ---------------------------------------------------------------- MEDIUM
// Add x to each of a, b, c, d so that they are in proportion.
const ADDP = () => { const o = []; for (const x of range(1, 12)) for (const A of range(4, 40)) for (const B of range(A + 2, 60)) for (const C of range(A + 1, 60)) { const D = B * C / A; if (isInt(D) && D <= 150 && C !== B) o.push([A - x, B - x, C - x, D - x, x]); } return o.filter(([a, b, c, d]) => a > 0 && b > 0 && c > 0 && d > 0 && a * d !== b * c); };
const addToProp = {
  id: "addToProp", levels: ["medium", "hard", "advanced"],
  cands: () => thin(ADDP(), (p) => [p[4], p[0]]),
  build: (t, prm) => {
    const [a, b, c, d, x] = prm;
    return AQ(t, `What number must be added to each of ${a}, ${b}, ${c} and ${d} so that they are in proportion?`, `${a}, ${b}, ${c} और ${d} में से प्रत्येक में कौन-सी संख्या जोड़ी जाए कि वे समानुपात में हों?`,
      x, [x + 1, x + 2, x > 1 ? x - 1 : x + 3], () => (b * c - a * d) / (a + d - b - c),
      `(${a} + x)(${d} + x) = (${b} + x)(${c} + x). The x² cancel: ${a * d} + ${a + d}x = ${b * c} + ${b + c}x, so ${a + d - b - c}x = ${b * c - a * d} and x = ${x}. Check: ${a + x} : ${b + x} = ${c + x} : ${d + x}.`,
      `(${a} + x)(${d} + x) = (${b} + x)(${c} + x)। x² कट जाते हैं: ${a * d} + ${a + d}x = ${b * c} + ${b + c}x, अतः ${a + d - b - c}x = ${b * c - a * d} और x = ${x}। जाँच: ${a + x} : ${b + x} = ${c + x} : ${d + x}।`, "none", 1);
  },
};

const componendo = {
  id: "componendo", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(2, 20), range(1, 15)).filter(([m, k]) => m > k && gcd(m, k) === 1 && (m + k) % 2 === 0),
  build: (t, prm) => {
    const [m, k] = prm; const X = (m + k) / 2, Y = (m - k) / 2;
    return RQ(t, `If (x + y) : (x − y) = ${m} : ${k}, what is x : y?`, `यदि (x + y) : (x − y) = ${m} : ${k} है, तो x : y क्या है?`,
      [m + k, m - k], [[m, k], [m - k, m + k], [m + k, k]], () => [X * 2, Y * 2],
      `Componendo and dividendo: x/y = (${m} + ${k}) / (${m} − ${k}) = ${m + k}/${m - k}, so x : y = ${rat(m + k, m - k)}.`,
      `योगांतरानुपात से: x/y = (${m} + ${k}) / (${m} − ${k}) = ${m + k}/${m - k}, अतः x : y = ${rat(m + k, m - k)}।`);
  },
};

const varySquare = {
  id: "varySquare", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(2, 12), range(4, 400), range(2, 15)).filter(([x1, y1, x2]) => x1 !== x2 && isInt(y1 / (x1 * x1)) && isInt(y1 * x2 * x2 / (x1 * x1)) && y1 * x2 * x2 / (x1 * x1) <= 2000),
  build: (t, prm) => {
    const [x1, y1, x2] = prm; const k = y1 / (x1 * x1); const y2 = k * x2 * x2;
    return AQ(t, `y varies directly as the square of x. When x = ${x1}, y = ${y1}. What is y when x = ${x2}?`, `y, x के वर्ग के अनुक्रमानुपाती है। जब x = ${x1}, तब y = ${y1}। जब x = ${x2} हो, तो y क्या होगा?`,
      y2, [y1 * x2 / x1, y1 * x1 * x1 / (x2 * x2), k * x2].filter((v) => v !== y2 && dec2(v) && v > 0), () => y1 * (x2 / x1) ** 2,
      `y = kx²: ${y1} = k × ${x1 * x1}, so k = ${n(k)}. When x = ${x2}: y = ${n(k)} × ${x2 * x2} = ${n(y2)}.`,
      `y = kx²: ${y1} = k × ${x1 * x1}, अतः k = ${n(k)}। जब x = ${x2}: y = ${n(k)} × ${x2 * x2} = ${n(y2)}।`, "none", 1);
  },
};

const varyJoint = {
  id: "varyJoint", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(2, 20), range(2, 12), range(2, 30), range(2, 20), range(2, 12)).filter(([y1, z1, x1, y2, z2]) => isInt(x1 * z1 / y1) && isInt(x1 * z1 / y1 * y2 / z2) && (y1 !== y2 || z1 !== z2) && x1 * z1 / y1 * y2 / z2 <= 200).filter((_, i) => i % 3 === 0),
  build: (t, prm) => {
    const [y1, z1, x1, y2, z2] = prm; const k = x1 * z1 / y1; const x2 = k * y2 / z2;
    return AQ(t, `x varies directly as y and inversely as z. When y = ${y1} and z = ${z1}, x = ${x1}. What is x when y = ${y2} and z = ${z2}?`,
      `x, y के अनुक्रमानुपाती और z के व्युत्क्रमानुपाती है। जब y = ${y1} और z = ${z1}, तब x = ${x1}। जब y = ${y2} और z = ${z2} हो, तो x क्या होगा?`,
      x2, [k * z2 / y2, x1 * y2 / y1, x1 * z2 / z1].filter((v) => v !== x2 && dec2(v) && v > 0), () => x1 * (y2 / y1) * (z1 / z2),
      `x = k × y / z: ${x1} = k × ${y1}/${z1}, so k = ${n(k)}. Now x = ${n(k)} × ${y2}/${z2} = ${n(x2)}.`,
      `x = k × y / z: ${x1} = k × ${y1}/${z1}, अतः k = ${n(k)}। अब x = ${n(k)} × ${y2}/${z2} = ${n(x2)}।`, "none", 1);
  },
};

const thirdPropFind = {
  id: "thirdPropFind", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(2, 30), range(3, 400)).filter(([a, c]) => sq(a * c) && Math.sqrt(a * c) !== a && Math.sqrt(a * c) !== c && a < c),
  build: (t, prm) => {
    const [a, c] = prm; const b = Math.sqrt(a * c);
    return AQ(t, `The third proportional to ${a} and a number is ${c}. What is the number?`, `${a} और एक संख्या का तृतीयानुपाती ${c} है। वह संख्या क्या है?`,
      b, [c / a, (a + c) / 2, c * c / a].filter((v) => v !== b && dec2(v)), () => Math.sqrt(c * a),
      `${a} : x = x : ${c}, so x² = ${a} × ${c} = ${a * c} and x = ${n(b)}.`, `${a} : x = x : ${c}, अतः x² = ${a} × ${c} = ${a * c} और x = ${n(b)}।`, "none", 1);
  },
};

// Men × days × hours = work.
const mdh = {
  id: "mdh", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(6, 40), range(6, 40), [4, 5, 6, 7, 8, 9, 10], range(6, 50), [5, 6, 7, 8, 9, 10]).filter(([m, d, h, m2, h2]) => m !== m2 && isInt(m * d * h / (m2 * h2)) && m * d * h / (m2 * h2) >= 3).filter((_, i) => i % 5 === 0),
  build: (t, prm) => {
    const [m, d, h, m2, h2] = prm; const D = m * d * h / (m2 * h2);
    return AQ(t, `${m} men working ${h} hours a day can finish a job in ${d} days. In how many days will ${m2} men working ${h2} hours a day finish it?`,
      `${m} आदमी प्रतिदिन ${h} घंटे काम करके एक काम ${d} दिनों में पूरा करते हैं। ${m2} आदमी प्रतिदिन ${h2} घंटे काम करके उसे कितने दिनों में पूरा करेंगे?`,
      D, [m2 * d * h2 / (m * h), d * m / m2, d * h / h2].filter((v) => v !== D && dec2(v)), () => (m / m2) * (h / h2) * d,
      `Work = ${m} × ${d} × ${h} = ${m * d * h} man-hours. Days = ${m * d * h} ÷ (${m2} × ${h2}) = ${n(D)}.`,
      `काम = ${m} × ${d} × ${h} = ${m * d * h} मानव-घंटे। दिन = ${m * d * h} ÷ (${m2} × ${h2}) = ${n(D)}।`, "day", 1);
  },
};

// ---------------------------------------------------------------- HARD / ADVANCED
const diamondLoss = {
  id: "diamondLoss", levels: ["hard", "advanced"],
  cands: () => cross(RATIOS.concat([[1, 1], [1, 3], [1, 4], [2, 3]]), ["two", "three"]).flatMap(([[a, b], k]) => (k === "two" ? [[a, b]] : [[1, a, b], [a, b, b + 1]])).filter((r) => isInt((r.reduce((s, x) => s + x, 0) ** 2 - r.reduce((s, x) => s + x * x, 0)) * 100 / r.reduce((s, x) => s + x, 0) ** 2 * 100) && dec2((r.reduce((s, x) => s + x, 0) ** 2 - r.reduce((s, x) => s + x * x, 0)) * 100 / r.reduce((s, x) => s + x, 0) ** 2)).map((r) => [r]),
  build: (t, prm) => {
    const [r] = prm; const S = r.reduce((s, x) => s + x, 0); const Q = r.reduce((s, x) => s + x * x, 0); const P = clean((S * S - Q) * 100 / (S * S));
    return AQ(t, `The value of a diamond varies as the square of its weight. It breaks into ${r.length} pieces whose weights are in the ratio ${r.join(" : ")}. What percentage of its value is lost?`,
      `एक हीरे का मूल्य उसके भार के वर्ग के अनुक्रमानुपाती है। यह ${r.length} टुकड़ों में टूट जाता है जिनके भार ${r.join(" : ")} के अनुपात में हैं। उसके मूल्य का कितना प्रतिशत नष्ट हुआ?`,
      P, [100 - P, 100 / r.length, P / 2].filter((v) => v > 0 && v !== P && dec2(v)), () => 100 * (1 - r.reduce((s, x) => s + (x / S) ** 2, 0)),
      `Weight ${S} units: value ${S}² = ${S * S}. Pieces: ${r.map((x) => `${x}²`).join(" + ")} = ${Q}. Loss = ${S * S - Q} out of ${S * S} = ${n(P)}%.`,
      `भार ${S} इकाई: मूल्य ${S}² = ${S * S}। टुकड़े: ${r.map((x) => `${x}²`).join(" + ")} = ${Q}। हानि = ${S * S} में से ${S * S - Q} = ${n(P)}%।`, "pct", 1);
  },
};

// Cost partly fixed, partly proportional: C = a + b·n.
const partlyVaries = {
  id: "partlyVaries", levels: ["hard", "advanced"],
  cands: () => cross(range(100, 2000, 50), range(5, 60, 5), range(10, 60, 5), range(20, 90, 5), range(30, 120, 5)).filter(([a, b, n1, n2, n3]) => n1 < n2 && n3 !== n1 && n3 !== n2).filter((_, i) => i % 37 === 0),
  build: (t, prm) => {
    const [a, b, n1, n2, n3] = prm; const c1 = a + b * n1, c2 = a + b * n2, c3 = a + b * n3;
    return AQ(t, `The cost of a picnic is partly fixed and partly varies with the number of people. It costs ₹${n(c1)} for ${n1} people and ₹${n(c2)} for ${n2} people. What will it cost for ${n3} people?`,
      `एक पिकनिक का खर्च कुछ स्थिर है और कुछ लोगों की संख्या के अनुसार बदलता है। ${n1} लोगों के लिए खर्च ₹${n(c1)} और ${n2} लोगों के लिए ₹${n(c2)} है। ${n3} लोगों के लिए कितना खर्च होगा?`,
      c3, [c1 * n3 / n1, c2 * n3 / n2, c3 + a].filter((v) => v !== c3 && isInt(v)), () => { const bb = (c2 - c1) / (n2 - n1); return c1 - bb * n1 + bb * n3; },
      `${n2 - n1} more people cost ₹${n(c2 - c1)} more, so ₹${n(b)} a head. Fixed part = ${n(c1)} − ${n1} × ${b} = ₹${n(a)}. For ${n3}: ${n(a)} + ${n3} × ${b} = ₹${n(c3)}.`,
      `${n2 - n1} अधिक लोगों का खर्च ₹${n(c2 - c1)} अधिक है, अतः प्रति व्यक्ति ₹${n(b)}। स्थिर भाग = ${n(c1)} − ${n1} × ${b} = ₹${n(a)}। ${n3} के लिए: ${n(a)} + ${n3} × ${b} = ₹${n(c3)}।`, "rs", 50);
  },
};

const varyInvSquare = {
  id: "varyInvSquare", levels: ["hard", "advanced"],
  cands: () => cross(range(2, 12), range(4, 900), range(2, 15)).filter(([x1, y1, x2]) => x1 !== x2 && isInt(y1 * x1 * x1 / (x2 * x2)) && y1 * x1 * x1 / (x2 * x2) > 0),
  build: (t, prm) => {
    const [x1, y1, x2] = prm; const y2 = y1 * x1 * x1 / (x2 * x2);
    return AQ(t, `y varies inversely as the square of x. When x = ${x1}, y = ${y1}. What is y when x = ${x2}?`, `y, x के वर्ग के व्युत्क्रमानुपाती है। जब x = ${x1}, तब y = ${y1}। जब x = ${x2} हो, तो y क्या होगा?`,
      y2, [y1 * x2 * x2 / (x1 * x1), y1 * x1 / x2, y1 * x2 / x1].filter((v) => v !== y2 && dec2(v) && v > 0), () => (y1 * x1 ** 2) / x2 ** 2,
      `y × x² stays the same: ${y1} × ${x1 * x1} = ${y1 * x1 * x1}. When x = ${x2}: y = ${y1 * x1 * x1} ÷ ${x2 * x2} = ${n(y2)}.`,
      `y × x² स्थिर रहता है: ${y1} × ${x1 * x1} = ${y1 * x1 * x1}। जब x = ${x2}: y = ${y1 * x1 * x1} ÷ ${x2 * x2} = ${n(y2)}।`, "none", 1);
  },
};

// Men, days, hours and the amount of work: M1·D1·H1 / W1 = M2·D2·H2 / W2.
const mdhw = {
  id: "mdhw", levels: ["hard", "advanced"],
  cands: () => { const M = [10, 12, 15, 16, 18, 20, 24, 25, 30], W = [100, 120, 150, 180, 200, 240, 300, 360]; return thin(cross(M, [10, 12, 15, 16, 18, 20, 24], [6, 8, 9, 10], W, M, [6, 8, 9, 10], W).filter(([m, d, h, w, m2, h2, w2]) => m !== m2 && w !== w2 && isInt(m * d * h * w2 / (w * m2 * h2)) && m * d * h * w2 / (w * m2 * h2) >= 4 && m * d * h * w2 / (w * m2 * h2) <= 60), (p) => [p[0], p[1], p[4]]); },
  build: (t, prm) => {
    const [m, d, h, w, m2, h2, w2] = prm; const D = m * d * h * w2 / (w * m2 * h2);
    return AQ(t, `${m} men working ${h} hours a day dig a ${w}-metre long trench in ${d} days. In how many days will ${m2} men working ${h2} hours a day dig a ${w2}-metre trench?`,
      `${m} आदमी प्रतिदिन ${h} घंटे काम करके ${d} दिनों में ${w} मीटर लंबी खाई खोदते हैं। ${m2} आदमी प्रतिदिन ${h2} घंटे काम करके ${w2} मीटर लंबी खाई कितने दिनों में खोदेंगे?`,
      D, [m * d * h / (m2 * h2), D * w / w2 * (w2 / w) * (w / w2), d * w2 / w].filter((v) => v !== D && dec2(v) && v > 0), () => (m * d * h / w) * w2 / (m2 * h2),
      `Man-hours per metre = ${m} × ${d} × ${h} ÷ ${w} = ${n(m * d * h / w)}. For ${w2} m: ${n(m * d * h * w2 / w)} man-hours. Days = ${n(m * d * h * w2 / w)} ÷ (${m2} × ${h2}) = ${n(D)}.`,
      `प्रति मीटर मानव-घंटे = ${m} × ${d} × ${h} ÷ ${w} = ${n(m * d * h / w)}। ${w2} m के लिए: ${n(m * d * h * w2 / w)} मानव-घंटे। दिन = ${n(m * d * h * w2 / w)} ÷ (${m2} × ${h2}) = ${n(D)}।`, "day", 1);
  },
};

// x : y given, value of an expression ratio with squares: (x² + y²) : (x² − y²).
const squareExpr = {
  id: "squareExpr", levels: ["hard", "advanced"],
  cands: () => RATIOS.map(([a, b]) => [b, a]).concat(RATIOS.map(([a, b]) => [a + b, a])).filter(([a, b]) => a > b).map((r) => [r]),
  build: (t, prm) => {
    const [[a, b]] = prm;
    return RQ(t, `If x : y = ${a} : ${b}, what is (x² + y²) : (x² − y²)?`, `यदि x : y = ${a} : ${b} है, तो (x² + y²) : (x² − y²) क्या है?`,
      [a * a + b * b, a * a - b * b], [[a + b, a - b], [a * a - b * b, a * a + b * b], [a * a, b * b]], () => [(a * 2) ** 2 + (b * 2) ** 2, (a * 2) ** 2 - (b * 2) ** 2],
      `Put x = ${a}k, y = ${b}k: (${a * a} + ${b * b})k² : (${a * a} − ${b * b})k² = ${a * a + b * b} : ${a * a - b * b} = ${rat(a * a + b * b, a * a - b * b)}.`,
      `x = ${a}k, y = ${b}k रखें: (${a * a} + ${b * b})k² : (${a * a} − ${b * b})k² = ${a * a + b * b} : ${a * a - b * b} = ${rat(a * a + b * b, a * a - b * b)}।`);
  },
};

// Big pools: one set per key, so the repeat guard stays quick.
const THIN = { mdh: (p) => [p[0], p[1], p[3]], partlyVaries: (p) => [p[0], p[1]], varyInvSquare: (p) => [p[0], p[2], p[1] % 9], varyJoint: (p) => [p[0], p[1], p[3]], fourthProp: (p) => [p[0], p[1]], inverseWork: (p) => [p[0], p[2]], directCost: (p) => [p[0], p[1], p[3]], inverseSpeed: (p) => [p[0], p[2]], directDistance: (p) => [p[0], p[2]], varySquare: (p) => [p[0], p[2]] };
for (const k of [fourthProp, directCost, inverseWork, inverseSpeed, directDistance, varySquare, varyJoint, mdh, partlyVaries, varyInvSquare]) { const orig = k.cands; k.cands = () => thin(orig(), THIN[k.id]); }

const KINDS = guard([
  fourthProp, thirdProp, meanProp, meanPropFind, directCost, inverseWork, dupRatio, compoundRatio, inverseSpeed, directDistance,
  addToProp, componendo, varySquare, varyJoint, thirdPropFind, mdh,
  diamondLoss, partlyVaries, varyInvSquare, mdhw, squareExpr,
]);

const PREFIX = "Ratio & Proportion · Proportion";
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
