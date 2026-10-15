// Facts that go out of date. Two Super TET questions asked for the current
// Chief Election Commissioner and were already wrong. No check in code knows
// today's answer, so these are listed for the admin to confirm every six
// months or to reject (the reject path replaces them - see reject-test).
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5097;
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
  const uri = mem.getUri() + "time_sensitive_test";
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
  const student = await db.collection("users").insertOne({ name: "S", phone: "9000000123", role: "student", referralCode: "S1", activeSessionId: "x" });
  const studentToken = jwt.sign({ id: student.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  const day = 86400000;
  const base = {
    options: ["a", "b", "c", "d"], correctIndex: 0, solution: "s", examType: ["SUPER_TET"],
    subject: "GK", topic: "Current Affairs", difficulty: "easy", source: "ai_generated", status: "published",
  };
  const Q = {
    cec: { ...base, text: "भारत के वर्तमान मुख्य चुनाव आयुक्त कौन हैं?" },
    recent: { ...base, text: "Which country recently hosted the G20 summit?" },
    year: { ...base, text: "2024 के पेरिस ओलंपिक में भारत ने कितने पदक जीते?" },
    oldCheck: { ...base, text: "हाल ही में किस राज्य ने नई खेल नीति घोषित की?", factCheckedAt: new Date(Date.now() - 200 * day) },
    newCheck: { ...base, text: "हाल ही में किस राज्य ने नई शिक्षा नीति घोषित की?", factCheckedAt: new Date(Date.now() - 10 * day) },
    timeless: { ...base, text: "भारत का संविधान कब लागू हुआ?" },
    ageSum: { ...base, subject: "Maths", topic: "Ages", text: "A की वर्तमान आयु B की आयु की दोगुनी है..." },
    rejected: { ...base, status: "rejected", text: "वर्तमान में RBI के गवर्नर कौन हैं?" },
    notInTest: { ...base, text: "वर्तमान में ISRO के अध्यक्ष कौन हैं?" },
    draftOnly: { ...base, text: "वर्तमान में भारत के थल सेना प्रमुख कौन हैं?" },
  };
  const ids = {};
  for (const [k, q] of Object.entries(Q)) ids[k] = (await db.collection("questions").insertOne(q)).insertedId;

  const inLive = ["cec", "recent", "year", "oldCheck", "newCheck", "timeless", "ageSum", "rejected"].map((k) => ids[k]);
  await db.collection("tests").insertOne({
    title: "Super TET Mock #1", type: "full_mock", examType: "SUPER_TET", questions: inLive,
    durationMinutes: 120, publishStatus: "published",
  });
  await db.collection("tests").insertOne({
    title: "Super TET Mock #3", type: "full_mock", examType: "SUPER_TET", questions: [ids.draftOnly, ids.cec],
    durationMinutes: 120, publishStatus: "archived",
  });

  // ---- students cannot see the list
  let r = await api("GET", "/questions/time-sensitive", { token: studentToken });
  check("a student cannot open the list", r.status === 403 || r.status === 401, String(r.status));

  r = await api("GET", "/questions/time-sensitive", { token: adminToken });
  check("the admin gets the list", r.status === 200, JSON.stringify(r.json).slice(0, 120));
  const listed = new Set((r.json.questions || []).map((q) => String(q._id)));
  const has = (k) => listed.has(String(ids[k]));

  check("'वर्तमान' (current) is listed", has("cec"));
  check("'recently' is listed", has("recent"));
  check("a recent year is listed", has("year"));
  check("one confirmed over six months ago comes back", has("oldCheck"));
  check("one confirmed ten days ago stays off", !has("newCheck"));
  check("a fact that cannot change stays off", !has("timeless"));
  check("'वर्तमान आयु' in a maths sum stays off", !has("ageSum"));
  check("a rejected question stays off", !has("rejected"));
  check("a question in no test stays off", !has("notInTest"));
  check("a question only in an unpublished mock stays off", !has("draftOnly"));
  check("the count matches", r.json.count === 4, String(r.json.count));
  const cec = (r.json.questions || []).find((q) => String(q._id) === String(ids.cec));
  check("each one names the live tests holding it, not the archived ones",
    cec && cec.tests.length === 1 && cec.tests[0] === "Super TET Mock #1", JSON.stringify(cec && cec.tests));

  // ---- "Still correct"
  r = await api("PATCH", `/questions/${ids.cec}/fact-checked`, { token: studentToken });
  check("a student cannot mark it", r.status === 403 || r.status === 401, String(r.status));
  r = await api("PATCH", `/questions/${ids.cec}/fact-checked`, { token: adminToken });
  check("the admin marks it still correct", r.status === 200 && r.json.question && r.json.question.factCheckedAt, JSON.stringify(r.json));
  r = await api("GET", "/questions/time-sensitive", { token: adminToken });
  check("and it leaves the list", !(r.json.questions || []).some((q) => String(q._id) === String(ids.cec)) && r.json.count === 3, String(r.json.count));

  r = await api("PATCH", `/questions/${new mongoose.Types.ObjectId()}/fact-checked`, { token: adminToken });
  check("an unknown question is a 404", r.status === 404, String(r.status));

  // ---- the old routes still work beside the new ones
  r = await api("GET", "/questions/stats", { token: adminToken });
  check("/questions/stats still answers", r.status === 200, String(r.status));

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
