// Profit & Loss as uploaded (2026-10-27): the three topics' 10 tests per
// level as built, and Mixed Practice fitted around the old Mixed #1 tests
// (12 AI questions each, admin API) - each topped up to 20, and the six old
// questions found wrong or repeated swapped in place for new ones.
const { fitAround } = require("./fill-plan");
const cp = require("./pl-cpsp");
const dm = require("./pl-dmp");
const dd = require("./pl-dd");
const mx = require("./pl-mixed");

// Old questions replaced in place (id -> why), by level.
const REPLACE = {
  medium: [["6ab65357f1950f403dbb2dab", "Marked answer Rs 2.66 is wrong: 240 / 90 = Rs 2.67 (2⅔)"]],
  hard: [
    ["6ab65397f1950f403dbb2dba", "Wrong key: the numbers give a cost of 1800/7, not ₹600"],
    ["6ab8afa59cccc2c0f08dadd5", "No option is right: 32 × 0.8 / 1.2 = 21.33 oranges, marked 20"],
    ["6ab8afa59cccc2c0f08dadd6", "Solution uses a wrong formula (40 − 20 − 8)"],
  ],
  advanced: [
    ["6ab654d5f1950f403dbb2df7", "Same question as #1 of this test (two items at ₹990, 10%)"],
    ["6ab654e7f1950f403dbb2e04", "Question does not make sense (asks a 'change' with no clear meaning)"],
  ],
};

const BANK_REPEATS = { easy: ["A dealer marks his goods 20% above the cost price and gives a discount of 10%. What is his profit percentage?"] };

let plan;
const mixed = () => {
  if (!plan) {
    dd.topic();
    plan = fitAround({ topic: mx.topic(), prefix: mx.PREFIX, existing: { easy: { 1: 12 }, medium: { 1: 12 }, hard: { 1: 12 }, advanced: { 1: 12 } } });
    // Refused by the server as a repeat of a question already in the chapter's bank.
    for (const level of Object.keys(BANK_REPEATS)) {
      plan[level] = plan[level].map((q) => (BANK_REPEATS[level].includes(q.q) ? { ...plan.spare[level].shift(), t: q.t } : q));
    }
    for (const level of Object.keys(REPLACE)) {
      for (const [id, why] of REPLACE[level]) {
        const q = plan.spare[level].shift();
        plan[level].push({ ...q, t: `${mx.PREFIX} · ${level[0].toUpperCase() + level.slice(1)} #1`, r: id, rr: why });
      }
    }
  }
  return plan;
};

const files = {
  cpsp: (level) => cp.topic()[level].flat(),
  dmp: (level) => dm.topic()[level].flat(),
  dd: (level) => dd.topic()[level].flat(),
  mixed: (level) => mixed()[level],
};
module.exports = (name, level) => files[name](level);
