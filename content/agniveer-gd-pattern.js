// Agniveer Army GD (Soldier General Duty) pattern -> the official syllabus.
//
// Source: "Syllabus for Soldier General Duty" (Indian Army, PDF the user
// supplied 2026-10-29). Pattern: General Knowledge 15 (30 marks), General
// Science 20 (40), Maths 15 (30); pass mark 32. Question counts, marks,
// time and negative marking stay as they are - only the syllabus and the
// level note change, so the six live GD mocks are untouched.
//
// What the official list fixes:
//  - Maths includes Algebra (basic operations, factorisation, HCF/LCM,
//    quadratic equations), Geometry (lines and angles, triangles,
//    quadrilaterals, parallelograms, circles) and Mensuration. The old level
//    note said "no algebra", which kept these out.
//  - Mixture & Alligation is not on it; unitary method and partnership are.
//  - GK adds UNO, Indian Armed Forces, terminology, news agencies, religions
//    and languages, important days, plants and animals, who's who.
//  - Science adds medical and scientific terms and research institutes.
//
// Also tags the Geometry chapter for AGNIVEER_GD, so GD students see it in
// Practice (Algebra and Mensuration already carry the tag).
//
//   node content/agniveer-gd-pattern.js           dry run, writes nothing
//   node content/agniveer-gd-pattern.js --apply   writes the syllabus, level note and chapter tag

const path = require("path");
const SV = path.join(__dirname, "..", "server");
require(path.join(SV, "node_modules", "dotenv")).config({ path: path.join(SV, ".env") });
const mongoose = require(path.join(SV, "node_modules", "mongoose"));
const ExamPattern = require(path.join(SV, "models", "ExamPattern"));
const Subject = require(path.join(SV, "models", "Subject"));

const t = (topic, ...subTopics) => ({ topic, subTopics });

const EXAM_LEVEL =
  "Indian Army Agniveer Soldier GD CEE, 10th-pass level; questions stay within the CBSE syllabus. " +
  "General Science is Physics, Chemistry and Biology fundamentals and day-to-day applications, with the human body, " +
  "nutrition, diseases and vitamins, plus medical and scientific terms. Maths is Class 10 arithmetic, basic algebra " +
  "(operations, factorisation, HCF/LCM, quadratic equations), basic geometry and mensuration - no trigonometry, " +
  "calculus or data interpretation. GK is static general knowledge with current affairs. " +
  "2 marks per question, 0.5 mark deducted for a wrong answer.";

const SYLLABUS = {
  GK: [
    t("Ancient India", "landmarks of Indian history", "important dates"),
    t("Medieval India", "important battles and dates"),
    t("Modern India", "important dates and battles of world history"),
    t("Freedom Movement", "national movement"),
    t("Constitution", "the Constitution of India"),
    t("Parliament & Judiciary", "Parliament and courts"),
    t("Physical Geography", "solar system and space exploration", "principal peaks, deserts, rivers, lakes and waterfalls", "tallest, biggest and longest", "continents and sub-continents", "environment"),
    t("Indian Geography", "Indian towns, states and UTs", "religious communities and principal languages"),
    t("Indian Economy", "economic terminology"),
    t("Books, Awards & Sports", "abbreviations", "sports, national and international", "national awards, gallantry awards and Nobel Prizes", "books and authors", "national and international days", "inventions and discoveries", "UNO and international organisations", "Indian Armed Forces", "institutions, research and space stations", "festivals of India and the world", "news agencies and dailies", "geographical, astronomical and legal terms", "the world of plants and animals"),
    t("National Affairs", "current affairs and who's who"),
    t("International Affairs", "international current affairs"),
    t("Sports News", "sports current affairs"),
    t("Awards & Honours", "recent awards and honours"),
  ],
  Science: [
    t("Physics", "fundamentals and day-to-day applications", "scientific terms"),
    t("Chemistry", "fundamentals and day-to-day applications", "scientific terms"),
    t("Biology", "human body", "food and nutrition", "diseases and prevention", "vitamins and their uses", "medical terms", "scientific and research institutes in India"),
  ],
  Maths: [
    t("Number System", "numbers"),
    t("HCF & LCM", "HCF and LCM"),
    t("Simplification", "decimal fractions", "square roots"),
    t("Percentage", "percentage"),
    t("Average", "average"),
    t("Ratio & Proportion", "ratio and proportion", "unitary method"),
    t("Partnership", "partnership"),
    t("Profit & Loss", "profit and loss"),
    t("Time & Work", "time and work"),
    t("Time, Speed & Distance", "time and distance"),
    t("Simple & Compound Interest", "simple interest"),
    t("Algebra", "basic operations and factorisation", "HCF and LCM of expressions", "quadratic equations"),
    t("Geometry", "lines and angles", "triangles", "quadrilaterals and parallelograms", "circles"),
    t("Mensuration 2D & 3D", "area and perimeter of squares, rectangles, parallelograms and circles", "volume and surface area of cube, cuboid, cone, cylinder and sphere"),
  ],
};

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const p = await ExamPattern.findOne({ examType: "AGNIVEER_GD" });
  if (!p) throw new Error("AGNIVEER_GD pattern not found");
  console.log(`${p.displayName}: ${p.sections.map((s) => `${s.subject} ${s.questionCount}`).join(", ")} (unchanged)`);
  for (const s of p.sections) {
    const next = SYLLABUS[s.subject];
    if (!next) { console.log(`  ${s.subject}: no official list here - left as is`); continue; }
    const before = s.syllabus.map((x) => x.topic), after = next.map((x) => x.topic);
    console.log(`  ${s.subject}: +[${after.filter((x) => !before.includes(x)).join(", ")}] -[${before.filter((x) => !after.includes(x)).join(", ")}]`);
    s.syllabus = next;
  }
  console.log(`  level note: "${(p.examLevel || "").slice(0, 80)}..." -> new`);
  p.examLevel = EXAM_LEVEL;

  const maths = await Subject.findOne({ name: "Maths" });
  const geo = maths.chapters.find((c) => c.name === "Geometry");
  const needTag = geo && !(geo.exams || []).includes("AGNIVEER_GD");
  console.log(needTag ? "  Geometry chapter: add AGNIVEER_GD tag" : "  Geometry chapter: tag already there");

  if (!apply) { console.log("\nDry run - nothing written. Add --apply to write it."); process.exit(0); }
  await p.save();
  if (needTag) await Subject.updateOne({ name: "Maths", "chapters.name": "Geometry" }, { $addToSet: { "chapters.$.exams": "AGNIVEER_GD" } });
  console.log("Saved.");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
