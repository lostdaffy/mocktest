// The admin's side of the AI quality desk (services/qualityDesk.js): the mode,
// the proposals waiting for a decision, checking / improving / regenerating
// one question, its history, the whole-bank audit and the export.
//
// Every route here is admin-only (see routes/qualityRoutes.js). Inputs are
// checked before they reach the database: ids must be ObjectIds, enums must
// be one of their values, and nothing from the request is passed to a query
// as an object, so a "$ne"-style operator cannot be smuggled in.
const mongoose = require("mongoose");
const Question = require("../models/Question");
const QualityFix = require("../models/QualityFix");
const QualitySettings = require("../models/QualitySettings");
const GenerationJob = require("../models/GenerationJob");
const desk = require("../services/qualityDesk");
const history = require("../services/questionHistory");

const isId = (v) => typeof v === "string" && mongoose.Types.ObjectId.isValid(v) && /^[a-f0-9]{24}$/i.test(v);
const bad = (res, message) => res.status(400).json({ message });

// GET /api/quality/settings
async function getSettings(req, res) {
  const s = await QualitySettings.get();
  const [pending, auditQueued] = await Promise.all([
    QualityFix.countDocuments({ status: "pending" }),
    GenerationJob.exists({ kind: "quality_audit", status: { $in: ["queued", "running"] } }),
  ]);
  res.json({
    mode: s.mode,
    checkCsvUploads: s.checkCsvUploads,
    pending,
    audit: { running: !!auditQueued, checked: s.auditChecked, startedAt: s.auditStartedAt, finishedAt: s.auditFinishedAt },
  });
}

// PUT /api/quality/settings { mode?, checkCsvUploads? }
async function putSettings(req, res) {
  const set = {};
  if (req.body?.mode !== undefined) {
    if (!["approval", "auto"].includes(req.body.mode)) return bad(res, "mode must be approval or auto");
    set.mode = req.body.mode;
  }
  if (req.body?.checkCsvUploads !== undefined) set.checkCsvUploads = req.body.checkCsvUploads === true;
  await QualitySettings.get();
  await QualitySettings.updateOne({ key: "quality" }, { $set: set });
  res.json({ message: set.mode === "auto" ? "The AI now corrects questions on its own (every change is kept in the history)" : "Saved", ...set });
}

// GET /api/quality/fixes?status=pending&limit=50
async function listFixes(req, res) {
  const status = ["pending", "applied", "dismissed", "failed", "undone"].includes(req.query.status) ? req.query.status : "pending";
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const fields = "text textHi options optionsHi correctIndex solution solutionHi subject topic chapter difficulty status";
  const fixes = await QualityFix.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("question", fields)
    .populate("replacement", fields)
    .lean();
  res.json({ fixes, total: await QualityFix.countDocuments({ status }) });
}

// POST /api/quality/fixes/:id/apply  and  /dismiss
async function applyFix(req, res) {
  if (!isId(req.params.id)) return bad(res, "Not a valid id");
  const r = await desk.applyFix(req.params.id, { by: "admin" });
  res.status(r.ok ? 200 : 409).json(r);
}
async function undoFix(req, res) {
  if (!isId(req.params.id)) return bad(res, "Not a valid id");
  const r = await desk.undoFix(req.params.id, { by: "admin" });
  res.status(r.ok ? 200 : 409).json(r);
}
async function dismissFix(req, res) {
  if (!isId(req.params.id)) return bad(res, "Not a valid id");
  const r = await desk.dismissFix(req.params.id);
  res.status(r.ok ? 200 : 409).json(r);
}

// POST /api/quality/check { ids: [...] } - up to 20 questions, now.
async function checkNow(req, res) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(isId) : [];
  if (!ids.length) return bad(res, "Choose the questions to check");
  if (ids.length > 20) return bad(res, "At most 20 questions at a time");
  const r = await desk.checkQuestions(ids, { source: "admin" });
  const parts = [`Checked ${r.checked}`, `${r.sound} sound`];
  if (r.proposed) parts.push(`${r.proposed} with a fix ${r.applied ? "applied" : "waiting for you"}`);
  if (r.flagged) parts.push(`${r.flagged} flagged for you`);
  if (r.unjudged.length) parts.push(`${r.unjudged.length} not checked - the AI is not available right now`);
  res.json({ message: parts.join(", "), ...r });
}

// POST /api/quality/questions/:id/improve - mend the solution / Hindi.
async function improve(req, res) {
  if (!isId(req.params.id)) return bad(res, "Not a valid id");
  const q = await Question.findById(req.params.id).lean();
  if (!q) return res.status(404).json({ message: "Question not found" });
  const asked = ["solution too short to explain anything", "Hindi question missing", "Hindi options missing", "Hindi solution missing"];
  let proposed;
  try {
    proposed = await desk.buildMend(q, asked);
  } catch (err) {
    return res.status(503).json({ message: "The AI is not available right now - edit the question by hand, or try later" });
  }
  if (!proposed) return res.json({ message: "The AI had nothing better that passes every check - the question stays as it is" });
  const fix = await QualityFix.create({ question: q._id, kind: "fix", problems: ["Improve requested by the admin"], proposed, source: "admin" });
  const s = await QualitySettings.get();
  if (s.mode === "auto") return res.json({ ...(await desk.applyFix(fix._id, { by: "ai" })), fixId: fix._id });
  res.json({ message: "An improved version is waiting for your approval", fixId: fix._id, proposed });
}

// POST /api/quality/questions/:id/regenerate - a new question for its place.
async function regenerate(req, res) {
  if (!isId(req.params.id)) return bad(res, "Not a valid id");
  const q = await Question.findById(req.params.id).lean();
  if (!q) return res.status(404).json({ message: "Question not found" });
  let replacement;
  try {
    replacement = await desk.buildReplacement(q);
  } catch (err) {
    return res.status(503).json({ message: "The AI is not available right now - try later" });
  }
  if (!replacement) return res.json({ message: "The AI could not build a replacement that passes every check" });
  const fix = await QualityFix.create({ question: q._id, kind: "replace", problems: ["Regenerate requested by the admin"], replacement, source: "admin" });
  const s = await QualitySettings.get();
  if (s.mode === "auto") return res.json({ ...(await desk.applyFix(fix._id, { by: "ai" })), fixId: fix._id });
  res.json({ message: "A new question is ready and waiting for your approval", fixId: fix._id, replacement });
}

// GET /api/quality/questions/:id/history
async function getHistory(req, res) {
  if (!isId(req.params.id)) return bad(res, "Not a valid id");
  res.json({ history: await history.historyOf(req.params.id) });
}

// POST /api/quality/questions/:id/restore { revisionId }
async function restore(req, res) {
  if (!isId(req.params.id) || !isId(req.body?.revisionId)) return bad(res, "Not a valid id");
  const q = await history.restore(req.params.id, req.body.revisionId, { by: "admin" });
  if (!q) return res.status(404).json({ message: "That version was not found" });
  // A restored question goes through the rule gate like any edit.
  const { ruleBasedCheck } = require("../services/validationPipeline");
  const { passed, issues } = ruleBasedCheck(q);
  if (!passed && q.status === "published") {
    await history.change(q._id, { status: "under_review", flagReason: `Rule check failed: ${issues.join(", ")}` }, { action: "status", by: "system", note: "Restored version fails the gate" });
    return res.json({ message: "Restored, but it fails the quality check, so it is held for review", issues });
  }
  res.json({ message: "Restored", question: q });
}

// GET /api/quality/deleted - questions deleted for good, newest first, each
// restorable from the copy kept (POST /questions/:id/restore with the
// revision id).
async function listDeleted(req, res) {
  const QuestionRevision = require("../models/QuestionRevision");
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const rows = await QuestionRevision.find({ action: "delete" }).sort({ createdAt: -1 }).limit(limit).select("question note by before createdAt").lean();
  const stillGone = new Set((await Question.find({ _id: { $in: rows.map((r) => r.question) } }).select("_id").lean()).map((q) => String(q._id)));
  res.json({
    deleted: rows
      .filter((r) => !stillGone.has(String(r.question)))
      .map((r) => ({ revisionId: r._id, question: r.question, text: r.before?.text, topic: r.before?.topic, chapter: r.before?.chapter, note: r.note, by: r.by, at: r.createdAt })),
  });
}

// POST /api/quality/audit-bank - the whole bank, in the background.
async function auditBank(req, res) {
  if (await GenerationJob.exists({ kind: "quality_audit", status: { $in: ["queued", "running"] } })) {
    return res.json({ message: "The bank audit is already running" });
  }
  const restart = req.body?.restart === true;
  await QualitySettings.get();
  await QualitySettings.updateOne(
    { key: "quality" },
    restart ? { $set: { auditStartedAt: new Date(), auditChecked: 0 }, $unset: { auditCursor: "", auditFinishedAt: "" } } : { $set: { auditStartedAt: new Date() } }
  );
  await GenerationJob.create({ kind: "quality_audit", label: "AI audit of the question bank", status: "queued", batch: new Date().toISOString() });
  res.status(201).json({ message: "The bank audit is queued - it runs with the generation queue and carries on after a pause" });
}

// GET /api/quality/export?chapter=&topic=&status= - rows for a spreadsheet.
async function exportQuestions(req, res) {
  const filter = {};
  for (const k of ["chapter", "topic", "subject"]) if (typeof req.query[k] === "string" && req.query[k]) filter[k] = String(req.query[k]).slice(0, 100);
  if (["published", "under_review", "rejected", "draft", "hidden"].includes(req.query.status)) filter.status = req.query.status;
  const qs = await Question.find(filter).limit(5000).lean();
  const L = "ABCD";
  res.json({
    rows: qs.map((q) => ({
      id: String(q._id),
      subject: q.subject, topic: q.topic, chapter: q.chapter || "", difficulty: q.difficulty, status: q.status,
      question: q.text, optionA: q.options[0], optionB: q.options[1], optionC: q.options[2], optionD: q.options[3],
      correct: L[q.correctIndex], formula: q.formula || "", solution: q.solution,
      questionHi: q.textHi || "", optionAHi: q.optionsHi?.[0] || "", optionBHi: q.optionsHi?.[1] || "", optionCHi: q.optionsHi?.[2] || "", optionDHi: q.optionsHi?.[3] || "",
      solutionHi: q.solutionHi || "",
    })),
  });
}

module.exports = { getSettings, putSettings, listFixes, applyFix, dismissFix, undoFix, checkNow, improve, regenerate, getHistory, restore, listDeleted, auditBank, exportQuestions };
