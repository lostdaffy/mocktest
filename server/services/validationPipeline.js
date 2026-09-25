const { verifyQuestions } = require("./geminiService");

// "What is 15% of 240?" and "what is 15 % of 240" are the same question.
// Used both to spot repeats inside a batch and to catch a question the bank
// already has (Question.textKey).
function questionKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .trim();
}

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

  // The app is bilingual and most of these students read Hindi first. A
  // question without Hindi is half a question for them.
  const optionsHi = (q.optionsHi || []).map((o) => String(o ?? "").trim());
  if (!(q.textHi || "").trim()) issues.push("Hindi question missing");
  if (optionsHi.length !== 4 || optionsHi.some((o) => !o)) issues.push("Hindi options missing");
  if (!(q.solutionHi || "").trim()) issues.push("Hindi solution missing");

  return { passed: issues.length === 0, issues };
}

// Moves the correct answer to a random position (keeping the Hindi options
// aligned with the English ones). Models love putting the answer first; a
// student who notices that stops reading the options and starts guessing.
function shuffleOptions(q) {
  if (!q.options || q.options.length !== 4) return q;
  if (q.correctIndex === undefined || q.correctIndex === null) return q;

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
      : `AI verification could not be completed${verification.error ? ": " + verification.error : ""}`,
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
async function runValidationPipelineBatch(questions) {
  const prepared = questions.map(shuffleOptions);
  const ruleResults = prepared.map((q) => ({ question: q, rule: ruleBasedCheck(q) }));
  const needVerification = ruleResults.filter((r) => r.rule.passed).map((r) => r.question);

  const verifications = await verifyQuestions(needVerification);
  const verificationByQuestion = new Map(needVerification.map((q, i) => [q, verifications[i]]));

  return ruleResults.map(({ question, rule }) => {
    const withKey = { ...question, textKey: questionKey(question.text) };
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
  runValidationPipeline,
  runValidationPipelineBatch,
  shuffleOptions,
  questionKey,
};
