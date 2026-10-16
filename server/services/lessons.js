// The AI learning from its own mistakes.
//
// Every question the checks throw out, the admin rejects, or the students'
// answers expose is recorded with the reason. Once a day those reasons are
// read back, subject by subject, and turned into a short list of general
// lessons ("never give a ratio when the question asks for a percent") that
// goes into every later generation prompt for that subject - the
// "MISTAKES FOUND IN EARLIER BATCHES" list, kept up to date by itself.
//
// Stored as a ReferenceGuide of kind "lessons", so the admin sees it on the
// AI References page, can read it, edit it or switch it off.

const ReferenceGuide = require("../models/ReferenceGuide");
const RejectedQuestion = require("../models/RejectedQuestion");
const Question = require("../models/Question");

const WINDOW_DAYS = 14;
const MIN_MISTAKES = 5;
// Repeats and copies are the bank doing its job, not the model writing badly.
const NOT_A_LESSON = ["duplicate", "reworded", "reference_copy", "in_paper"];

async function mistakesBySubject(since) {
  const rejected = await RejectedQuestion.find({ createdAt: { $gte: since }, reason: { $nin: NOT_A_LESSON } })
    .select("text subject reason detail")
    .sort({ createdAt: -1 })
    .limit(600)
    .lean();
  const removed = await Question.find({ status: "rejected", updatedAt: { $gte: since }, flagReason: { $exists: true } })
    .select("text subject flagReason")
    .sort({ updatedAt: -1 })
    .limit(300)
    .lean();
  const by = new Map();
  const add = (subject, text, why) => {
    const s = String(subject || "").trim();
    if (!s || !why) return;
    if (!by.has(s)) by.set(s, []);
    by.get(s).push(`${String(text || "").slice(0, 160)} => ${String(why).slice(0, 200)}`);
  };
  for (const r of rejected) add(r.subject, r.text, `${r.reason}${r.detail ? `: ${r.detail}` : ""}`);
  for (const q of removed) add(q.subject, q.text, q.flagReason);
  return by;
}

function lessonsPrompt(subject, items) {
  return `These are questions for "${subject}" (Indian competitive exams) that were thrown out in the last two weeks, each with the reason:

${items.slice(0, 120).map((x, i) => `${i + 1}. ${x}`).join("\n")}

Write the LESSONS a question setter must follow so these mistakes do not happen again.
- At most 8 lessons, most frequent mistake first.
- Each one short, general and actionable ("Never ...", "Always check ..."), about the KIND of mistake - not about one question. Do not quote a question.
- Skip anything that is not a mistake of the setter.

Return ONLY JSON: { "lessons": ["...", "..."] }`;
}

async function refreshLessons({ now = new Date() } = {}) {
  const gemini = require("./geminiService");
  const since = new Date(now.getTime() - WINDOW_DAYS * 86400000);
  const by = await mistakesBySubject(since);
  const out = [];
  for (const [subject, items] of by) {
    if (items.length < MIN_MISTAKES) continue;
    const res = await gemini.callGeminiRaw([{ text: lessonsPrompt(subject, items) }], { jsonMode: true, maxRetries: 2 });
    const lessons = ((Array.isArray(res) ? res[0] : res)?.lessons || []).map((l) => String(l).trim()).filter(Boolean).slice(0, 8);
    if (!lessons.length) continue;
    const guideText = `Mistakes found in recent ${subject} questions - never repeat them:\n${lessons.map((l) => `  - ${l.slice(0, 220)}`).join("\n")}`;
    const key = `lessons:${subject}`;
    const existing = await ReferenceGuide.findOne({ fileHash: key });
    if (existing) {
      // An admin's own wording is kept; the fresh lessons are added beneath.
      existing.guideText = existing.guideEdited ? `${existing.guideText.split("\n---\n")[0]}\n---\n${guideText}` : guideText;
      existing.blueprint = { ...(existing.blueprint || {}), summary: `Learned from ${items.length} rejected question(s) in the last ${WINDOW_DAYS} days`, traps: lessons };
      existing.readAt = now;
      await existing.save();
    } else {
      await ReferenceGuide.create({
        examType: "ALL", subject, kind: "lessons", title: `${subject}: lessons from rejected questions (automatic)`,
        fileHash: key, status: "ready", active: true, guideText, readAt: now, createdBy: "automatic",
        blueprint: { summary: `Learned from ${items.length} rejected question(s) in the last ${WINDOW_DAYS} days`, traps: lessons },
      });
    }
    out.push({ subject, mistakes: items.length, lessons: lessons.length });
  }
  return out;
}

module.exports = { refreshLessons, mistakesBySubject, lessonsPrompt, MIN_MISTAKES };
