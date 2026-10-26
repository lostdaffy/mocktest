// Income and Expenditure as uploaded: fitted around the tests the server
// queue had already made (read from the admin API on 2026-10-26), with any
// question that repeats one already in the chapter swapped for a spare.
const { fitAround, swapRepeats } = require("./fill-plan");
const ie = require("./pc-ie");
const EXISTING = { easy: { 1: 19 }, medium: { 1: 20, 2: 19 }, hard: { 1: 15 }, advanced: { 1: 20, 2: 18 } };
const PREVIOUS = ["pc-succ-easy-a", "pc-succ-easy-b", "pc-succ-easy-c", "pc-succ-med-a", "pc-succ-med-b", "pc-succ-med-c", "pc-succ-hard-a", "pc-succ-hard-b", "pc-succ-hard-c", "pc-succ-adv-a", "pc-succ-adv-b", "pc-succ-adv-c", "pc-pop-easy", "pc-pop-medium", "pc-pop-hard", "pc-pop-advanced"];
let plan;
const get = () => {
  if (!plan) {
    plan = fitAround({ topic: ie.topic(), prefix: ie.PREFIX, existing: EXISTING });
    plan.swapped = swapRepeats(plan, PREVIOUS.flatMap((f) => require(`./${f}.js`)).map((x) => x.q));
  }
  return plan;
};
module.exports = (level) => get()[level];
module.exports.swapped = () => get().swapped;
