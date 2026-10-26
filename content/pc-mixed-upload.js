// Mixed Practice as uploaded: medium, hard and advanced fitted around the
// tests the server queue had already made (admin API, 2026-10-26), with any
// question that repeats one already in the chapter swapped for a spare.
const { fitAround, swapRepeats } = require("./fill-plan");
const mixed = require("./pc-mixed");
const ieUpload = require("./pc-ie-upload");
const EXISTING = { easy: { 1: 20, 2: 20, 3: 20, 4: 20, 5: 20, 6: 20, 7: 20, 8: 20, 9: 20, 10: 20 }, medium: { 1: 20, 2: 20, 3: 18 }, hard: { 1: 20, 2: 20, 3: 17 }, advanced: { 1: 20, 2: 20, 3: 20, 4: 20, 5: 19 } };
const PREVIOUS = ["pc-succ-easy-a", "pc-succ-easy-b", "pc-succ-easy-c", "pc-succ-med-a", "pc-succ-med-b", "pc-succ-med-c", "pc-succ-hard-a", "pc-succ-hard-b", "pc-succ-hard-c", "pc-succ-adv-a", "pc-succ-adv-b", "pc-succ-adv-c", "pc-pop-easy", "pc-pop-medium", "pc-pop-hard", "pc-pop-advanced"];
let plan;
const get = () => {
  if (!plan) {
    const t = mixed.topic();
    plan = fitAround({ topic: { easy: [], ...t }, prefix: mixed.PREFIX, existing: EXISTING });
    const before = [...PREVIOUS.flatMap((f) => require(`./${f}.js`)), ...["easy", "medium", "hard", "advanced"].flatMap((l) => ieUpload(l))].map((x) => x.q);
    plan.swapped = swapRepeats(plan, before);
  }
  return plan;
};
module.exports = (level) => get()[level];
module.exports.swapped = () => get().swapped;
