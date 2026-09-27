const Test = require("../models/Test");
const Subject = require("../models/Subject");
const ExamPattern = require("../models/ExamPattern");
const { createVerifiedQuestions } = require("./questionFactory");

// A practice test holds this many. A mock holds whatever its exam's pattern
// adds up to.
const PRACTICE_TEST_SIZE = 12;

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
  const topicList = chapterDoc?.topics?.length ? chapterDoc.topics : [chapter || subject];

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
      examDisplayName: `${subject}${chapter ? ` - ${chapter}` : ""}, for ${examTags.join(", ")}`,
      subject,
      topic: topicList.join(", "),
      difficulty: level,
      syllabusTopics: topicList,
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

  // A mock is generated section by section; topping one up blind would skew
  // the paper, so it is reported and left to "Add Questions".
  if (test.type !== "practice") {
    return { title: test.title, added: 0, from, to: from, target, filled: false, why: "a mock is filled section by section" };
  }

  const needed = Math.min(target - from, max || target);
  const { tag, generateParams } = await generationParamsFor(test);

  let built;
  try {
    built = await createVerifiedQuestions({ needed, tag, generateParams });
  } catch (err) {
    return { title: test.title, added: 0, from, to: from, target, filled: false, why: err.message };
  }

  if (built.ids.length) {
    // Pushed, not saved. test.save() revalidates the whole document, so one
    // test written before a schema field existed would throw and take the
    // other twenty-five in the batch down with it. Adding questions has no
    // business caring whether an old test remembers its durationMinutes.
    await Test.updateOne({ _id: test._id }, { $push: { questions: { $each: built.ids } } });
  }

  const to = from + built.ids.length;
  return {
    title: test.title,
    added: built.ids.length,
    from,
    to,
    target,
    filled: to >= target,
    why: to >= target ? undefined : "the generator came up short - run it again",
  };
}

/**
 * Fills several, one after another. Sequential on purpose: the free tier
 * allows about fifteen calls a minute and a dozen tests at once would spend
 * the first minute being refused.
 */
async function refillTests(testIds, { max } = {}) {
  const out = [];
  for (const id of testIds) out.push(await refillTest(id, { max }));
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
      ? `. Still short: ${stuck.map((r) => `${r.title} (${r.to}/${r.target})`).join(", ")}`
      : "")
  );
}

module.exports = { refillTest, refillTests, refillNote, targetSize, generationParamsFor, PRACTICE_TEST_SIZE };
