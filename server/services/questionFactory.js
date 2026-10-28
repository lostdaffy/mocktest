const Question = require("../models/Question");
const RejectedQuestion = require("../models/RejectedQuestion");
const Test = require("../models/Test");
const Attempt = require("../models/Attempt");
const { generateQuestions, repairQuestion } = require("./geminiService");
const { runValidationPipelineBatch, questionKey, looksLikeRepeat, sameFactInPaper } = require("./validationPipeline");
// Through the module, not destructured, so the test stub can stand in for it.
const visualGen = require("./visualGenerator");
const passageGen = require("./passageSetGenerator");
const { visualSignature, figureKey } = require("./visuals");
const { attachDrawings } = require("./figureImage");
const { patternCount, MAX_PER_PATTERN } = require("./qualityRules");
const { nextIdeas, markUsed, LEVEL_MEANS } = require("./blueprints");

// The next ideas of a series' blueprint; [] if it has none and none can be
// drafted (no AI today, say) - generation then goes on as before.
// A blueprint is a help, never a wait: drafting one gets BLUEPRINT_WAIT_MS,
// and a series whose drafting failed is not tried again for
// BLUEPRINT_RETRY_MS - otherwise every round of a top-up would sit through
// the AI's retries again (a chapter audit once took over 5 minutes this way).
const BLUEPRINT_WAIT_MS = 60 * 1000;
const BLUEPRINT_RETRY_MS = 30 * 60 * 1000;
const blueprintFailed = new Map();
async function blueprintIdeas(bp, count) {
  const key = [bp.subject, bp.chapter, bp.topic || "", bp.level].join("|");
  if (Date.now() - (blueprintFailed.get(key) || 0) < BLUEPRINT_RETRY_MS) return [];
  let timer;
  try {
    // Through the module, so a test stub that replaces callGemini is used.
    const draft = (prompt) => require("./geminiService").callGemini(prompt, { jsonMode: true });
    const late = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("blueprint took too long")), BLUEPRINT_WAIT_MS); });
    const ideas = await Promise.race([nextIdeas(bp, count, { draft }), late]);
    if (!ideas.length) blueprintFailed.set(key, Date.now());
    return ideas;
  } catch {
    blueprintFailed.set(key, Date.now());
    return [];
  } finally {
    clearTimeout(timer);
  }
}

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
async function createVerifiedQuestions({ needed, generateParams, tag = {}, maxRounds, inTest = [] }) {
  if (needed <= 0) return { ids: [], verified: 0, repaired: 0, discarded: 0, duplicates: 0, short: 0 };

  const rounds = maxRounds || MAX_ROUNDS;
  const accepted = [];
  // The paper the questions are going into, every section of it. The bank
  // check below looks only at this subject, so a mock's GK section and its
  // EVS section could both ask who chaired the Drafting Committee - Super TET
  // Mock #2 did.
  const paper = inTest.length
    ? await Question.find({ _id: { $in: inTest } }).select("text textKey visual options correctIndex").lean()
    : [];
  const paperPlain = paper.filter((q) => !q.visual?.kind);
  const paperTexts = paperPlain.map((q) => q.text);
  const copiesReference = await require("./referenceLearning")
    .referenceChecker(generateParams.examType, generateParams.subject)
    .catch(() => () => ({ copy: false }));
  const acceptedKeys = new Set(paper.map((q) => figureKey(q.visual) || q.textKey || questionKey(q.text)));
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
  // Names only: a syllabus topic may arrive as { topic, subTopics } (an exam
  // pattern's or a vacancy's syllabus), which a string field cannot match.
  const topicNames = (generateParams.syllabusTopics || [])
    .map((t) => (typeof t === "string" ? t : t?.topic))
    .filter(Boolean);
  const topicFilter = topicNames.length ? { $in: topicNames } : generateParams.topic;
  // The whole chapter, not the latest few hundred: Number System's bank holds
  // four thousand questions, and a rewording of one written months ago is as
  // much a repeat as one written yesterday - 62 such pairs were sitting in
  // its tests on 2026-10-21 because only the newest 300 were compared.
  // Texts only, and the repeat check skips any question whose numbers differ
  // before it reads a word, so four thousand is cheap.
  const scope = tag.chapter
    ? { subject: generateParams.subject, status: { $ne: "rejected" }, $or: [{ topic: topicFilter }, { chapter: tag.chapter }] }
    : { subject: generateParams.subject, status: { $ne: "rejected" }, topic: topicFilter };
  const bankTexts = (await Question.find(scope).select("text").sort({ createdAt: -1 }).limit(20000).lean()).map((q) => q.text);
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

    // A practice series writes one question per idea of its blueprint, the
    // least-used ideas first (services/blueprints.js). The blueprint is
    // drafted by the AI the first time the series needs one.
    const ideasNow = generateParams.blueprint && !generateParams.visualKind ? await blueprintIdeas(generateParams.blueprint, remaining + SURPLUS) : [];

    // A chart or figure chapter is written by the visual generator, which
    // checks every answer against its chart or figure in code before the
    // question gets this far.
    // A passage set (a pattern section with passageSets) is one passage and
    // its questions, written together by the passage generator.
    const raw = generateParams.passageSet
      ? await passageGen.generatePassageSet({
          ...generateParams,
          count: remaining,
          avoidTexts: accepted.map((q) => q.passageStem || q.text).slice(0, 10),
        })
      : generateParams.visualKind
      ? await visualGen.generateVisualQuestions({
          ...generateParams,
          kind: generateParams.visualKind,
          count: remaining,
          avoidTexts: [...alreadyAsked, ...accepted.map((q) => q.text)].slice(0, 30),
        })
      : await generateQuestions({
          ...generateParams,
          count: remaining + SURPLUS,
          avoidTexts: [...alreadyAsked, ...accepted.map((q) => q.text)].slice(0, 60),
          ideas: ideasNow.map((i) => i.text),
          levelNote: generateParams.blueprint ? LEVEL_MEANS[generateParams.blueprint.level] || "" : "",
        });
    if (!raw.length) break;

    // Question i was asked to follow idea i.
    raw.forEach((q, i) => { if (ideasNow[i]) q.blueprintIdea = ideasNow[i].id; });
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
      // A visual question's identity includes its chart or figure: the same
      // "What is the average?" about two different charts is two questions.
      // A figure is the same question whatever its wording (see figureKey).
      const key =
        figureKey(q.visual) ||
        (q.visual?.kind ? questionKey(q.text + visualSignature(q.visual)) : q.textKey || questionKey(q.text));
      q.textKey = key;
      if (acceptedKeys.has(key)) {
        duplicates++;
        await drop(q, "duplicate", "identical to another question in this batch or test");
        continue;
      }

      const exactInBank = await Question.exists({ textKey: key, subject: generateParams.subject });
      if (exactInBank) {
        duplicates++;
        await drop(q, "duplicate", "already in the bank");
        continue;
      }

      // A copy of one of the admin's reference questions, even with the
      // numbers or a word changed, is thrown out: references teach the level,
      // they are not a source of questions.
      // A passage question is judged by its own question, not the passage
      // its siblings share - otherwise the second question on a passage is
      // "a repeat" of the first.
      const own = q.passageStem || q.text;
      const copied = q.visual?.kind ? { copy: false } : copiesReference(own);
      if (copied.copy) {
        duplicates++;
        await drop(q, "reference_copy", `copies a question from the reference "${copied.title}": ${String(copied.of).slice(0, 100)}`);
        continue;
      }

      const reworded = q.visual?.kind
        ? { repeat: false }
        : looksLikeRepeat(own, [...bankTexts, ...paperTexts, ...accepted.map((a) => a.passageStem || a.text)]);
      if (reworded.repeat) {
        duplicates++;
        await drop(q, "reworded", `already asked as: ${String(reworded.of).slice(0, 120)}`);
        continue;
      }

      // One idea drilled over and over with new numbers: at most a few
      // questions of one pattern in a paper (services/qualityRules.js).
      if (!q.visual?.kind && !q.passageSetId) {
        const paperSoFar = [...paperTexts, ...accepted.map((a) => a.text), ...savedRound.map((s) => s.text)];
        if (patternCount(q.text, paperSoFar) >= MAX_PER_PATTERN) {
          duplicates++;
          await drop(q, "same_pattern", `the paper already has ${MAX_PER_PATTERN} questions of this pattern`);
          continue;
        }
      }

      // The same fact asked again elsewhere in the paper, with the same answer.
      const twin = inTest.length && !q.visual?.kind && !q.passageSetId
        ? [...paperPlain, ...accepted, ...savedRound].find((p) => sameFactInPaper(q, p))
        : null;
      if (twin) {
        duplicates++;
        await drop(q, "reworded", `the paper already asks: ${String(twin.text).slice(0, 120)}`);
        continue;
      }

      acceptedKeys.add(key);
      bankTexts.push(own);
      savedRound.push(q);
      if (accepted.length + savedRound.length === needed) break;
    }

    // Only the survivors are ever written. The bank holds questions a student
    // can be given, and nothing else.
    if (savedRound.length) {
      const saved = await Question.insertMany(savedRound);
      accepted.push(...saved);
      // A figure whose answer the code has proved gets its picture now.
      if (generateParams.visualKind === "figure") await attachDrawings(saved.map((q) => q._id));
      // The ideas that became questions move to the back of the queue.
      const used = savedRound.map((q) => q.blueprintIdea).filter(Boolean);
      if (used.length) await markUsed(generateParams.blueprint, used).catch(() => {});
    }
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
      await keepQuestion(q);
      out.published++;
      continue;
    }
    out[await retireQuestion(q, shortened)]++;
  }

  out.testsNowShort = [...shortened.values()];
  return out;
}

// Save what the check learnt about a question that stays (and any mending).
async function keepQuestion(q) {
  const fields = { status: "published", aiConfidenceScore: q.aiConfidenceScore, flagReason: "" };
  if (q.mended) {
    fields.solution = q.solution;
    fields.solutionHi = q.solutionHi;
    fields.textHi = q.textHi;
    fields.optionsHi = q.optionsHi;
  }
  await Question.updateOne({ _id: q._id }, { $set: fields });
}

// Take a failed question out of circulation. Returns "deleted" or
// "keptForHistory"; every test it leaves is noted in `shortened`.
async function retireQuestion(q, shortened) {
  // Out of every test that was holding it, before anything else - a test
  // pointing at a question that is gone serves one fewer without saying so.
  const holding = await Test.find({ questions: q._id }).select("title questions publishStatus").lean();
  if (holding.length) {
    await Test.updateMany({ questions: q._id }, { $pull: { questions: q._id } });
    // Every test we pulled from is now one question light, whatever its
    // size. Counting against a practice test's twelve meant a mock left at
    // 99 of 100 was never mentioned.
    for (const t of holding) {
      const seen = shortened.get(String(t._id));
      shortened.set(String(t._id), {
        // The id, so the caller can put a replacement in rather than only
        // telling somebody the test is short.
        _id: t._id,
        title: t.title,
        left: (seen ? seen.left : t.questions.length) - 1,
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
    return "keptForHistory";
  }
  await require("./questionHistory").deleteForGood(q._id, { by: "ai", note: q.flagReason });
  return "deleted";
}

const COULD_NOT_CHECK = /could not be completed/;

/**
 * AI audit of questions that are already live, one chapter at a time.
 *
 * Each question is solved again by the checker. A rule failure that is only
 * a gap (thin solution, missing Hindi) is mended; any other failure has to
 * be confirmed by a second, separate check before the question is retired -
 * a single slip by the checker must not throw out a sound question. Retired
 * questions leave their tests, and the caller refills those tests.
 *
 * Works through the chapter in _id order. `next` is where the following call
 * starts. When the checker cannot answer (the day's allowance, usually) it
 * stops before that question, so nothing is skipped and nothing is retired
 * for want of a check.
 */
async function auditPublished({ chapter, after, limit = 12 } = {}) {
  if (!chapter) throw new Error("chapter is required");
  const filter = {
    status: "published",
    $or: [{ chapter }, { chapter: { $in: [null, ""] }, topic: chapter }],
  };
  if (after) filter._id = { $gt: after };

  const out = {
    looked: 0, kept: 0, repaired: 0, secondOpinionKept: 0, deleted: 0, keptForHistory: 0,
    retired: [], testsNowShort: [], next: after || null, done: false, stopped: "",
  };
  const batch = await Question.find(filter).sort({ _id: 1 }).limit(limit).lean();
  if (!batch.length) {
    out.done = true;
    return out;
  }

  let checked = await runValidationPipelineBatch(batch, { reshuffle: false });

  // Stop at the first question the checker could not judge.
  const stuckAt = checked.findIndex((q) => q.status !== "published" && COULD_NOT_CHECK.test(q.flagReason || ""));
  if (stuckAt !== -1) {
    out.stopped = checked[stuckAt].flagReason;
    checked = checked.slice(0, stuckAt);
  }

  // ---- mend the honest gaps
  const mendable = checked.filter(
    (q) => q.status !== "published" && /Rule check failed/.test(q.flagReason || "") && isMendable(q.flagReason)
  );
  if (mendable.length) {
    const attempts = await Promise.all(
      mendable.map((q) => repairQuestion(q, (q.flagReason || "").replace("Rule check failed: ", "").split(", ")))
    );
    const mended = attempts.filter(Boolean);
    if (mended.length) {
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

  // ---- a disputed answer gets a second, separate check
  const disputed = checked.filter((q) => q.status !== "published" && !/Rule check failed/.test(q.flagReason || ""));
  const secondById = new Map();
  if (disputed.length) {
    const original = new Map(batch.map((q) => [String(q._id), q]));
    const again = await runValidationPipelineBatch(disputed.map((q) => original.get(String(q._id))), { reshuffle: false });
    again.forEach((q, i) => secondById.set(String(disputed[i]._id), q));
  }

  const shortened = new Map();
  let lastDone = after || null;
  for (const q of checked) {
    const second = secondById.get(String(q._id));
    if (second && COULD_NOT_CHECK.test(second.flagReason || "")) {
      // No second opinion to be had: leave it, and start here next time.
      out.stopped = out.stopped || second.flagReason;
      break;
    }
    if (q.status === "published" || second?.status === "published") {
      if (q.status !== "published") out.secondOpinionKept++;
      await keepQuestion(q.status === "published" ? q : { ...second, _id: q._id });
      out.kept++;
    } else {
      const reason = second ? `${q.flagReason}; second check: ${second.flagReason}` : q.flagReason;
      const how = await retireQuestion({ ...q, flagReason: reason }, shortened);
      out[how]++;
      out.retired.push({ _id: q._id, text: String(q.text).slice(0, 140), reason: String(reason).slice(0, 240) });
    }
    out.looked++;
    lastDone = q._id;
  }

  out.next = lastDone;
  out.done = !out.stopped && batch.length < limit && out.looked === batch.length;
  out.testsNowShort = [...shortened.values()];
  return out;
}

// Missing Hindi or a thin solution is a gap in an otherwise sound question.
// Anything about the answer, the options or the question itself is not.
function isMendable(flagReason = "") {
  const issues = String(flagReason).replace("Rule check failed: ", "");
  // "must be written in Hindi" is a translation job, not a rethink: the
  // question, its options and its answer all stay exactly as they are.
  const fixable = /solution too short|hindi|romanised/i.test(issues);
  const fatal = /options|correctIndex|question text too short|solution is just the option|does not contain|argues with itself|never arrives|chart|figure/i.test(issues);
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

module.exports = { createVerifiedQuestions, recheckQuestions, auditPublished, qualityNote };
