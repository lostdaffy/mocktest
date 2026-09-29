// Live exams are the one thing every student meets at the same moment, so a
// fault here is public and simultaneous. They were also the least tested
// part of the app - the admin page is the biggest one there is and no suite
// covered the lifecycle at all.
//
// What has to be true:
//   - a draft is invisible; a short paper cannot be scheduled
//   - it cannot be opened early, and cannot be opened once it has closed
//   - everyone FINISHES together: a late joiner gets the time that is left,
//     not a fresh hour
//   - one attempt only, and the answer key never reaches the phone
//   - a student who never taps submit is finalized for them
//   - rank is not computed against people who are still writing
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5081;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 96) + "]" : ""}`);
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
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "live_test";
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

  const mkUser = async (name, phone, role, code) => {
    const u = await db.collection("users").insertOne({
      name, phone, role, referralCode: code, activeSessionId: "s-" + code,
      subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000),
      freeUsage: { liveExamsUsed: 0 }, createdAt: new Date(),
    });
    return { id: u.insertedId, token: jwt.sign({ id: u.insertedId.toString(), sessionId: "s-" + code }, JWT_SECRET) };
  };
  const admin = await mkUser("Admin", "9000000001", "admin", "ADM");
  const early = await mkUser("Early Bird", "9000000002", "student", "EARLY");
  const late = await mkUser("Late Joiner", "9000000003", "student", "LATE");
  const ghost = await mkUser("Never Submits", "9000000004", "student", "GHOST");

  // A small exam so the paper is quick to fill.
  await api("POST", "/exams", { token: admin.token, body: {
    examType: "SSC_CGL", displayName: "SSC CGL Tier 1", durationMinutes: 60,
    marksPerQuestion: 2, negativeMarking: 0.5,
    sections: [{ subject: "Maths", questionCount: 4, difficultyMix: { easy: 100, medium: 0, hard: 0 },
      syllabus: [{ topic: "Percentage", subTopics: ["successive change"] }] }],
  }});

  // ---- an admin builds one
  let r = await api("POST", "/live-exams", { token: admin.token, body: {
    examType: "SSC_CGL", scheduledAt: new Date(Date.now() + 3600000).toISOString(),
  }});
  check("an admin can schedule a live exam", r.status === 201, `${r.status} ${r.json.message || ""}`);
  const examId = r.json.test?._id;
  check("...and it starts as a draft", r.json.test?.publishStatus === "draft", r.json.test?.publishStatus);

  const seen = await api("GET", "/tests", { token: early.token });
  const visible = (seen.json.tests || seen.json || []).some((t) => String(t._id) === String(examId));
  check("...which no student can see yet", !visible);

  r = await api("PATCH", `/live-exams/${examId}/publish`, { token: admin.token });
  check("a half-empty paper cannot be scheduled", r.status === 400, r.json.message);

  // Fill it.
  const qs = Array.from({ length: 4 }, (_, i) => ({
    text: `Live question ${i}: what is ${i + 1} x 10?`, textHi: `प्रश्न ${i}`,
    options: [`${(i + 1) * 10}`, `${(i + 1) * 20}`, `${(i + 1) * 30}`, `${(i + 1) * 40}`],
    optionsHi: ["अ", "ब", "स", "द"], correctIndex: 0,
    solution: `${i + 1} x 10 = ${(i + 1) * 10}`, solutionHi: "हल",
    subject: "Maths", topic: "Percentage", difficulty: "easy", status: "published",
    examType: "SSC_CGL", createdAt: new Date(),
  }));
  const ins = await db.collection("questions").insertMany(qs);
  const qIds = Object.values(ins.insertedIds);
  await db.collection("tests").updateOne({ _id: new mongoose.Types.ObjectId(examId) }, { $set: { questions: qIds } });

  const asOf = (mins) => new Date(Date.now() + mins * 60000);
  const setWindow = (mins) =>
    db.collection("tests").updateOne({ _id: new mongoose.Types.ObjectId(examId) }, { $set: { scheduledAt: asOf(mins) } });

  await setWindow(-30);
  r = await api("PATCH", `/live-exams/${examId}/publish`, { token: admin.token });
  check("a time already gone cannot be scheduled", r.status === 400, r.json.message);

  await setWindow(60);
  r = await api("PATCH", `/live-exams/${examId}/publish`, { token: admin.token });
  check("a full paper in the future can be scheduled", r.status === 200, r.json.message);

  // ---- nobody gets to start early
  r = await api("GET", `/tests/${examId}`, { token: early.token });
  check("a student cannot open it before it starts", r.status >= 400, `${r.status} ${r.json.message || ""}`);
  check("...and is told when to come back",
    /started|scheduled time/i.test(r.json.message || ""), r.json.message);

  // ---- it opens
  await setWindow(-10); // started 10 minutes ago, 60-minute paper
  r = await api("GET", `/tests/${examId}`, { token: early.token });
  check("once it starts, a student can open it", r.status === 200, `${r.status} ${r.json.message || ""}`);
  const earlyLeft = r.json.live?.secondsRemaining;
  check("...and the clock runs on the shared window, not a fresh hour",
    earlyLeft > 0 && earlyLeft <= 50 * 60 + 30, `${Math.round(earlyLeft / 60)} min left of a 60-min paper`);
  check("...and the answer key is not sent to the phone",
    (r.json.test?.questions || []).every((q) => q.correctIndex === undefined),
    (r.json.test?.questions || [])[0]?.correctIndex === undefined ? "hidden" : "LEAKED");
  check("...and entering created an attempt that is still open",
    (await db.collection("attempts").findOne({ user: early.id, test: new mongoose.Types.ObjectId(examId) }))?.status === "in_progress");

  // A student who walks in twenty minutes later must NOT get more time.
  await setWindow(-30);
  r = await api("GET", `/tests/${examId}`, { token: late.token });
  const lateLeft = r.json.live?.secondsRemaining;
  check("everyone finishes together - a late joiner gets less time, not a fresh paper",
    lateLeft < earlyLeft, `${Math.round(lateLeft / 60)} min vs ${Math.round(earlyLeft / 60)} min`);

  // The one who never taps submit, but whose answers were saved as they went.
  await api("GET", `/tests/${examId}`, { token: ghost.token });
  await api("PATCH", `/tests/${examId}/progress`, { token: ghost.token, body: {
    answers: [{ questionId: String(qIds[0]), selectedIndex: 0, timeTakenSeconds: 30 }],
  }});

  // ---- rank while people are still writing
  r = await api("POST", `/tests/${examId}/submit`, { token: early.token, body: {
    answers: qIds.map((id, i) => ({ questionId: String(id), selectedIndex: i < 3 ? 0 : 1, timeTakenSeconds: 20 })),
  }});
  check("a student can submit", r.status === 200 || r.status === 201, `${r.status} ${r.json.message || ""}`);
  const earlyAttemptId = r.json.attemptId;

  r = await api("GET", `/tests/${examId}`, { token: early.token });
  check("...and cannot sit it a second time", r.status >= 400, `${r.status} ${r.json.message || ""}`);

  r = await api("GET", `/tests/attempts/${earlyAttemptId}`, { token: early.token });
  check("rank is withheld while the exam is still running",
    (r.json.attempt || r.json).rank == null, String((r.json.attempt || r.json).rank));

  // ---- the window closes
  await setWindow(-90); // 60-minute paper that began 90 minutes ago
  const { runLiveExamTick } = require(path.join(SERVER, "jobs/liveExamScheduler"));
  await runLiveExamTick();

  const ghostAttempt = await db.collection("attempts").findOne({ user: ghost.id });
  check("a student who never tapped submit is finalized for them",
    ghostAttempt?.status === "auto_submitted", ghostAttempt?.status);
  check("...and the answers they did save still counted",
    ghostAttempt?.correctCount === 1, `${ghostAttempt?.correctCount} correct`);
  check("...and nobody is left writing",
    (await db.collection("attempts").countDocuments({ test: new mongoose.Types.ObjectId(examId), status: "in_progress" })) === 0);

  r = await api("GET", `/tests/${examId}`, { token: late.token });
  check("the exam cannot be opened once it has closed", r.status >= 400, `${r.status} ${r.json.message || ""}`);

  r = await api("GET", `/tests/attempts/${earlyAttemptId}`, { token: early.token });
  const done = r.json.attempt || r.json;
  check("rank is released once it is over", done.rank >= 1, `rank ${done.rank} of ${done.totalParticipants}`);
  check("...and is counted against everyone who sat it",
    done.totalParticipants === 3, `${done.totalParticipants} participants`);
  check("...with the best score ranked first",
    done.rank === 1, `scored ${done.score}, ranked ${done.rank}`);

  // ---- the admin's own view
  r = await api("GET", `/live-exams/${examId}/attempts`, { token: admin.token });
  check("the admin can see who sat it", r.status === 200 && (r.json.attempts || []).length === 3,
    `${(r.json.attempts || []).length} attempts`);

  // ---- what an admin must not be able to do
  await setWindow(-10);
  r = await api("PATCH", `/live-exams/${examId}/cancel`, { token: admin.token });
  check("a running exam cannot be pulled out from under the students", r.status === 400, r.json.message);

  r = await api("DELETE", `/live-exams/${examId}`, { token: admin.token });
  check("an exam people have sat cannot be deleted", r.status === 400, r.json.message);

  // ---- an old account must not lose a paper it has already sat
  // Found by this suite: a user document that fails today validation - and
  // there are months of accounts created under older schemas - made the save
  // of streak and topic stats throw AFTER the attempt was graded. The student
  // saw "Failed to submit test" on a marked paper, and on a live exam was then
  // locked out with "You have already submitted this".
  const legacy = await mkUser("Old Account", "9000000005", "student", "OLD");
  await db.collection("users").updateOne({ _id: legacy.id }, { $set: { role: "user" } });

  r = await api("POST", "/live-exams", { token: admin.token, body: {
    examType: "SSC_CGL", scheduledAt: new Date(Date.now() + 3600000).toISOString() } });
  const secondId = r.json.test?._id;
  await db.collection("tests").updateOne({ _id: new mongoose.Types.ObjectId(secondId) },
    { $set: { questions: qIds, publishStatus: "published", scheduledAt: new Date(Date.now() - 10 * 60000) } });

  await api("GET", `/tests/${secondId}`, { token: legacy.token });
  r = await api("POST", `/tests/${secondId}/submit`, { token: legacy.token, body: {
    answers: qIds.map((id) => ({ questionId: String(id), selectedIndex: 0, timeTakenSeconds: 15 })) } });
  check("a paper is graded even when the account is too old to save stats onto",
    r.status === 200 || r.status === 201, `${r.status} ${r.json.message || ""}`);
  check("...and the marks came back, not an error",
    typeof r.json.score === "number" && r.json.correctCount === 4, `${r.json.score} from ${r.json.correctCount} correct`);

  // ---- and it is an admin-only door
  r = await api("POST", "/live-exams", { token: late.token, body: { examType: "SSC_CGL", scheduledAt: new Date().toISOString() } });
  check("a student cannot schedule a live exam", r.status === 401 || r.status === 403, String(r.status));
  r = await api("PATCH", `/live-exams/${examId}/publish`, { token: late.token });
  check("...nor publish one", r.status === 401 || r.status === 403, String(r.status));

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
