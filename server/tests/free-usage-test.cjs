// A student gets 5 free mock tests. This is about not stealing them:
// not when the question bank isn't ready, and not when they tap twice.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const bcrypt = require(path.join(SERVER, "node_modules/bcryptjs"));
const PORT = 5062;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");
const FREE_MOCK_TESTS = 5;

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
  const uri = mem.getUri() + "free_usage_test";
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

  await db.collection("users").insertOne({
    name: "Student", phone: "9000000007", email: "s7@test.com", role: "student", referralCode: "STU7",
    passwordHash: await bcrypt.hash("studentpw1", 10),
    freeUsage: { mockTestsUsed: 0, liveExamsUsed: 0, pyqUsed: 0 },
  });
  const token = (await api("POST", "/auth/login", { body: { phone: "9000000007", password: "studentpw1" } })).json.token;

  // The exam exists; its question bank does not. This is exactly the state
  // the app is in the moment a new exam is added from the admin panel.
  await db.collection("exampatterns").insertOne({
    examType: "AGNIVEER", displayName: "Agniveer Army GD", durationMinutes: 60, negativeMarking: 0.25,
    isActive: true, sections: [{ subject: "GK", questionCount: 5, difficultyMix: { easy: 50, medium: 50, hard: 0 } }],
  });

  const used = async () => (await db.collection("users").findOne({ phone: "9000000007" })).freeUsage.mockTestsUsed;

  // ---- bank empty
  let r = await api("POST", "/tests/generate/full-mock", { body: { examType: "AGNIVEER" }, token });
  check("an empty question bank doesn't 500", r.status === 400, String(r.status));
  check("the student is told to come back later, in their own language",
    /taiyaar ho rahe hain/.test(r.json.message || ""), r.json.message);
  check("no mention of npm, scripts or the admin's chores",
    !/npm|script|admin|published/i.test(r.json.message || ""), r.json.message);
  check("...and that failed try cost them nothing", (await used()) === 0, `used ${await used()}`);

  // ---- bank filled
  await db.collection("questions").insertMany(
    Array.from({ length: 12 }, (_, i) => ({
      text: `Q${i}?`, options: ["a", "b", "c", "d"], correctIndex: 1, solution: "because",
      examType: ["AGNIVEER"], subject: "GK", topic: "GK", difficulty: "medium",
      source: "ai_generated", status: "published",
    }))
  );

  r = await api("POST", "/tests/generate/full-mock", { body: { examType: "AGNIVEER" }, token });
  check("once questions exist the mock is built", r.status === 201, `${r.status} ${r.json.message || ""}`);
  check("...and now one free mock is counted", (await used()) === 1, `used ${await used()}`);

  // ---- two taps at once, one free mock left
  await db.collection("users").updateOne({ phone: "9000000007" }, { $set: { "freeUsage.mockTestsUsed": FREE_MOCK_TESTS - 1 } });
  const burst = await Promise.all(
    Array.from({ length: 4 }, () => api("POST", "/tests/generate/full-mock", { body: { examType: "AGNIVEER" }, token }))
  );
  const created = burst.filter((x) => x.status === 201).length;
  const refused = burst.filter((x) => x.status === 402).length;
  check("four simultaneous taps with one free mock left -> exactly one test",
    created === 1 && refused === 3, `201s: ${created}, 402s: ${refused}`);
  check("...and the count lands exactly on the limit, never past it",
    (await used()) === FREE_MOCK_TESTS, `used ${await used()} of ${FREE_MOCK_TESTS}`);

  // ---- limit reached
  r = await api("POST", "/tests/generate/full-mock", { body: { examType: "AGNIVEER" }, token });
  check("after that they're asked to subscribe", r.status === 402 && r.json.code === "SUBSCRIPTION_REQUIRED", `${r.status} ${r.json.code}`);
  check("the refusal doesn't quietly push the count higher", (await used()) === FREE_MOCK_TESTS, `used ${await used()}`);

  // ---- a paying student is never counted
  await db.collection("users").updateOne({ phone: "9000000007" }, {
    $set: { subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 86400e3 * 300) },
  });
  r = await api("POST", "/tests/generate/full-mock", { body: { examType: "AGNIVEER" }, token });
  check("a subscriber gets a mock even though their free ones are gone", r.status === 201, `${r.status} ${r.json.message || ""}`);
  check("...and nothing is deducted from a paying account", (await used()) === FREE_MOCK_TESTS, `used ${await used()}`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
