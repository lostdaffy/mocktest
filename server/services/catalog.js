/**
 * The one place that answers "which subjects does this mean?".
 *
 * Three different names can point at the same question bank:
 *
 *   the catalog calls it        "Maths"
 *   the Banking paper calls it  "Quant"
 *   a question may be tagged    "Quantitative Aptitude"
 *
 * Every lookup went through its own string comparison before, so a Banking
 * student's Chapter Practice came back empty while the questions sat in the
 * bank the whole time. Everything that resolves a subject name now comes
 * here instead, so that bug has one place to be fixed rather than five.
 */
const Subject = require("../models/Subject");
const ExamPattern = require("../models/ExamPattern");

/** Every subject name a section draws on: its own, plus any extra sources. */
function sectionSubjectNames(section) {
  return [...new Set([section.subject, ...(section.sources || [])].filter(Boolean))];
}

/**
 * Expands subject names to every name their questions might be tagged with.
 *
 * "Quant" -> ["Maths", "Quant", "Quantitative Aptitude"]
 *
 * A name no subject claims is returned as-is. An unknown subject should find
 * nothing rather than throw - an exam pattern naming a subject the catalog
 * has never heard of is a setup mistake to report, not a crash.
 */
async function expandSubjectNames(names) {
  const wanted = [...new Set((Array.isArray(names) ? names : [names]).filter(Boolean))];
  if (!wanted.length) return [];

  const subjects = await Subject.find({
    $or: [{ name: { $in: wanted } }, { aliases: { $in: wanted } }],
  }).lean();

  const out = new Set(wanted);
  for (const subj of subjects) {
    out.add(subj.name);
    (subj.aliases || []).forEach((a) => out.add(a));
  }
  return [...out];
}

/** The catalog subjects a section maps to, aliases resolved. */
async function subjectsForSection(section) {
  return expandSubjectNames(sectionSubjectNames(section));
}

/**
 * The subjects a student actually studies, worked out from the exams they
 * chose at signup.
 *
 * This exists so nobody has to be asked. A student picking "SSC CGL" has
 * already said they study Maths, Reasoning, English and GK - asking them to
 * tick those separately only creates a way to get it wrong, and they did:
 * of the first users, one picked one subject out of four and another picked
 * none at all, leaving their Practice tab empty on a paid account.
 */
async function subjectsForExams(examGoals = []) {
  if (!examGoals.length) return [];
  const patterns = await ExamPattern.find({ examType: { $in: examGoals }, isActive: true }).lean();

  const names = [];
  for (const pattern of patterns) {
    for (const section of pattern.sections || []) names.push(...sectionSubjectNames(section));
  }
  if (!names.length) return [];

  // Return catalog names only - these are shown to a student and used to
  // look subjects up, so "Quant" should come back as "Maths".
  const subjects = await Subject.find({
    $or: [{ name: { $in: names } }, { aliases: { $in: names } }],
    isActive: true,
  })
    .sort({ displayOrder: 1 })
    .lean();

  return subjects.map((s) => s.name);
}

/**
 * The chapters of a subject that belong to at least one of these exams.
 *
 * A chapter with no exams listed belongs to all of them: chapters that
 * existed before this field should keep showing rather than vanish, and an
 * admin who hasn't tagged a new chapter yet should see it, not lose it.
 */
function chaptersForExams(chapters = [], examGoals = []) {
  if (!examGoals.length) return chapters;
  return chapters.filter((ch) => !ch.exams || !ch.exams.length || ch.exams.some((e) => examGoals.includes(e)));
}

module.exports = {
  sectionSubjectNames,
  expandSubjectNames,
  subjectsForSection,
  subjectsForExams,
  chaptersForExams,
};
