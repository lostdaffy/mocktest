// Puts every UPSSSC PET mock's questions back in the pattern's section order
// (GK, Current Affairs, Science, Maths, General Hindi, passages, English,
// Reasoning). The refill adds a section the mock never had at the end of the
// paper; this moves it to its place. Within a section the order is kept, so a
// chart or passage set stays together. Safe to run any time, more than once.
//
//   node content/pet-mocks-reorder.js           dry run
//   node content/pet-mocks-reorder.js --apply

const path = require("path");
const SV = path.join(__dirname, "..", "server");
require(path.join(SV, "node_modules", "dotenv")).config({ path: process.env.ENV_FILE || path.join(SV, ".env") });
const mongoose = require(path.join(SV, "node_modules", "mongoose"));
const ExamPattern = require(path.join(SV, "models", "ExamPattern"));
const Test = require(path.join(SV, "models", "Test"));
const Question = require(path.join(SV, "models", "Question"));

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  const pattern = await ExamPattern.findOne({ examType: "UPSSSC_PET" }).lean();
  const sectionOf = (subject) => {
    const k = pattern.sections.findIndex((s) => s.subject === subject || (s.sources || []).includes(subject));
    return k < 0 ? pattern.sections.length : k;
  };
  const mocks = await Test.find({ examStage: "UPSSSC_PET", type: "full_mock" }).sort({ seriesNumber: 1 });
  for (const t of mocks) {
    const qs = await Question.find({ _id: { $in: t.questions } }).select("subject").lean();
    const subj = new Map(qs.map((q) => [String(q._id), q.subject]));
    const ordered = t.questions.map((id, i) => ({ id, i, k: sectionOf(subj.get(String(id))) })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.id);
    const moved = ordered.some((id, i) => String(id) !== String(t.questions[i]));
    console.log(`#${t.seriesNumber}: ${t.questions.length} questions, ${moved ? "reordered" : "already in order"}`);
    if (apply && moved) await Test.updateOne({ _id: t._id }, { $set: { questions: ordered } });
  }
  if (!apply) console.log("\nDry run - nothing written. Add --apply to write.");
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
