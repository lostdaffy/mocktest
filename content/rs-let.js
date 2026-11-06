// Number & Letter Series · Letter Series: single letters and letter clusters
// whose letters move by fixed, growing or mixed steps (no wrap past Z) - the
// letter-series types of the series chapter in reasoning books and SSC papers.
const R = require("./rs-lib");
const { range, crossF, cross } = R;
const { clusterQ } = require("./rs-cluster");
const { fillTopic, rng } = require("./gen");
const CH = require("./rs-ser-chapter");

const PREFIX = "Number & Letter Series · Letter Series";
const ASK1 = [
  ["Which letter will replace the question mark (?) in the series: $S", "श्रृंखला में प्रश्न चिह्न (?) के स्थान पर कौन-सा अक्षर आएगा: $S"],
  ["Select the letter that can replace the question mark (?) in the following series: $S", "उस अक्षर का चयन कीजिए जो निम्नलिखित श्रृंखला में प्रश्न चिह्न (?) के स्थान पर आ सकता है: $S"],
  ["Find the missing letter in the series: $S", "श्रृंखला में लुप्त अक्षर ज्ञात कीजिए: $S"],
];
const ASKC = [
  ["Which letter-cluster will replace the question mark (?) in the series: $S", "श्रृंखला में प्रश्न चिह्न (?) के स्थान पर कौन-सा अक्षर-समूह आएगा: $S"],
  ["Select the letter-cluster that can replace the question mark (?) in the following series: $S", "उस अक्षर-समूह का चयन कीजिए जो निम्नलिखित श्रृंखला में प्रश्न चिह्न (?) के स्थान पर आ सकता है: $S"],
  ["Find the missing term in the letter series: $S", "अक्षर श्रृंखला में लुप्त पद ज्ञात कीजिए: $S"],
  ["Complete the series: $S", "श्रृंखला पूरी कीजिए: $S"],
];
const STEPS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
// n terms, hidden term m (one of the last three, never before the 4th).
const pos = (n) => [n - 1, n - 2, n - 3].filter((m) => m >= 3);
// A kind from a list of part shapes; params are drawn per part.
function kind(id, levels, shapes, { n = [5, 6], ask = ASKC, filter = () => true, gen = null } = {}) {
  const partsOf = (prm) => { let k = 0; return shapes.map((type) => { const len = type === "ldiff" ? 3 : 2; const p = prm.slice(k, k + len); k += len; return [type, p]; }); };
  const lists = shapes.flatMap((type) => (type === "ldiff" ? [range(1, 12), [1, 2], [1, 2]] : [range(1, 26), STEPS]));
  return {
    id, levels,
    // A fixed random sample of parameter sets (a full product of four parts
    // runs to billions).
    cands: () => {
      const rnd = rng(R.hashOf([id.length, ...id.split("").map((c) => c.charCodeAt(0))]));
      const seen = new Set(); const base = [];
      if (gen) for (const p of gen()) base.push(p);
      for (let t = 0; !gen && t < 60000 && base.length < 2500; t++) {
        const p = lists.map((l) => l[Math.floor(rnd() * l.length)]);
        const k = p.join(","); if (seen.has(k) || !filter(p)) continue; seen.add(k); base.push(p);
      }
      return base.flatMap((p) => n.flatMap((nn) => pos(nn).map((m) => [...p, nn, m])));
    },
    build: (title, prm) => {
      const [nn, m] = prm.slice(-2); const p = prm.slice(0, -2);
      return clusterQ(title, prm, partsOf(p), nn, m, ask, shapes.length === 1 ? "letter" : "letter-cluster");
    },
  };
}

const K = [
  kind("one", ["easy"], ["lap"], { ask: ASK1, n: [6, 7] }),
  kind("two", ["easy", "medium"], ["lap", "lap"]),
  kind("three", ["easy", "medium", "hard"], ["lap", "lap", "lap"]),
  kind("oneGrow", ["easy", "medium"], ["ldiff"], { ask: ASK1, n: [5, 6] }),
  kind("twoGrow", ["medium", "hard", "advanced"], ["ldiff", "lap"]),
  kind("fourGrow", ["advanced"], ["ldiff", "ldiff", "lap", "lap"], { n: [5] }),
  kind("threeMix", ["medium", "hard", "advanced"], ["lap", "ldiff", "lap"]),
  kind("four", ["medium", "hard", "advanced"], ["lap", "lap", "lap", "lap"], { n: [5] }),
  kind("growTwo", ["hard", "advanced"], ["ldiff", "ldiff"]),
  kind("fourMix", ["hard", "advanced"], ["ldiff", "lap", "lap", "ldiff"], { n: [5] }),
  kind("threeGrow", ["advanced"], ["ldiff", "ldiff", "lap"], { n: [5] }),
  kind("twoSame", ["easy", "medium"], ["lap", "lap"], { filter: ([a, d, b, e]) => d === e && Math.abs(a - b) <= 3 && a !== b }),
  kind("threeSame", ["easy", "medium"], ["lap", "lap", "lap"], { gen: () => cross(range(1, 24), STEPS).map(([a, d]) => [a, d, a + 1, d, a + 2, d]) }),
  kind("pairBack", ["easy", "medium", "hard"], ["lap", "lap"], { filter: ([a, d, b, e]) => d > 0 && e < 0 && a < b && a + b !== 27 }),
  kind("oppose", ["easy", "medium", "hard", "advanced"], ["lap", "lap"], { filter: ([a, d, b, e]) => a + b === 27 && d === -e, gen: () => cross(range(1, 26), STEPS).map(([a, d]) => [a, d, 27 - a, -d]) }),
];

const KINDS = CH.guard(K, "let");
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: CH.USED, cap: 3 });
module.exports = { KINDS, topic, PREFIX };
