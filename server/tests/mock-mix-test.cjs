// Checks that a generated mock really is half real previous-year questions
// and half freshly generated ones - and that nothing unreviewed, from
// another exam, or from the AI bank sneaks in as a "PYQ".
// Runs the real server against a throwaway in-memory MongoDB, Gemini stubbed.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { MongoMemoryServer } = require("mongodb-memory-server");
const CALLS = path.join(__dirname, "gen-calls.jsonl");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5057;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

let token = "";
async function api(method, p, body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "mock_mix_test";
  if (fs.existsSync(CALLS)) fs.unlinkSync(CALLS);
  const srv = spawn(process.execPath, ["-r", path.join(__dirname, "mock-stub.cjs"), "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT),
      GEMINI_PAUSE_MS: "1", GEMINI_API_KEY: "",
      TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
      EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", ALLOWED_ORIGINS: "",
    },
  });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await new Promise((r) => setTimeout(r, 250));
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }
  check("gemini stub loaded", /\[stub\]/.test(log));

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9999999999", role: "admin", referralCode: "ADM" });
  token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  // ---- Agniveer pattern: 10 GK + 10 Maths
  await api("POST", "/exams", {
    examType: "AGNIVEER", displayName: "Agniveer Army GD", durationMinutes: 60, negativeMarking: 0.25,
    sections: [
      { subject: "GK", questionCount: 10, difficultyMix: { easy: 30, medium: 50, hard: 20 } },
      { subject: "Maths", questionCount: 10, difficultyMix: { easy: 30, medium: 50, hard: 20 } },
    ],
  });
  // an exam with no PYQ bank at all
  await api("POST", "/exams", {
    examType: "SSC_MTS", displayName: "SSC MTS", durationMinutes: 60,
    sections: [{ subject: "GK", questionCount: 6, difficultyMix: { easy: 50, medium: 50, hard: 0 } }],
  });

  // ---- the PYQ bank
  const q = (over) => ({
    text: `q-${Math.random()}`, options: ["a", "b", "c", "d"], correctIndex: 1, solution: "s",
    examType: ["AGNIVEER"], subject: "GK", topic: "GK",
    difficulty: "exam", source: "pyq", status: "published", ...over,
  });
  await db.collection("questions").insertMany([
    ...Array.from({ length: 20 }, () => q({})),                                   // real, reviewed GK
    ...Array.from({ length: 2 }, () => q({ subject: "Maths", topic: "Maths" })),  // only 2 Maths
    ...Array.from({ length: 5 }, () => q({ status: "under_review" })),            // not reviewed yet
    ...Array.from({ length: 3 }, () => q({ examType: ["SSC_CGL"] })), // another exam
    ...Array.from({ length: 4 }, () => q({ source: "ai_generated" })),            // AI bank, not a real PYQ
    ...Array.from({ length: 2 }, () => q({ correctIndex: null })),                // no answer key
  ]);

  const load = async (id) =>
    (await db.collection("tests").aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      { $lookup: { from: "questions", localField: "questions", foreignField: "_id", as: "qs" } },
    ]).toArray())[0];

  // ---- generate mock #1
  let r = await api("POST", "/exam-series/AGNIVEER/generate-mock");
  check("mock generated", r.status === 201, `${r.status} ${r.json.message || ""}`);
  check("message reports the split", /from past papers/.test(r.json.message || ""), r.json.message);

  const mock1 = await load(r.json.test._id);
  const bySource = (m) => m.qs.reduce((acc, x) => ((acc[x.source] = (acc[x.source] || 0) + 1), acc), {});
  const counts1 = bySource(mock1);
  check("mock has the full 20 questions", mock1.questions.length === 20, `${mock1.questions.length}`);
  check("half are real previous-year questions", counts1.pyq === 7, `pyq ${counts1.pyq}, ai ${counts1.ai_generated}`);
  check("the rest were generated", counts1.ai_generated === 13, `ai ${counts1.ai_generated}`);

  const gk = mock1.qs.filter((x) => x.subject === "GK");
  const maths = mock1.qs.filter((x) => x.subject === "Maths");
  check("GK section: 5 real + 5 new", gk.filter((x) => x.source === "pyq").length === 5 && gk.length === 10, `${gk.filter((x) => x.source === "pyq").length}/${gk.length}`);
  check("Maths: bank only had 2, so 2 real + 8 new", maths.filter((x) => x.source === "pyq").length === 2 && maths.length === 10, `${maths.filter((x) => x.source === "pyq").length}/${maths.length}`);

  check("no unreviewed question used", !mock1.qs.some((x) => x.status === "under_review"));
  check("no question from another exam used", mock1.qs.every((x) => (x.examType || []).includes("AGNIVEER")), JSON.stringify(mock1.qs.map((x) => x.examType).filter((e) => !(e || []).includes("AGNIVEER"))));
  check("no answer-less question used", mock1.qs.every((x) => x.correctIndex !== null && x.correctIndex !== undefined));
  check("no duplicate questions inside the mock", new Set(mock1.questions.map(String)).size === 20);

  // ---- generate mock #2: should reach for PYQs mock #1 didn't use
  r = await api("POST", "/exam-series/AGNIVEER/generate-mock");
  const mock2 = await load(r.json.test._id);
  const pyq1 = new Set(mock1.qs.filter((x) => x.source === "pyq" && x.subject === "GK").map((x) => String(x._id)));
  const pyq2 = mock2.qs.filter((x) => x.source === "pyq" && x.subject === "GK").map((x) => String(x._id));
  check("mock #2 uses different GK previous-year questions", pyq2.every((id) => !pyq1.has(id)), `overlap ${pyq2.filter((id) => pyq1.has(id)).length}`);
  const maths2 = mock2.qs.filter((x) => x.subject === "Maths" && x.source === "pyq");
  check("with only 2 Maths PYQs, it reuses them rather than dropping the count", maths2.length === 2 && mock2.questions.length === 20);

  // ---- real questions must not all sit at the top of their section
  const gkOrder = mock1.questions.slice(0, 10).map((id) => mock1.qs.find((x) => String(x._id) === String(id))?.source);
  const anotherMock = await load((await api("POST", "/exam-series/AGNIVEER/generate-mock")).json.test._id);
  const gkOrder3 = anotherMock.questions.slice(0, 10).map((id) => anotherMock.qs.find((x) => String(x._id) === String(id))?.source);
  const sorted = (arr) => JSON.stringify(arr) === JSON.stringify([...arr].sort());
  check("real and new are shuffled together, not stacked in two halves", !(sorted(gkOrder) && sorted(gkOrder3)), `${gkOrder.join(",")} | ${gkOrder3.join(",")}`);

  // ---- an exam with an empty PYQ bank still works exactly as before
  r = await api("POST", "/exam-series/SSC_MTS/generate-mock");
  const mtsMock = await load(r.json.test._id);
  check("exam with no PYQ bank: mock is all generated, full count", mtsMock.questions.length === 6 && mtsMock.qs.every((x) => x.source === "ai_generated"), `${mtsMock.questions.length} questions`);

  // ---- "Add Questions" must be grounded in real previous-year questions
  const draft = await api("POST", "/exam-series/AGNIVEER/create-empty-mock");
  fs.writeFileSync(CALLS, "");
  const added = await api("POST", `/exam-series/mock/${draft.json.test._id}/add-questions`, { subject: "GK", count: 3 });
  check("add-questions worked", added.status === 200 || added.status === 201, `${added.status} ${added.json.message || ""}`);
  const calls = fs.readFileSync(CALLS, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  check("add-questions passes real PYQ text to the generator as style examples",
    calls.length === 1 && calls[0].pyqExamples.length > 0, JSON.stringify(calls.map((c) => c.pyqExamples.length)));

  // ---- the PYQ feature itself is untouched
  const pyqQuestionsAfter = await db.collection("questions").countDocuments({ source: "pyq" });
  check("no PYQ question was modified or removed", pyqQuestionsAfter === 32, `${pyqQuestionsAfter}`);
  const pyqPapers = await db.collection("tests").countDocuments({ type: "pyq" });
  check("no PYQ paper was created or touched by mock generation", pyqPapers === 0);
  fs.existsSync(CALLS) && fs.unlinkSync(CALLS);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) { console.log("\n--- server log tail ---\n" + log.split("\n").slice(-20).join("\n")); process.exit(1); }
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
