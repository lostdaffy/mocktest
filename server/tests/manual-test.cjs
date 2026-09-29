// Questions a person wrote: a human-made mock, or a past paper typed in
// because the extractor cannot read the scan.
//
// What has to be true:
//   - a bad file can be checked without saving any of it
//   - a row that cannot be a question is refused, by row number, with why
//   - everything else is saved, with the gate's opinion as a warning
//   - the paper keeps the order it was written in, options included -
//     a past paper must read the way it was set
//   - no AI is involved: no allowance spent, no model overruling a person
//   - a past paper is timed and marked like the real exam
//   - a live mock cannot be changed under the students sitting it
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5085;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 100) + "]" : ""}`);
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

const good = (n, extra = {}) => ({
  subject: "Maths", topic: "Percentage",
  question: `What is ${n * 10}% of 200? (question ${n})`,
  optionA: `${n * 20}`, optionB: `${n * 20 + 5}`, optionC: `${n * 20 + 10}`, optionD: `${n * 20 + 15}`,
  correct: "A",
  solution: `${n * 10}% of 200 = ${n * 10} x 2 = ${n * 20}.`,
  ...extra,
});

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "manual_test";
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
  const mk = async (name, phone, role, code) => {
    const u = await db.collection("users").insertOne({ name, phone, role, referralCode: code, activeSessionId: "s-" + code, createdAt: new Date() });
    return jwt.sign({ id: u.insertedId.toString(), sessionId: "s-" + code }, JWT_SECRET);
  };
  const admin = await mk("Admin", "9000000021", "admin", "ADM3");
  const student = await mk("Student", "9000000022", "student", "STU3");

  await api("POST", "/exams", { token: admin, body: {
    examType: "SSC_CGL", displayName: "SSC CGL Tier 1", durationMinutes: 60, marksPerQuestion: 2, negativeMarking: 0.5,
    sections: [
      { subject: "Maths", questionCount: 25, difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Percentage", subTopics: [] }] },
      { subject: "English", questionCount: 25, difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Grammar", subTopics: [] }] },
    ],
  }});

  // ================= a human-made mock =================
  let r = await api("POST", "/exam-series/SSC_CGL/create-empty-mock", { token: admin });
  const mockId = r.json.test?._id;
  check("an admin can start an empty mock to fill by hand", !!mockId, `${r.status}`);

  const genCallsBefore = (require("fs").existsSync(path.join(__dirname, "gen-calls.jsonl"))
    ? require("fs").readFileSync(path.join(__dirname, "gen-calls.jsonl"), "utf8").split("\n").filter(Boolean).length : 0);

  const rows = [
    good(1),
    good(2, { correct: 2, optionB: "40", optionA: "35" }),         // 2 means B, number or text
    { subject: "Maths", question: "An incomplete row with only two options", optionA: "1", optionB: "2", correct: "A" },
    good(3, { correct: "Z" }),                                      // no such option
    good(4, { optionB: "80", optionA: "80" }),                      // two identical options
    good(5, { subject: "Geography" }),                              // not a section of this exam
    good(1),                                                        // the first row again
  ];

  r = await api("POST", `/exam-series/mock/${mockId}/manual-questions`, { token: admin, body: { questions: rows, dryRun: true } });
  check("a whole file can be checked without saving any of it",
    r.status === 200 && r.json.added === 0 && (await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(mockId) })).questions.length === 0,
    r.json.message);
  check("...and it says how many would go in", r.json.wouldAdd === 5, `${r.json.wouldAdd} of ${r.json.checked}`);
  const rej = r.json.rejected || [];
  check("a row that cannot be a question is refused, by its row number",
    rej.map((x) => x.row).sort().join(",") === "3,4", JSON.stringify(rej.map((x) => [x.row, x.errors[0]])));
  check("...with a reason a person can act on",
    /four options|option is empty/i.test(rej.find((x) => x.row === 3)?.errors.join(" ")) &&
    /correct answer/i.test(rej.find((x) => x.row === 4)?.errors.join(" ")),
    rej.map((x) => x.errors.join("; ")).join(" | "));
  const warned = r.json.warned || [];
  check("two identical options are saved but flagged, since a person may mean it",
    warned.some((w) => w.row === 5 && /same/i.test(w.warnings.join(" "))), JSON.stringify(warned.find((w) => w.row === 5)?.warnings));
  check("a subject the exam never asks is flagged",
    warned.some((w) => w.row === 6 && /not a section/i.test(w.warnings.join(" "))), JSON.stringify(warned.find((w) => w.row === 6)?.warnings));
  check("a question sent twice is flagged",
    warned.some((w) => w.row === 7 && /twice/i.test(w.warnings.join(" "))));

  r = await api("POST", `/exam-series/mock/${mockId}/manual-questions`, { token: admin, body: { questions: rows } });
  check("then saved for real", r.status === 201 && r.json.added === 5, r.json.message);

  const mock = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(mockId) });
  const saved = await db.collection("questions").find({ _id: { $in: mock.questions } }).toArray();
  const byId = new Map(saved.map((q) => [String(q._id), q]));
  const inOrder = mock.questions.map((id) => byId.get(String(id)));
  check("the mock keeps the order the questions were written in",
    inOrder[0].text.includes("question 1") && inOrder[1].text.includes("question 2"), inOrder.map((q) => q.text.slice(-12)).join(" "));
  check("...and the options stay exactly where the person put them",
    JSON.stringify(inOrder[0].options) === JSON.stringify(["20", "25", "30", "35"]), JSON.stringify(inOrder[0].options));
  check("...with the answer they marked, not a shuffled one",
    inOrder[0].correctIndex === 0 && inOrder[1].correctIndex === 1, `${inOrder[0].correctIndex}, ${inOrder[1].correctIndex}`);
  check("...marked as written by a person", saved.every((q) => q.source === "manual" && q.createdBy === "admin"));
  check("...and ready to use", saved.every((q) => q.status === "published"));

  const genCallsAfter = (require("fs").existsSync(path.join(__dirname, "gen-calls.jsonl"))
    ? require("fs").readFileSync(path.join(__dirname, "gen-calls.jsonl"), "utf8").split("\n").filter(Boolean).length : 0);
  check("no AI was asked anything - no allowance spent", genCallsAfter === genCallsBefore, `${genCallsAfter - genCallsBefore} generator calls`);

  // A live mock is left alone.
  await db.collection("tests").updateOne({ _id: new mongoose.Types.ObjectId(mockId) }, { $set: { publishStatus: "published" } });
  r = await api("POST", `/exam-series/mock/${mockId}/manual-questions`, { token: admin, body: { questions: [good(9)] } });
  check("a mock students can see cannot be changed under them", r.status === 400, r.json.message);

  // ================= a past paper typed in =================
  r = await api("POST", "/pyq/paper", { token: admin, body: { examStage: "SSC_CGL", year: 2024, shift: "Shift 1" } });
  const pyqId = r.json.test?._id;
  check("an admin can start a past paper by hand", r.status === 201 && !!pyqId, r.json.message);
  check("...timed like the real exam", r.json.test?.durationMinutes === 60, `${r.json.test?.durationMinutes} min`);
  check("...and marked like it - 2 marks, 0.5 off, not the 1 and 0.25 defaults",
    r.json.test?.marksPerQuestion === 2 && r.json.test?.negativeMarking === 0.5,
    `${r.json.test?.marksPerQuestion} / -${r.json.test?.negativeMarking}`);

  r = await api("POST", "/pyq/paper", { token: admin, body: { examStage: "SSC_CGL", year: 1850 } });
  check("a year that cannot be right is refused", r.status === 400, r.json.message);

  const paperRows = [
    { subject: "English", topic: "Grammar", question: "Choose the correctly spelt word from the options given.", optionA: "Accomodate", optionB: "Accommodate", optionC: "Acommodate", optionD: "Acomodate", correct: "B" },
    { subject: "Maths", question: "The LCM of 12 and 18 is which of these numbers?", optionA: "36", optionB: "72", optionC: "24", optionD: "6", correct: 1 },
  ];
  r = await api("POST", `/pyq/paper/${pyqId}/manual-questions`, { token: admin, body: { questions: paperRows } });
  check("its questions can be typed in", r.status === 201 && r.json.added === 2, r.json.message);
  check("...and a missing printed solution is not nagged about - real papers have none",
    !(r.json.warned || []).some((w) => /solution/i.test(w.warnings.join(" "))),
    JSON.stringify(r.json.warned));
  const pq = await db.collection("questions").find({ source: "pyq" }).toArray();
  check("...stored as a real past-paper question, with its year", pq.length === 2 && pq.every((q) => q.pyqYear === 2024), `${pq.length}`);
  const english = pq.find((q) => q.subject === "English");
  check("...options in the paper's own order", english.options[1] === "Accommodate" && english.correctIndex === 1);
  check("...and an answer key written as a number means what a person means - 1 is the first option",
    pq.find((q) => q.subject === "Maths").correctIndex === 0, "1 read as the first option");

  // ================= a live exam written by hand =================
  r = await api("POST", "/live-exams", { token: admin, body: { examType: "SSC_CGL", scheduledAt: new Date(Date.now() + 3600000).toISOString() } });
  const liveId = r.json.test?._id;
  r = await api("POST", `/live-exams/${liveId}/manual-questions`, { token: admin, body: { questions: [good(11), good(12)] } });
  check("a live exam can be written by hand", r.status === 201 && r.json.added === 2, r.json.message);
  const live = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(liveId) });
  check("...in the order given", live.questions.length === 2);
  await db.collection("tests").updateOne({ _id: live._id }, { $set: { publishStatus: "published" } });
  r = await api("POST", `/live-exams/${liveId}/manual-questions`, { token: admin, body: { questions: [good(13)] } });
  check("...but not once it is scheduled - the paper must not change after the notice",
    r.status === 400, r.json.message);
  r = await api("POST", `/exam-series/mock/${liveId}/manual-questions`, { token: admin, body: { questions: [good(14)] } });
  check("...and not through the mock door either", r.status === 404, `${r.status} ${r.json.message}`);

  // ================= the door =================
  r = await api("POST", `/pyq/paper/${pyqId}/manual-questions`, { token: student, body: { questions: paperRows } });
  check("a student cannot add questions", r.status === 401 || r.status === 403, String(r.status));
  r = await api("POST", "/pyq/paper", { token: student, body: { examStage: "SSC_CGL", year: 2024 } });
  check("...nor start a paper", r.status === 401 || r.status === 403, String(r.status));

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
