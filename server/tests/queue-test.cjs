// Generation used to be a loop held open in a browser tab. Close the tab and
// it stopped; there was nowhere to see what was done, what was left, or why
// anything had failed. A run of 113 lost its last 29 to a spent daily
// allowance and nobody could tell until the numbers were counted by hand.
//
// It is rows in a collection and a worker now. What has to be true:
//   - the admin asks for "everything missing" and does not name 113 things
//   - asking twice does not queue everything twice
//   - a failure that might clear is retried; one that will not is not
//   - a spent daily allowance PAUSES the queue instead of burning the rest
//   - a pause survives a restart
//   - the panel can always say what is happening
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5077;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 88) + "]" : ""}`);
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

(async () => {
  // ---- the worker's own decisions, without a server
  const worker = require(path.join(SERVER, "jobs/generationWorker"));
  check("a spent daily allowance is recognised",
    ["Every model has used its allowance for today (a, b, c)",
     "Gemini API error (429): GenerateRequestsPerDayPerProjectPerModel-FreeTier",
    ].every(worker.isDailyAllowanceGone));
  check("...and is NOT treated as worth retrying",
    !worker.isWorthRetrying("Every model has used its allowance for today"));
  check("a sleeping instance or a busy model IS worth retrying",
    ["Failed to fetch", "fetch failed", "socket hang up", "503 high demand", "ETIMEDOUT"]
      .every(worker.isWorthRetrying));
  check("...and a genuinely bad job is neither",
    !worker.isWorthRetrying("No questions survived the quality gate") &&
    !worker.isDailyAllowanceGone("No questions survived the quality gate"));

  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "queue_test";
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

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  await api("POST", "/exams", { token, body: {
    examType: "SSC_CGL", displayName: "SSC CGL", durationMinutes: 60, marksPerQuestion: 2, negativeMarking: 0.5,
    sections: [{ subject: "Maths", questionCount: 12, difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Percentage", subTopics: ["successive change"] }] }],
  }});
  await api("POST", "/subjects", { token, body: {
    name: "Maths", displayOrder: 1,
    chapters: [
      { name: "Percentage", category: "अंकगणित", topics: ["Percentage"], exams: ["SSC_CGL"] },
      { name: "Average", category: "अंकगणित", topics: ["Average"], exams: ["SSC_CGL"] },
    ],
  }});

  // ---- what is missing, without anyone naming it
  let r = await api("GET", "/generation/gaps", { token });
  check("the system works out what is missing on its own", r.status === 200 && r.json.totals.practice === 8,
    `${r.json.totals?.practice} practice gaps (2 chapters x 4 levels)`);
  check("...easiest level first, so a new chapter has a rung to start on",
    r.json.practice[0].difficulty === "easy", r.json.practice[0]?.label);
  check("...and it knows the exam has no mock yet", r.json.totals.mocks === 1, `${r.json.totals?.mocks}`);

  // ---- queue it all with one press
  r = await api("POST", "/generation/enqueue", { token, body: { practice: true, mocks: false } });
  check("one press queues everything missing", r.status === 201 && r.json.queued === 8, `${r.json.queued} queued`);

  r = await api("POST", "/generation/enqueue", { token, body: { practice: true, mocks: false } });
  check("pressing it again does not queue the same work twice",
    r.json.queued === 0, `${r.json.queued} new, ${r.json.alreadyThere} already waiting`);

  // ---- the panel can see it
  r = await api("GET", "/generation/status", { token });
  check("the panel can see the queue", r.status === 200 && r.json.total === 8, `total ${r.json.total}`);
  check("...with a percentage for the bar", typeof r.json.percentDone === "number", `${r.json.percentDone}%`);
  check("...and which model the work is going to", !!r.json.ai?.inUse, r.json.ai?.inUse);
  check("...and how much of the catalog exists", r.json.coverage?.practice?.possible === 8,
    `${r.json.coverage?.practice?.built}/${r.json.coverage?.practice?.possible}`);

  // ---- and it actually builds them
  for (let i = 0; i < 60; i++) {
    const s = await api("GET", "/generation/status", { token });
    if (s.json.counts.queued === 0 && s.json.counts.running === 0) break;
    await sleep(1000);
  }
  r = await api("GET", "/generation/status", { token });
  check("the worker builds the queued tests", r.json.counts.done === 8,
    `done ${r.json.counts.done}, failed ${r.json.counts.failed}, queued ${r.json.counts.queued}`);
  const tests = await db.collection("tests").find({ type: "practice" }).toArray();
  check("...as real tests of twelve questions", tests.length === 8 && tests.every((t) => t.questions.length === 12),
    `${tests.length} tests, sizes ${[...new Set(tests.map((t) => t.questions.length))].join(",")}`);
  check("...one per chapter and level, none duplicated",
    new Set(tests.map((t) => t.topic + "|" + t.difficultyLevel)).size === 8);
  check("...and they arrive as drafts, not live to students",
    tests.every((t) => t.publishStatus === "draft"));

  r = await api("GET", "/generation/gaps", { token });
  check("nothing is left missing afterwards", r.json.totals.practice === 0, `${r.json.totals.practice} left`);

  // ---- the barren path: generation produced nothing
  // Only reached when the allowance is spent, so it never ran in a test and
  // shipped a crash instead of a message.
  await api("POST", "/subjects", { token, body: {
    name: "NothingComesBack", displayOrder: 9,
    chapters: [{ name: "Barren", topics: ["Barren"], exams: ["SSC_CGL"] }],
  }});
  await db.collection("generationjobs").insertOne({
    kind: "practice", subject: "NothingComesBack", chapter: "Barren", difficulty: "easy",
    label: "barren path", status: "queued", attempts: 0, queuedAt: new Date(),
  });
  for (let i = 0; i < 40; i++) {
    const j = await db.collection("generationjobs").findOne({ label: "barren path" });
    if (j.status === "failed") break;
    await sleep(1000);
  }
  const barren = await db.collection("generationjobs").findOne({ label: "barren path" });
  check("a job that generates nothing fails with a message, not a crash",
    barren.status === "failed" && /No questions were generated/.test(barren.lastError || ""), barren.lastError);
  check("...and does not report a missing variable",
    !/is not defined|undefined/.test(barren.lastError || ""), barren.lastError);

  // ---- pause and resume
  await api("POST", "/generation/enqueue", { token, body: { practice: true, mocks: true } });
  r = await api("POST", "/generation/pause", { token });
  check("the admin can stop it", r.json.paused === true, r.json.message);
  const stateDoc = await db.collection("queuestates").findOne({ key: "generation" });
  check("...and the pause is written down, so a restart does not undo it", stateDoc.paused === true);

  const before = await db.collection("generationjobs").countDocuments({ status: "queued" });
  await sleep(7000);
  const after = await db.collection("generationjobs").countDocuments({ status: "queued" });
  check("...and nothing is picked up while it is paused", before === after, `${before} -> ${after}`);

  // ---- a build the server was killed in the middle of
  // The free instance stops whenever nobody is using the site. The job it was
  // building stayed marked "running" for ever, and the worker only looks for
  // queued ones - so one interrupted build stopped the whole queue while the
  // panel went on saying "building now".
  const old = new Date(Date.now() - 40 * 60 * 1000);
  await db.collection("generationjobs").insertOne({
    kind: "practice", subject: "Maths", chapter: "Percentage", difficulty: "medium",
    label: "killed mid-build", status: "running", attempts: 1, startedAt: old, queuedAt: old,
  });
  await db.collection("generationjobs").insertOne({
    kind: "practice", subject: "Maths", chapter: "Average", difficulty: "hard",
    label: "hangs every time", status: "running", attempts: 3, startedAt: old, queuedAt: old,
  });
  for (let i = 0; i < 20; i++) {
    const j = await db.collection("generationjobs").findOne({ label: "killed mid-build" });
    if (j.status !== "running") break;
    await sleep(1000);
  }
  const revived = await db.collection("generationjobs").findOne({ label: "killed mid-build" });
  check("a build the server was killed in the middle of goes back in the queue",
    revived.status === "queued", `${revived.status} - ${revived.lastError || ""}`);
  check("...and says so, instead of leaving the panel to guess",
    /restarted mid-build/i.test(revived.lastError || ""), revived.lastError);
  const looping = await db.collection("generationjobs").findOne({ label: "hangs every time" });
  check("...but one that has already been picked up three times is failed, not looped",
    looping.status === "failed", `${looping.status} after ${looping.attempts} attempts`);
  check("...even while the queue is paused, because a stuck row is not work",
    (await db.collection("queuestates").findOne({ key: "generation" })).paused === true);
  await db.collection("generationjobs").deleteMany({ label: { $in: ["killed mid-build", "hangs every time"] } });

  // ---- keeping the instance up, but only while it is needed
  // The free plan stops the service when nobody is visiting, which would
  // land in the middle of nearly every run. It pings itself to stay up - and
  // must stop the moment there is nothing left to build, or it is just
  // holding a free instance open for no reason.
  const keepAwake = require(path.join(SERVER, "jobs/keepAwake"));
  check("it does not ping at all when there is no public URL to ping",
    keepAwake.startKeepAwake() === false);

  const pinged = [];
  const realFetch = global.fetch;
  global.fetch = async (u) => { pinged.push(String(u)); return { ok: true }; };
  process.env.RENDER_EXTERNAL_URL = "https://example.invalid";
  await keepAwake.pingIfBuilding();
  check("...and does not ping while the queue is paused", pinged.length === 0, `${pinged.length} pings`);

  await db.collection("queuestates").updateOne({ key: "generation" }, { $set: { paused: false } });
  await keepAwake.pingIfBuilding();
  check("...but does keep itself up while there is still work", pinged.length === 1, pinged[0]);

  await db.collection("generationjobs").updateMany({ status: "queued" }, { $set: { status: "done" } });
  await keepAwake.pingIfBuilding();
  check("...and stops once the queue is empty", pinged.length === 1, `${pinged.length} pings total`);

  await db.collection("generationjobs").updateMany({ status: "done" }, { $set: { status: "queued" } });
  await db.collection("queuestates").updateOne({ key: "generation" }, { $set: { paused: true } });
  global.fetch = realFetch;
  delete process.env.RENDER_EXTERNAL_URL;

  r = await api("POST", "/generation/resume", { token });
  check("the admin can start it again", r.json.paused === false, r.json.message);

  // ---- a spent allowance pauses instead of burning the run
  await api("POST", "/generation/pause", { token });
  await db.collection("generationjobs").deleteMany({});
  await db.collection("generationjobs").insertOne({
    kind: "practice", subject: "Maths", chapter: "Percentage", difficulty: "easy",
    label: "spent allowance case", status: "failed", attempts: 1,
    lastError: "Every model has used its allowance for today (a, b, c)",
    queuedAt: new Date(), finishedAt: new Date(),
  });
  r = await api("POST", "/generation/retry-failed", { token });
  check("failed jobs can be put back in one press", r.json.requeued === 1, r.json.message);
  const backIn = await db.collection("generationjobs").findOne({});
  check("...with the attempt count reset so they get a fair try", backIn.status === "queued" && backIn.attempts === 0);

  // ---- and a student cannot touch any of it
  const student = await db.collection("users").insertOne({ name: "S", phone: "9111111111", role: "user", referralCode: "S1" });
  const sToken = jwt.sign({ id: student.insertedId.toString(), sessionId: "y" }, JWT_SECRET);
  const denied = await api("POST", "/generation/enqueue", { token: sToken, body: {} });
  check("a student cannot queue generation", denied.status === 401 || denied.status === 403, `${denied.status}`);
  const deniedStatus = await api("GET", "/generation/status", { token: sToken });
  check("...nor read the queue", deniedStatus.status === 401 || deniedStatus.status === 403, `${deniedStatus.status}`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
