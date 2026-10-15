const Question = require("../models/Question");
const QuestionImage = require("../models/QuestionImage");
const Test = require("../models/Test");
const { normaliseFigure, figurePrompt, figureSvg } = require("../services/visuals");

// Pictures for figure questions: the Images pending page, the upload, and
// serving the picture to the app.

// The admin panel shrinks every picture before sending it; this is only the
// backstop against a raw photo from a phone.
const MAX_BYTES = 600 * 1024;

const MAGIC = [
  { mime: "image/png", test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", test: (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
];

const awaitingFilter = {
  "visual.kind": "figure",
  $or: [{ "visual.figure.imageId": { $exists: false } }, { "visual.figure.imageId": null }],
};

// Everything the page shows for one figure question, prompt and reference
// drawing included. Built from the stored spec every time, so improving the
// prompt wording improves it for questions already in the bank.
function figureCard(q, tests = []) {
  let prompt = "";
  let svg = "";
  let specProblem = null;
  try {
    const spec = normaliseFigure(q.visual?.figure?.spec);
    prompt = figurePrompt(spec);
    svg = figureSvg(spec);
  } catch (err) {
    specProblem = err.message;
  }
  return {
    _id: q._id,
    text: q.text,
    textHi: q.textHi,
    options: q.options,
    correctIndex: q.correctIndex,
    solution: q.solution,
    subject: q.subject,
    topic: q.topic,
    chapter: q.chapter,
    status: q.status,
    answerCheck: q.visual?.figure?.answerCheck || "by_eye",
    imageId: q.visual?.figure?.imageId || null,
    uploadedAt: q.visual?.figure?.uploadedAt || null,
    uploadedBy: q.visual?.figure?.uploadedBy || null,
    prompt,
    svg,
    specProblem,
    tests: tests.map((t) => ({ _id: t._id, title: t.title, type: t.type, publishStatus: t.publishStatus })),
  };
}

async function testsHolding(questionIds) {
  const tests = await Test.find({ questions: { $in: questionIds } }).select("title type publishStatus questions").lean();
  const by = new Map();
  for (const t of tests) {
    for (const id of t.questions) {
      const k = String(id);
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(t);
    }
  }
  return by;
}

// GET /api/question-images/figures?status=pending|uploaded&limit=&skip= (admin)
//
// Pending first, and among those the ones already sitting in a test, since
// those are what stand between a test and publishing.
async function listFigures(req, res) {
  const status = req.query.status === "uploaded" ? "uploaded" : "pending";
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const skip = Math.max(Number(req.query.skip) || 0, 0);
  const filter =
    status === "pending" ? awaitingFilter : { "visual.kind": "figure", "visual.figure.imageId": { $type: "objectId" } };

  const [pendingCount, uploadedCount] = await Promise.all([
    Question.countDocuments(awaitingFilter),
    Question.countDocuments({ "visual.kind": "figure", "visual.figure.imageId": { $type: "objectId" } }),
  ]);

  let questions;
  if (status === "pending") {
    // Questions inside a test come first.
    const inTests = await Test.distinct("questions", { questions: { $exists: true } });
    const all = await Question.find(filter).select("_id createdAt").sort({ createdAt: 1 }).lean();
    const used = new Set(inTests.map(String));
    const ordered = [...all.filter((q) => used.has(String(q._id))), ...all.filter((q) => !used.has(String(q._id)))];
    const page = ordered.slice(skip, skip + limit).map((q) => q._id);
    const docs = await Question.find({ _id: { $in: page } }).lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    questions = page.map((id) => byId.get(String(id))).filter(Boolean);
  } else {
    questions = await Question.find(filter).sort({ "visual.figure.uploadedAt": -1 }).skip(skip).limit(limit).lean();
  }

  const holding = await testsHolding(questions.map((q) => q._id));
  res.json({
    status,
    pendingCount,
    uploadedCount,
    questions: questions.map((q) => figureCard(q, holding.get(String(q._id)) || [])),
  });
}

// GET /api/question-images/question/:questionId (admin) -> one figure card
async function getFigure(req, res) {
  const q = await Question.findById(req.params.questionId).lean();
  if (!q || q.visual?.kind !== "figure") return res.status(404).json({ message: "Figure question not found" });
  const holding = await testsHolding([q._id]);
  res.json({ question: figureCard(q, holding.get(String(q._id)) || []) });
}

// POST /api/question-images/question/:questionId (admin)
// body: { dataUrl: "data:image/webp;base64,...", width, height }
async function uploadFigure(req, res) {
  const q = await Question.findById(req.params.questionId);
  if (!q || q.visual?.kind !== "figure") return res.status(404).json({ message: "Figure question not found" });

  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(String(req.body?.dataUrl || ""));
  if (!m) return res.status(400).json({ message: "Send the picture as a PNG, JPEG or WebP image." });
  const data = Buffer.from(m[2], "base64");
  const real = MAGIC.find((x) => x.test(data));
  if (!real) return res.status(400).json({ message: "That file is not a PNG, JPEG or WebP image." });
  if (data.length > MAX_BYTES) {
    return res.status(400).json({ message: `The picture is ${Math.round(data.length / 1024)} KB; the limit is ${MAX_BYTES / 1024} KB.` });
  }

  const by = req.user?.name || req.user?.phone || "admin";
  const image = await QuestionImage.create({
    question: q._id,
    mime: real.mime,
    data,
    bytes: data.length,
    width: Number(req.body?.width) || undefined,
    height: Number(req.body?.height) || undefined,
    uploadedBy: by,
  });

  const previous = q.visual.figure.imageId;
  await Question.updateOne(
    { _id: q._id },
    { $set: { "visual.figure.imageId": image._id, "visual.figure.uploadedAt": new Date(), "visual.figure.uploadedBy": by } }
  );
  // The old picture is removed once nothing points at it. A cached copy in
  // an app is keyed by the old id, so it simply stops being asked for.
  if (previous) await QuestionImage.deleteOne({ _id: previous });

  const after = await Question.findById(q._id).lean();
  const holding = await testsHolding([q._id]);
  res.status(201).json({
    message: previous ? "Picture replaced" : "Picture uploaded",
    question: figureCard(after, holding.get(String(q._id)) || []),
  });
}

// DELETE /api/question-images/question/:questionId (admin)
//
// Takes a wrong picture off. Refused while a published test holds the
// question: students would be left with a figure question and no figure.
async function removeFigure(req, res) {
  const q = await Question.findById(req.params.questionId);
  if (!q || q.visual?.kind !== "figure") return res.status(404).json({ message: "Figure question not found" });
  if (!q.visual.figure.imageId) return res.status(400).json({ message: "This question has no picture yet" });
  const live = await Test.exists({ questions: q._id, publishStatus: "published" });
  if (live) {
    return res.status(400).json({ message: "A published test uses this question. Upload a corrected picture instead - it replaces this one." });
  }
  await QuestionImage.deleteOne({ _id: q.visual.figure.imageId });
  await Question.updateOne({ _id: q._id }, { $unset: { "visual.figure.imageId": "", "visual.figure.uploadedAt": "", "visual.figure.uploadedBy": "" } });
  res.json({ message: "Picture removed - the question is back on the pending list" });
}

// GET /api/question-images/:id (public)
//
// Public on purpose: the app's image component cannot easily send a token,
// the id is unguessable, and a figure is not private. A new upload is a new
// id, so the picture can be cached for ever.
async function serveImage(req, res) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).end();
  const img = await QuestionImage.findById(req.params.id).select("mime data").lean();
  if (!img) return res.status(404).end();
  res.set("Content-Type", img.mime);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  res.send(Buffer.from(img.data.buffer || img.data));
}

// POST /api/question-images/rekey (admin)
//
// Gives every figure question its figure-based key (see figureKey) - the
// ones made before it were keyed by their wording, so a reworded repeat
// slipped past the bank check - and lists the tests that hold the same
// figure twice, so the repeats can be taken out.
async function rekeyFigures(req, res) {
  const { figureKey } = require("../services/visuals");
  const qs = await Question.find({ "visual.kind": "figure" }).select("visual textKey").lean();
  let changed = 0;
  const keyOf = new Map();
  for (const q of qs) {
    const key = figureKey(q.visual);
    if (!key) continue;
    keyOf.set(String(q._id), key);
    if (q.textKey !== key) {
      await Question.updateOne({ _id: q._id }, { $set: { textKey: key } });
      changed++;
    }
  }
  const tests = await Test.find({ questions: { $in: [...keyOf.keys()] } }).select("title questions").lean();
  const repeats = [];
  for (const t of tests) {
    const seen = new Map();
    for (const id of t.questions.map(String)) {
      const k = keyOf.get(id);
      if (!k) continue;
      if (seen.has(k)) repeats.push({ testId: t._id, title: t.title, keep: seen.get(k), repeat: id });
      else seen.set(k, id);
    }
  }
  // And any figure whose marked answer the code now refuses - an odd one out
  // with a second defensible answer, made before that was checked.
  const { checkFigureAnswer } = require("../services/visuals");
  const full = await Question.find({ "visual.kind": "figure" }).select("visual correctIndex").lean();
  const refused = [];
  for (const q of full) {
    let check;
    try {
      check = checkFigureAnswer(normaliseFigure(q.visual.figure.spec), q.correctIndex);
    } catch (err) {
      check = { ok: false, reason: err.message };
    }
    if (check.ok === false) {
      refused.push({ question: q._id, reason: check.reason, tests: tests.filter((t) => t.questions.map(String).includes(String(q._id))).map((t) => ({ testId: t._id, title: t.title })) });
    }
  }
  res.json({ figures: qs.length, rekeyed: changed, repeats, refused });
}

// POST /api/question-images/auto-attach (admin)
//
// Gives every checked figure still waiting for a picture its reference
// drawing - the ones made before drawings went on by themselves.
async function autoAttach(req, res) {
  const { attachDrawings } = require("../services/figureImage");
  const ids = await Question.find({ ...awaitingFilter, "visual.figure.answerCheck": "checked" }).distinct("_id");
  const attached = await attachDrawings(ids);
  const left = await Question.countDocuments(awaitingFilter);
  res.json({ message: `${attached} picture(s) drawn and attached; ${left} still need a person`, attached, left });
}

module.exports = { autoAttach, listFigures, getFigure, uploadFigure, removeFigure, serveImage, figureCard, rekeyFigures, MAX_BYTES };
