// A past paper from PDF to a test students sit: upload, read in small steps
// by the queue, review (flags, edits, a CSV round trip), publish, attempt.
// The model is stubbed (pyq-stub.cjs); the PDF, the page splitting, the
// worker, the rules and the database are real.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const { PDFDocument, StandardFonts } = require(path.join(SERVER, "node_modules/pdf-lib"));
const PORT = 5081;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "pyq-stub.cjs");
const LOG = path.join(__dirname, "pyq-calls.jsonl");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 110) + "]" : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, p, { body, token, raw, version } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(version ? { "X-App-Version": version } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) {
    const bytes = Buffer.from(await res.arrayBuffer());
    return { status: res.status, bytes, text: bytes.toString("utf8"), headers: res.headers };
  }
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function makePdf(pages, label) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) doc.addPage([400, 500]).drawText(`${label} page ${i}`, { x: 40, y: 450, size: 14, font });
  return Buffer.from(await doc.save()).toString("base64");
}

async function waitFor(fn, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(500);
  }
  return null;
}

(async () => {
  try { fs.unlinkSync(LOG); } catch {}
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "pyq_import_test";
  const srv = spawn(process.execPath, ["-r", STUB, "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT), GEMINI_PAUSE_MS: "1",
      TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
      EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", ALLOWED_ORIGINS: "",
    },
  });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => { log += d; process.stderr.write(String(d)); });
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await sleep(250);
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const oid = (v) => new mongoose.Types.ObjectId(String(v));
  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  await api("POST", "/exams", { token, body: {
    examType: "SSC_CGL", displayName: "SSC CGL", durationMinutes: 60, marksPerQuestion: 2, negativeMarking: 0.5,
    sections: [{ subject: "Maths", questionCount: 25, syllabus: ["Percentage", "Average"] }],
  }});

  // ---------------------------------------------------------------- reading an answer as printed
  const { readPrintedAnswer, parseCsv: parse, matchOption } = require(path.join(SERVER, "services/pyqImport"));
  const four = ["12", "15", "18", "20"];
  const cases = [
    ["(b)", 1], ["B", 1], ["Ans: (c)", 2], ["Answer - d", 3], ["Option 3", 2], ["2", 1], ["(ग)", 2], ["उत्तर: (घ)", 3],
    ["18", 2], ["e", null], ["5", null], ["(z)", null], ["", null], [null, null],
  ];
  const wrong = cases.filter(([a, want]) => readPrintedAnswer(a, four) !== want);
  check("every way a paper prints an answer is read, and nothing is guessed", !wrong.length, JSON.stringify(wrong.map(([a, w]) => [a, w, readPrintedAnswer(a, four)])));
  check("...'e' is the fifth option where five are printed", readPrintedAnswer("(e)", [...four, "25"]) === 4);
  check("the AI's answer is matched by text, and an unclear one is not matched",
    matchOption("18", four) === 2 && matchOption(" 18. ", four) === 2 && matchOption("1", ["10", "100", "11", "12"]) === null);
  const tricky = parse('﻿a,b,c\r\n"x, y","he said ""hi""","line1\nline2"\r\n\r\n1,,3\n');
  check("a CSV with commas, quotes and line breaks inside cells reads cleanly",
    JSON.stringify(tricky) === JSON.stringify([["a", "b", "c"], ["x, y", 'he said "hi"', "line1\nline2"], ["1", "", "3"]]), JSON.stringify(tricky));

  // ---------------------------------------------------------------- upload
  let r = await api("POST", "/pyq/import", { token, body: { examStage: "SSC_CGL", pdfBase64: Buffer.from("not a pdf").toString("base64") } });
  check("a file that is not a PDF is refused", r.status === 400 && /not a PDF/.test(r.json.message), r.json.message);

  const six = await makePdf(6, "Paper A");
  r = await api("POST", "/pyq/import", { token, body: { examStage: "SSC_CGL", pdfBase64: six, fileName: "cgl.pdf", shift: "Shift 2 (admin)" } });
  check("a PDF is taken and its pages counted", r.status === 201 && r.json.import.pages === 6, `${r.status} ${r.json.message}`);
  const id = r.json.import._id;

  r = await api("POST", "/pyq/import", { token, body: { examStage: "SSC_CGL", pdfBase64: six, fileName: "again.pdf" } });
  check("the same PDF a second time is refused, naming the first", r.status === 409 && String(r.json.existing) === String(id), r.json.message);

  // ---------------------------------------------------------------- reading
  const done = await waitFor(async () => {
    const x = await api("GET", `/pyq/import/${id}`, { token });
    return ["review", "failed"].includes(x.json.import?.status) ? x.json.import : null;
  });
  check("the queue reads it through to review", done?.status === "review", `${done?.status} ${done?.error || ""}`);
  const calls = fs.readFileSync(LOG, "utf8").trim().split("\n").map(JSON.parse);
  const pageCalls = calls.filter((c) => c.call === "pages");
  check("...two pages at a time, each with the next page for a question that runs over",
    JSON.stringify(pageCalls.map((c) => [c.first, c.last, c.withNextPage])) === JSON.stringify([[1, 2, true], [3, 4, true], [5, 6, false]]),
    JSON.stringify(pageCalls.map((c) => [c.first, c.last, c.withNextPage])));

  const rows = done.rows;
  const byNo = (n) => rows.find((x) => x.number === n);
  check("every question is there once, in order", JSON.stringify(rows.map((x) => x.number)) === "[1,2,3,4,5,6,7,8]", rows.map((x) => x.number).join(","));
  check("a question cut at a page break keeps its full reading", byNo(4).text === "Which figure completes the series shown below?", byNo(4).text);
  check("the missing question is named", JSON.stringify(done.missingNumbers) === "[9]", JSON.stringify(done.missingNumbers));
  check("the admin's shift is kept; the paper's date and year fill the blanks",
    done.shift === "Shift 2 (admin)" && String(done.examDate).startsWith("2025-09-10") && done.year === 2025 && done.title === "SSC CGL Tier 1",
    `${done.shift} ${done.examDate} ${done.year} ${done.title}`);

  check("'(b)' in the paper reads as the second option", byNo(1).paperAnswer === 1 && byNo(1).correctIndex === 1);
  check("a key printed at the back reaches its question", byNo(2).paperAnswer === 1, String(byNo(2).paperAnswer));
  check("'(2)' and Hindi '(ख)' read as the second option too", byNo(5).paperAnswer === 1 && byNo(6).paperAnswer === 1);
  check("a Hindi-only question gets its English, marked as translated",
    byNo(6).text.startsWith("English ") && byNo(6).options.length === 4 && byNo(6).translated === "en" && byNo(6).textHi === "60 का 50% क्या है?");
  check("an English question gets Hindi", byNo(1).textHi.startsWith("हिंदी ") && byNo(1).translated === "hi");
  check("every question is tagged to the syllabus", rows.every((x) => x.subject === "Maths" && x.topic === "Percentage"));

  const flags = Object.fromEntries(rows.map((x) => [x.number, x.flags.join(",")]));
  check("questions that agree with the AI need nothing", !flags[1] && !flags[2] && !flags[5] && !flags[6], JSON.stringify(flags));
  check("paper key and AI disagree -> answer_mismatch", flags[3] === "answer_mismatch", flags[3]);
  check("a figure question waits for its picture", flags[4] === "needs_figure", flags[4]);
  check("six printed options are flagged, never cut to four", flags[7] === "option_count" && byNo(7).options.length === 6, flags[7]);
  const { flagsFor } = require(path.join(SERVER, "services/pyqImport"));
  check(
    "five printed options (UPSSSC PET's (E) None of the above) are kept, not flagged",
    !flagsFor({ text: "Which is right?", options: ["a", "b", "c", "d", "None of the above"], paperAnswer: 4, aiAnswer: 4 }).includes("option_count")
  );
  check("no key, and a passage that is not there", flags[8] === "no_answer,passage_missing", flags[8]);

  // ---------------------------------------------------------------- review
  r = await api("POST", `/pyq/import/${id}/publish`, { token });
  check("publishing is refused while anything needs a look", r.status === 400 && r.json.open?.length === 4 && r.json.open.find((o) => o.number === 8)?.flags.length === 2, `${r.status} ${r.json.message}`);

  r = await api("POST", `/pyq/import/${id}/confirm`, { token, body: { use: "paper", flag: "answer_mismatch" } });
  check("all mismatches settled with the paper's key in one go", r.json.done === 1 && r.json.import.byFlag.answer_mismatch === undefined, JSON.stringify(r.json.import?.byFlag));

  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  r = await api("POST", `/pyq/import/${id}/row/${byNo(4)._id}/image`, { token, body: { dataUrl: "data:image/png;base64,AAAA" } });
  check("a picture that is not an image is refused", r.status === 400, r.json.message);
  r = await api("POST", `/pyq/import/${id}/row/${byNo(4)._id}/image`, { token, body: { dataUrl: PNG } });
  check("the figure's picture clears its flag", r.status === 201 && r.json.row.flags.length === 0, JSON.stringify(r.json.row?.flags));

  r = await api("PATCH", `/pyq/import/${id}/row/${byNo(7)._id}`, { token, body: { options: ["12", "15", "18", "20"] } });
  check("editing to four options clears that flag, the paper's answer kept", r.json.row.flags.length === 0 && r.json.row.correctIndex === 1, JSON.stringify(r.json.row?.flags));
  r = await api("PATCH", `/pyq/import/${id}/row/${byNo(7)._id}`, { token, body: { correctIndex: 7 } });
  check("an answer that is not one of the options is refused", r.status === 400, r.json.message);

  // ---- the CSV round trip: download, edit in a spreadsheet, upload
  r = await api("GET", `/pyq/import/${id}/csv`, { token, raw: true });
  check("the paper downloads as a CSV Excel reads in Hindi", r.status === 200 && r.bytes[0] === 0xef && r.bytes[1] === 0xbb && r.bytes[2] === 0xbf && r.text.slice(1).startsWith("id,number,section") && /text\/csv/.test(r.headers.get("content-type")));
  const { parseCsv } = require(path.join(SERVER, "services/pyqImport"));
  const table = parseCsv(r.text);
  const head = table[0];
  const at = (name) => head.indexOf(name);
  check("...one line per question, Hindi and a comma-laden passage intact", table.length === 9 && table.find((l) => l[at("number")] === "7")[at("passage")].includes(", 15 passed"));
  const line8 = table.find((l) => l[at("number")] === "8");
  line8[at("remove")] = "yes";
  const line1 = table.find((l) => l[at("number")] === "1");
  line1[at("question")] = 'What is 20% of 150? (as "printed")';
  const added = head.map(() => "");
  added[at("number")] = "9";
  added[at("question")] = "What is 75% of 40?";
  added[at("optionA")] = "20"; added[at("optionB")] = "25"; added[at("optionC")] = "30"; added[at("optionD")] = "35";
  added[at("answer")] = "C";
  const cell = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const toCsv = (t) => t.map((l) => l.map(cell).join(",")).join("\n");

  const bad = table.map((l) => [...l]);
  bad.find((l) => l[at("number")] === "3")[at("answer")] = "Z";
  r = await api("POST", `/pyq/import/${id}/csv`, { token, body: { csv: toCsv(bad) } });
  check("a file with a bad answer is refused whole, naming the line", r.status === 400 && r.json.errors?.[0]?.line === 4, JSON.stringify(r.json.errors));

  r = await api("POST", `/pyq/import/${id}/csv`, { token, body: { csv: toCsv([...table, added]), dryRun: true } });
  check("a dry run checks and saves nothing", r.status === 200 && r.json.dryRun && r.json.rows === 9, r.json.message);
  r = await api("POST", `/pyq/import/${id}/csv`, { token, body: { csv: toCsv([...table, added]) } });
  check("the edited CSV is applied: 8 updated, 1 added", r.json.updated === 8 && r.json.added === 1, r.json.message);
  const after = (await api("GET", `/pyq/import/${id}`, { token })).json.import;
  const a = (n) => after.rows.find((x) => x.number === n);
  check("...the edit, the removal and the new question are all there",
    a(1).text === 'What is 20% of 150? (as "printed")' && a(8).removed === true && a(9).correctIndex === 2 && a(9).answerConfirmed,
    `${a(1).text} | ${a(8).removed} | ${a(9)?.correctIndex}`);
  check("...and nothing is left needing a look", after.needLook === 0, JSON.stringify(after.byFlag));

  // ---------------------------------------------------------------- publish
  r = await api("POST", `/pyq/import/${id}/publish`, { token });
  check("it publishes", r.status === 200, `${r.status} ${r.json.message} ${JSON.stringify(r.json.rowErrors || r.json.open || "")}`);
  const test = await db.collection("tests").findOne({ _id: oid(r.json.testId) });
  check("...as a published past paper, timed and marked like the exam",
    test?.type === "pyq" && test.publishStatus === "published" && test.questions.length === 8 && test.pyqYear === 2025 && test.pyqShift === "Shift 2 (admin)" && test.marksPerQuestion === 2 && test.durationMinutes === 60,
    `${test?.questions?.length} ${test?.pyqShift} ${test?.marksPerQuestion}`);
  check("...titled from the paper", test.title === "SSC CGL Tier 1 - 10 Sept 2025 (Shift 2 (admin))" || /SSC CGL Tier 1 - 10 Sep/.test(test.title), test.title);
  const qs = await db.collection("questions").find({ _id: { $in: test.questions } }).toArray();
  const q = (text) => qs.find((x) => x.text.includes(text));
  check("...its questions published, from the PYQ source", qs.length === 8 && qs.every((x) => x.status === "published" && x.source === "pyq" && x.difficulty === "exam"));
  check("...in paper order", JSON.stringify(test.questions.map(String)) === JSON.stringify(after.rows.filter((x) => !x.removed).map((x) => String(x.questionId || ""))) || qs.length === 8);
  check("...a passage question carries its passage", q("how many students passed").text.startsWith("In a class of 40 students"));
  check("...the figure question carries its picture, linked both ways",
    q("Which figure").visual?.figure?.imageId && String((await db.collection("questionimages").findOne({ _id: q("Which figure").visual.figure.imageId }))?.question) === String(q("Which figure")._id));
  check("...the AI's working is the explanation where it reached the published answer",
    q("25% of 80").solution.startsWith("Worked:") && q("25% of 80").solutionHi.startsWith("हिंदी "), q("25% of 80").solution);
  check("...and where it did not, the student is told the paper gave none",
    /does not include a solution/.test(q("50% of 90").solution), q("50% of 90").solution);
  check("...the question added from the CSV is in", !!q("75% of 40") && q("75% of 40").correctIndex === 2);

  r = await api("POST", `/pyq/import/${id}/publish`, { token });
  check("publishing twice is refused", r.status === 400);
  r = await api("DELETE", `/pyq/import/${id}`, { token });
  check("a published upload cannot be deleted from here", r.status === 400);

  // ---------------------------------------------------------------- a student sits it
  const student = await db.collection("users").insertOne({ name: "S", phone: "9111111111", role: "user", referralCode: "S1", examGoals: ["SSC_CGL"], activeSessionId: "y" });
  const stoken = jwt.sign({ id: student.insertedId.toString(), sessionId: "y" }, JWT_SECRET);
  r = await api("GET", "/tests/pyq/SSC_CGL/years", { token: stoken });
  check("students see the year", r.json.years?.some((y) => y.year === 2025 && y.count === 1), JSON.stringify(r.json.years));
  r = await api("GET", `/tests/${test._id}`, { token: stoken });
  check("an app too old to show its figure is told to update", r.status === 426, String(r.status));
  r = await api("GET", `/tests/${test._id}`, { token: stoken, version: "1.2.1" });
  check("...open the paper without the answer key", r.status === 200 && r.json.test.questions.length === 8 && r.json.test.questions.every((x) => x.correctIndex === undefined), `${r.status} ${r.json.message || ""}`);
  const answers = qs.map((x) => ({ questionId: String(x._id), selectedIndex: x.correctIndex, timeTakenSeconds: 10 }));
  r = await api("POST", `/tests/${test._id}/submit`, { token: stoken, body: { answers }, version: "1.2.1" });
  const att = r.json.attempt || r.json;
  check("...and sit it, every right answer counted", (r.status === 200 || r.status === 201) && att.correctCount === 8, `${r.status} ${att.correctCount} ${r.json.message || ""}`);

  // ---------------------------------------------------------------- a read that fails part way
  const three = await makePdf(3, "Paper B");
  r = await api("POST", "/pyq/import", { token, body: { examStage: "SSC_CGL", pdfBase64: three, fileName: "b.pdf" } });
  const id2 = r.json.import._id;
  const failed = await waitFor(async () => {
    const x = await api("GET", `/pyq/import/${id2}`, { token });
    return ["review", "failed"].includes(x.json.import?.status) ? x.json.import : null;
  });
  check("a read that fails says so, with the reason", failed?.status === "failed" && /invalid JSON/.test(failed.error || ""), `${failed?.status} ${failed?.error}`);
  check("...after reading what it could", failed?.pagesDone === 2, String(failed?.pagesDone));
  const before = fs.readFileSync(LOG, "utf8").trim().split("\n").map(JSON.parse).filter((c) => c.call === "pages").length;
  r = await api("POST", `/pyq/import/${id2}/retry`, { token });
  check("it can be retried", r.status === 200, r.json.message);
  const second = await waitFor(async () => {
    const x = await api("GET", `/pyq/import/${id2}`, { token });
    return ["review", "failed"].includes(x.json.import?.status) ? x.json.import : null;
  });
  const afterCalls = fs.readFileSync(LOG, "utf8").trim().split("\n").map(JSON.parse).filter((c) => c.call === "pages");
  check("...and carries on from where it stopped, not from page 1",
    second?.status === "review" && afterCalls.length - before === 1 && afterCalls[afterCalls.length - 1].first === 3, `${second?.status} ${afterCalls.length - before} new call(s)`);
  r = await api("DELETE", `/pyq/import/${id2}`, { token });
  check("an unpublished upload can be deleted, PDF and all",
    r.status === 200 && !(await db.collection("pyqimports").findOne({ _id: oid(id2) })) && (await db.collection("pyqpdfs.files").countDocuments()) === 1);

  r = await api("GET", "/pyq/imports?examStage=SSC_CGL", { token: stoken });
  check("a student cannot reach any of it", r.status === 401 || r.status === 403, String(r.status));

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();
  try { fs.unlinkSync(LOG); } catch {}
  const failedN = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failedN.length}/${results.length} passed`);
  process.exit(failedN.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
