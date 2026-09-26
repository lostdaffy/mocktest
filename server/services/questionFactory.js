const Question = require("../models/Question");
const RejectedQuestion = require("../models/RejectedQuestion");
const Test = require("../models/Test");
const Attempt = require("../models/Attempt");
const { generateQuestions, repairQuestion } = require("./geminiService");
const { runValidationPipelineBatch, questionKey, looksLikeRepeat } = require("./validationPipeline");

// How many extra to ask for each round. A round that asks for exactly what is
// missing comes back short the moment anything is rejected, and the test ends
// up with 10 questions instead of 12 - which is what used to happen, on 8 of
// the first 43 tests, almost all of them at the hardest levels where rejection
// is heaviest.
const SURPLUS = 4;

// Enough attempts that a hard topic still fills a test, few enough that a
// genuinely broken request gives up instead of burning the day's API quota.
const MAX_ROUNDS = 8;

/**
 * Builds a set of questions fit to put in front of a student, and returns
 * exactly as many as were asked for.
 *
 * Two promises, in this order:
 *
 *  1. Nothing doubtful reaches a student. A wrong answer key, a solution that
 *     teaches nothing, a question already asked in other words - none of it
 *     goes into a test.
 *  2. The test is still full. Whatever is rejected is replaced, not skipped.
 *
 * What is rejected is REPAIRED where repair is honest, and otherwise deleted
 * outright. A thin solution or missing Hindi is a gap to fill; a disputed
 * answer key is not something to negotiate, so that question is thrown away
 * and another generated. Nothing is parked in a review queue: a queue nobody
 * works through is worse than no queue, and questions are not scarce.
 *
 * A one-line note about each deletion is kept (see models/RejectedQuestion) so
 * that a gate which starts rejecting good work is visible instead of silent.
 */
async function createVerifiedQuestions({ needed, generateParams, tag = {}, maxRounds }) {
  if (needed <= 0) return { ids: [], verified: 0, repaired: 0, discarded: 0, duplicates: 0, short: 0 };

  const rounds = maxRounds || MAX_ROUNDS;
  const accepted = [];
  const acceptedKeys = new Set();
  let repaired = 0;
  let discarded = 0;
  let duplicates = 0;

  // Everything this topic has already been asked. Used two ways: the first
  // forty go into the prompt as "don't ask these again", and the whole lot is
  // what each new question is checked against.
  //
  // Both are needed. Told not to repeat itself the model rewords instead -
  // the same "price of sugar rises 20%" question with a householder in place
  // of the housewife - so the reminder alone does not hold.
  const topicFilter = generateParams.syllabusTopics?.length
    ? { $in: generateParams.syllabusTopics }
    : generateParams.topic;
  const bankTexts = (
    await Question.find({ subject: generateParams.subject, topic: topicFilter })
      .select("text")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
  ).map((q) => q.text);
  const alreadyAsked = bankTexts.slice(0, 40);

  const drop = async (q, reason, detail, repairAttempted = false) => {
    discarded++;
    try {
      await RejectedQuestion.create({
        text: q.text,
        subject: q.subject || generateParams.subject,
        topic: q.topic || generateParams.topic,
        chapter: tag.chapter,
        difficulty: q.difficulty || generateParams.difficulty,
        reason,
        detail: String(detail || "").slice(0, 200),
        repairAttempted,
      });
    } catch (_) {
      // Losing the note must never cost us the question run.
    }
  };

  for (let round = 0; round < rounds && accepted.length < needed; round++) {
    const remaining = needed - accepted.length;

    const raw = await generateQuestions({
      ...generateParams,
      count: remaining + SURPLUS,
      avoidTexts: [...alreadyAsked, ...accepted.map((q) => q.text)].slice(0, 60),
    });
    if (!raw.length) break;

    for (const q of raw) Object.assign(q, tag);

    let checked = await runValidationPipelineBatch(raw);

    // ---- mend what can honestly be mended
    const mendable = checked.filter(
      (q) => q.status !== "published" && /Rule check failed/.test(q.flagReason || "") && isMendable(q.flagReason)
    );
    if (mendable.length) {
      const attempts = await Promise.all(
        mendable.map((q) => repairQuestion(q, (q.flagReason || "").replace("Rule check failed: ", "").split(", ")))
      );
      const mended = attempts.filter(Boolean);
      if (mended.length) {
        const rechecked = await runValidationPipelineBatch(mended);
        const bySource = new Map(rechecked.map((q) => [q.text, q]));
        checked = checked.map((q) => {
          const better = bySource.get(q.text);
          if (better && q.status !== "published" && better.status === "published") {
            repaired++;
            return better;
          }
          return q;
        });
      }
    }

    // ---- everything still failing is gone for good
    const keep = [];
    for (const q of checked) {
      if (q.status === "published") {
        keep.push(q);
        continue;
      }
      const why = /Rule check failed/.test(q.flagReason || "")
        ? "rule"
        : /verification/.test(q.flagReason || "")
        ? "answer_disputed"
        : "other";
      await drop(q, why, q.flagReason, isMendable(q.flagReason));
    }
    if (!keep.length) continue;

    // ---- and nothing already in the bank, however it is worded
    const savedRound = [];
    for (const q of keep) {
      const key = q.textKey || questionKey(q.text);
      if (acceptedKeys.has(key)) {
        duplicates++;
        await drop(q, "duplicate", "identical to another question in this batch");
        continue;
      }

      const exactInBank = await Question.exists({ textKey: key, subject: generateParams.subject });
      if (exactInBank) {
        duplicates++;
        await drop(q, "duplicate", "already in the bank");
        continue;
      }

      const reworded = looksLikeRepeat(q.text, [...bankTexts, ...accepted.map((a) => a.text)]);
      if (reworded.repeat) {
        duplicates++;
        await drop(q, "reworded", `already asked as: ${String(reworded.of).slice(0, 120)}`);
        continue;
      }

      acceptedKeys.add(key);
      bankTexts.push(q.text);
      savedRound.push(q);
      if (accepted.length + savedRound.length === needed) break;
    }

    // Only the survivors are ever written. The bank holds questions a student
    // can be given, and nothing else.
    if (savedRound.length) accepted.push(...(await Question.insertMany(savedRound)));
  }

  return {
    ids: accepted.map((q) => q._id),
    verified: accepted.length,
    repaired,
    discarded,
    duplicates,
    short: Math.max(0, needed - accepted.length),
  };
}

/**
 * Puts questions that are stuck in the review queue back through the same gate
 * a new question goes through, and settles each one.
 *
 * The queue was the one place where the "nothing doubtful, nothing parked"
 * rule did not hold. Questions generated before the gate was strict, and
 * questions auto-flagged by student reports, piled up there - and clearing
 * them meant the admin solving each one by hand.
 *
 * A question that passes goes live. One with a fixable gap - a thin solution,
 * missing Hindi - is mended and then has to pass on its own merit. One that
 * still fails leaves circulation:
 *
 *   - never attempted by anyone: deleted outright, with a one-line note,
 *   - already attempted: kept but marked rejected, because deleting it would
 *     blank out a question in a student's own past paper.
 *
 * Either way it is pulled from every test holding it, and any test left short
 * is named so it can be topped up.
 *
 * The limit is deliberately small: each question costs an AI call, and the
 * tier allows a few hundred a day. Run it again for the next batch.
 */
async function recheckQuestions({ limit = 20, subject, topic } = {}) {
  const filter = { status: "under_review" };
  if (subject) filter.subject = subject;
  if (topic) filter.topic = topic;

  const stale = await Question.find(filter).sort({ createdAt: 1 }).limit(limit).lean();
  const out = { looked: stale.length, published: 0, repaired: 0, deleted: 0, keptForHistory: 0, testsNowShort: [] };
  if (!stale.length) return out;

  let checked = await runValidationPipelineBatch(stale, { reshuffle: false });

  // ---- mend the ones with an honest gap, then judge them again
  const mendable = checked.filter(
    (q) => q.status !== "published" && /Rule check failed/.test(q.flagReason || "") && isMendable(q.flagReason)
  );
  if (mendable.length) {
    const attempts = await Promise.all(
      mendable.map((q) => repairQuestion(q, (q.flagReason || "").replace("Rule check failed: ", "").split(", ")))
    );
    const mended = attempts.filter(Boolean);
    if (mended.length) {
      // repairQuestion returns the question without its _id, so it is matched
      // back by text - the repair never rewrites the question itself.
      const rechecked = await runValidationPipelineBatch(mended, { reshuffle: false });
      const byText = new Map(rechecked.map((q) => [q.text, q]));
      checked = checked.map((q) => {
        const better = byText.get(q.text);
        if (better && q.status !== "published" && better.status === "published") {
          out.repaired++;
          return { ...better, _id: q._id, mended: true };
        }
        return q;
      });
    }
  }

  const shortened = new Map();

  for (const q of checked) {
    if (q.status === "published") {
      const fields = { status: "published", aiConfidenceScore: q.aiConfidenceScore, flagReason: "" };
      if (q.mended) {
        fields.solution = q.solution;
        fields.solutionHi = q.solutionHi;
        fields.textHi = q.textHi;
        fields.optionsHi = q.optionsHi;
      }
      await Question.updateOne({ _id: q._id }, { $set: fields });
      out.published++;
      continue;
    }

    // Out of every test that was holding it, before anything else - a test
    // pointing at a question that is gone serves one fewer without saying so.
    const holding = await Test.find({ questions: q._id }).select("title questions publishStatus").lean();
    if (holding.length) {
      await Test.updateMany({ questions: q._id }, { $pull: { questions: q._id } });
      // Every test we pulled from is now one question light, whatever its
      // size. Counting against a practice test's twelve meant a mock left at
      // 99 of 100 was never mentioned.
      for (const t of holding) {
        shortened.set(String(t._id), {
          title: t.title,
          left: t.questions.length - 1,
          live: t.publishStatus === "published",
        });
      }
    }

    const wasAttempted = await Attempt.exists({ "answers.question": q._id });
    try {
      await RejectedQuestion.create({
        text: q.text,
        subject: q.subject,
        topic: q.topic,
        chapter: q.chapter,
        difficulty: q.difficulty,
        reason: /Rule check failed/.test(q.flagReason || "") ? "rule" : "answer_disputed",
        detail: String(q.flagReason || "").slice(0, 200),
        repairAttempted: isMendable(q.flagReason),
      });
    } catch (_) {
      // Losing the note must never cost us the clean-up.
    }

    if (wasAttempted) {
      await Question.updateOne({ _id: q._id }, { $set: { status: "rejected", flagReason: q.flagReason } });
      out.keptForHistory++;
    } else {
      await Question.deleteOne({ _id: q._id });
      out.deleted++;
    }
  }

  out.testsNowShort = [...shortened.values()];
  return out;
}

// Missing Hindi or a thin solution is a gap in an otherwise sound question.
// Anything about the answer, the options or the question itself is not.
function isMendable(flagReason = "") {
  const issues = String(flagReason).replace("Rule check failed: ", "");
  const fixable = /solution too short|hindi/i.test(issues);
  const fatal = /options|correctIndex|question text too short|solution is just the option/i.test(issues);
  return fixable && !fatal;
}

// One line for the admin: how many made it, and what happened to the rest.
function qualityNote({ verified, repaired, discarded, duplicates, short }) {
  const parts = [];
  if (repaired) parts.push(`${repaired} repaired`);
  if (duplicates) parts.push(`${duplicates} repeats discarded`);
  if (discarded - (duplicates || 0) > 0) parts.push(`${discarded - duplicates} failed the quality check and were discarded`);
  if (short) parts.push(`${short} short of the target`);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

module.exports = { createVerifiedQuestions, recheckQuestions, qualityNote };
