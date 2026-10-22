// The Daily GK Quiz kept 4 days ahead (services/dailyQuiz.js runDailyQuizTick):
// the coming days are queued for the AI even while it is down, a faulty AI
// quiz is mended from the bank by itself, a failed day is retried after a
// pause, tomorrow falls back to the bank in the evening, and an AI failure
// never spoils a ready backup. In-process, throwaway in-memory MongoDB; the
// AI is never called.
//
//   node tests/daily-quiz-ahead-test.cjs
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `   [${detail}]` : ""}`);
};
const letters = (i) => { let s = ""; i += 1; while (i > 0) { s = String.fromCharCode(97 + ((i - 1) % 26)) + s; i = Math.floor((i - 1) / 26); } return s; };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "daily_quiz_ahead");
  const Question = require(path.join(SERVER, "models/Question"));
  const Test = require(path.join(SERVER, "models/Test"));
  const GenerationJob = require(path.join(SERVER, "models/GenerationJob"));
  const QueueState = require(path.join(SERVER, "models/QueueState"));
  const { DailyQuiz } = require(path.join(SERVER, "models/DailyQuiz"));
  const dq = require(path.join(SERVER, "services/dailyQuiz"));

  // 300 GK questions, each about its own made-up place, with its own answer.
  const gk = (i, extra = {}) => ({
    text: `Which river flows past the old town of Zor${letters(i)}vale in the north?`,
    options: [`Ans${letters(i)}`, `Opt${letters(i)}b`, `Opt${letters(i)}c`, `Opt${letters(i)}d`],
    correctIndex: 0, solution: "From the gazetteer.", subject: "GK", topic: ["History", "Geography", "Polity", "Science"][i % 4],
    examType: ["DAILY_GK"], source: "ai_generated", status: "published", ...extra,
  });
  await Question.insertMany(Array.from({ length: 300 }, (_, i) => gk(i)));

  // "Now" is noon IST today; the coming days follow from it.
  const today = dq.istDateKey();
  const noon = new Date(`${today}T12:00:00+05:30`);
  const day = (d) => dq.istDateKey(noon, d);

  const settings = await dq.getSettings();
  check("a new install keeps 4 days ahead", settings.daysAhead === 4, `${settings.daysAhead}`);
  await settings.updateOne({ $set: { autoAI: true, autoFromBank: true } });

  // ---- the coming days are queued for the AI
  let r = await dq.runDailyQuizTick({ now: noon });
  check("the next 4 days are queued for the AI", JSON.stringify(r.queued) === JSON.stringify([day(1), day(2), day(3), day(4)]), JSON.stringify(r));
  check("...and today is covered from the bank", (await DailyQuiz.findOne({ date: today }).lean())?.status === "ready");
  check("...one job per day", (await GenerationJob.countDocuments({ kind: "daily_quiz" })) === 4);
  r = await dq.runDailyQuizTick({ now: noon });
  check("a second tick queues nothing twice", r.queued.length === 0 && (await GenerationJob.countDocuments({ kind: "daily_quiz" })) === 4);

  // ---- the AI's quiz for day 1 came out with two questions asking the same thing
  const twinA = await Question.create(gk(1000));
  const twinB = await Question.create(gk(1000, { text: "Which river flows past the old town of Zoralmvale in the north, as per the gazetteer?" }));
  const others = (await Question.find({ subject: "GK" }).skip(100).limit(18).lean()).map((q) => q._id);
  const aiIds = [twinA._id, twinB._id, ...others];
  const t1 = await Test.create({ title: "Daily GK Quiz", type: "revision", examType: "DAILY_GK", subject: "GK", questions: aiIds, durationMinutes: 20, dailyQuizDate: day(1), publishStatus: "published" });
  await DailyQuiz.updateOne({ date: day(1) }, { $set: { test: t1._id, status: "draft", source: "ai", preparedBy: "auto", lastError: "2 pair(s)..." } });
  await GenerationJob.updateOne({ quizDate: day(1) }, { $set: { status: "done" } });
  check("(the AI quiz really has a fault)", (await dq.quizProblems(await Test.findById(t1._id), day(1))).some((p) => /same thing/.test(p)));

  r = await dq.runDailyQuizTick({ now: noon });
  const q1 = await DailyQuiz.findOne({ date: day(1) }).lean();
  const t1b = await Test.findById(q1.test).lean();
  check("a faulty AI quiz is mended by itself and goes live", r.repaired.includes(day(1)) && q1.status === "ready", JSON.stringify(r));
  check("...with no fault left", (await dq.quizProblems(t1b, day(1))).length === 0);
  check("...keeping the AI's sound questions (only the twin swapped)", aiIds.filter((id) => t1b.questions.map(String).includes(String(id))).length === 19);
  check("...and is still counted as the AI's quiz", q1.source === "ai");

  // ---- the AI failed on day 2 (Gemini down): retried after a pause, not every tick
  await GenerationJob.updateOne({ quizDate: day(2) }, { $set: { status: "failed", lastError: "503 Service Unavailable" } });
  await DailyQuiz.updateOne({ date: day(2) }, { $set: { status: "draft", lastError: "503" } });
  r = await dq.runDailyQuizTick({ now: new Date(Date.now() + 10 * 60 * 1000) });
  check("a day the AI just failed is not retried at once", !r.queued.includes(day(2)), JSON.stringify(r.queued));
  r = await dq.runDailyQuizTick({ now: new Date(Date.now() + 31 * 60 * 1000) });
  check("...it is retried after 30 minutes", r.queued.includes(day(2)), JSON.stringify(r.queued));

  // ---- with the queue paused (allowance spent), a missed day is still queued
  await QueueState.updateOne({ key: "generation" }, { $set: { paused: true } }, { upsert: true });
  await GenerationJob.deleteMany({ quizDate: day(3) });
  await DailyQuiz.deleteMany({ date: day(3) });
  r = await dq.runDailyQuizTick({ now: noon });
  check("a missed day is queued even while the AI is paused, to run when it is back", r.queued.includes(day(3)), JSON.stringify(r.queued));
  await QueueState.updateOne({ key: "generation" }, { $set: { paused: false } });

  // ---- tomorrow still not ready in the evening: made from the bank
  await DailyQuiz.deleteMany({ date: day(1) });
  await Test.deleteMany({ dailyQuizDate: day(1) });
  await GenerationJob.updateMany({ quizDate: day(1) }, { $set: { status: "queued" } });
  r = await dq.runDailyQuizTick({ now: noon });
  check("at noon, tomorrow still waits for the AI", !r.backup.includes(day(1)) && !(await DailyQuiz.findOne({ date: day(1), status: "ready" })));
  const evening = new Date(`${today}T19:00:00+05:30`);
  r = await dq.runDailyQuizTick({ now: evening });
  const back = await DailyQuiz.findOne({ date: day(1) }).lean();
  check("from 6 PM, tomorrow is made from the bank", r.backup.includes(day(1)) && back?.status === "ready", JSON.stringify(r));
  check("...a complete, sound quiz", (await dq.quizProblems(await Test.findById(back.test), day(1))).length === 0);

  // ---- the AI failing afterwards does not spoil that backup
  const factory = require(path.join(SERVER, "services/questionFactory"));
  const real = factory.createVerifiedQuestions;
  factory.createVerifiedQuestions = async () => { throw new Error("503 Service Unavailable"); };
  let threw = false;
  try { await dq.generateQuizWithAI(day(1)); } catch { threw = true; }
  factory.createVerifiedQuestions = real;
  check("an AI failure leaves the ready backup live", threw && (await DailyQuiz.findOne({ date: day(1) }).lean()).status === "ready");

  // ---- a quiz the admin is preparing by hand is left alone
  const t4 = await Test.create({ title: "x", type: "revision", examType: "DAILY_GK", subject: "GK", questions: [twinA._id, twinB._id], durationMinutes: 20, dailyQuizDate: day(4) });
  await DailyQuiz.updateOne({ date: day(4) }, { $set: { test: t4._id, status: "draft", preparedBy: "Admin" } }, { upsert: true });
  await GenerationJob.updateMany({ quizDate: day(4) }, { $set: { status: "done" } });
  r = await dq.runDailyQuizTick({ now: noon });
  check("an admin's draft is not touched", !r.repaired.includes(day(4)) && (await Test.findById(t4._id).lean()).questions.length === 2);

  // ---- AI off: every coming day comes from the bank
  await settings.updateOne({ $set: { autoAI: false } });
  await DailyQuiz.deleteMany({ date: { $in: [day(2), day(3)] } });
  await GenerationJob.deleteMany({ quizDate: { $in: [day(2), day(3)] } });
  r = await dq.runDailyQuizTick({ now: noon });
  check("with the AI off, the coming days are made from the bank", r.backup.includes(day(2)) && r.backup.includes(day(3)), JSON.stringify(r));
  const used = new Set();
  let clash = 0;
  for (const t of await Test.find({ dailyQuizDate: { $in: [today, day(1), day(2), day(3)] } }).lean()) for (const id of t.questions.map(String)) { if (used.has(id)) clash++; used.add(id); }
  check("...no question is in two of those quizzes", clash === 0, `${clash}`);

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
