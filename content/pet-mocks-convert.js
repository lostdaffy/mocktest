// Moves the existing UPSSSC PET mocks onto the new pattern (see
// pet-pattern-2026.js): each section is cut down to its new count, the test's
// section rules are rewritten, and a top-up job is queued so the generation
// queue fills the new sections (Current Affairs, Science, 4 chart sets, 2
// passage sets) within the day's allowance - the same refill a removed
// question gets.
//
//   node content/pet-mocks-convert.js           dry run: what each mock keeps and drops
//   node content/pet-mocks-convert.js --apply   writes, after saving every mock's old
//                                               question list next to this file
//
// Questions are only taken out of the mocks, never deleted: a student's past
// result still finds every question it answered.

const path = require("path");
const fs = require("fs");
const SV = path.join(__dirname, "..", "server");
require(path.join(SV, "node_modules", "dotenv")).config({ path: process.env.ENV_FILE || path.join(SV, ".env") });
const mongoose = require(path.join(SV, "node_modules", "mongoose"));
const ExamPattern = require(path.join(SV, "models", "ExamPattern"));
const Test = require(path.join(SV, "models", "Test"));
const Question = require(path.join(SV, "models", "Question"));
const GenerationJob = require(path.join(SV, "models", "GenerationJob"));
const { sectionRulesFrom } = require(path.join(SV, "utils", "marking"));

// Under GK these were static facts filed as "current affairs"; the new paper
// has a real, dated Current Affairs section, so they go first.
const STALE_CA = new Set(["National Affairs", "International Affairs", "Sports News", "Awards & Honours"]);
// Arithmetic the real paper asks; the rest goes before these.
const MATHS_KEEP = new Set(["Number System", "Percentage", "Average", "Algebra", "Simplification"]);

const chapterOf = (q) => q.chapter || q.topic || "";

/** Which questions of one section to drop, to bring it to `target`. */
function dropsFor(sectionSubject, qs, target) {
  const drops = new Set();
  let pool = [...qs];
  if (sectionSubject === "Maths") {
    // Chart sets are rebuilt whole, one per chart type.
    for (const q of pool.filter((q) => q.visual?.kind)) drops.add(String(q._id));
    pool = pool.filter((q) => !q.visual?.kind);
  }
  const excess = () => pool.length - target;
  const take = (q) => {
    drops.add(String(q._id));
    pool = pool.filter((x) => x !== q);
  };
  const preferred = (q) =>
    sectionSubject === "GK" ? STALE_CA.has(chapterOf(q)) : sectionSubject === "Maths" ? !MATHS_KEEP.has(chapterOf(q)) : false;
  // First the ones that should go, then always from the most crowded chapter
  // (newest first), so what stays is spread across the syllabus.
  while (excess() > 0) {
    const first = pool.filter(preferred);
    const from = first.length ? first : pool;
    const counts = {};
    for (const q of from) counts[chapterOf(q)] = (counts[chapterOf(q)] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const victim = from.filter((q) => chapterOf(q) === top).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    take(victim);
  }
  return drops;
}

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  const pattern = await ExamPattern.findOne({ examType: "UPSSSC_PET" }).lean();
  if (!pattern?.sections?.some((s) => s.passageSets?.count)) throw new Error("Run pet-pattern-2026.js --apply first: the PET pattern has no passage sets yet");
  const sectionOf = (subject) => pattern.sections.findIndex((s) => s.subject === subject || (s.sources || []).includes(subject));
  const mocks = await Test.find({ examStage: "UPSSSC_PET", type: "full_mock" }).sort({ seriesNumber: 1 });
  const backup = {};
  const plans = [];
  for (const t of mocks) {
    const qs = await Question.find({ _id: { $in: t.questions } }).select("subject chapter topic visual.kind createdAt").lean();
    const byId = new Map(qs.map((q) => [String(q._id), q]));
    const drops = new Set();
    const lines = [];
    pattern.sections.forEach((sec, k) => {
      const mine = t.questions.map((id) => byId.get(String(id))).filter((q) => q && sectionOf(q.subject) === k);
      // Room is left for the sets the refill writes whole.
      const setRoom = (sec.chartSets?.length || 0) * 5 + (sec.passageSets?.count || 0) * (sec.passageSets?.perPassage || 5);
      const d = dropsFor(sec.subject, mine, Math.max(0, sec.questionCount - setRoom));
      d.forEach((id) => drops.add(id));
      if (d.size || mine.length !== sec.questionCount) lines.push(`${sec.subject} ${mine.length}->${mine.length - d.size}/${sec.questionCount}`);
    });
    const keep = t.questions.filter((id) => byId.has(String(id)) && !drops.has(String(id)));
    backup[String(t._id)] = { title: t.title, questions: t.questions.map(String), sectionRules: t.sectionRules };
    plans.push({ t, keep });
    console.log(`#${t.seriesNumber} (${t.publishStatus}): ${t.questions.length} -> ${keep.length}, to fill ${100 - keep.length} | ${lines.join(", ")}`);
  }
  if (!apply) {
    console.log("\nDry run - nothing written. Add --apply to write.");
    return mongoose.disconnect();
  }
  const file = path.join(__dirname, `pet-mocks-backup-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log("Backup of every mock's old question list:", file);
  for (const { t, keep } of plans) {
    await Test.updateOne({ _id: t._id }, { $set: { questions: keep, sectionRules: sectionRulesFrom(pattern) } });
    const job = { kind: "top_up", testId: t._id, label: `Top up ${t.title} (${keep.length} → 100, new PET pattern)` };
    if (!(await GenerationJob.isAlreadyQueued(job))) await GenerationJob.create({ ...job, status: "queued" });
  }
  console.log(`Trimmed ${plans.length} mocks and queued a top-up for each.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
