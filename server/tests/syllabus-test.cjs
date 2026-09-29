// Checks that the syllabus an admin types on an exam pattern actually
// reaches the question generator - and that a long syllabus is covered
// across batches instead of the same few topics every time.
// Real server, throwaway in-memory MongoDB, Gemini stubbed.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const CALLS = path.join(__dirname, "gen-calls.jsonl");
const PORT = 5058;
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
const calls = () =>
  (fs.existsSync(CALLS) ? fs.readFileSync(CALLS, "utf8") : "").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

const MATHS_SYLLABUS = [
  "Number System", "Percentage", "Profit and Loss", "Average", "Ratio and Proportion",
  "Simple Interest", "Compound Interest", "Time and Work", "Time Speed Distance", "Mensuration",
  "Algebra", "Trigonometry", "Geometry", "Data Interpretation", "LCM and HCF",
  "Simplification", "Mixture and Alligation", "Pipes and Cisterns", "Partnership", "Probability",
];

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "syllabus_test";
  if (fs.existsSync(CALLS)) fs.unlinkSync(CALLS);
  const srv = spawn(process.execPath, ["-r", path.join(__dirname, "mock-stub.cjs"), "server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT), GEMINI_PAUSE_MS: "1", GEMINI_API_KEY: "",
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
  const admin = await db.collection("users").insertOne({ name: "Admin", phone: "9999999999", role: "admin", referralCode: "ADM" });
  token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  // ---- an exam pattern carrying a level + syllabus, exactly as the admin form sends it
  const EXAM_LEVEL = "10th-pass level Army entrance exam. Basic maths, science and GK. NOT graduate or UPSC level.";
  let r = await api("POST", "/exams", {
    examType: "AGNIVEER", displayName: "Agniveer Army GD", durationMinutes: 60, negativeMarking: 0.25,
    examLevel: EXAM_LEVEL,
    sections: [
      { subject: "Maths", questionCount: 30, difficultyMix: { easy: 40, medium: 40, hard: 20 }, syllabus: MATHS_SYLLABUS },
      { subject: "GK", questionCount: 10, difficultyMix: { easy: 50, medium: 50, hard: 0 }, syllabus: ["Indian History", "Geography"] },
    ],
  });
  check("pattern saved with level + syllabus", r.status === 200 && r.json.pattern.examLevel === EXAM_LEVEL && r.json.pattern.sections[0].syllabus.length === 20, `${r.status}`);

  r = await api("GET", "/exams?includeInactive=1");
  const saved = r.json.patterns.find((p) => p.examType === "AGNIVEER");
  check("syllabus survives a reload", saved?.sections?.[0]?.syllabus?.length === 20 && saved.sections[1].syllabus.length === 2);

  // ---- generating a mock must hand that syllabus to the generator
  fs.writeFileSync(CALLS, "");
  r = await api("POST", "/exam-series/AGNIVEER/generate-mock");
  check("mock generated", r.status === 201, `${r.status} ${r.json.message || ""}`);

  const gen = calls();
  check("every generator call got the exam's level", gen.length > 0 && gen.every((c) => c.examLevel === EXAM_LEVEL), `${gen.length} calls`);
  check("every call got syllabus topics", gen.every((c) => c.syllabusTopics.length > 0));
  check("a call is given a workable slice, not all 20 topics", gen.every((c) => c.syllabusTopics.length <= 8));
  check("GK section gets GK topics, not Maths ones",
    gen.filter((c) => c.subject === "GK").every((c) => c.syllabusTopics.every((t) => ["Indian History", "Geography"].includes(t.topic))),
    JSON.stringify(gen.filter((c) => c.subject === "GK").map((c) => c.syllabusTopics)));
  check("a short syllabus is passed whole", gen.filter((c) => c.subject === "GK").every((c) => c.syllabusTopics.length === 2));

  // the whole point of rotating: batches must not repeat the same topics
  const mathsCalls = gen.filter((c) => c.subject === "Maths");
  const firstTwo = mathsCalls.slice(0, 2).map((c) => c.syllabusTopics.map((t) => t.topic).join("|"));
  check("consecutive batches ask about different topics", mathsCalls.length >= 2 && firstTwo[0] !== firstTwo[1], firstTwo.join("  ||  "));
  const covered = new Set(mathsCalls.flatMap((c) => c.syllabusTopics.map((t) => t.topic)));
  check("a full mock covers most of the syllabus", covered.size >= 16, `${covered.size}/20 topics used across ${mathsCalls.length} batches`);

  // ---- and what actually lands ON the question
  // This suite checked what was handed TO the generator and never what came
  // back out, which is how every mock question ended up with a 330-character
  // mongoose subdocument in its topic field: the model s answer was compared
  // against an array of objects, so it never matched and an object was
  // written in its place. topicStats is keyed on subject|topic, so weak-topic
  // detection and every recommendation built on it were being fed that.
  const built = await db.collection("questions").find({ examType: "AGNIVEER" }).toArray();
  check("a generated question carries a topic NAME, not a subdocument",
    built.length > 0 && built.every((q) => typeof q.topic === "string" && !/subTopics|ObjectId/.test(q.topic)),
    built.find((q) => /subTopics/.test(q.topic || ""))?.topic?.slice(0, 60) || `${built.length} questions clean`);
  const syllabusNames = new Set(
    saved.sections.flatMap((sec) => (sec.syllabus || []).map((t) => (typeof t === "string" ? t : t.topic)))
  );
  check("...and it is one of the topics the exam actually asks about",
    built.every((q) => syllabusNames.has(q.topic)),
    [...new Set(built.map((q) => q.topic))].filter((t) => !syllabusNames.has(t)).slice(0, 3).join(" | ") || "all match");
  check("...and the topic is short enough to be a name at all",
    built.every((q) => (q.topic || "").length < 80),
    `longest ${Math.max(...built.map((q) => (q.topic || "").length))} chars`);

  // ---- topping a mock up gets the syllabus too
  const empty = await api("POST", "/exam-series/AGNIVEER/create-empty-mock");
  fs.writeFileSync(CALLS, "");
  await api("POST", `/exam-series/mock/${empty.json.test._id}/add-questions`, { subject: "Maths", count: 5 });
  const addCalls = calls();
  check("add-questions passes level + syllabus", addCalls.length === 1 && addCalls[0].examLevel === EXAM_LEVEL && addCalls[0].syllabusTopics.length > 0,
    JSON.stringify(addCalls.map((c) => c.syllabusTopics.length)));

  // ---- an exam with no syllabus still works, just ungrounded
  await api("POST", "/exams", {
    examType: "SSC_MTS", displayName: "SSC MTS", durationMinutes: 60,
    sections: [{ subject: "GK", questionCount: 6, difficultyMix: { easy: 50, medium: 50, hard: 0 } }],
  });
  fs.writeFileSync(CALLS, "");
  r = await api("POST", "/exam-series/SSC_MTS/generate-mock");
  const noSyll = calls();
  check("exam without a syllabus still generates", r.status === 201 && noSyll.length > 0, `${r.status}`);
  check("and is simply sent no topics", noSyll.every((c) => c.syllabusTopics.length === 0));

  // ---- practice tests send the chapter's topics as its syllabus
  await db.collection("subjects").insertOne({
    name: "Maths", icon: "📐", isActive: true, displayOrder: 1,
    chapters: [{ name: "Percentage", topics: ["Basics", "Successive change", "Profit link"] }],
  });
  fs.writeFileSync(CALLS, "");
  r = await api("POST", "/exam-series/practice/generate", { subject: "Maths", chapter: "Percentage", topics: ["Basics", "Successive change", "Profit link"], difficulty: "easy" });
  const practiceCalls = calls();
  check("practice generation sends the chapter's topics", r.status === 201 && practiceCalls[0]?.syllabusTopics?.length === 3, JSON.stringify(practiceCalls[0]?.syllabusTopics));
  check("practice topics are plain strings, handled fine", practiceCalls[0]?.syllabusTopics?.every((t) => typeof t === "string"));

  // ================= POST-WISE EXAMS + SUB-TOPICS =================

  // Two posts of the same exam: same family, different papers.
  const gd = await api("POST", "/exams", {
    examType: "AGNIVEER_GD", displayName: "Agniveer Army GD", examGroup: "Agniveer", postName: "Army GD",
    durationMinutes: 60, examLevel: "10th-pass level Army entrance.",
    sections: [{ subject: "GK", questionCount: 5, difficultyMix: { easy: 100, medium: 0, hard: 0 },
      syllabus: ["Indian History: freedom movement, 1857", "Sports"] }],
  });
  const tech = await api("POST", "/exams", {
    examType: "AGNIVEER_TECH", displayName: "Agniveer Army Technical", examGroup: "Agniveer", postName: "Technical",
    durationMinutes: 60, examLevel: "12th-pass PCM level Army entrance.",
    sections: [{ subject: "Physics", questionCount: 5, difficultyMix: { easy: 100, medium: 0, hard: 0 },
      syllabus: [{ topic: "Motion", subTopics: ["laws of motion", "projectile"] }] }],
  });
  check("two posts of one exam can both exist", gd.status === 200 && tech.status === 200 && gd.json.pattern._id !== tech.json.pattern._id);
  check("exam group and post are stored", gd.json.pattern.examGroup === "Agniveer" && gd.json.pattern.postName === "Army GD" && tech.json.pattern.postName === "Technical");

  // Typed as one line, stored as a topic with its sub-topics.
  const hist = gd.json.pattern.sections[0].syllabus[0];
  check('"Topic: a, b" is split into topic + sub-topics', hist.topic === "Indian History" && hist.subTopics.length === 2, JSON.stringify(hist));
  check("a topic with no colon keeps zero sub-topics", gd.json.pattern.sections[0].syllabus[1].topic === "Sports" && gd.json.pattern.sections[0].syllabus[1].subTopics.length === 0);
  check("a topic sent as an object is kept as-is", tech.json.pattern.sections[0].syllabus[0].subTopics.length === 2);

  // Blank lines and stray separators must never reach the generator.
  const messy = await api("POST", "/exams", {
    examType: "MESSY", displayName: "Messy", durationMinutes: 10,
    sections: [{ subject: "GK", questionCount: 2, syllabus: ["", "   ", "Real Topic: , ,", "Another: one , , two"] }],
  });
  const cleaned = messy.json.pattern.sections[0].syllabus;
  check("blank lines and empty sub-topics are dropped",
    cleaned.length === 2 && cleaned[0].topic === "Real Topic" && cleaned[0].subTopics.length === 0 && cleaned[1].subTopics.length === 2,
    JSON.stringify(cleaned));

  // Each post's generation must use ITS OWN syllabus and level.
  fs.writeFileSync(CALLS, "");
  await api("POST", "/exam-series/AGNIVEER_GD/generate-mock");
  const gdCalls = calls();
  check("GD mock gets GD's level and syllabus",
    gdCalls.length > 0 && gdCalls.every((c) => /10th-pass/.test(c.examLevel)) &&
      gdCalls.every((c) => c.syllabusTopics.some((t) => t.topic === "Indian History")),
    JSON.stringify(gdCalls[0] && gdCalls[0].syllabusTopics));
  check("sub-topics travel with the topic",
    gdCalls.some((c) => c.syllabusTopics.some((t) => (t.subTopics || []).includes("freedom movement"))));

  fs.writeFileSync(CALLS, "");
  await api("POST", "/exam-series/AGNIVEER_TECH/generate-mock");
  const techCalls = calls();
  check("Technical mock gets ITS level, not GD's", techCalls.every((c) => /12th-pass/.test(c.examLevel)), techCalls[0] && techCalls[0].examLevel);
  check("Technical mock never sees GD's syllabus",
    techCalls.every((c) => c.syllabusTopics.every((t) => t.topic === "Motion")),
    JSON.stringify(techCalls.map((c) => c.syllabusTopics.map((t) => t.topic))));

  // Editing one post must not disturb the other.
  await api("PATCH", "/exams/" + tech.json.pattern._id, {
    sections: [{ subject: "Physics", questionCount: 5, syllabus: ["Electricity: circuits"] }],
  });
  const after = (await api("GET", "/exams?includeInactive=1")).json.patterns;
  const gdAfter = after.find((p) => p.examType === "AGNIVEER_GD");
  const techAfter = after.find((p) => p.examType === "AGNIVEER_TECH");
  check("editing one post leaves the other untouched", gdAfter.sections[0].syllabus[0].topic === "Indian History");
  check("the edited post has its new syllabus", techAfter.sections[0].syllabus[0].topic === "Electricity" && techAfter.sections[0].syllabus[0].subTopics[0] === "circuits");

  fs.existsSync(CALLS) && fs.unlinkSync(CALLS);
  srv.kill();
  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) { console.log("\n--- server log tail ---\n" + log.split("\n").slice(-15).join("\n")); process.exit(1); }
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
