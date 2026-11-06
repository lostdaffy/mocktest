// Number & Letter Series · Repeating Letter Pattern: the continuous-pattern
// series of reasoning books - "a b _ c a _ c a b _ ..." - where the blanks,
// filled in order by one option, make the series a repeating block. A
// question is kept only if exactly one way of filling the blanks makes the
// series repeat with ANY period, and only one option does it.
const R = require("./rs-lib");
const { range, pickOf } = R;
const { fillTopic, rng } = require("./gen");
const CH = require("./rs-ser-chapter");

const PREFIX = "Number & Letter Series · Repeating Letter Pattern";
const ASK = [
  ["Which sequence of letters, placed in order in the blanks, will complete the series? $S", "रिक्त स्थानों में क्रम से रखने पर कौन-सा अक्षर-क्रम श्रृंखला को पूरा करेगा? $S"],
  ["Select the option that fills the blanks of the following series in order: $S", "उस विकल्प का चयन कीजिए जो निम्नलिखित श्रृंखला के रिक्त स्थानों को क्रम से भरता है: $S"],
  ["Choose the letters that complete the series when filled in order: $S", "क्रम से भरने पर श्रृंखला को पूरा करने वाले अक्षर चुनिए: $S"],
];
const ASKN = [
  ["Which sequence of numbers, placed in order in the blanks, will complete the series? $S", "रिक्त स्थानों में क्रम से रखने पर कौन-सा संख्या-क्रम श्रृंखला को पूरा करेगा? $S"],
  ["Select the option that fills the blanks of the following series in order: $S", "उस विकल्प का चयन कीजिए जो निम्नलिखित श्रृंखला के रिक्त स्थानों को क्रम से भरता है: $S"],
];
// The smallest period of a string.
const minPeriod = (s) => { for (let p = 1; p <= s.length; p++) if ([...s].every((c, i) => c === s[i % p])) return p; return s.length; };
// Every fill of the blanks (null) that makes the series repeat with some period p ≤ n/2.
function fills(t) {
  const out = new Set();
  for (let p = 1; p <= Math.floor(t.length / 2); p++) {
    const cls = new Map(); let ok = true;
    t.forEach((c, i) => { if (c === null) return; const r = i % p; if (cls.has(r) && cls.get(r) !== c) ok = false; cls.set(r, c); });
    if (!ok) continue;
    const blanks = t.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
    if (blanks.some((i) => !cls.has(i % p))) { out.add("*free*"); continue; }
    out.add(blanks.map((i) => cls.get(i % p)).join(""));
  }
  return out;
}

function kind(id, levels, { alpha, L, reps, B, nums = false }) {
  return {
    id, levels,
    cands: () => {
      const rnd = rng(R.hashOf([id.length, L, reps, B, alpha.length]));
      const seen = new Set(); const out = [];
      for (let t = 0; t < 40000 && out.length < 1500; t++) {
        const unit = range(1, L).map(() => alpha[Math.floor(rnd() * alpha.length)]).join("");
        if (minPeriod(unit) !== L || new Set(unit).size < Math.min(alpha.length, L)) continue;
        const n = L * reps;
        const pos = [];
        while (pos.length < B) { const i = Math.floor(rnd() * n); if (!pos.includes(i)) pos.push(i); }
        pos.sort((a, b) => a - b);
        const key = unit + "|" + pos.join(",");
        if (seen.has(key)) continue; seen.add(key);
        out.push([...unit].map((c) => alpha.indexOf(c)).concat([-1], pos));
      }
      return out;
    },
    build: (title, prm) => {
      const cut = prm.indexOf(-1); const unit = prm.slice(0, cut).map((i) => alpha[i]).join(""); const pos = prm.slice(cut + 1);
      const full = unit.repeat(reps).split("");
      const t = full.map((c, i) => (pos.includes(i) ? null : c));
      const right = pos.map((i) => full[i]).join("");
      const f = fills(t);
      if (f.size !== 1 || !f.has(right)) throw new Error("not a single fill");
      // distractors: the right letters rotated / one changed, none of which fills validly
      const cand = [right.slice(1) + right[0], right.slice(-1) + right.slice(0, -1), [...right].reverse().join("")];
      for (let k = 0; k < right.length; k++) for (const c of alpha) cand.push(right.slice(0, k) + c + right.slice(k + 1));
      const valid = (s) => { const tt = t.slice(); pos.forEach((i, k) => { tt[i] = s[k]; }); return minPeriod(tt.join("")) <= tt.length / 2; };
      const wrongs = [...new Set(cand)].filter((s) => s !== right && !valid(s));
      if (wrongs.length < 3) throw new Error("few options");
      const h = R.hashOf(prm);
      const pickW = [wrongs[h % wrongs.length]];
      for (let k = 1; pickW.length < 3; k++) { const w = wrongs[(h + k * 7) % wrongs.length]; if (!pickW.includes(w)) pickW.push(w); if (k > 50) break; }
      if (pickW.length < 3) throw new Error("few options");
      const o = [right, ...pickW].map((s) => s.split("").join(nums ? " " : ""));
      const S = t.map((c) => (c === null ? "_" : c)).join(" ");
      const [en, hi] = pickOf(nums ? ASKN : ASK, prm, 4);
      return R.XQ(title, en.replace("$S", S), hi.replace("$S", S), o, null,
        (i) => { const s = o[i].replace(/ /g, ""); return valid(s) && s === right; },
        `The series is the block "${unit}" repeated: ${unit.split("").join(" ")} | ${unit.split("").join(" ")} | ... The blanks take ${right.split("").join(", ")} in order, so the answer is ${o[0]}.`,
        `श्रृंखला "${unit}" खंड की पुनरावृत्ति है: ${unit.split("").join(" ")} | ${unit.split("").join(" ")} | ... रिक्त स्थानों में क्रम से ${right.split("").join(", ")} आएँगे, अतः उत्तर ${o[0]} है।`);
    },
  };
}

const ab = ["a", "b"], abc = ["a", "b", "c"], abcd = ["a", "b", "c", "d"], ABC = ["A", "B", "C"], ABCD = ["A", "B", "C", "D"], NUM = ["1", "2", "3"], PQR = ["p", "q", "r"];
const K = [
  kind("ab3", ["easy"], { alpha: ab, L: 3, reps: 4, B: 4 }),
  kind("abc3", ["easy", "medium"], { alpha: abc, L: 3, reps: 4, B: 4 }),
  kind("ABC3", ["easy", "medium"], { alpha: ABC, L: 3, reps: 4, B: 4 }),
  kind("num3", ["easy", "medium"], { alpha: NUM, L: 3, reps: 4, B: 4, nums: true }),
  kind("ab4", ["easy", "medium"], { alpha: ab, L: 4, reps: 3, B: 4 }),
  kind("abc4", ["easy", "medium", "hard"], { alpha: abc, L: 4, reps: 3, B: 4 }),
  kind("pqr4", ["easy", "medium", "hard"], { alpha: PQR, L: 4, reps: 4, B: 5 }),
  kind("abcd4", ["medium", "hard"], { alpha: abcd, L: 4, reps: 4, B: 5 }),
  kind("abc5", ["medium", "hard", "advanced"], { alpha: abc, L: 5, reps: 3, B: 5 }),
  kind("ABCD5", ["hard", "advanced"], { alpha: ABCD, L: 5, reps: 3, B: 5 }),
  kind("abcd5", ["hard", "advanced"], { alpha: abcd, L: 5, reps: 4, B: 6 }),
  kind("abc6", ["hard", "advanced"], { alpha: abc, L: 6, reps: 3, B: 6 }),
  kind("abcd6", ["advanced"], { alpha: abcd, L: 6, reps: 3, B: 6 }),
  kind("num5", ["advanced"], { alpha: ["1", "2", "3", "4"], L: 5, reps: 3, B: 6, nums: true }),
  kind("ab6", ["advanced"], { alpha: ab, L: 6, reps: 3, B: 6 }),
];
const KINDS = CH.guard(K, "rep");
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: CH.USED, cap: 3 });
module.exports = { KINDS, topic, PREFIX };
