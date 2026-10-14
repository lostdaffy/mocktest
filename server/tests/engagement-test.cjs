// What brings a student back: the Home screen's "Today's plan", the daily
// quiz ranking, and the 7 AM / 8 PM reminders - each sent once a day.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5095;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const uri = mem.getUri() + "engagement_test";
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
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await sleep(250);
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const oid = () => new mongoose.Types.ObjectId();

  const mk = (name, phone, extra = {}) => ({ _id: oid(), name, phone, role: "student", referralCode: phone, activeSessionId: "s" + phone, examGoals: ["SSC_CGL"], ...extra });
  const asha = mk("Asha Verma", "9000000010", { pushToken: "ExponentPushToken[asha]" });
  const bina = mk("Bina", "9000000011", { pushToken: "ExponentPushToken[bina]" });
  const chetan = mk("Chetan Rao", "9000000012");
  await db.collection("users").insertMany([asha, bina, chetan]);
  const tok = (u) => jwt.sign({ id: String(u._id), sessionId: "s" + u.phone }, JWT_SECRET);

  await db.collection("exampatterns").insertOne({ examType: "SSC_CGL", displayName: "SSC CGL Tier 1", durationMinutes: 60, isActive: true,
    sections: [{ subject: "Maths", questionCount: 10 }] });
  await db.collection("subjects").insertOne({ name: "Maths", isActive: true, displayOrder: 1, chapters: [{ name: "Percentage", topics: ["Percentage"], exams: ["SSC_CGL"] }] });
  const topics = ["Ancient History", "Geography", "Polity", "Economy", "Science", "Awards"];
  await db.collection("questions").insertMany(
    Array.from({ length: 30 }, (_, i) => ({
      text: `Name zq${i}fact kx${i * 7}clue wv${i * 3}mark?`, textKey: `gk ${i}`,
      options: [`a${i}one`, `b${i}two`, `c${i}three`, `d${i}four`], correctIndex: 0, solution: "Because.",
      subject: "GK", topic: topics[i % 6], examType: ["SSC_CGL"], difficulty: "medium", source: "ai", status: "published",
    }))
  );

  // ---- a new student's plan: nothing done, the quiz first
  let r = await api("GET", "/tests/today-plan", { token: tok(asha) });
  check("Today's plan has three steps: quiz, practice, mock", r.status === 200 && r.json.steps?.map((s) => s.key).join() === "quiz,practice,mock",
    `${r.status} ${JSON.stringify(r.json).slice(0, 120)}`);
  check("...and points at the quiz first", r.json.next === "quiz" && r.json.done === 0);
  const quizId = r.json.steps[0].testId;
  check("...with today's quiz ready to open", !!quizId && r.json.steps[0].available);
  check("...a chapter to start practice with, from their exam", r.json.steps[1].suggestion?.chapter === "Percentage" && /Start with Percentage/.test(r.json.steps[1].subtitle),
    r.json.steps[1].subtitle);
  check("...and their exam's mock", r.json.steps[2].examStage === "SSC_CGL" && /SSC CGL Tier 1/.test(r.json.steps[2].subtitle));

  // ---- three students take the quiz
  const attempt = (u, correct, seconds, at) => ({
    user: u._id, test: new mongoose.Types.ObjectId(quizId), status: "submitted", score: correct, correctCount: correct,
    totalTimeTakenSeconds: seconds, submittedAt: at, createdAt: at, updatedAt: at, answers: [],
  });
  const now = Date.now();
  await db.collection("attempts").insertMany([
    attempt(asha, 15, 400, new Date(now - 3000)),
    attempt(bina, 18, 500, new Date(now - 2000)),
    attempt(chetan, 15, 300, new Date(now - 1000)),
    // Asha again, after seeing the answers - must not count.
    attempt(asha, 20, 100, new Date(now)),
  ]);

  r = await api("GET", "/tests/daily-quiz/board", { token: tok(asha) });
  check("the quiz board ranks everyone who took it", r.status === 200 && r.json.participants === 3, `${r.status} ${r.json.participants}`);
  check("...by score, and quicker wins a tie", r.json.top.map((t) => t.name).join() === "Bina,Chetan R.,Asha V.", r.json.top.map((t) => t.name).join());
  check("...counting only a student's first try, not the retake", r.json.me?.rank === 3 && r.json.me?.correct === 15, JSON.stringify(r.json.me));
  check("...with names shortened for a public board", r.json.top.every((t) => !/Verma|Rao/.test(t.name)));

  const ashaFirst = await db.collection("attempts").findOne({ user: asha._id }, { sort: { submittedAt: 1 } });
  r = await api("GET", `/tests/attempts/${ashaFirst._id}`, { token: tok(asha) });
  check("the quiz result shows the rank too", r.status === 200 && r.json.attempt?.rank === 3 && r.json.attempt?.totalParticipants === 3,
    `${r.status} ${r.json.attempt?.rank}/${r.json.attempt?.totalParticipants}`);

  r = await api("GET", "/tests/today-plan", { token: tok(asha) });
  check("after the quiz, the plan marks it done with the rank", r.json.steps[0].done && r.json.steps[0].result?.rank === 3 && r.json.steps[0].result?.participants === 3,
    JSON.stringify(r.json.steps[0].result));
  check("...and moves on to practice", r.json.next === "practice" && r.json.done === 1, `${r.json.next} ${r.json.done}`);

  // ---- the Notifications screen: what is new for this student
  r = await api("GET", "/tests/notifications", { token: tok(asha) });
  check("notifications tell a student who took the quiz where they ranked", r.status === 200 &&
    r.json.items?.some((i) => i.kind === "quiz_rank" && /#3 of 3/.test(i.title)), JSON.stringify(r.json.items?.map((i) => i.title)));
  const Test = require(path.join(SERVER, "models/Test"));
  const fresh = await Test.create({ title: "SSC CGL 2026 Mock Series - Mock #4", type: "full_mock", examType: "SSC_CGL", examStage: "SSC_CGL",
    questions: [], durationMinutes: 60, publishStatus: "published" });
  check("publishing a test stamps when it went out", !!fresh.publishedAt);
  await Test.create({ title: "Old draft", type: "full_mock", examType: "SSC_CGL", examStage: "SSC_CGL", questions: [], durationMinutes: 60, publishStatus: "draft" });
  r = await api("GET", "/tests/notifications", { token: tok(chetan) });
  check("...and a newly published mock for their exam is announced, the draft is not",
    r.json.items?.filter((i) => i.kind === "mock").map((i) => i.body).join() === "SSC CGL 2026 Mock Series - Mock #4",
    JSON.stringify(r.json.items?.map((i) => `${i.kind}:${i.body}`)));
  await db.collection("users").updateOne({ _id: bina._id }, { $set: { streakCount: 4, lastActiveDate: new Date(Date.now() - 86400000) } });
  r = await api("GET", "/tests/notifications", { token: tok(bina) });
  check("...a streak that ends tonight gets a reminder", r.json.items?.some((i) => i.kind === "streak" && /4-day/.test(i.title)),
    JSON.stringify(r.json.items?.map((i) => i.title)));
  await db.collection("users").updateOne({ _id: bina._id }, { $unset: { streakCount: 1, lastActiveDate: 1 } });
  await db.collection("tests").deleteMany({ title: { $in: ["SSC CGL 2026 Mock Series - Mock #4", "Old draft"] } });

  // ---- Continue learning: resume a test left half-way, else the next one
  r = await api("GET", "/tests/continue", { token: tok(chetan) });
  check("with no practice done, Continue learning has nothing to show", r.status === 200 && r.json.item === null, JSON.stringify(r.json));
  const pt = (n, level, extra = {}) => ({
    _id: oid(), title: `Percentage · Mixed Practice · ${level} #${n}`, type: "practice", examType: "SSC_CGL", subject: "Maths",
    topic: "Percentage", subtopic: null, difficultyLevel: level, seriesNumber: n, questions: [oid(), oid()], durationMinutes: 20,
    publishStatus: "published", isFree: n === 1, ...extra,
  });
  const e1 = pt(1, "easy"), e2 = pt(2, "easy"), e3 = pt(3, "easy", { publishStatus: "draft" }), m1 = pt(1, "medium");
  await db.collection("tests").insertMany([e1, e2, e3, m1]);
  const done = (u, t, acc, at) => ({ user: u._id, test: t._id, status: "submitted", accuracy: acc, score: 1, answers: [], createdAt: at, updatedAt: at, submittedAt: at });
  await db.collection("attempts").insertOne(done(chetan, e1, 72.4, new Date(now + 1000)));
  r = await api("GET", "/tests/continue", { token: tok(chetan) });
  check("after a practice test, it offers the next one of the same series", r.json.item?.kind === "next" && String(r.json.item.next?.testId) === String(e2._id) &&
    r.json.item.lastAccuracy === 72 && r.json.item.chapter === "Percentage", JSON.stringify(r.json.item));
  await db.collection("attempts").insertOne(done(chetan, e2, 90, new Date(now + 2000)));
  r = await api("GET", "/tests/continue", { token: tok(chetan) });
  check("...a finished level leads to the next level, never to a draft", String(r.json.item?.next?.testId) === String(m1._id) && r.json.item.next.level === "medium",
    JSON.stringify(r.json.item?.next));
  await db.collection("attempts").insertOne({
    user: chetan._id, test: m1._id, status: "in_progress", answers: [{ question: m1.questions[0], selectedIndex: 2 }, { question: m1.questions[1], selectedIndex: null }],
    createdAt: new Date(now + 3000), updatedAt: new Date(now + 3000),
  });
  r = await api("GET", "/tests/continue", { token: tok(chetan) });
  check("a test left half-way comes first, with how far they got", r.json.item?.kind === "resume" && String(r.json.item.testId) === String(m1._id) &&
    r.json.item.answered === 1 && r.json.item.total === 2, JSON.stringify(r.json.item));
  check("recently used tests are listed newest first, one line per test",
    r.json.recent?.map((x) => `${x.title.split(" · ").pop()}:${x.inProgress ? "open" : x.accuracy}`).join() === "medium #1:open,easy #2:90,easy #1:72",
    JSON.stringify(r.json.recent?.map((x) => [x.title, x.inProgress, x.accuracy])));

  // ---- reminders: each round once a day, only to those it concerns
  const pushService = require(path.join(SERVER, "services/pushService"));
  const sent = [];
  pushService.sendPushNotifications = async (tokens, msg) => {
    sent.push({ tokens, ...msg });
    return { sent: tokens.length };
  };
  // Loaded after the stub, in this process, against the same database.
  const { runReminders } = require(path.join(SERVER, "services/engagement"));
  const ist = (h) => {
    const d = new Date();
    const key = new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
    return new Date(`${key}T${String(h).padStart(2, "0")}:10:00+05:30`);
  };
  await runReminders(ist(5));
  check("nothing goes out at 5 AM", sent.length === 0);
  await runReminders(ist(7));
  check("at 7 AM, 'today's quiz is live' goes to everyone with notifications on",
    sent.length === 1 && /quiz is live/i.test(sent[0].title) && sent[0].tokens.length === 2, JSON.stringify(sent.map((s) => [s.title, s.tokens.length])));
  await runReminders(ist(7));
  await runReminders(ist(8));
  check("...once - asking again sends nothing", sent.length === 1, `${sent.length}`);

  // Bina practised yesterday, not today: her streak is at risk. Asha has
  // practised today. Chetan has no notifications.
  const yesterday = new Date(ist(12).getTime() - 24 * 3600e3);
  await db.collection("users").updateOne({ _id: bina._id }, { $set: { streakCount: 4, lastActiveDate: yesterday } });
  await db.collection("users").updateOne({ _id: asha._id }, { $set: { streakCount: 6, lastActiveDate: ist(9) } });
  await runReminders(ist(20));
  const evening = sent[1];
  check("at 8 PM, the streak reminder goes only to students whose streak ends tonight",
    evening && /streak/i.test(evening.title) && evening.tokens.join() === "ExponentPushToken[bina]", JSON.stringify(evening));
  await runReminders(ist(21));
  check("...also once", sent.length === 2, `${sent.length}`);

  r = await fetch(`${BASE}/jobs/tick`, { method: "POST" });
  check("the outside scheduler's tick needs no login and answers", r.status === 200);

  const passed = results.filter((x) => x.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  await mongoose.disconnect();
  srv.kill();
  await mem.stop();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
