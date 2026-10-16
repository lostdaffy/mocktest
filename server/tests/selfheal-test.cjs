// Taking a bad question out was only half the job. The test was left with a
// hole and a line in the response saying so, and somebody had to notice that
// line and click "Add questions". One purge of 127 untrustworthy answer keys
// left 26 live tests short in an afternoon - one of them serving five
// questions of twelve.
//
// Removal carries the repair with it now.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5074;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 90) + "]" : ""}`);
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
  const uri = mem.getUri() + "selfheal_test";
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
  srv.stderr.on("data", (d) => { log += d; process.stderr.write(String(d)); });
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await new Promise((r) => setTimeout(r, 250));
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const oid = (v) => new mongoose.Types.ObjectId(v);

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  await api("POST", "/exams", { token, body: {
    examType: "SSC_CGL", displayName: "SSC CGL", durationMinutes: 60,
    sections: [{ subject: "Maths", questionCount: 12, difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
  }});
  await api("POST", "/subjects", { token, body: {
    name: "Maths", displayOrder: 1,
    chapters: [{ name: "Percentage", category: "अंकगणित", topics: ["Percentage"], exams: ["SSC_CGL"] }],
  }});

  let r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", topics: ["Percentage"], difficulty: "easy" },
  });
  const testId = r.json.test._id;
  check("a practice test starts full", r.json.test.questionCount === 20, `${r.json.test.questionCount}`);

  // ---- taking one out puts another in
  let test = await db.collection("tests").findOne({ _id: oid(testId) });
  const victim = String(test.questions[3]);
  const before = test.questions.map(String);

  r = await api("DELETE", `/exam-series/mock/${testId}/question/${victim}`, { token });
  check("removing a question answers 200", r.status === 200, `${r.status} ${r.json.message || ""}`);
  check("...and the test is STILL twenty", r.json.remainingCount === 20, `${r.json.remainingCount}`);
  check("...because a replacement was generated, not just promised",
    r.json.refilled?.[0]?.added === 1, JSON.stringify(r.json.refilled?.[0] || {}));
  check("...and the message says so instead of 'add replacements'",
    /replacement/.test(r.json.message || "") && !/add replacements/.test(r.json.message || ""), r.json.message);

  test = await db.collection("tests").findOne({ _id: oid(testId) });
  const after = test.questions.map(String);
  check("...the one taken out is gone", !after.includes(victim));
  check("...exactly one is new", after.filter((id) => !before.includes(id)).length === 1,
    `${after.filter((id) => !before.includes(id)).length} new`);
  const resolved = await db.collection("questions").countDocuments({ _id: { $in: test.questions } });
  check("...and every id in the test resolves to a real question", resolved === 20, `${resolved} of ${test.questions.length}`);
  const texts = await db.collection("questions").find({ _id: { $in: test.questions } }).toArray();
  check("...with no repeat among them", new Set(texts.map((q) => q.text)).size === 20,
    `${new Set(texts.map((q) => q.text)).size} distinct`);

  // ---- a published test heals too: it has already changed, the only
  //      question is whether it stays broken
  await api("PATCH", `/exam-series/practice/${testId}/publish`, { token, body: { isFree: true } });
  test = await db.collection("tests").findOne({ _id: oid(testId) });
  r = await api("DELETE", `/exam-series/mock/${testId}/question/${String(test.questions[0])}`, { token });
  check("a LIVE test is healed rather than left short", r.json.remainingCount === 20, `${r.json.remainingCount}`);
  test = await db.collection("tests").findOne({ _id: oid(testId) });
  check("...and it is still published", test.publishStatus === "published", test.publishStatus);

  // ---- rejecting a question from the bank heals every test holding it
  r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", topics: ["Percentage"], difficulty: "medium" },
  });
  const secondId = r.json.test._id;
  const second = await db.collection("tests").findOne({ _id: oid(secondId) });
  const shared = second.questions[2];
  await db.collection("tests").updateOne({ _id: oid(testId) }, { $push: { questions: shared } });

  r = await api("PATCH", `/questions/${String(shared)}/reject`, { token, body: { reason: "wrong answer key" } });
  check("rejecting a question heals every test that held it",
    (r.json.refilled || []).length === 2, `${(r.json.refilled || []).length} test(s) refilled`);
  const t1 = await db.collection("tests").findOne({ _id: oid(testId) });
  const t2 = await db.collection("tests").findOne({ _id: oid(secondId) });
  check("...both are back to full", t2.questions.length === 20, `second: ${t2.questions.length}`);
  check("...and the rejected one is in neither",
    !t1.questions.map(String).includes(String(shared)) && !t2.questions.map(String).includes(String(shared)));
  check("...and nothing points at a question that is gone",
    (await db.collection("questions").countDocuments({ _id: { $in: t2.questions } })) === t2.questions.length);

  // ---- and the one-click repair for tests that went short before any of this
  // Deliberately half-formed: no durationMinutes, no examType, the way a test
  // written before a later schema change looks. Filling it must not depend on
  // it being able to revalidate itself.
  const stunted = await db.collection("tests").insertOne({
    title: "Average - Advanced #1", type: "practice", subject: "Maths", topic: "Percentage",
    difficultyLevel: "advanced", questions: (await db.collection("questions").find({}).limit(5).toArray()).map((q) => q._id),
    publishStatus: "published",
  });
  r = await api("POST", "/exam-series/practice/fill-short", { token, body: { limit: 5 } });
  check("every test that was already short can be filled in one call", r.status === 200, `${r.status} ${r.json.message || ""}`);
  const healed = await db.collection("tests").findOne({ _id: stunted.insertedId });
  check("...the one serving five of twenty is full", healed.questions.length === 20, `${healed.questions.length}/20`);
  check("...even though it predates half the schema", !healed.durationMinutes && !healed.examType, "still missing those fields, still filled");
  check("...and the report says what it did", /added across/.test(r.json.message || ""), r.json.message);

  r = await api("POST", "/exam-series/practice/fill-short", { token, body: {} });
  check("...run again with nothing to do, it says so", /every practice test is full/i.test(r.json.message || ""), r.json.message);

  // ---- a mock heals too: same section, same spot in the paper
  const bankIds = (await db.collection("questions").find({ subject: "Maths" }).limit(12).toArray()).map((q) => q._id);
  const mock = await db.collection("tests").insertOne({
    title: "SSC CGL - Mock #1", type: "full_mock", examType: "SSC_CGL", examStage: "SSC_CGL",
    questions: bankIds, publishStatus: "draft", durationMinutes: 60,
  });
  const mockVictim = String(bankIds[5]);
  r = await api("DELETE", `/exam-series/mock/${mock.insertedId}/question/${mockVictim}`, { token });
  check("taking a question out of a mock puts one back", r.json.remainingCount === 12 && r.json.short === 0,
    `${r.json.remainingCount}, short ${r.json.short}, ${r.json.message}`);
  const healedMock = await db.collection("tests").findOne({ _id: mock.insertedId });
  const fresh = healedMock.questions.map(String).filter((id) => !bankIds.map(String).includes(id));
  check("...in the same place in the paper", fresh.length === 1 && String(healedMock.questions[5]) === fresh[0],
    `new at ${healedMock.questions.map(String).indexOf(fresh[0])}`);
  const freshQ = await db.collection("questions").findOne({ _id: oid(fresh[0]) });
  check("...from the same section", freshQ?.subject === "Maths", freshQ?.subject);

  // ---- no allowance left: the hole goes into the queue, the queue stays put
  await api("POST", "/exams", { token, body: {
    examType: "NO_ALLOWANCE", displayName: "No Allowance Exam", durationMinutes: 60, examLevel: "ALLOWANCE_AFTER_0",
    sections: [{ subject: "Maths", questionCount: 3, difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
  }});
  const broke = await db.collection("tests").insertOne({
    title: "No Allowance - Mock #1", type: "full_mock", examType: "NO_ALLOWANCE", examStage: "NO_ALLOWANCE",
    questions: bankIds.slice(0, 3), publishStatus: "published", durationMinutes: 60,
  });
  const resumeAt = new Date(Date.now() + 3600e3);
  await db.collection("queuestates").updateOne({ key: "generation" }, { $set: { paused: true, pausedReason: "allowance", resumableAfter: resumeAt } }, { upsert: true });
  r = await api("DELETE", `/exam-series/mock/${broke.insertedId}/question/${String(bankIds[0])}`, { token });
  check("with no allowance left the mock is one short...", r.json.remainingCount === 2 && r.json.short === 1, `${r.json.remainingCount}, ${r.json.message}`);
  const topUp = await db.collection("generationjobs").findOne({ kind: "top_up", testId: broke.insertedId, status: "queued" });
  check("...and a top-up for it is waiting in the queue", !!topUp, topUp?.label);
  await db.collection("generationjobs").deleteMany({ testId: broke.insertedId });
  r = await api("POST", "/generation/enqueue-short", { token, body: { testId: String(broke.insertedId) } });
  check("a short published mock can be queued for a top-up", r.json.queued === 1, r.json.message);
  const qs = await db.collection("queuestates").findOne({ key: "generation" });
  check("asking for it again while the allowance is out leaves the queue paused for the user to resume",
    qs.paused === true && +new Date(qs.resumableAfter) === +resumeAt, `${qs.paused} ${r.json.message}`);

  // ---- Reject (a stale fact, say) with no allowance left: queued the same way
  const stale = await db.collection("questions").insertOne({
    text: "Who is the current Secretary-General of the UN?", textHi: "वर्तमान में संयुक्त राष्ट्र के महासचिव कौन हैं?",
    options: ["Kofi Annan", "Antonio Guterres", "Trygve Lie", "Ban Ki-moon"], correctIndex: 1, solution: "s",
    examType: ["NO_ALLOWANCE"], subject: "Maths", topic: "Current Affairs", difficulty: "easy", source: "ai_generated", status: "published",
  });
  const staleMock = await db.collection("tests").insertOne({
    title: "No Allowance - Mock #2", type: "full_mock", examType: "NO_ALLOWANCE", examStage: "NO_ALLOWANCE",
    questions: [...bankIds.slice(3, 5), stale.insertedId], publishStatus: "published", durationMinutes: 60,
  });
  r = await api("PATCH", `/questions/${stale.insertedId}/reject`, { token, body: { reason: "out of date" } });
  const rejectTopUp = await db.collection("generationjobs").findOne({ kind: "top_up", testId: staleMock.insertedId, status: "queued" });
  check("rejecting a question a mock can't replace today queues a top-up for that mock", !!rejectTopUp, r.json.message);
  check("...and says so", /queued to be filled/.test(r.json.message || ""), r.json.message);
  r = await api("PATCH", `/questions/${stale.insertedId}/reject`, { token, body: { reason: "again" } });
  const jobs = await db.collection("generationjobs").countDocuments({ kind: "top_up", testId: staleMock.insertedId, status: "queued" });
  check("...once, not again on a second press", jobs === 1, String(jobs));
  await db.collection("queuestates").updateOne({ key: "generation" }, { $set: { paused: false }, $unset: { resumableAfter: "" } });
  await db.collection("generationjobs").deleteMany({ testId: broke.insertedId });

  // ---- a question already in the paper under another section is a repeat
  // Super TET Mock #2 asked who chaired the Drafting Committee in GK and
  // again in EVS: the bank check looks at one subject only. Run in this
  // process, with the stub, so the next text it writes is known.
  require(STUB);
  const { createVerifiedQuestions } = require(path.join(SERVER, "services/questionFactory"));
  const { questionKey } = require(path.join(SERVER, "services/validationPipeline"));
  const twin = "AI EVS easy #1";
  const inGk = await db.collection("questions").insertOne({
    text: twin, textKey: questionKey(twin), subject: "GK", topic: "GK", options: ["a", "b", "c", "d"], correctIndex: 0, status: "published",
  });
  const built = await createVerifiedQuestions({
    needed: 2, inTest: [inGk.insertedId],
    generateParams: { examType: "SUPER_TET", subject: "EVS", topic: "EVS", difficulty: "easy" },
  });
  const builtTexts = (await db.collection("questions").find({ _id: { $in: built.ids } }).toArray()).map((q) => q.text);
  check("a question the paper already has in another section is not added again",
    builtTexts.length === 2 && !builtTexts.includes(twin) && built.duplicates >= 1, JSON.stringify({ builtTexts, dup: built.duplicates }));

  // ...and so is the same fact in other words with the same answer. That
  // call used the stub's #1-#6; its next question is #7, answer "71".
  const sameFact = await db.collection("questions").insertOne({
    text: "Which EVS topic is easy and important?", textKey: questionKey("Which EVS topic is easy and important?"),
    subject: "GK", topic: "GK", options: ["71", "b1", "c1", "d1"], correctIndex: 0, status: "published",
  });
  const built2 = await createVerifiedQuestions({
    needed: 2, inTest: [sameFact.insertedId],
    generateParams: { examType: "SUPER_TET", subject: "EVS", topic: "EVS", difficulty: "easy" },
  });
  const texts2 = (await db.collection("questions").find({ _id: { $in: built2.ids } }).toArray()).map((q) => q.text);
  check("the same fact asked in other words, same answer, is not added either",
    texts2.length === 2 && !texts2.includes("AI EVS easy #7") && built2.duplicates >= 1, JSON.stringify({ texts2, dup: built2.duplicates }));

  // ---- a PUBLISHED mock that lost questions to a review is refilled too,
  //      section by section (the Super TET mocks were published mid-review)
  const { refillTest } = require(path.join(SERVER, "services/testTopUp"));
  const { findGaps } = require(path.join(SERVER, "services/generationGaps"));
  let live = await db.collection("tests").findOne({ _id: mock.insertedId });
  const pulled = [live.questions[2], live.questions[5], live.questions[9]];
  await db.collection("tests").updateOne({ _id: mock.insertedId }, { $set: { publishStatus: "published" }, $pull: { questions: { $in: pulled } } });
  const gaps = await findGaps();
  check("a published mock short of its pattern is listed as short",
    gaps.short.some((s) => String(s.testId) === String(mock.insertedId) && s.have === 9 && s.of === 12), JSON.stringify(gaps.short.filter((s) => s.level === "mock")));
  const refilled = await refillTest(mock.insertedId);
  live = await db.collection("tests").findOne({ _id: mock.insertedId });
  check("...and refilling brings it back to the pattern's 12", refilled.filled && live.questions.length === 12, JSON.stringify(refilled));
  const liveQs = await db.collection("questions").find({ _id: { $in: live.questions } }).toArray();
  check("...every one in its section, none of the pulled ones back",
    liveQs.length === 12 && liveQs.every((q) => q.subject === "Maths") && !live.questions.some((id) => pulled.map(String).includes(String(id))));
  check("...and it stays published", live.publishStatus === "published");

  // ---- a practice build stopped by the day's allowance says so in the
  //      queue's words, so the job goes back in instead of failing
  await db.collection("subjects").insertOne({ name: "AllowanceGone", isActive: true, chapters: [{ name: "Anything", topics: ["Anything"] }] });
  const { buildPracticeTest } = require(path.join(SERVER, "controllers/examSeriesController"));
  let allowanceMsg = "";
  try { await buildPracticeTest({ subject: "AllowanceGone", chapter: "Anything", difficulty: "easy" }); } catch (e) { allowanceMsg = e.message; }
  check("a practice build with no allowance left reports the allowance, not 'rate limit or API issue'",
    /every model has used its allowance/i.test(allowanceMsg), allowanceMsg);

  // ---- a mock that lost its figure questions gets figures back, not text
  //      questions in their place: the paper must not skip the topic.
  await db.collection("subjects").insertOne({
    name: "Reasoning", isActive: true, chapters: [{ name: "Figure Series", visual: "figure", topics: ["Figure Series"] }],
  });
  await db.collection("exampatterns").insertOne({
    examType: "FIG_EXAM", displayName: "Figure Exam", durationMinutes: 30,
    sections: [{ subject: "Reasoning", questionCount: 6, syllabus: ["Figure Series", "Coding-Decoding"], difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
  });
  const plain = await db.collection("questions").insertMany([1, 2, 3].map((i) => ({
    text: `Coding question ${i}`, subject: "Reasoning", topic: "Coding-Decoding", options: ["a", "b", "c", "d"], correctIndex: 0, status: "published",
  })));
  const figMock = await db.collection("tests").insertOne({
    title: "Figure Exam - Mock #1", type: "full_mock", examType: "FIG_EXAM", examStage: "FIG_EXAM",
    questions: Object.values(plain.insertedIds), publishStatus: "published", durationMinutes: 30,
  });
  const figRefill = await refillTest(figMock.insertedId);
  const figPaper = await db.collection("tests").findOne({ _id: figMock.insertedId });
  const figQs = await db.collection("questions").find({ _id: { $in: figPaper.questions }, "visual.kind": "figure" }).toArray();
  check("a mock missing its figure set is refilled with figure questions first", figRefill.filled && figPaper.questions.length === 6 && figQs.length === 3,
    JSON.stringify({ filled: figRefill.filled, have: figPaper.questions.length, figures: figQs.length, why: figRefill.why }));
  check("...each one checked in code, its options in picture order",
    figQs.every((q) => q.visual.figure.answerCheck === "checked" && q.options.join() === "Figure (A),Figure (B),Figure (C),Figure (D)"),
    JSON.stringify(figQs.map((q) => [q.visual.figure.answerCheck, q.options.join("|")])));

  const student = await db.collection("users").insertOne({ name: "S", phone: "9111111111", role: "user", referralCode: "S1" });
  const sToken = jwt.sign({ id: student.insertedId.toString(), sessionId: "y" }, JWT_SECRET);
  const denied = await api("POST", "/exam-series/practice/fill-short", { token: sToken, body: {} });
  check("a student cannot run it", denied.status === 401 || denied.status === 403, `${denied.status}`);

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
