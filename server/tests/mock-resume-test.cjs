// SSC CHSL was reported "done" at 9 of 100. The day's allowance ran out after
// the first batch; every batch after it failed, was skipped, and the job was
// called finished. The next run started ANOTHER mock instead of finishing
// that one, a run cut short by a deploy left an empty one behind, and the
// panel counted all of them as built.
//
// What has to be true:
//   - a mock that runs out of allowance is NOT done: the queue pauses, the
//     job goes back in, and the panel shows the mock as unfinished
//   - it stops trying the moment the allowance is gone, not batch after batch
//   - the next run finishes THAT mock - one mock, the right size, not two
//   - an empty draft left behind by an interrupted run is cleared away
//   - a full mock is still simply done, first time
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5087;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");
const CALLS = path.join(__dirname, "gen-calls.jsonl");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 110) + "]" : ""}`);
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
const callsFor = (level) =>
  fs.existsSync(CALLS) ? fs.readFileSync(CALLS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((c) => c.examLevel === level).length : 0;

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "resume_test";
  const srv = spawn(process.execPath, ["-r", STUB, "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT),
      // Keep the pause between batches short so the suite runs in seconds.
      GEMINI_PAUSE_MS: "50",
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
  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000031", role: "admin", referralCode: "ADM4" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  const LEVEL_SHORT = "ALLOWANCE_AFTER_1 resume-test";
  const pat = await api("POST", "/exams", { token, body: {
    examType: "SSC_CHSL", displayName: "SSC CHSL Tier 1", durationMinutes: 60, marksPerQuestion: 2, negativeMarking: 0.5,
    examLevel: LEVEL_SHORT,
    sections: [
      { subject: "Maths", questionCount: 12, difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Percentage", subTopics: [] }] },
      { subject: "English", questionCount: 12, difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Grammar", subTopics: [] }] },
    ],
  }});
  const patternId = pat.json.pattern?._id;

  // An empty draft, as a deploy mid-build used to leave behind.
  await db.collection("tests").insertOne({
    title: "SSC CHSL Tier 1 - Mock #1", type: "full_mock", examType: "SSC_CHSL", examStage: "SSC_CHSL",
    seriesNumber: 1, questions: [], durationMinutes: 60, publishStatus: "draft", createdBy: "admin", createdAt: new Date(),
  });

  // ---- the allowance runs out part way
  const callsBefore = callsFor(LEVEL_SHORT);
  await api("POST", "/generation/enqueue", { token, body: { practice: false, mocks: true } });
  for (let i = 0; i < 60; i++) {
    const st = await api("GET", "/generation/status", { token });
    if (st.json.paused || (st.json.counts.running === 0 && st.json.counts.queued === 0)) break;
    await sleep(500);
  }
  let st = await api("GET", "/generation/status", { token });
  const job = await db.collection("generationjobs").findOne({ kind: "mock", examType: "SSC_CHSL" });

  check("a mock that ran out of allowance is NOT reported done",
    job.status !== "done", `${job.status} - ${job.lastError || job.result || ""}`);
  check("...the queue stops itself instead",
    st.json.paused === true && /allowance/i.test(st.json.pausedReason || ""), st.json.pausedReason);
  check("...and the job is back in the queue without spending an attempt",
    job.status === "queued" && job.attempts === 0, `${job.status}, attempts ${job.attempts}`);
  check("...and it says where the mock got to",
    /12 of 24/.test(job.lastError || ""), job.lastError);
  check("it stops trying once the allowance is gone, not batch after batch",
    callsFor(LEVEL_SHORT) - callsBefore <= 2, `${callsFor(LEVEL_SHORT) - callsBefore} generator calls`);

  let mocks = await db.collection("tests").find({ examStage: "SSC_CHSL", type: "full_mock" }).toArray();
  check("the empty draft left by an interrupted run was used, not added to",
    mocks.length === 1, `${mocks.length} mock document(s): ${mocks.map((m) => m.questions.length).join(", ")}`);
  check("...and what was built so far is kept", mocks[0]?.questions.length === 12, `${mocks[0]?.questions.length} questions`);

  st = await api("GET", "/generation/status", { token });
  check("the panel does not count a 12-of-24 mock as built", st.json.coverage.mocks.built === 0, `built ${st.json.coverage.mocks.built}`);
  check("...it lists it as unfinished instead",
    (st.json.coverage.mocks.unfinished || []).some((u) => u.examType === "SSC_CHSL" && u.have === 12 && u.of === 24),
    JSON.stringify(st.json.coverage.mocks.unfinished));
  const gaps = await api("GET", "/generation/gaps", { token });
  check("...and it is still a gap to fill", gaps.json.totals.mocks === 1, `${gaps.json.totals.mocks} mock gap(s)`);

  // ---- the next day
  await api("PATCH", `/exams/${patternId}`, { token, body: { examLevel: "fresh allowance" } });
  await api("POST", "/generation/resume", { token });
  for (let i = 0; i < 60; i++) {
    const s2 = await api("GET", "/generation/status", { token });
    if (s2.json.counts.running === 0 && s2.json.counts.queued === 0) break;
    await sleep(500);
  }
  const done = await db.collection("generationjobs").findOne({ kind: "mock", examType: "SSC_CHSL" });
  mocks = await db.collection("tests").find({ examStage: "SSC_CHSL", type: "full_mock" }).toArray();

  check("the next run finishes it", done.status === "done", `${done.status} - ${done.result || done.lastError}`);
  check("...as the SAME mock, not a second one", mocks.length === 1, `${mocks.length} mock document(s)`);
  check("...at its full size", mocks[0].questions.length === 24, `${mocks[0].questions.length} of 24`);
  check("...and says it continued rather than created", /continued \(\+12\)/.test(done.result || ""), done.result);

  const qs = await db.collection("questions").find({ _id: { $in: mocks[0].questions } }).toArray();
  const byId = new Map(qs.map((q) => [String(q._id), q.subject]));
  const order = mocks[0].questions.map((id) => byId.get(String(id)));
  check("...with each section kept together, not the new half tacked on the end",
    order.slice(0, 12).every((x) => x === "Maths") && order.slice(12).every((x) => x === "English"),
    order.map((x) => x[0]).join(""));

  st = await api("GET", "/generation/status", { token });
  check("the panel now counts it as built", st.json.coverage.mocks.built === 1 && (st.json.coverage.mocks.unfinished || []).length === 0,
    JSON.stringify(st.json.coverage.mocks));

  // ---- and a mock with no trouble is simply done
  await api("POST", "/exams", { token, body: {
    examType: "SSC_GD", displayName: "SSC GD Constable", durationMinutes: 60, marksPerQuestion: 2, negativeMarking: 0.25,
    sections: [{ subject: "Maths", questionCount: 12, difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Percentage", subTopics: [] }] }],
  }});
  await api("POST", "/generation/enqueue", { token, body: { practice: false, mocks: true } });
  for (let i = 0; i < 60; i++) {
    const s3 = await api("GET", "/generation/status", { token });
    if (s3.json.counts.running === 0 && s3.json.counts.queued === 0) break;
    await sleep(500);
  }
  const gd = await db.collection("generationjobs").findOne({ kind: "mock", examType: "SSC_GD" });
  check("a mock with no trouble is done first time", gd.status === "done" && /created/.test(gd.result || ""), gd.result || gd.lastError);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
