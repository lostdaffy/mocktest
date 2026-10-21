// Rejecting a question, and everything that has to follow it: out of every
// test that held it, and a replacement put in (or queued) so no test is left
// short. Used by the admin's Reject button and by the answer-signal sweep.
const Question = require("../models/Question");
const Test = require("../models/Test");
const { refillTests, targetSize } = require("./testTopUp");
const GenerationJob = require("../models/GenerationJob");

async function rejectAndHeal(id, reason, { by = "admin" } = {}) {
  // Recorded in the question's history, so it can be restored.
  const q = await require("./questionHistory").change(
    id,
    { status: "rejected", flagReason: reason || "Rejected by admin" },
    { action: "retire", by, note: reason || "Rejected by admin" }
  );
  if (!q) return null;
  const affected = await Test.find({ questions: q._id }).select("title questions publishStatus type examStage").lean();
  if (affected.length) await Test.updateMany({ questions: q._id }, { $pull: { questions: q._id } });
  // A practice test is refilled here and now (one question, seconds). A mock
  // is not: refilling one means building a question for its section with the
  // whole paper and its sibling mocks to check against, which ran to minutes -
  // the admin's request waited, the browser gave up at 45 s, and four
  // rejections on 2026-10-21 never happened at all. The mock's hole goes to
  // the generation queue instead, which fills it in the background and
  // survives a restart.
  const practice = affected.filter((t) => t.type === "practice");
  const others = affected.filter((t) => t.type !== "practice");
  const refilled = practice.length ? await refillTests(practice.map((t) => t._id)) : [];
  for (const t of others) {
    const target = (await targetSize(t)) || null;
    const left = t.questions.length - 1;
    const job = { kind: "top_up", testId: t._id, label: `Top up ${t.title} (${left} → ${target ?? "?"})` };
    if (!(await GenerationJob.isAlreadyQueued(job))) await GenerationJob.create({ ...job, status: "queued" });
    refilled.push({ title: t.title, added: 0, from: left, to: left, target, filled: false, queued: true });
  }
  return { question: q, affected, refilled };
}

module.exports = { rejectAndHeal };
