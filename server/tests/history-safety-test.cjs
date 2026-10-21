// The question bank's safety rules: every change is kept in a history and can
// be undone; an edit or an approval goes through the quality gate; a question
// in use is retired, not deleted, unless the admin confirms; even a deletion
// keeps a copy that can be brought back; and nothing in a request can become
// a database operator.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5101;
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
  return { status: res.status, json, headers: res.headers };
}

const good = (n, extra = {}) => ({
  text: `A shopkeeper sells an article for Rs ${240 + n * 3} after giving a discount of 25% on its marked price. What is the marked price of the article?`,
  textHi: `एक दुकानदार अंकित मूल्य पर 25% छूट देकर एक वस्तु ${240 + n * 3} रुपये में बेचता है। वस्तु का अंकित मूल्य क्या है?`,
  options: ["Rs 300", "Rs 320", "Rs 340", "Rs 360"],
  optionsHi: ["300 रुपये", "320 रुपये", "340 रुपये", "360 रुपये"],
  correctIndex: 1,
  solution: "After a 25% discount the selling price is 75% of the marked price. So the marked price = 240 × 100/75 = 320. The marked price is Rs 320.",
  solutionHi: "25% छूट के बाद विक्रय मूल्य अंकित मूल्य का 75% है। अतः अंकित मूल्य = 240 × 100/75 = 320 रुपये।",
  examType: ["SSC_CGL"], subject: "Maths", topic: "Percentage", chapter: "Percentage", difficulty: "easy",
  source: "manual", status: "published", createdAt: new Date(), updatedAt: new Date(),
  ...extra,
});

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "history_test";
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
  const oid = (s) => new mongoose.Types.ObjectId(String(s));

  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);
  const student = await db.collection("users").insertOne({ name: "Stu", phone: "9000000001", role: "student", referralCode: "STU" });
  const stoken = jwt.sign({ id: student.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  const ins = await db.collection("questions").insertMany([good(1), good(2), good(3), good(4, { status: "draft" }), good(5)]);
  const [q1, q2, q3, q4, q5] = Object.values(ins.insertedIds).map(String);
  const t = await db.collection("tests").insertOne({ title: "Paper A", type: "practice", questions: [oid(q3), oid(q5)], publishStatus: "published", createdAt: new Date() });
  const get = (id) => db.collection("questions").findOne({ _id: oid(id) });

  // ---- nothing in a request becomes an operator
  let r = await api("POST", "/auth/login", { body: { phone: { $ne: "" }, password: { $ne: "" } } });
  check("a login with $ne operators is not let in", r.status !== 200 && !r.json.token, `${r.status}`);
  r = await api("GET", "/questions?status[$ne]=published", { token });
  check("an operator in the question list query is ignored, not obeyed", r.status === 200 && r.json.total === 5, `${r.status} ${r.json.total}`);
  check("API answers are never cached", r.headers.get("cache-control") === "no-store", r.headers.get("cache-control"));
  r = await api("PUT", `/questions/${q1}`, { token, body: { text: { $set: "x" } } });
  check("an edit whose text is not text is refused", r.status === 400, `${r.status} ${r.json.message}`);
  r = await api("PUT", `/questions/${q1}`, { token, body: { options: ["a", "b", "c"] } });
  check("an edit with three options is refused", r.status === 400, `${r.status}`);
  r = await api("PUT", `/questions/${q1}`, { token, body: { correctIndex: 7 } });
  check("an edit with answer 7 is refused", r.status === 400, `${r.status}`);
  r = await api("PUT", `/questions/not-an-id`, { token, body: { text: "x" } });
  check("a bad id is refused, not an error", r.status === 400, `${r.status}`);
  r = await api("GET", "/quality/settings", { token: stoken });
  check("a student cannot reach the quality desk", r.status === 403 || r.status === 401, `${r.status}`);

  // ---- every edit is in the history, and can be undone
  const oldText = (await get(q1)).text;
  r = await api("PUT", `/questions/${q1}`, { token, body: { text: oldText.replace("shopkeeper", "trader") } });
  check("a sound edit to a live question saves and stays live", r.status === 200 && r.json.question.status === "published" && !r.json.held, `${r.status} ${r.json.question?.status}`);
  r = await api("GET", `/quality/questions/${q1}/history`, { token });
  const editRow = (r.json.history || []).find((h) => h.action === "edit");
  check("the edit is in the history with the old text", editRow && editRow.before.text === oldText && /trader/.test(editRow.after.text));
  r = await api("POST", `/quality/questions/${q1}/restore`, { token, body: { revisionId: String(editRow?._id) } });
  check("restoring puts the text back", (await get(q1)).text === oldText, r.json.message);
  r = await api("GET", `/quality/questions/${q1}/history`, { token });
  check("the restore is itself recorded", (r.json.history || []).some((h) => h.action === "restore"));

  // ---- a live question that fails the gate after an edit is held, not left live
  r = await api("PUT", `/questions/${q2}`, { token, body: { solution: "320" } });
  check("an edit that breaks a live question is held for review", r.json.held === true && (await get(q2)).status === "under_review", `${r.json.message}`);
  r = await api("PATCH", `/questions/${q2}/approve`, { token });
  check("approving a question that fails the gate is refused", r.status === 409 && (await get(q2)).status === "under_review", `${r.status}`);
  r = await api("PUT", `/questions/${q2}`, { token, body: { solution: good(2).solution, status: "published" } });
  check("fixed, it can go live again", r.status === 200 && (await get(q2)).status === "published", r.json.message || "");
  const jobs = await db.collection("generationjobs").find({ kind: "quality_check", source: "edit" }).toArray();
  check("an edited live question is queued for the AI check", jobs.length >= 1, `${jobs.length}`);

  // ---- delete: in use -> retired; never used -> deleted, with a copy kept
  r = await api("DELETE", `/questions/${q3}`, { token });
  const after3 = await get(q3);
  check("deleting a question a test holds retires it instead", r.json.retired === true && after3 && after3.status === "rejected", r.json.message);
  const paper = await db.collection("tests").findOne({ _id: t.insertedId });
  check("the retired question is out of its test", !paper.questions.map(String).includes(q3));

  r = await api("DELETE", `/questions/${q4}`, { token });
  check("a draft nobody used is deleted", r.status === 200 && !(await get(q4)), r.json.message);
  r = await api("GET", "/quality/deleted", { token });
  const gone = (r.json.deleted || []).find((d) => String(d.question) === q4);
  check("the deleted question is listed with a copy kept", !!gone && /shopkeeper/.test(gone.text || ""));
  r = await api("POST", `/quality/questions/${q4}/restore`, { token, body: { revisionId: String(gone?.revisionId) } });
  const back = await get(q4);
  check("a deleted question can be brought back, held for review", back && back.status === "under_review" && back.subject === "Maths", `${r.status} ${back?.status}`);

  // ---- permanent delete of a question in use needs the confirmation
  r = await api("DELETE", `/questions/${q5}`, { token, body: { permanent: true } });
  check("permanent without the confirmation word only retires", r.json.retired === true && !!(await get(q5)));
  await db.collection("questions").updateOne({ _id: oid(q5) }, { $set: { status: "published" } });
  r = await api("DELETE", `/questions/${q5}`, { token, body: { permanent: true, confirm: "DELETE" } });
  check("with the confirmation it is deleted for good", r.status === 200 && !(await get(q5)), r.json.message);
  check("…and a copy is still kept", (await db.collection("questionrevisions").countDocuments({ question: oid(q5), action: "delete" })) === 1);

  // ---- a question a student has answered is never deleted
  const q6 = String((await db.collection("questions").insertOne(good(6, { status: "draft" }))).insertedId);
  await db.collection("attempts").insertOne({ user: student.insertedId, test: t.insertedId, answers: [{ question: oid(q6), selectedIndex: 1 }] });
  r = await api("DELETE", `/questions/${q6}`, { token, body: { permanent: true, confirm: "DELETE" } });
  check("a question a student answered is retired, never deleted", !!(await get(q6)) && (await get(q6)).status === "rejected", r.json.message);

  // ---- rejection is recorded
  r = await api("PATCH", `/questions/${q1}/reject`, { token, body: { reason: "Wrong key" } });
  r = await api("GET", `/quality/questions/${q1}/history`, { token });
  check("a rejection is recorded in the history", (r.json.history || []).some((h) => h.action === "retire" && /Wrong key/.test(h.note || "")));

  // ---- an applied AI replacement can be undone
  const oldQ = String((await db.collection("questions").insertOne(good(7, { status: "rejected" }))).insertedId);
  const newQ = String((await db.collection("questions").insertOne(good(8))).insertedId);
  const paperB = await db.collection("tests").insertOne({ title: "Paper B", type: "practice", questions: [oid(newQ)], publishStatus: "published", createdAt: new Date() });
  await db.collection("questionrevisions").insertOne({ question: oid(oldQ), action: "replaced", by: "ai", before: { status: "published" }, after: { status: "rejected" }, replacedBy: oid(newQ), createdAt: new Date() });
  const fixId = (await db.collection("qualityfixes").insertOne({ question: oid(oldQ), kind: "replace", replacement: oid(newQ), problems: ["AI doubt"], source: "csv", status: "applied", decidedBy: "ai", decidedAt: new Date(), createdAt: new Date(), updatedAt: new Date() })).insertedId;
  r = await api("POST", `/quality/fixes/${fixId}/undo`, { token });
  const pb = await db.collection("tests").findOne({ _id: paperB.insertedId });
  check("undoing an AI replacement puts the original back in its test", r.status === 200 && String(pb.questions[0]) === oldQ, r.json.message);
  check("…live again, and the replacement retired", (await get(oldQ)).status === "published" && (await get(newQ)).status === "rejected");
  r = await api("POST", `/quality/fixes/${fixId}/undo`, { token });
  check("it cannot be undone twice", r.status === 409);

  // ---- settings and export
  r = await api("PUT", "/quality/settings", { token, body: { mode: "everything" } });
  check("an unknown mode is refused", r.status === 400);
  r = await api("PUT", "/quality/settings", { token, body: { mode: "auto" } });
  r = await api("GET", "/quality/settings", { token });
  check("the mode can be switched to automatic", r.json.mode === "auto", r.json.mode);
  r = await api("GET", "/quality/export?chapter=Percentage", { token });
  check("the bank exports as spreadsheet rows", (r.json.rows || []).length >= 3 && r.json.rows[0].optionA, `${(r.json.rows || []).length}`);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();
  const passed = results.filter((x) => x.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
