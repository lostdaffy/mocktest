// Series of letter / number clusters ("ACE, FHJ, KMO, ?", "D4V, H9T, L16R, ?"):
// each cluster is made of parts, every part follows its own rule over the
// terms (a letter moving +2, a number squared ...). A question is asked only
// if every part, read as a series on its own, has a single answer (rs-lib
// `unique` over the letter positions / numbers). The judge works the right
// cluster out again from the rules.
const R = require("./rs-lib");
const { range, isInt, pickOf, unique } = R;

const LET = (n) => String.fromCharCode(64 + n); // 1 -> A
// Part rules: (params, i) -> value at term i. Letters are 1..26, no wrap.
const PART = {
  lap: { letter: true, at: ([a, d], i) => a + d * i, how: ([a, d]) => (d > 0 ? `+${d}` : `−${-d}`) },
  ldiff: { letter: true, at: ([a, d, s], i) => a + d * i + (s * i * (i - 1)) / 2, how: ([a, d, s]) => `+${d}, +${d + s}, +${d + 2 * s}, ...` },
  nap: { letter: false, at: ([a, d], i) => a + d * i, how: ([a, d]) => (d > 0 ? `+${d}` : `−${-d}`) },
  ngp: { letter: false, at: ([a, r], i) => a * r ** i, how: ([a, r]) => `×${r}` },
  nsq: { letter: false, at: ([k], i) => (k + i) ** 2, how: ([k]) => `${k}², ${k + 1}², ${k + 2}², ...` },
  ncube: { letter: false, at: ([k], i) => (k + i) ** 3, how: ([k]) => `${k}³, ${k + 1}³, ${k + 2}³, ...` },
  ndiff: { letter: false, at: ([a, d, s], i) => a + d * i + (s * i * (i - 1)) / 2, how: ([a, d, s]) => `+${d}, +${d + s}, +${d + 2 * s}, ...` },
};
const cell = (parts, i) => parts.map(([type, p]) => { const v = PART[type].at(p, i); return PART[type].letter ? LET(v) : String(v); }).join("");
const ok = (parts, n) => parts.every(([type, p]) => range(0, n - 1).every((i) => { const v = PART[type].at(p, i); return isInt(v) && (PART[type].letter ? v >= 1 && v <= 26 : v >= 0 && v <= 999); }));
const ORD = ["1st", "2nd", "3rd", "4th", "5th"];
const ORDH = ["पहले", "दूसरे", "तीसरे", "चौथे", "पाँचवें"];

/**
 * One question: `parts` [[type, params], ...], n terms, term m hidden.
 * ask: [[en, hi], ...] phrasings with $S. Distractors: the right cluster
 * with one part nudged.
 */
function clusterQ(title, prm, parts, n, m, ask, unitEn = "letter-cluster", unitHi = "अक्षर-समूह") {
  if (!ok(parts, n)) throw new Error("out of range");
  // every part alone must have one answer
  for (const [type, p] of parts) {
    const seq = range(0, n - 1).map((i) => PART[type].at(p, i));
    if (!unique(seq.map((x, i) => (i === m ? null : x)), m, seq[m])) throw new Error("ambiguous part");
  }
  const terms = range(0, n - 1).map((i) => cell(parts, i));
  if (new Set(terms).size !== n) throw new Error("repeat term");
  const right = terms[m];
  // distractors: one part nudged by ±1 (letters) / ±step (numbers)
  const wrongs = [];
  parts.forEach(([type, p], j) => {
    for (const s of [1, -1, 2]) {
      const alt = parts.map((x, k) => (k === j ? x : x));
      const v = PART[type].at(p, m) + s * (PART[type].letter ? 1 : Math.max(1, Math.round(Math.abs(PART[type].at(p, m) - PART[type].at(p, m - 1)) / 3) || 1));
      if (PART[type].letter && (v < 1 || v > 26)) continue;
      if (!PART[type].letter && v < 0) continue;
      const txt = parts.map(([t2, p2], k) => (k === j ? (PART[t2].letter ? LET(v) : String(v)) : PART[t2].letter ? LET(PART[t2].at(p2, m)) : String(PART[t2].at(p2, m)))).join("");
      if (txt !== right && !wrongs.includes(txt)) wrongs.push(txt);
    }
  });
  const pickW = [];
  for (let k = 0; pickW.length < 3 && k < wrongs.length; k++) pickW.push(wrongs[(R.hashOf(prm) + k * 5) % wrongs.length]);
  const o = [right, ...[...new Set(pickW)]];
  for (let k = 0; o.length < 4 && k < wrongs.length; k++) if (!o.includes(wrongs[k])) o.push(wrongs[k]);
  if (o.length < 4) throw new Error("few options");
  const [en, hi] = pickOf(ask, prm, 3);
  const S = terms.map((x, i) => (i === m ? "?" : x)).join(", ");
  const single = parts.length === 1;
  const howEn = parts.map(([type, p], j) => { const seq = range(0, n - 1).map((i) => (PART[type].letter ? LET(PART[type].at(p, i)) : PART[type].at(p, i))).join(", "); return `${single ? "The terms" : `${ORD[j]} ${PART[type].letter ? "letters" : "numbers"}`}: ${seq} (${PART[type].how(p)})`; }).join("; ");
  const howHi = parts.map(([type, p], j) => { const seq = range(0, n - 1).map((i) => (PART[type].letter ? LET(PART[type].at(p, i)) : PART[type].at(p, i))).join(", "); return `${single ? "पद" : `${ORDH[j]} ${PART[type].letter ? "अक्षर" : "संख्याएँ"}`}: ${seq} (${PART[type].how(p)})`; }).join("; ");
  return R.XQ(title, en.replace("$S", S), hi.replace("$S", S), o.slice(0, 4), null, (i) => o[i] === cell(parts, m),
    `${howEn}. So the ${unitEn} in place of ? is ${right}.`, `${howHi}। अतः ? के स्थान पर ${right} आएगा।`);
}

module.exports = { PART, LET, cell, clusterQ, ok };

// ---- a kind of cluster series: a list of part shapes ("lap", "nsq", ...);
// parameters are a fixed random sample per kind (a full product of four
// parts runs to billions).
const { rng } = require("./gen");
const STEPS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
const PARAMS = {
  lap: [range(1, 26), STEPS],
  ldiff: [range(1, 12), [1, 2], [1, 2]],
  nap: [range(1, 40), range(1, 12)],
  ngp: [range(1, 6), [2, 3]],
  nsq: [range(1, 14)],
  ncube: [range(1, 6)],
  ndiff: [range(1, 30), range(1, 6), range(1, 3)],
};
const posOf = (n) => [n - 1, n - 2, n - 3].filter((m) => m >= 3);
function clusterKind(id, levels, shapes, { n = [5, 6], ask, unit = ["letter-cluster", "अक्षर-समूह"], filter = () => true, gen = null } = {}) {
  const lists = shapes.flatMap((t) => PARAMS[t]);
  const partsOf = (p) => { let k = 0; return shapes.map((t) => { const len = PARAMS[t].length; const q = p.slice(k, k + len); k += len; return [t, q]; }); };
  return {
    id, levels,
    cands: () => {
      const rnd = rng(R.hashOf([id.length, ...id.split("").map((c) => c.charCodeAt(0))]));
      const seen = new Set(); const base = gen ? gen() : [];
      for (let t = 0; !gen && t < 80000 && base.length < 2500; t++) {
        const p = lists.map((l) => l[Math.floor(rnd() * l.length)]);
        const k = p.join(","); if (seen.has(k) || !filter(p) || !ok(partsOf(p), Math.max(...n))) continue; seen.add(k); base.push(p);
      }
      return base.flatMap((p) => n.flatMap((nn) => posOf(nn).map((m) => [...p, nn, m])));
    },
    build: (title, prm) => {
      const [nn, m] = prm.slice(-2);
      return clusterQ(title, prm, partsOf(prm.slice(0, -2)), nn, m, ask, unit[0], unit[1]);
    },
  };
}
module.exports.clusterKind = clusterKind;
module.exports.STEPS = STEPS;
