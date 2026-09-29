// The whole thing, once, as a real student would meet it: sign up, find your
// subjects, open a chapter, take the test, submit it, see the result, and come
// back tomorrow. Every piece has been tested on its own; this is the first
// time they are walked through end to end.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5062;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const GEMINI_STUB = path.join(__dirname, "mock-stub.cjs");
const DELIVERY_STUB = path.join(__dirname, "auth-stub.cjs");
const CAPTURED = path.join(__dirname, "captured.jsonl");
const fs = require("fs");

// The OTP is stored hashed, so the only way to know it is to watch it being
// sent - exactly as the SMS stub records it.
const lastOtpFor = (phone) => {
  const lines = fs.readFileSync(CAPTURED, "utf8").trim().split(String.fromCharCode(10)).filter(Boolean).map(JSON.parse);
  const hit = [...lines].reverse().find((l) => l.ch === "sms" && l.to === phone);
  return hit && hit.code;
};

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
  const uri = mem.getUri() + "journey";
  try { fs.unlinkSync(CAPTURED); } catch {}
  const srv = spawn(process.execPath, ["-r", DELIVERY_STUB, "-r", GEMINI_STUB, "server.js"], {
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

  // ================= what the admin set up beforehand =================
  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const adminToken = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  await api("POST", "/exams", { token: adminToken, body: {
    examType: "SSC_CGL", displayName: "SSC CGL Tier 1", durationMinutes: 60,
    sections: [
      { subject: "Maths", questionCount: 6, difficultyMix: { easy: 100, medium: 0, hard: 0 } },
      { subject: "GK", questionCount: 6, difficultyMix: { easy: 100, medium: 0, hard: 0 } },
    ],
  }});
  await api("POST", "/subjects", { token: adminToken, body: {
    name: "Maths", nameHi: "गणित", displayOrder: 1, aliases: ["Quant"],
    chapters: [{ name: "Percentage", nameHi: "प्रतिशत", category: "अंकगणित", topics: ["Percentage"], exams: ["SSC_CGL"] }],
  }});
  await api("POST", "/subjects", { token: adminToken, body: {
    name: "GK", displayOrder: 2,
    chapters: [{ name: "Indian History", category: "इतिहास", topics: ["Indian History"], exams: ["SSC_CGL"] }],
  }});

  // The admin builds a practice test and publishes it.
  let r = await api("POST", "/exam-series/practice/generate", {
    token: adminToken, body: { subject: "Maths", chapter: "Percentage", topics: ["Percentage"], difficulty: "easy" },
  });
  check("admin can build a practice test", r.status === 201, `${r.status} ${r.json.message || ""}`);
  const practiceTestId = r.json.test?._id;
  check("...and it is FULL", r.json.test?.questionCount === 12, `${r.json.test?.questionCount} questions`);
  const draftRow = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(practiceTestId) });
    check("...and starts as a draft, invisible to students", draftRow?.publishStatus === "draft", draftRow?.publishStatus);

  // ================= the student arrives =================
  const phone = "9811111111";
  r = await api("POST", "/auth/signup/request-otp", { body: { phone } });
  check("a new student can ask for an OTP", r.status === 200 || r.status === 201, `${r.status} ${r.json.message || ""}`);
  const code = lastOtpFor(phone);
    check("...and one is actually sent to them", !!code, code ? "captured" : "nothing sent");

  r = await api("POST", "/auth/signup", {
    body: { name: "Sunita", phone, email: "sunita@test.com", password: "sunita123", otp: code, examGoals: ["SSC_CGL"], preferredLanguage: "hi" },
  });
  check("signup works", r.status === 201, `${r.status} ${r.json.message || ""}`);
  if (r.status !== 201) { console.log(String.fromCharCode(10) + "--- server log ---"); console.log(log.split(String.fromCharCode(10)).slice(-18).join(String.fromCharCode(10))); console.log("--- end ---" + String.fromCharCode(10)); }
  const token = r.json.token;
  check("...and they are signed in straight away", !!token);

  // ================= their subjects, without being asked =================
  r = await api("GET", "/subjects/my", { token });
  const names = (r.json.subjects || []).map((s) => s.name).sort();
  check("their subjects are set up for them, from the exam they chose",
    names.join(",") === "GK,Maths", names.join(",") || "EMPTY");
  const maths = (r.json.subjects || []).find((s) => s.name === "Maths");
  check("...with the chapters that exam asks for", maths?.chapters?.length === 1, `${maths?.chapters?.length}`);
  check("...grouped under a heading they can read", maths?.chapters?.[0]?.category === "अंकगणित", maths?.chapters?.[0]?.category);

  // ================= the free-tier picture =================
  r = await api("GET", "/tests/free-limits", { token });
  check("a new student is told what they get for free", r.status === 200 && !!r.json.mock, JSON.stringify(r.json.mock || {}));

  // ================= chapter practice =================
  r = await api("POST", "/subjects/chapter-test", { token, body: { subject: "Maths", chapter: "Percentage" } });
  check("they can start practising a chapter", r.status === 201, `${r.status} ${r.json.message || ""}`);
  const chapterTest = r.json.test;
  check("...and get a full set of questions", chapterTest?.questions?.length > 0, `${chapterTest?.questions?.length}`);
  check("...starting at the easy level", r.json.level === "easy", r.json.level);

  // ================= taking the test =================
  r = await api("GET", `/tests/${chapterTest._id}`, { token });
  const loaded = r.json.test;
  check("opening the test gives them the questions", loaded?.questions?.length > 0, `${loaded?.questions?.length}`);
  check("...with the question text, not just ids", typeof loaded?.questions?.[0]?.text === "string", typeof loaded?.questions?.[0]);
  check("...and the answer key is NOT sent to the phone",
    loaded?.questions?.[0]?.correctIndex === undefined,
    "correctIndex " + (loaded?.questions?.[0]?.correctIndex === undefined ? "hidden" : "LEAKED"));

  // Answer them: right, wrong, right, wrong...
  const full = await db.collection("questions").find({ _id: { $in: loaded.questions.map((q) => new mongoose.Types.ObjectId(q._id)) } }).toArray();
  const byId = new Map(full.map((q) => [String(q._id), q]));
  const answers = loaded.questions.map((q, i) => ({
    questionId: q._id,
    selectedIndex: i % 2 === 0 ? byId.get(String(q._id)).correctIndex : (byId.get(String(q._id)).correctIndex + 1) % 4,
    timeTakenSeconds: 20,
  }));
  const expectedRight = answers.filter((_, i) => i % 2 === 0).length;

  r = await api("POST", `/tests/${chapterTest._id}/submit`, { token, body: { answers } });
  check("submitting the test works", r.status === 200 || r.status === 201, `${r.status} ${r.json.message || ""}`);
  const attempt = r.json.attempt || r.json;
  check("...and the score is right", attempt?.correctCount === expectedRight, `${attempt?.correctCount} of ${answers.length}, expected ${expectedRight}`);
  check("...marks are calculated, not left blank", typeof attempt?.score === "number", String(attempt?.score));

  // ---- what the wrong answers cost
  // The score already has the deduction taken off. Without this the student
  // sees only the number that is left and cannot tell whether guessing paid
  // off - and that is the one figure that changes how they sit the next paper.
  const wrongs = answers.length - expectedRight;
  const perWrong = attempt?.negativeMarking;
  check("the result says how much each wrong answer costs",
    typeof perWrong === "number", String(perWrong));
  check("...and how many marks that came to",
    attempt?.marksLost === Number((wrongs * perWrong).toFixed(2)),
    `${attempt?.marksLost} lost for ${wrongs} wrong at ${perWrong}`);
  check("...and the score actually has it taken off",
    attempt?.score === attempt.correctCount * attempt.marksPerQuestion - attempt.marksLost,
    `${attempt?.score} = ${attempt?.correctCount}x${attempt?.marksPerQuestion} - ${attempt?.marksLost}`);

  // ================= the result screen =================
  // submit replies with attemptId, not _id - asking for the wrong one is how
  // the hanging-request bug surfaced in the first place.
  const attemptId = attempt?.attemptId || attempt?._id;

  // A bad id must answer, not hang. This is the exact shape that used to
  // leave the phone spinning forever.
  const bad = await api("GET", "/tests/attempts/not-a-real-id", { token });
  check("a bad attempt id answers instead of hanging", bad.status >= 400 && bad.status < 600, String(bad.status));
  r = await api("GET", `/tests/attempts/${attemptId}`, { token });
  check("the result can be opened again afterwards", r.status === 200, String(r.status));
  const detail = r.json.attempt || r.json;
  check("...with the deduction still on it, so an old result stays true",
    detail.marksLost === attempt.marksLost && detail.negativeMarking === attempt.negativeMarking,
    `${detail.marksLost} lost at ${detail.negativeMarking}`);
  check("...and now shows which answer was right",
    JSON.stringify(detail).includes("correctIndex") || (detail.answers || []).some((a) => a.isCorrect !== undefined),
    "review data present");

  // ================= streak and coming back tomorrow =================
  r = await api("GET", "/tests/daily", { token });
  check("the home screen has something to show", r.status === 200, String(r.status));
  check("...today's practice is counted", (r.json.today?.questionsDone || 0) > 0, `${r.json.today?.questionsDone} questions today`);
  check("...and the streak has started", (r.json.streak?.current || 0) >= 1, `streak ${r.json.streak?.current}`);

  // ================= their weak topics =================
  r = await api("GET", "/tests/analysis", { token });
  check("analysis is available after one test", r.status === 200, String(r.status));

  // ================= a full mock =================
  await db.collection("questions").insertMany(
    Array.from({ length: 10 }, (_, i) => ({
      text: `GK question ${i}?`, textHi: "प्रश्न", options: ["a", "b", "c", "d"], optionsHi: ["a", "b", "c", "d"],
      correctIndex: 1, solution: "because 1 + 1 = 2", solutionHi: "कारण",
      examType: ["SSC_CGL"], subject: "GK", topic: "Indian History", difficulty: "easy",
      source: "ai_generated", status: "published",
    }))
  );
  r = await api("POST", "/tests/generate/full-mock", { token, body: { examType: "SSC_CGL" } });
  check("they can take a full mock", r.status === 201, `${r.status} ${r.json.message || ""}`);
  check("...built to the exam's own shape", r.json.test?.questions?.length === 12, `${r.json.test?.questions?.length} questions`);

  r = await api("GET", "/tests/free-limits", { token });
  check("...and it counts against their free mocks", r.json.mock?.used === 1, `used ${r.json.mock?.used}`);

  // ================= what the admin publishes, the student sees =================
  r = await api("GET", `/tests/practice-series/${encodeURIComponent("Maths")}/${encodeURIComponent("Percentage")}`, { token });
  const before = (r.json.tests || []).length;
  await api("PATCH", `/exam-series/practice/${practiceTestId}/publish`, { token: adminToken, body: { isFree: true } });
  r = await api("GET", `/tests/practice-series/${encodeURIComponent("Maths")}/${encodeURIComponent("Percentage")}`, { token });
  const after = (r.json.tests || []).length;
  check("a test the admin publishes shows up for the student", after > before, `${before} -> ${after}`);

  // ================= and nothing half-built ever does =================
  const drafts = await db.collection("tests").countDocuments({ publishStatus: "draft" });
  r = await api("GET", "/tests?examType=SSC_CGL", { token });
  const visible = (r.json.tests || []).filter((t) => t.publishStatus === "draft").length;
  check("drafts are never shown to a student", visible === 0, `${drafts} drafts exist, ${visible} visible`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
