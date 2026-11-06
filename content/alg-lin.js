// Algebra · Linear Equations: every kind of question, level by level.
// The numbers are chosen from the answer backwards (x first, then the
// equation), so every answer is whole; v() then solves the printed equation
// again in code - by brute force or Cramer's rule - and never trusts the
// numbers it was built from.
const L = require("./alg-lib");
const { N, NQ, XQ, F, cross, crossF, range, isInt, clean, pick, thin, gcd, guard } = L;
const { fillTopic } = require("./gen");

const PREFIX = "Algebra · Linear Equations";
const sgn = (b) => (b < 0 ? `− ${-b}` : `+ ${b}`);
const term = (a, v = "x") => (a === 1 ? v : a === -1 ? `−${v}` : `${N(a)}${v}`);
// a·x + b written out: "5x + 7", "3x − 4", "x".
const lhs = (a, b, v = "x") => (b ? `${term(a, v)} ${sgn(b)}` : term(a, v));
// Solves a·x + b = c·x + d by trying every x from −300 to 300 (no algebra).
const brute = (f) => { const o = []; for (let x = -5000; x <= 5000; x++) if (Math.abs(f(x)) < 1e-9) o.push(x); return o.length === 1 ? o[0] : NaN; };
const bruteQ = (f) => { const o = []; for (let k = -1200; k <= 1200; k++) { const x = k / 4; if (Math.abs(f(x)) < 1e-9) o.push(x); } return o.length === 1 ? o[0] : NaN; };
// Two equations a1x + b1y = c1, a2x + b2y = c2 by Cramer's rule.
const cramer = (a1, b1, c1, a2, b2, c2) => { const D = a1 * b2 - a2 * b1; return D ? [(c1 * b2 - c2 * b1) / D, (a1 * c2 - a2 * c1) / D] : [NaN, NaN]; };
const eq2 = (a, b, c, x = "x", y = "y") => `${term(a, x)} ${b < 0 ? "−" : "+"} ${term(Math.abs(b), y)} = ${N(c)}`;
const SOLVE = ["Solve for x:", "Find the value of x:", "Find x if"];
const SOLVE_H = ["x का मान ज्ञात कीजिए:", "x का मान ज्ञात कीजिए:", "x ज्ञात कीजिए, यदि"];

// ---------------------------------------------------------------- EASY
const oneStep = {
  id: "oneStep", levels: ["easy"],
  cands: () => cross(range(2, 15), range(-12, 30), range(-40, 40)).filter(([a, x, b]) => x && b && Math.abs(b) % a !== 0 && a * x + b !== 0),
  build: (t, [a, x, b]) => {
    const c = a * x + b; const i = L.hashOf([a, x, b]) % 3;
    return NQ(t, `${SOLVE[i]} ${lhs(a, b)} = ${N(c)}`, `${SOLVE_H[i]} ${lhs(a, b)} = ${N(c)}`,
      x, [(c + b) / a, c - b, c / a - b], () => brute((y) => a * y + b - c),
      `${term(a)} = ${N(c)} ${b > 0 ? "−" : "+"} ${Math.abs(b)} = ${N(c - b)}, so x = ${N(c - b)} ÷ ${a} = ${N(x)}.`,
      `${term(a)} = ${N(c)} ${b > 0 ? "−" : "+"} ${Math.abs(b)} = ${N(c - b)}, अतः x = ${N(c - b)} ÷ ${a} = ${N(x)}।`);
  },
};

const bothSides = {
  id: "bothSides", levels: ["easy", "medium"],
  cands: () => cross(range(2, 12), range(1, 9), range(-15, 25), range(-30, 30)).filter(([a, c, x, b]) => a !== c && x && b).map(([a, c, x, b]) => [a, b, c, (a - c) * x + b, x]).filter(([, , , d]) => d),
  build: (t, [a, b, c, d, x]) => {
    return NQ(t, `Solve: ${lhs(a, b)} = ${lhs(c, d)}`, `हल कीजिए: ${lhs(a, b)} = ${lhs(c, d)}`,
      x, [(d + b) / (a - c), (d - b) / (a + c), (b - d) / (a - c)], () => brute((y) => a * y + b - c * y - d),
      `${term(a)} − ${term(c)} = ${N(d)} ${b > 0 ? "−" : "+"} ${Math.abs(b)}, so ${term(a - c)} = ${N(d - b)} and x = ${N(d - b)} ÷ ${a - c} = ${N(x)}.`,
      `${term(a)} − ${term(c)} = ${N(d)} ${b > 0 ? "−" : "+"} ${Math.abs(b)}, अतः ${term(a - c)} = ${N(d - b)} और x = ${N(d - b)} ÷ ${a - c} = ${N(x)}।`);
  },
};

const bracket = {
  id: "bracket", levels: ["easy"],
  cands: () => cross(range(2, 12), range(-10, 25), range(-15, 15)).filter(([a, x, b]) => x && b && x + b),
  build: (t, [a, x, b]) => {
    const c = a * (x + b);
    return NQ(t, `If ${a}(x ${sgn(b)}) = ${N(c)}, find the value of x.`, `यदि ${a}(x ${sgn(b)}) = ${N(c)} है, तो x का मान ज्ञात कीजिए।`,
      x, [c / a + b, c - b, x + 2 * b], () => brute((y) => a * (y + b) - c),
      `x ${sgn(b)} = ${N(c)} ÷ ${a} = ${N(x + b)}, so x = ${N(x + b)} ${b > 0 ? "−" : "+"} ${Math.abs(b)} = ${N(x)}.`,
      `x ${sgn(b)} = ${N(c)} ÷ ${a} = ${N(x + b)}, अतः x = ${N(x + b)} ${b > 0 ? "−" : "+"} ${Math.abs(b)} = ${N(x)}।`);
  },
};

const fracOne = {
  id: "fracOne", levels: ["easy", "medium"],
  cands: () => cross(range(2, 9), range(-12, 20), range(-20, 20)).filter(([a, k, b]) => k && b && k !== b).map(([a, k, b]) => [a, a * k, b]),
  build: (t, [a, x, b]) => {
    const c = x / a + b;
    return NQ(t, `If x/${a} ${sgn(b)} = ${N(c)}, find x.`, `यदि x/${a} ${sgn(b)} = ${N(c)} है, तो x ज्ञात कीजिए।`,
      x, [a * c + b, c - b, a * (c + b)], () => brute((y) => y / a + b - c),
      `x/${a} = ${N(c)} ${b > 0 ? "−" : "+"} ${Math.abs(b)} = ${N(c - b)}, so x = ${N(c - b)} × ${a} = ${N(x)}.`,
      `x/${a} = ${N(c)} ${b > 0 ? "−" : "+"} ${Math.abs(b)} = ${N(c - b)}, अतः x = ${N(c - b)} × ${a} = ${N(x)}।`);
  },
};

const WORD = [
  ["When $b is added to $a times a number, the result is $c. Find the number.", "किसी संख्या के $a गुने में $b जोड़ने पर $c प्राप्त होता है। वह संख्या ज्ञात कीजिए।", 1],
  ["If $b is subtracted from $a times a number, the result is $c. Find the number.", "किसी संख्या के $a गुने में से $b घटाने पर $c प्राप्त होता है। वह संख्या ज्ञात कीजिए।", -1],
];
const wordNum = {
  id: "wordNum", levels: ["easy"],
  cands: () => cross(range(2, 9), range(3, 60), range(2, 45), [0, 1]).filter(([a, x, b, w]) => w === 0 || a * x - b > 0),
  build: (t, [a, x, b, w]) => {
    const [en, hi, s] = WORD[w]; const c = a * x + s * b; const fill = (z) => z.replace("$a", a).replace("$b", b).replace("$c", c);
    return NQ(t, fill(en), fill(hi), x, [(c - s * b * -1) / a, c / a, x + 1], () => brute((y) => a * y + s * b - c),
      `Let the number be x. ${a}x ${s > 0 ? "+" : "−"} ${b} = ${c}, so ${a}x = ${c - s * b} and x = ${N(x)}.`,
      `माना संख्या x है। ${a}x ${s > 0 ? "+" : "−"} ${b} = ${c}, अतः ${a}x = ${c - s * b} और x = ${N(x)}।`, { positive: true, whole: true });
  },
};

// One number is k times the other (or k more than the other); their sum is S.
const twoNums = {
  id: "twoNums", levels: ["easy", "medium"],
  cands: () => cross(["times", "more"], range(2, 40), range(2, 60)).filter(([w, k, x]) => (w === "times" ? k <= 9 : k > 3)),
  build: (t, [w, k, x]) => {
    if (w === "times") {
      const S = x * (k + 1);
      return NQ(t, `One number is ${k} times another number. If their sum is ${S}, find the smaller number.`, `एक संख्या दूसरी संख्या की ${k} गुनी है। यदि उनका योग ${S} है, तो छोटी संख्या ज्ञात कीजिए।`,
        x, [S / k, k * x, x + k], () => brute((y) => y + k * y - S),
        `Let the smaller number be x; the other is ${k}x. x + ${k}x = ${S}, so ${k + 1}x = ${S} and x = ${x}.`,
        `माना छोटी संख्या x है; दूसरी ${k}x है। x + ${k}x = ${S}, अतः ${k + 1}x = ${S} और x = ${x}।`, { positive: true, whole: true });
    }
    const S = 2 * x + k;
    return NQ(t, `The sum of two numbers is ${S} and one of them exceeds the other by ${k}. Find the larger number.`, `दो संख्याओं का योग ${S} है और एक संख्या दूसरी से ${k} अधिक है। बड़ी संख्या ज्ञात कीजिए।`,
      x + k, [x, (S + 2 * k) / 2, S - x], () => brute((y) => y + (y - k) - S),
      `Let the larger be x; the other is x − ${k}. 2x − ${k} = ${S}, so 2x = ${S + k} and x = ${x + k}.`,
      `माना बड़ी संख्या x है; दूसरी x − ${k} है। 2x − ${k} = ${S}, अतः 2x = ${S + k} और x = ${x + k}।`, { positive: true, whole: true });
  },
};

// n consecutive integers / even / odd numbers with sum S.
const CON = { int: [1, "consecutive integers", "क्रमागत पूर्णांकों"], even: [2, "consecutive even numbers", "क्रमागत सम संख्याओं"], odd: [2, "consecutive odd numbers", "क्रमागत विषम संख्याओं"] };
const consec = {
  id: "consec", levels: ["easy", "medium"],
  cands: () => cross([3, 4, 5], range(5, 99), ["int", "even", "odd"], ["big", "small"]).filter(([n, lo, ty]) => ty === "int" || (ty === "even" ? lo % 2 === 0 : lo % 2 === 1)),
  build: (t, [n, lo, ty, ask]) => {
    const [d, en, hi] = CON[ty]; const nums = range(0, n - 1).map((i) => lo + i * d); const S = nums.reduce((a, b) => a + b, 0); const ans = ask === "big" ? nums[n - 1] : lo;
    return NQ(t, `The sum of ${n} ${en} is ${S}. What is the ${ask === "big" ? "largest" : "smallest"} of them?`, `${n} ${hi} का योग ${S} है। इनमें ${ask === "big" ? "सबसे बड़ी" : "सबसे छोटी"} संख्या कौन-सी है?`,
      ans, [ask === "big" ? lo : nums[n - 1], S / n, ans + d], () => { for (let y = -500; y <= 500; y++) { const s = range(0, n - 1).reduce((acc, i) => acc + y + i * d, 0); if (s === S && (ty === "int" || Math.abs(y % 2) === (ty === "odd" ? 1 : 0))) return ask === "big" ? y + (n - 1) * d : y; } return NaN; },
      `Let the smallest be x. x + ${range(1, n - 1).map((i) => `(x + ${i * d})`).join(" + ")} = ${S}, so ${n}x + ${S - n * lo} = ${S} and x = ${lo}. The numbers are ${nums.join(", ")}, so the ${ask === "big" ? "largest" : "smallest"} is ${ans}.`,
      `माना सबसे छोटी संख्या x है। x + ${range(1, n - 1).map((i) => `(x + ${i * d})`).join(" + ")} = ${S}, अतः ${n}x + ${S - n * lo} = ${S} और x = ${lo}। संख्याएँ ${nums.join(", ")} हैं, अतः ${ask === "big" ? "सबसे बड़ी" : "सबसे छोटी"} ${ans} है।`, { positive: true, whole: true, step: d });
  },
};

// Rectangle: length is k more than breadth (or k times), perimeter P.
const rect = {
  id: "rect", levels: ["easy", "medium"],
  cands: () => cross(range(3, 40), range(2, 30), ["more", "twice"]).filter(([b, k, w]) => w === "more" || k <= 4),
  build: (t, [b, k, w]) => {
    const l = w === "more" ? b + k : k * b; const P = 2 * (l + b);
    const q = w === "more" ? `The length of a rectangle is ${k} m more than its breadth. If its perimeter is ${P} m, find its length.` : `The length of a rectangle is ${k} times its breadth. If its perimeter is ${P} m, find its length.`;
    const qh = w === "more" ? `एक आयत की लंबाई उसकी चौड़ाई से ${k} m अधिक है। यदि उसका परिमाप ${P} m है, तो उसकी लंबाई ज्ञात कीजिए।` : `एक आयत की लंबाई उसकी चौड़ाई की ${k} गुनी है। यदि उसका परिमाप ${P} m है, तो उसकी लंबाई ज्ञात कीजिए।`;
    return NQ(t, q, qh, l, [b, P / 2, P / 4 + k], () => brute((y) => 2 * (y + (w === "more" ? y - k : y / k)) - P),
      w === "more" ? `Let the breadth be x m; length = (x + ${k}) m. 2(x + x + ${k}) = ${P}, so 2x + ${k} = ${P / 2}, x = ${b} and length = ${l} m.` : `Let the breadth be x m; length = ${k}x m. 2(${k}x + x) = ${P}, so ${k + 1}x = ${P / 2}, x = ${b} and length = ${l} m.`,
      w === "more" ? `माना चौड़ाई x m है; लंबाई = (x + ${k}) m। 2(x + x + ${k}) = ${P}, अतः 2x + ${k} = ${P / 2}, x = ${b} और लंबाई = ${l} m।` : `माना चौड़ाई x m है; लंबाई = ${k}x m। 2(${k}x + x) = ${P}, अतः ${k + 1}x = ${P / 2}, x = ${b} और लंबाई = ${l} m।`,
      { positive: true, whole: true, fmtv: (z) => `${N(z)} m` });
  },
};

const valueAt = {
  id: "valueAt", levels: ["easy", "medium"],
  cands: () => crossF([range(2, 9), range(-9, 15), range(-20, 20), range(2, 9), range(-15, 15)], (([a, x, b, p, r]) => x && b && r && a !== p && L.hashOf([a, x, b, p, r]) % 5 === 0)),
  build: (t, [a, x, b, p, r]) => {
    const c = a * x + b; const ans = p * x + r;
    return NQ(t, `If ${lhs(a, b)} = ${N(c)}, what is the value of ${lhs(p, r)}?`, `यदि ${lhs(a, b)} = ${N(c)} है, तो ${lhs(p, r)} का मान क्या है?`,
      ans, [x, p * c + r, ans + p], () => { const y = brute((z) => a * z + b - c); return p * y + r; },
      `${term(a)} = ${N(c - b)}, so x = ${N(x)}. Then ${lhs(p, r)} = ${p} × (${N(x)}) ${sgn(r)} = ${N(ans)}.`,
      `${term(a)} = ${N(c - b)}, अतः x = ${N(x)}। तब ${lhs(p, r)} = ${p} × (${N(x)}) ${sgn(r)} = ${N(ans)}।`);
  },
};

// ₹5 and ₹10 coins (or ₹10 and ₹20 notes): count and total value.
const COINS = [[5, 10, "coins"], [2, 5, "coins"], [10, 20, "notes"], [10, 50, "notes"], [20, 50, "notes"], [50, 100, "notes"]];
const coins = {
  id: "coins", levels: ["easy", "medium", "hard"],
  cands: () => cross(range(0, COINS.length - 1), range(5, 40), range(5, 40)).filter(([i, a, b]) => a !== b),
  build: (t, [i, a, b]) => {
    const [lo, hi, kind] = COINS[i]; const n = a + b; const V = lo * a + hi * b; const hk = kind === "coins" ? "सिक्के" : "नोट";
    return NQ(t, `A bag has only ₹${lo} and ₹${hi} ${kind}, ${n} in all, worth ₹${V}. How many ₹${hi} ${kind} are there?`, `एक थैले में केवल ₹${lo} और ₹${hi} के ${hk} हैं, कुल ${n}, जिनका मूल्य ₹${V} है। ₹${hi} के कितने ${hk} हैं?`,
      b, [a, V / hi, n - Math.floor(V / hi)], () => brute((y) => lo * (n - y) + hi * y - V),
      `Let the ₹${hi} ${kind} be x; then the ₹${lo} ${kind} are ${n} − x. ${hi}x + ${lo}(${n} − x) = ${V}, so ${hi - lo}x = ${V - lo * n} and x = ${b}.`,
      `माना ₹${hi} के ${hk} x हैं; तब ₹${lo} के ${hk} ${n} − x हैं। ${hi}x + ${lo}(${n} − x) = ${V}, अतः ${hi - lo}x = ${V - lo * n} और x = ${b}।`, { positive: true, whole: true });
  },
};

// ---------------------------------------------------------------- MEDIUM
const fracTwo = {
  id: "fracTwo", levels: ["medium", "hard"],
  cands: () => cross(range(2, 9), range(2, 12), range(1, 12)).filter(([a, b]) => a < b && gcd(a, b) < Math.min(a, b)).map(([a, b, k]) => [a, b, k * a * b / gcd(a, b)]),
  build: (t, [a, b, x]) => {
    const c = x / a + x / b;
    if (!isInt(c)) throw new Error("not whole");
    return NQ(t, `Solve: x/${a} + x/${b} = ${c}`, `हल कीजिए: x/${a} + x/${b} = ${c}`,
      x, [c * (a + b), (c * a * b) / (a * b - 1), x + a * b / gcd(a, b)], () => brute((y) => y / a + y / b - c),
      `Multiply both sides by ${(a * b) / gcd(a, b)}: ${(b / gcd(a, b))}x + ${(a / gcd(a, b))}x = ${c * (a * b) / gcd(a, b)}, so ${(a + b) / gcd(a, b)}x = ${c * (a * b) / gcd(a, b)} and x = ${x}.`,
      `दोनों पक्षों को ${(a * b) / gcd(a, b)} से गुणा करने पर: ${(b / gcd(a, b))}x + ${(a / gcd(a, b))}x = ${c * (a * b) / gcd(a, b)}, अतः ${(a + b) / gcd(a, b)}x = ${c * (a * b) / gcd(a, b)} और x = ${x}।`);
  },
};

// (x + p)/a = (x − q)/b
const crossFrac = {
  id: "crossFrac", levels: ["medium", "hard"],
  cands: () => cross(range(2, 9), range(2, 9), range(-20, 30), range(1, 15)).filter(([a, b, x, p]) => a !== b && x + p !== 0 && isInt(((x + p) * b) / a) && x - ((x + p) * b) / a !== 0).map(([a, b, x, p]) => [a, b, x, p, x - ((x + p) * b) / a]),
  build: (t, [a, b, x, p, q]) => {
    return NQ(t, `Solve: (x ${sgn(p)})/${a} = (x ${sgn(-q)})/${b}`, `हल कीजिए: (x ${sgn(p)})/${a} = (x ${sgn(-q)})/${b}`,
      x, [-x, (a * q + b * p) / (b - a) || x + 3, x + 2], () => brute((y) => b * (y + p) - a * (y - q)),
      `Cross-multiply: ${b}(x ${sgn(p)}) = ${a}(x ${sgn(-q)}) → ${b}x ${sgn(b * p)} = ${a}x ${sgn(-a * q)} → ${term(b - a)} = ${N(-a * q - b * p)}, so x = ${N(x)}.`,
      `वज्र-गुणन से: ${b}(x ${sgn(p)}) = ${a}(x ${sgn(-q)}) → ${b}x ${sgn(b * p)} = ${a}x ${sgn(-a * q)} → ${term(b - a)} = ${N(-a * q - b * p)}, अतः x = ${N(x)}।`);
  },
};

const decimals = {
  id: "decimals", levels: ["medium"],
  cands: () => cross(range(2, 9), range(-10, 40), range(-30, 30)).filter(([a, x, b]) => x && b && b % 10 !== 0),
  build: (t, [a, x, b]) => {
    const A = a / 10, B = b / 10, C = clean(A * x + B);
    const sB = B < 0 ? `− ${N(-B)}` : `+ ${N(B)}`;
    return NQ(t, `Solve: ${N(A)}x ${sB} = ${N(C)}`, `हल कीजिए: ${N(A)}x ${sB} = ${N(C)}`,
      x, [clean((C + B) / A), clean(C - B), x * 10], () => brute((y) => clean(A * y + B) - C),
      `Multiply by 10: ${a}x ${sgn(b)} = ${N(C * 10)}, so ${a}x = ${N(C * 10 - b)} and x = ${N(x)}.`,
      `10 से गुणा करने पर: ${a}x ${sgn(b)} = ${N(C * 10)}, अतः ${a}x = ${N(C * 10 - b)} और x = ${N(x)}।`);
  },
};

// Two equations: find x, y, x + y or x − y.
const ASK2 = { x: ["x", (x, y) => x], y: ["y", (x, y) => y], s: ["x + y", (x, y) => x + y], d: ["x − y", (x, y) => x - y] };
const twoVar = {
  id: "twoVar", levels: ["medium", "hard"],
  cands: () => crossF([range(1, 7), range(-6, 6), range(1, 7), range(-6, 6), range(-8, 12), range(-8, 12), ["x", "y", "s", "d"]], (([a1, b1, a2, b2, x, y]) => b1 && b2 && x && y && x !== y && a1 * b2 - a2 * b1 !== 0 && Math.abs(a1 * b2 - a2 * b1) !== 1 && L.hashOf([a1, b1, a2, b2, x, y]) % 23 === 0)),
  build: (t, [a1, b1, a2, b2, x, y, w]) => {
    const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y; const [name, f] = ASK2[w]; const ans = f(x, y);
    return NQ(t, `If ${eq2(a1, b1, c1)} and ${eq2(a2, b2, c2)}, find the value of ${name}.`, `यदि ${eq2(a1, b1, c1)} और ${eq2(a2, b2, c2)} है, तो ${name} का मान ज्ञात कीजिए।`,
      ans, [f(y, x), x + y === ans ? x - y : x + y, ans + 1], () => { const [X, Y] = cramer(a1, b1, c1, a2, b2, c2); return f(X, Y); },
      `Solving the two equations (by elimination): x = ${N(x)}, y = ${N(y)}. Check: ${a1}(${N(x)}) ${b1 < 0 ? "−" : "+"} ${Math.abs(b1)}(${N(y)}) = ${N(c1)}. So ${name} = ${N(ans)}.`,
      `दोनों समीकरणों को (विलोपन से) हल करने पर: x = ${N(x)}, y = ${N(y)}। जाँच: ${a1}(${N(x)}) ${b1 < 0 ? "−" : "+"} ${Math.abs(b1)}(${N(y)}) = ${N(c1)}। अतः ${name} = ${N(ans)}।`);
  },
};

// A two-digit number: digit sum and the change on reversing.
const digits = {
  id: "digits", levels: ["medium", "hard", "advanced"],
  cands: () => cross(range(1, 9), range(0, 9), ["rev", "times", "sum"]).filter(([a, b, w]) => a !== b && b > 0 && (w === "rev" || (w === "sum" ? a > b : (10 * a + b) % (a + b) === 0))),
  build: (t, [a, b, w]) => {
    const num = 10 * a + b, s = a + b, rev = 10 * b + a;
    if (w === "rev") {
      const d = rev - num; const up = d > 0;
      return NQ(t, `The sum of the digits of a two-digit number is ${s}. If the digits are reversed, the number ${up ? "increases" : "decreases"} by ${Math.abs(d)}. Find the number.`,
        `दो अंकों की एक संख्या के अंकों का योग ${s} है। अंकों को उलटने पर संख्या ${Math.abs(d)} ${up ? "बढ़" : "घट"} जाती है। संख्या ज्ञात कीजिए।`,
        num, [rev, num + 9, num - 9], () => { for (let n = 10; n < 100; n++) { const t1 = Math.floor(n / 10), u = n % 10; if (t1 + u === s && 10 * u + t1 - n === d) return n; } return NaN; },
        `Let the number be 10x + y. x + y = ${s} and (10y + x) − (10x + y) = ${N(d)}, i.e. y − x = ${N(d / 9)}. So y = ${b}, x = ${a} and the number is ${num}.`,
        `माना संख्या 10x + y है। x + y = ${s} और (10y + x) − (10x + y) = ${N(d)}, अर्थात y − x = ${N(d / 9)}। अतः y = ${b}, x = ${a} और संख्या ${num} है।`, { positive: true, whole: true, step: 9 });
    }
    if (w === "sum") {
      const S = num + rev, d = a - b;
      return NQ(t, `The sum of a two-digit number and the number obtained by reversing its digits is ${S}. If the tens digit is ${d} more than the units digit, find the number.`,
        `दो अंकों की एक संख्या और उसके अंकों को उलटने से बनी संख्या का योग ${S} है। यदि दहाई का अंक इकाई के अंक से ${d} अधिक है, तो संख्या ज्ञात कीजिए।`,
        num, [rev, num + 9, num - 9], () => { for (let n = 10; n < 100; n++) { const t1 = Math.floor(n / 10), u = n % 10; if (n + 10 * u + t1 === S && t1 - u === d) return n; } return NaN; },
        `Let the number be 10x + y. (10x + y) + (10y + x) = ${S} gives x + y = ${S / 11}, and x − y = ${d}. So x = ${a}, y = ${b} and the number is ${num}.`,
        `माना संख्या 10x + y है। (10x + y) + (10y + x) = ${S} से x + y = ${S / 11}, और x − y = ${d}। अतः x = ${a}, y = ${b} और संख्या ${num} है।`, { positive: true, whole: true, step: 9 });
    }
    const k = num / s;
    return NQ(t, `A two-digit number is ${k} times the sum of its digits, and its tens digit is ${a > b ? `${a - b} more` : `${b - a} less`} than its units digit${a > b ? "" : ""}. Find the number.`.replace(`${a > b ? `${a - b} more` : `${b - a} less`} than its units digit`, a > b ? `${a - b} more than its units digit` : `${b - a} less than its units digit`),
      `दो अंकों की एक संख्या अपने अंकों के योग की ${k} गुनी है, और उसका दहाई का अंक इकाई के अंक से ${a > b ? `${a - b} अधिक` : `${b - a} कम`} है। संख्या ज्ञात कीजिए।`,
      num, [rev, num + 9, num - 9], () => { for (let n = 10; n < 100; n++) { const t1 = Math.floor(n / 10), u = n % 10; if (n === k * (t1 + u) && t1 - u === a - b) return n; } return NaN; },
      `Let the number be 10x + y with x − y = ${a - b}. 10x + y = ${k}(x + y) gives ${10 - k}x = ${k - 1}y. Together these give x = ${a}, y = ${b}, so the number is ${num}.`,
      `माना संख्या 10x + y है, जहाँ x − y = ${a - b}। 10x + y = ${k}(x + y) से ${10 - k}x = ${k - 1}y। दोनों से x = ${a}, y = ${b}, अतः संख्या ${num} है।`, { positive: true, whole: true, step: 9 });
  },
};

// Tickets: adults ₹a, children ₹b, n tickets, total T.
const tickets = {
  id: "tickets", levels: ["medium", "hard"],
  cands: () => cross([[120, 60], [150, 80], [200, 100], [250, 150], [300, 180], [90, 50], [180, 90], [240, 120]], range(5, 60), range(5, 60)).filter(([, a, c]) => a !== c).map(([[p, q], a, c]) => [p, q, a, c]),
  build: (t, [p, q, a, c]) => {
    const n = a + c, T = p * a + q * c;
    return NQ(t, `A show sold ${n} tickets for ₹${T}. An adult ticket costs ₹${p} and a child ticket ₹${q}. How many adult tickets were sold?`,
      `एक शो के ${n} टिकट ₹${T} में बिके। वयस्क का टिकट ₹${p} और बच्चे का टिकट ₹${q} का है। वयस्कों के कितने टिकट बिके?`,
      a, [c, Math.round(T / p), n - c + 2], () => brute((y) => p * y + q * (n - y) - T),
      `Let the adult tickets be x. ${p}x + ${q}(${n} − x) = ${T}, so ${p - q}x = ${T - q * n} and x = ${a}.`,
      `माना वयस्कों के टिकट x हैं। ${p}x + ${q}(${n} − x) = ${T}, अतः ${p - q}x = ${T - q * n} और x = ${a}।`, { positive: true, whole: true });
  },
};

// ---------------------------------------------------------------- HARD
// A fraction: the denominator is k more than the numerator; adding d to both gives p/q.
const fraction = {
  id: "fraction", levels: ["hard", "advanced"],
  cands: () => cross(range(1, 20), range(1, 9), range(1, 9)).filter(([n, k, d]) => gcd(n, n + k) === 1 && gcd(n + d, n + k + d) > 1),
  build: (t, [n, k, d]) => {
    const g = gcd(n + d, n + k + d); const p = (n + d) / g, q = (n + k + d) / g;
    const o = [F(n, n + k), F(n + 1, n + k + 1), F(n + k, n), F(p, q)];
    const ok = (s) => { const m = /^(\d+)\/(\d+)$/.exec(s); if (!m) return false; const a = +m[1], b = +m[2]; return b - a === k && (a + d) * q === (b + d) * p; };
    if (new Set(o).size !== 4) throw new Error("collide");
    return XQ(t, `The denominator of a fraction is ${k} more than its numerator. If ${d} is added to both, the fraction becomes ${p}/${q}. Find the fraction.`,
      `एक भिन्न का हर उसके अंश से ${k} अधिक है। यदि अंश और हर दोनों में ${d} जोड़ा जाए, तो भिन्न ${p}/${q} हो जाती है। भिन्न ज्ञात कीजिए।`,
      o, null, (i) => ok(o[i]),
      `Let the fraction be x/(x + ${k}). (x + ${d})/(x + ${k + d}) = ${p}/${q} → ${q}(x + ${d}) = ${p}(x + ${k + d}) → ${term(q - p)} = ${p * (k + d) - q * d}, so x = ${n} and the fraction is ${n}/${n + k}.`,
      `माना भिन्न x/(x + ${k}) है। (x + ${d})/(x + ${k + d}) = ${p}/${q} → ${q}(x + ${d}) = ${p}(x + ${k + d}) → ${term(q - p)} = ${p * (k + d) - q * d}, अतः x = ${n} और भिन्न ${n}/${n + k} है।`);
  },
};

// a/x + b/y = c and d/x + e/y = f with whole x, y.
const recip = {
  id: "recip", levels: ["hard", "advanced"],
  cands: () => cross([1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 8, 10, 12], [2, 3, 4, 6, 8, 12], range(1, 6), range(1, 6)).filter(([a, x, y, d, e]) => x !== y && a !== d && L.hashOf([a, x, y, d, e]) % 9 === 0).map(([a, x, y, d, e]) => [a, (a * x) % 5 + 1, d, e, x, y]),
  build: (t, [a, b, d, e, x, y]) => {
    const c = a / x + b / y, f = d / x + e / y; const D = a * e - b * d;
    if (!D || !isInt(c * x * y) || !isInt(f * x * y)) throw new Error("skip");
    const cs = F(Math.round(c * x * y), x * y), fs = F(Math.round(f * x * y), x * y);
    return NQ(t, `If ${a}/x + ${b}/y = ${cs} and ${d}/x + ${e}/y = ${fs}, find the value of x.`, `यदि ${a}/x + ${b}/y = ${cs} और ${d}/x + ${e}/y = ${fs} है, तो x का मान ज्ञात कीजिए।`,
      x, [y, 1 / x > 0 && isInt(x / 2) ? x / 2 : x + 2, x * 2], () => { const [u, v] = cramer(a, b, c, d, e, f); return clean(1 / u); },
      `Put u = 1/x and v = 1/y: ${term(a, "u")} + ${term(b, "v")} = ${cs}, ${term(d, "u")} + ${term(e, "v")} = ${fs}. Solving, u = 1/${x} and v = 1/${y}, so x = ${x}.`,
      `u = 1/x और v = 1/y रखने पर: ${term(a, "u")} + ${term(b, "v")} = ${cs}, ${term(d, "u")} + ${term(e, "v")} = ${fs}। हल करने पर u = 1/${x} और v = 1/${y}, अतः x = ${x}।`, { positive: true, whole: true });
  },
};

// x + y = a, y + z = b, z + x = c.
const three = {
  id: "three", levels: ["hard", "advanced"],
  cands: () => cross(range(1, 30), range(1, 30), range(1, 30), ["sum", "x"]).filter(([x, y, z]) => x !== y && y !== z && x !== z && L.hashOf([x, y, z]) % 7 === 0),
  build: (t, [x, y, z, w]) => {
    const a = x + y, b = y + z, c = z + x; const ans = w === "sum" ? x + y + z : x;
    return NQ(t, `If x + y = ${a}, y + z = ${b} and z + x = ${c}, find the value of ${w === "sum" ? "x + y + z" : "x"}.`, `यदि x + y = ${a}, y + z = ${b} और z + x = ${c} है, तो ${w === "sum" ? "x + y + z" : "x"} का मान ज्ञात कीजिए।`,
      ans, w === "sum" ? [a + b + c, ans + 2, ans - 3] : [y, z, x + y + z], () => { const s = (a + b + c) / 2; return w === "sum" ? s : s - b; },
      w === "sum" ? `Adding all three: 2(x + y + z) = ${a} + ${b} + ${c} = ${a + b + c}, so x + y + z = ${x + y + z}.` : `Adding all three: 2(x + y + z) = ${a + b + c}, so x + y + z = ${x + y + z}. Then x = ${x + y + z} − (y + z) = ${x + y + z} − ${b} = ${x}.`,
      w === "sum" ? `तीनों को जोड़ने पर: 2(x + y + z) = ${a} + ${b} + ${c} = ${a + b + c}, अतः x + y + z = ${x + y + z}।` : `तीनों को जोड़ने पर: 2(x + y + z) = ${a + b + c}, अतः x + y + z = ${x + y + z}। तब x = ${x + y + z} − (y + z) = ${x + y + z} − ${b} = ${x}।`, { positive: true, whole: true });
  },
};

// kx + b1y = c1, a2x + b2y = c2 has no solution (or infinitely many) for k = ?
const noSol = {
  id: "noSol", levels: ["hard", "advanced"],
  cands: () => cross(range(1, 9), range(1, 9), range(2, 6), range(1, 20), ["none", "inf"]).filter(([a2, b2, m, c2, w]) => gcd(a2, b2) === 1 && gcd(gcd(a2, b2), c2) === 1),
  build: (t, [a2, b2, m, c2, w]) => {
    const k = m * a2, b1 = m * b2; const c1 = w === "none" ? m * c2 + 1 + (c2 % 3) : m * c2;
    const q = w === "none" ? `For what value of k does the pair of equations kx + ${b1}y = ${c1} and ${a2 === 1 ? "" : a2}x + ${b2 === 1 ? "" : b2}y = ${c2} have no solution?` : `For what value of k does the pair of equations kx + ${b1}y = ${c1} and ${a2 === 1 ? "" : a2}x + ${b2 === 1 ? "" : b2}y = ${c2} have infinitely many solutions?`;
    const qh = w === "none" ? `k के किस मान के लिए समीकरण युग्म kx + ${b1}y = ${c1} और ${a2 === 1 ? "" : a2}x + ${b2 === 1 ? "" : b2}y = ${c2} का कोई हल नहीं है?` : `k के किस मान के लिए समीकरण युग्म kx + ${b1}y = ${c1} और ${a2 === 1 ? "" : a2}x + ${b2 === 1 ? "" : b2}y = ${c2} के अनंत हल हैं?`;
    return NQ(t, q, qh, k, [b1, m, k + a2, c1 / c2 * a2], () => {
      const hits = []; for (let K = -60; K <= 60; K++) { const D = K * b2 - a2 * b1; if (D !== 0) continue; const prop = K * c2 === a2 * c1 && b1 * c2 === b2 * c1; if ((w === "none" && !prop) || (w === "inf" && prop)) hits.push(K); } return hits.length === 1 ? hits[0] : NaN; },
      w === "none" ? `No solution when k/${a2} = ${b1}/${b2} ≠ ${c1}/${c2}. k/${a2} = ${b1}/${b2} gives k = ${k}, and ${b1}/${b2} = ${m} ≠ ${c1}/${c2}, so k = ${k}.` : `Infinitely many solutions when k/${a2} = ${b1}/${b2} = ${c1}/${c2} = ${m}, so k = ${m} × ${a2} = ${k}.`,
      w === "none" ? `कोई हल नहीं होगा जब k/${a2} = ${b1}/${b2} ≠ ${c1}/${c2}। k/${a2} = ${b1}/${b2} से k = ${k}, और ${b1}/${b2} = ${m} ≠ ${c1}/${c2}, अतः k = ${k}।` : `अनंत हल होंगे जब k/${a2} = ${b1}/${b2} = ${c1}/${c2} = ${m}, अतः k = ${m} × ${a2} = ${k}।`, { positive: true, whole: true });
  },
};

// The symmetric pair: ax + by = c and bx + ay = d: x + y or x − y.
const swapPair = {
  id: "swapPair", levels: ["hard", "advanced"],
  cands: () => crossF([range(11, 60), range(11, 60), range(-6, 9), range(-6, 9), ["s", "d"]], (([a, b, x, y]) => a !== b && x !== y && x && y && Math.abs(a - b) >= 3 && L.hashOf([a, b, x, y]) % 37 === 0)),
  build: (t, [a, b, x, y, w]) => {
    const c = a * x + b * y, d = b * x + a * y; const ans = w === "s" ? x + y : x - y;
    return NQ(t, `If ${eq2(a, b, c)} and ${eq2(b, a, d)}, find the value of ${w === "s" ? "x + y" : "x − y"}.`, `यदि ${eq2(a, b, c)} और ${eq2(b, a, d)} है, तो ${w === "s" ? "x + y" : "x − y"} का मान ज्ञात कीजिए।`,
      ans, [w === "s" ? x - y : x + y, -ans, ans + 1], () => { const [X, Y] = cramer(a, b, c, b, a, d); return w === "s" ? X + Y : X - Y; },
      w === "s" ? `Add the equations: ${a + b}x + ${a + b}y = ${N(c + d)}, so x + y = ${N(c + d)} ÷ ${a + b} = ${N(ans)}.` : `Subtract the second from the first: ${a - b}x − ${a - b}y = ${N(c - d)}, so x − y = ${N(c - d)} ÷ ${a - b} = ${N(ans)}.`,
      w === "s" ? `दोनों समीकरणों को जोड़ने पर: ${a + b}x + ${a + b}y = ${N(c + d)}, अतः x + y = ${N(c + d)} ÷ ${a + b} = ${N(ans)}।` : `पहले में से दूसरा घटाने पर: ${a - b}x − ${a - b}y = ${N(c - d)}, अतः x − y = ${N(c - d)} ÷ ${a - b} = ${N(ans)}।`);
  },
};

// xy from two equations.
const twoVarProd = {
  id: "twoVarProd", levels: ["hard", "advanced"],
  cands: () => crossF([range(1, 9), range(1, 9), range(1, 9), range(-9, 9), range(-7, 12), range(-7, 12)], (([a1, b1, a2, b2, x, y]) => b2 && x && y && x !== y && a1 * b2 - a2 * b1 !== 0 && L.hashOf([a1, b1, a2, b2, x, y]) % 41 === 0)),
  build: (t, [a1, b1, a2, b2, x, y]) => {
    const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y; const ans = x * y;
    return NQ(t, `If ${eq2(a1, b1, c1)} and ${eq2(a2, b2, c2)}, what is the value of xy?`, `यदि ${eq2(a1, b1, c1)} और ${eq2(a2, b2, c2)} है, तो xy का मान क्या है?`,
      ans, [x + y, -ans, ans + x], () => { const [X, Y] = cramer(a1, b1, c1, a2, b2, c2); return X * Y; },
      `Solving the two equations: x = ${N(x)} and y = ${N(y)}. So xy = ${N(x)} × ${N(y)} = ${N(ans)}.`,
      `दोनों समीकरणों को हल करने पर: x = ${N(x)} और y = ${N(y)}। अतः xy = ${N(x)} × ${N(y)} = ${N(ans)}।`);
  },
};

// ---------------------------------------------------------------- ADVANCED
// Equations with fractions on both sides: (ax + b)/c − (dx − e)/f = g.
const bigFrac = {
  id: "bigFrac", levels: ["advanced"],
  cands: () => crossF([[2, 3, 4, 5, 6], [3, 4, 5, 6, 8], range(1, 5), range(1, 5), range(-10, 20), range(1, 9), range(1, 9)], (([c, f, a, d, x, b, e]) => c !== f && x && isInt((a * x + b) / c) && isInt((d * x - e) / f) && (a * x + b) / c - (d * x - e) / f !== 0 && Math.abs(a / c - d / f) > 1e-9 && L.hashOf([c, f, a, d, x, b, e]) % 3 === 0)),
  build: (t, [c, f, a, d, x, b, e]) => {
    const g = (a * x + b) / c - (d * x - e) / f;
    const A = a === 1 ? "x" : `${a}x`, D = d === 1 ? "x" : `${d}x`;
    return NQ(t, `Solve: (${A} + ${b})/${c} − (${D} − ${e})/${f} = ${N(g)}`, `हल कीजिए: (${A} + ${b})/${c} − (${D} − ${e})/${f} = ${N(g)}`,
      x, [-x, x + 1, x * 2 || 5], () => bruteQ((y) => (a * y + b) / c - (d * y - e) / f - g),
      `Multiply by ${c * f / gcd(c, f)} and collect the x terms; this gives x = ${N(x)}. Check: (${N(a * x + b)})/${c} − (${N(d * x - e)})/${f} = (${N((a * x + b) / c)}) − (${N((d * x - e) / f)}) = ${N(g)}.`,
      `${c * f / gcd(c, f)} से गुणा करके x वाले पदों को एक ओर लाने पर x = ${N(x)}। जाँच: (${N(a * x + b)})/${c} − (${N(d * x - e)})/${f} = (${N((a * x + b) / c)}) − (${N((d * x - e) / f)}) = ${N(g)}।`);
  },
};

// The classic 37x + 43y = 123, 43x + 37y = 117 - then x.
const swapX = {
  id: "swapX", levels: ["advanced"],
  cands: () => crossF([range(21, 79), range(21, 79), range(-5, 7), range(-5, 7)], (([a, b, x, y]) => a !== b && x !== y && x && y && Math.abs(a - b) >= 4 && L.hashOf([a, b, x, y]) % 53 === 0)),
  build: (t, [a, b, x, y]) => {
    const c = a * x + b * y, d = b * x + a * y;
    return NQ(t, `If ${eq2(a, b, c)} and ${eq2(b, a, d)}, find the value of x.`, `यदि ${eq2(a, b, c)} और ${eq2(b, a, d)} है, तो x का मान ज्ञात कीजिए।`,
      x, [y, x + y, x - y === x ? x + 2 : x - y], () => cramer(a, b, c, b, a, d)[0],
      `Adding: x + y = ${N(c + d)} ÷ ${a + b} = ${N(x + y)}. Subtracting: x − y = ${N(c - d)} ÷ ${a - b} = ${N(x - y)}. So 2x = ${N(2 * x)} and x = ${N(x)}.`,
      `जोड़ने पर: x + y = ${N(c + d)} ÷ ${a + b} = ${N(x + y)}। घटाने पर: x − y = ${N(c - d)} ÷ ${a - b} = ${N(x - y)}। अतः 2x = ${N(2 * x)} और x = ${N(x)}।`);
  },
};

// The difference of two numbers is d and their ratio is p : q - the larger number.
const ratioNums = {
  id: "ratioNums", levels: ["medium", "advanced"],
  cands: () => cross(range(2, 9), range(3, 12), range(2, 15), range(1, 12)).filter(([p, q, k, a]) => p < q && gcd(p, q) === 1),
  build: (t, [p, q, k, a]) => {
    const x = p * k, y = q * k; const A = x + a, B = y + a; const g = gcd(A, B);
    return NQ(t, `Two numbers are in the ratio ${p} : ${q}. If ${a} is added to each, the ratio becomes ${A / g} : ${B / g}. Find the larger number.`,
      `दो संख्याएँ ${p} : ${q} के अनुपात में हैं। यदि प्रत्येक में ${a} जोड़ा जाए, तो अनुपात ${A / g} : ${B / g} हो जाता है। बड़ी संख्या ज्ञात कीजिए।`,
      y, [x, B, y + q], () => brute((m) => (m > 0 ? (p * m + a) * (B / g) - (q * m + a) * (A / g) : 1)) * q,
      `Let the numbers be ${p}k and ${q}k. (${p}k + ${a})/(${q}k + ${a}) = ${A / g}/${B / g} → ${B / g}(${p}k + ${a}) = ${A / g}(${q}k + ${a}), so k = ${k} and the larger number is ${q} × ${k} = ${y}.`,
      `माना संख्याएँ ${p}k और ${q}k हैं। (${p}k + ${a})/(${q}k + ${a}) = ${A / g}/${B / g} → ${B / g}(${p}k + ${a}) = ${A / g}(${q}k + ${a}), अतः k = ${k} और बड़ी संख्या ${q} × ${k} = ${y} है।`, { positive: true, whole: true });
  },
};

const KINDS = guard([oneStep, bothSides, bracket, fracOne, wordNum, twoNums, consec, rect, valueAt, coins, fracTwo, crossFrac, decimals, twoVar, digits, tickets, fraction, recip, three, noSol, swapPair, twoVarProd, bigFrac, swapX, ratioNums]);
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED });
module.exports = { KINDS, topic, PREFIX };
