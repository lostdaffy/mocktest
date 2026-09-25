const Question = require("../models/Question");
const { generateQuestions } = require("./geminiService");
const { runValidationPipelineBatch, questionKey, looksLikeRepeat } = require("./validationPipeline");

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

  // What this topic has already been asked, so the model can be told not to
  // ask it again.
  //
  // Every call used to start blind. Generating Percentage at medium and
  // then at hard produced the same "price of sugar rises 20%" and "spends
  // 75% of his income" questions in both - same numbers, same answer,
  // reworded just enough that the exact-text duplicate check waved them
  // through. A student doing both tests meets the same question twice,
  // which is repetition, not practice.
  //
  // Capped: the model needs to know what to avoid, not read the whole bank.
  const topicFilter = generateParams.syllabusTopics?.length
    ? { $in: generateParams.syllabusTopics }
    : generateParams.topic;
  // The whole pool is loaded, because telling the model what to avoid and
  // checking what it sent back are two different jobs: the prompt only needs
  // a reminder, the repeat check needs everything.
  const bankTexts = (
    await Question.find({ subject: generateParams.subject, topic: topicFilter })
      .select("text")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
  ).map((q) => q.text);
  const alreadyAsked = bankTexts.slice(0, 40);

  for (let round = 0; round < rounds && accepted.length < needed; round++) {
    const remaining = needed - accepted.length;

    const raw = await generateQuestions({
      ...generateParams,
      count: remaining,
      // Plus anything accepted earlier in this run, so later rounds do not
      // repeat the rounds before them either.
      avoidTexts: [...alreadyAsked, ...accepted.map((q) => q.text)].slice(0, 60),
    });
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
      const exactRepeat = acceptedKeys.has(key) || seenBefore.has(key);

      // Told not to repeat itself, the model rewords instead: the same 20%
      // sugar question with a "householder" in place of the "housewife".
      // Exact text never catches those.
      const reworded = exactRepeat
        ? { repeat: false }
        : looksLikeRepeat(q.text, [...bankTexts, ...accepted.map((a) => a.text)]);

      if (exactRepeat || reworded.repeat) {
        duplicates++;
        // Out of circulation, not deleted. Left published it would still be
        // handed to a student by chapter practice, which samples the whole
        // bank - the test it was rejected from is not the only way out.
        await Question.updateOne(
          { _id: q._id },
          {
            $set: {
              status: "under_review",
              flagReason: reworded.repeat
                ? `Already asked in different words: "${String(reworded.of).slice(0, 80)}"`
                : "Duplicate of a question already in the bank",
            },
          }
        );
        continue;
      }

      acceptedKeys.add(key);
      bankTexts.push(q.text);
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
