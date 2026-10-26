// Fills a topic's practice tests from "kinds" of questions: each kind lists
// the numbers it can be asked with (only those with a clean answer) and
// writes the question from one set of them. A set of numbers is used once in
// the whole topic - in any order, since [10, 20] and [20, 10] give a student
// the same sum - so no two questions are the same sum in other words.
//
// A test of 20 takes every kind of its level once, then the kinds again in
// turn until it is full; no kind more than twice, so a test never drills one
// pattern (the server allows 3).
const { fmt } = require("./fmt");

// A fixed shuffle (mulberry32), so a rebuild gives the same tests.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, seed) {
  const r = rng(seed);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// The numbers of a set, sorted: what makes two sets "the same sum".
const numbersOf = (p) => JSON.stringify(
  (Array.isArray(p) ? p : Object.values(p)).flat(Infinity).filter((x) => typeof x === "number").sort((a, b) => a - b)
);

/**
 * kinds: [{ id, levels: ["easy", ...], cands: () => [params...], build: (title, params) => question }]
 * Returns the questions of tests `from`..`to` of `level`, titled by title(n).
 * `used` is shared by every level of the topic.
 */
function fillTests({ kinds, level, from, to, title, used = new Set(), size = 20 }) {
  const mine = kinds.filter((k) => k.levels.includes(level));
  if (!mine.length) throw new Error(`no kind for ${level}`);
  const pools = new Map(mine.map((k) => [k.id, shuffle(k.cands(), hash(k.id + level))]));
  const take = (k) => {
    const pool = pools.get(k.id);
    while (pool.length) {
      const p = pool.shift();
      const key = `${k.group || k.id}|${numbersOf(p)}`;
      if (used.has(key)) continue;
      used.add(key);
      return p;
    }
    return null;
  };
  // Tests before `from` take their numbers first, so tests 4-6 built alone
  // are the same as tests 4-6 built with 1-3.
  const out = [];
  for (let n = 1; n <= to; n++) {
    const order = shuffle(mine, hash(`${level}#${n}`));
    const count = new Map();
    const qs = [];
    for (let round = 0; qs.length < size && round < 3; round++) {
      for (const k of order) {
        if (qs.length >= size) break;
        if ((count.get(k.id) || 0) >= 2) continue;
        if (round > 0 && k.once) continue;
        const p = take(k);
        if (!p) continue;
        count.set(k.id, (count.get(k.id) || 0) + 1);
        qs.push(k.build(title(n), p));
      }
    }
    if (qs.length < size) throw new Error(`${title(n)}: only ${qs.length} questions - add more numbers to the kinds`);
    if (n >= from) out.push(...qs);
  }
  return out.map(fmt);
}

module.exports = { fillTests, shuffle, rng, numbersOf };

// Every level of a topic in one go, easy to advanced, with one shared list of
// used numbers - so an easy and a hard question never share a set either.
// Returns { easy: [[20 questions] x 10], medium: ..., ... } (cached per kinds).
const LEVELS = ["easy", "medium", "hard", "advanced"];
const cache = new Map();
// `used` may be shared with other topics of the chapter (a kind used in two
// topics then never repeats a set of numbers across them).
function fillTopic({ kinds, prefix, tests = 10, used = new Set(), levels = LEVELS }) {
  if (cache.has(prefix)) return cache.get(prefix);
  const out = {};
  for (const level of levels) {
    const name = level[0].toUpperCase() + level.slice(1);
    const all = fillTests({ kinds, level, from: 1, to: tests, title: (n) => `${prefix} · ${name} #${n}`, used });
    out[level] = Array.from({ length: tests }, (_, i) => all.slice(i * 20, i * 20 + 20));
  }
  cache.set(prefix, out);
  return out;
}
module.exports.fillTopic = fillTopic;
module.exports.LEVELS = LEVELS;
