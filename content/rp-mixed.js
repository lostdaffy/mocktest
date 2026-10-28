// Ratio & Proportion · Mixed Practice (the whole chapter): every kind of the
// four topics, with sets of numbers none of them used (one shared list for
// the chapter, keyed on the numbers each question shows). The old Mixed #1
// tests (12 questions each) are topped up to 20 in rp-upload.js.
const L = require("./rp-lib");
const { fillTopic } = require("./gen");
const ratio = require("./rp-ratio");
const prop = require("./rp-prop");
const part = require("./rp-part");
const age = require("./rp-age");

const PREFIX = "Ratio & Proportion · Mixed Practice";
const KINDS = [...ratio.KINDS, ...prop.KINDS, ...part.KINDS, ...age.KINDS];
// The topics are always built first and in this order, so a file built on
// its own uses the same numbers as every other run.
const all = () => { ratio.topic(); prop.topic(); part.topic(); age.topic(); };
const topic = () => { all(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED }); };
module.exports = { KINDS, topic, PREFIX, all };
