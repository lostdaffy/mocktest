// Number & Letter Series · Alphanumeric Series: terms that mix letters and
// numbers ("A1, C3, E5, ?", "2B, 4D, 8F, ?", "D4V, H9T, L16R, ?"); each letter
// and each number follows its own rule, checked for a single answer.
const R = require("./rs-lib");
const { clusterKind } = require("./rs-cluster");
const { fillTopic } = require("./gen");
const CH = require("./rs-ser-chapter");

const PREFIX = "Number & Letter Series · Alphanumeric Series";
const ASK = [
  ["Which term will replace the question mark (?) in the series: $S", "श्रृंखला में प्रश्न चिह्न (?) के स्थान पर कौन-सा पद आएगा: $S"],
  ["Select the term that can replace the question mark (?) in the following series: $S", "उस पद का चयन कीजिए जो निम्नलिखित श्रृंखला में प्रश्न चिह्न (?) के स्थान पर आ सकता है: $S"],
  ["Find the missing term in the alphanumeric series: $S", "अक्षरांकीय श्रृंखला में लुप्त पद ज्ञात कीजिए: $S"],
  ["Complete the series: $S", "श्रृंखला पूरी कीजिए: $S"],
];
const k = (id, levels, shapes, o = {}) => clusterKind(id, levels, shapes, { ask: ASK, unit: ["term", "पद"], ...o });
const K = [
  k("LN", ["easy", "medium"], ["lap", "nap"]),
  k("NL", ["easy", "medium"], ["nap", "lap"]),
  k("LNsq", ["easy", "medium", "hard"], ["lap", "nsq"]),
  k("NgpL", ["easy", "medium", "hard"], ["ngp", "lap"]),
  k("LNL", ["easy", "medium", "hard"], ["lap", "nap", "lap"]),
  k("NLN", ["easy", "medium"], ["nap", "lap", "nap"]),
  k("LLN", ["easy", "medium"], ["lap", "lap", "nap"]),
  k("LNdiff", ["medium", "hard", "advanced"], ["lap", "ndiff"]),
  k("LsqL", ["medium", "hard", "advanced"], ["lap", "nsq", "lap"]),
  k("NcubeL", ["medium", "hard", "advanced"], ["ncube", "lap"]),
  k("LdiffN", ["hard", "advanced"], ["ldiff", "nap"]),
  k("LdiffNsq", ["hard", "advanced"], ["ldiff", "nsq"]),
  k("NLdiffN", ["hard", "advanced"], ["nap", "ldiff", "ngp"]),
  k("LNLN", ["hard", "advanced"], ["lap", "nap", "lap", "ndiff"], { n: [5] }),
  k("LdNdL", ["advanced"], ["ldiff", "ndiff", "lap"]),
  k("NcubeLd", ["advanced"], ["ncube", "ldiff"]),
  k("LNgpL", ["advanced"], ["lap", "ngp", "lap"]),
];
const KINDS = CH.guard(K, "anum");
const topic = () => fillTopic({ kinds: KINDS, prefix: PREFIX, used: CH.USED, cap: 3 });
module.exports = { KINDS, topic, PREFIX };
