// Every night: the practice tests of every chapter are checked the way the
// chapter-health screen checks them, and each question at fault gets a
// replacement through the quality desk - so a test stays clean without anyone
// opening the admin panel.
//
// On 2026-10-21 one chapter (Number System) needed ~150 questions replaced by
// hand: 62 repeats inside its tests, 6 ambiguous "between" counts, 107
// questions drilling one pattern, a few with stray script or LaTeX. Every one
// of those is a fault code can see; this finds them and puts the quality
// desk to work on them.
//
// What is done with a fault follows the desk's own mode (QualitySettings):
//   auto      - the replacement goes in at once (and can be undone)
//   approval  - it waits in "Proposed fixes" for the admin
// At most MAX_PER_NIGHT replacements a night, so the AI allowance lasts; what
// is left is found again the next night.
const Subject = require("../models/Subject");
const Question = require("../models/Question");
const Test = require("../models/Test");
const QualityFix = require("../models/QualityFix");
const QualitySettings = require("../models/QualitySettings");
const { chapterHealth } = require("./chapterHealth");
const { samePattern } = require("./qualityRules");

const MAX_PER_NIGHT = 15;
// Generous on purpose: a narrow topic (unit digits) shares a pattern more
// than a mixed test does. Above this many, a test is drilling one idea.
const MAX_SAME_PATTERN_IN_TEST = 5;

// Every fault in one chapter's practice tests, as { id, reason }.
async function chapterFaults(chapter) {
  const h = await chapterHealth(chapter);
  const faults = [];
  const add = (id, reason) => id && faults.push({ id: String(id), reason, chapter });
  for (const r of h.repeats || []) if ((r.replace.tests || []).length) add(r.replace._id, `repeats a question already in the chapter: "${String(r.keep.text).slice(0, 90)}"`);
  for (const r of h.ruleFailures || []) if ((r.tests || []).length) add(r._id, `fails the quality rules: ${(r.issues || []).join("; ").slice(0, 160)}`);
  for (const r of h.notation || []) if ((r.tests || []).length) add(r._id, "maths written as code or LaTeX, not as a student reads it");
  for (const t of h.twins || []) add(t.replace, `asks the same thing as another question in ${t.title}`);

  // One idea drilled over and over in a single test.
  const tests = await Test.find({ type: "practice", topic: chapter }).select("title questions").lean();
  const ids = [...new Set(tests.flatMap((t) => t.questions.map(String)))];
  const byId = new Map((await Question.find({ _id: { $in: ids } }).select("text").lean()).map((q) => [String(q._id), q]));
  for (const t of tests) {
    const groups = [];
    for (const id of t.questions.map(String)) {
      const q = byId.get(id);
      if (!q) continue;
      const g = groups.find((gr) => samePattern(gr[0].text, q.text));
      if (g) g.push({ id, text: q.text });
      else groups.push([{ id, text: q.text }]);
    }
    for (const g of groups) {
      if (g.length <= MAX_SAME_PATTERN_IN_TEST) continue;
      for (const extra of g.slice(MAX_SAME_PATTERN_IN_TEST)) {
        add(extra.id, `${t.title} has ${g.length} questions of one pattern ("${g[0].text.slice(0, 60)}")`);
      }
    }
  }
  // One entry per question.
  const seen = new Set();
  return faults.filter((f) => (seen.has(f.id) ? false : seen.add(f.id)));
}

/**
 * Finds the faults of every chapter with practice tests and hands up to
 * `max` of them to the quality desk. Returns what it did, for the job log.
 */
async function runNightlyHealth({ max = MAX_PER_NIGHT, chapters } = {}) {
  const { buildReplacement, applyFix } = require("./qualityDesk");
  const settings = await QualitySettings.get();
  const names = chapters || [...new Set((await Subject.find({}).select("chapters.name").lean()).flatMap((s) => (s.chapters || []).map((c) => c.name)))];
  const withTests = [];
  for (const name of names) if (await Test.exists({ type: "practice", topic: name })) withTests.push(name);

  const all = [];
  for (const chapter of withTests) all.push(...(await chapterFaults(chapter)));

  // Not twice: a question that already has a proposal waiting is the admin's.
  const waiting = new Set((await QualityFix.find({ question: { $in: all.map((f) => f.id) }, status: "pending" }).select("question").lean()).map((f) => String(f.question)));
  const todo = all.filter((f) => !waiting.has(f.id));

  const out = { chapters: withTests.length, found: all.length, waiting: waiting.size, proposed: 0, applied: 0, failed: 0, left: 0, aiOut: false };
  for (const f of todo.slice(0, max)) {
    const q = await Question.findById(f.id).lean();
    if (!q || q.status !== "published") continue;
    let replacement = null;
    try {
      replacement = await buildReplacement(q);
    } catch (err) {
      if (/allowance|quota|per day|429/i.test(err.message || "")) { out.aiOut = true; break; }
    }
    if (!replacement) { out.failed++; continue; }
    const fix = await QualityFix.create({ question: q._id, problems: [f.reason], kind: "replace", replacement, source: "health" });
    out.proposed++;
    if (settings.mode === "auto") {
      const done = await applyFix(fix._id, { by: "ai" });
      if (done.ok) out.applied++;
    }
  }
  out.left = Math.max(0, todo.length - out.proposed - out.failed);
  return out;
}

// Called by the reminders tick (cron-job.org wakes the server at 0, 7 and
// 20 h IST). Between midnight and 6 AM it queues one chapter_health job per
// IST date; the worker runs it like any other job.
async function queueNightlyHealth(now = new Date()) {
  const GenerationJob = require("../models/GenerationJob");
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  if (ist.getUTCHours() >= 6) return null;
  const label = `Nightly chapter health ${ist.toISOString().slice(0, 10)}`;
  if (await GenerationJob.exists({ kind: "chapter_health", label })) return null;
  return GenerationJob.create({ kind: "chapter_health", label, status: "queued" });
}

const healthNote = (r) =>
  `Checked ${r.chapters} chapter(s): ${r.found} fault(s) found, ${r.proposed} replacement(s) proposed` +
  (r.applied ? `, ${r.applied} applied` : "") +
  (r.failed ? `, ${r.failed} could not be replaced` : "") +
  (r.left ? `, ${r.left} left for the next night` : "") +
  (r.aiOut ? " (the AI allowance ran out)" : "");

module.exports = { chapterFaults, runNightlyHealth, queueNightlyHealth, healthNote, MAX_PER_NIGHT, MAX_SAME_PATTERN_IN_TEST };
