// Profit & Loss · Mixed Practice (the whole chapter): every kind of the
// three topics, with sets of numbers none of them used (one shared list for
// the chapter), so a mixed test has up to 20 different kinds of question.
// The old Mixed #1 tests (12 questions each) are topped up to 20 in
// pl-upload.js. Every answer is worked out again in `v`.
const L = require("./pl-lib");
const { fillTopic } = require("./gen");
const cp = require("./pl-cpsp");
const dm = require("./pl-dmp");
const dd = require("./pl-dd");

const PREFIX = "Profit & Loss · Mixed Practice";
const KINDS = [...cp.KINDS, ...dm.KINDS, ...dd.KINDS];
const topic = () => { dd.topic(); return fillTopic({ kinds: KINDS, prefix: PREFIX, used: L.USED }); };
module.exports = { KINDS, topic, PREFIX };
