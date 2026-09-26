// A comprehension question has to bring its passage with it.
//
// "According to the passage, why did the protagonist leave the village?" is
// not a question - it is half of one. The student opens it and there is no
// passage, no protagonist and no village. Every one of the twelve questions
// in the first Unseen Passage test was like this, and nine of the twelve in
// अपठित गद्यांश. They passed every check: four options, a correct index, a
// solution, Hindi throughout. Nothing asked whether the question could
// actually be answered.
//
// Reading Comprehension got it right on its own - each of its twelve carries
// its passage inside the question text - which is the shape the other two
// have to match.

// Chapters whose whole point is reading something and answering about it.
const COMPREHENSION = /unseen\s*passage|reading\s*comprehension|अपठित|गद्यांश|पद्यांश/i;

// A question anywhere that leans on a passage it does not show. "the author
// of 'Wings of Fire'" is a GK question and must not be caught, so "the
// author" only counts when it is not followed by "of".
const LEANS_ON_A_PASSAGE = [
  /\bthe passage\b/i,
  /\bthis passage\b/i,
  /\bin the text\b/i,
  /\bparagraph\b/i,
  /\bthe narrator\b/i,
  /\bthe author\b(?!\s+of\b)/i,
  /गद्यांश/,
  /अनुच्छेद/,
  /पद्यांश/,
];

// How long a question has to be before it can plausibly contain a passage.
// The ones that work run 221-286 characters; the broken ones run 37-107.
// 150 sits in the gap with room on both sides.
const CARRIES_A_PASSAGE = 150;

const isComprehension = ({ chapter, topic, subject } = {}) =>
  [chapter, topic, subject].some((s) => COMPREHENSION.test(String(s || "")));

const refersToAPassage = (text) => LEANS_ON_A_PASSAGE.some((re) => re.test(String(text || "")));

const carriesItsPassage = (text) => String(text || "").trim().length >= CARRIES_A_PASSAGE;

module.exports = { isComprehension, refersToAPassage, carriesItsPassage, CARRIES_A_PASSAGE };
