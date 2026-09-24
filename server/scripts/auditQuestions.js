/**
 * Audits every question already in the database against the quality rules
 * that new questions now have to pass, and (optionally) cleans up.
 *
 *   node scripts/auditQuestions.js            # report only, changes NOTHING
 *   node scripts/auditQuestions.js --apply    # flag bad ones, pull them out of DRAFT tests
 *   node scripts/auditQuestions.js --apply --published-too
 *                                             # also pull them out of PUBLISHED tests
 *
 * Nothing is ever deleted. A bad question is marked "under_review" with the
 * reason, which takes it out of the pool new tests are built from and puts
 * it in the admin's review queue to fix or reject.
 *
 * Uses no AI at all - these are the rule checks (missing Hindi, a solution
 * too thin to teach anything, duplicate options, a missing answer key,
 * repeats of another question). Re-solving every old question with the AI
 * would cost thousands of calls; the rules catch the cheap, certain cases.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");
const Test = require("../models/Test");
const { ruleBasedCheck, questionKey } = require("../services/validationPipeline");

const APPLY = process.argv.includes("--apply");
const PUBLISHED_TOO = process.argv.includes("--published-too");

function line(label, value) {
  console.log(`  ${String(label).padEnd(42)} ${value}`);
}

(async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing - run this from the server folder");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`\nConnected. Mode: ${APPLY ? (PUBLISHED_TOO ? "APPLY (incl. published tests)" : "APPLY") : "REPORT ONLY - nothing will change"}\n`);

  const questions = await Question.find({}).select("text textHi options optionsHi correctIndex solution solutionHi status flagReason subject topic textKey createdAt").lean();
  console.log(`Questions in the bank: ${questions.length}\n`);

  // ---- 1. rule checks
  const problems = new Map(); // id -> reasons[]
  const reasonCounts = {};

  for (const q of questions) {
    const { passed, issues } = ruleBasedCheck(q);
    if (!passed) {
      problems.set(String(q._id), issues);
      for (const issue of issues) reasonCounts[issue] = (reasonCounts[issue] || 0) + 1;
    }
  }

  // ---- 2. duplicates (same question text, ignoring case/punctuation)
  const byKey = new Map();
  for (const q of questions) {
    const key = q.textKey || questionKey(q.text);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(q);
  }

  let duplicateCount = 0;
  for (const [, group] of byKey) {
    if (group.length < 2) continue;
    // Keep the oldest copy, flag the rest.
    group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const dup of group.slice(1)) {
      duplicateCount++;
      const reasons = problems.get(String(dup._id)) || [];
      reasons.push("duplicate of an earlier question");
      problems.set(String(dup._id), reasons);
    }
  }

  console.log("What the rules found:");
  for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) line(reason, count);
  line("duplicate of an earlier question", duplicateCount);
  console.log("");
  line("questions that would be flagged", problems.size);
  line("questions that are clean", questions.length - problems.size);

  // ---- 3. where are the bad ones being used?
  const badIds = [...problems.keys()].map((id) => new mongoose.Types.ObjectId(id));
  const affectedTests = await Test.find({ questions: { $in: badIds } }).select("title type publishStatus questions").lean();
  const draftTests = affectedTests.filter((t) => t.publishStatus !== "published");
  const publishedTests = affectedTests.filter((t) => t.publishStatus === "published");

  console.log("");
  line("tests containing at least one flagged question", affectedTests.length);
  line("  of those, drafts", draftTests.length);
  line("  of those, LIVE for students", publishedTests.length);

  if (publishedTests.length) {
    console.log("\n  Live tests that would lose questions:");
    for (const t of publishedTests.slice(0, 20)) {
      const losing = t.questions.filter((id) => problems.has(String(id))).length;
      console.log(`    - ${t.title} (${t.type}): ${losing} of ${t.questions.length} questions`);
    }
    if (publishedTests.length > 20) console.log(`    ...and ${publishedTests.length - 20} more`);
  }

  if (!APPLY) {
    console.log("\nNothing was changed. Re-run with --apply to flag these and take them out of draft tests.\n");
    await mongoose.disconnect();
    return;
  }

  // ---- 4. apply
  console.log("\nApplying...");

  // Backfill the comparison key on every question, so future generations can
  // spot a repeat of anything already in the bank.
  let keyed = 0;
  for (const q of questions) {
    const key = questionKey(q.text);
    if (q.textKey !== key) {
      await Question.updateOne({ _id: q._id }, { $set: { textKey: key } });
      keyed++;
    }
  }
  line("questions given a comparison key", keyed);

  let flaggedNow = 0;
  for (const [id, reasons] of problems) {
    const res = await Question.updateOne(
      { _id: id, status: { $ne: "under_review" } },
      { $set: { status: "under_review", flagReason: `Audit: ${reasons.join(", ")}` } }
    );
    flaggedNow += res.modifiedCount;
  }
  line("questions moved to the review queue", flaggedNow);

  const testsToClean = PUBLISHED_TOO ? affectedTests : draftTests;
  let cleanedTests = 0;
  let removedFromTests = 0;
  for (const t of testsToClean) {
    const keep = t.questions.filter((id) => !problems.has(String(id)));
    if (keep.length === t.questions.length) continue;
    removedFromTests += t.questions.length - keep.length;
    await Test.updateOne({ _id: t._id }, { $set: { questions: keep } });
    cleanedTests++;
  }
  line("tests cleaned", cleanedTests);
  line("question slots freed in those tests", removedFromTests);

  if (!PUBLISHED_TOO && publishedTests.length) {
    console.log(`\n  ${publishedTests.length} LIVE test(s) were left untouched on purpose.`);
    console.log("  Re-run with --published-too once you're ready for students' tests to change.");
  }

  console.log("\nDone. Top the emptied tests back up from the admin panel - new questions go");
  console.log("through the full quality gate before they're added.\n");

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Audit failed:", err.message);
  process.exit(1);
});
