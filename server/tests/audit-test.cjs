// Proves the audit script does what it says: reports without touching
// anything, and on --apply flags the bad questions, leaves live tests alone
// unless told otherwise, and never deletes a question.
const path = require("path");
const { spawnSync } = require("child_process");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

const good = (n) => ({
  text: `A proper question number ${n} about ratios and percentages`,
  textHi: `सही प्रश्न ${n} अनुपात और प्रतिशत पर`,
  options: [`opt a ${n}`, `opt b ${n}`, `opt c ${n}`, `opt d ${n}`],
  optionsHi: [`विकल्प अ ${n}`, `विकल्प ब ${n}`, `विकल्प स ${n}`, `विकल्प द ${n}`],
  correctIndex: 0,
  solution: "Solve the ratio step by step and the first option is the answer.",
  solutionHi: "अनुपात को चरण दर चरण हल करें, पहला विकल्प उत्तर है।",
  subject: "Maths",
  topic: "Percentage",
  examType: ["PRACTICE"],
  source: "ai_generated",
  status: "published",
  createdAt: new Date(2026, 0, n),
});

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "audit_test";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const docs = [
    good(1),
    good(2),
    { ...good(3), textHi: "", optionsHi: [], solutionHi: "" },        // no Hindi
    { ...good(4), solution: "yes" },                                   // solution says nothing
    { ...good(5), options: ["same", "same", "c", "d"] },               // duplicate options
    { ...good(6), correctIndex: null },                                // no answer key (PYQ leftovers)
    { ...good(7), text: good(1).text },                                // a repeat of question 1
  ];
  const inserted = await db.collection("questions").insertMany(docs);
  const ids = Object.values(inserted.insertedIds);

  await db.collection("tests").insertMany([
    { title: "Draft test", type: "practice", examType: "PRACTICE", publishStatus: "draft", questions: ids, durationMinutes: 20 },
    { title: "LIVE test", type: "practice", examType: "PRACTICE", publishStatus: "published", questions: ids, durationMinutes: 20 },
  ]);

  const run = (args) =>
    spawnSync(process.execPath, ["scripts/auditQuestions.js", ...args], {
      cwd: SERVER,
      encoding: "utf8",
      env: { ...process.env, MONGO_URI: uri },
    });

  // ---- report only
  let r = run([]);
  const out = (r.stdout || "") + (r.stderr || "");
  check("the audit runs", r.status === 0, out.split("\n").slice(-3).join(" ").slice(0, 120));
  check("it says plainly that nothing was changed", /Nothing was changed/.test(out));
  check("it counts the bad questions", /questions that would be flagged\s+5/.test(out), (out.match(/questions that would be flagged.*/) || [])[0]);
  check("it counts the clean ones", /questions that are clean\s+2/.test(out), (out.match(/questions that are clean.*/) || [])[0]);
  check("it names the reasons", /Hindi question missing/.test(out) && /solution too short/.test(out) && /duplicate of an earlier question/.test(out));
  check("it warns which LIVE tests would change", /LIVE for students\s+1/.test(out), (out.match(/LIVE for students.*/) || [])[0]);

  let stillPublished = await db.collection("questions").countDocuments({ status: "published" });
  check("a report-only run really changes nothing", stillPublished === 7, `${stillPublished} still published`);

  // ---- apply (drafts only)
  r = run(["--apply"]);
  const applied = (r.stdout || "") + (r.stderr || "");
  check("apply runs", r.status === 0, applied.split("\n").slice(-3).join(" ").slice(0, 120));

  const flagged = await db.collection("questions").find({ status: "under_review" }).toArray();
  check("the 5 bad questions are now in the review queue", flagged.length === 5, `${flagged.length}`);
  check("each carries the reason it was flagged", flagged.every((q) => /^Audit: /.test(q.flagReason || "")),
    flagged.map((q) => q.flagReason).slice(0, 2).join(" | "));
  check("nothing was deleted", (await db.collection("questions").countDocuments()) === 7);
  check("every question now has a comparison key", (await db.collection("questions").countDocuments({ textKey: { $exists: true, $ne: null } })) === 7);

  const draft = await db.collection("tests").findOne({ title: "Draft test" });
  const live = await db.collection("tests").findOne({ title: "LIVE test" });
  check("the draft test keeps only the clean questions", draft.questions.length === 2, `${draft.questions.length}`);
  check("the LIVE test is left alone until you say so", live.questions.length === 7, `${live.questions.length}`);

  // ---- apply to live tests too
  r = run(["--apply", "--published-too"]);
  const live2 = await db.collection("tests").findOne({ title: "LIVE test" });
  check("with --published-too the live test is cleaned as well", live2.questions.length === 2, `${live2.questions.length}`);
  check("...and still nothing is deleted", (await db.collection("questions").countDocuments()) === 7);

  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
