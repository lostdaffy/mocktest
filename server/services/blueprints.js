// The list of question ideas a practice series is written from (models/
// Blueprint.js), so a test of twenty questions tests twenty things.
//
// The first time a series needs one, the AI drafts it - one call, cheap -
// and code keeps only ideas that really differ from each other. The admin can
// edit it afterwards; nothing else here needs a person.
//
// Generated Factors and Multiples Advanced #1 (2026-10-20) asked for even
// factors six times; the hand-written series that replaced it gave every
// question its own idea. This is that discipline, without the hand.
const Blueprint = require("../models/Blueprint");
const { samePattern } = require("./qualityRules");

const TARGET_IDEAS = 30;

const LEVEL_MEANS = {
  easy: "one or two steps, a direct use of the basic idea, small friendly numbers",
  medium: "two or three steps, the idea used backwards or combined with one other idea",
  hard: "several steps, two ideas combined, or a short case analysis, exam-hard numbers",
  advanced: "the hardest exam level: an unusual angle, three ideas together, or a neat trick that must be found",
};

function draftPrompt({ subject, chapter, topic, level, have }) {
  return `You are planning a practice series for Indian government exams (SSC, Railways, Banking, State exams).

Subject: ${subject}
Chapter: ${chapter}${topic ? `\nTopic: ${topic}` : " (the whole chapter - spread the ideas over all of its topics)"}
Level: ${level} - ${LEVEL_MEANS[level] || LEVEL_MEANS.medium}

List ${TARGET_IDEAS} DIFFERENT question ideas at this level. Each idea is one short line saying what the question asks the student to do - not a question, no numbers needed. Every idea must test something the others do not: a different concept, a different direction (forward / backward), or a different combination. Never the same idea twice with different wording.
${have.length ? `\nAlready in the list - do not repeat these:\n${have.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n` : ""}
Return ONLY a JSON array of strings.`;
}

// Keeps the ideas that differ from each other and from what is there.
function distinctIdeas(candidates, have = []) {
  const kept = [];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const text = raw.trim().replace(/^\d+[.)]\s*/, "");
    if (text.length < 12 || text.length > 300) continue;
    const all = [...have, ...kept];
    if (all.some((t) => t.toLowerCase() === text.toLowerCase() || samePattern(t, text))) continue;
    kept.push(text);
  }
  return kept;
}

async function blueprintFor({ subject, chapter, topic = "", level }, { draft } = {}) {
  let bp = await Blueprint.findOne({ subject, chapter, topic, level });
  const active = (bp?.ideas || []).filter((i) => i.active);
  if (active.length >= Math.round(TARGET_IDEAS * 0.6) || !draft) return bp;
  // Draft (or top up) with the AI; one call, two at most.
  const have = active.map((i) => i.text);
  let fresh = [];
  for (let round = 0; round < 2 && have.length + fresh.length < TARGET_IDEAS; round++) {
    let reply = [];
    try {
      reply = await draft(draftPrompt({ subject, chapter, topic, level, have: [...have, ...fresh] }));
    } catch {
      break;
    }
    fresh.push(...distinctIdeas(Array.isArray(reply) ? reply : [], [...have, ...fresh]));
  }
  if (!fresh.length) return bp;
  bp = await Blueprint.findOneAndUpdate(
    { subject, chapter, topic, level },
    { $push: { ideas: { $each: fresh.map((text) => ({ text })) } }, $setOnInsert: { source: "ai" } },
    { upsert: true, new: true }
  );
  return bp;
}

/**
 * The ideas the next questions should be written from: the least-used active
 * ones, in a stable order. Returns [] when there is no blueprint.
 */
async function nextIdeas(params, count, opts) {
  const bp = await blueprintFor(params, opts);
  if (!bp) return [];
  return bp.ideas
    .filter((i) => i.active)
    .sort((a, b) => a.used - b.used || String(a._id).localeCompare(String(b._id)))
    .slice(0, count)
    .map((i) => ({ id: String(i._id), text: i.text }));
}

async function markUsed(params, ideaIds) {
  if (!ideaIds.length) return;
  await Blueprint.updateOne(
    { subject: params.subject, chapter: params.chapter, topic: params.topic || "", level: params.level },
    { $inc: { "ideas.$[i].used": 1 } },
    { arrayFilters: [{ "i._id": { $in: ideaIds } }] }
  );
}

module.exports = { blueprintFor, nextIdeas, markUsed, distinctIdeas, draftPrompt, LEVEL_MEANS };
