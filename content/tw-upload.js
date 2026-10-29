// Time & Work as uploaded: the three topics' 10 tests per level as built, and
// Mixed Practice fitted around the 8 old Mixed tests (12 AI questions each,
// admin API) - each topped up to 20, the old questions found wrong or
// repeated swapped in place for new ones, and #3-#10 of every level made new.
// Every file builds the whole chapter in the same order.
const { fitAround } = require("./fill-plan");
const T = { eff: require("./tw-eff"), pipe: require("./tw-pipe"), wage: require("./tw-wage") };
const mx = require("./tw-mixed");
const ex = require("./tw-existing");

// Refused by the server as a repeat of a question already in the bank: the
// question text, swapped for a spare of the same level.
const BANK_REPEATS = {};
const NAME = { easy: "Easy", medium: "Medium", hard: "Hard", advanced: "Advanced" };

let plan;
const mixed = () => {
  if (!plan) {
    plan = fitAround({ topic: mx.topic(), prefix: mx.PREFIX, existing: ex.counts });
    for (const level of Object.keys(BANK_REPEATS)) {
      plan[level] = plan[level].map((q) => (BANK_REPEATS[level].includes(q.q) ? { ...plan.spare[level].shift(), t: q.t } : q));
    }
    for (const level of Object.keys(ex.bad)) {
      for (const [num, id, why] of ex.bad[level]) {
        const q = plan.spare[level].shift();
        if (!q) throw new Error(`${level}: no spare left for a replacement`);
        plan[level].push({ ...q, t: `${mx.PREFIX} · ${NAME[level]} #${num}`, r: id, rr: why });
      }
    }
  }
  return plan;
};

module.exports = (name, level) => {
  if (name === "mixed") return mixed()[level];
  mx.all();
  return T[name].topic()[level].flat();
};
