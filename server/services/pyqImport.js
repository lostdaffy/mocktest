const crypto = require("crypto");
const mongoose = require("mongoose");
const { PDFDocument } = require("pdf-lib");
const PyqImport = require("../models/PyqImport");
const Question = require("../models/Question");
const QuestionImage = require("../models/QuestionImage");
const Test = require("../models/Test");
const ExamPattern = require("../models/ExamPattern");
const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");
const { sectionRulesFrom } = require("../utils/marking");
const { prepareRow } = require("./manualQuestions");
const { hasMixedScript } = require("./validationPipeline");
const { refersToAPassage, carriesItsPassage } = require("../utils/comprehension");
const { normaliseChart } = require("./visuals");
// Through the module, so the tests can stand in for the model.
const extractor = require("./pyqExtractor");

// A previous-year paper from PDF to published test:
//
//   upload -> read (a queue job: info, pages, solve, translate, tag) ->
//   review (flags; edit in the panel or round-trip a CSV) -> publish.
//
// The paper is the source of truth. The model copies it; what the model adds
// (a translation, its own solve, a topic) is kept apart and labelled. Nothing
// reaches a student until a person publishes, and publishing refuses while
// any row still needs a person.

const PAGES_PER_CALL = 2; // small, so a dense bilingual page never runs the reply out
const BATCH = 8; // questions per solve / translate / tag call
const MAX_PAGES = 150;
const MAX_BYTES = 25 * 1024 * 1024;

// ---------------------------------------------------------------- storage

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "pyqpdfs" });

function storePdf(buffer, filename) {
  return new Promise((resolve, reject) => {
    const up = bucket().openUploadStream(filename || "paper.pdf", { contentType: "application/pdf" });
    up.on("error", reject);
    up.on("finish", () => resolve(up.id));
    up.end(buffer);
  });
}

function readPdf(fileId) {
  return new Promise((resolve, reject) => {
    const parts = [];
    bucket()
      .openDownloadStream(fileId)
      .on("data", (d) => parts.push(d))
      .on("error", reject)
      .on("end", () => resolve(Buffer.concat(parts)));
  });
}

/** Pages from..to (1-based, inclusive) of a loaded PDF, as base64. */
async function pagesAsBase64(src, from, to) {
  const out = await PDFDocument.create();
  const idx = [];
  for (let p = from; p <= to; p++) idx.push(p - 1);
  const copied = await out.copyPages(src, idx);
  copied.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save()).toString("base64");
}

// ---------------------------------------------------------------- reading answers

const HINDI_LETTERS = ["क", "ख", "ग", "घ", "ङ"];
const norm = (s) => String(s ?? "").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");

/**
 * An answer as a paper prints it - "(b)", "B", "2", "Option 3", "(ग)", or the
 * option's own text - to a 0-based index into `options`. Null when it cannot
 * be read for certain: a wrong guess here would mis-key a question silently.
 */
function readPrintedAnswer(answer, options = []) {
  if (answer === null || answer === undefined || answer === "") return null;
  const raw = String(answer).trim();
  const bare = raw
    .replace(/^(ans(wer)?|correct( option| answer)?|option|उत्तर|सही उत्तर)\s*[:.\-]?\s*/i, "")
    .replace(/[()[\].\s]/g, "")
    .toLowerCase();
  let i = null;
  if (/^[a-e]$/.test(bare)) i = bare.charCodeAt(0) - 97;
  else if (/^[1-5]$/.test(bare)) i = Number(bare) - 1;
  else if (HINDI_LETTERS.includes(bare)) i = HINDI_LETTERS.indexOf(bare);
  else {
    const k = norm(raw);
    const hit = options.findIndex((o) => k && norm(o) === k);
    i = hit >= 0 ? hit : null;
  }
  return i !== null && i < options.length ? i : null;
}

/** The AI's copied option text back to an index; null if it matches none. */
function matchOption(answerText, options) {
  const k = norm(answerText);
  if (!k) return null;
  const exact = options.findIndex((o) => norm(o) === k);
  if (exact >= 0) return exact;
  const inside = options.map((o, i) => (norm(o) && (k.includes(norm(o)) || norm(o).includes(k)) ? i : -1)).filter((i) => i >= 0);
  return inside.length === 1 ? inside[0] : null;
}

// ---------------------------------------------------------------- flags

/** What still needs a person on this row. Worked out, never stored by hand. */
function flagsFor(row) {
  const flags = [];
  const options = row.options || [];
  // Four, or the five a paper like UPSSSC PET prints ((E) "None of the above").
  if (options.length !== 4 && options.length !== 5) flags.push("option_count");
  if (!String(row.text || "").trim() || options.some((o) => !String(o || "").trim())) flags.push("incomplete");
  if (!row.answerConfirmed) {
    if (row.paperAnswer === null || row.paperAnswer === undefined) flags.push("no_answer");
    else if (row.aiAnswer !== null && row.aiAnswer !== undefined && row.aiAnswer !== row.paperAnswer) flags.push("answer_mismatch");
  }
  if (row.needsFigure && !row.imageId) flags.push("needs_figure");
  if (hasMixedScript([row.text, row.textHi, ...options, ...(row.optionsHi || []), row.passage, row.passageHi])) flags.push("mixed_script");
  const whole = `${row.passage || ""}\n${row.text || ""}`;
  if (refersToAPassage(row.text) && !carriesItsPassage(whole)) flags.push("passage_missing");
  return flags;
}

function refreshRow(row) {
  if (!row.answerConfirmed) {
    row.correctIndex = row.paperAnswer ?? null;
  }
  row.flags = flagsFor(row);
  return row;
}

// ---------------------------------------------------------------- upload

/**
 * Stores the PDF and queues its reading. Admin-given details win over what
 * the paper says; blanks are filled from the paper when it is read.
 */
async function createImport({ examStage, pdfBase64, fileName, title, examDate, shift, year, language, createdBy }) {
  const fail = (status, message, extra) => Object.assign(new Error(message), { status, ...extra });
  if (!examStage) throw fail(400, "Choose the exam first");
  const pattern = await ExamPattern.findOne({ examType: examStage }).lean();
  if (!pattern) throw fail(404, `No exam pattern found for ${examStage}`);

  const data = String(pdfBase64 || "").replace(/^data:application\/pdf;base64,/, "");
  const buffer = Buffer.from(data, "base64");
  if (!buffer.length || buffer.subarray(0, 5).toString("latin1") !== "%PDF-") throw fail(400, "That file is not a PDF");
  if (buffer.length > MAX_BYTES) throw fail(400, `The PDF is ${Math.round(buffer.length / 1048576)} MB; the limit is 25 MB`);

  let pages;
  try {
    pages = (await PDFDocument.load(buffer, { ignoreEncryption: true })).getPageCount();
  } catch (err) {
    throw fail(400, "This PDF could not be opened - it may be damaged. Try downloading it again.");
  }
  if (pages > MAX_PAGES) throw fail(400, `The PDF has ${pages} pages; split it into papers of up to ${MAX_PAGES}`);

  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const same = await PyqImport.findOne({ fileHash, status: { $ne: "failed" } }).select("_id title status").lean();
  if (same) throw fail(409, "This exact PDF has already been uploaded", { existing: same._id });

  const y = year ? Number(year) : undefined;
  if (y !== undefined && (!Number.isInteger(y) || y < 1990 || y > new Date().getFullYear())) throw fail(400, "That year does not look right");

  const fileId = await storePdf(buffer, fileName);
  const imp = await PyqImport.create({
    examStage,
    title: String(title || "").trim() || undefined,
    examDate: examDate ? new Date(examDate) : undefined,
    shift: String(shift || "").trim() || undefined,
    year: y,
    language: ["english", "hindi", "bilingual"].includes(language) ? language : undefined,
    fileName,
    fileHash,
    fileId,
    pages,
    createdBy,
  });

  await GenerationJob.create({ kind: "pyq_extract", pyqImport: imp._id, label: `Read PYQ: ${imp.title || fileName || examStage}` });
  // Resume the queue unless it is waiting out the day's allowance, when a
  // resume would only stop again at once.
  const state = await QueueState.findOne({ key: "generation" }).lean();
  const waiting = state?.paused && state.resumableAfter && new Date(state.resumableAfter) > new Date();
  if (!waiting) {
    await QueueState.updateOne({ key: "generation" }, { $set: { paused: false, pausedReason: "", pausedBy: "admin" } }, { upsert: true });
  }
  return { import: imp, waitingForAllowance: !!waiting };
}

// ---------------------------------------------------------------- reading (the job)

/**
 * Reads one import as far as it can, saving after every call, so a restart
 * or a spent allowance carries on from the same place. Throws the model's
 * errors for the worker to judge (retry, pause, or fail).
 */
async function runImport(importId) {
  const imp = await PyqImport.findById(importId);
  if (!imp) return "The upload was deleted before it was read";
  if (imp.status === "review" || imp.status === "published") return "Already read";
  imp.status = "reading";
  imp.error = undefined;
  await imp.save();

  const src = await PDFDocument.load(await readPdf(imp.fileId), { ignoreEncryption: true });
  const pages = src.getPageCount();
  const pattern = await ExamPattern.findOne({ examType: imp.examStage }).lean();

  if (imp.step === "info") {
    const info = await extractor.detectPaperInfo(await pagesAsBase64(src, 1, Math.min(2, pages)));
    const year = Number(info.year) || (info.examDate ? new Date(info.examDate).getFullYear() : undefined);
    imp.detected = {
      examName: info.examName || undefined,
      examDate: /^\d{4}-\d{2}-\d{2}$/.test(String(info.examDate || "")) ? info.examDate : undefined,
      shift: info.shift || undefined,
      year: Number.isInteger(year) && year >= 1990 && year <= new Date().getFullYear() ? year : undefined,
      language: ["english", "hindi", "bilingual"].includes(info.language) ? info.language : undefined,
      totalQuestions: Number.isInteger(Number(info.totalQuestions)) && Number(info.totalQuestions) > 0 ? Number(info.totalQuestions) : undefined,
    };
    // The admin's own values stay; the paper fills only what was left blank.
    if (!imp.examDate && imp.detected.examDate) imp.examDate = new Date(imp.detected.examDate);
    if (!imp.shift && imp.detected.shift) imp.shift = imp.detected.shift;
    if (!imp.year && imp.detected.year) imp.year = imp.detected.year;
    if (!imp.year && imp.examDate) imp.year = imp.examDate.getFullYear();
    if (!imp.language && imp.detected.language) imp.language = imp.detected.language;
    if (!imp.title && imp.detected.examName) imp.title = imp.detected.examName;
    imp.expectedCount = imp.detected.totalQuestions;
    imp.step = "pages";
    await imp.save();
  }

  if (imp.step === "pages") {
    while (imp.pagesDone < pages) {
      const first = imp.pagesDone + 1;
      const last = Math.min(first + PAGES_PER_CALL - 1, pages);
      const withNextPage = last < pages;
      const got = await extractor.extractPages(await pagesAsBase64(src, first, withNextPage ? last + 1 : last), { first, last, withNextPage });
      mergeRows(imp, got.questions.map((q) => rowFromExtract(q, first)));
      for (const k of got.answerKey) {
        if (k && k.number !== undefined && k.answer) imp.answerKey.push({ number: Number(k.number), section: String(k.section || ""), answer: String(k.answer) });
      }
      imp.pagesDone = last;
      await imp.save();
    }
    applyAnswerKey(imp);
    imp.missingNumbers = missingNumbers(imp);
    imp.step = "solve";
    await imp.save();
  }

  const live = () => imp.rows.filter((r) => !r.removed);

  if (imp.step === "solve") {
    let todo = live().filter((r) => !r.solved && (r.options || []).length >= 2 && (r.text || r.textHi));
    while (todo.length) {
      const batch = todo.slice(0, BATCH);
      const out = await extractor.solveRows(
        batch.map((r) => ({
          id: String(r._id),
          text: r.text || r.textHi,
          options: r.options.length ? r.options : r.optionsHi,
          passage: r.passage || r.passageHi || "",
        }))
      );
      const byId = new Map(out.map((o) => [String(o?.id), o]));
      for (const r of batch) {
        const o = byId.get(String(r._id));
        // Matched to an option by its TEXT, so a reply that numbers the
        // options differently cannot mis-key a question.
        const idx = o ? matchOption(o.answer, r.options.length ? r.options : r.optionsHi) : null;
        r.aiAnswer = idx;
        r.aiWorking = o?.working ? String(o.working).slice(0, 2000) : undefined;
        r.solved = true;
      }
      await imp.save();
      todo = todo.slice(BATCH);
    }
    imp.step = "translate";
    await imp.save();
  }

  if (imp.step === "translate") {
    for (const to of ["hi", "en"]) {
      let todo = live().filter((r) =>
        to === "hi" ? !String(r.textHi || "").trim() && String(r.text || "").trim() : !String(r.text || "").trim() && String(r.textHi || "").trim()
      );
      while (todo.length) {
        const batch = todo.slice(0, BATCH);
        const out = await extractor.translateRows(
          batch.map((r) => ({
            id: String(r._id),
            text: to === "hi" ? r.text : r.textHi,
            options: to === "hi" ? r.options : r.optionsHi,
            passage: (to === "hi" ? r.passage : r.passageHi) || "",
            solution: (to === "hi" ? r.solution : r.solutionHi) || "",
          })),
          to
        );
        const byId = new Map(out.map((o) => [String(o?.id), o]));
        for (const r of batch) {
          const o = byId.get(String(r._id));
          const from = to === "hi" ? r.options : r.optionsHi;
          // A translation that does not keep the option count is not used:
          // the order of the options is what the answer key points at.
          const okOptions = Array.isArray(o?.options) && o.options.length === from.length;
          if (!o || !o.text || !okOptions) continue;
          if (to === "hi") {
            r.textHi = String(o.text);
            r.optionsHi = o.options.map(String);
            if (r.passage && o.passage) r.passageHi = String(o.passage);
            if (r.solution && o.solution) r.solutionHi = String(o.solution);
          } else {
            r.text = String(o.text);
            r.options = o.options.map(String);
            if (r.passageHi && o.passage) r.passage = String(o.passage);
            if (r.solutionHi && o.solution) r.solution = String(o.solution);
          }
          r.translated = to;
        }
        await imp.save();
        todo = todo.slice(BATCH);
      }
    }
    // The AI's own working, in Hindi too, for when it becomes the solution.
    let todo = live().filter((r) => r.aiWorking && !r.aiWorkingHi);
    while (todo.length) {
      const batch = todo.slice(0, BATCH);
      const out = await extractor.translateRows(batch.map((r) => ({ id: String(r._id), text: r.aiWorking, options: [], passage: "", solution: "" })), "hi");
      const byId = new Map(out.map((o) => [String(o?.id), o]));
      for (const r of batch) r.aiWorkingHi = byId.get(String(r._id))?.text ? String(byId.get(String(r._id)).text) : "-";
      await imp.save();
      todo = todo.slice(BATCH);
    }
    imp.step = "tag";
    await imp.save();
  }

  if (imp.step === "tag") {
    const sections = (pattern?.sections || []).map((s) => ({
      subject: s.subject,
      topics: (s.syllabus || []).map((t) => (typeof t === "string" ? t : t.topic)).filter(Boolean),
    }));
    let todo = live().filter((r) => !r.tagged);
    while (todo.length && sections.length) {
      const batch = todo.slice(0, BATCH);
      const out = await extractor.tagRows(batch.map((r) => ({ id: String(r._id), text: r.text || r.textHi || "", section: r.section || "" })), sections);
      const byId = new Map(out.map((o) => [String(o?.id), o]));
      for (const r of batch) {
        const o = byId.get(String(r._id));
        const sec = sections.find((s) => s.subject === o?.subject) || sectionFromHeading(sections, r.section);
        r.subject = sec?.subject || r.subject;
        r.topic = sec && sec.topics.includes(o?.topic) ? o.topic : sec?.subject || r.topic;
        r.tagged = true;
      }
      await imp.save();
      todo = todo.slice(BATCH);
    }
    imp.step = "done";
  }

  for (const r of imp.rows) refreshRow(r);
  imp.status = "review";
  await imp.save();
  const open = imp.rows.filter((r) => !r.removed && r.flags.length).length;
  return `${imp.rows.length} questions read from ${pages} pages; ${open} need a look`;
}

// The printed section heading, matched to a section of the exam by words.
function sectionFromHeading(sections, heading) {
  const h = norm(heading);
  if (!h) return null;
  return sections.find((s) => h.includes(norm(s.subject)) || norm(s.subject).includes(h)) || null;
}

function rowFromExtract(q, firstPage) {
  const arr = (a) => (Array.isArray(a) ? a.map((x) => String(x ?? "").trim()) : []);
  const optionsEn = arr(q.optionsEn);
  const optionsHi = arr(q.optionsHi);
  const options = optionsEn.length ? optionsEn : optionsHi;
  return {
    number: Number.isFinite(Number(q.number)) ? Number(q.number) : undefined,
    section: String(q.section || "").trim(),
    page: Number(q.page) || firstPage,
    passage: String(q.passage || "").trim(),
    passageHi: String(q.passageHi || "").trim(),
    text: String(q.textEn || "").trim(),
    textHi: String(q.textHi || "").trim(),
    options: optionsEn,
    optionsHi,
    paperAnswer: readPrintedAnswer(q.answer, options),
    needsFigure: !!q.needsFigure,
    solution: String(q.solutionEn || "").trim(),
    solutionHi: String(q.solutionHi || "").trim(),
  };
}

const rowKey = (r) => (Number.isFinite(r.number) ? `${norm(r.section)}|${r.number}` : `t|${norm(r.text || r.textHi).slice(0, 120)}`);
const filled = (r) => [r.text, r.textHi, r.passage, ...(r.options || []), ...(r.optionsHi || [])].join("").length;

// A question met twice - read again where two calls overlap - is kept once,
// the fuller copy winning (the first read may have been cut at a page break).
function mergeRows(imp, rows) {
  for (const row of rows) {
    if (!row.text && !row.textHi) continue;
    const at = imp.rows.findIndex((r) => rowKey(r) === rowKey(row));
    if (at < 0) imp.rows.push(row);
    else if (filled(row) > filled(imp.rows[at])) {
      Object.assign(imp.rows[at], row);
    }
  }
}

function applyAnswerKey(imp) {
  for (const k of imp.answerKey) {
    const candidates = imp.rows.filter((r) => r.number === k.number);
    const row =
      candidates.length === 1
        ? candidates[0]
        : candidates.find((r) => norm(r.section) && norm(r.section) === norm(k.section));
    if (!row || (row.paperAnswer !== null && row.paperAnswer !== undefined)) continue;
    row.paperAnswer = readPrintedAnswer(k.answer, row.options.length ? row.options : row.optionsHi);
  }
}

// Printed numbers that never turned up. Numbered straight through, against
// the paper's own count; numbered per section, the gaps inside each.
function missingNumbers(imp) {
  const nums = imp.rows.map((r) => r.number).filter(Number.isFinite);
  if (!nums.length) return [];
  const out = [];
  if (new Set(nums).size === nums.length) {
    const top = Math.max(imp.expectedCount || 0, ...nums);
    const have = new Set(nums);
    for (let n = 1; n <= top; n++) if (!have.has(n)) out.push(n);
  } else {
    const bySection = new Map();
    for (const r of imp.rows) if (Number.isFinite(r.number)) bySection.set(norm(r.section), [...(bySection.get(norm(r.section)) || []), r.number]);
    for (const list of bySection.values()) {
      const have = new Set(list);
      for (let n = Math.min(...list); n <= Math.max(...list); n++) if (!have.has(n)) out.push(n);
    }
  }
  return out.slice(0, 100);
}

// ---------------------------------------------------------------- review

const EDITABLE = ["text", "textHi", "options", "optionsHi", "passage", "passageHi", "solution", "solutionHi", "subject", "topic", "needsFigure"];

/** A person's edit to one row. Choosing the answer settles it. */
function editRow(row, patch = {}) {
  for (const f of EDITABLE) {
    if (patch[f] === undefined) continue;
    if (f === "options" || f === "optionsHi") row[f] = (Array.isArray(patch[f]) ? patch[f] : []).map((o) => String(o ?? "").trim());
    else if (f === "needsFigure") row[f] = !!patch[f];
    else row[f] = String(patch[f] ?? "").trim();
  }
  if (patch.correctIndex !== undefined) {
    const i = patch.correctIndex === null ? null : Number(patch.correctIndex);
    if (i !== null && !(Number.isInteger(i) && i >= 0 && i < (row.options || []).length)) {
      throw Object.assign(new Error("Choose one of the options as the answer"), { status: 400 });
    }
    row.correctIndex = i;
    row.answerConfirmed = i !== null;
  }
  if (patch.removed !== undefined) row.removed = !!patch.removed;
  // Options changed under a confirmed answer: the answer must be chosen again.
  if ((patch.options !== undefined) && row.answerConfirmed && !(row.correctIndex < (row.options || []).length)) {
    row.answerConfirmed = false;
    row.correctIndex = null;
  }
  if (!row.answerConfirmed) row.correctIndex = row.paperAnswer ?? null;
  row.flags = flagsFor(row);
  return row;
}

/**
 * Settles answers in bulk: "paper" takes the printed key, "ai" the AI's own
 * solve, for the rows given (or every row carrying `flag`).
 */
function confirmAnswers(imp, { use, rowIds, flag }) {
  const ids = rowIds ? new Set(rowIds.map(String)) : null;
  let done = 0;
  for (const r of imp.rows) {
    if (r.removed) continue;
    if (ids && !ids.has(String(r._id))) continue;
    if (!ids && flag && !r.flags.includes(flag)) continue;
    const pick = use === "ai" ? r.aiAnswer : r.paperAnswer;
    if (pick === null || pick === undefined) continue;
    r.correctIndex = pick;
    r.answerConfirmed = true;
    r.flags = flagsFor(r);
    done++;
  }
  return done;
}

// ---------------------------------------------------------------- CSV

const CSV_COLUMNS = [
  "id", "number", "section", "subject", "topic", "passage", "question", "optionA", "optionB", "optionC", "optionD", "optionE",
  "passageHi", "questionHi", "optionAHi", "optionBHi", "optionCHi", "optionDHi", "optionEHi",
  "answer", "paperAnswer", "aiAnswer", "solution", "solutionHi", "flags", "remove",
];
const LETTER = (i) => (i === null || i === undefined ? "" : "ABCDE"[i]);

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The paper as a spreadsheet: one row per question, in paper order. */
function exportCsv(imp) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of imp.rows) {
    const o = r.options || [];
    const h = r.optionsHi || [];
    const cells = {
      id: String(r._id), number: r.number ?? "", section: r.section, subject: r.subject, topic: r.topic,
      passage: r.passage, question: r.text,
      optionA: o[0], optionB: o[1], optionC: o[2], optionD: o[3], optionE: o[4],
      passageHi: r.passageHi, questionHi: r.textHi,
      optionAHi: h[0], optionBHi: h[1], optionCHi: h[2], optionDHi: h[3], optionEHi: h[4],
      answer: r.answerConfirmed ? LETTER(r.correctIndex) : "",
      paperAnswer: LETTER(r.paperAnswer), aiAnswer: LETTER(r.aiAnswer),
      solution: r.solution, solutionHi: r.solutionHi,
      flags: (r.flags || []).join(" "), remove: r.removed ? "yes" : "",
    };
    lines.push(CSV_COLUMNS.map((c) => csvCell(cells[c])).join(","));
  }
  // The BOM makes Excel read the Hindi as Hindi instead of mojibake.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** RFC 4180: quoted fields may hold commas, quotes ("") and line breaks. */
function parseCsv(text) {
  const s = String(text || "").replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); if (row.some((x) => x !== "")) rows.push(row); }
  return rows;
}

/**
 * Applies an edited CSV. Rows are matched by id; a row without an id is a
 * question the reading missed, added in place by its number. Nothing is
 * saved unless every row reads cleanly - a 100-row file with a mistake in
 * row 63 should be fixed in the file, not half-applied.
 */
function applyCsv(imp, text) {
  const table = parseCsv(text);
  if (!table.length) throw Object.assign(new Error("The file is empty"), { status: 400 });
  const head = table[0].map((h) => h.trim());
  for (const need of ["question", "optionA", "optionB", "answer"]) {
    if (!head.includes(need)) throw Object.assign(new Error(`The file has no "${need}" column - start from the downloaded sheet`), { status: 400 });
  }
  const col = (r, name) => (head.indexOf(name) >= 0 ? String(r[head.indexOf(name)] ?? "").trim() : undefined);
  const errors = [];
  const changes = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const id = col(cells, "id");
    const existing = id ? imp.rows.find((r) => String(r._id) === id) : null;
    if (id && !existing) return errors.push({ line, error: "this id is not a question of this paper - do not change the id column" });
    const options = ["A", "B", "C", "D", "E"].map((l) => col(cells, `option${l}`)).filter((o) => o !== undefined && o !== "");
    const optionsHi = ["A", "B", "C", "D", "E"].map((l) => col(cells, `option${l}Hi`)).filter((o) => o !== undefined && o !== "");
    const ans = col(cells, "answer");
    let correctIndex;
    if (ans) {
      correctIndex = readPrintedAnswer(ans, options);
      if (correctIndex === null) return errors.push({ line, error: `answer "${ans}" is not one of the options (use A-${"ABCDE"[options.length - 1] || "D"})` });
    }
    const remove = /^(yes|y|true|1|हाँ|हां)$/i.test(col(cells, "remove") || "");
    const patch = {
      text: col(cells, "question"), textHi: col(cells, "questionHi"),
      passage: col(cells, "passage"), passageHi: col(cells, "passageHi"),
      options, ...(optionsHi.length || col(cells, "optionAHi") !== undefined ? { optionsHi } : {}),
      solution: col(cells, "solution"), solutionHi: col(cells, "solutionHi"),
      subject: col(cells, "subject"), topic: col(cells, "topic"),
      removed: remove,
      ...(correctIndex !== undefined ? { correctIndex } : {}),
    };
    if (!existing && !remove && !patch.text && !patch.textHi) return errors.push({ line, error: "a new row needs the question" });
    changes.push({ existing, patch, number: Number(col(cells, "number")) || undefined, section: col(cells, "section") || "" });
  });
  return { errors, changes };
}

function commitCsv(imp, changes) {
  let updated = 0;
  let added = 0;
  for (const { existing, patch, number, section } of changes) {
    if (existing) {
      editRow(existing, patch);
      updated++;
    } else if (!patch.removed) {
      imp.rows.push({ number, section, page: undefined });
      const row = imp.rows[imp.rows.length - 1];
      row.solved = true;
      row.tagged = true;
      editRow(row, patch);
      added++;
    }
  }
  // Paper order: by printed number where there is one.
  imp.rows.sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9));
  return { updated, added };
}

// ---------------------------------------------------------------- publish

/**
 * Turns the checked rows into questions and a published past paper. Refuses
 * while any row still needs a person, and runs every row through the same
 * rules as a hand-typed paper before writing anything.
 */
async function publishImport(imp, { by } = {}) {
  const fail = (status, message, extra) => Object.assign(new Error(message), { status, ...extra });
  if (imp.status === "published") throw fail(400, "This paper is already published");
  if (imp.status !== "review") throw fail(400, "The paper is still being read");

  const live = imp.rows.filter((r) => !r.removed);
  for (const r of live) r.flags = flagsFor(r);
  const open = live.filter((r) => r.flags.length);
  if (open.length) {
    throw fail(400, `${open.length} question(s) still need a look before publishing`, {
      open: open.map((r) => ({ id: r._id, number: r.number, flags: r.flags })),
    });
  }
  if (!live.length) throw fail(400, "No questions are left in this paper");
  if (!imp.year) throw fail(400, "Set the year of the paper first");

  const pattern = await ExamPattern.findOne({ examType: imp.examStage }).lean();
  if (!pattern) throw fail(404, `No exam pattern found for ${imp.examStage}`);
  if (imp.examDate) {
    // An unset field must be asked for as such: { pyqShift: undefined } is
    // dropped from the query and would match every shift of that day.
    const twin = await Test.findOne({
      type: "pyq",
      examStage: imp.examStage,
      examDate: imp.examDate,
      pyqShift: imp.shift ? imp.shift : { $in: [null, ""] },
      publishStatus: "published",
    })
      .select("title")
      .lean();
    if (twin) throw fail(409, `"${twin.title}" - the same exam, date and shift - is already published`);
  }

  const dateLabel = imp.examDate ? imp.examDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : String(imp.year);
  const title = imp.title ? `${imp.title} - ${dateLabel}${imp.shift ? ` (${imp.shift})` : ""}` : `${pattern.displayName} PYQ - ${dateLabel}${imp.shift ? ` (${imp.shift})` : ""}`;
  const pyq = { pyqYear: imp.year, pyqShift: imp.shift || undefined, pyqExamName: title };

  const prepared = [];
  const errors = [];
  for (const r of live) {
    const join = (p, t) => (p ? `${p}\n\n${t}` : t);
    // The AI's working is the explanation only where it reached the answer
    // being published; otherwise the student is told none was printed.
    const aiFits = r.aiAnswer === r.correctIndex && r.aiWorking;
    const { question, errors: errs } = prepareRow(
      {
        text: join(r.passage, r.text),
        textHi: r.textHi ? join(r.passageHi, r.textHi) : "",
        options: r.options,
        optionsHi: r.optionsHi && r.optionsHi.length === r.options.length ? r.optionsHi : [],
        correctIndex: r.correctIndex,
        solution: r.solution || (aiFits ? r.aiWorking : ""),
        solutionHi: r.solutionHi || (aiFits && r.aiWorkingHi && r.aiWorkingHi !== "-" ? r.aiWorkingHi : ""),
        subject: r.subject,
        topic: r.topic,
      },
      { examType: imp.examStage, source: "pyq", subjectFallback: r.subject || pattern.sections?.[0]?.subject, pyq }
    );
    if (errs.length) errors.push({ id: r._id, number: r.number, errors: errs });
    question.difficulty = "exam";
    if (r.imageId) question.visual = { kind: "figure", figure: { imageId: r.imageId, answerCheck: "by_eye", uploadedAt: new Date(), uploadedBy: by || "admin" } };
    // A table or graph from the paper, kept as its numbers so the app draws
    // it (services/visuals.js). The questions on one chart share chartSet.
    else if (r.chart) {
      question.visual = { kind: "chart", setId: r.chartSet || undefined, chart: normaliseChart(r.chart), ...(r.chartFormula ? { formula: r.chartFormula } : {}) };
    }
    prepared.push({ row: r, question });
  }
  if (errors.length) throw fail(400, `${errors.length} question(s) cannot be saved as they are`, { rowErrors: errors });

  const created = await Question.insertMany(prepared.map((p) => p.question), { ordered: true });
  const test = await Test.create({
    title,
    type: "pyq",
    examType: imp.examStage,
    examStage: imp.examStage,
    pyqYear: imp.year,
    pyqShift: imp.shift || undefined,
    examDate: imp.examDate || undefined,
    pyqLanguage: imp.language || "bilingual",
    questions: created.map((q) => q._id),
    durationMinutes: pattern.durationMinutes,
    marksPerQuestion: pattern.marksPerQuestion,
    negativeMarking: pattern.negativeMarking,
    sectionRules: sectionRulesFrom(pattern),
    hasVisuals: prepared.some((p) => p.question.visual) || undefined,
    publishStatus: "published",
    createdBy: "admin",
  });
  for (let i = 0; i < prepared.length; i++) {
    prepared[i].row.questionId = created[i]._id;
    if (prepared[i].row.imageId) await QuestionImage.updateOne({ _id: prepared[i].row.imageId }, { $set: { question: created[i]._id } });
  }
  imp.testId = test._id;
  imp.status = "published";
  imp.publishedAt = new Date();
  await imp.save();
  return { test, count: created.length };
}

async function deleteImport(imp) {
  if (imp.status === "published") throw Object.assign(new Error("A published paper is archived from the PYQ list, not deleted here"), { status: 400 });
  if (imp.fileId) await bucket().delete(imp.fileId).catch(() => {});
  const images = imp.rows.map((r) => r.imageId).filter(Boolean);
  if (images.length) await QuestionImage.deleteMany({ _id: { $in: images }, question: null });
  await GenerationJob.deleteMany({ pyqImport: imp._id, status: "queued" });
  await PyqImport.deleteOne({ _id: imp._id });
}

module.exports = {
  createImport,
  runImport,
  editRow,
  confirmAnswers,
  exportCsv,
  parseCsv,
  applyCsv,
  commitCsv,
  publishImport,
  deleteImport,
  flagsFor,
  refreshRow,
  readPrintedAnswer,
  matchOption,
  missingNumbers,
  readPdf,
  CSV_COLUMNS,
};
