const Vacancy = require("../models/Vacancy");
const Test = require("../models/Test");
const ExamPattern = require("../models/ExamPattern");
const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");
const User = require("../models/User");
const { showsVisuals } = require("../utils/appVersion");

// Recruitment notices and their mock series. See models/Vacancy.js.

const STATUSES = ["upcoming", "previous", "hidden"];

// What the admin may set. The syllabus arrives as the panel edits it:
// [{ subject, topics: [{ topic, subTopics: [] }] }], or topics as plain
// strings, which are taken as topics without sub-topics.
function clean(body = {}) {
  const out = {};
  for (const k of ["name", "seriesName", "notificationUrl", "notes", "examType"]) {
    if (body[k] !== undefined) out[k] = String(body[k] || "").trim();
  }
  if (body.year !== undefined) out.year = Number(body.year);
  if (body.displayOrder !== undefined) out.displayOrder = Number(body.displayOrder) || 0;
  if (body.status !== undefined) out.status = body.status;
  if (body.examDate !== undefined) out.examDate = body.examDate ? new Date(body.examDate) : null;
  if (body.syllabus !== undefined) {
    out.syllabus = (Array.isArray(body.syllabus) ? body.syllabus : [])
      .map((s) => ({
        subject: String(s?.subject || "").trim(),
        topics: (s?.topics || [])
          .map((t) =>
            typeof t === "string"
              ? { topic: t.trim(), subTopics: [] }
              : { topic: String(t?.topic || "").trim(), subTopics: (t?.subTopics || []).map((x) => String(x).trim()).filter(Boolean) }
          )
          .filter((t) => t.topic),
      }))
      .filter((s) => s.subject && s.topics.length);
  }
  return out;
}

async function problemsWith(v) {
  const problems = [];
  if (!v.name) problems.push("a name");
  if (!v.seriesName) problems.push("a series name");
  if (!(v.year >= 2000 && v.year <= 2100)) problems.push("a year");
  if (v.status && !STATUSES.includes(v.status)) problems.push("a valid status");
  if (v.notificationUrl && !/^https?:\/\//i.test(v.notificationUrl)) problems.push("a notification link starting with http");
  if (v.examDate && Number.isNaN(new Date(v.examDate).getTime())) problems.push("a valid exam date");
  const pattern = v.examType ? await ExamPattern.findOne({ examType: v.examType }).lean() : null;
  if (!pattern) problems.push("an exam pattern that exists");
  else if (v.syllabus?.length) {
    const sections = pattern.sections.map((s) => s.subject.toLowerCase());
    const stray = v.syllabus.filter((s) => !sections.includes(s.subject.toLowerCase())).map((s) => s.subject);
    if (stray.length) problems.push(`syllabus sections that are in the ${pattern.displayName} paper (not ${stray.join(", ")})`);
  }
  return problems;
}

// GET /api/vacancies (admin) -> every vacancy, with its mocks counted
async function listVacancies(req, res) {
  const [vacancies, counts, patterns] = await Promise.all([
    Vacancy.find({}).sort({ status: 1, displayOrder: 1, year: -1 }).lean(),
    Test.aggregate([
      { $match: { type: "full_mock", vacancy: { $ne: null } } },
      { $group: { _id: { v: "$vacancy", s: "$publishStatus" }, n: { $sum: 1 } } },
    ]),
    ExamPattern.find({}).select("examType displayName sections.subject sections.questionCount").lean(),
  ]);
  const count = new Map(counts.map((c) => [`${c._id.v}|${c._id.s}`, c.n]));
  const queued = await GenerationJob.find({ kind: "mock", vacancy: { $ne: null }, status: { $in: ["queued", "running"] } })
    .select("vacancy status")
    .lean();
  res.json({
    vacancies: vacancies.map((v) => ({
      ...v,
      mocks: {
        published: count.get(`${v._id}|published`) || 0,
        draft: count.get(`${v._id}|draft`) || 0,
        building: queued.filter((j) => String(j.vacancy) === String(v._id)).length,
      },
    })),
    patterns: patterns.map((p) => ({ examType: p.examType, displayName: p.displayName, sections: p.sections.map((s) => s.subject) })),
  });
}

// POST /api/vacancies (admin)
async function createVacancy(req, res) {
  const data = clean(req.body);
  const problems = await problemsWith(data);
  if (problems.length) return res.status(400).json({ message: `A vacancy needs ${problems.join(", ")}.` });
  const vacancy = await Vacancy.create(data);
  res.status(201).json({ message: "Vacancy added", vacancy });
}

// PATCH /api/vacancies/:id (admin)
async function updateVacancy(req, res) {
  const vacancy = await Vacancy.findById(req.params.id);
  if (!vacancy) return res.status(404).json({ message: "Vacancy not found" });
  const data = clean(req.body);
  if (data.examType && data.examType !== vacancy.examType) {
    const built = await Test.exists({ vacancy: vacancy._id });
    if (built) return res.status(400).json({ message: "Mocks are already built for this vacancy, so its exam cannot change." });
  }
  const merged = { ...vacancy.toObject(), ...data };
  const problems = await problemsWith(merged);
  if (problems.length) return res.status(400).json({ message: `A vacancy needs ${problems.join(", ")}.` });
  Object.assign(vacancy, data);
  await vacancy.save();
  res.json({ message: "Vacancy saved", vacancy });
}

// DELETE /api/vacancies/:id (admin) - only while nothing is built for it
async function deleteVacancy(req, res) {
  const vacancy = await Vacancy.findById(req.params.id);
  if (!vacancy) return res.status(404).json({ message: "Vacancy not found" });
  const mocks = await Test.countDocuments({ vacancy: vacancy._id });
  if (mocks) {
    return res.status(400).json({ message: `${mocks} mock(s) belong to this vacancy. Set it to Hidden instead, or delete its mocks first.` });
  }
  await GenerationJob.updateMany({ vacancy: vacancy._id, status: "queued" }, { $set: { status: "cancelled", finishedAt: new Date() } });
  await vacancy.deleteOne();
  res.json({ message: "Vacancy deleted" });
}

// POST /api/vacancies/:id/build-mock (admin) { count? }
//
// Queues mocks for this vacancy's series on the Generation page. The admin
// presses it; nothing is generated on its own.
async function queueVacancyMock(req, res) {
  const vacancy = await Vacancy.findById(req.params.id).lean();
  if (!vacancy) return res.status(404).json({ message: "Vacancy not found" });
  const pattern = await ExamPattern.findOne({ examType: vacancy.examType, isActive: true }).lean();
  if (!pattern) return res.status(400).json({ message: `The ${vacancy.examType} exam pattern is missing or switched off.` });

  const count = Math.min(Math.max(Number(req.body?.count) || 1, 1), 5);
  const batch = new Date().toISOString();
  const already = await GenerationJob.countDocuments({ kind: "mock", vacancy: vacancy._id, status: { $in: ["queued", "running"] } });
  // The builder finishes an unfinished draft before starting another, so one
  // job per mock wanted, on top of any already waiting.
  for (let i = 0; i < count; i++) {
    await GenerationJob.create({
      kind: "mock",
      examType: vacancy.examType,
      vacancy: vacancy._id,
      label: `${vacancy.seriesName} · mock`,
      batch,
      status: "queued",
    });
  }
  await QueueState.updateOne(
    { key: "generation" },
    { $set: { paused: false, pausedReason: "", pausedBy: "admin" }, $unset: { resumableAfter: "", resumeAfter: "" } }
  );
  res.status(201).json({
    message: `${count} mock(s) queued for ${vacancy.seriesName}${already ? ` (${already} already waiting)` : ""}. They arrive on the Exam Mocks page as drafts to review.`,
    queued: count,
  });
}

// Numbers a series' mocks 1, 2, 3... in their existing order (series number,
// then age) and names each "<series name> - Mock #n". A series that starts
// at "Mock #2", or skips a number, reads as if something is missing.
async function renumberSeries(vacancy) {
  const mocks = await Test.find({ type: "full_mock", vacancy: vacancy._id }).select("title seriesNumber createdAt").lean();
  mocks.sort((a, b) => (a.seriesNumber || 0) - (b.seriesNumber || 0) || new Date(a.createdAt) - new Date(b.createdAt));
  const renamed = [];
  for (let i = 0; i < mocks.length; i++) {
    const title = `${vacancy.seriesName} - Mock #${i + 1}`;
    if (mocks[i].seriesNumber === i + 1 && mocks[i].title === title) continue;
    await Test.updateOne({ _id: mocks[i]._id }, { $set: { seriesNumber: i + 1, title } });
    renamed.push({ from: mocks[i].title, to: title });
  }
  return renamed;
}

// POST /api/vacancies/:id/adopt-mocks (admin)
//
// Brings the exam's existing general mocks (built before vacancies existed)
// into this vacancy's series, keeping their questions and status, and
// numbers the series from #1.
async function adoptMocks(req, res) {
  const vacancy = await Vacancy.findById(req.params.id).lean();
  if (!vacancy) return res.status(404).json({ message: "Vacancy not found" });
  const mocks = await Test.find({ type: "full_mock", examStage: vacancy.examType, vacancy: null }).select("_id").lean();
  if (!mocks.length) return res.json({ message: "This exam has no mocks outside a series", adopted: 0 });

  // After the series' own mocks, in their old order.
  const last = await Test.findOne({ type: "full_mock", vacancy: vacancy._id }).sort({ seriesNumber: -1 }).select("seriesNumber").lean();
  const ordered = await Test.find({ _id: { $in: mocks.map((m) => m._id) } }).sort({ seriesNumber: 1, createdAt: 1 }).select("_id").lean();
  let n = last?.seriesNumber || 0;
  for (const m of ordered) await Test.updateOne({ _id: m._id }, { $set: { vacancy: vacancy._id, seriesNumber: ++n } });

  const renamed = await renumberSeries(vacancy);
  res.json({ message: `${mocks.length} mock(s) moved into ${vacancy.seriesName}`, adopted: mocks.length, renamed });
}

// POST /api/vacancies/:id/renumber (admin) -> Mock #1, #2, #3 again
async function renumberMocks(req, res) {
  const vacancy = await Vacancy.findById(req.params.id).lean();
  if (!vacancy) return res.status(404).json({ message: "Vacancy not found" });
  const renamed = await renumberSeries(vacancy);
  res.json({ message: renamed.length ? `${renamed.length} mock(s) renumbered` : "Already numbered 1, 2, 3...", renamed });
}

// GET /api/vacancies/:id/mocks (admin)
async function vacancyMocks(req, res) {
  const tests = await Test.aggregate([
    { $match: { vacancy: new (require("mongoose").Types.ObjectId)(req.params.id), type: "full_mock" } },
    { $addFields: { questionCount: { $size: { $ifNull: ["$questions", []] } } } },
    { $project: { questions: 0 } },
    { $sort: { seriesNumber: 1 } },
  ]);
  res.json({ tests });
}

// GET /api/vacancies/series (student)
//
// The Mock Tests screen: "Upcoming exam mock series" first, then "Previous
// exam mock series", each vacancy with its published mocks. Limited to the
// student's own exams when they have chosen any; ?all=1 shows every exam.
async function seriesForStudent(req, res) {
  const user = await User.findById(req.user._id).select("examGoals").lean();
  const goals = user?.examGoals || [];
  const filter = { status: { $in: ["upcoming", "previous"] } };
  if (goals.length && req.query.all !== "1") filter.examType = { $in: goals };

  const vacancies = await Vacancy.find(filter).sort({ displayOrder: 1, year: -1, createdAt: -1 }).lean();
  const testFilter = {
    type: "full_mock",
    vacancy: { $in: vacancies.map((v) => v._id) },
    publishStatus: "published",
    liveExclusive: { $ne: true },
  };
  // An app before 1.2.0 cannot show charts or figures.
  if (!showsVisuals(req)) testFilter.hasVisuals = { $ne: true };
  const tests = await Test.find(testFilter).sort({ seriesNumber: 1 }).select("-questions");
  const { withAttemptStatus } = require("./testController");
  const withStatus = await withAttemptStatus(tests, req.user._id);

  const patterns = await ExamPattern.find({ examType: { $in: [...new Set(vacancies.map((v) => v.examType))] } })
    .select("examType displayName")
    .lean();
  const nameOf = new Map(patterns.map((p) => [p.examType, p.displayName]));

  const card = (v) => ({
    _id: v._id,
    name: v.name,
    year: v.year,
    seriesName: v.seriesName,
    examType: v.examType,
    examName: nameOf.get(v.examType) || v.examType,
    status: v.status,
    examDate: v.examDate || null,
    notificationUrl: v.notificationUrl || null,
    notes: v.notes || null,
    tests: withStatus.filter((t) => String(t.vacancy) === String(v._id)),
  });

  res.json({
    upcoming: vacancies.filter((v) => v.status === "upcoming").map(card),
    previous: vacancies.filter((v) => v.status === "previous").map(card),
  });
}

module.exports = {
  listVacancies,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  queueVacancyMock,
  adoptMocks,
  renumberMocks,
  vacancyMocks,
  seriesForStudent,
};
