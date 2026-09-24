const Question = require("../models/Question");
const { generateQuestions } = require("./geminiService");
const { runValidationPipelineBatch, questionKey } = require("./validationPipeline");

/**
 * Builds a set of questions that are actually fit to put in front of a
 * student, and returns only those.
 *
 * The rule this enforces: a question the AI itself couldn't confirm - wrong
 * answer key, low confidence, missing Hindi, a one-line "solution" - never
 * goes into a test. It is still SAVED, as "under_review", so the admin can
 * fix or reject it in the review queue; it just doesn't reach a student on
 * the way there. Before this, every generated question went straight into
 * the test and the verification result was effectively decorative.
 *
 * Whatever gets held back is replaced by generating more, so a 100-question
 * mock is still 100 questions - the count is kept, the quality bar isn't
 * lowered to reach it.
 */
async function createVerifiedQuestions({ needed, generateParams, tag = {}, maxRounds }) {
  if (needed <= 0) return { ids: [], verified: 0, flagged: 0, duplicates: 0 };

  const rounds = maxRounds || Math.ceil(needed / 6) + 2;
  const accepted = [];
  const acceptedKeys = new Set();
  let flagged = 0;
  let duplicates = 0;

  for (let round = 0; round < rounds && accepted.length < needed; round++) {
    const remaining = needed - accepted.length;

    const raw = await generateQuestions({ ...generateParams, count: remaining });
    if (!raw.length) break;

    for (const q of raw) Object.assign(q, tag);

    const validated = await runValidationPipelineBatch(raw);

    // Everything is saved - the flagged ones are exactly what the admin's
    // review queue is for. Only the verified ones are handed back.
    const saved = await Question.insertMany(validated);

    const candidates = saved.filter((q) => q.status === "published");
    flagged += saved.length - candidates.length;

    // Has the bank seen this question before? A student meeting the same
    // question in test #1 and test #3 is not practising, just repeating.
    const keys = candidates.map((q) => q.textKey).filter(Boolean);
    const seenBefore = keys.length
      ? new Set(
          (
            await Question.find({
              textKey: { $in: keys },
              subject: generateParams.subject,
              _id: { $nin: candidates.map((q) => q._id) },
            }).select("textKey")
          ).map((q) => q.textKey)
        )
      : new Set();

    for (const q of candidates) {
      const key = q.textKey || questionKey(q.text);
      if (acceptedKeys.has(key) || seenBefore.has(key)) {
        duplicates++;
        continue;
      }
      acceptedKeys.add(key);
      accepted.push(q);
      if (accepted.length === needed) break;
    }
  }

  return {
    ids: accepted.map((q) => q._id),
    verified: accepted.length,
    flagged,
    duplicates,
  };
}

// One line for the admin: how many made it, and what was held back and why.
function qualityNote({ verified, flagged, duplicates }) {
  const parts = [];
  if (flagged) parts.push(`${flagged} question AI ki jaanch mein fail hue - review queue mein hain, test mein nahi gaye`);
  if (duplicates) parts.push(`${duplicates} repeat nikle, hata diye`);
  return parts.length ? ` (${parts.join("; ")})` : "";
}

module.exports = { createVerifiedQuestions, qualityNote };
