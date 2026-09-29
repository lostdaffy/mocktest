// A Percentage question generated once should count for every exam that asks
// for Percentage. It used to be stamped examType: ["PRACTICE"] - a value no
// exam and no student ever matches.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5062;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");
const CALLS = path.join(__dirname, "gen-calls.jsonl");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

async function api(method, p, { body, token } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  try { fs.unlinkSync(CALLS); } catch {}
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "practice_tag_test";
  const srv = spawn(process.execPath, ["-r", STUB, "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT),
      TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
      EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "",
      ALLOWED_ORIGINS: "", PRACTICE_GEN_GAP_MS: "0",
    },
  });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await new Promise((r) => setTimeout(r, 250));
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  // Two exams, and a catalog where one chapter is shared and one is not.
  for (const e of ["SSC_CGL", "AGNIVEER_GD", "BANKING"]) {
    await db.collection("exampatterns").insertOne({
      examType: e, displayName: e, durationMinutes: 60, isActive: true,
      sections: [{ subject: "Maths", questionCount: 5, difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
    });
  }
  await db.collection("subjects").insertOne({
    name: "Maths", nameHi: "गणित", isActive: true, displayOrder: 1, aliases: ["Quant"],
    chapters: [
      { name: "Percentage", topics: ["Percentage"], category: "अंकगणित", exams: ["SSC_CGL", "AGNIVEER_GD", "BANKING"] },
      { name: "Coordinate Geometry", topics: ["Coordinate Geometry"], category: "ज्यामिति", exams: ["SSC_CGL"] },
      { name: "Untagged Chapter", topics: ["Untagged Topic"], category: "अंकगणित" }, // no exams listed
      // The shape that broke 10 of the catalog's 56 chapters: more than one topic.
      { name: "Simple & Compound Interest", topics: ["Simple Interest", "Compound Interest"], category: "अंकगणित", exams: ["SSC_CGL", "BANKING"] },
    ],
  });

  const generated = async (chapter, topics) => {
    const r = await api("POST", "/exam-series/practice/generate", {
      token, body: { subject: "Maths", chapter, topics, difficulty: "easy" },
    });
    if (r.status !== 201 && r.status !== 200) return { r, qs: [] };
    const qs = await db.collection("questions").find({ chapter }).toArray();
    return { r, qs };
  };

  // ---- a chapter every exam asks for
  let { r, qs } = await generated("Percentage", ["Percentage"]);
  check("a practice test is generated", r.status === 201 || r.status === 200, `${r.status} ${r.json.message || ""}`);
  check("questions were saved for that chapter", qs.length > 0, `${qs.length} questions`);
  check("they are NOT tagged with the made-up \"PRACTICE\" exam",
    qs.every((q) => !q.examType.includes("PRACTICE")), JSON.stringify(qs[0]?.examType));
  check("...they carry every exam the chapter belongs to",
    qs.every((q) => ["SSC_CGL", "AGNIVEER_GD", "BANKING"].every((e) => q.examType.includes(e))),
    JSON.stringify(qs[0]?.examType));
  check("the chapter is recorded on each question", qs.every((q) => q.chapter === "Percentage"));

  // ---- a chapter only one exam asks for
  ({ qs } = await generated("Coordinate Geometry", ["Coordinate Geometry"]));
  check("a chapter only SSC asks for is tagged only to SSC",
    qs.length > 0 && qs.every((q) => q.examType.join(",") === "SSC_CGL"), JSON.stringify(qs[0]?.examType));

  // ---- a chapter nobody tagged
  ({ qs } = await generated("Untagged Chapter", ["Untagged Topic"]));
  check("an untagged chapter's questions go to every configured exam",
    qs.length > 0 && ["SSC_CGL", "AGNIVEER_GD", "BANKING"].every((e) => qs[0].examType.includes(e)),
    JSON.stringify(qs[0]?.examType));

  // ---- the model is told who it is writing for
  const calls = fs.readFileSync(CALLS, "utf8").trim().split("\n").map(JSON.parse);
  check("Gemini is told the chapter's topics, not just its name",
    calls.some((c) => (c.syllabusTopics || []).includes("Percentage")),
    JSON.stringify(calls[0]?.syllabusTopics));

  // ---- and the payoff: a student's own exam now matches
  const student = await db.collection("users").insertOne({
    name: "S", phone: "9000000123", role: "student", referralCode: "S1", activeSessionId: "x",
    examGoals: ["AGNIVEER_GD"], selectedSubjects: [],
    subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 86400e3 * 100),
    freeUsage: { mockTestsUsed: 0, liveExamsUsed: 0, pyqUsed: 0 },
  });
  await db.collection("questions").updateMany({ chapter: "Percentage" }, { $set: { status: "published", difficulty: "easy" } });
  const sToken = jwt.sign({ id: student.insertedId.toString(), sessionId: "x" }, JWT_SECRET);
  r = await api("POST", "/subjects/chapter-test", { token: sToken, body: { subject: "Maths", chapter: "Percentage" } });
  check("an Agniveer student's practice now finds these questions by their own exam",
    r.status === 201 && r.json.test.questions.length > 0,
    `${r.status} ${r.json.test?.questions?.length || 0} questions`);

  // ---- a chapter with more than one topic
  ({ qs } = await generated("Simple & Compound Interest", ["Simple Interest", "Compound Interest"]));
  const topicsUsed = [...new Set(qs.map((q) => q.topic))].sort();
  check("a two-topic chapter never stamps the joined string on a question",
    qs.length > 0 && !qs.some((q) => q.topic.includes(", ")), topicsUsed.join(" | "));
  check("...every question carries one of the real topics",
    qs.every((q) => ["Simple Interest", "Compound Interest"].includes(q.topic)), topicsUsed.join(" | "));
  check("...and both topics are actually used", topicsUsed.length === 2, topicsUsed.join(" | "));

  await db.collection("questions").updateMany({ chapter: "Simple & Compound Interest" }, { $set: { status: "published", difficulty: "easy" } });
  r = await api("POST", "/subjects/chapter-test", { token: sToken, body: { subject: "Maths", chapter: "Simple & Compound Interest" } });
  check("...so the chapter is not empty on a student's screen",
    r.status === 201 && r.json.test.questions.length > 0,
    r.status + " " + (r.json.test?.questions?.length || 0) + " questions");

  // ---- the generator must be told what this topic already has
  //
  // Generating Percentage at medium and then at hard produced the same two
  // questions in both tests - same numbers, same answer, reworded just
  // enough to slip past the exact-text duplicate check. Every call started
  // blind; now each one is handed what the bank already holds.
  fs.writeFileSync(CALLS, "");
  await generated("Percentage", ["Percentage"]);
  const later = fs.readFileSync(CALLS, "utf8").trim().split(String.fromCharCode(10)).map(JSON.parse);
  const avoided = later[0] && later[0].avoidTexts;
  check("a second run is told what the topic already has",
    Array.isArray(avoided) && avoided.length > 0, (avoided || []).length + " already-asked questions passed in");
  const bankTexts = new Set((await db.collection("questions").find({ chapter: "Percentage" }).toArray()).map((q) => q.text));
  check("...and every one of them is a question really in the bank",
    (avoided || []).length > 0 && avoided.every((t) => bankTexts.has(t)),
    (avoided || []).filter((t) => !bankTexts.has(t)).length + " not from the bank");

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
