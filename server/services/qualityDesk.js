// The AI quality desk: checks questions, says what is wrong, and mends or
// replaces them - on its own (mode "auto") or by proposal for the admin to
// apply (mode "approval"). See models/QualityFix and models/QualitySettings.
//
// One check, the same wherever a question comes from (a spreadsheet, the bank
// audit, the admin asking about one question):
//
//   1. the rule gate - four distinct options, a solution that reaches the
//      ticked answer, the maths worked in code, the Hindi, the script
//   2. repeats - the same question already in the chapter, reworded or not
//   3. the AI solves it afresh; a disputed answer is checked a second time
//      before anything is done about it
//
// What it does about a problem:
//
//   - a gap (thin solution, missing Hindi): the AI fills it, and the mended
//     question must pass the whole gate again
//   - a wrong or doubtful answer key, a repeat, any other fault: a new
//     question on the same topic and level is built and checked, and takes
//     the old one's place in every test. The old one is retired, never
//     deleted, and its history kept.
//   - when the AI cannot be reached (the day's allowance, usually), nothing
//     is changed: the question is flagged for the admin, and manual work goes
//     on as before.
const Question = require("../models/Question");
const Test = require("../models/Test");
const QualityFix = require("../models/QualityFix");
const QualitySettings = require("../models/QualitySettings");
const { ruleBasedCheck, runValidationPipelineBatch, looksLikeRepeat, numberSignature, questionKey } = require("./validationPipeline");
const { plainMaths } = require("./mathNotation");
const history = require("./questionHistory");

const COULD_NOT_CHECK = /could not be completed/;
const MENDABLE = /solution too short|hindi|romanised/i;
const NOT_MENDABLE = /options|correctIndex|question text too short|solution is just the option|does not contain|argues with itself|never arrives|chart|figure|maths/i;

// ---------------------------------------------------------------- checking

// The chapter's other live questions, bucketed by their numbers, for the
// repeat check.
async function chapterBank(chapter, topic) {
  const scope = chapter ? { $or: [{ chapter }, { chapter: { $in: [null, ""] }, topic: chapter }] } : { topic };
  const live = await Question.find({ status: { $in: ["published", "under_review"] }, ...scope }).select("text textKey").lean();
  const bySig = new Map();
  for (const q of live) {
    const text = plainMaths(q.text);
    const sig = numberSignature(text);
    if (!bySig.has(sig)) bySig.set(sig, []);
    bySig.get(sig).push({ _id: String(q._id), text, textKey: q.textKey });
  }
  return bySig;
}

// Of two copies, the later one is the repeat: only questions older than this
// one count, so a pair is never both thrown out.
function repeatOf(q, bySig) {
  const text = plainMaths(q.text);
  const mine = String(q._id);
  const others = (bySig.get(numberSignature(text)) || []).filter((o) => o._id < mine);
  const key = q.textKey || questionKey(q.text);
  const same = others.find((o) => o.textKey && o.textKey === key);
  if (same) return same.text;
  const near = looksLikeRepeat(text, others.map((o) => o.text));
  return near.repeat ? near.of : null;
}

/**
 * Looks at each question and reports what is wrong. Changes nothing.
 * { question, problems: [...], mendable, needsReplacing, aiSaid, aiUnavailable }
 */
async function inspect(questions) {
  const banks = new Map();
  const bankFor = async (q) => {
    const k = `${q.chapter || ""}|${q.topic || ""}`;
    if (!banks.has(k)) banks.set(k, await chapterBank(q.chapter, q.topic));
    return banks.get(k);
  };

  const first = await runValidationPipelineBatch(questions, { reshuffle: false });
  // A disputed answer is asked a second time before it counts.
  const disputed = questions.filter((q, i) => first[i].status !== "published" && !/Rule check failed/.test(first[i].flagReason || "") && !COULD_NOT_CHECK.test(first[i].flagReason || ""));
  const second = disputed.length ? await runValidationPipelineBatch(disputed, { reshuffle: false }) : [];
  const secondById = new Map(disputed.map((q, i) => [String(q._id), second[i]]));

  const reports = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const r = first[i];
    const problems = [];
    let aiUnavailable = false;
    let aiSaid;
    let mendable = false;
    let needsReplacing = false;

    if (/Rule check failed/.test(r.flagReason || "")) {
      const issues = (r.flagReason || "").replace("Rule check failed: ", "").split(", ");
      problems.push(...issues);
      if (issues.every((x) => MENDABLE.test(x) && !NOT_MENDABLE.test(x))) mendable = true;
      else needsReplacing = true;
    } else if (r.status !== "published") {
      if (COULD_NOT_CHECK.test(r.flagReason || "")) aiUnavailable = true;
      else {
        const again = secondById.get(String(q._id));
        if (again && COULD_NOT_CHECK.test(again.flagReason || "")) aiUnavailable = true;
        else if (again && again.status !== "published") {
          problems.push(`the AI solved it twice and disagrees with the answer key: ${r.flagReason}`);
          aiSaid = (String(r.flagReason).match(/answered "([^"]*)"/) || [])[1];
          needsReplacing = true;
        }
      }
    }

    const twin = repeatOf(q, await bankFor(q));
    if (twin) {
      problems.push(`repeats a question already in the chapter: "${String(twin).slice(0, 120)}"`);
      needsReplacing = true;
    }
    reports.push({ question: q, problems, mendable: mendable && !needsReplacing, needsReplacing, aiSaid, aiUnavailable });
  }
  return reports;
}

// ---------------------------------------------------------------- proposing

// What a new question for this one's place should be: the topic and level of
// the practice test holding it, or its own when it is in none.
async function generationParamsForQuestion(q) {
  const { generationParamsFor } = require("./testTopUp");
  const test = await Test.findOne({ questions: q._id, type: "practice" }).lean();
  if (test) return { ...(await generationParamsFor(test)), inTest: test.questions };
  const level = q.difficulty === "exam" ? "hard" : q.difficulty || "medium";
  return {
    tag: { chapter: q.chapter, examType: q.examType },
    generateParams: {
      examType: (q.examType || [])[0] || "PRACTICE",
      examDisplayName: `${q.subject}${q.chapter ? ` - ${q.chapter}` : ""}`,
      subject: q.subject,
      topic: q.topic,
      difficulty: level,
      syllabusTopics: [q.topic],
    },
    inTest: [],
  };
}

// A new question for this one's place, built and checked, held out of
// circulation (draft) until the fix is applied.
async function buildReplacement(q) {
  const { createVerifiedQuestions } = require("./questionFactory");
  const { tag, generateParams, inTest } = await generationParamsForQuestion(q);
  const built = await createVerifiedQuestions({ needed: 1, tag, generateParams, inTest, maxRounds: 3 });
  const id = built.ids[0];
  if (!id) return null;
  await Question.updateOne({ _id: id }, { $set: { status: "draft", flagReason: `Held as a replacement for ${q._id}` } });
  return id;
}

// The question mended: the AI fills the gap, and the result must pass the
// whole gate. Returns the fields to change, or null.
async function buildMend(q, problems) {
  const { repairQuestion } = require("./geminiService");
  const mended = await repairQuestion(q, problems);
  if (!mended) return null;
  const [checked] = await runValidationPipelineBatch([{ ...q, ...mended }], { reshuffle: false });
  if (checked.status !== "published") return null;
  const proposed = {};
  for (const f of ["solution", "solutionHi", "textHi", "optionsHi"]) if (mended[f] !== undefined) proposed[f] = mended[f];
  return Object.keys(proposed).length ? proposed : null;
}

// ---------------------------------------------------------------- applying

async function applyFix(fixId, { by = "admin" } = {}) {
  const fix = await QualityFix.findById(fixId);
  if (!fix || fix.status !== "pending") return { ok: false, message: "This fix is not waiting to be applied" };
  const q = await Question.findById(fix.question).lean();
  if (!q) {
    fix.status = "failed";
    fix.result = "The question no longer exists";
    await fix.save();
    return { ok: false, message: fix.result };
  }

  if (fix.kind === "fix") {
    const after = { ...q, ...fix.proposed };
    const { passed, issues } = ruleBasedCheck(after);
    if (!passed) {
      fix.status = "failed";
      fix.result = `The mended question fails the gate: ${issues.join(", ")}`;
      await fix.save();
      return { ok: false, message: fix.result };
    }
    await history.change(q._id, { ...fix.proposed, flagReason: "" }, { action: "ai_fix", by, note: fix.problems.join("; ") });
    fix.result = "Mended and checked again";
  } else if (fix.kind === "replace") {
    const fresh = fix.replacement && (await Question.findById(fix.replacement).lean());
    if (!fresh) {
      fix.status = "failed";
      fix.result = "The replacement question is missing";
      await fix.save();
      return { ok: false, message: fix.result };
    }
    const { passed, issues } = ruleBasedCheck(fresh);
    if (!passed) {
      fix.status = "failed";
      fix.result = `The replacement fails the gate: ${issues.join(", ")}`;
      await fix.save();
      return { ok: false, message: fix.result };
    }
    await Question.updateOne({ _id: fresh._id }, { $set: { status: "published", flagReason: "" } });
    await history.record(fresh._id, "create", { after: { ...fresh, status: "published" }, by, note: `Replaces ${q._id}` });
    // Into the same place in every test that held the old one.
    await Test.updateMany({ questions: q._id }, { $set: { "questions.$": fresh._id } });
    await history.change(q._id, { status: "rejected", flagReason: `Replaced: ${fix.problems.join("; ")}`.slice(0, 500) }, { action: "replaced", by, replacedBy: fresh._id, note: fix.problems.join("; ") });
    fix.result = "Replaced in every test by a new checked question";
  } else {
    return { ok: false, message: "A flagged question needs the admin: edit it, or ask the AI again when it is available" };
  }
  fix.status = "applied";
  fix.decidedAt = new Date();
  fix.decidedBy = by;
  await fix.save();
  return { ok: true, message: fix.result };
}

async function dismissFix(fixId) {
  const fix = await QualityFix.findById(fixId);
  if (!fix || fix.status !== "pending") return { ok: false, message: "This fix is not waiting" };
  // A replacement that was never used was never shown to anyone.
  if (fix.replacement) await Question.deleteOne({ _id: fix.replacement, status: "draft" });
  fix.status = "dismissed";
  fix.decidedAt = new Date();
  fix.decidedBy = "admin";
  await fix.save();
  return { ok: true, message: "Dismissed - the question stays as it is" };
}

// ---------------------------------------------------------------- the desk

/**
 * Checks the given questions and acts on what it finds, by the mode in
 * QualitySettings (or `mode` given). Returns a summary.
 */
async function checkQuestions(ids, { source = "admin", mode } = {}) {
  const settings = await QualitySettings.get();
  const act = mode || settings.mode;
  const questions = await Question.find({ _id: { $in: ids } }).lean();
  const out = { checked: 0, sound: 0, proposed: 0, applied: 0, flagged: 0, waiting: 0, aiUnavailable: false, unjudged: [], fixes: [] };
  if (!questions.length) return out;

  // Questions that already have a proposal waiting are not proposed for twice.
  const busy = new Set((await QualityFix.find({ question: { $in: ids }, status: "pending" }).select("question").lean()).map((f) => String(f.question)));
  const reports = await inspect(questions.filter((q) => !busy.has(String(q._id))));
  out.waiting = busy.size;

  for (const r of reports) {
    const q = r.question;
    out.checked++;
    // Not judged at all: left for a later run, not counted as sound.
    if (r.aiUnavailable && !r.problems.length) {
      out.aiUnavailable = true;
      out.unjudged.push(q._id);
      continue;
    }
    if (!r.problems.length) {
      out.sound++;
      continue;
    }

    let fix;
    try {
      if (r.mendable) {
        const proposed = await buildMend(q, r.problems);
        if (proposed) fix = { kind: "fix", proposed };
      }
      if (!fix) {
        const replacement = await buildReplacement(q);
        if (replacement) fix = { kind: "replace", replacement };
      }
    } catch (err) {
      // The AI ran out while building the fix: try again later rather than
      // hand the admin a flag that only says "the AI was busy".
      if (COULD_NOT_CHECK.test(err.message) || /allowance|quota|per day|429/i.test(err.message)) {
        out.aiUnavailable = true;
        out.unjudged.push(q._id);
        continue;
      }
    }
    const saved = await QualityFix.create({
      question: q._id,
      problems: r.problems,
      aiSaid: r.aiSaid,
      source,
      ...(fix || { kind: "flag" }),
    });
    out.fixes.push(saved._id);
    if (!fix) {
      out.flagged++;
      continue;
    }
    out.proposed++;
    if (act === "auto") {
      const done = await applyFix(saved._id, { by: "ai" });
      if (done.ok) out.applied++;
    }
  }
  return out;
}

module.exports = { inspect, checkQuestions, applyFix, dismissFix, buildReplacement, buildMend };
