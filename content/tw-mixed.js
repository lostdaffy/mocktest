// Time & Work · Mixed Practice (the whole chapter): every kind of the three
// topics, with sets of numbers none of them used (one shared list for the
// chapter, keyed on the numbers each question shows). The old Mixed tests
// (12 AI questions each) are topped up to 20 in tw-upload.js.
const L = require("./tw-lib");
const { fillTopic } = require("./gen");
const eff = require("./tw-eff");
const pipe = require("./tw-pipe");
const wage = require("./tw-wage");

const PREFIX = "Time & Work · Mixed Practice";
const KINDS = [...eff.KINDS, ...pipe.KINDS, ...wage.KINDS];
// The topics are always built first and in this order, so a file built on
// its own uses the same numbers as every other run.
const all = () => { eff.topic(); pipe.topic(); wage.topic(); };
const topic = () => { all(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED }); };
module.exports = { KINDS, topic, PREFIX, all };
