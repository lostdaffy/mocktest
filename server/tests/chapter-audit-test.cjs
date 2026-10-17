// The AI audit of a chapter's live questions. What has to be true:
//   - only the chosen chapter is touched
//   - a sound question stays, and so does one the checker doubted once but
//     not on a second, separate check
//   - a fixable gap is mended, not thrown away
//   - an answer disputed twice leaves circulation and its test is refilled
//   - when the checker cannot answer, the audit stops BEFORE that question,
//     so nothing is skipped and nothing is retired unchecked
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5072;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "chapter-audit-stub.cjs");

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
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "chapter_audit_test";
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
  srv.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await new Promise((r) => setTimeout(r, 250));
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  const long = "Step 1: 20% of 500 = 100. Step 2: 500 - 100 = 400. Answer 400.";
  const base = {
    options: ["10", "20", "30", "40"], correctIndex: 0, subject: "Maths",
    topic: "Unit Digit", chapter: "Number System", difficulty: "easy",
    status: "published", source: "manual", createdBy: "admin", solution: long,
  };
  const ins = await db.collection("questions").insertMany([
    { ...base, text: "GOOD one" },
    { ...base, text: "FLAKY one the checker slips on once" },
    { ...base, text: "WRONG one with a bad key" },
    { ...base, text: "THIN one", solution: "400" },
    { ...base, text: "QUOTA one the checker cannot reach today" },
    { ...base, text: "GOOD two" },
    { ...base, text: "GOOD three filed under topic only", topic: "Number System", chapter: "" },
    { ...base, text: "WRONG but in another chapter", topic: "Percentage", chapter: "Percentage" },
  ]);
  const id = (i) => ins.insertedIds[i];
  const q = (i) => db.collection("questions").findOne({ _id: id(i) });

  const test = await db.collection("tests").insertOne({
    title: "Number System · Unit Digit · Easy #1", type: "practice", subject: "Maths",
    topic: "Unit Digit", chapter: "Number System", difficultyLevel: "easy",
    questions: [id(0), id(1), id(2), id(3)], publishStatus: "published",
  });

  // ---- first call: stops at the question it cannot check
  const r1 = await api("POST", "/questions/audit", { token, body: { chapter: "Number System", limit: 12 } });
  check("the admin can audit a chapter", r1.status === 200, `${r1.status} ${r1.json.message || ""}`);
  check("...it judged the four before the one it could not check", r1.json.looked === 4, `${r1.json.looked}`);
  check("...and says why it stopped", /could not be completed/.test(r1.json.stopped || ""), r1.json.stopped);
  check("...and is not done", r1.json.done === false);
  check("...and carries on from the last judged question", String(r1.json.next) === String(id(3)), `${r1.json.next}`);

  check("a sound question stays live", (await q(0))?.status === "published");
  check("a single slip by the checker does not throw out a sound question", (await q(1))?.status === "published");
  check("...and the count says a second check saved it", r1.json.secondOpinionKept === 1, `${r1.json.secondOpinionKept}`);
  check("a disputed answer key is retired", !(await q(2)), "gone");
  check("...and named for the admin", r1.json.retired?.length === 1 && /WRONG/.test(r1.json.retired[0].text));
  const thin = await q(3);
  check("a thin solution is mended, not thrown away", thin?.status === "published" && thin.solution.length > 25);
  check("the question it could not check is untouched", (await q(4))?.status === "published");

  const t = await db.collection("tests").findOne({ _id: test.insertedId });
  check("the retired question left its test", !t.questions.map(String).includes(String(id(2))));
  check("...and a replacement took its place", t.questions.length >= 4, `${t.questions.length} in the test`);
  check("...and every id in the test is a real question",
    (await db.collection("questions").countDocuments({ _id: { $in: t.questions } })) === t.questions.length);

  // ---- the allowance is back: carry on from `next`
  await db.collection("questions").updateOne({ _id: id(4) }, { $set: { text: "Fourth one, now reachable" } });
  const r2 = await api("POST", "/questions/audit", { token, body: { chapter: "Number System", after: r1.json.next, limit: 12 } });
  check("the next call carries on where the last stopped", r2.json.looked === 3, `${r2.json.looked} ${r2.json.message}`);
  check("...including a question filed under the chapter as its topic", r2.json.kept === 3, `${r2.json.kept}`);
  check("...and finishes the chapter", r2.json.done === true, r2.json.message);
  check("another chapter is never touched", (await q(7))?.status === "published");

  // ---- guard rails
  const none = await api("POST", "/questions/audit", { token, body: {} });
  check("a chapter has to be named", none.status === 400, `${none.status}`);
  const student = await db.collection("users").insertOne({ name: "S", phone: "9111111111", role: "user", referralCode: "S1" });
  const sToken = jwt.sign({ id: student.insertedId.toString(), sessionId: "y" }, JWT_SECRET);
  const denied = await api("POST", "/questions/audit", { token: sToken, body: { chapter: "Number System" } });
  check("a student cannot run it", denied.status === 403 || denied.status === 401, `${denied.status}`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
