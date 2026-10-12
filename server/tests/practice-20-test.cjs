// A practice test holds 20 questions, asked for ten at a time, and a chapter
// can have a series of tests for one of its topics as well as for the whole
// chapter. The tests built when a test held 12 stay live and are topped up to
// 20 through the Generation queue - nobody has to unpublish them first.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5091;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");
const CALLS = path.join(__dirname, "gen-calls.jsonl");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const calls = () =>
  fs.existsSync(CALLS) ? fs.readFileSync(CALLS, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse) : [];

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
  const uri = mem.getUri() + "practice20_test";
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
  const oid = (id) => new mongoose.Types.ObjectId(String(id));

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);
  const student = await db.collection("users").insertOne({
    name: "Student", phone: "9000000001", role: "student", referralCode: "STU", activeSessionId: "s1", examGoals: ["SSC_CGL"],
  });
  const stoken = jwt.sign({ id: student.insertedId.toString(), sessionId: "s1" }, JWT_SECRET);

  await api("POST", "/exams", { token, body: {
    examType: "SSC_CGL", displayName: "SSC CGL", durationMinutes: 60,
    sections: [{ subject: "Maths", questionCount: 20, difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
  }});
  await api("POST", "/subjects", { token, body: {
    name: "Maths", displayOrder: 1,
    chapters: [{ name: "Percentage", category: "Arithmetic", topics: ["Successive change", "Percentage error"], exams: ["SSC_CGL"] }],
  }});

  // ---- a whole-chapter test: 20 questions, asked for ten at a time
  fs.writeFileSync(CALLS, "");
  let r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", difficulty: "easy" },
  });
  check("a practice test is built with 20 questions", r.status === 201 && r.json.test?.questionCount === 20,
    `${r.status} ${r.json.test?.questionCount} ${r.json.message || ""}`);
  let made = calls();
  check("...asked for in batches of ten, not one request for twenty",
    made.length >= 2 && made.every((c) => c.count <= 10 + 4), made.map((c) => c.count).join("+"));
  check("...covering every topic of the chapter",
    made.every((c) => c.syllabusTopics.includes("Successive change") && c.syllabusTopics.includes("Percentage error")));
  const chapterTest = await db.collection("tests").findOne({ _id: oid(r.json.test._id) });
  check("...with a minute a question", chapterTest.durationMinutes === 20, `${chapterTest.durationMinutes} min`);
  check("...and no topic of its own", !chapterTest.subtopic && chapterTest.title === "Percentage · Mixed Practice · Easy #1", chapterTest.title);
  const firstTwenty = new Set(chapterTest.questions.map(String));
  check("...twenty different questions", firstTwenty.size === 20, `${firstTwenty.size}`);

  // ---- a test for one topic of the chapter
  fs.writeFileSync(CALLS, "");
  r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", subtopic: "Successive change", difficulty: "easy" },
  });
  check("a test can be built for one topic of the chapter", r.status === 201 && r.json.test?.questionCount === 20,
    `${r.status} ${r.json.message || ""}`);
  made = calls();
  check("...and asks about that topic alone", made.length && made.every((c) => c.syllabusTopics.join() === "Successive change"),
    JSON.stringify(made.map((c) => c.syllabusTopics)));
  const topicTest = await db.collection("tests").findOne({ _id: oid(r.json.test?._id) });
  check("...it remembers its topic", topicTest?.subtopic === "Successive change");
  check("...and is #1 of its own series, not #2 of the chapter's",
    topicTest?.seriesNumber === 1 && topicTest?.title === "Percentage · Successive change · Easy #1", topicTest?.title);

  r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", subtopic: "Compound interest", difficulty: "easy" },
  });
  check("a topic the chapter does not have is refused", r.status === 400 && /not one of the topics/.test(r.json.message || ""),
    `${r.status} ${r.json.message}`);

  // ---- publishing: twenty or nothing
  r = await api("PATCH", `/exam-series/practice/${chapterTest._id}/publish`, { token, body: { isFree: true } });
  check("a full test publishes", r.status === 200, `${r.status} ${r.json.message || ""}`);
  r = await api("PATCH", `/exam-series/practice/${topicTest._id}/publish`, { token, body: { isFree: false } });
  check("...a topic test too", r.status === 200, `${r.status} ${r.json.message || ""}`);

  // An old test, built when a test held 12 - and already live.
  const oldQs = await db.collection("questions").insertMany(
    Array.from({ length: 12 }, (_, i) => ({
      text: `Old question ${i + 1}: a price rises by ${i + 5} percent, what is the new price?`,
      textKey: `old-${i}`, options: ["a", "b", "c", "d"], correctIndex: 0, solution: "Worked solution here.",
      subject: "Maths", topic: "Successive change", chapter: "Percentage", examType: ["SSC_CGL"],
      difficulty: "medium", status: "published",
    }))
  );
  const oldIds = Object.values(oldQs.insertedIds);
  const old = await db.collection("tests").insertOne({
    title: "Percentage - Medium #1", type: "practice", examType: "PRACTICE", examStage: "PRACTICE",
    subject: "Maths", topic: "Percentage", difficultyLevel: "medium", seriesNumber: 1,
    questions: oldIds, durationMinutes: 12, publishStatus: "published", isFree: true, createdBy: "admin",
    createdAt: new Date(), updatedAt: new Date(),
  });
  const draft12 = await db.collection("tests").insertOne({
    title: "Percentage - Hard #1", type: "practice", examType: "PRACTICE", examStage: "PRACTICE",
    subject: "Maths", topic: "Percentage", difficultyLevel: "hard", seriesNumber: 1,
    questions: oldIds, durationMinutes: 12, publishStatus: "draft", createdBy: "admin",
  });
  r = await api("PATCH", `/exam-series/practice/${draft12.insertedId}/publish`, { token, body: { isFree: false } });
  check("a 12-question draft can no longer be published", r.status === 400 && /12 of 20/.test(r.json.message || ""),
    `${r.status} ${r.json.message}`);
  await db.collection("tests").deleteOne({ _id: draft12.insertedId });

  // ---- what the admin sees
  r = await api("GET", "/exam-series/subjects/list", { token });
  const pct = r.json.subjects?.[0]?.chapters?.[0];
  check("the subject list says how big a test is", r.json.testSize === 20, `${r.json.testSize}`);
  check("...and how many tests are short", r.json.shortTests === 1, `${r.json.shortTests}`);
  check("...with a count per topic of the chapter", pct?.subtopicCounts?.["Successive change"]?.published === 1,
    JSON.stringify(pct?.subtopicCounts));

  r = await api("GET", "/subjects/health", { token });
  const oldLine = (r.json.problems || []).find((p) => p.kind === "test_old_size");
  check("the health check names the 12-question tests once, not as an alarm each",
    oldLine && oldLine.severity === "medium" && /1 live practice test/.test(oldLine.detail),
    oldLine ? oldLine.detail : JSON.stringify((r.json.problems || []).map((p) => p.kind)));

  r = await api("GET", "/generation/gaps", { token });
  check("a topic test does not count as the chapter's own level being built",
    !r.json.practice.some((g) => g.chapter === "Percentage" && g.difficulty === "easy") &&
      r.json.practice.some((g) => g.chapter === "Percentage" && g.difficulty === "advanced"),
    r.json.practice.map((g) => g.label).join(" | "));
  check("...and the short list names the old test by id", r.json.short.some((s) => String(s.testId) === String(old.insertedId) && s.have === 12));

  // ---- the student's side
  r = await api("GET", `/tests/practice-series/Maths/Percentage`, { token: stoken });
  check("an app that names no topic gets every test of the chapter, as before",
    r.status === 200 && r.json.tests.length === 3, `${r.status} ${r.json.tests?.length}`);
  check("...and is told which topics have tests of their own",
    r.json.subtopics?.length === 1 && r.json.subtopics[0].name === "Successive change" && r.json.subtopics[0].tests === 1,
    JSON.stringify(r.json.subtopics));
  check("...and, for the choose-a-series screen, every subtopic with its count, empty ones included",
    JSON.stringify(r.json.allSubtopics) === JSON.stringify([{ name: "Successive change", tests: 1 }, { name: "Percentage error", tests: 0 }]),
    JSON.stringify(r.json.allSubtopics));
  r = await api("GET", `/tests/practice-series/Maths/Percentage?subtopic=${encodeURIComponent("Successive change")}`, { token: stoken });
  check("asking for one topic gives that topic's tests only",
    r.json.tests.length === 1 && r.json.tests[0].subtopic === "Successive change", `${r.json.tests?.length}`);
  r = await api("GET", `/tests/practice-series/Maths/Percentage?subtopic=`, { token: stoken });
  check("asking for the chapter itself leaves the topic tests out",
    r.json.tests.length === 2 && r.json.tests.every((t) => !t.subtopic), `${r.json.tests?.length}`);

  // ---- topping the old test up, through the queue, while it stays live
  const clock = (await api("GET", "/generation/activity", { token })).json.serverTime;
  check("the panel's activity feed answers with the server's clock", !!clock && !Number.isNaN(Date.parse(clock)), `${clock}`);
  r = await api("GET", "/generation/activity", {});
  check("...and only for an admin", r.status === 401, `${r.status}`);
  r = await api("POST", "/generation/enqueue-short", { token });
  check("the short tests are queued to be topped up", r.status === 201 && r.json.queued === 1, `${r.status} ${r.json.message}`);
  r = await api("POST", "/generation/enqueue-short", { token });
  check("...pressing it again does not queue the same test twice", r.json.queued === 0 && r.json.alreadyThere === 1,
    `${r.json.queued} new, ${r.json.alreadyThere} waiting`);

  for (let i = 0; i < 60; i++) {
    const s = await api("GET", "/generation/status", { token });
    if (s.json.counts.queued === 0 && s.json.counts.running === 0) break;
    await sleep(1000);
  }
  const job = await db.collection("generationjobs").findOne({ kind: "top_up" });
  check("the worker tops it up", job?.status === "done", `${job?.status} ${job?.result || job?.lastError || ""}`);
  const after = await db.collection("tests").findOne({ _id: old.insertedId });
  check("...to 20 questions", after.questions.length === 20, `${after.questions.length}`);
  check("...keeping the 12 it had", oldIds.every((id) => after.questions.some((q) => String(q) === String(id))));
  check("...still live and still free", after.publishStatus === "published" && after.isFree === true);
  check("...with its clock grown to match", after.durationMinutes === 20, `${after.durationMinutes} min`);
  r = await api("GET", `/generation/activity?since=${encodeURIComponent(clock)}`, { token });
  const news = (r.json.finished || []).find((j) => j.kind === "top_up");
  check("the activity feed reports the top-up as finished, so the panel can say so",
    news?.status === "done" && news.testTitle === after.title && news.subject === "Maths" && news.chapter === "Percentage",
    JSON.stringify(news || r.json).slice(0, 200));
  check("...with nothing left running or waiting", !r.json.running && r.json.waiting.length === 0);
  r = await api("GET", `/generation/activity?since=${encodeURIComponent(new Date().toISOString())}`, { token });
  check("...and does not report it again once seen", r.json.finished.length === 0, `${r.json.finished.length}`);

  r = await api("POST", "/generation/enqueue-short", { token });
  check("once full, nothing is left to top up", r.json.queued === 0 && /full/.test(r.json.message || ""), r.json.message);

  // ---- a test built from the queue, for a topic
  r = await api("POST", "/generation/enqueue-practice", {
    token, body: { subject: "Maths", chapter: "Percentage", subtopic: "Successive change", difficulty: "easy" },
  });
  check("the admin can queue a topic test", r.status === 201, `${r.status} ${r.json.message}`);
  r = await api("POST", "/generation/enqueue-practice", {
    token, body: { subject: "Maths", chapter: "Percentage", subtopic: "Successive change", difficulty: "easy" },
  });
  check("...but not the same one twice while it waits", r.json.queued === 0, r.json.message);
  r = await api("POST", "/generation/enqueue-practice", {
    token, body: { subject: "Maths", chapter: "Percentage", difficulty: "easy" },
  });
  check("...while the whole-chapter test of that level is a different job", r.status === 201, r.json.message);
  r = await api("POST", "/generation/enqueue-practice", {
    token, body: { subject: "Maths", chapter: "Percentage", subtopic: "Compound interest", difficulty: "easy" },
  });
  check("a topic the chapter does not have is refused before it is queued", r.status === 400, `${r.status} ${r.json.message}`);
  for (let i = 0; i < 60; i++) {
    const s = await api("GET", "/generation/status", { token });
    if (s.json.counts.queued === 0 && s.json.counts.running === 0) break;
    await sleep(1000);
  }
  const series = await db.collection("tests")
    .find({ type: "practice", topic: "Percentage", difficultyLevel: "easy" })
    .sort({ createdAt: 1 }).toArray();
  check("the queue builds both, each the next in its own series",
    series.map((t) => t.title).join(" | ") ===
      "Percentage · Mixed Practice · Easy #1 | Percentage · Successive change · Easy #1 | Percentage · Successive change · Easy #2 | Percentage · Mixed Practice · Easy #2",
    series.map((t) => t.title).join(" | "));
  check("...20 questions each", series.every((t) => t.questions.length === 20), series.map((t) => t.questions.length).join(","));
  check("...as drafts for the admin to review", series.slice(2).every((t) => t.publishStatus === "draft"));

  // ---- older names brought into the new format
  await db.collection("tests").updateOne({ _id: old.insertedId }, { $set: { title: "Percentage - Medium #1" } });
  r = await api("POST", "/exam-series/practice/rename-all", { token });
  const renamedOld = await db.collection("tests").findOne({ _id: old.insertedId });
  check("older practice tests are renamed chapter · series · level #n", r.status === 200 && renamedOld.title === "Percentage · Mixed Practice · Medium #1",
    `${r.status} ${renamedOld.title} ${r.json.message}`);
  r = await api("POST", "/exam-series/practice/rename-all", { token });
  check("...and a second run changes nothing", r.json.renamed === 0, r.json.message);

  // ---- a removed question is replaced, keeping the test at 20
  const victim = String(after.questions[0]);
  await db.collection("tests").updateOne({ _id: old.insertedId }, { $set: { publishStatus: "draft" } });
  r = await api("DELETE", `/exam-series/mock/${old.insertedId}/question/${victim}`, { token });
  check("removing a question puts another in its place, at 20", r.status === 200 && r.json.remainingCount === 20,
    `${r.status} ${r.json.remainingCount} ${r.json.message || ""}`);

  // ---- "Add questions" on a draft fills to 20
  await db.collection("tests").updateOne({ _id: old.insertedId }, { $pop: { questions: 1 } });
  await db.collection("tests").updateOne({ _id: old.insertedId }, { $pop: { questions: 1 } });
  r = await api("POST", `/exam-series/practice/${old.insertedId}/add-questions`, { token, body: {} });
  check("Add questions brings a draft back to 20", r.status === 200 && r.json.total === 20, `${r.status} ${r.json.message}`);

  const passed = results.filter((x) => x.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  if (fs.existsSync(CALLS)) fs.unlinkSync(CALLS);
  await mongoose.disconnect();
  srv.kill();
  await mem.stop();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
