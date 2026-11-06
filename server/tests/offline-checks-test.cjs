// Clearing AI quality-check jobs without the AI (services/offlineChecks.js),
// against a throwaway in-memory MongoDB.
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));

const results = [];
const check = (name, cond, detail = "") => { results.push({ ok: !!cond }); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`); };

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "offline_checks");
  const Question = require(path.join(SERVER, "models/Question"));
  const GenerationJob = require(path.join(SERVER, "models/GenerationJob"));
  const QualityFix = require(path.join(SERVER, "models/QualityFix"));
  const offline = require(path.join(SERVER, "services/offlineChecks"));

  const mk = (text, extra = {}) => Question.create({
    text, options: ["12", "14", "16", "18"], correctIndex: 1, solution: "7 + 7 = 14, so the answer is 14.",
    textHi: `${text} (हिंदी)`, optionsHi: ["12", "14", "16", "18"], solutionHi: "7 + 7 = 14, अतः उत्तर 14 है।",
    subject: "Maths", topic: "Algebra", chapter: "Algebra", difficulty: "easy", status: "published", source: "manual", ...extra,
  });
  const q1 = await mk("If x + 1/x = 7, what is the value of the sum asked here, question one?");
  const q2 = await mk("Find the value of 7 + 7 for the second question of this set.");
  const q3 = await mk("Find the value of 7 + 7 for the second question in this set.");
  const job = await GenerationJob.create({ kind: "quality_check", questionIds: [q1._id, q2._id, q3._id], source: "csv", label: "AI check of 3 uploaded question(s)", status: "queued" });
  const other = await GenerationJob.create({ kind: "practice", label: "Practice test", status: "queued" });

  const sum = await offline.summary();
  check("summary counts waiting jobs by kind", sum.find((r) => r.kind === "quality_check").questions === 3 && sum.some((r) => r.kind === "practice"), JSON.stringify(sum));

  const list = await offline.listChecks({ limit: 10 });
  check("list gives the job with its questions", list.length === 1 && list[0].questions.length === 3 && list[0].questions[0].options.length === 4);

  // two verdicts only: the job keeps waiting for the third
  let r = await offline.resolveChecks([{ job: job._id, answers: [{ question: q1._id, verdict: "sound" }, { question: q2._id, verdict: "wrong", problem: "7 + 7 is 14 but the key says 16" }] }]);
  let j = await GenerationJob.findById(job._id);
  check("a job with questions left keeps waiting for them", j.status === "queued" && j.questionIds.length === 1 && r[0].waiting === 1, JSON.stringify(r));
  check("a question called wrong is flagged for the admin", (await QualityFix.countDocuments({ question: q2._id, kind: "flag", status: "pending" })) === 1);
  check("a sound question is not flagged", (await QualityFix.countDocuments({ question: q1._id })) === 0);
  check("nothing about the question itself is changed", (await Question.findById(q2._id)).correctIndex === 1 && (await Question.findById(q2._id)).status === "published");

  r = await offline.resolveChecks([{ job: job._id, answers: [{ question: q3._id, verdict: "sound" }] }]);
  j = await GenerationJob.findById(job._id);
  check("the job is done once every question has a verdict", j.status === "done" && /without the AI/.test(j.result), j.result);
  check("a repeat in the chapter is still flagged even when called sound", (await QualityFix.countDocuments({ question: q3._id, kind: "flag" })) === 1);
  check("other kinds of jobs are left alone", (await GenerationJob.findById(other._id)).status === "queued");

  r = await offline.resolveChecks([{ job: job._id, answers: [] }]);
  check("a finished job is not touched again", r[0].skipped);

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
