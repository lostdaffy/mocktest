// An admin has to be able to take a question out of a test and put a fresh
// one in its place. Mocks and live exams could; practice tests - most of the
// content - could only ever shrink. And removing used to delete the question
// from the bank even when another test was still holding it, which left that
// test pointing at nothing and quietly one question shorter.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5062;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");

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
  const uri = mem.getUri() + "edit_test";
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

  // ---- a practice test to work on
  let r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", topics: ["Percentage"], difficulty: "easy" },
  });
  const testId = r.json.test._id;
  check("a practice test is built full", r.json.test.questionCount === 12, `${r.json.test.questionCount}`);

  let test = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(testId) });
  const victim = String(test.questions[2]);

  // ---- removing one
  r = await api("DELETE", `/exam-series/mock/${testId}/question/${victim}`, { token });
  check("the admin can take a question out of a practice test", r.status === 200, `${r.status} ${r.json.message || ""}`);
  // It used to leave the test at 11 with a note saying "add replacements".
  // Removal carries the repair with it now.
  check("...and the test is still twelve, because one was put back",
    r.json.remainingCount === 12, `${r.json.remainingCount}`);
  check("...so nothing is short", r.json.short === 0, `short ${r.json.short}`);
  check("...and the message says a replacement went in", /replacement/i.test(r.json.message || ""), r.json.message);
  check("...the question is gone from the bank, nothing else was using it",
    r.json.deletedFromBank === true && !(await db.collection("questions").findOne({ _id: new mongoose.Types.ObjectId(victim) })));
  check("...and the deletion is on record",
    (await db.collection("rejectedquestions").countDocuments({ reason: "removed_by_admin" })) === 1);

  // ---- a question two tests share is NOT deleted
  r = await api("POST", "/exam-series/practice/generate", {
    token, body: { subject: "Maths", chapter: "Percentage", topics: ["Percentage"], difficulty: "medium" },
  });
  const secondId = r.json.test._id;
  const second = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(secondId) });
  const shared = second.questions[0];
  await db.collection("tests").updateOne({ _id: new mongoose.Types.ObjectId(testId) }, { $push: { questions: shared } });

  r = await api("DELETE", `/exam-series/mock/${testId}/question/${String(shared)}`, { token });
  check("a question another test still uses is NOT deleted from the bank",
    r.json.deletedFromBank === false, JSON.stringify({ deleted: r.json.deletedFromBank }));
  check("...and the message says why it was kept", /other test/i.test(r.json.message || ""), r.json.message);
  check("...so the other test is not left pointing at nothing",
    !!(await db.collection("questions").findOne({ _id: shared })));

  // Straight from the database: every id the other test holds must still
  // resolve to a real question. A dangling id is invisible over HTTP -
  // populate just drops it and the test silently serves one fewer.
  const other = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(secondId) });
  const resolved = await db.collection("questions").countDocuments({ _id: { $in: other.questions } });
  check("...so the other test still has all 12 of its questions",
    other.questions.length === 12 && resolved === 12, `${resolved} of ${other.questions.length} resolve`);

  // ---- refilling by hand, for a test that somehow ended up short anyway
  // (a top-up that ran out of quota, or one built before any of this)
  test = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(testId) });
  await db.collection("tests").updateOne({ _id: test._id }, { $pop: { questions: 1 } });
  r = await api("POST", `/exam-series/practice/${testId}/add-questions`, { token, body: {} });
  check("the admin can still add replacements by hand", r.status === 200, `${r.status} ${r.json.message || ""}`);
  check("...enough to make the test whole again", r.json.total === 12, `${r.json.total} questions`);

  test = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(testId) });
  const texts = await db.collection("questions").find({ _id: { $in: test.questions } }).toArray();
  check("...every question in it really exists", texts.length === 12, `${texts.length} of ${test.questions.length} resolve`);
  check("...and none of them is a repeat of another in the same test",
    new Set(texts.map((q) => q.text)).size === texts.length, `${new Set(texts.map((q) => q.text)).size} distinct`);

  // ---- and a full test cannot be padded past its size
  r = await api("POST", `/exam-series/practice/${testId}/add-questions`, { token, body: {} });
  check("a test that is already full refuses more", r.status === 400, `${r.status} ${r.json.message || ""}`);

  // ---- a published test is not edited by accident
  await api("PATCH", `/exam-series/practice/${testId}/publish`, { token, body: { isFree: true } });
  r = await api("POST", `/exam-series/practice/${testId}/add-questions`, { token, body: { count: 1 } });
  check("a published test has to be unpublished first", r.status === 400 && /unpublish/i.test(r.json.message || ""), r.json.message);

  // ---- a published test is not a dead end
  // It used to be one: adding refuses a published test, and there was no way
  // to unpublish - so a test that went out one question short stayed that way.
  r = await api("PATCH", `/exam-series/practice/${testId}/unpublish`, { token });
  check("a published test can be taken back off the app", r.status === 200, `${r.status} ${r.json.message || ""}`);
  test = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(testId) });
  check("...it is a draft again", test.publishStatus === "draft", test.publishStatus);
  check("...and its questions were left alone", test.questions.length === 12, `${test.questions.length}`);

  r = await api("PATCH", `/exam-series/practice/${testId}/unpublish`, { token });
  check("...unpublishing a draft says so rather than pretending", r.status === 400, `${r.status} ${r.json.message || ""}`);

  // ---- and a test with a hole in it does not go out
  // ---- a test that IS short still cannot go out
  // Removal heals itself, so the only way to be short now is a top-up that
  // could not finish - taken straight off the collection to make that case.
  test = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(testId) });
  await db.collection("tests").updateOne({ _id: test._id }, { $pop: { questions: 1 } });
  check("a test can still end up short if a top-up cannot finish",
    (await db.collection("tests").findOne({ _id: test._id })).questions.length === 11);

  r = await api("PATCH", `/exam-series/practice/${testId}/publish`, { token, body: { isFree: true } });
  check("a short test cannot be published", r.status === 400, `${r.status} ${r.json.message || ""}`);
  check("...and it says how many are missing", r.json.short === 1, `short ${r.json.short}`);
  check("...and no student can see it", (await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(testId) })).publishStatus === "draft");

  await api("POST", `/exam-series/practice/${testId}/add-questions`, { token, body: {} });
  r = await api("PATCH", `/exam-series/practice/${testId}/publish`, { token, body: { isFree: true } });
  check("once it is full again it publishes", r.status === 200, `${r.status} ${r.json.message || ""}`);
  test = await db.collection("tests").findOne({ _id: new mongoose.Types.ObjectId(testId) });
  check("...with all 12 questions in it", test.questions.length === 12 && test.publishStatus === "published", `${test.questions.length} ${test.publishStatus}`);

  // ---- the panel is read by one person doing a careful job; it speaks one language
  const spoken = [
    r.json.message,
    (await api("PATCH", `/exam-series/practice/${testId}/publish`, { token, body: {} })).json.message,
  ].join(" ");
  check("the panel answers in English, not half-Hindi",
    !/(chahiye|nahi|nhi|karo|ho gaya|hain\b|kam se kam|abhi\b)/i.test(spoken), spoken.slice(0, 80));

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
