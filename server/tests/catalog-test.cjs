// The whole point of this architecture: a new exam should be an admin job,
// not a code change. And a student should never have to know which subjects
// their exam contains.
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
  const uri = mem.getUri() + "catalog_test";
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
  const adminToken = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  const student = async (phone, examGoals, selectedSubjects = []) => {
    const u = await db.collection("users").insertOne({
      name: "S" + phone.slice(-2), phone, role: "student", referralCode: "R" + phone.slice(-4),
      examGoals, selectedSubjects, freeUsage: { mockTestsUsed: 0, liveExamsUsed: 0, pyqUsed: 0 },
      activeSessionId: "x", // students are single-device; the token below carries this id
      subscriptionStatus: "active", subscriptionExpiresAt: new Date(Date.now() + 86400e3 * 300),
    });
    return jwt.sign({ id: u.insertedId.toString(), sessionId: "x" }, JWT_SECRET);
  };

  // ============================================================
  // Everything below is set up ONLY through the admin API.
  // ============================================================
  const subj = (body) => api("POST", "/subjects", { body, token: adminToken });

  await subj({
    name: "Maths", nameHi: "गणित", displayOrder: 1,
    // Banking's paper says "Quant"; it is the same subject and the same bank.
    aliases: ["Quant", "Quantitative Aptitude"],
    chapters: [
      { name: "Percentage", nameHi: "प्रतिशत", category: "अंकगणित", categoryHi: "अंकगणित", topics: ["Percentage"], exams: ["SSC_CGL", "AGNIVEER", "BANKING"] },
      { name: "Coordinate Geometry", category: "ज्यामिति", topics: ["Coordinate Geometry"], exams: ["SSC_CGL"] },
      { name: "Simplification", category: "अंकगणित", topics: ["Simplification"] }, // no exams = every exam
    ],
  });
  await subj({ name: "GK", displayOrder: 2, chapters: [{ name: "Indian History", category: "इतिहास", topics: ["Indian History"] }] });
  await subj({ name: "Science", displayOrder: 3, chapters: [{ name: "Physics", topics: ["Physics"] }] });
  await subj({ name: "Current Affairs", displayOrder: 4, chapters: [{ name: "National", topics: ["National Current Affairs"] }] });
  await subj({ name: "Reasoning", displayOrder: 5, chapters: [{ name: "Blood Relation", topics: ["Blood Relation"] }] });

  // SSC's General Awareness section is GK + Science + Current Affairs together.
  await api("POST", "/exams", { token: adminToken, body: {
    examType: "SSC_CGL", displayName: "SSC CGL Tier 1", durationMinutes: 60,
    sections: [
      { subject: "Maths", questionCount: 4, difficultyMix: { easy: 100, medium: 0, hard: 0 } },
      // 15 of the 18 available (6 GK + 6 Science + 6 Current Affairs), so at
      // least 3 of each MUST appear - the old count of 6 could miss a whole
      // subject by chance and the test only passed on luck.
      { subject: "GK", sources: ["Science", "Current Affairs"], questionCount: 15, difficultyMix: { easy: 100, medium: 0, hard: 0 } },
    ],
  }});
  // Banking names the same subject differently.
  await api("POST", "/exams", { token: adminToken, body: {
    examType: "BANKING", displayName: "IBPS PO", durationMinutes: 60,
    sections: [{ subject: "Quant", questionCount: 4, difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
  }});
  await api("POST", "/exams", { token: adminToken, body: {
    examType: "AGNIVEER", displayName: "Agniveer GD", durationMinutes: 60,
    sections: [{ subject: "Maths", questionCount: 4, difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
  }});

  // ---- the question bank
  const q = (over) => ({
    text: `q-${Math.random()}`, textHi: "प्रश्न", options: ["a", "b", "c", "d"], optionsHi: ["a", "b", "c", "d"],
    correctIndex: 1, solution: "because of this and that reason", solutionHi: "कारण",
    examType: ["SSC_CGL"], subject: "Maths", topic: "Percentage", difficulty: "easy",
    source: "ai_generated", status: "published", ...over,
  });
  await db.collection("questions").insertMany([
    ...Array.from({ length: 15 }, () => q({})),                                                    // SSC Percentage
    ...Array.from({ length: 15 }, () => q({ examType: ["AGNIVEER"] })),                             // Agniveer Percentage
    ...Array.from({ length: 8 }, () => q({ topic: "Simplification" })),                             // SSC only
    ...Array.from({ length: 6 }, () => q({ subject: "GK", topic: "Indian History" })),
    ...Array.from({ length: 6 }, () => q({ subject: "Science", topic: "Physics" })),
    ...Array.from({ length: 6 }, () => q({ subject: "Current Affairs", topic: "National Current Affairs" })),
  ]);

  // ============================================================
  // 1. A student never sets subjects up - the exam already said so
  // ============================================================
  const ssc = await student("9000000101", ["SSC_CGL"]);
  let r = await api("GET", "/subjects/my", { token: ssc });
  let names = r.json.subjects.map((s) => s.name).sort();
  check("a student who set nothing up still gets their subjects",
    names.length === 4, names.join(", "));
  check("...including the ones their GA section draws on",
    names.join(",") === "Current Affairs,GK,Maths,Science", names.join(","));

  // The exact case that left a real paying user with an empty Practice tab.
  const banking = await student("9000000102", ["BANKING"]);
  r = await api("GET", "/subjects/my", { token: banking });
  check('a paper saying "Quant" resolves to the Maths catalog and bank',
    r.json.subjects.length === 1 && r.json.subjects[0].name === "Maths",
    r.json.subjects.map((s) => s.name).join(",") || "EMPTY");

  // ============================================================
  // 2. Chapters follow the student's own exam
  // ============================================================
  const agni = await student("9000000103", ["AGNIVEER"]);
  r = await api("GET", "/subjects/my", { token: agni });
  let maths = r.json.subjects.find((s) => s.name === "Maths");
  let chapterNames = maths.chapters.map((c) => c.name).sort();
  check("an Agniveer student is not shown Coordinate Geometry",
    !chapterNames.includes("Coordinate Geometry"), chapterNames.join(", "));
  check("...but does get the chapters their exam asks for",
    chapterNames.join(",") === "Percentage,Simplification", chapterNames.join(","));

  r = await api("GET", "/subjects/my", { token: ssc });
  maths = r.json.subjects.find((s) => s.name === "Maths");
  check("an SSC student gets all three, Coordinate Geometry included",
    maths.chapters.length === 3, maths.chapters.map((c) => c.name).join(", "));
  check("a chapter tagged to no exam shows for everyone",
    maths.chapters.some((c) => c.name === "Simplification"));
  check("the heading travels to the app with the chapter",
    maths.chapters.find((c) => c.name === "Percentage").category === "अंकगणित",
    maths.chapters.find((c) => c.name === "Percentage").category);

  // ============================================================
  // 3. A subject they added themselves is kept
  // ============================================================
  await api("PATCH", "/subjects/my", { token: ssc, body: { subjects: ["Reasoning"] } });
  r = await api("GET", "/subjects/my", { token: ssc });
  names = r.json.subjects.map((s) => s.name).sort();
  check("a subject the student adds is kept alongside their exam's",
    names.includes("Reasoning") && names.includes("Maths"), names.join(","));

  // ============================================================
  // 4. One paper section, several subjects
  // ============================================================
  r = await api("POST", "/tests/generate/full-mock", { token: ssc, body: { examType: "SSC_CGL" } });
  check("the mock is built", r.status === 201, `${r.status} ${r.json.message || ""}`);
  const mockQs = await db.collection("questions")
    .find({ _id: { $in: (r.json.test.questions || []).map((id) => new mongoose.Types.ObjectId(id)) } })
    .toArray();
  const subjectsUsed = [...new Set(mockQs.map((x) => x.subject))].sort();
  check("the GA section really draws from GK, Science and Current Affairs",
    ["Current Affairs", "GK", "Science"].every((s) => subjectsUsed.includes(s)), subjectsUsed.join(", "));
  check("no question is used twice inside one paper",
    new Set(mockQs.map((x) => String(x._id))).size === mockQs.length, `${mockQs.length} questions`);

  // A paper that names the subject by its alias still finds the bank.
  r = await api("POST", "/tests/generate/full-mock", { token: banking, body: { examType: "BANKING" } });
  check('a "Quant" section pulls Maths questions', r.status === 201 && r.json.test.questions.length > 0,
    `${r.status} ${r.json.test?.questions?.length || 0} questions`);

  // ============================================================
  // 5. Practice questions pitched at the student's own exam
  // ============================================================
  r = await api("POST", "/subjects/chapter-test", { token: agni, body: { subject: "Maths", chapter: "Percentage" } });
  check("an Agniveer student gets a Percentage test", r.status === 201, `${r.status} ${r.json.message || ""}`);
  let picked = await db.collection("questions")
    .find({ _id: { $in: r.json.test.questions.map((id) => new mongoose.Types.ObjectId(id)) } })
    .toArray();
  check("...and every question in it was written for Agniveer, not SSC",
    picked.length === 15 && picked.every((x) => x.examType.includes("AGNIVEER")),
    `${picked.filter((x) => x.examType.includes("AGNIVEER")).length}/${picked.length} Agniveer`);

  // Simplification only has SSC questions - an empty screen would be worse.
  r = await api("POST", "/subjects/chapter-test", { token: agni, body: { subject: "Maths", chapter: "Simplification" } });
  check("where their exam has nothing yet, the shared bank fills in",
    r.status === 201 && r.json.test.questions.length === 8,
    `${r.status} ${r.json.test?.questions?.length || 0} questions`);

  // ============================================================
  // 6. A chapter with no bank yet is not a crash
  // ============================================================
  r = await api("POST", "/subjects/chapter-test", { token: ssc, body: { subject: "GK", chapter: "Indian History" } });
  const before = r.status;
  await db.collection("questions").deleteMany({ topic: "Indian History" });
  r = await api("POST", "/subjects/chapter-test", { token: ssc, body: { subject: "GK", chapter: "Indian History" } });
  check("an empty chapter answers 400, not a server error", r.status === 400, `was ${before}, now ${r.status}`);
  check("...and says so in Hindi, without blaming the student",
    /taiyaar ho rahe hain/.test(r.json.message || ""), r.json.message);

  // ============================================================
  // 7. The real test: a brand-new exam, added with no code change
  // ============================================================
  await api("POST", "/exams", { token: adminToken, body: {
    examType: "UP_POLICE", displayName: "UP Police Constable", durationMinutes: 120,
    sections: [
      { subject: "Maths", questionCount: 3, difficultyMix: { easy: 100, medium: 0, hard: 0 } },
      { subject: "GK", sources: ["Current Affairs"], questionCount: 3, difficultyMix: { easy: 100, medium: 0, hard: 0 } },
    ],
  }});
  await subj({
    name: "Maths", nameHi: "गणित", displayOrder: 1, aliases: ["Quant", "Quantitative Aptitude"],
    chapters: [
      { name: "Percentage", nameHi: "प्रतिशत", category: "अंकगणित", topics: ["Percentage"], exams: ["SSC_CGL", "AGNIVEER", "BANKING", "UP_POLICE"] },
      { name: "Coordinate Geometry", category: "ज्यामिति", topics: ["Coordinate Geometry"], exams: ["SSC_CGL"] },
      { name: "Simplification", category: "अंकगणित", topics: ["Simplification"] },
    ],
  });

  const up = await student("9000000104", ["UP_POLICE"]);
  r = await api("GET", "/subjects/my", { token: up });
  names = r.json.subjects.map((s) => s.name).sort();
  check("a brand-new exam gives its students subjects immediately",
    names.join(",") === "Current Affairs,GK,Maths", names.join(",") || "EMPTY");
  maths = r.json.subjects.find((s) => s.name === "Maths");
  check("...the right chapters for it",
    maths.chapters.map((c) => c.name).sort().join(",") === "Percentage,Simplification",
    maths.chapters.map((c) => c.name).join(","));

  r = await api("POST", "/tests/generate/full-mock", { token: up, body: { examType: "UP_POLICE" } });
  check("...and a working mock, from the question bank that already existed",
    r.status === 201 && r.json.test.questions.length === 6,
    `${r.status} ${r.json.test?.questions?.length || 0} questions`);
  check("...without one line of code being written for it", true);


  // ============================================================
  // 8. The screen that catches setup mistakes before a student does
  // ============================================================
  r = await api("GET", "/subjects/health", { token: adminToken });
  check("the catalog report is admin-only and returns", r.status === 200, String(r.status));
  let kinds = (p) => r.json.problems.filter((x) => x.kind === p);

  check("a subject reached only by its alias is NOT reported as missing",
    !r.json.problems.some((x) => (x.detail || "").includes('"Quant"')),
    r.json.problems.filter((x) => x.kind === "section_subject_missing").map((x) => x.detail).join(" | ") || "none");

  check("a subject no exam section draws on is reported",
    kinds("subject_unused").some((x) => x.subject === "Reasoning"),
    kinds("subject_unused").map((x) => x.subject).join(", ") || "none");

  check("a chapter whose topics match no question is reported",
    kinds("chapter_empty").some((x) => x.chapter === "Indian History"),
    kinds("chapter_empty").map((x) => x.chapter).join(", ") || "none");

  // Now break something on purpose - exactly the shape of the live bug.
  await api("POST", "/exams", { token: adminToken, body: {
    examType: "CTET", displayName: "CTET Paper 1", durationMinutes: 150,
    sections: [{ subject: "Child Development", questionCount: 30, difficultyMix: { easy: 100, medium: 0, hard: 0 } }],
  }});
  r = await api("GET", "/subjects/health", { token: adminToken });
  kinds = (p) => r.json.problems.filter((x) => x.kind === p);
  const missing = kinds("section_subject_missing");
  check("a section naming a subject that does not exist is caught",
    missing.some((x) => (x.detail || "").includes("Child Development")),
    missing.map((x) => x.detail).join(" | ") || "none");
  check("...as high severity, because it empties a screen",
    missing.every((x) => x.severity === "high"), missing.map((x) => x.severity).join(","));
  check("...and it says what to do about it",
    missing.every((x) => x.fix && x.fix.length > 10), missing[0] && missing[0].fix);
  check("the worst problems are listed first",
    r.json.problems[0].severity === "high", r.json.problems.map((x) => x.severity).slice(0, 4).join(","));

  // Fixing it the way the report suggests makes it go away.
  await subj({ name: "Child Development", displayOrder: 9, chapters: [{ name: "Learning", topics: ["Learning"] }] });
  r = await api("GET", "/subjects/health", { token: adminToken });
  check("doing what it says clears the problem",
    !r.json.problems.some((x) => (x.detail || "").includes("Child Development") && x.kind === "section_subject_missing"),
    r.json.problems.filter((x) => x.kind === "section_subject_missing").length + " still missing");

  const studentToken = await student("9000000105", ["CTET"]);
  r = await api("GET", "/subjects/my", { token: studentToken });
  check("...and the exam that was broken now works for its students",
    r.json.subjects.length === 1 && r.json.subjects[0].name === "Child Development",
    r.json.subjects.map((x) => x.name).join(",") || "EMPTY");

  // ---- a live test with a hole in it
  // Eight practice tests were live holding ten or eleven of their twelve
  // questions and nothing on this screen said so. It is the only fault here
  // a student feels the same day.
  const full = Array.from({ length: 12 }, () => new mongoose.Types.ObjectId());
  await db.collection("tests").insertMany([
    { title: "Percentage - Easy #1", type: "practice", questions: full.slice(0, 10), publishStatus: "published" },
    { title: "Percentage - Easy #2", type: "practice", questions: full, publishStatus: "published" },
    { title: "Percentage - Hard #9", type: "practice", questions: full.slice(0, 4), publishStatus: "draft" },
  ]);

  r = await api("GET", "/subjects/health", { token: adminToken });
  const shortTests = r.json.problems.filter((x) => x.kind === "test_short");
  check("a live test that is short is reported", shortTests.length === 1, shortTests.map((x) => x.detail).join(" | ") || "none");
  check("...naming it and both numbers", /Percentage - Easy #1/.test(shortTests[0]?.detail || "") && /10 of 12/.test(shortTests[0]?.detail || ""),
    shortTests[0]?.detail);
  check("...as high severity, because a student can open it now", shortTests[0]?.severity === "high", shortTests[0]?.severity);
  check("...and it says how to fix it", /add 2 question/i.test(shortTests[0]?.fix || ""), shortTests[0]?.fix);
  check("a full test is not reported", !shortTests.some((x) => /#2/.test(x.detail)), "quiet about the full one");
  check("a draft is not reported - no student can open it", !shortTests.some((x) => /#9/.test(x.detail)), "quiet about the draft");

  await mongoose.disconnect();
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
