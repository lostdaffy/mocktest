const Subject = require("../models/Subject");

// The chart and figure chapters each section of an exam's paper carries -
// those its syllabus names. A mock gets one set of each: a chart with five
// questions, or three figure questions. Shared by the mock builder and by the
// refill that repairs a mock, so a repaired mock keeps its figures.
async function visualChaptersFor(pattern, syllabusOf) {
  const subjects = await Subject.find({ isActive: true, "chapters.visual": { $in: ["chart", "figure"] } }).lean();
  return pattern.sections.map((section) => {
    const names = new Set(
      (syllabusOf(section) || []).map((t) => String(typeof t === "string" ? t : t?.topic || "").trim().toLowerCase()).filter(Boolean)
    );
    if (!names.size) return [];
    const inSection = [section.subject, ...(section.sources || [])].map((s) => s.toLowerCase());
    const out = [];
    for (const subj of subjects) {
      const subjNames = [subj.name, ...(subj.aliases || [])].map((s) => s.toLowerCase());
      if (!subjNames.some((n) => inSection.includes(n))) continue;
      for (const ch of subj.chapters || []) {
        if (!ch.visual) continue;
        const keys = [ch.name, ...(ch.topics || [])].map((t) => t.toLowerCase());
        if (keys.some((t) => names.has(t))) {
          out.push({ kind: ch.visual, subject: subj.name, chapter: ch.name, topics: ch.topics?.length ? ch.topics : [ch.name] });
        }
      }
    }
    return out.slice(0, 2);
  });
}

module.exports = { visualChaptersFor };
