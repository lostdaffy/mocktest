// Simple & Compound Interest as uploaded: the two topics' 10 tests per level
// as built, and Mixed Practice fitted around the old Mixed #1 tests (12 AI
// questions each, admin API) - each topped up to 20, and the five old
// questions found wrong or repeated swapped in place for new ones.
const { fitAround } = require("./fill-plan");
const si = require("./sci-si");
const ci = require("./sci-ci");
const mx = require("./sci-mixed");
const ex = require("./sci-existing");

// Refused by the server as a repeat of a question already in the bank.
const BANK_REPEATS = { easy: ["At compound interest a sum of money becomes 4 times itself in 3 years. In how many years will it become 64 times itself?"] };

let plan;
const mixed = () => {
  if (!plan) {
    plan = fitAround({ topic: mx.topic(), prefix: mx.PREFIX, existing: { easy: { 1: 12 }, medium: { 1: 12 }, hard: { 1: 12 }, advanced: { 1: 12 } } });
    for (const level of Object.keys(BANK_REPEATS)) {
      plan[level] = plan[level].map((q) => (BANK_REPEATS[level].includes(q.q) ? { ...plan.spare[level].shift(), t: q.t } : q));
    }
    for (const level of Object.keys(ex.bad)) {
      for (const [id, why] of ex.bad[level]) {
        const q = plan.spare[level].shift();
        plan[level].push({ ...q, t: `${mx.PREFIX} · ${level[0].toUpperCase() + level.slice(1)} #1`, r: id, rr: why });
      }
    }
  }
  return plan;
};

const files = {
  si: (level) => si.topic()[level].flat(),
  ci: (level) => ci.topic()[level].flat(),
  mixed: (level) => mixed()[level],
};
module.exports = (name, level) => files[name](level);
