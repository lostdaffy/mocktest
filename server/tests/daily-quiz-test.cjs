// The Daily GK Quiz: 20 GK questions, the same for everyone, free, new each
// India day, never incomplete, never repeating a recent quiz's questions -
// served through GET /api/tests/today so installed apps get it unchanged.
// Real server, throwaway in-memory MongoDB, AI stubbed.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const STUB = path.join(__dirname, "mock-stub.cjs");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const bcrypt = require(path.join(SERVER, "node_modules/bcryptjs"));
const PORT = 5072;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const istKey = (days = 0) => new Date(Date.now() + 5.5 * 3600e3 + days * 864e5).toISOString().slice(0, 10);

(async () => {
  const calls = path.join(__dirname, "gen-calls.jsonl");
  if (fs.existsSync(calls)) fs.unlinkSync(calls);
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "daily_quiz_test";
  const srv = spawn(process.execPath, ["-r", STUB, "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT), GEMINI_API_KEY: "stub",
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
  const old = new Date(Date.now() - 40 * 864e5); // well past the free trial
  await db.collection("users").insertMany([
    { name: "Admin", phone: "9000000001", email: "a@t.com", role: "admin", referralCode: "ADM", passwordHash: await bcrypt.hash("adminpass1", 10) },
    { name: "Asha", phone: "9000000002", email: "s1@t.com", role: "student", referralCode: "S1", examGoals: ["SSC_CGL"], createdAt: old, passwordHash: await bcrypt.hash("studentpw1", 10) },
    { name: "Bina", phone: "9000000003", email: "s2@t.com", role: "student", referralCode: "S2", examGoals: ["CTET"], createdAt: old, passwordHash: await bcrypt.hash("studentpw1", 10) },
  ]);
  const topics = ["Ancient History", "Geography", "Polity", "Economy", "Science", "Awards"];
  const q = (i, subject, extra = {}) => ({
    text: `Name zq${i}fact kx${i * 7}clue wv${i * 3}mark?`,
    textKey: `${subject.toLowerCase()} question number ${i}`,
    options: [`a${i}one`, `b${i}two`, `c${i}three`, `d${i}four`], correctIndex: i % 4, solution: "Because.", subject,
    topic: topics[i % topics.length], examType: ["SSC_CGL"], difficulty: "medium", source: "ai", status: "published", ...extra,
  });
  await db.collection("questions").insertMany([
    ...Array.from({ length: 38 }, (_, i) => q(i, "GK")),
    ...Array.from({ length: 6 }, (_, i) => q(100 + i, "Current Affairs")),
    ...Array.from({ length: 10 }, (_, i) => q(200 + i, "Maths")),
    q(300, "GK", { status: "under_review" }),
  ]);

  const login = async (phone, pw) => (await api("POST", "/auth/login", { body: { phone, password: pw } })).json.token;
  const admin = await login("9000000001", "adminpass1");
  const asha = await login("9000000002", "studentpw1");
  const bina = await login("9000000003", "studentpw1");

  // ---- today, built from the bank on the first request
  let r = await api("GET", "/tests/today", { token: asha });
  const today = r.json.test;
  check("a student past the free trial still gets today's quiz (it is free)", r.status === 200 && !!today, `${r.status} ${r.json.message || ""}`);
  check("it is the Daily GK Quiz", /^Daily GK Quiz/.test(today?.title || "") && today?.dailyQuizDate === istKey(), today?.title);
  check("it has exactly 20 questions", today?.questions?.length === 20, `${today?.questions?.length}`);
  const qs = await db.collection("questions").find({ _id: { $in: today.questions.map((id) => new mongoose.Types.ObjectId(id)) } }).toArray();
  check("all 20 are General Knowledge", qs.length === 20 && qs.every((x) => ["GK", "Current Affairs"].includes(x.subject)), qs.map((x) => x.subject).join(","));
  check("none is unpublished", qs.every((x) => x.status === "published"));
  check("they are spread across topics", new Set(qs.map((x) => x.topic)).size >= 5, `${new Set(qs.map((x) => x.topic)).size} topics`);
  check("installed apps list it like the old daily test", today.type === "revision" && today.isFree === true);

  r = await api("GET", "/tests/today", { token: bina });
  check("every student gets the same quiz", r.json.test?._id === today._id);
  r = await api("GET", "/tests/today", { token: asha });
  check("asking again returns the same quiz, not a new one", r.json.test?._id === today._id);
  check("only one quiz test exists for today", (await db.collection("tests").countDocuments({ dailyQuizDate: istKey() })) === 1);

  r = await api("GET", `/tests/${today._id}`, { token: bina });
  check("a student can open it", r.status === 200 && r.json.test?.questions?.length === 20, `${r.status} ${r.json.message || ""}`);

  // ---- the admin's view
  r = await api("GET", "/daily-quiz", { token: admin });
  const row = r.json.days?.find((d) => d.date === istKey());
  check("the panel shows today as ready, from the bank", row?.status === "ready" && row?.source === "bank", JSON.stringify(row));
  check("students cannot reach the admin endpoints", (await api("GET", "/daily-quiz", { token: asha })).status === 403);

  r = await api("GET", `/daily-quiz/${istKey()}`, { token: admin });
  check("the quiz detail lists the 20 questions with answers", r.json.questions?.length === 20 && r.json.questions.every((x) => x.correctIndex >= 0), `${r.status} ${JSON.stringify(r.json).slice(0,300)}`);
  check("...and reports nothing wrong with it", r.json.problems?.length === 0, (r.json.problems || []).join(" | "));

  const first = r.json.questions[0]._id;
  r = await api("POST", `/daily-quiz/${istKey()}/replace`, { token: admin, body: { questionId: first } });
  check("replacing a question puts another GK question in its place", r.status === 200 && r.json.questions.length === 20 && !r.json.questions.some((x) => x._id === first), `${r.status} ${r.json.message || ""}`);
  check("...still with nothing wrong", r.json.problems.length === 0, r.json.problems.join(" | "));

  const maths = await db.collection("questions").findOne({ subject: "Maths" });
  r = await api("POST", `/daily-quiz/${istKey()}/replace`, { token: admin, body: { questionId: r.json.questions[0]._id, withId: String(maths._id) } });
  check("a Maths question cannot be put in", r.status === 400, r.json.message);

  // ---- tomorrow, prepared by hand from the bank
  const tomorrow = istKey(1);
  r = await api("POST", `/daily-quiz/${tomorrow}/fill-bank`, { token: admin });
  check("tomorrow can be filled from the bank", r.status === 200 && r.json.questions?.length === 20, `${r.status} ${r.json.message || ""}`);
  check("...as a draft, for review", r.json.quiz?.status === "draft");
  const todayIds = new Set((await db.collection("tests").findOne({ dailyQuizDate: istKey() })).questions.map(String));
  check("tomorrow repeats nothing from today", r.json.questions.every((x) => !todayIds.has(x._id)));

  r = await api("PATCH", `/daily-quiz/${tomorrow}/status`, { token: admin, body: { status: "ready" } });
  check("a complete draft can be marked ready", r.status === 200 && r.json.quiz.status === "ready", r.json.message);

  // A quiz with an unpublished question is refused.
  const shaky = await db.collection("questions").findOne({ status: "under_review" });
  const tTest = await db.collection("tests").findOne({ dailyQuizDate: tomorrow });
  await db.collection("tests").updateOne({ _id: tTest._id }, { $set: { "questions.0": shaky._id } });
  await api("PATCH", `/daily-quiz/${tomorrow}/status`, { token: admin, body: { status: "draft" } });
  r = await api("PATCH", `/daily-quiz/${tomorrow}/status`, { token: admin, body: { status: "ready" } });
  check("a quiz holding an unpublished question cannot be marked ready", r.status === 400 && /not published/.test(r.json.message), r.json.message);

  // ---- the same fact asked twice in different words is caught
  const [tw1, tw2] = (await db.collection("questions").insertMany([
    { text: "Who was the founder of the Khudai Khidmatgar movement, also known as the Red Shirts?", textKey: "twin one", options: ["Gandhi", "Khan Abdul Ghaffar Khan", "Nehru", "Bose"], correctIndex: 1, solution: "s", subject: "GK", topic: "Freedom Movement", examType: ["SSC_CGL"], difficulty: "medium", source: "ai", status: "published" },
    { text: "Who among the following founded the Khudai Khidmatgar movement, known as the Red Shirts?", textKey: "twin two", options: ["Khan Abdul Ghaffar Khan", "Patel", "Tilak", "Azad"], correctIndex: 0, solution: "s", subject: "GK", topic: "Freedom Movement", examType: ["SSC_CGL"], difficulty: "medium", source: "ai", status: "published" },
  ])).insertedIds ? Object.values((await db.collection("questions").find({ topic: "Freedom Movement" }).toArray()).map((x) => x._id)) : [];
  const t2 = await db.collection("tests").findOne({ dailyQuizDate: tomorrow });
  await db.collection("tests").updateOne({ _id: t2._id }, { $set: { "questions.0": tw1, "questions.1": tw2 } });
  r = await api("GET", `/daily-quiz/${tomorrow}`, { token: admin });
  check("two questions asking the same fact in other words are flagged", r.json.problems.some((x) => /same thing in different words/.test(x)), r.json.problems.join(" | "));
  r = await api("POST", `/daily-quiz/${tomorrow}/fill-bank`, { token: admin });
  check("...and completing from the bank swaps the twin out, keeping 20", r.json.questions?.length === 20 && !r.json.problems.some((x) => /same thing/.test(x)),
    `${r.json.questions?.length} ${(r.json.problems || []).join(" | ")}`);
  check("...keeping the first of the pair", r.json.questions.some((x) => String(x._id) === String(tw1)) && !r.json.questions.some((x) => String(x._id) === String(tw2)));
  await db.collection("questions").deleteMany({ topic: "Freedom Movement" });

  // ---- the bank runs out: 44 GK in all, 40 used by two days
  r = await api("POST", `/daily-quiz/${istKey(2)}/fill-bank`, { token: admin });
  check("with too few unused GK questions it says so instead of making a short quiz",
    r.status >= 400 && /unused published GK questions/.test(r.json.message || ""), `${r.status} ${r.json.message}`);
  check("...and makes no test for that day", (await db.collection("tests").countDocuments({ dailyQuizDate: istKey(2) })) === 0);

  // ---- AI: two batches of 10, left as a draft when an admin asked for it
  const day3 = istKey(3);
  r = await api("POST", `/daily-quiz/${day3}/generate-ai`, { token: admin });
  check("AI generation is queued", r.status === 200, r.json.message);
  let detail;
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    detail = (await api("GET", `/daily-quiz/${day3}`, { token: admin })).json;
    if (detail.job?.status === "done" || detail.job?.status === "failed") break;
  }
  check("the queue makes it", detail.job?.status === "done", JSON.stringify(detail.job));
  check("it has 20 questions", detail.questions?.length === 20, `${detail.questions?.length}`);
  check("...all GK", detail.questions?.every((x) => x.subject === "GK"));
  check("an admin-requested AI quiz waits as a draft for review", detail.quiz?.status === "draft", detail.quiz?.status);
  const gen = fs.existsSync(calls) ? fs.readFileSync(calls, "utf8").trim().split("\n").map(JSON.parse) : [];
  const gkCalls = gen.filter((c) => c.subject === "GK");
  check("it was asked for in batches of 10, never 20 at once", gkCalls.length >= 2 && gkCalls.every((c) => c.count <= 14), gkCalls.map((c) => c.count).join(","));

  // ---- turning the bank off: no quiz -> the old personalised test
  await db.collection("dailyquizsettings").updateOne({ key: "dailyQuiz" }, { $set: { autoFromBank: false } }, { upsert: true });
  await db.collection("dailyquizzes").deleteOne({ date: istKey() });
  await db.collection("tests").deleteMany({ dailyQuizDate: istKey() });
  r = await api("GET", "/tests/today", { token: asha });
  check("with no quiz and the bank off, the app gets the old behaviour (trial over -> subscribe)",
    r.status === 402 && r.json.code === "SUBSCRIPTION_REQUIRED", `${r.status} ${r.json.code}`);

  r = await api("PATCH", "/daily-quiz/settings", { token: admin, body: { autoFromBank: true, autoAI: false, daysAhead: 3 } });
  check("settings can be changed", r.status === 200 && r.json.settings.autoFromBank === true && r.json.settings.daysAhead === 3);
  r = await api("PATCH", "/daily-quiz/settings", { token: admin, body: { daysAhead: 30 } });
  check("days ahead is kept sensible", r.status === 400);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();
  const passed = results.filter((x) => x.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
