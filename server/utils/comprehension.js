// A question that points at a particular passage has to bring that passage
// with it.
//
// "According to the passage, why did the protagonist leave the village?" is
// half a question. The student opens it and there is no passage, no
// protagonist and no village. Every one of the twelve questions in the first
// Unseen Passage test read like that, and nine of twelve in अपठित गद्यांश -
// four options, a correct index, a solution, and no passage anywhere.
//
// What matters is DEFINITE reference. A pedagogy paper asks perfectly good
// questions that mention passages in general:
//
//   "When A passage contains an unfamiliar idiom, what should a student
//    rely on?"                                    - answerable, no passage needed
//   "According to THE passage, why did he leave?" - unanswerable without one
//
// Judging by chapter instead of by wording threw away all of the first kind:
// CTET's "Unseen Passage" chapter is half comprehension and half teaching
// method, and 81 sound pedagogy questions were binned in one run before this
// was fixed. So the chapter decides what to ASK the generator for; only the
// wording decides what to refuse.

// Chapters whose questions should carry a passage. Used for the prompt only.
const COMPREHENSION = /unseen\s*passage|reading\s*comprehension|अपठित|गद्यांश|पद्यांश/i;

// Definite reference to a passage that should be right there.
//
// Written as "THE <anything> passage/paragraph/text" rather than a list of
// adjectives, because a list is always one word short: the first version
// named first/second/last and then met "the CONCLUDING paragraph", and knew
// "in the text" but not "BASED ON the text". Both were unanswerable and both
// went through.
const POINTS_AT_A_PASSAGE = [
  /\bthe\s+(\w+\s+){0,2}(passage|paragraph|text|extract)\b/i,
  /\b(this|that|above|following|given)\s+(passage|paragraph|text|extract)\b/i,
  /\bthe narrator\b/i,
  // "the author of 'Wings of Fire'" is a GK question about a book and must
  // not be caught; "the tone of the author" must be.
  /\bthe author\b(?!\s+of\b)/i,
  // Hindi has no articles, so the postposition carries the definiteness:
  // "गद्यांश के अनुसार", "गद्यांश में", "गद्यांश का शीर्षक" all point at one
  // particular passage, while "गद्यांश पढ़ाते समय" is about teaching them.
  // No \b on these: JavaScript word boundaries are defined on [A-Za-z0-9_],
  // so they never match beside Devanagari and quietly let every Hindi one
  // through - which is exactly what happened on the first attempt.
  /गद्यांश\s*(के|में|का|की|से)/,
  /अनुच्छेद\s*(के|में|का|की|से)/,
  /पद्यांश\s*(के|में|का|की|से)/,
];

// An indefinite passage sets the frame for the whole sentence, and anything
// definite after it refers back to that frame, not to something on the screen:
//
//   "When A PASSAGE is read to understand the gist of THE TEXT, this
//    technique is called..."
//
// is a teaching question and answerable as it stands, even though "the text"
// appears in it. Seven sound pedagogy questions were being refused over
// exactly this before the frame was taken into account.
const FRAMED_GENERICALLY =
  /\b(a|an|any|every|each)\s+(unseen\s+|comprehension\s+|narrative\s+|given\s+)?(passage|extract|text)\b/i;

// How long a question has to be before it can plausibly contain a passage.
// The ones that work run 221-286 characters; the broken ones run 37-107.
// 150 sits in the gap with room on both sides.
const CARRIES_A_PASSAGE = 150;

// For the prompt: should this chapter's questions be written self-contained?
const isComprehension = ({ chapter, topic, subject } = {}) =>
  [chapter, topic, subject].some((s) => COMPREHENSION.test(String(s || "")));

// For the gate: does this question point at a passage it should be showing?
const refersToAPassage = (text) => {
  const t = String(text || "");
  if (FRAMED_GENERICALLY.test(t)) return false;
  return POINTS_AT_A_PASSAGE.some((re) => re.test(t));
};

const carriesItsPassage = (text) => String(text || "").trim().length >= CARRIES_A_PASSAGE;

module.exports = { isComprehension, refersToAPassage, carriesItsPassage, CARRIES_A_PASSAGE };
