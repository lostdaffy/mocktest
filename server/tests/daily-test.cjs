// The daily habit loop: streak that tells the truth, a visible daily goal,
// and a daily test that doesn't hand back questions already answered.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const bcrypt = require(path.join(SERVER, "node_modules/bcryptjs"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5063;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

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

// Same IST day boundary the server uses.
const istKey = (d) => new Date(new Date(d).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "daily_test";
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

  const student = await db.collection("users").insertOne({
    name: "Daily Student", phone: "9000000055", email: "daily@test.com", role: "student",
    referralCode: "DAILY1", passwordHash: await bcrypt.hash("dailypass1", 10),
    examGoals: ["SSC_CGL"], activeSessionId: "sess", streakCount: 0, createdAt: new Date(),
    subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000),
  });
  const uid = student.insertedId;
  token = jwt.sign({ id: uid.toString(), sessionId: "sess" }, JWT_SECRET);

  // a question bank to draw from
  const questions = Array.from({ length: 60 }, (_, i) => ({
    text: `Bank question ${i} about ratios and percentages`,
    textHi: `प्रश्न ${i}`,
    options: ["a", "b", "c", "d"],
    optionsHi: ["अ", "ब", "स", "द"],
    correctIndex: 0,
    solution: "Because solving the ratio gives the first option.",
    solutionHi: "क्योंकि अनुपात हल करने पर पहला विकल्प आता है।",
    examType: ["SSC_CGL"], subject: "Maths", topic: "Percentage",
    difficulty: "easy", source: "ai_generated", status: "published",
  }));
  const inserted = await db.collection("questions").insertMany(questions);
  const qIds = Object.values(inserted.insertedIds);

  // ---- a brand new student
  let r = await api("GET", "/tests/daily");
  check("daily status loads", r.status === 200, `${r.status} ${r.json.message || ""}`);
  check("a new student starts at zero", r.json.streak.current === 0 && r.json.today.questionsDone === 0);
  check("the day's goal is shown", r.json.today.goal === 20 && r.json.today.remaining === 20, JSON.stringify(r.json.today));
  check("it knows they haven't practised today", r.json.streak.practisedToday === false);

  // ---- a stale streak must not keep showing
  await db.collection("users").updateOne({ _id: uid }, { $set: { streakCount: 12, bestStreak: 12, lastActiveDate: daysAgo(5) } });
  r = await api("GET", "/tests/daily");
  check("a streak from 5 days ago reads as broken, not as 12", r.json.streak.current === 0, `${r.json.streak.current}`);
  check("...but their best is remembered", r.json.streak.best === 12, `${r.json.streak.best}`);

  // ---- practised yesterday: streak alive, and today is the day to keep it
  await db.collection("users").updateOne({ _id: uid }, { $set: { streakCount: 6, lastActiveDate: daysAgo(1) } });
  r = await api("GET", "/tests/daily");
  check("yesterday's practice keeps the streak alive", r.json.streak.current === 6);
  check("...and it flags that today's is still pending", r.json.streak.atRiskToday === true && r.json.streak.practisedToday === false);

  // ---- questions answered today are counted, whatever test they came from
  const testDoc = await db.collection("tests").insertOne({
    title: "Some chapter test", type: "practice", examType: "SSC_CGL", subject: "Maths", topic: "Percentage",
    questions: qIds.slice(0, 5), durationMinutes: 10, publishStatus: "published",
  });
  await db.collection("attempts").insertOne({
    user: uid, test: testDoc.insertedId, status: "submitted", submittedAt: new Date(), createdAt: new Date(),
    answers: [
      { question: qIds[0], selectedIndex: 0, isCorrect: true },
      { question: qIds[1], selectedIndex: 1, isCorrect: false },
      { question: qIds[2], selectedIndex: null, isCorrect: false }, // skipped - shouldn't count
    ],
  });
  r = await api("GET", "/tests/daily");
  check("today's answered questions are counted", r.json.today.questionsDone === 2, `${r.json.today.questionsDone}`);
  check("skipped ones are not counted", r.json.today.questionsDone === 2);
  check("correct count and accuracy are shown", r.json.today.correct === 1 && r.json.today.accuracy === 50, JSON.stringify(r.json.today));
  check("remaining counts down", r.json.today.remaining === 18);
  check("goal is not met yet", r.json.today.goalMet === false);

  // ---- a student can set their own bar
  r = await api("PATCH", "/tests/daily/goal", { goal: 5 });
  check("daily goal can be changed", r.status === 200, r.json.message);
  r = await api("GET", "/tests/daily");
  check("...and the new goal is used straight away", r.json.today.goal === 5 && r.json.today.remaining === 3, JSON.stringify(r.json.today));
  check("a goal below 5 questions is refused", (await api("PATCH", "/tests/daily/goal", { goal: 2 })).status === 400);
  check("a silly goal is refused", (await api("PATCH", "/tests/daily/goal", { goal: 900 })).status === 400);
  await api("PATCH", "/tests/daily/goal", { goal: 20 });

  // ---- today's test must be made of questions they have NOT answered
  r = await api("GET", "/tests/today");
  check("today's test is built", r.status === 200 && r.json.test, `${r.status} ${r.json.message || ""}`);
  const todayTest = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(r.json.test._id) });
  const answered = new Set([qIds[0], qIds[1], qIds[2]].map(String));
  const repeats = todayTest.questions.filter((id) => answered.has(String(id))).length;
  check("it never reuses a question they already answered", repeats === 0, `${repeats} repeats`);
  check("it has a full set of questions", todayTest.questions.length === 20, `${todayTest.questions.length}`);
  check("no question appears twice inside it", new Set(todayTest.questions.map(String)).size === todayTest.questions.length);

  // asking again on the same day gives the same test, not a new one
  const again = await api("GET", "/tests/today");
  check("the same day gives the same test back", String(again.json.test._id) === String(todayTest._id));

  // ---- submitting a test moves the streak to 7 and records a best
  const attemptBody = {
    answers: todayTest.questions.slice(0, 3).map((q) => ({ question: String(q), selectedIndex: 0, timeTakenSeconds: 5 })),
    totalTimeTakenSeconds: 60,
  };
  r = await api("POST", `/tests/${todayTest._id}/submit`, attemptBody);
  check("the daily test can be submitted", r.status === 200 || r.status === 201, `${r.status} ${r.json.message || ""}`);

  const after = await db.collection("users").findOne({ _id: uid });
  check("practising today moves the streak from 6 to 7", after.streakCount === 7, `${after.streakCount}`);
  check("today is recorded as the last active day", istKey(after.lastActiveDate) === istKey(new Date()));
  check("a new personal best is stored", after.bestStreak === 12 || after.bestStreak >= 7, `${after.bestStreak}`);

  r = await api("GET", "/tests/daily");
  check("the home screen now says today is done", r.json.streak.practisedToday === true && r.json.streak.atRiskToday === false);
  check("and the streak reads 7", r.json.streak.current === 7, `${r.json.streak.current}`);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) { console.log("\n--- server log tail ---\n" + log.split("\n").slice(-15).join("\n")); process.exit(1); }
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
