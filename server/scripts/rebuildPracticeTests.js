/**
 * Replaces practice tests that are mostly repeats.
 *
 *   node scripts/rebuildPracticeTests.js               # report only
 *   node scripts/rebuildPracticeTests.js --apply       # archive them, build fresh drafts
 *   node scripts/rebuildPracticeTests.js --apply --publish
 *                                                      # ...and publish the replacements
 *
 * A test is "mostly repeats" when at least half its questions have been
 * flagged (run scripts/auditQuestions.js --apply first). The old test is
 * ARCHIVED, never deleted - its questions stay in the bank and the record of
 * what students saw stays intact.
 *
 * Replacements are built through the normal quality gate: every question is
 * rule-checked, independently re-solved by the AI, and checked against the
 * whole question bank, so the repeats that caused this don't come back.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Test = require("../models/Test");
const Question = require("../models/Question");
const Subject = require("../models/Subject");
const { createVerifiedQuestions, qualityNote } = require("../services/questionFactory");

const APPLY = process.argv.includes("--apply");
const PUBLISH = process.argv.includes("--publish");
const THRESHOLD = Number((process.argv.find((a) => a.startsWith("--threshold=")) || "").split("=")[1]) || 0.5;
const QUESTIONS_PER_TEST = 12;

(async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing - run this from the server folder");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`\nMode: ${APPLY ? (PUBLISH ? "APPLY + PUBLISH" : "APPLY (replacements stay drafts)") : "REPORT ONLY - nothing will change"}`);
  console.log(`A test is replaced when ${Math.round(THRESHOLD * 100)}% or more of its questions are flagged.\n`);

  const flagged = new Set(
    (await Question.find({ status: "under_review" }).select("_id").lean()).map((q) => String(q._id))
  );

  const tests = await Test.find({ type: "practice" }).lean();
  const doomed = tests
    .map((t) => {
      const bad = (t.questions || []).filter((id) => flagged.has(String(id))).length;
      return { test: t, bad, total: t.questions?.length || 0, ratio: t.questions?.length ? bad / t.questions.length : 0 };
    })
    .filter((row) => row.ratio >= THRESHOLD)
    .sort((a, b) => b.ratio - a.ratio);

  console.log(`Practice tests: ${tests.length}. To be replaced: ${doomed.length}\n`);
  for (const row of doomed) {
    console.log(
      `  ${row.test.title.padEnd(28)} ${row.test.subject}/${row.test.topic} ${String(row.test.difficultyLevel).padEnd(9)} ${row.bad}/${row.total} repeats${row.test.isFree ? " (FREE)" : ""}`
    );
  }

  if (!doomed.length) {
    console.log("\nNothing to do.\n");
    await mongoose.disconnect();
    return;
  }

  if (!APPLY) {
    console.log(`\nNothing was changed. --apply will archive these ${doomed.length} tests and build ${doomed.length} fresh ones`);
    console.log(`(about ${doomed.length * 4} Gemini calls, roughly ${Math.ceil((doomed.length * 4 * 4.5) / 60)} minutes at the paced rate).\n`);
    await mongoose.disconnect();
    return;
  }

  const subjects = await Subject.find({}).lean();
  const topicsFor = (subjectName, chapterName) =>
    subjects.find((s) => s.name === subjectName)?.chapters?.find((c) => c.name === chapterName)?.topics || [chapterName];

  let rebuilt = 0;
  let failed = 0;

  for (const row of doomed) {
    const { test } = row;
    const { subject, topic: chapter, difficultyLevel: level } = test;
    console.log(`\n- ${test.title}: building a replacement...`);

    // Build FIRST, archive only once the replacement exists. Archiving up
    // front cost students 24 practice tests the day the model answered
    // "busy" 24 times in a row - a failure must leave everything exactly as
    // it was.
    try {
      const topicList = topicsFor(subject, chapter);
      const built = await createVerifiedQuestions({
        needed: QUESTIONS_PER_TEST,
        tag: { examStage: "PRACTICE", chapter },
        generateParams: {
          examType: "PRACTICE",
          examDisplayName: `${subject} - ${chapter} practice`,
          subject,
          topic: topicList.join(", "),
          difficulty: level === "advanced" ? "hard" : level,
          syllabusTopics: topicList,
        },
      });

      if (!built.ids.length) {
        console.log("  nothing usable came back - the old test is left exactly as it is, try again later");
        failed++;
        continue;
      }

      const last = await Test.findOne({ type: "practice", subject, topic: chapter, difficultyLevel: level })
        .sort({ seriesNumber: -1 })
        .select("seriesNumber");
      const nextNumber = (last?.seriesNumber || 0) + 1;

      const fresh = await Test.create({
        title: `${chapter} - ${level.charAt(0).toUpperCase() + level.slice(1)} #${nextNumber}`,
        type: "practice",
        examType: "PRACTICE",
        examStage: "PRACTICE",
        subject,
        topic: chapter,
        difficultyLevel: level,
        seriesNumber: nextNumber,
        questions: built.ids,
        durationMinutes: Math.max(10, built.ids.length),
        publishStatus: PUBLISH ? "published" : "draft",
        isFree: !!test.isFree, // keep the free/premium mix students already had
        createdBy: "admin",
      });

      // Only now is it safe to retire the old one.
      await Test.updateOne({ _id: test._id }, { $set: { publishStatus: "archived" } });

      rebuilt++;
      console.log(`  -> ${fresh.title}: ${built.ids.length} fresh questions${qualityNote(built)} [${fresh.publishStatus}], old one archived`);
    } catch (err) {
      failed++;
      console.log(`  failed: ${err.message}`);
    }
  }

  // Only the ones that got a replacement were archived - the rest are still
  // live exactly as they were.
  console.log(`\nDone. Rebuilt ${rebuilt} (old ones archived), ${failed} left untouched for a later run.`);
  if (!PUBLISH) console.log("Replacements are drafts - review them in the admin panel and publish.");
  console.log("");

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Rebuild failed:", err.message);
  process.exit(1);
});
