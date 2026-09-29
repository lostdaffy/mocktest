// Taking a bad question out was only half the job. The test was left with a
// hole and a line in the response saying so, and somebody had to notice that
// line and click "Add questions". One purge of 127 untrustworthy answer keys
// left 26 live tests short in an afternoon - one of them serving five
// questions of twelve.
//
// Removal carries the repair with it now.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5074;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 90) + "]" : ""}`);
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
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "selfheal_test";
  const srv = spawn(process.execPath, ["-r", STUB, "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT),
      TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
      EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", ALLOWED_ORIGINS: "",
    },
  });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => { log += d; process.stderr.write(String(d)); });
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await new Promise((r) => setTimeout(r, 250));
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const oid = (v) => new mongoose.Types.ObjectId(v);

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  await api("POST", "/exams", { token, body: {
    examType: "SSC_CGL", displayName: "SSC CGL", durationMinutes: 60,
    sections: [{ subject: "Maths", questionCount: 12, difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
  }});
  await api("POST", "/subjects", { token, body: {
    name: "Maths", displayOrder: 1,
    chapters: [{ name: "Percentage", category: "अंकगणित", topics: ["Percentage"], exams: ["SSC_CGL"] }],
  }});

  let r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", topics: ["Percentage"], difficulty: "easy" },
  });
  const testId = r.json.test._id;
  check("a practice test starts full", r.json.test.questionCount === 12, `${r.json.test.questionCount}`);

  // ---- taking one out puts another in
  let test = await db.collection("tests").findOne({ _id: oid(testId) });
  const victim = String(test.questions[3]);
  const before = test.questions.map(String);

  r = await api("DELETE", `/exam-series/mock/${testId}/question/${victim}`, { token });
  check("removing a question answers 200", r.status === 200, `${r.status} ${r.json.message || ""}`);
  check("...and the test is STILL twelve", r.json.remainingCount === 12, `${r.json.remainingCount}`);
  check("...because a replacement was generated, not just promised",
    r.json.refilled?.[0]?.added === 1, JSON.stringify(r.json.refilled?.[0] || {}));
  check("...and the message says so instead of 'add replacements'",
    /replacement/.test(r.json.message || "") && !/add replacements/.test(r.json.message || ""), r.json.message);

  test = await db.collection("tests").findOne({ _id: oid(testId) });
  const after = test.questions.map(String);
  check("...the one taken out is gone", !after.includes(victim));
  check("...exactly one is new", after.filter((id) => !before.includes(id)).length === 1,
    `${after.filter((id) => !before.includes(id)).length} new`);
  const resolved = await db.collection("questions").countDocuments({ _id: { $in: test.questions } });
  check("...and every id in the test resolves to a real question", resolved === 12, `${resolved} of ${test.questions.length}`);
  const texts = await db.collection("questions").find({ _id: { $in: test.questions } }).toArray();
  check("...with no repeat among them", new Set(texts.map((q) => q.text)).size === 12,
    `${new Set(texts.map((q) => q.text)).size} distinct`);

  // ---- a published test heals too: it has already changed, the only
  //      question is whether it stays broken
  await api("PATCH", `/exam-series/practice/${testId}/publish`, { token, body: { isFree: true } });
  test = await db.collection("tests").findOne({ _id: oid(testId) });
  r = await api("DELETE", `/exam-series/mock/${testId}/question/${String(test.questions[0])}`, { token });
  check("a LIVE test is healed rather than left short", r.json.remainingCount === 12, `${r.json.remainingCount}`);
  test = await db.collection("tests").findOne({ _id: oid(testId) });
  check("...and it is still published", test.publishStatus === "published", test.publishStatus);

  // ---- rejecting a question from the bank heals every test holding it
  r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", topics: ["Percentage"], difficulty: "medium" },
  });
  const secondId = r.json.test._id;
  const second = await db.collection("tests").findOne({ _id: oid(secondId) });
  const shared = second.questions[2];
  await db.collection("tests").updateOne({ _id: oid(testId) }, { $push: { questions: shared } });

  r = await api("PATCH", `/questions/${String(shared)}/reject`, { token, body: { reason: "wrong answer key" } });
  check("rejecting a question heals every test that held it",
    (r.json.refilled || []).length === 2, `${(r.json.refilled || []).length} test(s) refilled`);
  const t1 = await db.collection("tests").findOne({ _id: oid(testId) });
  const t2 = await db.collection("tests").findOne({ _id: oid(secondId) });
  check("...both are back to full", t2.questions.length === 12, `second: ${t2.questions.length}`);
  check("...and the rejected one is in neither",
    !t1.questions.map(String).includes(String(shared)) && !t2.questions.map(String).includes(String(shared)));
  check("...and nothing points at a question that is gone",
    (await db.collection("questions").countDocuments({ _id: { $in: t2.questions } })) === t2.questions.length);

  // ---- and the one-click repair for tests that went short before any of this
  // Deliberately half-formed: no durationMinutes, no examType, the way a test
  // written before a later schema change looks. Filling it must not depend on
  // it being able to revalidate itself.
  const stunted = await db.collection("tests").insertOne({
    title: "Average - Advanced #1", type: "practice", subject: "Maths", topic: "Percentage",
    difficultyLevel: "advanced", questions: (await db.collection("questions").find({}).limit(5).toArray()).map((q) => q._id),
    publishStatus: "published",
  });
  r = await api("POST", "/exam-series/practice/fill-short", { token, body: { limit: 5 } });
  check("every test that was already short can be filled in one call", r.status === 200, `${r.status} ${r.json.message || ""}`);
  const healed = await db.collection("tests").findOne({ _id: stunted.insertedId });
  check("...the one serving five of twelve is full", healed.questions.length === 12, `${healed.questions.length}/12`);
  check("...even though it predates half the schema", !healed.durationMinutes && !healed.examType, "still missing those fields, still filled");
  check("...and the report says what it did", /added across/.test(r.json.message || ""), r.json.message);

  r = await api("POST", "/exam-series/practice/fill-short", { token, body: {} });
  check("...run again with nothing to do, it says so", /every practice test is full/i.test(r.json.message || ""), r.json.message);

  const student = await db.collection("users").insertOne({ name: "S", phone: "9111111111", role: "user", referralCode: "S1" });
  const sToken = jwt.sign({ id: student.insertedId.toString(), sessionId: "y" }, JWT_SECRET);
  const denied = await api("POST", "/exam-series/practice/fill-short", { token: sToken, body: {} });
  check("a student cannot run it", denied.status === 401 || denied.status === 403, `${denied.status}`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
