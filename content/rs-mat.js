// Number & Letter Series · Missing Number in Figures and Matrix: number sets
// "(4, 7, 23), (5, 3, 16), (6, 8, ?)" and 3 × 3 matrices whose rows (or
// columns) follow one rule. The figure versions of books are written as sets
// and rows so the app needs no picture. A question is kept only if every rule
// of the library below that fits the complete sets gives the same answer.
const R = require("./rs-lib");
const { range, pickOf, isInt, near } = R;
const { fillTopic, rng } = require("./gen");
const CH = require("./rs-ser-chapter");

const PREFIX = "Number & Letter Series · Missing Number in Figures and Matrix";
// Rules on (a, b) -> c, and on (a, b, c) -> d. Each has a text for solutions.
const R2 = {
  sum: [(a, b) => a + b, "a + b"],
  prod: [(a, b) => a * b, "a × b"],
  diff: [(a, b) => a - b, "a − b"],
  sqPlus: [(a, b) => a * a + b, "a² + b"],
  plusSq: [(a, b) => a + b * b, "a + b²"],
  sqSum: [(a, b) => a * a + b * b, "a² + b²"],
  sqDiff: [(a, b) => a * a - b * b, "a² − b²"],
  sumSq: [(a, b) => (a + b) ** 2, "(a + b)²"],
  prodPlusA: [(a, b) => a * b + a, "a × b + a"],
  prodPlusB: [(a, b) => a * b + b, "a × b + b"],
  prodMinusA: [(a, b) => a * b - a, "a × b − a"],
  prodPlusSum: [(a, b) => a * b + a + b, "a × b + a + b"],
  twoAthreeB: [(a, b) => 2 * a + 3 * b, "2a + 3b"],
  threeAtwoB: [(a, b) => 3 * a + 2 * b, "3a + 2b"],
  cubePlus: [(a, b) => a ** 3 + b, "a³ + b"],
  double: [(a, b) => 2 * (a + b), "2(a + b)"],
  triple: [(a, b) => 3 * (a + b), "3(a + b)"],
  prodPlus1: [(a, b) => a * b + 1, "a × b + 1"],
  prodMinus1: [(a, b) => a * b - 1, "a × b − 1"],
  prodPlus2: [(a, b) => a * b + 2, "a × b + 2"],
  sumPlus1: [(a, b) => a + b + 1, "a + b + 1"],
};
const R3 = {
  abPlusC: [(a, b, c) => a * b + c, "a × b + c"],
  abMinusC: [(a, b, c) => a * b - c, "a × b − c"],
  sumTimesC: [(a, b, c) => (a + b) * c, "(a + b) × c"],
  sum3: [(a, b, c) => a + b + c, "a + b + c"],
  prod3: [(a, b, c) => a * b * c, "a × b × c"],
  sq3: [(a, b, c) => a * a + b * b + c * c, "a² + b² + c²"],
  abcMix: [(a, b, c) => a * b + b * c, "a × b + b × c"],
  diffTimesC: [(a, b, c) => (a - b) * c, "(a − b) × c"],
  sumSqMinusC: [(a, b, c) => (a + b) ** 2 - c, "(a + b)² − c"],
};
// Every rule that fits the complete sets, with what it gives for the last.
function rivals(sets, rules) {
  const full = sets.slice(0, -1);
  return Object.entries(rules).filter(([, [f]]) => full.every((s) => near(f(...s.slice(0, -1)), s[s.length - 1]))).map(([k, [f]]) => [k, f(...sets[sets.length - 1].slice(0, -1))]);
}
const FORMS = [
  ["sets", (sets, m) => sets.map((s, i) => `(${s.map((x, j) => (i === sets.length - 1 && j === m ? "?" : x)).join(", ")})`).join(", ")],
  ["rows", (sets, m) => sets.map((s, i) => `Row ${i + 1}: ${s.map((x, j) => (i === sets.length - 1 && j === m ? "?" : x)).join(", ")}`).join("; ")],
];
const ASK = {
  sets: [["The numbers in each bracket follow the same rule. Find the missing number: $S", "प्रत्येक कोष्ठक की संख्याएँ एक ही नियम का पालन करती हैं। लुप्त संख्या ज्ञात कीजिए: $S"],
    ["Select the number that can replace the question mark (?) so that the last set follows the same rule as the others: $S", "उस संख्या का चयन कीजिए जो प्रश्न चिह्न (?) के स्थान पर आकर अंतिम समूह को बाकी समूहों के समान नियम में रखे: $S"]],
  rows: [["Each row of the following matrix follows the same rule. Find the missing number: $S", "निम्नलिखित आव्यूह (matrix) की प्रत्येक पंक्ति एक ही नियम का पालन करती है। लुप्त संख्या ज्ञात कीजिए: $S"],
    ["Which number will replace the question mark (?) in the matrix? $S", "आव्यूह (matrix) में प्रश्न चिह्न (?) के स्थान पर कौन-सी संख्या आएगी? $S"]],
};

function kind(id, levels, rule, { three = false, lo = 2, hi = 12 } = {}) {
  const rules = three ? R3 : R2;
  const [f, txt] = rules[rule];
  const arity = three ? 3 : 2;
  return {
    id, levels,
    cands: () => {
      const rnd = rng(R.hashOf([id.length, ...id.split("").map((c) => c.charCodeAt(0))]));
      const out = []; const seen = new Set();
      for (let t = 0; t < 30000 && out.length < 1500; t++) {
        const xs = range(1, 3 * arity).map(() => lo + Math.floor(rnd() * (hi - lo + 1)));
        const k = xs.join(","); if (seen.has(k)) continue; seen.add(k);
        out.push([...xs, t % 2]);
      }
      return out;
    },
    build: (title, prm) => {
      const form = FORMS[prm[prm.length - 1]];
      const xs = prm.slice(0, -1);
      const sets = range(0, 2).map((i) => { const ins = xs.slice(i * arity, i * arity + arity); return [...ins, f(...ins)]; });
      if (sets.some((s) => s[s.length - 1] <= 0 || s[s.length - 1] > 999 || !isInt(s[s.length - 1]))) throw new Error("size");
      if (new Set(sets.map((s) => s.join(","))).size !== 3) throw new Error("same set");
      const ans = sets[2][arity];
      const rv = rivals(sets, rules);
      if (!rv.every(([, v]) => near(v, ans))) throw new Error("ambiguous");
      const S = form[1](sets, arity);
      const [en, hiTxt] = pickOf(ASK[form[0]], prm, 5);
      const names = three ? ["a", "b", "c"] : ["a", "b"];
      const show = (s) => `${txt.replace(/[abc]/g, (v) => String(s[names.indexOf(v)]))} = ${s[arity]}`;
      // Wrong answers from other rules, but only near ones a student would weigh.
      const slips = Object.values(rules).map(([g]) => g(...sets[2].slice(0, arity))).filter((v) => isInt(v) && v > 0 && v !== ans && v >= ans / 2 && v <= ans * 2);
      return R.NQ(title, en.replace("$S", S), hiTxt.replace("$S", S), ans, [...new Set(slips)].slice(0, 3), () => f(...sets[2].slice(0, arity)),
        `Rule: ${txt}. ${show(sets[0])}; ${show(sets[1])}; so ${show(sets[2])}.`, `नियम: ${txt}। ${show(sets[0])}; ${show(sets[1])}; अतः ${show(sets[2])}।`, { positive: true, whole: true });
    },
  };
}

const K = [
  kind("sum", ["easy"], "sum", { lo: 3, hi: 60 }),
  kind("prod", ["easy", "medium"], "prod", { lo: 2, hi: 15 }),
  kind("diff", ["easy"], "diff", { lo: 2, hi: 60 }),
  kind("double", ["easy", "medium"], "double", { lo: 2, hi: 30 }),
  kind("sumPlus1", ["easy"], "sumPlus1", { lo: 2, hi: 40 }),
  kind("prodPlus1", ["easy", "medium"], "prodPlus1", { lo: 2, hi: 12 }),
  kind("triple", ["easy", "medium"], "triple", { lo: 2, hi: 20 }),
  kind("sqPlus", ["medium", "hard"], "sqPlus", { lo: 2, hi: 15 }),
  kind("plusSq", ["medium", "hard"], "plusSq", { lo: 2, hi: 15 }),
  kind("prodPlusA", ["medium", "hard"], "prodPlusA", { lo: 2, hi: 12 }),
  kind("twoAthreeB", ["medium", "hard"], "twoAthreeB", { lo: 2, hi: 30 }),
  kind("sqSum", ["hard", "advanced"], "sqSum", { lo: 2, hi: 15 }),
  kind("sqDiff", ["hard", "advanced"], "sqDiff", { lo: 2, hi: 20 }),
  kind("sumSq", ["hard", "advanced"], "sumSq", { lo: 2, hi: 15 }),
  kind("prodPlusSum", ["hard", "advanced"], "prodPlusSum", { lo: 2, hi: 15 }),
  kind("cubePlus", ["advanced"], "cubePlus", { lo: 2, hi: 9 }),
  kind("abPlusC", ["medium", "hard"], "abPlusC", { three: true, lo: 2, hi: 12 }),
  kind("abMinusC", ["hard", "advanced"], "abMinusC", { three: true, lo: 2, hi: 12 }),
  kind("sumTimesC", ["hard", "advanced"], "sumTimesC", { three: true, lo: 2, hi: 12 }),
  kind("abcMix", ["advanced"], "abcMix", { three: true, lo: 2, hi: 9 }),
  kind("sumSqMinusC", ["advanced"], "sumSqMinusC", { three: true, lo: 2, hi: 12 }),
  kind("diffTimesC", ["advanced"], "diffTimesC", { three: true, lo: 2, hi: 20 }),
];
const KINDS = CH.guard(K, "mat");
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: CH.USED, cap: 3 });
module.exports = { KINDS, topic, PREFIX };
