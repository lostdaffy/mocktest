// End-to-end: does a doubtful question actually stay OUT of a student's
// test? Runs the real server and the real validation pipeline against a
// fake model that deliberately produces some bad questions.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5059;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

let token = "";
async function api(method, p, body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "quality_gate_test";
  const srv = spawn(process.execPath, ["-r", path.join(__dirname, "fake-model-stub.cjs"), "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT),
      GEMINI_API_KEY: "fake-key", GEMINI_MIN_GAP_MS: "1", GEMINI_PAUSE_MS: "1",
      TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
      EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", ALLOWED_ORIGINS: "",
    },
  });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await new Promise((r) => setTimeout(r, 250));
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }
  check("fake model installed", /\[stub\]/.test(log));

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9999999999", role: "admin", referralCode: "ADM" });
  token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  await db.collection("subjects").insertOne({
    name: "Maths", icon: "📐", isActive: true, displayOrder: 1,
    chapters: [{ name: "Percentage", topics: ["Basics", "Profit link"] }],
  });

  // ---- build a practice test with the real pipeline
  const r = await api("POST", "/exam-series/practice/generate", {
    subject: "Maths", chapter: "Percentage", topics: ["Basics", "Profit link"], difficulty: "easy",
  });
  check("practice test built", r.status === 201, `${r.status} ${r.json.message || ""}`);
  check("the admin is told what happened to the rest",
    /discarded|repaired|repeats/.test(r.json.message || ""), r.json.message);

  const test = await db.collection("tests").findOne({ type: "practice" });
  const inTest = await db.collection("questions").find({ _id: { $in: test.questions } }).toArray();
  const all = await db.collection("questions").find({}).toArray();

  check("the test is not empty", inTest.length > 0, `${inTest.length} questions`);
  check("EVERY question in the test passed verification", inTest.every((q) => q.status === "published"),
    inTest.filter((q) => q.status !== "published").map((q) => q.status).join(","));

  // the three kinds of bad question the fake model produced
  const inTestText = inTest.map((q) => q.text).join(" | ");
  check("a question with no Hindi never reaches a student", !/NOHINDI/.test(inTestText));
  check("a question with a one-word solution never reaches a student", !/SHORTSOL/.test(inTestText));
  check("a question whose answer key the AI disputes never reaches a student", !/TRICKY/.test(inTestText));

  // ---- nothing is parked for a human to deal with
  //
  // A review queue nobody works through is worse than no queue: the real
  // problems get lost among questions that were fine all along. Bad ones are
  // deleted and replaced, and the test still comes out full.
  const parked = all.filter((q) => q.status !== "published");
  check("nothing is left sitting in a review queue", parked.length === 0, `${parked.length} parked`);
  check("the test is FULL, not short of its target", test.questions.length === 12, `${test.questions.length} questions`);

  // ---- but every deletion leaves a note, so a broken gate is visible
  const rejects = await db.collection("rejectedquestions").find({}).toArray();
  check("what was thrown away is recorded", rejects.length > 0, `${rejects.length} recorded`);
  check("...each with the reason it went",
    rejects.every((r) => (r.reason || "").length > 0),
    [...new Set(rejects.map((r) => r.reason))].join(", "));
  check("a disputed answer key is recorded as such",
    rejects.some((r) => r.reason === "answer_disputed"),
    [...new Set(rejects.map((r) => r.reason))].join(", "));
  check("the note keeps the question text, so it can be looked at later",
    rejects.every((r) => (r.text || "").length > 10));

  // ---- and a mendable question is mended rather than thrown away
  check("a thin solution is repaired, not discarded",
    !rejects.some((r) => /solution too short/.test(r.detail || "")) ||
      rejects.filter((r) => /solution too short/.test(r.detail || "")).every((r) => r.repairAttempted),
    "every thin-solution reject had a repair attempted first");

  // ---- the correct answer is not always option A
  const positions = new Set(inTest.map((q) => q.correctIndex));
  check("the right answer moves around, it isn't always option A", positions.size > 1, `positions used: ${[...positions].sort().join(",")}`);
  check("the key still points at the right option",
    inTest.every((q) => /RIGHT/.test(q.options[q.correctIndex])),
    inTest.filter((q) => !/RIGHT/.test(q.options[q.correctIndex])).length + " mismatched");
  check("Hindi options stay lined up with the English ones",
    inTest.every((q) => /सही/.test(q.optionsHi[q.correctIndex])),
    inTest.filter((q) => !/सही/.test(q.optionsHi[q.correctIndex])).length + " misaligned");

  // ---- a repeat of a question the bank already has doesn't come back
  const keys = inTest.map((q) => q.textKey);
  check("every saved question carries a comparison key", keys.every(Boolean));
  check("no two questions in the test are the same", new Set(keys).size === keys.length);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) { console.log("\n--- server log tail ---\n" + log.split("\n").slice(-15).join("\n")); process.exit(1); }
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
