// Average · Mixed Practice (the whole chapter): every kind of the three
// topics, with sets of numbers none of them used (one shared list for the
// chapter, keyed on the numbers each question shows). The old Mixed #1 tests
// (12 questions each) are topped up to 20 in av-upload.js.
const L = require("./av-lib");
const { fillTopic } = require("./gen");
const num = require("./av-num");
const age = require("./av-age");
const wt = require("./av-wt");

const PREFIX = "Average · Mixed Practice";
const KINDS = [...num.KINDS, ...age.KINDS, ...wt.KINDS];
// The topics are always built first and in this order, so a file built on
// its own uses the same numbers as every other run.
const all = () => { num.topic(); age.topic(); wt.topic(); };
const topic = () => { all(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED }); };
module.exports = { KINDS, topic, PREFIX, all };
