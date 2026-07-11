const { verifyQuestion } = require("./geminiService");

// Layer 1: cheap, instant rule-based checks. No AI call needed.
function ruleBasedCheck(q) {
  const issues = [];

  if (!q.options || q.options.length !== 4) issues.push("must have exactly 4 options");
  if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) issues.push("duplicate options found");
  if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex > 3)
    issues.push("correctIndex out of range");
  if (!q.text || q.text.trim().length < 5) issues.push("question text too short/empty");
  if (!q.solution || q.solution.trim().length < 3) issues.push("solution missing");

  return { passed: issues.length === 0, issues };
}

/**
 * Full pipeline: AI Generate -> Rule Check -> AI Self-Verify -> decide status.
 * Returns the question object with status set to either "published" or "under_review".
 */
async function runValidationPipeline(question) {
  const ruleResult = ruleBasedCheck(question);
  if (!ruleResult.passed) {
    return {
      ...question,
      status: "under_review",
      flagReason: `Rule check failed: ${ruleResult.issues.join(", ")}`,
      aiConfidenceScore: 0,
    };
  }

  const verification = await verifyQuestion(question);

  // Low-risk (AI agrees with high confidence) -> auto-publish.
  // High-risk (AI disagrees or low confidence) -> human review queue.
  if (verification.matches && verification.confidence >= 0.75) {
    return {
      ...question,
      status: "published",
      aiConfidenceScore: verification.confidence,
    };
  }

  return {
    ...question,
    status: "under_review",
    flagReason: verification.matches
      ? `Low AI confidence (${verification.confidence})`
      : `AI verification disagreed - AI suggests option ${verification.aiCorrectIndex}`,
    aiConfidenceScore: verification.confidence,
  };
}

module.exports = { ruleBasedCheck, runValidationPipeline };
