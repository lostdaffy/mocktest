// Admin-side tests: exam pattern create/edit/archive/delete and the
// subject-practice listing. Runs the real server against a throwaway
// in-memory MongoDB - production data is never touched.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const PORT = 5056;
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
  const uri = mem.getUri() + "admin_test";
  const env = {
    ...process.env,
    MONGO_URI: uri,
    JWT_SECRET,
    PORT: String(PORT),
    TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
    EMAIL_USER: "", EMAIL_APP_PASSWORD: "",
    RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "",
    ALLOWED_ORIGINS: "",
  };
  const srv = spawn(process.execPath, ["server.js"], { cwd: SERVER, env });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await new Promise((r) => setTimeout(r, 250));
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // An admin to call the admin-only routes with.
  const admin = await db.collection("users").insertOne({
    name: "Admin", phone: "9999999999", email: "admin@test.com", role: "admin", referralCode: "ADMIN1",
  });
  token = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);

  // ---- create
  let r = await api("POST", "/exams", {
    examType: "SSC_CHSL", displayName: "SSC CHSL Tier 1", durationMinutes: 60, negativeMarking: 0.25,
    sections: [{ subject: "Maths", questionCount: 25, difficultyMix: { easy: 30, medium: 50, hard: 20 } }],
  });
  check("pattern created", r.status === 200 && r.json.pattern.examType === "SSC_CHSL", `status ${r.status}`);
  const id = r.json.pattern._id;

  // ---- update (the new endpoint)
  r = await api("PATCH", `/exams/${id}`, {
    displayName: "SSC CHSL Tier 1 (2026)", durationMinutes: 75,
    sections: [
      { subject: "Maths", questionCount: 30, difficultyMix: { easy: 20, medium: 50, hard: 30 } },
      { subject: "English", questionCount: 25, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
    ],
  });
  check("pattern updated in place", r.status === 200 && r.json.pattern.displayName === "SSC CHSL Tier 1 (2026)" && r.json.pattern.durationMinutes === 75);
  check("sections replaced, not appended", r.json.pattern?.sections?.length === 2, `sections ${r.json.pattern?.sections?.length}`);
  check("difficulty mix saved", r.json.pattern?.sections?.[0]?.difficultyMix?.hard === 30);
  check("only ONE pattern exists after editing", (await db.collection("exampatterns").countDocuments()) === 1);

  // ---- renaming the exam code renames, never duplicates
  r = await api("PATCH", `/exams/${id}`, { examType: "SSC_CHSL_2026" });
  check("exam code renamed", r.status === 200 && r.json.pattern.examType === "SSC_CHSL_2026");
  check("still only one pattern after rename", (await db.collection("exampatterns").countDocuments()) === 1);

  // ---- a clashing code is refused
  await api("POST", "/exams", { examType: "SSC_MTS", displayName: "SSC MTS", durationMinutes: 60, sections: [{ subject: "GK", questionCount: 20 }] });
  r = await api("PATCH", `/exams/${id}`, { examType: "SSC_MTS" });
  check("duplicate exam code refused", r.status === 409, `status ${r.status}`);

  // ---- usage count comes back with the admin listing
  await db.collection("tests").insertMany([
    { title: "M1", type: "full_mock", examType: "SSC_CHSL_2026", questions: [], durationMinutes: 60, publishStatus: "published" },
    { title: "M2", type: "full_mock", examType: "SSC_CHSL_2026", questions: [], durationMinutes: 60, publishStatus: "draft" },
  ]);
  r = await api("GET", "/exams?includeInactive=1");
  const chsl = r.json.patterns.find((p) => p._id === id);
  check("listing shows how many tests use a pattern", chsl?.testCount === 2, `testCount ${chsl?.testCount}`);

  // ---- archive (default delete) hides it from the app but keeps it
  r = await api("DELETE", `/exams/${id}`);
  check("archive works", r.status === 200 && /archived/i.test(r.json.message), r.json.message);
  r = await api("GET", "/exams");
  check("archived pattern hidden from the normal list", !r.json.patterns.some((p) => p._id === id));
  r = await api("GET", "/exams?includeInactive=1");
  check("archived pattern still visible to admin", r.json.patterns.some((p) => p._id === id && p.isActive === false));
  check("its tests were NOT touched", (await db.collection("tests").countDocuments({ examType: "SSC_CHSL_2026" })) === 2);

  // ---- restore
  r = await api("PATCH", `/exams/${id}`, { isActive: true });
  check("restore works", r.status === 200 && r.json.pattern.isActive === true);
  r = await api("GET", "/exams");
  check("restored pattern is back in the app list", r.json.patterns.some((p) => p._id === id));

  // ---- permanent delete
  r = await api("DELETE", `/exams/${id}?permanent=1`);
  check("permanent delete removes the pattern", r.status === 200 && (await db.collection("exampatterns").countDocuments({ _id: new mongoose.Types.ObjectId(id) })) === 0);
  check("papers already built from it survive", (await db.collection("tests").countDocuments({ examType: "SSC_CHSL_2026" })) === 2);
  r = await api("DELETE", `/exams/${id}`);
  check("deleting a missing pattern gives 404", r.status === 404);

  // ---- a non-admin can't touch patterns
  const student = await db.collection("users").insertOne({ name: "S", phone: "9888888888", role: "student", referralCode: "STU1", activeSessionId: "sess1" });
  const adminToken = token;
  token = jwt.sign({ id: student.insertedId.toString(), sessionId: "sess1" }, JWT_SECRET);
  const patterns = await api("GET", "/exams");
  check("students can still read patterns", patterns.status === 200);
  r = await api("DELETE", `/exams/${id}`);
  check("student can't delete a pattern", r.status === 403, `status ${r.status}`);
  r = await api("PATCH", `/exams/${id}`, { displayName: "hacked" });
  check("student can't edit a pattern", r.status === 403);
  token = adminToken;

  // ---- subject practice: counts and grouping
  await db.collection("subjects").insertOne({
    name: "Maths", icon: "📐", isActive: true, displayOrder: 1,
    chapters: [{ name: "Algebra", topics: ["Linear"] }, { name: "Geometry", topics: ["Angles"] }],
  });
  const practice = (level, status, n) => ({
    title: `Algebra ${level} #${n}`, type: "practice", examType: "PRACTICE", subject: "Maths", topic: "Algebra",
    difficultyLevel: level, publishStatus: status, questions: [], durationMinutes: 20, seriesNumber: n,
    createdAt: new Date(), updatedAt: new Date(),
  });
  await db.collection("tests").insertMany([
    practice("advanced", "draft", 1),
    practice("easy", "published", 1),
    practice("hard", "published", 1),
    practice("medium", "draft", 1),
    practice("easy", "draft", 2),
  ]);

  r = await api("GET", "/exam-series/subjects/list");
  const algebra = r.json.subjects?.[0]?.chapters?.find((c) => c.name === "Algebra");
  check("chapter counts are right", algebra?.publishedTests === 2 && algebra?.draftTests === 3, JSON.stringify({ p: algebra?.publishedTests, d: algebra?.draftTests }));
  check("per-level counts come with the list", algebra?.levels?.easy?.published === 1 && algebra?.levels?.easy?.draft === 1 && algebra?.levels?.advanced?.draft === 1, JSON.stringify(algebra?.levels));
  const geometry = r.json.subjects?.[0]?.chapters?.find((c) => c.name === "Geometry");
  check("a chapter with no tests reads zero", geometry?.publishedTests === 0 && geometry?.levels?.hard?.published === 0);

  r = await api("GET", "/exam-series/practice/Maths/Algebra");
  const order = r.json.tests.map((t) => t.difficultyLevel);
  check("tests come back in level order, not shuffled", JSON.stringify(order) === JSON.stringify(["easy", "easy", "medium", "hard", "advanced"]), order.join(","));
  check("newest first inside a level", r.json.tests[0].seriesNumber === 2);
  check("question count included", r.json.tests.every((t) => typeof t.questionCount === "number"));
  check("heavy questions array not sent", r.json.tests.every((t) => t.questions === undefined));

  // ================= USER SUPPORT CONTROLS =================

  const { ObjectId } = mongoose.Types;
  const stuck = await db.collection("users").insertOne({
    name: "Stuck Student", phone: "9000012345", email: "stuck@test.com", role: "student",
    referralCode: "STUCK1", passwordHash: "hashed", activeSessionId: "sess-abc",
    failedLoginAttempts: 5, lockUntil: new Date(Date.now() + 10 * 60 * 1000),
    examGoals: ["AGNIVEER_GD"], preferredLanguage: "hi", streakCount: 3,
    subscriptionStatus: "active", subscriptionPlan: "yearly",
    subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000),
    freeUsage: { mockTestsUsed: 2, liveExamsUsed: 1, pyqUsed: 0 },
    referralCredits: 15, createdAt: new Date(),
  });
  const sid = stuck.insertedId;
  const referred = await db.collection("users").insertOne({ name: "Friend", phone: "9000012399", role: "student", referralCode: "FR1", referredBy: sid });
  const testDoc = await db.collection("tests").insertOne({ title: "Agniveer Mock #1", type: "full_mock", examType: "AGNIVEER_GD", examStage: "AGNIVEER_GD", questions: [], durationMinutes: 60, publishStatus: "published" });
  await db.collection("attempts").insertMany([
    { user: sid, test: testDoc.insertedId, score: 40, totalMarks: 50, accuracy: 80, status: "submitted", submittedAt: new Date(), createdAt: new Date() },
    { user: sid, test: testDoc.insertedId, score: 0, totalMarks: 50, status: "in_progress", createdAt: new Date() },
  ]);
  await db.collection("subscriptions").insertMany([
    { user: sid, plan: "yearly", amount: 449, status: "paid", razorpayPaymentId: "pay_abc123", couponCode: "TEST1", startDate: new Date(), endDate: new Date(), createdAt: new Date() },
    { user: sid, plan: "yearly", amount: 449, status: "created", startDate: new Date(), endDate: new Date(), createdAt: new Date() },
  ]);
  await db.collection("reports").insertOne({ question: new ObjectId(), reportedBy: sid, reason: "typo" });

  r = await api("GET", "/admin/users/" + sid);
  check("one call returns the whole account picture", r.status === 200 && r.json.user && r.json.flags && r.json.activity && r.json.subscriptions, `${r.status}`);
  check("the lock is reported with minutes left", r.json.flags.locked === true && r.json.flags.lockMinutesLeft > 0 && r.json.flags.failedLoginAttempts === 5, JSON.stringify(r.json.flags));
  check("tells you they CAN receive a reset email", r.json.flags.hasEmail === true && r.json.flags.hasPassword === true);
  check("tells you a device is holding the session", r.json.flags.loggedInSomewhere === true);
  check("password hash is never sent to the browser", !JSON.stringify(r.json).includes("hashed"));
  check("subscription days left computed", r.json.user.daysLeft >= 29 && r.json.user.daysLeft <= 31, `${r.json.user.daysLeft}`);
  check("payments listed, newest first", r.json.subscriptions.length === 2 && r.json.subscriptions.some((s) => s.razorpayPaymentId === "pay_abc123"));
  check("attempts and reports counted", r.json.activity.attemptCount === 2 && r.json.activity.reportCount === 1);
  check("recent attempts carry the test title", r.json.activity.recentAttempts[0].test?.title === "Agniveer Mock #1", JSON.stringify(r.json.activity.recentAttempts[0]?.test));
  check("referral picture is complete", r.json.user.referredCount === 1 && r.json.user.referralCredits === 15);

  // ---- unlock
  r = await api("PATCH", "/admin/users/" + sid + "/unlock");
  check("unlock clears the lockout", r.status === 200, r.json.message);
  let fresh = await db.collection("users").findOne({ _id: sid });
  check("...in the database too", !fresh.lockUntil && fresh.failedLoginAttempts === 0);
  check("unlock does NOT touch their password", fresh.passwordHash === "hashed");

  // ---- force logout
  r = await api("PATCH", "/admin/users/" + sid + "/logout");
  fresh = await db.collection("users").findOne({ _id: sid });
  check("force logout frees the single-device session", r.status === 200 && !fresh.activeSessionId);

  // ---- fixing a mistyped email (the reason reset emails never arrive)
  r = await api("PATCH", "/admin/users/" + sid + "/profile", { email: "FIXED@Test.com", name: "Fixed Name" });
  fresh = await db.collection("users").findOne({ _id: sid });
  check("email fixed and lowercased", r.status === 200 && fresh.email === "fixed@test.com" && fresh.name === "Fixed Name");
  r = await api("PATCH", "/admin/users/" + sid + "/profile", { email: "not-an-email" });
  check("a malformed email is refused", r.status === 400);
  await db.collection("users").updateOne({ _id: referred.insertedId }, { $set: { email: "taken@test.com" } });
  r = await api("PATCH", "/admin/users/" + sid + "/profile", { email: "taken@test.com" });
  check("someone else's email is refused", r.status === 409, r.json.message);
  fresh = await db.collection("users").findOne({ _id: sid });
  check("...and the old email is untouched after a refused edit", fresh.email === "fixed@test.com");

  // ---- exam filter options come from the exam patterns now
  await api("POST", "/exams", { examType: "AGNIVEER_GD", displayName: "Agniveer Army GD", durationMinutes: 60, sections: [{ subject: "GK", questionCount: 10 }] });
  r = await api("GET", "/admin/users");
  check("exam filter lists exams from the patterns, not a hardcoded list",
    Array.isArray(r.json.examOptions) && r.json.examOptions.includes("AGNIVEER_GD") && r.json.examOptions.includes("SSC_MTS"),
    JSON.stringify(r.json.examOptions));

  // ---- deletion requested by email
  r = await api("DELETE", "/admin/users/" + sid);
  check("admin can delete an account on request", r.status === 200, r.json.message);
  check("the account is gone", !(await db.collection("users").findOne({ _id: sid })));
  check("their attempts and reports went with it",
    (await db.collection("attempts").countDocuments({ user: sid })) === 0 &&
      (await db.collection("reports").countDocuments({ reportedBy: sid })) === 0);
  const leftovers = await db.collection("subscriptions").find({ user: sid }).toArray();
  check("the paid record is kept for tax, the unpaid order isn't", leftovers.length === 1 && leftovers[0].status === "paid");
  check("a scrambled record of the number is left behind, with no personal data",
    (await db.collection("deletedaccounts").countDocuments()) === 1 &&
      !JSON.stringify(await db.collection("deletedaccounts").find({}).toArray()).includes("9000012345"));

  r = await api("GET", "/admin/users/" + sid);
  check("a deleted user 404s afterwards", r.status === 404);

  // ---- the admin account itself must survive a stray click
  const adminId = admin.insertedId;
  r = await api("DELETE", "/admin/users/" + adminId);
  check("the admin account can't be deleted", r.status === 403 && !!(await db.collection("users").findOne({ _id: adminId })));

  // ---- students can't reach any of this
  const stu = await db.collection("users").insertOne({ name: "S2", phone: "9000012388", role: "student", referralCode: "S2", activeSessionId: "s2" });
  const adminToken2 = token;
  token = jwt.sign({ id: stu.insertedId.toString(), sessionId: "s2" }, JWT_SECRET);
  check("a student can't read another account", (await api("GET", "/admin/users/" + stu.insertedId)).status === 403);
  check("a student can't unlock accounts", (await api("PATCH", "/admin/users/" + stu.insertedId + "/unlock")).status === 403);
  check("a student can't delete accounts", (await api("DELETE", "/admin/users/" + stu.insertedId)).status === 403);
  check("a student can't make themselves an admin",
    (await api("PATCH", `/admin/users/${stu.insertedId}/role`, { role: "admin" })).status === 403);
  token = adminToken2;

  // ---- one admin account per team member
  // The panel is run by a team, and there was exactly one admin account,
  // shared by everyone - nobody could tell who published what.
  r = await api("PATCH", `/admin/users/${adminId}/role`, { role: "student" });
  // The only admin removing themselves is the one way to lock the panel, and
  // the self rule is what stops it; the server's last-admin rule is a second
  // guard behind it that no single request can currently reach.
  check("the only admin can't lock the panel by removing themselves", r.status === 400, r.json.message);

  r = await api("PATCH", `/admin/users/${stu.insertedId}/role`, { role: "admin" });
  check("an admin can make a team member an admin", r.status === 200 && (await db.collection("users").findOne({ _id: stu.insertedId })).role === "admin", r.json.message);
  token = jwt.sign({ id: stu.insertedId.toString(), sessionId: "s2" }, JWT_SECRET);
  check("...and it works on their very next request", (await api("GET", "/admin/users/stats")).status === 200);

  r = await api("PATCH", `/admin/users/${stu.insertedId}/role`, { role: "student" });
  check("nobody can remove their own admin access", r.status === 400, r.json.message);

  token = adminToken2;
  r = await api("PATCH", `/admin/users/${stu.insertedId}/role`, { role: "student" });
  check("another admin can take it away again", r.status === 200 && (await db.collection("users").findOne({ _id: stu.insertedId })).role === "student", r.json.message);
  token = jwt.sign({ id: stu.insertedId.toString(), sessionId: "s2" }, JWT_SECRET);
  check("...and it stops working on their very next request", (await api("GET", "/admin/users/stats")).status === 403);
  token = adminToken2;
  r = await api("PATCH", `/admin/users/${stu.insertedId}/role`, { role: "superuser" });
  check("only admin or student can be given", r.status === 400);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) { console.log("\n--- server log tail ---\n" + log.split("\n").slice(-20).join("\n")); process.exit(1); }
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
