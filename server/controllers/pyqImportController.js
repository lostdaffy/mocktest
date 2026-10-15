const PyqImport = require("../models/PyqImport");
const QuestionImage = require("../models/QuestionImage");
const GenerationJob = require("../models/GenerationJob");
const svc = require("../services/pyqImport");
const { decodeImage } = require("./questionImageController");

// The PYQ page: upload a past paper's PDF, follow it being read, review what
// came out (in the panel or as a CSV), publish. See services/pyqImport.js.

const send = (res, err) => res.status(err.status || 500).json({ message: err.message, ...(err.existing ? { existing: err.existing } : {}), ...(err.open ? { open: err.open } : {}), ...(err.rowErrors ? { rowErrors: err.rowErrors } : {}) });

// One line per paper for the list, without its rows.
function summary(imp) {
  const live = imp.rows.filter((r) => !r.removed);
  const byFlag = {};
  for (const r of live) for (const f of r.flags || []) byFlag[f] = (byFlag[f] || 0) + 1;
  return {
    _id: imp._id,
    examStage: imp.examStage,
    title: imp.title,
    examDate: imp.examDate,
    shift: imp.shift,
    year: imp.year,
    language: imp.language,
    fileName: imp.fileName,
    pages: imp.pages,
    pagesDone: imp.pagesDone,
    step: imp.step,
    status: imp.status,
    error: imp.error,
    questions: live.length,
    removed: imp.rows.length - live.length,
    needLook: live.filter((r) => (r.flags || []).length).length,
    byFlag,
    expectedCount: imp.expectedCount,
    missingNumbers: imp.missingNumbers,
    testId: imp.testId,
    createdAt: imp.createdAt,
  };
}

const load = async (req, res) => {
  const imp = await PyqImport.findById(req.params.id);
  if (!imp) res.status(404).json({ message: "Upload not found" });
  return imp;
};

// POST /api/pyq/import { examStage, pdfBase64, fileName, title?, examDate?, shift?, year?, language? }
async function createImport(req, res) {
  try {
    const { import: imp, waitingForAllowance } = await svc.createImport({ ...req.body, createdBy: req.user?.name || "admin" });
    res.status(201).json({
      message: waitingForAllowance
        ? "Uploaded. It will be read when the queue is resumed after the AI allowance resets."
        : `Uploaded - ${imp.pages} pages. Reading has started; this page updates as it goes.`,
      import: summary(imp),
    });
  } catch (err) {
    send(res, err);
  }
}

// GET /api/pyq/imports?examStage=
async function listImports(req, res) {
  const filter = req.query.examStage ? { examStage: req.query.examStage } : {};
  const list = await PyqImport.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ imports: list.map(summary) });
}

// GET /api/pyq/import/:id -> the paper with every row
async function getImport(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  res.json({ import: { ...summary(imp), detected: imp.detected, rows: imp.rows } });
}

// PATCH /api/pyq/import/:id { title, examDate, shift, year, language }
async function updateImport(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  if (imp.status === "published") return res.status(400).json({ message: "Already published" });
  const { title, examDate, shift, year, language } = req.body || {};
  if (title !== undefined) imp.title = String(title).trim() || undefined;
  if (shift !== undefined) imp.shift = String(shift).trim() || undefined;
  if (examDate !== undefined) imp.examDate = examDate ? new Date(examDate) : undefined;
  if (year !== undefined) {
    const y = Number(year);
    if (year && !(Number.isInteger(y) && y >= 1990 && y <= new Date().getFullYear())) return res.status(400).json({ message: "That year does not look right" });
    imp.year = year ? y : undefined;
  }
  if (language !== undefined && ["english", "hindi", "bilingual"].includes(language)) imp.language = language;
  await imp.save();
  res.json({ message: "Saved", import: summary(imp) });
}

// PATCH /api/pyq/import/:id/row/:rowId { text, options, correctIndex, removed, ... }
async function updateRow(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  if (imp.status !== "review") return res.status(400).json({ message: imp.status === "published" ? "Already published" : "Still being read" });
  const row = imp.rows.id(req.params.rowId);
  if (!row) return res.status(404).json({ message: "Question not found in this paper" });
  try {
    svc.editRow(row, req.body || {});
  } catch (err) {
    return send(res, err);
  }
  await imp.save();
  res.json({ row, import: summary(imp) });
}

// POST /api/pyq/import/:id/confirm { use: "paper" | "ai", rowIds?, flag? }
async function confirm(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  if (imp.status !== "review") return res.status(400).json({ message: "Not in review" });
  const { use, rowIds, flag } = req.body || {};
  if (!["paper", "ai"].includes(use)) return res.status(400).json({ message: "Say whose answer to take: the paper's or the AI's" });
  const done = svc.confirmAnswers(imp, { use, rowIds, flag });
  await imp.save();
  res.json({ message: `${done} answer(s) confirmed`, done, import: summary(imp) });
}

// POST /api/pyq/import/:id/row/:rowId/image { dataUrl } -> the figure for a question that needs one
async function uploadRowImage(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  if (imp.status !== "review") return res.status(400).json({ message: "Not in review" });
  const row = imp.rows.id(req.params.rowId);
  if (!row) return res.status(404).json({ message: "Question not found in this paper" });
  const img = decodeImage(req.body?.dataUrl);
  if (img.error) return res.status(400).json({ message: img.error });
  const saved = await QuestionImage.create({
    mime: img.mime,
    data: img.data,
    bytes: img.data.length,
    width: Number(req.body?.width) || undefined,
    height: Number(req.body?.height) || undefined,
    uploadedBy: req.user?.name || "admin",
  });
  const previous = row.imageId;
  row.imageId = saved._id;
  row.needsFigure = true;
  row.flags = svc.flagsFor(row);
  await imp.save();
  if (previous) await QuestionImage.deleteOne({ _id: previous, question: null });
  res.status(201).json({ message: "Picture added", row, import: summary(imp) });
}

// GET /api/pyq/import/:id/csv
async function downloadCsv(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  const name = `${(imp.title || imp.examStage).replace(/[^\w\- ]+/g, "").trim() || "paper"}.csv`;
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${name}"`);
  res.send(svc.exportCsv(imp));
}

// POST /api/pyq/import/:id/csv { csv, dryRun }
async function uploadCsv(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  if (imp.status !== "review") return res.status(400).json({ message: imp.status === "published" ? "Already published" : "Still being read" });
  let parsed;
  try {
    parsed = svc.applyCsv(imp, req.body?.csv);
  } catch (err) {
    return send(res, err);
  }
  if (parsed.errors.length) {
    return res.status(400).json({ message: `${parsed.errors.length} line(s) need fixing in the file - nothing was changed`, errors: parsed.errors });
  }
  if (req.body?.dryRun) {
    return res.json({ message: `${parsed.changes.length} row(s) read cleanly - nothing saved yet`, dryRun: true, rows: parsed.changes.length });
  }
  try {
    const { updated, added } = svc.commitCsv(imp, parsed.changes);
    await imp.save();
    res.json({ message: `${updated} updated, ${added} added`, updated, added, import: summary(imp) });
  } catch (err) {
    send(res, err);
  }
}

// POST /api/pyq/import/:id/retry -> read a failed upload again, from where it stopped
async function retry(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  if (imp.status !== "failed") return res.status(400).json({ message: "Only a failed upload can be retried" });
  imp.status = "queued";
  imp.error = undefined;
  await imp.save();
  const waiting = await GenerationJob.exists({ kind: "pyq_extract", pyqImport: imp._id, status: { $in: ["queued", "running"] } });
  if (!waiting) await GenerationJob.create({ kind: "pyq_extract", pyqImport: imp._id, label: `Read PYQ: ${imp.title || imp.fileName || imp.examStage}` });
  res.json({ message: "Reading again from where it stopped", import: summary(imp) });
}

// POST /api/pyq/import/:id/publish
async function publish(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  try {
    const { test, count } = await svc.publishImport(imp, { by: req.user?.name });
    res.json({ message: `Published - ${count} questions. Students can attempt it now.`, testId: test._id, import: summary(imp) });
  } catch (err) {
    send(res, err);
  }
}

// DELETE /api/pyq/import/:id
async function remove(req, res) {
  const imp = await load(req, res);
  if (!imp) return;
  try {
    await svc.deleteImport(imp);
    res.json({ message: "Upload deleted" });
  } catch (err) {
    send(res, err);
  }
}

module.exports = { createImport, listImports, getImport, updateImport, updateRow, confirm, uploadRowImage, downloadCsv, uploadCsv, retry, publish, remove, summary };
