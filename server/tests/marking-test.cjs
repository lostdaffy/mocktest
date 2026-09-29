// Negative marking is not always one number for a whole paper.
//
// SSC MTS is one exam sat in two sessions: Session-I (Numerical and
// Reasoning, 40 questions) carries NO penalty, Session-II (General Awareness
// and English, 50 questions) deducts a full mark. Flattening that to a
// single rate punished a wrong answer in Maths that the real paper lets you
// guess freely - the student's score came out below what the real exam would
// give them, and they learned not to attempt questions that are free.
//
// The nine papers that ARE marked uniformly must be completely unaffected.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5083;
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
  // ---- the rules themselves, without a server
  const marking = require(path.join(SERVER, "utils/marking"));
  const mtsTest = {
    negativeMarking: 1, marksPerQuestion: 3,
    sectionRules: [
      { subject: "Maths", sources: [], negativeMarking: 0, marksPerQuestion: null },
      { subject: "Reasoning", sources: [], negativeMarking: 0, marksPerQuestion: null },
      { subject: "GK", sources: ["Science", "Current Affairs"], negativeMarking: 1, marksPerQuestion: null },
      { subject: "English", sources: [], negativeMarking: 1, marksPerQuestion: null },
    ],
  };
  check("a section with no penalty costs nothing", marking.rateFor(mtsTest, "Maths") === 0, String(marking.rateFor(mtsTest, "Maths")));
  check("...while the penalised session still costs a full mark", marking.rateFor(mtsTest, "English") === 1);
  check("...and a subject the section merely draws from follows that section",
    marking.rateFor(mtsTest, "Science") === 1, "Science sits inside General Awareness");
  check("...and a subject in no section falls back to the exam's own rate",
    marking.rateFor(mtsTest, "Nonsense") === 1);
  check("a paper marked two ways has no single rate to quote",
    marking.uniformRate(mtsTest) === null, String(marking.uniformRate(mtsTest)));

  const cgl = { negativeMarking: 0.5, marksPerQuestion: 2, sectionRules: [
    { subject: "Maths", sources: [], negativeMarking: null, marksPerQuestion: null },
    { subject: "English", sources: [], negativeMarking: null, marksPerQuestion: null },
  ]};
  check("a paper marked one way still quotes that one rate", marking.uniformRate(cgl) === 0.5, String(marking.uniformRate(cgl)));
  check("...and every section of it deducts the same", marking.rateFor(cgl, "Maths") === 0.5 && marking.rateFor(cgl, "English") === 0.5);
  check("a paper with no section rules at all is unchanged",
    marking.rateFor({ negativeMarking: 0.25 }, "Anything") === 0.25 && marking.uniformRate({ negativeMarking: 0.25 }) === 0.25);

  // ---- a paper whose sections each run their own clock
  // IBPS PO Prelims is three 20-minute papers in a row, not one 60-minute
  // paper: once a section closes you cannot go back to it.
  const ibps = { durationMinutes: 60, sectionRules: [
    { subject: "English", sources: [], durationMinutes: 20 },
    { subject: "Reasoning", sources: [], durationMinutes: 20 },
    { subject: "Maths", sources: [], durationMinutes: 20 },
  ]};
  check("a paper with a clock on every section is recognised", marking.hasSectionalTiming(ibps) === true);
  check("...and the nine that run on one clock are not",
    marking.hasSectionalTiming(cgl) === false && marking.hasSectionalTiming({}) === false);
  check("...and half-timed counts as one clock, not as broken",
    marking.hasSectionalTiming({ sectionRules: [
      { subject: "A", durationMinutes: 20 }, { subject: "B", durationMinutes: null } ] }) === false);
  check("...and the section times add up to the paper",
    ibps.sectionRules.reduce((n, r) => n + r.durationMinutes, 0) === ibps.durationMinutes,
    `${ibps.sectionRules.reduce((n, r) => n + r.durationMinutes, 0)} of ${ibps.durationMinutes} min`);

  // ---- and end to end, as a student meets it
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "marking_test";
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
    const u = await db.collection("users").insertOne({
      name, phone, role, referralCode: code, activeSessionId: "s-" + code,
      subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000),
      freeUsage: {}, createdAt: new Date(),
    });
    return { id: u.insertedId, token: jwt.sign({ id: u.insertedId.toString(), sessionId: "s-" + code }, JWT_SECRET) };
  };
  const admin = await mk("Admin", "9000000011", "admin", "ADM2");
  const student = await mk("Student", "9000000012", "student", "STU2");

  // The real SSC MTS shape, in miniature: two sessions, one penalised.
  let r = await api("POST", "/exams", { token: admin.token, body: {
    examType: "SSC_MTS", displayName: "SSC MTS & Havaldar", durationMinutes: 90,
    marksPerQuestion: 3, negativeMarking: 1,
    sections: [
      { subject: "Maths", questionCount: 2, negativeMarking: 0,
        difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Percentage", subTopics: ["basics"] }] },
      { subject: "English", questionCount: 2, negativeMarking: 1,
        difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Grammar", subTopics: ["tense"] }] },
    ],
  }});
  check("an admin can say a section is marked differently", r.status === 200 || r.status === 201, String(r.status));
  const saved = await db.collection("exampatterns").findOne({ examType: "SSC_MTS" });
  check("...and it is stored, not dropped on the way in",
    saved.sections[0].negativeMarking === 0 && saved.sections[1].negativeMarking === 1,
    `Maths ${saved.sections[0].negativeMarking}, English ${saved.sections[1].negativeMarking}`);

  // A section time typed into the panel must survive the round trip, or the
  // feature is settable only in the database.
  await api("POST", "/exams", { token: admin.token, body: {
    examType: "BANKING", displayName: "IBPS PO Prelims", durationMinutes: 60,
    marksPerQuestion: 1, negativeMarking: 0.25,
    sections: [
      { subject: "English", questionCount: 30, durationMinutes: 20,
        difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Grammar", subTopics: ["tense"] }] },
      { subject: "Maths", questionCount: 35, durationMinutes: 20,
        difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Percentage", subTopics: ["basics"] }] },
      { subject: "Reasoning", questionCount: 35, durationMinutes: 20,
        difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Series", subTopics: ["number"] }] },
    ],
  }});
  const bank = await db.collection("exampatterns").findOne({ examType: "BANKING" });
  check("a section time typed in the panel is stored, not dropped",
    bank.sections.every((x) => x.durationMinutes === 20), bank.sections.map((x) => x.durationMinutes).join(","));
  check("...and a paper built from it would lock each section to its own clock",
    marking.hasSectionalTiming({ sectionRules: marking.sectionRulesFrom(bank) }) === true);

  // The panel edits through PATCH, not POST. A rule that survives being
  // created and not being edited is a rule that disappears the first time
  // somebody opens the pattern and presses Save.
  const mtsDoc = await db.collection("exampatterns").findOne({ examType: "SSC_MTS" });
  let e = await api("PATCH", `/exams/${mtsDoc._id}`, { token: admin.token, body: {
    sections: mtsDoc.sections.map((sec) => ({
      subject: sec.subject, sources: sec.sources || [], questionCount: sec.questionCount,
      difficultyMix: sec.difficultyMix, syllabus: sec.syllabus,
      negativeMarking: sec.subject === "Maths" ? 0 : 1,
    })),
  }});
  const edited = await db.collection("exampatterns").findOne({ examType: "SSC_MTS" });
  check("editing a pattern keeps the per-section rule instead of dropping it",
    e.status === 200 && edited.sections.find((x) => x.subject === "Maths").negativeMarking === 0 &&
    edited.sections.find((x) => x.subject === "English").negativeMarking === 1,
    edited.sections.map((x) => `${x.subject}:${x.negativeMarking}`).join(" "));
  check("...and does not quietly lose the syllabus with it",
    edited.sections.every((x) => (x.syllabus || []).length > 0));

  // A paper built from it, carrying the rules with it.
  const mkQ = (subject, i) => ({
    text: `${subject} question ${i}`, textHi: "प्रश्न",
    options: ["10", "20", "30", "40"], optionsHi: ["अ", "ब", "स", "द"], correctIndex: 0,
    solution: "The answer is 10.", solutionHi: "हल", subject,
    topic: subject === "Maths" ? "Percentage" : "Grammar",
    difficulty: "easy", status: "published", examType: "SSC_MTS", createdAt: new Date(),
  });
  const ins = await db.collection("questions").insertMany([
    mkQ("Maths", 1), mkQ("Maths", 2), mkQ("English", 1), mkQ("English", 2),
  ]);
  const ids = Object.values(ins.insertedIds);

  const { sectionRulesFrom } = marking;
  const pattern = await db.collection("exampatterns").findOne({ examType: "SSC_MTS" });
  const testDoc = await db.collection("tests").insertOne({
    title: "MTS marking check", type: "full_mock", examType: "SSC_MTS", examStage: "SSC_MTS",
    questions: ids, durationMinutes: 90, marksPerQuestion: 3, negativeMarking: 1,
    sectionRules: sectionRulesFrom(pattern),
    publishStatus: "published", isFree: true, createdBy: "admin", createdAt: new Date(),
  });
  const testId = testDoc.insertedId.toString();

  // Everything wrong, in both sessions.
  r = await api("POST", `/tests/${testId}/submit`, { token: student.token, body: {
    answers: ids.map((id) => ({ questionId: String(id), selectedIndex: 1, timeTakenSeconds: 10 })),
  }});
  check("a paper where every answer is wrong is still graded", r.status === 200 || r.status === 201, String(r.status));
  check("only the penalised session deducts anything",
    r.json.marksLost === 2, `${r.json.marksLost} lost - 2 English at 1, 2 Maths at 0`);
  check("...so a wrong answer in the free session costs the student nothing",
    r.json.score === -2, `scored ${r.json.score}`);
  check("...and the result refuses to quote a single rate for a paper marked two ways",
    r.json.negativeMarking === null, String(r.json.negativeMarking));

  // A uniform paper must behave exactly as it did before.
  await api("POST", "/exams", { token: admin.token, body: {
    examType: "SSC_CGL", displayName: "SSC CGL Tier 1", durationMinutes: 60,
    marksPerQuestion: 2, negativeMarking: 0.5,
    sections: [{ subject: "Maths", questionCount: 2, difficultyMix: { easy: 100, medium: 0, hard: 0 },
      syllabus: [{ topic: "Percentage", subTopics: ["basics"] }] }],
  }});
  const cglPattern = await db.collection("exampatterns").findOne({ examType: "SSC_CGL" });
  const ins2 = await db.collection("questions").insertMany([
    { ...mkQ("Maths", 3), examType: "SSC_CGL" }, { ...mkQ("Maths", 4), examType: "SSC_CGL" },
  ]);
  const ids2 = Object.values(ins2.insertedIds);
  const t2 = await db.collection("tests").insertOne({
    title: "CGL marking check", type: "full_mock", examType: "SSC_CGL", examStage: "SSC_CGL",
    questions: ids2, durationMinutes: 60, marksPerQuestion: 2, negativeMarking: 0.5,
    sectionRules: sectionRulesFrom(cglPattern),
    publishStatus: "published", isFree: true, createdBy: "admin", createdAt: new Date(),
  });
  r = await api("POST", `/tests/${t2.insertedId}/submit`, { token: student.token, body: {
    answers: [
      { questionId: String(ids2[0]), selectedIndex: 0, timeTakenSeconds: 10 },
      { questionId: String(ids2[1]), selectedIndex: 1, timeTakenSeconds: 10 },
    ],
  }});
  check("a uniformly marked paper is untouched by any of this",
    r.json.score === 1.5 && r.json.marksLost === 0.5, `scored ${r.json.score}, lost ${r.json.marksLost}`);
  check("...and still quotes its one rate to the student",
    r.json.negativeMarking === 0.5, String(r.json.negativeMarking));

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
