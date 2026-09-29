// Negative marking is not always one number for a whole paper.
//
// SSC MTS is the case that forced this: it is one exam sat in two sessions,
// and Session-I (Numerical and Reasoning, 40 questions) carries NO penalty
// at all while Session-II (General Awareness and English, 50 questions)
// deducts a full mark. Flattening that to a single rate meant our mock
// punished a wrong answer in Maths that the real paper lets you guess
// freely - the student's score came out lower than the real exam would give
// them, and worse, they learned not to attempt questions that are free.
//
// So a section may carry its own rate. Where it does not, the exam's own
// rate applies and nothing changes for the nine papers that are uniform.
const DEFAULT_RATE = 0.25;

// A section covers its own subject plus anything listed in `sources` - SSC's
// "General Awareness" is built from GK, Science and Current Affairs at once.
function sectionCovers(rule, subject) {
  if (!subject) return false;
  if (rule.subject === subject) return true;
  return (rule.sources || []).includes(subject);
}

/** The deduction for one wrong answer in `subject`, on this test. */
function rateFor(test, subject) {
  const rules = test?.sectionRules || [];
  const hit = rules.find((r) => sectionCovers(r, subject));
  if (hit && hit.negativeMarking != null) return hit.negativeMarking;
  return test?.negativeMarking ?? DEFAULT_RATE;
}

/** What one correct answer in `subject` is worth, on this test. */
function marksFor(test, subject) {
  const rules = test?.sectionRules || [];
  const hit = rules.find((r) => sectionCovers(r, subject));
  if (hit && hit.marksPerQuestion != null) return hit.marksPerQuestion;
  return test?.marksPerQuestion || 1;
}

/**
 * The single rate for the whole paper, or null when sections differ.
 *
 * The result screen needs this: "−10 for 20 wrong (0.5 each)" is only
 * honest when every wrong answer really did cost 0.5.
 */
function uniformRate(test) {
  const rules = test?.sectionRules || [];
  const rates = new Set(
    rules.filter((r) => r.negativeMarking != null).map((r) => r.negativeMarking)
  );
  if (rates.size === 0) return test?.negativeMarking ?? DEFAULT_RATE;
  // Any section left without its own rate falls back to the test's, so that
  // counts as one of the rates in play.
  if (rules.some((r) => r.negativeMarking == null)) rates.add(test?.negativeMarking ?? DEFAULT_RATE);
  return rates.size === 1 ? [...rates][0] : null;
}

/** Copies an exam pattern's per-section rules onto a test being built. */
function sectionRulesFrom(pattern) {
  return (pattern?.sections || []).map((s) => ({
    subject: s.subject,
    sources: s.sources || [],
    negativeMarking: s.negativeMarking ?? null,
    marksPerQuestion: s.marksPerQuestion ?? null,
  }));
}

module.exports = { rateFor, marksFor, uniformRate, sectionRulesFrom, sectionCovers, DEFAULT_RATE };
