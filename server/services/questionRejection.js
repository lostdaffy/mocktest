// Rejecting a question, and everything that has to follow it: out of every
// test that held it, and a replacement put in (or queued) so no test is left
// short. Used by the admin's Reject button and by the answer-signal sweep.
const Question = require("../models/Question");
const Test = require("../models/Test");
const { refillTests } = require("./testTopUp");

async function rejectAndHeal(id, reason, { by = "admin" } = {}) {
  // Recorded in the question's history, so it can be restored.
  const q = await require("./questionHistory").change(
    id,
    { status: "rejected", flagReason: reason || "Rejected by admin" },
    { action: "retire", by, note: reason || "Rejected by admin" }
  );
  if (!q) return null;
  const affected = await Test.find({ questions: q._id }).select("title questions publishStatus").lean();
  if (affected.length) await Test.updateMany({ questions: q._id }, { $pull: { questions: q._id } });
  const refilled = affected.length ? await refillTests(affected.map((t) => t._id)) : [];
  return { question: q, affected, refilled };
}

module.exports = { rejectAndHeal };
