// Chart (Data Interpretation) and figure questions, end to end, and the
// recruitment-notice (vacancy) mock series.
//
//  - The cross-checks: a DI question whose marked answer the chart does not
//    give, or a figure question whose answer the rule does not give, never
//    reaches the bank.
//  - A figure question keeps its test from being published until its picture
//    is uploaded; the Images pending page has the prompt and a reference
//    drawing for it.
//  - Apps before 1.2.0 never see a test with charts or figures; 1.2.0 gets
//    the chart data and the picture's id, never the figure spec (which would
//    give the answer away).
//  - A vacancy's mocks follow its own syllabus and show up under Upcoming or
//    Previous.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const V = require(path.join(SERVER, "services/visuals"));
const { buildVisualQuestions } = require(path.join(SERVER, "services/visualGenerator"));
const PORT = 5093;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "mock-stub.cjs");
const CALLS = path.join(__dirname, "gen-calls.jsonl");
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, p, { body, token, version } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(version ? { "X-App-Version": version } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  const type = res.headers.get("content-type") || "";
  if (type.includes("json")) {
    try { json = await res.json(); } catch {}
  }
  return { status: res.status, json, type, headers: res.headers };
}

async function drainQueue(token) {
  for (let i = 0; i < 90; i++) {
    const s = await api("GET", "/generation/status", { token });
    if (s.json.counts?.queued === 0 && s.json.counts?.running === 0) return;
    await sleep(1000);
  }
}

(async () => {
  // ================= the checks themselves, no server =================
  const chart = V.normaliseChart({
    type: "bar", title: "Production", unit: "tonnes",
    categories: ["2019", "2020", "2021"], series: [{ name: "Wheat", values: [200, 250, 300] }, { name: "Rice", values: [150, 150, 225] }],
  });
  check("a formula is worked out from the chart",
    V.evaluateFormula(`pct(v("Wheat","2020") - v("Wheat","2019"), v("Wheat","2019"))`, chart) === 25 &&
      V.evaluateFormula(`cat("2021")`, chart) === 525 && V.evaluateFormula(`avg("Rice")`, chart) === 175);
  let threw = "";
  try { V.evaluateFormula(`require("fs")`, chart); } catch (e) { threw = e.message; }
  check("...and nothing but arithmetic runs in it", /unknown function/.test(threw), threw);
  check("a DI answer the chart gives is accepted",
    V.checkChartAnswer({ options: ["20%", "25%", "30%", "35%"], correctIndex: 1, formula: `pct(v("Wheat","2020")-v("Wheat","2019"),v("Wheat","2019"))` }, chart).ok === true);
  check("a DI answer the chart does not give is refused",
    V.checkChartAnswer({ options: ["20%", "25%", "30%", "35%"], correctIndex: 0, formula: `pct(v("Wheat","2020")-v("Wheat","2019"),v("Wheat","2019"))` }, chart).ok === false);
  check("...and so is one where two options are the same answer",
    V.checkChartAnswer({ options: ["3:4", "0.75", "4:5", "1:2"], correctIndex: 0, formula: `v("Rice","2019")/v("Wheat","2019")` }, chart).ok === false);
  check("rounded options are read the way they are written",
    V.checkChartAnswer({ options: ["33.33%", "33.3%", "30%", "40%"], correctIndex: 0, formula: `pct(1, 3)` }, chart).ok === false &&
      V.checkChartAnswer({ options: ["33.33%", "34%", "30%", "40%"], correctIndex: 0, formula: `pct(1, 3)` }, chart).ok === true);
  let bad = "";
  try { V.normaliseChart({ type: "bar", categories: ["a", "b"], series: [{ name: "x", values: [1] }] }); } catch (e) { bad = e.message; }
  check("a chart whose numbers do not line up is refused", /1 values for 2 categories/.test(bad), bad);

  const p1 = { elements: [{ shape: "arrow", row: 1, col: 1, fill: "black", rotate: 0 }, { shape: "square", row: 3, col: 3, fill: "striped" }] };
  const step = (p) => V.rotatePanel(p, 90, 3);
  const fig = {
    layout: "series", grid: 3, rule: { type: "rotate", by: 90 },
    question: [p1, step(p1), step(step(p1))],
    options: [V.mirrorPanel(p1, 3), step(step(step(p1))), p1, V.waterPanel(p1, 3)],
  };
  const spec = V.normaliseFigure(fig);
  check("a figure answer the rule gives is accepted", V.checkFigureAnswer(spec, 1).ok === true);
  check("...one it does not give is refused, naming the right option", V.checkFigureAnswer(spec, 2).reason === "the rule gives option B, not C",
    V.checkFigureAnswer(spec, 2).reason);
  check("a series that does not follow its own rule is refused",
    V.checkFigureAnswer(V.normaliseFigure({ ...fig, question: [p1, p1, step(p1)] }), 1).ok === false);
  check("a mirror image is worked out",
    V.checkFigureAnswer(V.normaliseFigure({ layout: "mirror", grid: 3, question: [p1], options: [p1, V.mirrorPanel(p1, 3), step(p1), V.waterPanel(p1, 3)] }), 1).ok === true);
  check("an odd-one-out is left to the admin's eye, not guessed",
    V.checkFigureAnswer(V.normaliseFigure({ layout: "odd_one_out", grid: 3, question: [], options: [p1, step(p1), V.mirrorPanel(p1, 3), V.waterPanel(p1, 3)] }), 0).ok === null);
  let dup = "";
  try { V.normaliseFigure({ ...fig, options: [p1, p1, step(p1), V.waterPanel(p1, 3)] }); } catch (e) { dup = e.message; }
  check("two identical answer figures are refused", /same figure/.test(dup), dup);

  const prompt = V.figurePrompt(spec);
  check("the image prompt names every box and every shape's exact cell and direction",
    /Box "1"/.test(prompt) && /Box "\(D\)"/.test(prompt) && /row 1, column 1 \(top-left\)/.test(prompt) && /pointing straight up/.test(prompt) &&
      /Do NOT draw the grid lines/.test(prompt));
  const svg = V.figureSvg(spec);
  check("a reference drawing is made from the same spec", svg.startsWith("<svg") && (svg.match(/<rect x=/g) || []).length >= 8);

  const built = buildVisualQuestions("chart", {
    chart: { type: "line", title: "t", categories: ["x", "y"], series: [{ name: "S", values: [10, 30] }] },
    questions: [
      { text: "Total of S?", options: ["40", "30", "20", "50"], correctIndex: 0, formula: `sum("S")`, solution: "10 + 30 = 40" },
      { text: "Average of S?", options: ["25", "20", "15", "30"], correctIndex: 0, formula: `avg("S")`, solution: "40 / 2 = 20" },
    ],
  }, { examType: "X", subject: "Maths", topic: "DI", difficulty: "easy" });
  check("of a DI set, only the questions the chart answers are kept",
    built.questions.length === 1 && built.rejected.length === 1 && /chart gives 20/.test(built.rejected[0].reason), JSON.stringify(built.rejected));
  check("...and the kept one carries its chart", built.questions[0].visual?.kind === "chart" && built.questions[0].visual.chart.series[0].values.join() === "10,30");

  // ================= through the server =================
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "visuals_test";
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
  fs.writeFileSync(CALLS, "");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const oid = (id) => new mongoose.Types.ObjectId(String(id));
  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9000000000", role: "admin", referralCode: "ADM" });
  const token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);
  const student = await db.collection("users").insertOne({
    name: "S", phone: "9000000001", role: "student", referralCode: "STU", activeSessionId: "s1", examGoals: ["RRB_GROUP_D"],
    subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 864e5 * 30),
  });
  const stoken = jwt.sign({ id: student.insertedId.toString(), sessionId: "s1" }, JWT_SECRET);

  await api("POST", "/exams", { token, body: {
    examType: "RRB_GROUP_D", displayName: "RRB Group D", durationMinutes: 60,
    sections: [
      { subject: "Maths", questionCount: 10, difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Percentage" }, { topic: "Data Interpretation" }] },
      { subject: "Reasoning", questionCount: 6, difficultyMix: { easy: 100, medium: 0, hard: 0 }, syllabus: [{ topic: "Coding" }] },
    ],
  }});
  await api("POST", "/subjects", { token, body: { name: "Maths", displayOrder: 1, chapters: [
    { name: "Percentage", topics: ["Percentage"], exams: ["RRB_GROUP_D"] },
    { name: "Data Interpretation", topics: ["Bar graph"], exams: ["RRB_GROUP_D"], visual: "chart" },
  ] } });
  await api("POST", "/subjects", { token, body: { name: "Reasoning", displayOrder: 2, chapters: [
    { name: "Coding", topics: ["Coding"], exams: ["RRB_GROUP_D"] },
    { name: "Figure Series", topics: ["Figure series"], exams: ["RRB_GROUP_D"], visual: "figure" },
  ] } });

  // ---- a DI practice test
  let r = await api("POST", "/exam-series/practice/generate", { token, body: { subject: "Maths", chapter: "Data Interpretation", difficulty: "easy" } });
  check("a Data Interpretation practice test is built", r.status === 201 && r.json.test?.questionCount === 20, `${r.status} ${r.json.message}`);
  const diTestId = r.json.test?._id;
  const diQs = await db.collection("questions").find({ _id: { $in: (await db.collection("tests").findOne({ _id: oid(diTestId) })).questions } }).toArray();
  check("...every question carrying its chart", diQs.every((q) => q.visual?.kind === "chart" && q.visual.chart.series.length === 1), `${diQs.filter((q) => q.visual?.kind === "chart").length}/${diQs.length}`);
  // (The stub returns one wrongly-marked question per chart; the real check drops it.)
  check("...and the wrongly-marked ones thrown out before they reached the bank", !diQs.some((q) => /grow from 2019 to 2020/.test(q.text)));
  check("...which the visual generator was asked for, not the plain one",
    fs.readFileSync(CALLS, "utf8").split("\n").filter(Boolean).map(JSON.parse).some((c) => c.visual === "chart"));
  r = await api("PATCH", `/exam-series/practice/${diTestId}/publish`, { token, body: { isFree: true } });
  check("a chart test publishes straight away - nothing to upload", r.status === 200, `${r.status} ${r.json.message}`);
  check("...and is marked as holding pictures", (await db.collection("tests").findOne({ _id: oid(diTestId) })).hasVisuals === true);

  r = await api("GET", "/tests/practice-series/Maths/Data%20Interpretation", { token: stoken });
  check("an app before 1.2.0 does not list it", r.status === 200 && r.json.tests.length === 0, `${r.json.tests?.length}`);
  r = await api("GET", "/tests/practice-series/Maths/Data%20Interpretation", { token: stoken, version: "1.2.0" });
  check("1.2.0 does", r.json.tests?.length === 1);
  r = await api("GET", `/tests/${diTestId}`, { token: stoken });
  check("opening it on an old app says to update", r.status === 426 && r.json.code === "UPDATE_REQUIRED", `${r.status} ${r.json.code}`);
  r = await api("GET", `/tests/${diTestId}`, { token: stoken, version: "1.2.0" });
  const sq = r.json.test?.questions?.[0];
  check("1.2.0 gets the chart with each question", r.status === 200 && sq?.visual?.kind === "chart" && sq.visual.chart.categories.length === 3,
    `${r.status} ${JSON.stringify(sq?.visual || {}).slice(0, 80)}`);
  check("...and still no answer key", sq && sq.correctIndex === undefined && sq.solution === undefined);

  // ---- a figure practice test
  r = await api("POST", "/exam-series/practice/generate", { token, body: { subject: "Reasoning", chapter: "Figure Series", difficulty: "easy" } });
  check("a figure practice test is built", r.status === 201 && r.json.test?.questionCount === 20, `${r.status} ${r.json.message}`);
  const figTestId = r.json.test?._id;
  const figTest = await db.collection("tests").findOne({ _id: oid(figTestId) });
  const figQs = await db.collection("questions").find({ _id: { $in: figTest.questions } }).toArray();
  check("...its answers checked in code from the rule", figQs.every((q) => q.visual?.figure?.answerCheck === "checked" && q.correctIndex === 0),
    figQs.map((q) => q.correctIndex).join(""));
  check("...the wrongly-marked one thrown out", figQs.every((q) => q.correctIndex === 0));
  check("...with the options named as figures", figQs[0].options.join() === "Figure (A),Figure (B),Figure (C),Figure (D)");

  r = await api("PATCH", `/exam-series/practice/${figTestId}/publish`, { token, body: { isFree: true } });
  check("it cannot be published while its pictures are missing", r.status === 400 && r.json.imagesPending === 20, `${r.status} ${r.json.message}`);

  r = await api("GET", "/question-images/figures", { token });
  check("the Images pending page lists them", r.status === 200 && r.json.pendingCount === 20 && r.json.questions.length === 20, `${r.json.pendingCount}`);
  const card = r.json.questions[0];
  check("...each with a precise prompt to copy", /Create ONE image/.test(card.prompt) && /row \d, column \d/.test(card.prompt));
  check("...a reference drawing to compare against", card.svg.startsWith("<svg"));
  check("...and the test it is holding up", card.tests.some((t) => String(t._id) === String(figTestId)));
  r = await api("GET", "/question-images/figures", { token: stoken });
  check("students cannot see that page", r.status === 403, `${r.status}`);

  r = await api("POST", `/question-images/question/${card._id}`, { token, body: { dataUrl: "data:image/png;base64," + Buffer.from("not an image").toString("base64") } });
  check("something that is not a picture is refused", r.status === 400, `${r.status} ${r.json.message}`);
  r = await api("POST", `/question-images/question/${card._id}`, { token, body: { dataUrl: PNG, width: 1, height: 1 } });
  check("a picture is uploaded", r.status === 201 && r.json.question?.imageId, `${r.status} ${r.json.message}`);
  const firstImage = r.json.question.imageId;
  r = await api("POST", `/question-images/question/${card._id}`, { token, body: { dataUrl: PNG } });
  check("...and can be replaced, the old one removed", r.status === 201 && r.json.message === "Picture replaced" &&
    !(await db.collection("questionimages").findOne({ _id: oid(firstImage) })));
  const imageId = r.json.question.imageId;

  const img = await fetch(`${BASE}/question-images/${imageId}`);
  const bytes = Buffer.from(await img.arrayBuffer());
  check("the picture is served to the app without a login", img.status === 200 && img.headers.get("content-type") === "image/png" && bytes[1] === 0x50);
  check("...cached for good, since a new picture gets a new address", /immutable/.test(img.headers.get("cache-control") || ""));

  // The rest of the test's pictures.
  for (const q of figQs) {
    if (String(q._id) === String(card._id)) continue;
    await api("POST", `/question-images/question/${q._id}`, { token, body: { dataUrl: PNG } });
  }
  r = await api("GET", "/question-images/figures", { token });
  check("once all are in, nothing is pending", r.json.pendingCount === 0, `${r.json.pendingCount}`);
  r = await api("PATCH", `/exam-series/practice/${figTestId}/publish`, { token, body: { isFree: true } });
  check("...and the test publishes", r.status === 200, `${r.status} ${r.json.message}`);

  r = await api("GET", `/tests/${figTestId}`, { token: stoken, version: "1.2.0" });
  const fq = r.json.test?.questions?.[0];
  check("the app gets the picture's id", !!fq?.visual?.figure?.imageId, JSON.stringify(fq?.visual || {}).slice(0, 100));
  check("...and never the figure spec, which would give the answer away", fq && !fq.visual?.figure?.spec);

  r = await api("DELETE", `/question-images/question/${card._id}`, { token });
  check("a picture in a published test cannot simply be removed", r.status === 400, r.json.message);

  // ---- a vacancy and its mock series
  r = await api("POST", "/vacancies", { token, body: { name: "RRB Group D 2025", year: 2025, examType: "NOPE" } });
  check("a vacancy needs a real exam pattern and a series name", r.status === 400 && /exam pattern/.test(r.json.message) && /series name/.test(r.json.message), r.json.message);
  r = await api("POST", "/vacancies", { token, body: {
    name: "RRB Group D 2025", year: 2025, seriesName: "RRB Group D 2025 Mock Series", examType: "RRB_GROUP_D", status: "upcoming",
    notificationUrl: "https://indianrailways.gov.in",
    syllabus: [{ subject: "Maths", topics: ["Simplification", { topic: "Data Interpretation", subTopics: [] }] }],
  } });
  check("a vacancy is added with its own syllabus", r.status === 201 && r.json.vacancy?.syllabus?.[0]?.topics?.length === 2, `${r.status} ${r.json.message}`);
  const vacancyId = r.json.vacancy?._id;
  r = await api("POST", "/vacancies", { token, body: { name: "x", year: 2025, seriesName: "x", examType: "RRB_GROUP_D", syllabus: [{ subject: "History", topics: ["x"] }] } });
  check("...a syllabus section the paper does not have is refused", r.status === 400 && /History/.test(r.json.message), r.json.message);

  fs.writeFileSync(CALLS, "");
  r = await api("POST", `/vacancies/${vacancyId}/build-mock`, { token, body: {} });
  check("the admin queues a mock for the vacancy", r.status === 201 && r.json.queued === 1, r.json.message);
  await drainQueue(token);
  const vmock = await db.collection("tests").findOne({ vacancy: oid(vacancyId) });
  check("the mock is built in the vacancy's own series", vmock?.title === "RRB Group D 2025 Mock Series - Mock #1" && vmock.questions.length === 16,
    `${vmock?.title} ${vmock?.questions?.length}`);
  const calls = fs.readFileSync(CALLS, "utf8").split("\n").filter(Boolean).map(JSON.parse);
  const mathsCalls = calls.filter((c) => c.subject === "Maths" && !c.visual);
  check("...asking Maths from the notification's syllabus, not the pattern's",
    mathsCalls.length && mathsCalls.every((c) => c.syllabusTopics.some((t) => (t.topic || t) === "Simplification")) &&
      !mathsCalls.some((c) => c.syllabusTopics.some((t) => (t.topic || t) === "Percentage")),
    JSON.stringify(mathsCalls.map((c) => c.syllabusTopics)));
  check("...with a chart set, because that syllabus names Data Interpretation", calls.some((c) => c.visual === "chart"));
  check("...while Reasoning, which the notice leaves out, follows the pattern",
    calls.filter((c) => c.subject === "Reasoning").every((c) => c.syllabusTopics.some((t) => (t.topic || t) === "Coding")));

  r = await api("PATCH", `/exam-series/mock/${vmock._id}/publish`, { token, body: { isFree: true } });
  check("the vacancy mock publishes", r.status === 200, `${r.status} ${r.json.message}`);

  r = await api("GET", "/vacancies/series", { token: stoken, version: "1.2.0" });
  check("the app gets it under Upcoming exam mock series", r.status === 200 && r.json.upcoming.length === 1 && r.json.upcoming[0].tests.length === 1 &&
    r.json.upcoming[0].examName === "RRB Group D" && r.json.upcoming[0].year === 2025 && r.json.previous.length === 0, JSON.stringify(r.json).slice(0, 160));
  r = await api("GET", "/vacancies/series", { token: stoken });
  check("...an older app is not handed a mock with a chart in it", r.json.upcoming[0].tests.length === 0);

  // ---- the exam's own mock list, cut by notice: new on top, held below
  r = await api("GET", "/tests/exam-series/RRB_GROUP_D", { token: stoken, version: "1.2.1" });
  check("the exam's mock list groups the mocks under their notice", r.status === 200 && r.json.groups?.[0]?.kind === "upcoming" &&
    r.json.groups[0].title === "RRB Group D 2025 Mock Series" && r.json.groups[0].tests.length === 1 && r.json.tests.length === 1,
    JSON.stringify(r.json.groups || r.json).slice(0, 200));
  r = await api("POST", "/vacancies", { token, body: { name: "RRB Group D 2026", year: 2026, seriesName: "RRB Group D 2026 Mock Series", examType: "RRB_GROUP_D", status: "upcoming" } });
  const newerId = r.json.vacancy?._id;
  await api("PATCH", `/vacancies/${vacancyId}`, { token, body: { examDate: "2025-11-20" } });
  r = await api("GET", "/tests/exam-series/RRB_GROUP_D", { token: stoken, version: "1.2.1" });
  check("a new notice goes on top, and the one whose exam date has passed drops below as held",
    r.json.groups?.map((g) => `${g.kind}:${g.year}:${g.tests.length}`).join(",") === "upcoming:2026:0,previous:2025:1",
    r.json.groups?.map((g) => `${g.kind}:${g.year}:${g.tests.length}`).join(","));
  r = await api("GET", "/vacancies/series", { token: stoken, version: "1.2.1" });
  check("...the same in the series list", r.json.upcoming.map((v) => v.year).join() === "2026" && r.json.previous.map((v) => v.year).join() === "2025");
  r = await api("GET", "/vacancies", { token });
  check("...and the admin is told it now shows as a previous exam", r.json.vacancies.find((v) => v._id === vacancyId)?.shownAs === "previous");
  await api("DELETE", `/vacancies/${newerId}`, { token });
  await api("PATCH", `/vacancies/${vacancyId}`, { token, body: { examDate: null } });

  await api("PATCH", `/vacancies/${vacancyId}`, { token, body: { status: "previous" } });
  r = await api("GET", "/vacancies/series", { token: stoken, version: "1.2.0" });
  check("set to Previous, it moves to Previous exam mock series", r.json.upcoming.length === 0 && r.json.previous.length === 1);
  await api("PATCH", `/vacancies/${vacancyId}`, { token, body: { status: "hidden" } });
  r = await api("GET", "/vacancies/series", { token: stoken, version: "1.2.0" });
  check("hidden, it shows nowhere", r.json.upcoming.length === 0 && r.json.previous.length === 0);
  r = await api("GET", "/tests/exam-series/RRB_GROUP_D", { token: stoken, version: "1.2.1" });
  check("...not even in the exam's mock list", r.json.tests.length === 0 && r.json.groups.length === 0, JSON.stringify(r.json).slice(0, 120));
  r = await api("DELETE", `/vacancies/${vacancyId}`, { token });
  check("a vacancy with mocks cannot be deleted", r.status === 400, r.json.message);

  r = await api("GET", "/vacancies", { token });
  check("the admin list counts its mocks", r.json.vacancies?.[0]?.mocks?.published === 1, JSON.stringify(r.json.vacancies?.[0]?.mocks));

  // ---- the old app's daily and chapter tests never carry pictures
  r = await api("POST", "/subjects/chapter-test", { token: stoken, body: { subject: "Maths", chapter: "Data Interpretation" } });
  check("an on-the-spot chapter test leaves charts out", r.status === 400 && /still being prepared/.test(r.json.message), `${r.status} ${r.json.message}`);

  // ---- mocks made before vacancies existed join a series
  await db.collection("tests").insertMany([1, 2].map((n) => ({
    title: `RRB Group D - Mock #${n}`, type: "full_mock", examType: "RRB_GROUP_D", examStage: "RRB_GROUP_D", seriesNumber: n,
    questions: [], durationMinutes: 60, publishStatus: "published", isFree: true,
  })));
  r = await api("POST", `/vacancies/${vacancyId}/adopt-mocks`, { token });
  const adopted = await db.collection("tests").find({ vacancy: oid(vacancyId) }).sort({ seriesNumber: 1 }).toArray();
  check("older mocks are brought into the vacancy's series", r.status === 200 && r.json.adopted === 2 && adopted.length === 3, `${r.status} ${r.json.message}`);
  check("...renamed with the series name, numbered after the one already there",
    adopted.map((t) => t.title).join(" | ") === "RRB Group D 2025 Mock Series - Mock #1 | RRB Group D 2025 Mock Series - Mock #2 | RRB Group D 2025 Mock Series - Mock #3",
    adopted.map((t) => t.title).join(" | "));
  check("...and still published", adopted.every((t) => t.publishStatus === "published"));
  r = await api("POST", `/vacancies/${vacancyId}/adopt-mocks`, { token });
  check("...a second press finds nothing left to move", r.json.adopted === 0, r.json.message);

  // ---- app 1.2.0: the exam list comes from the server
  r = await api("GET", "/exams/catalog");
  check("the exam list is public, for the sign-up screen", r.status === 200 && r.json.exams.some((e) => e.examType === "RRB_GROUP_D" && e.name === "RRB Group D"),
    JSON.stringify(r.json).slice(0, 120));
  r = await api("PATCH", "/auth/profile", { token: stoken, body: { examGoals: ["NOT_AN_EXAM"] } });
  check("Profile refuses an exam that does not exist", r.status === 400 && /Unknown exam/.test(r.json.message), r.json.message);
  r = await api("PATCH", "/auth/profile", { token: stoken, body: { examGoals: ["RRB_GROUP_D"] } });
  check("...and saves one that does", r.status === 200, `${r.status} ${r.json.message || ""}`);

  const passed = results.filter((x) => x.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  if (fs.existsSync(CALLS)) fs.unlinkSync(CALLS);
  await mongoose.disconnect();
  srv.kill();
  await mem.stop();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
