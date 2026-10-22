// Filling a practice series to 10 tests on the server, unattended
// (services/practiceSeries.js): one step a job, short tests filled first,
// full sound tests published by themselves, the next step queued until the
// series is complete, and an allowance pause that lifts itself after the
// reset. In-process, throwaway in-memory MongoDB; the generator is a fake.
//
//   node tests/practice-series-test.cjs
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `   [${detail}]` : ""}`);
};

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "practice_series_test");
  const Test = require(path.join(SERVER, "models/Test"));
  const Question = require(path.join(SERVER, "models/Question"));
  const GenerationJob = require(path.join(SERVER, "models/GenerationJob"));
  const QueueState = require(path.join(SERVER, "models/QueueState"));
  const series = require(path.join(SERVER, "services/practiceSeries"));
  const controller = require(path.join(SERVER, "controllers/examSeriesController"));
  const topUp = require(path.join(SERVER, "services/testTopUp"));

  // The fake generator: distinct questions, as many as asked for.
  let made = 0;
  const words = ["river", "mountain", "harbour", "valley", "desert", "forest", "island", "canal", "bridge", "fort", "temple", "market", "station", "garden", "lake", "tower", "palace", "mine", "port", "field"];
  const newQuestions = async (k) => {
    const qs = [];
    for (let i = 0; i < k; i++) {
      made++;
      qs.push(await Question.create({
        text: `A ${words[made % 20]} trust ${made * 7} spends ${made % 9 + 11}% of ₹${made * 1000 + 37} on repairs. How much is that?`,
        options: ["1", "2", "3", "4"], correctIndex: 0, solution: "Worked out.", subject: "Maths", topic: "Percentage",
        chapter: "Percentage", examType: ["SSC_CGL"], source: "ai_generated", status: "published",
      }));
    }
    return qs.map((q) => q._id);
  };
  let nextSize = 20;
  let buildError = null;
  controller.buildPracticeTest = async ({ subject, chapter, subtopic, difficulty }) => {
    if (buildError) throw new Error(buildError);
    const last = await Test.findOne({ type: "practice", topic: chapter, subtopic: subtopic || null, difficultyLevel: difficulty }).sort({ seriesNumber: -1 });
    const number = (last?.seriesNumber || 0) + 1;
    const t = await Test.create({
      title: `${chapter} · ${subtopic} · Easy #${number}`, type: "practice", examType: "PRACTICE", subject, topic: chapter, subtopic,
      difficultyLevel: difficulty, seriesNumber: number, questions: await newQuestions(nextSize), durationMinutes: 20, publishStatus: "draft",
    });
    return { message: `${t.title} built with ${t.questions.length}` };
  };
  let refillMode = "fill";
  topUp.refillTest = async (id) => {
    const t = await Test.findById(id);
    const from = t.questions.length;
    if (refillMode === "allowance") return { title: t.title, from, to: from, target: 20, added: 0, filled: false, why: "Every model has used its allowance for today" };
    if (refillMode === "stuck") return { title: t.title, from, to: from, target: 20, added: 0, filled: false, why: "no fitting question passed the gate" };
    t.questions.push(...(await newQuestions(20 - from)));
    await t.save();
    return { title: t.title, from, to: 20, target: 20, added: 20 - from, filled: true };
  };

  const params = { subject: "Maths", chapter: "Percentage", subtopic: "Percentage in Income and Expenditure", difficulty: "easy", target: 10 };
  const filter = series.seriesFilter(params);
  const queuedSteps = () => GenerationJob.countDocuments({ kind: "practice_series", status: "queued" });

  // ---- queuing
  const j1 = await series.queueSeries(params);
  const j2 = await series.queueSeries(params);
  check("a series is queued once", j1 && !j2 && (await queuedSteps()) === 1);
  await GenerationJob.updateOne({ _id: j1._id }, { $set: { status: "running" } });

  // ---- first step: a full sound test, live at once, next step queued
  let r = await series.fillSeriesStep(params);
  let tests = await Test.find(filter).sort({ seriesNumber: 1 }).lean();
  check("the first step builds test #1", tests.length === 1 && tests[0].seriesNumber === 1, r);
  check("...a full, sound test goes live by itself", tests[0].publishStatus === "published");
  check("...and the next step is queued", (await queuedSteps()) === 1 && /1 of 10 tests live/.test(r), r);

  // ---- a short build is filled first, then goes live
  nextSize = 12;
  await GenerationJob.updateMany({ kind: "practice_series" }, { $set: { status: "done" } });
  r = await series.fillSeriesStep(params);
  tests = await Test.find(filter).sort({ seriesNumber: 1 }).lean();
  check("a short test (12 of 20) stays a draft", tests[1].questions.length === 12 && tests[1].publishStatus === "draft", r);
  nextSize = 20;
  await GenerationJob.updateMany({ kind: "practice_series" }, { $set: { status: "done" } });
  r = await series.fillSeriesStep(params);
  tests = await Test.find(filter).sort({ seriesNumber: 1 }).lean();
  check("...the next step fills it rather than starting a new test", tests.length === 2 && tests[1].questions.length === 20, r);
  check("...and then it goes live", tests[1].publishStatus === "published");

  // ---- a full test with two questions asking the same thing is held back
  const twinText = (await Question.findById(tests[1].questions[0]).lean()).text;
  const twin = await Question.create({ text: twinText.replace("How much is that?", "How much is that ?"), options: ["1", "2", "3", "4"], correctIndex: 0, solution: "x", subject: "Maths", topic: "Percentage", examType: ["SSC_CGL"], source: "manual", status: "published" });
  const held = await Test.create({ title: "held", type: "practice", examType: "PRACTICE", subject: "Maths", topic: "Percentage", subtopic: params.subtopic, difficultyLevel: "easy", seriesNumber: 99, questions: [...tests[1].questions.slice(0, 19), twin._id], durationMinutes: 20, publishStatus: "draft" });
  check("a full test with two questions asking the same thing does not go live", /same thing/.test(await series.notReady(held)) && !(await series.publishIfReady(held)));
  await Test.deleteOne({ _id: held._id });

  // ---- the allowance runs out on a short test: the queue's own message
  nextSize = 10;
  await GenerationJob.updateMany({ kind: "practice_series" }, { $set: { status: "done" } });
  await series.fillSeriesStep(params);
  refillMode = "allowance";
  let threw = "";
  try { await series.fillSeriesStep(params); } catch (e) { threw = e.message; }
  check("out of allowance: the step throws the allowance message (the job is put back)", /Every model has used its allowance/.test(threw), threw);
  refillMode = "stuck";
  threw = "";
  try { await series.fillSeriesStep(params); } catch (e) { threw = e.message; }
  check("a test that cannot be filled stops the series instead of looping", /Could not fill/.test(threw), threw);
  refillMode = "fill";
  nextSize = 20;

  // ---- to the end: 10 tests, all live, nothing more queued
  for (let i = 0; i < 12; i++) {
    await GenerationJob.updateMany({ kind: "practice_series" }, { $set: { status: "done" } });
    r = await series.fillSeriesStep(params);
    if (/Series complete/.test(r)) break;
  }
  tests = await Test.find(filter).lean();
  check("the series ends at 10 tests", tests.length === 10, `${tests.length}`);
  check("...all 20 questions and live", tests.every((t) => t.questions.length === 20 && t.publishStatus === "published"));
  check("...and no further step is queued", (await queuedSteps()) === 0 && /Series complete: 10 of 10 tests live/.test(r), r);

  // ---- a failing build is a job failure, not a silent stop
  buildError = "No questions were generated (rate limit or API issue). Wait a minute and try again.";
  threw = "";
  try { await series.fillSeriesStep({ ...params, difficulty: "medium" }); } catch (e) { threw = e.message; }
  check("a build that fails throws (the queue retries it)", /No questions were generated/.test(threw));
  buildError = null;

  // ---- the allowance pause lifts itself after the reset; an admin's pause does not
  const { runGenerationTick } = require(path.join(SERVER, "jobs/generationWorker"));
  await QueueState.updateOne({ key: "generation" }, { $set: { paused: true, pausedBy: "worker", pausedReason: "The day's AI allowance is used up.", resumableAfter: new Date(Date.now() - 60000) } }, { upsert: true });
  await runGenerationTick().catch(() => {});
  check("an allowance pause lifts itself once the allowance has reset", (await QueueState.findOne({ key: "generation" }).lean()).paused === false);
  await QueueState.updateOne({ key: "generation" }, { $set: { paused: true, pausedBy: "admin", pausedReason: "Paused by the admin" }, $unset: { resumableAfter: "" } });
  await runGenerationTick().catch(() => {});
  check("...an admin's pause stays", (await QueueState.findOne({ key: "generation" }).lean()).paused === true);

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
