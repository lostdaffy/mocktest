// HCF & LCM · Mixed Practice (the whole chapter): every kind of the three
// topics, with sets of numbers none of them used (one shared list for the
// chapter, keyed on the numbers each question shows). The old Mixed tests
// (11-12 AI questions each) are topped up to 20 in hl-upload.js.
const L = require("./hl-lib");
const { fillTopic } = require("./gen");
const hcf = require("./hl-hcf");
const lcm = require("./hl-lcm");
const word = require("./hl-word");

const PREFIX = "HCF & LCM · Mixed Practice";
const KINDS = [...hcf.KINDS, ...lcm.KINDS, ...word.KINDS];
// The topics are always built first and in this order, so a file built on
// its own uses the same numbers as every other run.
const all = () => { hcf.topic(); lcm.topic(); word.topic(); };
const topic = () => { all(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED }); };
module.exports = { KINDS, topic, PREFIX, all };
