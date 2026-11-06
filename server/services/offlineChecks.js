// Clearing the AI quality-check queue without the AI.
//
// Every spreadsheet or mock upload queues "AI check of 20 uploaded
// question(s)" jobs. When the AI allowance runs out they pile up (hundreds),
// although most of those questions were written and solved in code before
// upload. Here an admin (or Claude, working offline with the content files)
// gives the answer check instead of the AI:
//
//   1. listChecks: the waiting jobs with their questions, to check offline.
//   2. resolveChecks: the verdict for each question - "sound" (the answer was
//      worked out again offline and agrees) or "wrong" with what is wrong.
//      The parts of the AI check that need no AI run here exactly as the AI
//      job runs them: the rule gate (ruleBasedCheck) and the repeat check
//      against the chapter. A question that fails either, or is called wrong,
//      gets a "flag" on the quality desk for the admin - nothing is changed
//      by itself. The job is then done, with the note saying it was checked
//      without the AI. Questions with no verdict keep their job waiting.
const GenerationJob = require("../models/GenerationJob");
const Question = require("../models/Question");
const QualityFix = require("../models/QualityFix");
const { ruleBasedCheck } = require("./validationPipeline");
const { chapterBank, repeatOf } = require("./qualityDesk");

async function summary() {
  const rows = await GenerationJob.aggregate([
    { $match: { status: "queued" } },
    { $group: { _id: { kind: "$kind", source: "$source" }, jobs: { $sum: 1 }, questions: { $sum: { $size: { $ifNull: ["$questionIds", []] } } }, oldest: { $min: "$queuedAt" } } },
    { $sort: { jobs: -1 } },
  ]);
  return rows.map((r) => ({ kind: r._id.kind, source: r._id.source || null, jobs: r.jobs, questions: r.questions, oldest: r.oldest }));
}

async function listChecks({ limit = 50, after = null } = {}) {
  const jobs = await GenerationJob.find({ status: "queued", kind: "quality_check", ...(after ? { _id: { $gt: after } } : {}) })
    .sort({ _id: 1 }).limit(Math.min(200, Math.max(1, limit))).select("questionIds source label queuedAt").lean();
  const ids = jobs.flatMap((j) => j.questionIds || []);
  const qs = await Question.find({ _id: { $in: ids } }).select("text options correctIndex solution subject chapter topic subTopic status").lean();
  const byId = new Map(qs.map((q) => [String(q._id), q]));
  return jobs.map((j) => ({
    id: j._id, source: j.source, queuedAt: j.queuedAt,
    questions: (j.questionIds || []).map((id) => byId.get(String(id))).filter(Boolean).map((q) => ({
      id: q._id, text: q.text, options: q.options, correctIndex: q.correctIndex, solution: q.solution, subject: q.subject, chapter: q.chapter, topic: q.topic, status: q.status,
    })),
    missing: (j.questionIds || []).filter((id) => !byId.has(String(id))).length,
  }));
}

/**
 * verdicts: [{ job, answers: [{ question, verdict: "sound" | "wrong", problem? }] }]
 * Returns per-job counts.
 */
async function resolveChecks(verdicts, { by = "admin" } = {}) {
  const out = [];
  const banks = new Map();
  for (const v of verdicts || []) {
    const job = await GenerationJob.findOne({ _id: v.job, status: "queued", kind: "quality_check" });
    if (!job) { out.push({ job: v.job, skipped: "not a waiting quality check" }); continue; }
    const given = new Map((v.answers || []).map((a) => [String(a.question), a]));
    const qs = await Question.find({ _id: { $in: job.questionIds || [] } }).lean();
    let sound = 0, flagged = 0;
    const left = [];
    for (const q of qs) {
      const a = given.get(String(q._id));
      if (!a || !["sound", "wrong"].includes(a.verdict)) { left.push(q._id); continue; }
      const problems = [];
      if (a.verdict === "wrong") problems.push(`checked without the AI: ${String(a.problem || "the answer key does not hold").slice(0, 300)}`);
      const rule = ruleBasedCheck(q);
      if (!rule.passed) problems.push(...rule.issues);
      const k = `${q.chapter || ""}|${q.topic || ""}`;
      if (!banks.has(k)) banks.set(k, await chapterBank(q.chapter, q.topic));
      const twin = repeatOf(q, banks.get(k));
      if (twin) problems.push(`repeats a question already in the chapter: "${String(twin).slice(0, 120)}"`);
      if (!problems.length) { sound++; continue; }
      const busy = await QualityFix.exists({ question: q._id, status: "pending" });
      if (!busy) await QualityFix.create({ question: q._id, kind: "flag", problems, source: "csv" });
      flagged++;
    }
    // Questions the job pointed at that no longer exist count as checked.
    if (left.length) {
      job.questionIds = left;
      await job.save();
      out.push({ job: job._id, sound, flagged, waiting: left.length });
    } else {
      job.status = "done";
      job.result = `Checked without the AI (${by}): ${sound} sound, ${flagged} flagged for the admin`;
      job.finishedAt = new Date();
      await job.save();
      out.push({ job: job._id, sound, flagged, done: true });
    }
  }
  return out;
}

module.exports = { summary, listChecks, resolveChecks };
