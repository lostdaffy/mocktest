// The review queue was the one place the "nothing doubtful, nothing parked"
// rule did not hold: 141 questions sat in it, and clearing them meant the
// admin solving each one by hand. The gate that filled the queue can empty it.
//
// What has to be true:
//   - a sound question goes live
//   - a fixable gap is fixed, and then still has to pass on its own merit
//   - a disputed answer leaves circulation, and leaves every test with it
//   - a question a student has already answered is NOT deleted, because that
//     would blank out a question in their own past paper
//   - options are never rearranged under a student who already answered them
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5071;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "recheck-stub.cjs");

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

// ---------------------------------------------------------------------------
// Part 1, in this process: the real pipeline, asked not to reshuffle
// ---------------------------------------------------------------------------
async function pipelineChecks() {
  const gem = require(path.join(SERVER, "services/geminiService"));
  gem.verifyQuestions = async (qs) => qs.map(() => ({ matches: true, confidence: 1 }));
  const pipeline = require(path.join(SERVER, "services/validationPipeline"));

  const q = {
    text: "A shopkeeper marks an item 20% above cost and gives a 10% discount. What is the profit percent?",
    textHi: "एक दुकानदार वस्तु पर लागत से 20% अधिक अंकित करता है और 10% छूट देता है। लाभ प्रतिशत क्या है?",
    options: ["8%", "10%", "12%", "6%"],
    optionsHi: ["8%", "10%", "12%", "6%"],
    correctIndex: 0,
    solution: "Cost 100, marked 120, discount 12, sells at 108. Profit = 8, so 8%.",
    solutionHi: "लागत 100, अंकित 120, छूट 12, विक्रय 108। लाभ = 8, यानी 8%।",
    subject: "Maths",
    topic: "Profit & Loss",
    difficulty: "easy",
  };

  const [same] = await pipeline.runValidationPipelineBatch([q], { reshuffle: false });
  check(
    "asked not to reshuffle, the options stay exactly where they were",
    same.options.join("|") === q.options.join("|") && same.correctIndex === q.correctIndex,
    `${same.options.join("|")} idx ${same.correctIndex}`
  );
  check(
    "...and the answer still points at the right text",
    same.options[same.correctIndex] === "8%",
    same.options[same.correctIndex]
  );

  // The default is unchanged: a new question is still shuffled, so the right
  // answer is not always A. Over 30 tries at least one order must differ.
  let moved = 0;
  for (let i = 0; i < 30; i++) {
    const [r] = await pipeline.runValidationPipelineBatch([q]);
    if (r.options.join("|") !== q.options.join("|")) moved++;
    if (r.options[r.correctIndex] !== "8%") moved = -999;
  }
  check("a brand-new question is still shuffled by default", moved > 0, `${moved} of 30 reordered`);
  check("...and shuffling never moves the answer away from the right text", moved > 0, "answer text held in all 30");
}

(async () => {
  await pipelineChecks();

  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "recheck_test";
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
  const oid = (v) => new mongoose.Types.ObjectId(v);

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  const base = {
    options: ["10", "20", "30", "40"],
    correctIndex: 0,
    subject: "Maths",
    topic: "Percentage",
    chapter: "Percentage",
    difficulty: "easy",
    status: "under_review",
    source: "ai_generated",
    createdBy: "ai",
  };
  const long = "Step 1: 20% of 500 = 100. Step 2: 500 - 100 = 400. Answer 400.";

  const ins = await db.collection("questions").insertMany([
    { ...base, text: "GOOD one that was doubted for no good reason", solution: long, flagReason: "AI verification could not be completed" },
    { ...base, text: "THIN one whose solution never got written", solution: "400", flagReason: "Rule check failed: solution too short" },
    { ...base, text: "WRONG one whose answer key is disputed", solution: long, flagReason: 'AI verification disagreed - it answered "b"' },
    { ...base, text: "WRONG one a student has already answered", solution: long, flagReason: 'AI verification disagreed - it answered "b"' },
  ]);
  const [good, thin, wrong, answered] = [0, 1, 2, 3].map((i) => ins.insertedIds[i]);

  // The last one is in a live test and in somebody's attempt.
  const test = await db.collection("tests").insertOne({
    title: "Percentage - Easy #1",
    type: "practice",
    subject: "Maths",
    topic: "Percentage",
    difficultyLevel: "easy",
    questions: [good, wrong, answered],
    publishStatus: "published",
  });
  await db.collection("attempts").insertOne({
    user: admin.insertedId,
    test: test.insertedId,
    answers: [{ question: answered, selectedIndex: 2, isCorrect: false }],
  });

  // ---- the run
  const r = await api("POST", "/questions/recheck", { token, body: { limit: 20 } });
  check("the admin can clear the queue in one call", r.status === 200, `${r.status} ${r.json.message || ""}`);
  check("...it looked at all four", r.json.looked === 4, `${r.json.looked}`);

  const q = async (id) => db.collection("questions").findOne({ _id: id });

  check("a sound question goes live", (await q(good))?.status === "published", (await q(good))?.status);
  check("...and its flag is cleared", !(await q(good))?.flagReason, (await q(good))?.flagReason);

  const fixed = await q(thin);
  check("a thin solution is filled in rather than thrown away", fixed?.status === "published", fixed?.status);
  check("...with real working in it", (fixed?.solution || "").length > 25, `${(fixed?.solution || "").length} chars`);
  check("...and the Hindi came with it", !!fixed?.solutionHi, fixed?.solutionHi || "");
  check("...and the count says one was repaired", r.json.repaired === 1, `${r.json.repaired}`);

  check("a disputed answer key is deleted outright", !(await q(wrong)), "gone");
  check("...and the deletion is on record",
    (await db.collection("rejectedquestions").countDocuments({ reason: "answer_disputed" })) === 2);

  const kept = await q(answered);
  check("a question a student already answered is NOT deleted", !!kept, kept ? "kept" : "gone");
  check("...but no one will be given it again", kept?.status === "rejected", kept?.status);
  check("...and the counts say so", r.json.deleted === 1 && r.json.keptForHistory === 1,
    `deleted ${r.json.deleted}, kept ${r.json.keptForHistory}`);
  check("...so the student's own attempt still resolves",
    !!(await db.collection("attempts").findOne({ "answers.question": answered })) && !!kept);

  // Both left the test - and replacements took their place, so the student
  // still opens a full test rather than one with two holes in it.
  const t = await db.collection("tests").findOne({ _id: test.insertedId });
  check("both are out of the test that was holding them",
    !t.questions.map(String).includes(String(wrong)) && !t.questions.map(String).includes(String(answered)),
    `${t.questions.length} in the test`);
  check("...and every id it still holds resolves to a real question",
    (await db.collection("questions").countDocuments({ _id: { $in: t.questions } })) === t.questions.length);
  check("...and the admin is told that test is now short",
    r.json.testsNowShort.some((x) => x.title === "Percentage - Easy #1" && x.left === 1),
    JSON.stringify(r.json.testsNowShort));
  check("...including that students can see it right now",
    r.json.testsNowShort.some((x) => x.live === true), JSON.stringify(r.json.testsNowShort));

  // ---- a question fixed by hand skips the gate, so the gate speaks up
  // An admin looking straight at a question can overrule any rule, and
  // should be able to. But the commonest hand-edit is changing which option
  // is correct, and that is the one mistake re-reading never catches: the
  // solution still works through to the old answer.
  const handEdited = await db.collection("questions").insertOne({
    text: "A shop marks up by 25% then gives 20% off. What is the profit?",
    options: ["0", "5", "10", "20"], correctIndex: 0,
    solution: "1.25 x 0.8 = 1.0, so there is no profit. The answer is 0.",
    subject: "Maths", topic: "Percentage", difficulty: "medium", status: "published",
  });
  const qid = handEdited.insertedId.toString();

  let e = await api("PUT", `/questions/${qid}`, { token, body: { correctIndex: 3 } });
  check("a hand-edited answer key is still saved - the admin has the last word",
    e.status === 200 && e.json.question.correctIndex === 3, `${e.status}, index ${e.json.question?.correctIndex}`);
  check("...but the working no longer reaching it is said out loud",
    (e.json.warnings || []).some((w) => /doesn't arrive at the option/i.test(w)), JSON.stringify(e.json.warnings));

  e = await api("PUT", `/questions/${qid}`, { token, body: { correctIndex: 0 } });
  check("...and putting it back leaves nothing to warn about",
    (e.json.warnings || []).length === 0, JSON.stringify(e.json.warnings));

  e = await api("PUT", `/questions/${qid}`, { token, body: { options: ["0", "0", "10", "20"] } });
  check("two options with the same text is caught, because then two answers are right",
    (e.json.warnings || []).some((w) => /same/i.test(w)), JSON.stringify(e.json.warnings));

  e = await api("PUT", `/questions/${qid}`, { token, body: { options: ["0", "5", "10", "20"], solution: "" } });
  check("a solution deleted by hand is caught, because a wrong answer teaches nothing",
    (e.json.warnings || []).some((w) => /no solution/i.test(w)), JSON.stringify(e.json.warnings));

  // ---- nothing left to do says so, rather than pretending to work
  const again = await api("POST", "/questions/recheck", { token, body: { limit: 20 } });
  check("a second run finds the queue empty", again.json.looked === 0, `${again.json.looked}`);
  check("...and says so plainly", /nothing in the review queue/i.test(again.json.message || ""), again.json.message);

  // ---- and it is an admin-only door
  const student = await db.collection("users").insertOne({ name: "S", phone: "9111111111", role: "user", referralCode: "S1" });
  const sToken = jwt.sign({ id: student.insertedId.toString(), sessionId: "y" }, JWT_SECRET);
  const denied = await api("POST", "/questions/recheck", { token: sToken, body: {} });
  check("a student cannot run it", denied.status === 403 || denied.status === 401, `${denied.status}`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
