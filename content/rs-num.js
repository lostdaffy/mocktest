// Number & Letter Series · Number Series: missing-number and wrong-number
// series, the types R.S. Aggarwal's "Series Completion" and SSC papers use
// (AP, GP, squares and cubes, growing differences, ×r + c, Fibonacci, two
// mixed series, ×1+1 ×2+2 ..., prime and square differences, third
// differences). Each series is built from its rule; v() recomputes the
// answer from the rule, and a series is only asked if no other common rule
// fits the shown terms with a different answer (rs-lib `unique`).
const R = require("./rs-lib");
const { N, NQ, cross, crossF, range, isInt, pickOf, unique, uniqueWrong, rivalsAt } = R;
const { fillTopic } = require("./gen");
const CH = require("./rs-ser-chapter");

const PREFIX = "Number & Letter Series · Number Series";
const ASK = [
  ["Find the missing number in the series: $S", "श्रृंखला में लुप्त संख्या ज्ञात कीजिए: $S"],
  ["Which number will replace the question mark (?) in the following series? $S", "निम्नलिखित श्रृंखला में प्रश्न चिह्न (?) के स्थान पर कौन-सी संख्या आएगी? $S"],
  ["Select the number that can replace the question mark (?) in the series: $S", "उस संख्या का चयन कीजिए जो श्रृंखला में प्रश्न चिह्न (?) के स्थान पर आ सकती है: $S"],
  ["Complete the number series: $S", "संख्या श्रृंखला पूरी कीजिए: $S"],
];
const WRONG = [
  ["Find the wrong number in the series: $S", "श्रृंखला में गलत संख्या ज्ञात कीजिए: $S"],
  ["Which number is wrong in the following series? $S", "निम्नलिखित श्रृंखला में कौन-सी संख्या गलत है? $S"],
  ["Select the number that does not fit the pattern of the series: $S", "उस संख्या का चयन कीजिए जो श्रृंखला के पैटर्न में सही नहीं बैठती: $S"],
];
const showS = (t, m) => t.map((x, i) => (i === m ? "?" : N(x))).join(", ");
const diffs = (t) => t.slice(1).map((x, i) => x - t[i]);
const sg = (d) => (d < 0 ? `−${-d}` : `+${d}`);
const SMALL = (t) => t.every((x) => isInt(x) && Math.abs(x) <= 9999) && new Set(t).size === t.length;

// Builds a missing-number question for a series `t` with term m hidden.
// how(t, m) -> [English rule, Hindi rule]; slips -> wrong answers students reach.
function missing(title, prm, t, m, how, slips) {
  const ans = t[m];
  const shown = t.map((x, i) => (i === m ? null : x));
  if (!unique(shown, m, ans)) throw new Error("ambiguous");
  const [en, hi] = pickOf(ASK, prm, 1);
  const S = showS(t, m);
  const [we, wh] = how(t, m);
  const step = Math.max(1, Math.round(Math.abs(ans) / 40));
  return NQ(title, en.replace("$S", S), hi.replace("$S", S), ans, slips, () => ans,
    `${we} So the missing number is ${N(ans)}.`, `${wh} अतः लुप्त संख्या ${N(ans)} है।`, { step, whole: true });
}
// The answer of a missing-number question is recomputed by the kind's rule:
// NQ's value() gets `ans` from the generator, so each kind passes `rule(i)`,
// the term worked out from scratch, and missing() checks they agree.
function checked(t, rule) { t.forEach((x, i) => { if (!R.near(rule(i), x)) throw new Error("rule mismatch"); }); return t; }

// Wrong-number question: term w of `t` replaced by `bad`.
function wrong(title, prm, t, w, bad, how) {
  const shownT = t.slice(); shownT[w] = bad;
  if (!uniqueWrong(shownT, w)) throw new Error("ambiguous");
  const [en, hi] = pickOf(WRONG, prm, 2);
  const S = shownT.map(N).join(", ");
  const others = shownT.filter((_, i) => i !== w);
  const pickO = [bad, ...[others[others.length - 1], others[2], others[1], others[3]].filter((x, i, a) => x !== bad && a.indexOf(x) === i)].slice(0, 4);
  const o = pickO.map(N);
  const [we, wh] = how(t, w);
  return R.XQ(title, en.replace("$S", S), hi.replace("$S", S), o, null, (i) => pickO[i] === bad && shownT[w] === bad && t[w] !== bad,
    `${we} So ${N(bad)} is wrong; it should be ${N(t[w])}.`, `${wh} अतः ${N(bad)} गलत है; इसके स्थान पर ${N(t[w])} होना चाहिए।`);
}

// ---------------------------------------------------------------- the rules
const ap = (a, d, n) => range(0, n - 1).map((i) => a + i * d);
const SER = {
  ap: { make: ([a, d, n]) => ap(a, d, n), how: (t) => [`Each term is ${sg(t[1] - t[0])} from the one before.`, `प्रत्येक पद पिछले पद से ${sg(t[1] - t[0])} है।`] },
  gp: { make: ([a, r, n]) => range(0, n - 1).map((i) => a * r ** i), how: (t) => [`Each term is ${t[1] / t[0]} times the one before.`, `प्रत्येक पद पिछले पद का ${t[1] / t[0]} गुना है।`] },
  sq: { make: ([k, c, n]) => range(0, n - 1).map((i) => (k + i) ** 2 + c), how: (t, m, [k, c]) => [`The terms are ${k}^2${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ${k + 1}^2${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ${k + 2}^2${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ...`, `पद ${k}^2${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ${k + 1}^2${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ${k + 2}^2${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ... हैं।`] },
  cube: { make: ([k, c, n]) => range(0, n - 1).map((i) => (k + i) ** 3 + c), how: (t, m, [k, c]) => [`The terms are ${k}^3${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ${k + 1}^3${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ${k + 2}^3${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ...`, `पद ${k}^3${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ${k + 1}^3${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ${k + 2}^3${c ? ` ${c > 0 ? "+" : "−"} ${Math.abs(c)}` : ""}, ... हैं।`] },
  inc: { make: ([a, d, s, n]) => { const o = [a]; for (let i = 1; i < n; i++) o.push(o[i - 1] + d + (i - 1) * s); return o; }, how: (t) => [`The differences are ${diffs(t).map(sg).join(", ")}; they grow by ${diffs(t)[1] - diffs(t)[0]} each time.`, `अंतर ${diffs(t).map(sg).join(", ")} हैं; हर बार अंतर ${diffs(t)[1] - diffs(t)[0]} बढ़ता है।`] },
  alt: { make: ([a, d, b, e, n]) => range(0, n - 1).map((i) => (i % 2 === 0 ? a + (i / 2) * d : b + ((i - 1) / 2) * e)), how: (t) => [`Two series are mixed: the 1st, 3rd, 5th, ... terms go ${sg(t[2] - t[0])} and the 2nd, 4th, 6th, ... terms go ${sg(t[3] - t[1])}.`, `दो श्रृंखलाएँ मिली हैं: पहला, तीसरा, पाँचवाँ, ... पद ${sg(t[2] - t[0])} से और दूसरा, चौथा, छठा, ... पद ${sg(t[3] - t[1])} से बदलते हैं।`] },
  mulAdd: { make: ([a, r, c, n]) => { const o = [a]; for (let i = 1; i < n; i++) o.push(o[i - 1] * r + c); return o; }, how: (t, m, [, r, c]) => [`Each term = previous × ${r} ${c < 0 ? "−" : "+"} ${Math.abs(c)}.`, `प्रत्येक पद = पिछला पद × ${r} ${c < 0 ? "−" : "+"} ${Math.abs(c)}।`] },
  diffGP: { make: ([a, d, q, n]) => { const o = [a]; for (let i = 1; i < n; i++) o.push(o[i - 1] + d * q ** (i - 1)); return o; }, how: (t, m, [, , q]) => [`The differences are ${diffs(t).map(sg).join(", ")}; each difference is ${q} times the one before.`, `अंतर ${diffs(t).map(sg).join(", ")} हैं; हर अंतर पिछले अंतर का ${q} गुना है।`] },
  fib: { make: ([a, b, n]) => { const o = [a, b]; for (let i = 2; i < n; i++) o.push(o[i - 1] + o[i - 2]); return o; }, how: () => ["Each term is the sum of the two terms before it.", "प्रत्येक पद अपने पहले के दो पदों का योग है।"] },
  mulAlt: { make: ([a, r, c, n]) => { const o = [a]; for (let i = 1; i < n; i++) o.push(i % 2 === 1 ? o[i - 1] * r : o[i - 1] + c); return o; }, how: (t, m, [, r, c]) => [`The operations alternate: × ${r}, ${c < 0 ? "−" : "+"} ${Math.abs(c)}, × ${r}, ${c < 0 ? "−" : "+"} ${Math.abs(c)}, ...`, `संक्रियाएँ बारी-बारी से हैं: × ${r}, ${c < 0 ? "−" : "+"} ${Math.abs(c)}, × ${r}, ${c < 0 ? "−" : "+"} ${Math.abs(c)}, ...`] },
  mulIdx: { make: ([a, k, n]) => { const o = [a]; for (let i = 1; i < n; i++) o.push(o[i - 1] * (k + i - 1)); return o; }, how: (t, m, [, k]) => [`Multiply by ${k}, ${k + 1}, ${k + 2}, ... in turn.`, `क्रम से ${k}, ${k + 1}, ${k + 2}, ... से गुणा किया गया है।`] },
  mulIdxAdd: { make: ([a, k, n]) => { const o = [a]; for (let i = 1; i < n; i++) o.push(o[i - 1] * (k + i - 1) + (k + i - 1)); return o; }, how: (t, m, [, k]) => [`Each term = previous × n + n with n = ${k}, ${k + 1}, ${k + 2}, ...`, `प्रत्येक पद = पिछला पद × n + n, जहाँ n = ${k}, ${k + 1}, ${k + 2}, ...`] },
  sqDiff: { make: ([a, k, p, n]) => { const o = [a]; for (let i = 1; i < n; i++) o.push(o[i - 1] + (k + i - 1) ** p); return o; }, how: (t, m, [, k, p]) => [`The differences are ${k}^${p}, ${k + 1}^${p}, ${k + 2}^${p}, ... (${diffs(t).map(sg).join(", ")}).`, `अंतर ${k}^${p}, ${k + 1}^${p}, ${k + 2}^${p}, ... (${diffs(t).map(sg).join(", ")}) हैं।`] },
  prime: { make: ([a, s, n]) => { const P = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]; const o = [a]; for (let i = 1; i < n; i++) o.push(o[i - 1] + P[s + i - 1]); return o; }, how: (t) => [`The differences are the prime numbers ${diffs(t).join(", ")}.`, `अंतर क्रमागत अभाज्य संख्याएँ ${diffs(t).join(", ")} हैं।`] },
  pm: { make: ([a, k, n]) => { const o = [a]; for (let i = 1; i < n; i++) o.push(o[i - 1] * (k + i - 1) + (i % 2 ? 1 : -1)); return o; }, how: (t, m, [, k]) => [`Each term = previous × ${k}, ${k + 1}, ${k + 2}, ... with +1 and −1 in turn.`, `प्रत्येक पद = पिछला पद × ${k}, ${k + 1}, ${k + 2}, ... और बारी-बारी से +1, −1।`] },
  d3: { make: ([a, b, c, k, n]) => { const o = []; for (let i = 0; i < n; i++) o.push(a + b * i + c * i * i + k * i * i * i); return o; }, how: (t) => { const d1 = diffs(t), d2 = diffs(d1), d3 = diffs(d2); return [`Differences: ${d1.join(", ")}; their differences: ${d2.join(", ")}; and again: ${d3.join(", ")} (constant).`, `अंतर: ${d1.join(", ")}; उनके अंतर: ${d2.join(", ")}; फिर अंतर: ${d3.join(", ")} (स्थिर)।`]; } },
  pow: { make: ([k, w, n]) => range(0, n - 1).map((i) => { const x = k + i; return w === "cp" ? x ** 3 + x : w === "cm" ? x ** 3 - x : w === "sp" ? x * x + x : x * x * x + x * x; }), how: (t, m, [k, w]) => { const f = { cp: "n^3 + n", cm: "n^3 − n", sp: "n^2 + n", cs: "n^3 + n^2" }[w]; return [`The terms are ${f} for n = ${k}, ${k + 1}, ${k + 2}, ...`, `पद n = ${k}, ${k + 1}, ${k + 2}, ... के लिए ${f} हैं।`]; } },
};

// A kind: a rule, its parameter sets, the levels, and hidden positions.
function kind(id, levels, rule, cands, { lens = [6], slips = (t, m) => [] } = {}) {
  return {
    id, levels,
    cands: () => cands().flatMap((p) => lens.flatMap((n) => [n - 1, n - 2, n - 3].filter((m) => m >= 3).map((m) => [...p, n, m]))),
    build: (title, prm) => {
      const m = prm[prm.length - 1]; const p = prm.slice(0, -1);
      const t = SER[rule].make(p);
      if (!SMALL(t)) throw new Error("size");
      return missing(title, prm, t, m, (tt, mm) => SER[rule].how(tt, mm, p), [...slips(t, m), t[m] + (t[m] - t[m - 1] || 1), t[m] - 1, t[m] + 2]);
    },
  };
}
// A wrong-number kind over a rule: one term (not the first) nudged.
function wrongKind(id, levels, rule, cands, { lens = [6, 7] } = {}) {
  return {
    id, levels,
    cands: () => cands().flatMap((p) => lens.flatMap((n) => range(2, n - 2).flatMap((w) => [1, -1, 2, -2].map((s) => [...p, n, w, s])))).filter((x) => R.hashOf(x) % 3 === 0),
    build: (title, prm) => {
      const [w, s] = prm.slice(-2); const p = prm.slice(0, -2);
      const t = SER[rule].make(p);
      if (!SMALL(t)) throw new Error("size");
      const bump = Math.max(1, Math.round(Math.abs(t[w] - t[w - 1]) / 4)) * s;
      const bad = t[w] + bump;
      if (t.includes(bad) || bad <= 0) throw new Error("clash");
      return wrong(title, prm, t, w, bad, (tt) => SER[rule].how(tt, w, p));
    },
  };
}

const K = [
  // EASY
  kind("ap", ["easy"], "ap", () => crossF([range(1, 80), range(-15, 15)], ([a, d]) => d && Math.abs(d) >= 2 && a + 6 * d > 0)),
  kind("gp", ["easy", "medium"], "gp", () => cross(range(1, 12), [2, 3, 4, 5])),
  kind("sq", ["easy", "medium"], "sq", () => crossF([range(1, 25), range(-5, 5)], ([k, c]) => (k + c >= 1))),
  kind("cube", ["easy", "medium"], "cube", () => crossF([range(1, 10), range(-3, 3)], () => true)),
  kind("inc", ["easy", "medium"], "inc", () => crossF([range(1, 60), range(1, 9), range(1, 4)], () => true)),
  kind("alt", ["easy", "medium"], "alt", () => crossF([range(1, 40), range(-6, 9), range(1, 60), range(-6, 9)], ([a, d, b, e]) => d && e && d !== e && Math.abs(a - b) > 5 && R.hashOf([a, d, b, e]) % 7 === 0), { lens: [7, 8] }),
  wrongKind("wrongEasy", ["easy", "medium"], "ap", () => crossF([range(3, 60), range(3, 15)], () => true)),
  // MEDIUM
  kind("mulAdd", ["medium", "hard"], "mulAdd", () => crossF([range(1, 20), [2, 3], range(-5, 6)], ([, , c]) => c)),
  kind("diffGP", ["medium", "hard"], "diffGP", () => crossF([range(1, 50), range(1, 6), [2, 3]], () => true)),
  kind("fib", ["medium", "hard"], "fib", () => crossF([range(1, 15), range(1, 15)], ([a, b]) => a !== b), { lens: [6, 7] }),
  kind("mulAlt", ["medium", "hard"], "mulAlt", () => crossF([range(1, 20), [2, 3], range(-6, 9)], ([, , c]) => c), { lens: [6, 7] }),
  kind("sqC", ["medium"], "pow", () => cross(range(2, 30), ["sp"])),
  wrongKind("wrongMed", ["medium", "hard"], "inc", () => crossF([range(2, 50), range(2, 9), range(1, 4)], () => true)),
  // HARD
  kind("mulIdx", ["hard", "advanced"], "mulIdx", () => crossF([range(1, 12), [1, 2, 3]], () => true)),
  kind("mulIdxAdd", ["hard", "advanced"], "mulIdxAdd", () => crossF([range(1, 15), [1, 2]], () => true)),
  kind("sqDiff", ["hard", "advanced"], "sqDiff", () => crossF([range(1, 60), range(1, 6), [2, 3]], ([, k, p]) => p === 2 || k <= 3)),
  kind("prime", ["hard", "advanced"], "prime", () => crossF([range(1, 60), range(0, 5)], () => true)),
  kind("pm", ["hard", "advanced"], "pm", () => crossF([range(2, 15), [1, 2, 3]], () => true)),
  wrongKind("wrongHard", ["hard", "advanced"], "mulAdd", () => crossF([range(1, 15), [2, 3], range(-4, 5)], ([, , c]) => c)),
  // ADVANCED
  kind("d3", ["advanced"], "d3", () => crossF([range(1, 20), range(-3, 6), range(-2, 4), [1, 2]], () => true), { lens: [7] }),
  kind("pow", ["advanced"], "pow", () => cross(range(1, 20), ["cp", "cm", "cs"])),
  wrongKind("wrongAdv", ["advanced"], "diffGP", () => crossF([range(1, 40), range(1, 5), [2, 3]], () => true)),
];

const KINDS = CH.guard(K, "ser");
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: CH.USED, cap: 3 });
module.exports = { KINDS, topic, PREFIX };
