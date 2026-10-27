// Simple & Compound Interest · Mixed Practice (the whole chapter): every kind
// of the two topics, with sets of numbers neither of them used (one shared
// list for the chapter). The old Mixed #1 tests (12 questions each) are
// topped up to 20 in sci-upload.js. Every answer is worked out again in `v`.
const L = require("./sci-lib");
const { fillTopic } = require("./gen");
const si = require("./sci-si");
const ci = require("./sci-ci");

const PREFIX = "Simple & Compound Interest · Mixed Practice";
const KINDS = [...si.KINDS, ...ci.KINDS];
const topic = () => { si.topic(); ci.topic(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED }); };
module.exports = { KINDS, topic, PREFIX };
