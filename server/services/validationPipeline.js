const { verifyQuestions } = require("./geminiService");
const { isHindiMedium, hasDevanagari, isLanguageNeutral } = require("../utils/language");
const { refersToAPassage, carriesItsPassage } = require("../utils/comprehension");
const { arguesWithItself } = require("../utils/selfDoubt");
const { solutionReachesTheAnswer } = require("../utils/answerAgrees");
const { checkArithmetic, checkFormula, isNumberOption } = require("./mathCheck");
const { plainMathsUpdate } = require("./mathNotation");
const IS_MATHS = /^(math|गणित|quant|arith|numerical)/i;
// Phrases that put a fact on today's date. "वर्तमान आयु" is a sum and
// "वर्तमान भारतीय राज्य" a place on the map, so only "at present / currently /
// recently" and "the current <office>" count.
const DATED_PHRASE = /(हाल\s*ही\s*में|हाल\s*के\s*(वर्षों|दिनों)|वर्तमान\s*में|वर्तमान\s*(मुख्य|अध्यक्ष|राष्ट्रपति|प्रधान|राज्यपाल|महासचिव|गवर्नर|कप्तान|मंत्री|सचिव|निदेशक|आयुक्त|न्यायाधीश|सेनाध्यक्ष|प्रमुख)|\bcurrently\b|\bat present\b|\bpresently\b|\brecently\b|\bin recent years\b|\bcurrent (chief|president|prime|governor|secretary|ceo|chairman|chairperson|head|captain|minister|director|commissioner|speaker)|\bincumbent\b|\blatest\b)/i;
const { normaliseChart, checkChartAnswer, normaliseFigure, checkFigureAnswer, visualSignature, figureKey } = require("./visuals");

// "What is 15% of 240?" and "what is 15 % of 240" are the same question.
// Used both to spot repeats inside a batch and to catch a question the bank
// already has (Question.textKey).
// Raised digits are kept as digits: without this "unit digit of 9⁴⁰" and
// "unit digit of 9⁹" both became "unit digit of 9" - one refused as a copy
// of the other.
const SUPERSCRIPT = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
// The signs of a sum are part of it too: "1¹ + 2² + 3³" and "1¹ × 2² × 3³"
// are different questions, and so are 2^(3^5) and (2^3)^5. Each sign becomes
// a word, so a copy written with other spacing or a typed "*" still matches.
const SIGNS = [
  [/[+]/g, " plus "], [/[×*·]/g, " times "], [/[÷/]/g, " over "], [/[−–]/g, " minus "],
  [/(^|[\s\d)])-(?=[\s\d(])/g, "$1 minus "], [/\^/g, " pow "], [/[(]/g, " lp "], [/[)]/g, " rp "],
  [/!/g, " fact "], [/√/g, " root "], [/=/g, " eq "],
];
function questionKey(text) {
  let t = String(text || "").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => " pow " + [...m].map((c) => SUPERSCRIPT[c]).join("") + " ");
  for (const [re, word] of SIGNS) t = t.replace(re, word);
  return t
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .trim();
}

// Words that carry no meaning for telling two questions apart. Kept small
// on purpose - the job is to drop grammar, not vocabulary.
const STOPWORDS = new Set([
  "the", "a", "an", "of", "is", "are", "was", "were", "be", "been", "to", "in", "on", "at", "by", "for",
  "with", "and", "or", "if", "then", "than", "that", "this", "these", "those", "it", "its", "his", "her",
  "he", "she", "they", "them", "their", "what", "which", "who", "how", "much", "many", "find", "value",
  "must", "can", "will", "would", "should", "does", "do", "did", "has", "have", "had", "from", "so",
  "as", "but", "not", "no", "yes", "there", "here", "when", "where", "why", "per", "each", "every",
]);

// The numbers a question is built on, in order. Two questions asking the
// same thing about the same figures share this exactly: "increases by 20%"
// is "20" whether a housewife or a householder is doing the increasing.
// A raised power is a number too, and a power is not a base: 7⁴⁵ and 7⁴⁶
// are different questions, and so are 3⁷ and 7³ (2^5 and 2⁵ are the same).
const SUPERSCRIPT_DIGITS = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
// "three-digit" is a number the question is built on as much as "3-digit",
// and a count of digits is not the divisor: a five-digit multiple of 4 is not
// a four-digit multiple of 5. It is marked #5.
const DIGIT_WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5, "छह": 6, "सात": 7, "आठ": 8, "नौ": 9 };
// A number with unknown digits, 7ab6 or 5x2y4, is one thing as written:
// 7ab6 and 7a6b are different numbers, not the digits 7 and 6 twice.
const PATTERN = /\b(?=[0-9a-z]*\d)(?=\d*[a-z])[0-9a-z]{3,}\b/gi;
function numberSignature(text) {
  const plain = String(text || "")
    .replace(PATTERN, (m) => ` @${m.toLowerCase()} `)
    .replace(/\b(two|three|four|five|six|seven|eight|nine)[- ]digit/gi, (m, w) => ` #${DIGIT_WORDS[w.toLowerCase()]} `)
    .replace(/\b(\d)[- ]digit/gi, (m, d) => ` #${d} `)
    .replace(/(दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ) अंक/g, (m, w) => ` #${DIGIT_WORDS[w]} `)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => SUPERSCRIPT_DIGITS[c]).join("") + " ")
    .replace(/\^\s+(?=\d)/g, "^");
  return (plain.match(/@[0-9a-z]+|[#^]?[0-9]+(?:\.[0-9]+)?/g) || []).sort().join("|");
}

function contentWords(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

// How alike two questions may be before the second one is a repeat.
//
// Measured against the first 63 real questions: sweeping this from 0.55 to
// 0.65 catches the same 10 repeats every time, and 0.7 starts missing one.
// That flat stretch is the gap between a rewording and a different
// question, so 0.65 sits inside it rather than on an edge.
const REPEAT_SIMILARITY = 0.65;

/**
 * Is this question one the bank has already asked, just worded differently?
 *
 * Comparing exact text was not enough. Told not to repeat itself, the model
 * obliges by changing a word: "must a housewife reduce her consumption"
 * becomes "must a householder reduce the consumption" - same 20%, same
 * answer, a different string. Five of one chapter's thirty-seven questions
 * had a twin like that, and every one of them was published and reachable
 * by a student.
 *
 * Two things have to line up: the same numbers, and most of the same
 * meaningful words. Either alone is too blunt - plenty of honest questions
 * share "20%", and plenty share vocabulary while asking something else.
 */
// Words that turn a question into a different one while the rest stays:
// the largest three-digit multiple of 7 is not the smallest, and "which is
// NOT divisible" is not "which is divisible".
const LARGEST = /\b(largest|greatest|maximum|highest|biggest)\b|सबसे बड़ी|सबसे बड़ा|अधिकतम/i;
const SMALLEST = /\b(smallest|least|minimum|lowest)\b|सबसे छोटी|सबसे छोटा|न्यूनतम/i;
const NEGATED = /\bnot\b|\bneither\b|नहीं/i;
const extreme = (s) => (LARGEST.test(s) ? "largest" : "") + (SMALLEST.test(s) ? "smallest" : "");
// Even digits are not odd digits, and "how many" is not "what is the sum".
const EVEN = /\beven\b| सम /i;
const ODD = /\bodd\b|विषम/i;
const parity = (s) => (EVEN.test(s) ? "even" : "") + (ODD.test(s) ? "odd" : "");
const asks = (s) => (/\bhow many\b|कितनी|कितने/i.test(s) ? "count" : /\bsum\b|योग/i.test(s) ? "sum" : /\bproduct\b|गुणनफल/i.test(s) ? "product" : "");
// The operations a question names, wherever they appear: "divisible by the
// product of its digits" is not "divisible by the sum of its digits".
const OPERATIONS = [["sum", /\bsum\b|योग/i], ["product", /\bproduct\b|गुणनफल/i], ["difference", /\bdifference\b|अंतर/i], ["average", /\baverage\b|औसत/i]];
const operations = (s) => OPERATIONS.filter(([, re]) => re.test(s)).map(([k]) => k).join("+");
const differ = (f, a, b) => f(a) && f(b) && f(a) !== f(b);
const turnsAround = (a, b) =>
  differ(extreme, a, b) || differ(parity, a, b) || differ(asks, a, b) || differ(operations, a, b) || NEGATED.test(a) !== NEGATED.test(b);

function looksLikeRepeat(text, existingTexts = []) {
  const signature = numberSignature(text);
  const words = contentWords(text);
  // A short question with at most one number says too little for its words
  // to decide: "Every number divisible by 8 is also divisible by" is not "A
  // number is divisible by 8 if". With two or more numbers in common it is
  // decided as usual ("LCM of 12, 15 and 20").
  const numbers = signature ? signature.split("|").length : 0;

  for (const other of existingTexts) {
    if (!other) continue;
    if (numberSignature(other) !== signature) continue;
    if (turnsAround(String(text), String(other))) continue;
    const theirs = contentWords(other);
    if (numbers < 2 && Math.min(words.size, theirs.size) < 3) continue;
    if (overlap(words, theirs) >= REPEAT_SIMILARITY) return { repeat: true, of: other };
  }
  return { repeat: false, of: null };
}

// Hindi grammar words, for sameFactInPaper only - looksLikeRepeat's 0.65 was
// measured with them counted, so they stay out of its list.
const HINDI_STOPWORDS = new Set(
  "में से का की के है हैं को कौन सा सी किस किसे क्या होगा होती होता निम्नलिखित निम्न द्वारा लिए एक और था थी थे गया गई किया जाता जाती कीजिए चुनिए शब्द सही".split(" ")
);
const factWords = (text) => new Set([...contentWords(text)].filter((w) => !HINDI_STOPWORDS.has(w)));
const quotedTerms = (text) =>
  new Set((String(text || "").match(/['‘’"“”]([^'‘’"“”]{2,40})['‘’"“”]/g) || []).map((x) => x.slice(1, -1).trim()));
const within = (a, b) => a.size > 0 && [...a].every((w) => b.has(w));

/**
 * Do two questions of ONE paper ask the same thing? Stricter about wording
 * than looksLikeRepeat but it also needs the same answer, which is what makes
 * it safe to use across subjects.
 *
 * Super TET Mock #1 asked who wrote 'कामायनी' twice, Mock #2 when 'समाजवादी'
 * entered the Preamble in GK and again in EVS, and both the series
 * 2, 6, 12, 20, 30 twice in other words. Measured on those two mocks (14,280
 * pairs) it finds those 7 pairs and nothing else. Both need:
 *   - the same correct answer (or one's words inside the other's: "गंगा" /
 *     "गंगा नदी"), and
 *   - the same three or more numbers, a term in quotes in common, or 40% of
 *     the meaningful words.
 */
function sameFactInPaper(a, b) {
  const ansA = String(a?.options?.[a?.correctIndex] ?? "").trim();
  const ansB = String(b?.options?.[b?.correctIndex] ?? "").trim();
  if (!ansA || !ansB) return false;
  const wa = factWords(ansA);
  const wb = factWords(ansB);
  const sameAnswer = ansA === ansB || overlap(wa, wb) >= 0.6 || within(wa, wb) || within(wb, wa);
  if (!sameAnswer) return false;

  const na = String(a.text || "").match(/[0-9]+(?:\.[0-9]+)?/g) || [];
  if (na.length >= 3 && numberSignature(a.text) === numberSignature(b.text)) return true;
  const qb = quotedTerms(b.text);
  if ([...quotedTerms(a.text)].some((t) => qb.has(t))) return true;
  return overlap(factWords(a.text), factWords(b.text)) >= 0.4;
}

// Greek, Cyrillic, Arabic, the Indic scripts other than Devanagari, CJK.
// Hindi and English are both fine; these never belong in a question here.
const FOREIGN_SCRIPT = /[Ͱ-ϿЀ-ӿ؀-ۿঀ-෿一-鿿]/;
// A Latin letter glued to a Devanagari letter, inside one word ('स्कanner',
// 'pitraaदेशः'). The danda is left out: "HCF × LCM।" is a sentence ending.
const LATIN_INSIDE_HINDI_WORD = /[ऀ-ॣ०-ॿ][A-Za-z]|[A-Za-z][ऀ-ॣ०-ॿ]/;

// Any of these strings carrying another script or a glued Latin word.
const hasMixedScript = (strings) =>
  strings.filter(Boolean).map(String).some((s) => FOREIGN_SCRIPT.test(s) || LATIN_INSIDE_HINDI_WORD.test(s));

// Layer 1: cheap, instant rule-based checks. No AI call needed.
//
// These are deliberately strict. A student practising for a real exam is
// better served by ten solid questions than by twenty where three are
// half-written - so anything that smells like filler is held back for
// review instead of going into a test.
function ruleBasedCheck(q) {
  const issues = [];
  const text = (q.text || "").trim();
  const options = (q.options || []).map((o) => String(o ?? "").trim());
  const solution = (q.solution || "").trim();

  if (options.length !== 4) issues.push("must have exactly 4 options");

  // A chart or figure question is only as good as its picture. Checked again
  // here (the generator checked it first) so a question that reaches the
  // bank any other way meets the same bar.
  if (q.visual?.kind === "chart") {
    try {
      const chart = normaliseChart(q.visual.chart);
      const check = checkChartAnswer({ ...q, formula: q.visual.formula }, chart);
      if (check.ok === false) issues.push(`chart answer does not add up: ${check.reason}`);
    } catch (err) {
      issues.push(`chart unusable: ${err.message}`);
    }
  } else if (q.visual?.kind === "figure" && q.visual.figure?.spec) {
    // A figure drawn in code is checked against its rule; a picture taken
    // from a past paper has no spec, and its answer is the paper's.
    try {
      const check = checkFigureAnswer(normaliseFigure(q.visual.figure?.spec), q.correctIndex);
      if (check.ok === false) issues.push(`figure answer does not follow: ${check.reason}`);
      // Not checkable is not good enough: a figure is only kept when code has
      // worked its answer out from the figures themselves.
      else if (check.ok !== true) issues.push(`figure answer not checked in code: ${check.reason}`);
    } catch (err) {
      issues.push(`figure unusable: ${err.message}`);
    }
  }
  if (options.some((o) => !o)) issues.push("an option is empty");
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) issues.push("duplicate options found");
  if (q.correctIndex === undefined || q.correctIndex === null || q.correctIndex < 0 || q.correctIndex > 3)
    issues.push("correctIndex out of range");

  // A real exam question is a sentence, not a fragment.
  if (text.length < 15) issues.push("question text too short");

  // A one-line "because it is" teaches nothing - the solution is the part a
  // student actually learns from, so it has to explain something.
  //
  // But length alone is a bad judge of that. "(3/4) * 100 = 75%." is 18
  // characters and is the complete, correct explanation; a flat 25-character
  // floor threw it out. In maths, working IS the explanation. So a short
  // solution passes when it actually shows the arithmetic - numbers and an
  // equals sign - and is still rejected when it is just an assertion.
  const showsWorking = /=/.test(solution) && /[0-9]/.test(solution);
  if (solution.length < 25 && !(showsWorking && solution.length >= 12)) {
    issues.push("solution too short to explain anything");
  }
  if (options.some((o) => o.toLowerCase() === solution.toLowerCase())) issues.push("solution is just the option text");

  // A solution that argues with itself is a wrong answer key wearing a
  // solution's clothes. Six were hand-checked and six had the wrong key -
  // one of them worked the answer out correctly three times and then wrote
  // "Correction: Correct option is 40 if calc is wrong."
  if (arguesWithItself(solution)) issues.push("solution argues with itself, so the answer key cannot be trusted");

  // The arithmetic check, and the surest of the lot: a solution that works
  // the question out and ends on 60 km/h, next to a ticked option of 75.
  if (!solutionReachesTheAnswer(q)) {
    issues.push("the solution never arrives at the answer that is ticked");
  }

  // The sums worked out in code (HCF/LCM pairs, place value, simple interest
  // from two amounts) - see services/mathCheck.js.
  const sums = checkArithmetic(q);
  if (sums.ok === false) issues.push(`maths check: ${sums.reason}`);

  // Every other numeric maths question: the setter's own working, run in
  // code. A freshly generated one with numeric options must carry it.
  if (IS_MATHS.test(String(q.subject || ""))) {
    const worked = checkFormula(q);
    if (worked.ok === false) issues.push(`maths working: ${worked.reason}`);
    else if (
      worked.ok === null && worked.reason === "no formula" &&
      q.status === "draft" && q.source === "ai_generated" &&
      (q.options || []).every(isNumberOption)
    ) {
      issues.push("maths working: no formula, so the answer was not worked out in code");
    }
  }

  // A fact dated "today" is wrong a few months later - and a new one is not
  // let in at all (the old ones are on the admin's time-sensitive list).
  if (q.status === "draft" && q.source === "ai_generated" && !IS_MATHS.test(String(q.subject || "")) && !/^(reason|तर्क)/i.test(String(q.subject || ""))) {
    if ([q.text, q.textHi].some((t) => DATED_PHRASE.test(String(t || "")))) issues.push("time-bound fact: asks about 'now' or 'recently'");
  }

  // The app is bilingual and most of these students read Hindi first. A
  // question without Hindi is half a question for them.
  const optionsHi = (q.optionsHi || []).map((o) => String(o ?? "").trim());
  if (!(q.textHi || "").trim()) issues.push("Hindi question missing");
  if (optionsHi.length !== 4 || optionsHi.some((o) => !o)) issues.push("Hindi options missing");
  if (!(q.solutionHi || "").trim()) issues.push("Hindi solution missing");

  // ...and where the subject IS Hindi, a translation is not enough: the
  // question itself has to be in Hindi. Ten of the first twelve व्याकरण
  // questions were written in English and passed every check above, because
  // every check above was satisfied by the translation sitting beside them.
  if (isHindiMedium(q)) {
    if (!hasDevanagari(text)) issues.push("question must be written in Hindi, not English");
    const romanised = options.filter((o) => o && !isLanguageNeutral(o) && !hasDevanagari(o));
    if (romanised.length) issues.push("options must be in Hindi, not romanised");
  }

  // And the last thing nobody was checking: can it be answered at all?
  //
  // "According to the passage, why did the protagonist leave the village?" is
  // half a question. Every one of the first twelve Unseen Passage questions
  // read like that, and nine of twelve in अपठित गद्यांश - four options, a
  // correct index, a solution, and no passage anywhere.
  // Judged by wording, not by chapter: CTET's comprehension chapters also
  // carry teaching-method questions that mention passages in general, and
  // those are answerable exactly as they stand.
  if (refersToAPassage(text)) {
    if (!carriesItsPassage(text)) issues.push("refers to a passage the question does not contain");
  }

  // Another script leaking in: 'ઘर', 'क्षرण', 'रूप سے', 'प्रśনাनुसार',
  // 'स्कanner' - all from the first Super TET mocks, every one printed as is.
  const written = [text, ...options, solution, q.textHi, ...(q.optionsHi || []), q.solutionHi].filter(Boolean).map(String);
  if (written.some((s) => FOREIGN_SCRIPT.test(s) || LATIN_INSIDE_HINDI_WORD.test(s))) {
    issues.push("mixed script: letters from another script inside the text");
  }

  return { passed: issues.length === 0, issues };
}

// Moves the correct answer to a random position (keeping the Hindi options
// aligned with the English ones). Models love putting the answer first; a
// student who notices that stops reading the options and starts guessing.
function shuffleOptions(q) {
  if (!q.options || q.options.length !== 4) return q;
  if (q.correctIndex === undefined || q.correctIndex === null) return q;
  // A figure's options are the boxes (A)-(D) in its picture, in that order.
  // Shuffled, the app showed "A. Figure (C)" and a student who picked box A
  // was marked wrong.
  if (q.visual?.kind === "figure") return q;

  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const hasHindi = Array.isArray(q.optionsHi) && q.optionsHi.length === 4;
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    optionsHi: hasHindi ? order.map((i) => q.optionsHi[i]) : q.optionsHi,
    correctIndex: order.indexOf(q.correctIndex),
  };
}

// Turns whatever the API threw into one line a person can read.
//
// A quota error from Google arrives as about six hundred characters of
// nested JSON, and it was being stored verbatim as the reason a question
// was held back - so the review screen showed a wall of it above every
// affected question. The detail belongs in the server log; the admin needs
// to know whether to wait, top up, or look at the question.
function readableFailure(error) {
  const raw = String(error || "");
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(raw)) return "the day's AI quota is used up - try again tomorrow";
  if (/503|overloaded|UNAVAILABLE/i.test(raw)) return "the AI was busy - try again in a minute";
  if (/timeout|ETIMEDOUT|ECONNRESET/i.test(raw)) return "the AI did not respond in time";
  if (/API key|401|403|PERMISSION/i.test(raw)) return "the AI rejected our API key";
  if (!raw) return "no reason given";
  return raw.replace(/\s+/g, " ").slice(0, 100);
}
// Turns one AI verification result into the question's final status.
// Low-risk (AI agrees with high confidence) -> ready to use.
// High-risk (AI disagrees or is unsure)     -> human review queue.
function applyVerification(question, verification) {
  if (verification.matches && verification.confidence >= 0.75) {
    return { ...question, status: "published", aiConfidenceScore: verification.confidence };
  }

  return {
    ...question,
    status: "under_review",
    flagReason: verification.matches
      ? `Low AI confidence (${verification.confidence})`
      : verification.aiSaid
      ? `AI verification disagreed - it answered "${verification.aiSaid}"`
      : `AI verification could not be completed - ${readableFailure(verification.error)}`,
    aiConfidenceScore: verification.confidence,
  };
}

/**
 * Full pipeline for a WHOLE batch: Rule Check -> AI Self-Verify -> status.
 *
 * Batched on purpose. Verifying questions one at a time meant one Gemini
 * call per question, so a single 12-question test cost 13 calls and blew
 * through the free tier's 15-a-minute limit on its own. Questions that fail
 * the rule check never reach the AI at all.
 */
// A numeric option is the same in every language. "11" has no Hindi
// translation to be missing, and demanding one parked 22 sound Maths
// questions in the review queue over options like "42.8%" and "14 2/3".
// Copying across costs nothing and needs no model.
function fillNeutralHindiOptions(q) {
  const options = (q.options || []).map((o) => String(o ?? "").trim());
  const optionsHi = (q.optionsHi || []).map((o) => String(o ?? "").trim());
  const missing = optionsHi.length !== options.length || optionsHi.some((o) => !o);
  if (!missing || !options.length || !options.every(isLanguageNeutral)) return q;
  return { ...q, optionsHi: [...options] };
}

async function runValidationPipelineBatch(questions, { reshuffle = true } = {}) {
  // reshuffle: false when re-checking questions that are already in
  // circulation. A saved answer is an option number, so moving the options
  // under a student would rewrite the paper they already sat.
  // Powers and × written the way a student reads them (2¹⁵ × 3¹⁰, not
  // 2^15 * 3^10) before anything is judged or saved - see mathNotation.js.
  const prepared = (reshuffle ? questions.map(shuffleOptions) : questions.map((q) => ({ ...q })))
    .map((q) => ({ ...q, ...(plainMathsUpdate(q) || {}) }))
    .map(fillNeutralHindiOptions);
  const ruleResults = prepared.map((q) => ({ question: q, rule: ruleBasedCheck(q) }));
  const needVerification = ruleResults.filter((r) => r.rule.passed).map((r) => r.question);

  const verifications = await verifyQuestions(needVerification);
  const verificationByQuestion = new Map(needVerification.map((q, i) => [q, verifications[i]]));

  return ruleResults.map(({ question, rule }) => {
    const withKey = { ...question, textKey: figureKey(question.visual) || questionKey(question.text + visualSignature(question.visual)) };
    if (!rule.passed) {
      return {
        ...withKey,
        status: "under_review",
        flagReason: `Rule check failed: ${rule.issues.join(", ")}`,
        aiConfidenceScore: 0,
      };
    }
    return applyVerification(withKey, verificationByQuestion.get(question));
  });
}

// Single-question convenience wrapper (admin adding one question by hand).
async function runValidationPipeline(question) {
  const [result] = await runValidationPipelineBatch([question]);
  return result;
}

module.exports = {
  ruleBasedCheck,
  looksLikeRepeat,
  sameFactInPaper,
  numberSignature,
  runValidationPipeline,
  runValidationPipelineBatch,
  shuffleOptions,
  questionKey,
  hasMixedScript,
};
