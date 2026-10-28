// Named chart sets and passage sets (ExamPattern section.chartSets /
// section.passageSets), built for UPSSSC PET: four DI sets of five, and two
// Hindi passages of five. An exam that names neither must build exactly as
// before - one chart set per chart chapter, no passage sets.
// Runs the real server against a throwaway in-memory MongoDB, Gemini stubbed.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const STUB = path.join(__dirname, "mock-stub.cjs");
const CALLS = path.join(__dirname, "gen-calls.jsonl");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5071;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};
let token = "";
async function api(method, p, body) {
  const res = await fetch(BASE + p, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "pet_sets_test";
  const srv = spawn(process.execPath, ["-r", STUB, "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT), GEMINI_PAUSE_MS: "1", GEMINI_API_KEY: "",
      TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
      EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", ALLOWED_ORIGINS: "",
    },
  });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 240 && !/Server running/.test(log); i++) await sleep(250);
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }
  fs.writeFileSync(CALLS, "");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  await api("POST", "/subjects", { name: "Maths", displayOrder: 1, chapters: [
    { name: "Percentage", topics: ["Percentage"], exams: ["UPSSSC_PET", "RRB_GROUP_D"] },
    { name: "Data Interpretation", topics: ["Tabulation", "Bar Graph", "Pie Chart"], exams: ["UPSSSC_PET", "RRB_GROUP_D"], visual: "chart" },
  ] });

  // PET-like: Maths with four named chart sets; a Hindi passage section of two sets.
  let r = await api("POST", "/exams", {
    examType: "UPSSSC_PET", displayName: "UPSSSC PET", durationMinutes: 120,
    sections: [
      { subject: "Maths", questionCount: 25, difficultyMix: { easy: 40, medium: 40, hard: 20 },
        syllabus: [{ topic: "Data Interpretation" }, { topic: "Percentage" }], chartSets: ["table", "table", "pie", "bar"] },
      { subject: "अपठित गद्यांश", questionCount: 10, difficultyMix: { easy: 50, medium: 50, hard: 0 },
        syllabus: [{ topic: "अपठित गद्यांश" }], passageSets: { count: 2, perPassage: 5 } },
    ],
  });
  check("a pattern with chart and passage sets saves", r.status === 201 || r.status === 200, `${r.status} ${r.json.message || ""}`);
  const saved = await db.collection("exampatterns").findOne({ examType: "UPSSSC_PET" });
  check("...and keeps both settings", saved.sections[0].chartSets?.join() === "table,table,pie,bar" && saved.sections[1].passageSets?.count === 2, JSON.stringify(saved.sections.map((s) => [s.chartSets, s.passageSets])));

  // Control: same Maths section, no settings - as every other exam.
  await api("POST", "/exams", {
    examType: "RRB_GROUP_D", displayName: "RRB Group D", durationMinutes: 60,
    sections: [{ subject: "Maths", questionCount: 25, difficultyMix: { easy: 40, medium: 40, hard: 20 }, syllabus: [{ topic: "Data Interpretation" }, { topic: "Percentage" }] }],
  });

  const load = async (id) => {
    const t = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(id) });
    const qs = await db.collection("questions").find({ _id: { $in: t.questions } }).toArray();
    const by = new Map(qs.map((q) => [String(q._id), q]));
    return { t, qs: t.questions.map((i) => by.get(String(i))) };
  };

  // ---- PET mock
  r = await api("POST", "/exam-series/UPSSSC_PET/generate-mock");
  check("PET mock generated", r.status === 201, `${r.status} ${r.json.message || ""}`);
  const pet = await load(r.json.test._id);
  check("PET mock is full (35)", pet.qs.length === 35, `${pet.qs.length}`);
  const maths = pet.qs.filter((q) => q.subject === "Maths");
  const charts = maths.filter((q) => q.visual?.kind === "chart");
  const sets = new Set(charts.map((q) => q.visual.setId));
  check("Maths has 20 chart questions", charts.length === 20, `${charts.length}`);
  check("...in 4 sets", sets.size === 4, `${sets.size}`);
  check("...and 5 other questions", maths.length - charts.length === 5, `${maths.length - charts.length}`);
  const calls = fs.readFileSync(CALLS, "utf8").split("\n").filter(Boolean).map(JSON.parse);
  const petChartCalls = calls.filter((c) => c.visual === "chart" && c.subject === "Maths").map((c) => c.chartType);
  check("each set was asked for its own chart type", petChartCalls.join() === "table,table,pie,bar", petChartCalls.join());
  const textCalls = calls.filter((c) => !c.visual && !c.passageSet && c.subject === "Maths");
  check("text questions are not asked for Data Interpretation", textCalls.every((c) => !c.syllabusTopics.some((t) => (t.topic || t) === "Data Interpretation")), JSON.stringify(textCalls.map((c) => c.syllabusTopics)));
  // Each chart set sits together.
  const runs = (list, key) => {
    let breaks = 0;
    for (let i = 1; i < list.length; i++) if (key(list[i]) && key(list[i - 1]) !== key(list[i]) && list.slice(0, i - 1).some((x) => key(x) === key(list[i]))) breaks++;
    return breaks;
  };
  check("the 5 questions of a chart set stay together", runs(maths, (q) => q.visual?.setId) === 0);

  const pas = pet.qs.filter((q) => q.subject === "अपठित गद्यांश");
  const pSets = new Set(pas.map((q) => q.passageSetId).filter(Boolean));
  check("passage section: 10 questions", pas.length === 10, `${pas.length}`);
  check("...on 2 passages of 5", pSets.size === 2 && [...pSets].every((id) => pas.filter((q) => q.passageSetId === id).length === 5), `${pSets.size}`);
  check("...each question shows its passage", pas.every((q) => /गद्यांश \d+: /.test(q.text) && /निर्देश/.test(q.text)));
  check("...siblings were not thrown out as repeats of each other", pas.every((q) => q.source === "ai_generated"));
  check("...and a set's questions stay together", runs(pas, (q) => q.passageSetId) === 0);

  // ---- control exam: exactly as before
  fs.writeFileSync(CALLS, "");
  r = await api("POST", "/exam-series/RRB_GROUP_D/generate-mock");
  const rrb = await load(r.json.test._id);
  const rrbCharts = rrb.qs.filter((q) => q.visual?.kind === "chart");
  check("an exam without the settings: full mock", rrb.qs.length === 25, `${rrb.qs.length}`);
  check("...one chart set of 5, as before", rrbCharts.length === 5 && new Set(rrbCharts.map((q) => q.visual.setId)).size === 1, `${rrbCharts.length}`);
  const rrbCalls = fs.readFileSync(CALLS, "utf8").split("\n").filter(Boolean).map(JSON.parse);
  check("...no chart type forced and no passage set asked for", rrbCalls.every((c) => !c.chartType && !c.passageSet));
  check("...no question carries a passage set", rrb.qs.every((q) => !q.passageSetId));

  // ---- refill: a removed chart question and a removed passage set come back as sets
  const petTest = pet.t;
  const dropIds = [...charts.filter((q) => q.visual.setId === [...sets][0]).map((q) => q._id), ...pas.filter((q) => q.passageSetId === [...pSets][0]).map((q) => q._id)];
  await db.collection("tests").updateOne({ _id: petTest._id }, { $pull: { questions: { $in: dropIds } } });
  // In this process, with the same stubbed model as the server.
  require(STUB);
  const { refillTest } = require(path.join(SERVER, "services/testTopUp"));
  const rf = await refillTest(petTest._id);
  const after = await load(String(petTest._id));
  const aCharts = after.qs.filter((q) => q.subject === "Maths" && q.visual?.kind === "chart");
  const aPas = after.qs.filter((q) => q.subject === "अपठित गद्यांश");
    check("refill: back to 35", after.qs.length === 35, `${after.qs.length} ${rf.why || ""}`);
  check("...4 chart sets again", new Set(aCharts.map((q) => q.visual.setId)).size === 4 && aCharts.length === 20, `${aCharts.length}`);
  check("...2 passage sets again", new Set(aPas.map((q) => q.passageSetId)).size === 2 && aPas.length === 10, `${aPas.length}`);


  srv.kill();
  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
