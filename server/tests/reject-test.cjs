// Pressing Reject has to mean the question stops reaching students. It did
// not: a test holds its questions by id and serves them without checking
// status, so a rejected question carried on appearing in every test that
// already contained it.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5062;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

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
  const uri = mem.getUri() + "reject_test";
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

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const adminToken = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);
  const student = await db.collection("users").insertOne({
    name: "S", phone: "9000000123", role: "student", referralCode: "S1", activeSessionId: "x",
    examGoals: ["SSC_CGL"], freeUsage: { mockTestsUsed: 0, liveExamsUsed: 0, pyqUsed: 0 },
    subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 86400e3 * 100),
  });
  const studentToken = jwt.sign({ id: student.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  const ins = await db.collection("questions").insertMany(
    Array.from({ length: 12 }, (_, i) => ({
      text: `Question number ${i} about percentages`, textHi: "प्रश्न", options: ["a", "b", "c", "d"], optionsHi: ["a", "b", "c", "d"],
      correctIndex: 1, solution: "because 2 + 2 = 4", solutionHi: "कारण",
      examType: ["SSC_CGL"], subject: "Maths", topic: "Percentage", difficulty: "easy",
      source: "ai_generated", status: "published",
    }))
  );
  const ids = Object.values(ins.insertedIds);

  const test = await db.collection("tests").insertOne({
    title: "Percentage - Easy #1", type: "practice", examType: "PRACTICE", subject: "Maths", topic: "Percentage",
    difficultyLevel: "easy", questions: ids, durationMinutes: 12, publishStatus: "published", isFree: true,
  });
  const testId = String(test.insertedId);

  // ---- the student can see all twelve
  let r = await api("GET", `/tests/${testId}`, { token: studentToken });
  check("the student sees the full test", r.json.test?.questions?.length === 12, `${r.json.test?.questions?.length}`);

  const doomed = String(ids[3]);
  const doomedText = "Question number 3 about percentages";
  check("...including the one about to be rejected",
    (r.json.test.questions || []).some((q) => q.text === doomedText));

  // ---- the admin rejects it
  r = await api("PATCH", `/questions/${doomed}/reject`, { token: adminToken, body: { reason: "wrong answer key" } });
  check("the admin can reject a question", r.status === 200, `${r.status} ${r.json.message || ""}`);
  check("...and is told it was pulled out of the test that used it",
    r.json.removedFromTests === 1, `removed from ${r.json.removedFromTests} test(s)`);
  // It used to say "now short - regenerate to fill" and leave it there. That
  // note is how 26 live tests ended up serving fewer questions than they
  // promised, so removal puts a replacement in instead.
  check("...and a replacement went in, so nothing is short",
    (r.json.testsNowShort || []).length === 0, JSON.stringify(r.json.testsNowShort));
  check("...and the message says what it did", /replacement/i.test(r.json.message || ""), r.json.message);

  // ---- and the student never sees it again
  r = await api("GET", `/tests/${testId}`, { token: studentToken });
  const stillThere = (r.json.test?.questions || []).some((q) => q.text === doomedText);
  check("the rejected question is GONE from the student's test", !stillThere,
    stillThere ? "STILL SERVED" : "gone");
  check("...and the student still gets a full twelve", r.json.test?.questions?.length === 12, `${r.json.test?.questions?.length}`);

  // ---- approving does not disturb anything
  r = await api("PATCH", `/questions/${String(ids[4])}/approve`, { token: adminToken });
  check("approving a question still works", r.status === 200, `${r.status}`);
  r = await api("GET", `/tests/${testId}`, { token: studentToken });
  check("...and leaves the test alone", r.json.test?.questions?.length === 12, `${r.json.test?.questions?.length}`);

  // ---- a big test with a hole in it must be named too
  // "Short" used to mean "fewer than twelve", a practice test's size. A
  // 100-question mock that lost one sat at 99 and was never mentioned,
  // because 99 is more than 12 - so the mock quietly went out incomplete.
  const mockIds = (
    await db.collection("questions").insertMany(
      Array.from({ length: 100 }, (_, i) => ({
        text: `Mock question ${i} about percentages`,
        options: ["a", "b", "c", "d"],
        correctIndex: 0,
        subject: "Maths",
        topic: "Percentage",
        status: "published",
      }))
    )
  ).insertedIds;
  const mock = await db.collection("tests").insertOne({
    title: "SSC CGL - Mock #1",
    type: "full_mock",
    examStage: "SSC_CGL",
    questions: Object.values(mockIds),
    publishStatus: "published",
  });

  r = await api("PATCH", `/questions/${String(mockIds[7])}/reject`, { token: adminToken, body: { reason: "wrong answer key" } });
  // A mock is generated section by section, so topping one up blind would
  // skew the paper. It is reported instead of healed - which is the case the
  // old "fewer than twelve" test could never see, since 99 is more than 12.
  check("a 100-question mock that loses one is reported, not silently healed",
    (r.json.testsNowShort || []).some((t) => t.title === "SSC CGL - Mock #1" && t.left === 99),
    JSON.stringify(r.json.testsNowShort));
  check("...and the count it reports is the real one",
    (await db.collection("tests").findOne({ _id: mock.insertedId })).questions.length === 99,
    `${(await db.collection("tests").findOne({ _id: mock.insertedId })).questions.length}`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
