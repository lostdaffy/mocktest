// UPSSSC PET exam pattern -> the real paper's split (25 Oct 2026, 1st shift).
// See content/upsssc-pet-2026-paper-study.md.
//
//   node content/pet-pattern-2026.js           dry run: prints old and new, writes nothing
//   node content/pet-pattern-2026.js --apply   saves a backup of the old pattern next to this
//                                              file, then writes the new one
//
// Run --apply only once the testTopUp.js cap ("never past the paper's size")
// is deployed: before it, removing a question from an old 100-question mock
// tops up every section that is short under the new split, up to ~124.
//
// It also trims the unfinished draft mock(s) so no section is over its new
// count (Mock #10 holds 50 GK; GK is now 35). Questions stay in the bank;
// drafts are never shown to students.

const path = require("path");
const fs = require("fs");
const SV = path.join(__dirname, "..", "server");
require(path.join(SV, "node_modules", "dotenv")).config({ path: path.join(SV, ".env") });
const mongoose = require(path.join(SV, "node_modules", "mongoose"));
const ExamPattern = require(path.join(SV, "models", "ExamPattern"));
const Test = require(path.join(SV, "models", "Test"));
const Question = require(path.join(SV, "models", "Question"));

const t = (topic, ...subTopics) => ({ topic, subTopics });
const mix = (easy, medium, hard) => ({ easy, medium, hard });

const SECTIONS = [
  {
    subject: "GK", questionCount: 35, sources: [], difficultyMix: mix(40, 45, 15),
    syllabus: [
      t("Ancient India", "foreign travellers and their accounts", "rulers identified from their dates", "Buddhism and Jainism teachings"),
      t("Medieval India", "Ain-i-Akbari and Mughal administration terms", "Bhakti and Sufi saints"),
      t("Modern India", "social reformers and their slogans", "courts and institutions of British India"),
      t("Freedom Movement", "lesser-known role of a known leader", "movements and their other names", "Acts of 1909, 1919 and 1935 and what they created", "flags and symbols of the movement"),
      t("Indian Geography", "physiographic regions and their bounding ranges", "rivers and river terms", "international boundary lines"),
      t("Physical Geography", "atmosphere layers", "landforms and vegetation terms"),
      t("Constitution", "Directive Principles and other articles", "making of the Constitution"),
      t("Parliament & Judiciary", "ex-officio posts and first holders", "district and state administration in Uttar Pradesh"),
      t("Indian Economy", "taxes and GST", "committees behind institutions", "Five-Year Plans and their models", "banking history", "types of deficit"),
      t("Books, Awards & Sports", "books and authors", "Padma and national awards", "important days", "venues of world sports events", "world countries and currencies"),
    ],
  },
  {
    subject: "Current Affairs", questionCount: 10, sources: [], difficultyMix: mix(30, 55, 15),
    syllabus: [
      t("National Affairs", "appointments", "new schemes and digital services", "Indian space missions"),
      t("International Affairs", "joint military exercises", "foreign honours to India's leaders", "world days and their themes", "international space missions"),
      t("Sports News", "winners of ICC and major tournaments"),
      t("Awards & Honours", "new books and their authors", "national awards of the year"),
    ],
  },
  {
    subject: "Science", questionCount: 5, sources: [], difficultyMix: mix(50, 40, 10),
    syllabus: [t("Physics", "laws and their other names", "one-step numerics"), t("Chemistry", "formulas and common names", "mole concept"), t("Biology", "processes in the human body", "plant groups")],
  },
  {
    subject: "Maths", questionCount: 25, sources: [], difficultyMix: mix(35, 50, 15),
    syllabus: [
      t("Data Interpretation", "Tabulation", "Bar Graph", "Pie Chart"),
      t("Algebra", "value from algebraic identities"),
      t("Number System", "number of factors", "nearest perfect square"),
      t("Percentage", "successive change over two years", "population growth"),
      t("Average", "missing value from a given average"),
    ],
  },
  {
    subject: "General Hindi", questionCount: 5, sources: [], difficultyMix: mix(45, 45, 10),
    syllabus: [t("व्याकरण", "वाक्यांश के लिए एक शब्द", "विलोम शब्द", "शुद्ध वर्तनी"), t("संधि", "संधि-विच्छेद"), t("मुहावरे और लोकोक्तियाँ", "मुहावरे का अर्थ")],
  },
  {
    subject: "अपठित गद्यांश", questionCount: 10, sources: [], difficultyMix: mix(50, 40, 10),
    syllabus: [t("अपठित गद्यांश", "मूल्य-आधारित निबंधात्मक गद्यांश (परोपकार, अनुशासन, ईमानदारी, पर्यावरण)", "केंद्रीय भाव", "गद्यांश से मेल खाता कथन")],
  },
  {
    subject: "English", questionCount: 5, sources: [], difficultyMix: mix(50, 40, 10),
    syllabus: [t("Synonyms & Antonyms", "Antonyms"), t("Fill in the Blanks", "conditional verb forms", "modals"), t("Reading Comprehension", "short passage on a person's character")],
  },
  {
    subject: "Reasoning", questionCount: 5, sources: [], difficultyMix: mix(45, 45, 10),
    syllabus: [
      t("Classification", "odd one out by category"),
      t("Coding-Decoding", "sum of letter positions"),
      t("Seating Arrangement", "linear arrangement facing one direction"),
      t("Blood Relation", "family tree with three generations"),
      t("Calendar", "year with the same calendar"),
    ],
  },
];

const EXAM_LEVEL =
  "Preliminary eligibility test for Uttar Pradesh Group B and C posts, 100 questions in fixed blocks: static GK and history/geography/polity/economy (35), current affairs of the last 12-18 months (10), science (5), 20 graph and table interpretation plus 5 elementary maths, Hindi grammar (5), two Hindi unseen passages (10), English (5), reasoning (5). Short one-line factual questions, bilingual Hindi-first. Broad, not deep - except history, which asks the less famous detail.";

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);
  const p = await ExamPattern.findOne({ examType: "UPSSSC_PET" });
  if (!p) throw new Error("No UPSSSC_PET pattern");
  const total = SECTIONS.reduce((n, s) => n + s.questionCount, 0);
  if (total !== 100) throw new Error(`New sections add up to ${total}, not 100`);
  console.log("OLD:", p.sections.map((s) => `${s.subject} ${s.questionCount}`).join(", "));
  console.log("NEW:", SECTIONS.map((s) => `${s.subject} ${s.questionCount}`).join(", "));

  // Drafts that would end up over a section's count.
  const sectionOf = (subject) => SECTIONS.findIndex((s) => s.subject === subject || (s.sources || []).includes(subject));
  const drafts = await Test.find({ examStage: "UPSSSC_PET", type: "full_mock", publishStatus: "draft" });
  const trims = [];
  for (const d of drafts) {
    const qs = await Question.find({ _id: { $in: d.questions } }).select("subject").lean();
    const subj = new Map(qs.map((q) => [String(q._id), q.subject]));
    const seen = SECTIONS.map(() => 0);
    const keep = [];
    for (const id of d.questions) {
      const k = sectionOf(subj.get(String(id)));
      if (k >= 0 && seen[k] >= SECTIONS[k].questionCount) continue;
      if (k >= 0) seen[k]++;
      keep.push(id);
    }
    if (keep.length !== d.questions.length) trims.push({ d, keep });
    console.log(`Draft "${d.title}": ${d.questions.length} -> ${keep.length} questions`);
  }

  if (!apply) {
    console.log("\nDry run - nothing written. Add --apply to write.");
    return mongoose.disconnect();
  }
  const backup = path.join(__dirname, `pet-pattern-backup-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(backup, JSON.stringify(p.toObject(), null, 2));
  console.log("Backup of the old pattern:", backup);
  await ExamPattern.updateOne({ _id: p._id }, { $set: { sections: SECTIONS, examLevel: EXAM_LEVEL } });
  for (const { d, keep } of trims) await Test.updateOne({ _id: d._id }, { $set: { questions: keep } });
  console.log("Pattern written; drafts trimmed:", trims.length);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
