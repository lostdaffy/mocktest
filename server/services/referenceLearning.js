// Learning from the admin's reference papers - without copying them.
//
// The admin uploads a coaching mock, a past paper or notes for an exam. The
// model reads it ONCE and writes down how it is built: the level, which
// topics carry how many questions, the formats, how options and traps are
// made, the language. That description (guideText) goes into every later
// generation prompt for that exam and subject, so new questions are pitched
// at that standard.
//
// Two walls keep the reference's own questions out of ours:
//  1. The reading prompt asks for patterns in the abstract, and guideText is
//     written in code from those fields - no question text reaches it.
//  2. The reference's questions are kept (stems) and every generated
//     question is compared with them; one that copies, even with the numbers
//     or a word changed, is thrown out.

const crypto = require("crypto");
const ReferenceGuide = require("../models/ReferenceGuide");

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES = 12;
const MAX_TEXT = 60000;
// A generated question this alike in wording to a reference question is a copy.
const COPY_SIMILARITY = 0.5;

const fail = (status, message) => Object.assign(new Error(message), { status });

function decodeDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

async function createReference({ examType, subject, title, pdf, images, text, fileName, createdBy }) {
  if (!examType) throw fail(400, "Choose the exam this reference is for (or All exams)");
  let kind;
  let payload;
  let mimeTypes = [];
  let hashOf;
  if (pdf) {
    const file = decodeDataUrl(pdf);
    if (!file || file.mime !== "application/pdf" || file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") throw fail(400, "That file is not a PDF");
    if (file.buffer.length > MAX_BYTES) throw fail(400, `The PDF is ${Math.round(file.buffer.length / 1048576)} MB; the limit is 20 MB`);
    kind = "pdf";
    payload = JSON.stringify([{ mime: "application/pdf", data: file.buffer.toString("base64") }]);
    mimeTypes = ["application/pdf"];
    hashOf = file.buffer;
  } else if (Array.isArray(images) && images.length) {
    if (images.length > MAX_IMAGES) throw fail(400, `Up to ${MAX_IMAGES} pictures at a time`);
    const files = images.map(decodeDataUrl);
    if (files.some((f) => !f || !/^image\/(png|jpe?g|webp)$/.test(f.mime))) throw fail(400, "Pictures must be PNG, JPG or WEBP");
    if (files.reduce((n, f) => n + f.buffer.length, 0) > MAX_BYTES) throw fail(400, "The pictures come to more than 20 MB together");
    kind = "images";
    payload = JSON.stringify(files.map((f) => ({ mime: f.mime, data: f.buffer.toString("base64") })));
    mimeTypes = files.map((f) => f.mime);
    hashOf = Buffer.concat(files.map((f) => f.buffer));
  } else if (String(text || "").trim()) {
    const t = String(text).trim();
    if (t.length > MAX_TEXT) throw fail(400, "The text is too long - paste up to about 60,000 characters at a time");
    kind = "text";
    payload = JSON.stringify([{ text: t }]);
    hashOf = Buffer.from(t);
  } else {
    throw fail(400, "Add a PDF, pictures or paste some text");
  }
  const fileHash = crypto.createHash("sha256").update(hashOf).digest("hex");
  const same = await ReferenceGuide.findOne({ fileHash, status: { $ne: "failed" } }).select("_id title").lean();
  if (same) throw fail(409, `This reference has already been added ("${same.title}")`);

  const guide = await ReferenceGuide.create({
    examType, subject: String(subject || "").trim(), title: String(title || fileName || "Reference").trim().slice(0, 120),
    kind, fileName, fileHash, payload, mimeTypes, createdBy, status: "queued",
  });
  return guide;
}

function readingPrompt(guide) {
  return `You are studying a REFERENCE paper that an exam-preparation team chose as the standard they want to reach for ${guide.examType === "ALL" ? "Indian government competitive exams" : guide.examType}${guide.subject ? `, subject "${guide.subject}"` : ""}.

Your job is to LEARN HOW IT IS BUILT, not to copy it. Describe its patterns in the abstract, so that a different setter could write NEW questions of the same level and style without ever seeing this paper.

Return ONLY JSON in this shape:
{
  "summary": "2-3 sentences: what kind of paper this is and its overall standard",
  "level": "how hard, and what makes it hard (e.g. two-step calculations, close options, statement-based questions)",
  "difficulty": "rough share of easy / medium / hard, e.g. 30/50/20",
  "topics": [ { "topic": "topic name", "count": 3 } ],
  "formats": [ "an ABSTRACT description of one question format used, e.g. 'two statements, choose which is/are correct', 'match list I with list II (4 pairs)', 'find the wrong term in a number series'" ],
  "language": "how the questions are worded - length, Hindi/English style, directness",
  "options": "how the options are built - how close the wrong ones are, units, ordering, 'none of these' use",
  "traps": [ "a kind of trap or common mistake the wrong options exploit, described in general terms" ],
  "questions": [ "the full text of each question in the reference, exactly as printed (used ONLY to make sure no new question copies it)" ]
}

Rules:
- In every field except "questions": never quote a question, never use its specific numbers, names, dates or answers. General terms only.
- "topics" counts how many questions each topic has in this reference.
- If the reference is notes rather than questions, leave "questions" empty and describe the level and topics it covers.`;
}

// guideText is written here, from the fields - never from question text.
function buildGuideText(guide, b) {
  const lines = [];
  lines.push(`From "${guide.title}"${guide.subject ? ` (${guide.subject})` : ""}: ${String(b.summary || "").slice(0, 300)}`);
  if (b.level) lines.push(`Level: ${String(b.level).slice(0, 300)}`);
  if (b.difficulty) lines.push(`Difficulty mix: ${String(b.difficulty).slice(0, 60)}`);
  const topics = (b.topics || []).filter((t) => t && t.topic).slice(0, 15);
  if (topics.length) lines.push(`Topic weight: ${topics.map((t) => `${t.topic} ${t.count || ""}`.trim()).join(", ")}`);
  const formats = (b.formats || []).filter(Boolean).slice(0, 8);
  if (formats.length) lines.push(`Formats to use:\n${formats.map((f) => `  - ${String(f).slice(0, 160)}`).join("\n")}`);
  if (b.language) lines.push(`Wording: ${String(b.language).slice(0, 200)}`);
  if (b.options) lines.push(`Options: ${String(b.options).slice(0, 200)}`);
  const traps = (b.traps || []).filter(Boolean).slice(0, 6);
  if (traps.length) lines.push(`Traps to build into wrong options:\n${traps.map((t) => `  - ${String(t).slice(0, 160)}`).join("\n")}`);
  return lines.join("\n");
}

/** Reads one queued reference with the model. Called by the generation queue. */
async function readReference(id) {
  const gemini = require("./geminiService");
  const guide = await ReferenceGuide.findById(id).select("+payload");
  if (!guide) return "The reference was deleted before it was read";
  if (guide.status === "ready") return `${guide.title} was already read`;
  guide.status = "reading";
  await guide.save();

  const parts = JSON.parse(guide.payload || "[]").map((p) => (p.text ? { text: `REFERENCE TEXT:\n${p.text}` } : { inline_data: { mime_type: p.mime, data: p.data } }));
  parts.push({ text: readingPrompt(guide) });
  const out = await gemini.callGeminiRaw(parts, { jsonMode: true, maxRetries: 3 });
  const b = Array.isArray(out) ? out[0] || {} : out || {};
  if (!b.summary && !(b.formats || []).length && !(b.topics || []).length) throw new Error("The model could not read anything useful from this reference");

  guide.blueprint = {
    summary: String(b.summary || "").slice(0, 600),
    level: String(b.level || "").slice(0, 600),
    difficulty: String(b.difficulty || "").slice(0, 100),
    topics: (b.topics || []).filter((t) => t && t.topic).slice(0, 40).map((t) => ({ topic: String(t.topic).slice(0, 80), count: Number(t.count) || 0 })),
    formats: (b.formats || []).filter(Boolean).slice(0, 20).map((f) => String(f).slice(0, 300)),
    language: String(b.language || "").slice(0, 400),
    options: String(b.options || "").slice(0, 400),
    traps: (b.traps || []).filter(Boolean).slice(0, 12).map((t) => String(t).slice(0, 300)),
  };
  const stems = (b.questions || []).map((q) => String(q || "").trim()).filter((q) => q.length > 12).slice(0, 500);
  guide.stems = stems;
  guide.stemCount = stems.length;
  if (!guide.guideEdited) guide.guideText = buildGuideText(guide, guide.blueprint);
  guide.status = "ready";
  guide.error = undefined;
  guide.readAt = new Date();
  guide.payload = undefined; // read; the file is not needed any more
  await guide.save();
  return `${guide.title}: learned ${guide.blueprint.formats.length} format(s), ${guide.blueprint.topics.length} topic(s); ${stems.length} question(s) kept for the copy check`;
}

// Guides that apply: this exam's and the all-exam ones; this subject's and
// the subject-less ones.
function applicableFilter(examType, subject) {
  return {
    status: "ready",
    active: true,
    examType: { $in: [examType, "ALL"].filter(Boolean) },
    subject: { $in: ["", subject || ""] },
  };
}

/** The text that goes into a generation prompt, or "" when there is none. */
async function guidanceFor(examType, subject) {
  // Up to two references, then the lessons from rejected questions.
  const filter = applicableFilter(examType, subject);
  const [refs, lessons] = await Promise.all([
    ReferenceGuide.find({ ...filter, kind: { $ne: "lessons" } }).sort({ updatedAt: -1 }).limit(2).select("guideText").lean(),
    ReferenceGuide.find({ ...filter, kind: "lessons" }).sort({ updatedAt: -1 }).limit(2).select("guideText").lean(),
  ]);
  return [...refs, ...lessons].map((g) => g.guideText).filter(Boolean).join("\n\n").slice(0, 3500);
}

const words = (t) =>
  new Set(
    String(t || "")
      .toLowerCase()
      .replace(/[^a-zऀ-ॿ]+/g, " ") // numbers left out: changing them does not make a copy new
      .split(" ")
      .filter((w) => w.length > 2)
  );
function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

/** Loads the reference questions once, for checking a whole batch. */
async function referenceChecker(examType, subject) {
  const guides = await ReferenceGuide.find({ ...applicableFilter(examType, subject), active: { $in: [true, false] } }).select("+stems title").lean();
  const stems = guides.flatMap((g) => (g.stems || []).map((s) => ({ s, w: words(s), title: g.title })));
  return (text) => {
    if (!stems.length) return { copy: false };
    const w = words(text);
    for (const st of stems) {
      if (similarity(w, st.w) >= COPY_SIMILARITY) return { copy: true, of: st.s, title: st.title };
    }
    return { copy: false };
  };
}

module.exports = { createReference, readReference, guidanceFor, referenceChecker, buildGuideText, readingPrompt, COPY_SIMILARITY };
