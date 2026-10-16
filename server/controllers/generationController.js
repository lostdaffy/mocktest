const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");
const { findGaps, coverage } = require("../services/generationGaps");
const { GEMINI_MODELS, currentModel } = require("../services/geminiService");
const { nextAllowanceReset } = require("../utils/aiAllowance");

// GET /api/generation/status (admin)
//
// Everything the panel needs in one call: how much is done, what is running,
// what failed and why, and whether the queue has stopped itself.
async function queueStatus(req, res) {
  const [counts, current, recentFailures, state, cover] = await Promise.all([
    GenerationJob.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    GenerationJob.findOne({ status: "running" }).select("label kind startedAt attempts").lean(),
    GenerationJob.find({ status: "failed" }).sort({ finishedAt: -1 }).limit(20).select("label lastError attempts finishedAt").lean(),
    QueueState.get(),
    coverage(),
  ]);

  const by = { queued: 0, running: 0, done: 0, failed: 0, cancelled: 0 };
  counts.forEach((c) => (by[c._id] = c.n));
  const total = by.queued + by.running + by.done + by.failed;

  // What is waiting, in the order it will be built, so the panel can say
  // "4 waiting: SSC MTS mock, SSC CHSL mock..." rather than just "4".
  const waiting = await GenerationJob.find({ status: "queued" })
    .sort({ queuedAt: 1 })
    .limit(12)
    .select("label kind queuedAt")
    .lean();

  const recentDone = await GenerationJob.find({ status: "done" })
    .sort({ finishedAt: -1 })
    .limit(8)
    .select("label result finishedAt")
    .lean();

  res.json({
    counts: by,
    total,
    // What a progress bar needs, without the panel having to work it out.
    percentDone: total ? Math.round(((by.done + by.failed) / total) * 100) : 0,
    current,
    recentDone,
    recentFailures,
    paused: state.paused,
    pausedReason: state.pausedReason,
    pausedBy: state.pausedBy,
    pausedAt: state.pausedAt,
    // The earliest a Resume will do anything, for a queue stopped by the
    // allowance; null otherwise. The queue never starts itself.
    resumableAfter: state.paused && state.pausedBy === "worker" ? state.resumableAfter || null : null,
    nextAllowanceReset: nextAllowanceReset(),
    serverTime: new Date(),
    waiting,
    coverage: cover,
    ai: { models: GEMINI_MODELS, inUse: currentModel() },
  });
}

// GET /api/generation/activity?since=ISO (admin)
//
// What every admin page polls: the job being built, everything waiting (in
// order, with what it is for - subject, chapter, subtopic, level, test,
// exam), and every job that finished since `since`, so the panel can say
// "Built: ..." or "Failed: ... because ..." wherever the admin happens to be.
// Small on purpose: no coverage counts, no gap search.
async function activity(req, res) {
  const since = req.query.since && !Number.isNaN(Date.parse(req.query.since)) ? new Date(req.query.since) : new Date(Date.now() - 60 * 1000);
  // Read before the queries: a job finishing while they run is then
  // reported on the next poll instead of falling between two.
  const serverTime = new Date();
  const fields = "label kind status subject chapter subtopic difficulty examType vacancy testId quizDate startedAt queuedAt finishedAt result lastError attempts";
  const [running, waiting, finished, state] = await Promise.all([
    GenerationJob.findOne({ status: "running" }).select(fields).populate("testId", "title subject topic").lean(),
    GenerationJob.find({ status: "queued" }).sort({ queuedAt: 1 }).limit(200).select(fields).populate("testId", "title subject topic").lean(),
    GenerationJob.find({ status: { $in: ["done", "failed"] }, finishedAt: { $gt: since } })
      .sort({ finishedAt: 1 })
      .limit(50)
      .select(fields)
      .populate("testId", "title subject topic")
      .lean(),
    QueueState.get(),
  ]);
  // A top-up names its test; give it the test's subject and chapter so a
  // page can tell which of its own tests is being worked on.
  const shape = (j) =>
    j && {
      ...j,
      testId: j.testId?._id || j.testId || null,
      testTitle: j.testId?.title || null,
      subject: j.subject || j.testId?.subject || null,
      chapter: j.chapter || j.testId?.topic || null,
    };
  res.json({
    serverTime,
    running: shape(running),
    waiting: waiting.map(shape),
    finished: finished.map(shape),
    paused: state.paused,
    pausedReason: state.pausedReason || "",
    resumableAfter: state.paused && state.pausedBy === "worker" ? state.resumableAfter || null : null,
  });
}

// GET /api/generation/gaps (admin) -> what the catalog is still missing
async function listGaps(req, res) {
  const excludeSubjects = String(req.query.exclude || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const mocksPerExam = Math.min(Math.max(Number(req.query.mocksPerExam) || 1, 0), 5);

  const gaps = await findGaps({ excludeSubjects, mocksPerExam });
  res.json({
    practice: gaps.practice,
    mocks: gaps.mocks,
    short: gaps.short,
    totals: { practice: gaps.practice.length, mocks: gaps.mocks.length, short: gaps.short.length },
  });
}

// POST /api/generation/enqueue (admin)
//
// Queues everything that is missing. The admin should not have to name 113
// chapter-and-level pairs; the system already knows which exist.
async function enqueue(req, res) {
  const { practice = true, mocks = false, exclude = [], mocksPerExam = 1, limit, exams } = req.body || {};
  // exams: only these exams' mocks (e.g. ["SUPER_TET"]); all exams when absent.
  const onlyExams = Array.isArray(exams) && exams.length ? new Set(exams.map(String)) : null;

  const gaps = await findGaps({
    excludeSubjects: Array.isArray(exclude) ? exclude : String(exclude).split(",").map((s) => s.trim()).filter(Boolean),
    mocksPerExam: Math.min(Math.max(Number(mocksPerExam) || 1, 0), 10),
  });

  let wanted = [];
  if (practice) wanted.push(...gaps.practice);
  if (mocks) {
    // Every missing mock of an exam is the same job ({ kind, examType }), so
    // the duplicate check below let only ONE through - "5 per exam" queued
    // one. Mocks already waiting are counted off instead, per exam.
    const byExam = new Map();
    for (const m of gaps.mocks) {
      if (onlyExams && !onlyExams.has(m.examType)) continue;
      if (!byExam.has(m.examType)) byExam.set(m.examType, []);
      byExam.get(m.examType).push(m);
    }
    for (const [examType, list] of byExam) {
      const waiting = await GenerationJob.countDocuments({ kind: "mock", examType, vacancy: null, status: { $in: ["queued", "running"] } });
      wanted.push(...list.slice(waiting).map((m) => ({ ...m, repeatable: true })));
    }
  }
  if (limit) wanted = wanted.slice(0, Math.max(1, Number(limit)));

  if (!wanted.length) {
    return res.json({ message: "Nothing is missing - the catalog is complete", queued: 0 });
  }

  const batch = new Date().toISOString();
  let queued = 0;
  let alreadyThere = 0;

  for (const { repeatable, ...job } of wanted) {
    // Two presses of the button leave one job per gap, not two. (Mocks were
    // counted off per exam above.)
    if (!repeatable && (await GenerationJob.isAlreadyQueued(job))) {
      alreadyThere++;
      continue;
    }
    await GenerationJob.create({ ...job, batch, status: "queued" });
    queued++;
  }

  // Queueing work implies wanting it done: an admin who presses this after a
  // pause should not have to press resume as well.
  await QueueState.updateOne(
    { key: "generation" },
    { $set: { paused: false, pausedReason: "", pausedBy: "admin" }, $unset: { resumableAfter: "", resumeAfter: "" } }
  );

  res.status(201).json({
    message:
      `${queued} queued` +
      (alreadyThere ? `, ${alreadyThere} were already waiting` : "") +
      ". The queue runs one at a time and keeps going if you close this page.",
    queued,
    alreadyThere,
    batch,
  });
}

// Puts the queue back to work after an admin added to it; queueing work
// implies wanting it done.
async function unpause() {
  await QueueState.updateOne(
    { key: "generation" },
    { $set: { paused: false, pausedReason: "", pausedBy: "admin" }, $unset: { resumableAfter: "", resumeAfter: "" } }
  );
}

// POST /api/generation/enqueue-short (admin)
//
// One job per practice test holding fewer than PRACTICE_TEST_SIZE questions -
// mostly the tests built when a test was 12 - to fill it up. A published test
// stays live while it fills; the new questions pass the same gate as any
// other and are checked against what its chapter already asks.
async function enqueueShort(req, res) {
  // { testId } tops up that one test; without it, every short one.
  const all = (await findGaps()).short;
  const short = req.body?.testId ? all.filter((t) => String(t.testId) === String(req.body.testId)) : all;
  if (!short.length) {
    return res.json({ message: req.body?.testId ? "That test is already full" : "Every practice test is full", queued: 0 });
  }

  // A few at a time, by default ten: there were 329 short tests when this
  // shipped, and queueing them all in one press would spend days of AI
  // allowance with nobody looking at what came out.
  const limit = Math.max(1, Math.min(Number(req.body?.limit) || 10, 50));
  // Live tests first - students are using those - then the fullest: a test
  // at 12 needs 8, one at 2 needs 18, so the cheap ones are done first.
  const wanted = [...short]
    .sort((a, b) => Number(b.published) - Number(a.published) || b.have - a.have)
    .slice(0, limit);

  const batch = new Date().toISOString();
  let queued = 0;
  let alreadyThere = 0;
  for (const t of wanted) {
    const job = { kind: "top_up", testId: t.testId, label: `Top up ${t.title} (${t.have} → ${t.of})` };
    if (await GenerationJob.isAlreadyQueued(job)) {
      alreadyThere++;
      continue;
    }
    await GenerationJob.create({ ...job, batch, status: "queued" });
    queued++;
  }
  // Waiting out the day's allowance, a resume would only stop again at once:
  // the work joins the line and starts when the queue is resumed.
  const state = await QueueState.findOne({ key: "generation" }).lean();
  const waitingForAllowance = state?.paused && state.resumableAfter && new Date(state.resumableAfter) > new Date();
  if (queued && !waitingForAllowance) await unpause();

  res.status(201).json({
    message:
      `${queued} test(s) queued to be topped up` +
      (alreadyThere ? `, ${alreadyThere} were already waiting` : "") +
      (short.length > wanted.length ? `. ${short.length - wanted.length} more are short` : "") +
      (queued && waitingForAllowance ? ". They start when the queue is resumed after the allowance resets" : "") +
      ". Follow it on the Generation page.",
    queued,
    alreadyThere,
    short: short.length,
  });
}

// POST /api/generation/enqueue-practice (admin)
// body: { subject, chapter, subtopic?, difficulty }
//
// One practice test, built in the queue rather than while the admin waits:
// twenty questions in two batches is longer than a page should hang for.
async function enqueuePractice(req, res) {
  const { subject, chapter, difficulty } = req.body || {};
  const subtopic = String(req.body?.subtopic || "").trim() || undefined;
  if (!subject || !chapter || !["easy", "medium", "hard", "advanced"].includes(difficulty)) {
    return res.status(400).json({ message: "subject, chapter and difficulty are required" });
  }
  if (subtopic) {
    const Subject = require("../models/Subject");
    const subjectDoc = await Subject.findOne({ $or: [{ name: subject }, { aliases: subject }] }).lean();
    const topics = (subjectDoc?.chapters || []).find((c) => c.name === chapter)?.topics || [];
    if (!topics.includes(subtopic)) {
      return res.status(400).json({ message: `"${subtopic}" is not one of the topics of ${chapter}. Add it to the chapter in Subjects first.` });
    }
  }

  const job = {
    kind: "practice",
    subject,
    chapter,
    subtopic,
    difficulty,
    label: `${subject} · ${chapter}${subtopic ? ` · ${subtopic}` : ""} · ${difficulty}`,
  };
  if (await GenerationJob.isAlreadyQueued(job)) {
    return res.json({ message: "That test is already waiting in the queue", queued: 0 });
  }
  await GenerationJob.create({ ...job, batch: new Date().toISOString(), status: "queued" });
  await unpause();

  const ahead = await GenerationJob.countDocuments({ status: { $in: ["queued", "running"] } });
  res.status(201).json({
    message: `Queued${ahead > 1 ? ` (${ahead - 1} ahead of it)` : ""}. It shows up here as a draft when it is built.`,
    queued: 1,
  });
}

// POST /api/generation/pause and /resume (admin)
async function pause(req, res) {
  await QueueState.updateOne(
    { key: "generation" },
    { $set: { paused: true, pausedBy: "admin", pausedAt: new Date(), pausedReason: "Paused by the admin" }, $unset: { resumableAfter: "", resumeAfter: "" } }
  );
  const waiting = await GenerationJob.countDocuments({ status: "queued" });
  res.json({ message: `Paused. ${waiting} job(s) are still waiting and will carry on when you resume.`, paused: true });
}

async function resume(req, res) {
  await QueueState.updateOne(
    { key: "generation" },
    { $set: { paused: false, pausedReason: "", pausedBy: "admin" }, $unset: { resumableAfter: "", resumeAfter: "" } }
  );
  const waiting = await GenerationJob.countDocuments({ status: "queued" });
  res.json({ message: waiting ? `Resumed - ${waiting} job(s) to go.` : "Resumed. Nothing is waiting.", paused: false });
}

// POST /api/generation/retry-failed (admin)
async function retryFailed(req, res) {
  const r = await GenerationJob.updateMany(
    { status: "failed" },
    { $set: { status: "queued", attempts: 0, lastError: "", startedAt: null, finishedAt: null } }
  );
  await QueueState.updateOne({ key: "generation" }, { $set: { paused: false, pausedReason: "" }, $unset: { resumableAfter: "", resumeAfter: "" } });
  res.json({ message: `${r.modifiedCount} failed job(s) put back in the queue.`, requeued: r.modifiedCount });
}

// DELETE /api/generation/history (admin) -> clears finished rows, keeps work
async function clearHistory(req, res) {
  const r = await GenerationJob.deleteMany({ status: { $in: ["done", "cancelled"] } });
  res.json({ message: `${r.deletedCount} finished job(s) cleared.`, cleared: r.deletedCount });
}

// DELETE /api/generation/queue (admin) -> drops what has not started yet
async function cancelQueued(req, res) {
  const r = await GenerationJob.updateMany({ status: "queued" }, { $set: { status: "cancelled", finishedAt: new Date() } });
  res.json({ message: `${r.modifiedCount} waiting job(s) cancelled. Anything already built is untouched.`, cancelled: r.modifiedCount });
}

// POST /api/generation/prioritize { examType } (admin)
// Everything waiting for one exam - its mocks, and top-ups of its tests -
// moves to the front of the queue. Changes nothing about what is built.
async function prioritize(req, res) {
  const examType = String(req.body?.examType || "").trim();
  if (!examType) return res.status(400).json({ message: "Which exam? Send examType." });
  const Test = require("../models/Test");
  const tests = await Test.find({ $or: [{ examStage: examType }, { examType }] }).distinct("_id");
  const r = await GenerationJob.updateMany(
    { status: "queued", $or: [{ examType }, { testId: { $in: tests } }] },
    { $set: { priority: 10 } }
  );
  res.json({ message: `${r.modifiedCount} waiting job(s) for ${examType} moved to the front`, moved: r.modifiedCount });
}

module.exports = {
  prioritize, queueStatus, activity, listGaps, enqueue, enqueueShort, enqueuePractice, pause, resume, retryFailed, clearHistory, cancelQueued };
