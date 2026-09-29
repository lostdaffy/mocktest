// A live exam is the one moment every student arrives at once: they all
// open it at the start time, autosave together every 20 seconds, and all
// submit in the same final seconds - many of them on a slow phone that
// sends the same request twice.
//
// This is not a benchmark of production (a free instance is far slower than
// this machine). It is a hunt for what BREAKS under concurrency: duplicate
// attempts, a free slot charged twice, a rank that counts one student twice,
// a submit that fails for a crowd but not for one person.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5089;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

const PAID = Number(process.env.LOAD_STUDENTS || 300);
const FREE = 40;           // free-tier students - the ones a double charge would hurt
const DOUBLE_TAP = 80;     // students whose phone sends "open exam" twice at once
const GHOSTS = 30;         // enter, autosave, never tap submit
const QUESTIONS = 100;

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 120) + "]" : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, p, token, body) {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + p, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = {};
    try { json = await res.json(); } catch {}
    return { status: res.status, json, ms: performance.now() - t0 };
  } catch (err) {
    return { status: 0, json: { message: err.message }, ms: performance.now() - t0 };
  }
}
const stats = (rs) => {
  const ms = rs.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p) => Math.round(ms[Math.min(ms.length - 1, Math.floor((p / 100) * ms.length))]);
  const codes = {};
  rs.forEach((r) => (codes[r.status] = (codes[r.status] || 0) + 1));
  return { n: rs.length, p50: pct(50), p95: pct(95), max: Math.round(ms[ms.length - 1]), codes };
};
const fmt = (s) => `${s.n} req · p50 ${s.p50}ms · p95 ${s.p95}ms · max ${s.max}ms · ${JSON.stringify(s.codes)}`;

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "live_load";
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

  // ---- a paper and a crowd
  const qs = Array.from({ length: QUESTIONS }, (_, i) => ({
    text: `Load question ${i}: what is ${i} + ${i}?`, textHi: "प्रश्न",
    options: [`${2 * i}`, `${2 * i + 1}`, `${2 * i + 2}`, `${2 * i + 3}`], optionsHi: ["अ", "ब", "स", "द"],
    correctIndex: 0, solution: `${i} + ${i} = ${2 * i}`, solutionHi: "हल",
    subject: i % 2 ? "Maths" : "English", topic: "Load", difficulty: "easy", status: "published",
    source: "ai_generated", examType: ["SSC_CGL"], createdAt: new Date(),
  }));
  const qIds = Object.values((await db.collection("questions").insertMany(qs)).insertedIds);
  const test = await db.collection("tests").insertOne({
    title: "Load Live #1", type: "live", examType: "SSC_CGL", examStage: "SSC_CGL", questions: qIds,
    durationMinutes: 60, marksPerQuestion: 2, negativeMarking: 0.5, scheduledAt: new Date(Date.now() - 60 * 1000),
    liveStatus: "live", publishStatus: "published", createdBy: "admin", createdAt: new Date(),
  });
  const testId = test.insertedId.toString();

  const mkUsers = async (n, paid, tag) => {
    const docs = Array.from({ length: n }, (_, i) => ({
      name: `${tag} ${i}`, phone: `9${tag === "paid" ? 1 : 2}${String(i).padStart(8, "0")}`, role: "student",
      referralCode: `${tag}${i}`, activeSessionId: `s-${tag}-${i}`, createdAt: new Date(),
      freeUsage: { liveExamsUsed: 0 },
      ...(paid ? { subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000) } : {}),
    }));
    const ids = Object.values((await db.collection("users").insertMany(docs)).insertedIds);
    return ids.map((id, i) => ({ id, token: jwt.sign({ id: id.toString(), sessionId: `s-${tag}-${i}` }, JWT_SECRET) }));
  };
  const paid = await mkUsers(PAID, true, "paid");
  const free = await mkUsers(FREE, false, "free");
  const everyone = [...paid, ...free];
  console.log(`\n${everyone.length} students, ${QUESTIONS}-question live exam\n`);

  // ================= the start: everyone opens it at once =================
  const opens = everyone.map((s) => call("GET", `/tests/${testId}`, s.token));
  // Slow phones retrying: the same request, twice, at the same moment.
  const doubled = [...paid.slice(0, DOUBLE_TAP - FREE), ...free].map((s) => call("GET", `/tests/${testId}`, s.token));
  const entry = await Promise.all([...opens, ...doubled]);
  const es = stats(entry);
  console.log("  entry   ", fmt(es));
  check("every student gets in when they all arrive together", entry.every((r) => r.status === 200), JSON.stringify(es.codes));

  const perStudent = await db.collection("attempts").aggregate([
    { $match: { test: new mongoose.Types.ObjectId(testId) } },
    { $group: { _id: "$user", n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]).toArray();
  check("a double tap does not create a second attempt", perStudent.length === 0, `${perStudent.length} students with 2+ attempts`);

  const freeDocs = await db.collection("users").find({ _id: { $in: free.map((s) => s.id) } }).toArray();
  const overCharged = freeDocs.filter((u) => (u.freeUsage?.liveExamsUsed || 0) > 1);
  check("a double tap does not use up two free live exams", overCharged.length === 0,
    `${overCharged.length} of ${FREE} free students charged twice`);

  // ================= autosave: everyone at once =================
  const answersFor = (k, upto) => qIds.slice(0, upto).map((id, i) => ({
    questionId: String(id), selectedIndex: (i + k) % 5 === 0 ? 1 : 0, timeTakenSeconds: 20,
  }));
  const saves = await Promise.all(everyone.map((s, k) => call("PATCH", `/tests/${testId}/progress`, s.token, { answers: answersFor(k, 50) })));
  const ss = stats(saves);
  console.log("  autosave", fmt(ss));
  check("an autosave burst is absorbed", saves.every((r) => r.status === 200 && r.json.saved), JSON.stringify(ss.codes));

  // ================= the end: everyone submits in the same seconds =================
  const submitters = everyone.slice(0, everyone.length - GHOSTS);
  const ghosts = everyone.slice(everyone.length - GHOSTS);
  const subs = await Promise.all([
    ...submitters.map((s, k) => call("POST", `/tests/${testId}/submit`, s.token, { answers: answersFor(k, QUESTIONS) })),
    // and the phones that send submit twice
    ...submitters.slice(0, 40).map((s, k) => call("POST", `/tests/${testId}/submit`, s.token, { answers: answersFor(k, QUESTIONS) })),
  ]);
  const sb = stats(subs);
  console.log("  submit  ", fmt(sb));
  check("a crowd of submissions is graded, not errored", subs.every((r) => r.status === 200 || r.status === 201), JSON.stringify(sb.codes));

  const submittedAttempts = await db.collection("attempts").find({ test: new mongoose.Types.ObjectId(testId), status: { $ne: "in_progress" } }).toArray();
  const dupSubmitted = await db.collection("attempts").aggregate([
    { $match: { test: new mongoose.Types.ObjectId(testId) } },
    { $group: { _id: "$user", n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } },
  ]).toArray();
  check("a double submit leaves one attempt, graded once", dupSubmitted.length === 0 && submittedAttempts.length === submitters.length,
    `${submittedAttempts.length} submitted for ${submitters.length} students, ${dupSubmitted.length} duplicated`);

  // ================= the window closes =================
  await db.collection("tests").updateOne({ _id: test.insertedId }, { $set: { scheduledAt: new Date(Date.now() - 70 * 60 * 1000) } });
  const { runLiveExamTick } = require(path.join(SERVER, "jobs/liveExamScheduler"));
  const t0 = performance.now();
  await runLiveExamTick();
  const finalizeMs = Math.round(performance.now() - t0);
  const left = await db.collection("attempts").countDocuments({ test: new mongoose.Types.ObjectId(testId), status: "in_progress" });
  check("everyone who never tapped submit is finalized when it closes", left === 0, `${GHOSTS} stragglers in ${finalizeMs}ms`);

  // ================= question counters, added up once after the close =================
  await runLiveExamTick(); // a second tick must not add them again
  const [first, last] = await Promise.all([
    db.collection("questions").findOne({ _id: qIds[0] }),
    db.collection("questions").findOne({ _id: qIds[QUESTIONS - 1] }),
  ]);
  check("each question's counters include every student who answered it",
    first.timesAttempted === everyone.length && last.timesAttempted === everyone.length - GHOSTS,
    `q1 ${first.timesAttempted} (expected ${everyone.length}), q${QUESTIONS} ${last.timesAttempted} (expected ${everyone.length - GHOSTS}; stragglers had only saved 50)`);
  check("...counted once, however many times the scheduler runs",
    (await db.collection("tests").findOne({ _id: test.insertedId })).statsRolledUpAt instanceof Date);

  // ================= results: everyone looks at once =================
  const byUser = new Map((await db.collection("attempts").find({ test: new mongoose.Types.ObjectId(testId) }).toArray()).map((a) => [String(a.user), a]));
  const reads = await Promise.all(everyone.map((s) => call("GET", `/tests/attempts/${byUser.get(String(s.id))._id}`, s.token)));
  const rs = stats(reads);
  console.log("  results ", fmt(rs));
  check("everyone can open their result at once", reads.every((r) => r.status === 200), JSON.stringify(rs.codes));
  const totals = new Set(reads.map((r) => (r.json.attempt || r.json).totalParticipants));
  check("everyone is ranked against the same field", totals.size === 1 && [...totals][0] === everyone.length,
    `participants seen: ${[...totals].join(",")} (expected ${everyone.length})`);
  const ranked = reads.map((r) => r.json.attempt || r.json).sort((a, b) => a.rank - b.rank);
  const ordered = ranked.every((a, i) => i === 0 || ranked[i - 1].score >= a.score);
  check("a better score never ranks below a worse one", ordered);

  // ================= and the server survived it =================
  const health = await fetch(BASE + "/health").then((r) => r.status).catch(() => 0);
  check("the server is still answering afterwards", health === 200, String(health));
  const crashes = (log.match(/UnhandledPromiseRejection|TypeError|MongoServerError/g) || []).length;
  check("nothing blew up in the server log", crashes === 0, `${crashes} errors in the log`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
