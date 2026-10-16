const Test = require("../models/Test");
const Question = require("../models/Question");
const Subject = require("../models/Subject");
const ExamPattern = require("../models/ExamPattern");
const GenerationJob = require("../models/GenerationJob");
const { visualChaptersFor } = require("./visualPlan");
const { createVerifiedQuestions } = require("./questionFactory");
// A practice test holds PRACTICE_TEST_SIZE. A mock holds whatever its exam's
// pattern adds up to.
const { PRACTICE_TEST_SIZE, PRACTICE_BATCH } = require("../utils/practice");

/**
 * When a question leaves a test, another takes its place.
 *
 * Taking a bad question out used to be only half the job: the test was left
 * with a hole in it and a line in the response saying so, and somebody had to
 * notice that line and click "Add questions". One purge of 127 questions whose
 * answer keys could not be trusted left 26 live tests short in a single
 * afternoon - a test billed as twelve questions serving five.
 *
 * So removal now carries the repair with it. The replacement goes through the
 * same gate as any other question and is checked against everything the
 * chapter has already asked, so it is never a reworded copy of what is still
 * in the test.
 *
 * This is healing, not editing, which is why it works on a published test
 * where a deliberate edit would not: the test has already changed: the only
 * question is whether it stays broken.
 */
async function targetSize(test) {
  if (test.type === "practice") return PRACTICE_TEST_SIZE;
  const pattern = await ExamPattern.findOne({ examType: test.examStage }).lean();
  const total = (pattern?.sections || []).reduce((n, s) => n + (s.questionCount || 0), 0);
  return total || null;
}

// What to ask the generator for, read from the test itself.
async function generationParamsFor(test, subjectName) {
  const subject = subjectName || test.subject;
  const chapter = test.topic;

  const subjectDoc = await Subject.findOne({ $or: [{ name: subject }, { aliases: subject }] }).lean();
  const chapterDoc = (subjectDoc?.chapters || []).find((c) => c.name === chapter);
  // A test for one topic of the chapter asks about that topic alone.
  const topicList = test.subtopic
    ? [test.subtopic]
    : chapterDoc?.topics?.length
    ? chapterDoc.topics
    : [chapter || subject];

  let examTags = chapterDoc?.exams?.length ? chapterDoc.exams : null;
  if (!examTags) {
    const active = await ExamPattern.find({ isActive: true }).select("examType").lean();
    examTags = active.map((e) => e.examType);
  }

  // "advanced" is a label for the student, not a level the generator knows.
  const level = test.difficultyLevel === "advanced" ? "hard" : test.difficultyLevel || "easy";

  return {
    tag: { chapter, examType: examTags },
    generateParams: {
      examType: test.examStage || "PRACTICE",
      examDisplayName: `${subject}${chapter ? ` - ${chapter}` : ""}${test.subtopic ? ` (${test.subtopic})` : ""}, for ${examTags.join(", ")}`,
      subject,
      topic: topicList.join(", "),
      difficulty: level,
      syllabusTopics: topicList,
      // A Data Interpretation or figure chapter is written by the visual
      // generator - see services/visualGenerator.js.
      ...(chapterDoc?.visual ? { visualKind: chapterDoc.visual } : {}),
    },
  };
}

/**
 * Fills one test back up to its own size. Returns what happened, always -
 * a top-up that could not finish says so rather than leaving it to be noticed.
 */
async function refillTest(testId, { max } = {}) {
  const test = await Test.findById(testId);
  if (!test) return { title: "(gone)", added: 0, from: 0, to: 0, target: 0, filled: false, why: "test not found" };

  const target = await targetSize(test);
  const from = test.questions.length;

  // Not knowing how big a test is meant to be is not the same as it being
  // full. Saying "filled" here would quietly drop it off the list of tests
  // somebody should look at, which is the opposite of what is wanted.
  if (!target) {
    return { title: test.title, added: 0, from, to: from, target: null, filled: false, why: "no pattern says how big this test should be" };
  }
  if (from >= target) {
    return { title: test.title, added: 0, from, to: from, target, filled: true };
  }

  if (test.type === "full_mock") return refillMock(test, { from, target, max });
  if (test.type !== "practice") {
    return { title: test.title, added: 0, from, to: from, target, filled: false, why: "only practice tests and mocks are refilled" };
  }

  const needed = Math.min(target - from, max || target);
  const { tag, generateParams } = await generationParamsFor(test);

  // Ten at a time, the way a new test is built. Each batch is written as soon
  // as it is made, so a later batch failing keeps what an earlier one added.
  let added = 0;
  let why;
  while (added < needed) {
    const ask = Math.min(PRACTICE_BATCH, needed - added);
    let built;
    try {
      built = await createVerifiedQuestions({ needed: ask, tag, generateParams });
    } catch (err) {
      why = err.message;
      break;
    }
    if (built.ids.length) {
      // Pushed, not saved. test.save() revalidates the whole document, so one
      // test written before a schema field existed would throw and take the
      // other twenty-five in the batch down with it. Adding questions has no
      // business caring whether an old test remembers its durationMinutes.
      await Test.updateOne(
        { _id: test._id },
        // A chart or figure question makes it a test older apps cannot show.
        { $push: { questions: { $each: built.ids } }, ...(generateParams.visualKind ? { $set: { hasVisuals: true } } : {}) }
      );
      added += built.ids.length;
    }
    if (built.ids.length < ask) break;
  }

  // A practice test gets a minute a question. Topped up from 12 to 20, an old
  // test would otherwise ask 20 questions on its 12-minute clock.
  const to = from + added;
  if (added) {
    await Test.updateOne({ _id: test._id, durationMinutes: { $lt: to } }, { $set: { durationMinutes: to } });
  }

  return {
    title: test.title,
    added,
    from,
    to,
    target,
    filled: to >= target,
    why: to >= target ? undefined : why || "the generator came up short - run it again",
  };
}

// The questions of the exam's other mocks (the latest twelve), so a mock's
// new questions are not the ones its siblings already ask.
async function siblingMockQuestions(examStage, exceptId) {
  const others = await Test.find({ examStage, type: "full_mock", _id: { $ne: exceptId } })
    .sort({ createdAt: -1 })
    .limit(12)
    .select("questions")
    .lean();
  return others.flatMap((t) => t.questions || []);
}

/**
 * A mock back to its pattern, section by section: each section short of its
 * count gets that many at the section's own difficulty mix, checked against
 * the whole paper and the exam's other mocks, and placed after the section's
 * last question so the paper still reads in order. Works on a published mock:
 * this repairs one that lost questions to a review, it does not edit it.
 */
async function refillMock(test, { from, target, max }) {
  const report = (added, why) => ({ title: test.title, added, from, to: from + added, target, filled: from + added >= target, ...(why ? { why } : {}) });
  const pattern = await ExamPattern.findOne({ examType: test.examStage }).lean();
  if (!pattern?.sections?.length) return report(0, "no pattern for this exam");
  const sectionOf = (subject) => pattern.sections.findIndex((s) => s.subject === subject || (s.sources || []).includes(subject));
  const siblings = await siblingMockQuestions(test.examStage, test._id);

  let budget = max || target;
  let added = 0;
  let why;
  const visualPlan = await visualChaptersFor(pattern, (section) => section.syllabus);
  for (let k = 0; k < pattern.sections.length && budget > 0; k++) {
    const section = pattern.sections[k];
    const paper = (await Test.findById(test._id).select("questions").lean())?.questions || [];
    const docs = await Question.find({ _id: { $in: paper } }).select("subject chapter visual.kind").lean();
    const subjects = new Map(docs.map((q) => [String(q._id), q.subject]));
    const inSection = paper.filter((id) => sectionOf(subjects.get(String(id))) === k);
    let short = Math.min(budget, Math.max(0, section.questionCount - inSection.length));
    if (!short) continue;

    // The section's figure and chart sets first: a figure question taken out
    // comes back as a figure, so the paper does not lose the topic.
    for (const v of visualPlan[k] || []) {
      const have = docs.filter((q) => q.visual?.kind === v.kind && q.chapter === v.chapter && sectionOf(q.subject) === k).length;
      const setSize = v.kind === "chart" ? 5 : 3;
      const want = Math.min(short, setSize - have);
      if (want < (v.kind === "chart" ? 3 : 1)) continue;
      let built;
      try {
        built = await createVerifiedQuestions({
          needed: want,
          inTest: [...paper, ...siblings],
          tag: { examStage: test.examStage, chapter: v.chapter },
          generateParams: {
            examType: test.examStage,
            examDisplayName: pattern.displayName,
            subject: v.subject,
            topic: v.chapter,
            difficulty: "medium",
            examLevel: pattern.examLevel,
            syllabusTopics: v.topics,
            visualKind: v.kind,
          },
        });
      } catch (err) {
        return report(added, err.message);
      }
      if (!built.ids.length) return report(added, `no ${v.kind} question for ${v.chapter} passed the checks`);
      const lastAt = paper.reduce((at, id, i) => (sectionOf(subjects.get(String(id))) === k ? i : at), -1);
      await Test.updateOne({ _id: test._id }, { $push: { questions: { $each: built.ids, $position: lastAt >= 0 ? lastAt + 1 : paper.length } } });
      for (const id of built.ids) subjects.set(String(id), v.subject);
      added += built.ids.length;
      budget -= built.ids.length;
      short -= built.ids.length;
    }
    if (!short) continue;

    const mix = section.difficultyMix || { easy: 30, medium: 50, hard: 20 };
    const easy = Math.round((short * (mix.easy ?? 30)) / 100);
    const medium = Math.round((short * (mix.medium ?? 50)) / 100);
    const plan = Object.entries({ easy, medium, hard: Math.max(0, short - easy - medium) }).filter(([, n]) => n > 0);
    for (const [difficulty, count] of plan) {
      let left = count;
      while (left > 0) {
        const ask = Math.min(PRACTICE_BATCH, left);
        const now = (await Test.findById(test._id).select("questions").lean())?.questions || [];
        let built;
        try {
          built = await createVerifiedQuestions({
            needed: ask,
            inTest: [...now, ...siblings],
            tag: { examStage: test.examStage },
            generateParams: {
              examType: test.examStage,
              examDisplayName: pattern.displayName,
              subject: section.subject,
              topic: section.subject,
              difficulty,
              examLevel: pattern.examLevel,
              syllabusTopics: (section.syllabus || []).length
                ? [...section.syllabus].sort(() => Math.random() - 0.5).slice(0, 8)
                : [],
            },
          });
        } catch (err) {
          why = err.message;
          return report(added, why);
        }
        if (!built.ids.length) return report(added, "no replacement passed the checks");
        // After the section's last question, so the section stays together.
        const lastAt = now.reduce((at, id, i) => (sectionOf(subjects.get(String(id))) === k ? i : at), -1);
        const position = lastAt >= 0 ? lastAt + 1 : now.length;
        await Test.updateOne({ _id: test._id }, { $push: { questions: { $each: built.ids, $position: position } } });
        for (const id of built.ids) subjects.set(String(id), section.subject);
        added += built.ids.length;
        budget -= built.ids.length;
        left -= built.ids.length;
        if (built.ids.length < ask) break;
      }
    }
  }
  return report(added, from + added >= target ? undefined : why || "the generator came up short - run it again");
}

/**
 * Fills several, one after another. Sequential on purpose: the free tier
 * allows about fifteen calls a minute and a dozen tests at once would spend
 * the first minute being refused.
 */
async function refillTests(testIds, { max } = {}) {
  const out = [];
  for (const id of testIds) {
    const r = await refillTest(id, { max });
    out.push(r);
    // Still short (the day's allowance, usually): into the queue, so the hole
    // is filled when generation runs again rather than waiting to be noticed.
    // Rejecting a stale fact left Super TET Mock #6 at 118 of 120 with only a
    // line in the response saying so.
    if (r.target && !r.filled && r.to < r.target) {
      const job = { kind: "top_up", testId: id, label: `Top up ${r.title} (${r.to} → ${r.target})` };
      if (!(await GenerationJob.isAlreadyQueued(job))) await GenerationJob.create({ ...job, status: "queued" });
      r.queued = true;
    }
  }
  return out;
}

// One line for the admin: what was replaced, and what still is not.
function refillNote(results) {
  const added = results.reduce((n, r) => n + r.added, 0);
  if (!results.length || (!added && results.every((r) => r.filled))) return "";
  const stuck = results.filter((r) => !r.filled);
  return (
    (added ? `. ${added} replacement${added === 1 ? "" : "s"} generated and added` : "") +
    (stuck.length
      ? `. Still short: ${stuck.map((r) => `${r.title} (${r.to}/${r.target})`).join(", ")}` +
        (stuck.some((r) => r.queued) ? " - queued to be filled when generation runs" : "")
      : "")
  );
}

module.exports = { refillTest, refillTests, refillNote, targetSize, generationParamsFor, siblingMockQuestions, PRACTICE_TEST_SIZE };
