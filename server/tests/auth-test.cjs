// End-to-end test of the new auth system against a throwaway in-memory
// MongoDB. Never touches the production database, Twilio or Gmail.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const bcrypt = require(path.join(SERVER, "node_modules/bcryptjs"));
const CAPTURED = path.join(__dirname, "captured.jsonl");
const PORT = 5055;
const BASE = `http://127.0.0.1:${PORT}/api`;

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
}

async function api(method, p, body, token) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

function lastCode(ch, to) {
  const lines = fs.existsSync(CAPTURED) ? fs.readFileSync(CAPTURED, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
  const hit = lines.filter((l) => l.ch === ch && l.to === to).pop();
  return hit && hit.code;
}

(async () => {
  if (fs.existsSync(CAPTURED)) fs.unlinkSync(CAPTURED);
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "rankveer_test";

  const env = {
    ...process.env,
    MONGO_URI: uri,
    JWT_SECRET: "test_secret_" + "x".repeat(40),
    PORT: String(PORT),
    // Empty on purpose: if the stub ever failed to load, the real SMS client
    // has no credentials and throws instead of texting a real number.
    TWILIO_ACCOUNT_SID: "",
    TWILIO_AUTH_TOKEN: "",
    TWILIO_PHONE_NUMBER: "",
    EMAIL_USER: "",
    EMAIL_APP_PASSWORD: "",
    SMS_DAILY_LIMIT: "50",
    FAIL_SMS_FOR: "9000000005",
    ALLOWED_ORIGINS: "",
  };
  const srv = spawn(process.execPath, ["-r", path.join(__dirname, "auth-stub.cjs"), "server.js"], { cwd: SERVER, env });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 60 && !/Server running/.test(log); i++) await new Promise((r) => setTimeout(r, 250));
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }
  check("stub loaded into server", /\[stub\]/.test(log));

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const rewindThrottle = (key) => db.collection("otpthrottles").updateOne({ key }, { $set: { lastSentAt: new Date(0) } });

  const P1 = "9000000001", P2 = "9000000002", P3 = "9000000003", P5 = "9000000005", P6 = "9000000006", P7 = "9000000007";
  const E1 = "student.one@test.com", E2 = "student.two@test.com";

  // ---- removed endpoints
  check("OTP login endpoint removed", (await api("POST", "/auth/login-otp", { phone: P1, otp: "123456" })).status === 404);
  check("SMS request-otp endpoint removed", (await api("POST", "/auth/request-otp", { phone: P1 })).status === 404);

  // ---- signup OTP (the only SMS)
  check("signup OTP rejects bad number", (await api("POST", "/auth/signup/request-otp", { phone: "12345" })).status === 400);
  let r = await api("POST", "/auth/signup/request-otp", { phone: P1 });
  check("signup OTP sent", r.status === 200 && !!lastCode("sms", P1), `status ${r.status}`);
  r = await api("POST", "/auth/signup/request-otp", { phone: P1 });
  check("immediate resend blocked (60s cooldown)", r.status === 429, r.json.message);

  const code1 = lastCode("sms", P1);
  r = await api("POST", "/auth/signup", { name: "Student One", phone: P1, password: "secret123", otp: code1 });
  check("signup without email rejected", r.status === 400, r.json.message);

  for (let i = 1; i <= 4; i++) {
    r = await api("POST", "/auth/signup", { name: "S", phone: P1, password: "secret123", email: E1, otp: "000000" });
  }
  check("wrong OTP shows tries left", r.status === 400 && /1 try baaki/.test(r.json.message), r.json.message);
  r = await api("POST", "/auth/signup", { name: "S", phone: P1, password: "secret123", email: E1, otp: "000000" });
  check("5th wrong OTP discards the code", r.status === 400 && r.json.code === "OTP_ATTEMPTS_EXCEEDED");
  r = await api("POST", "/auth/signup", { name: "S", phone: P1, password: "secret123", email: E1, otp: code1 });
  check("discarded code no longer works even if correct", r.status === 400, r.json.message);

  await rewindThrottle(`sms:signup:${P1}`);
  await api("POST", "/auth/signup/request-otp", { phone: P1 });
  r = await api("POST", "/auth/signup", { name: "Student One", phone: P1, password: "secret123", email: E1, otp: lastCode("sms", P1) });
  check("signup succeeds with phone OTP + email", r.status === 201 && !!r.json.token, `status ${r.status}`);

  r = await api("POST", "/auth/signup/request-otp", { phone: P1 });
  check("no SMS spent on an already-registered number", r.status === 409);

  const P9 = "9000000009";
  r = await api("POST", "/auth/signup/request-otp", { phone: P9, email: E1.toUpperCase() });
  check("no SMS spent when the email is already taken", r.status === 409 && r.json.code === "EMAIL_TAKEN" && !lastCode("sms", P9), r.json.message);
  r = await api("POST", "/auth/signup/request-otp", { phone: P9, email: "not-an-email" });
  check("no SMS spent on a malformed email", r.status === 400 && !lastCode("sms", P9));

  await api("POST", "/auth/signup/request-otp", { phone: P2 });
  const code2 = lastCode("sms", P2);
  r = await api("POST", "/auth/signup", { name: "Student Two", phone: P2, password: "secret123", email: E1.toUpperCase(), otp: code2 });
  check("duplicate email blocked (case-insensitive)", r.status === 409 && r.json.code === "EMAIL_TAKEN");
  r = await api("POST", "/auth/signup", { name: "Student Two", phone: P2, password: "secret123", email: E2, otp: code2 });
  check("second signup with its own email works", r.status === 201);

  // ---- the null-email duplicate-key bug
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
  let bugFree = true;
  try {
    await db.collection("users").insertOne({ name: "Legacy A", phone: "9000000011", passwordHash: await bcrypt.hash("x123456", 10) });
    await db.collection("users").insertOne({ name: "Legacy B", phone: "9000000012", passwordHash: await bcrypt.hash("x123456", 10) });
  } catch (e) { bugFree = false; }
  check("two accounts without email can coexist", bugFree);

  // ---- login + lockout
  r = await api("POST", "/auth/login", { phone: P1, password: "secret123" });
  check("password login works", r.status === 200);
  for (let i = 1; i <= 6; i++) r = await api("POST", "/auth/login", { phone: P1, password: "wrong!" });
  check("first 6 wrong tries give nothing away", r.status === 401 && !/try baaki/.test(r.json.message), r.json.message);
  r = await api("POST", "/auth/login", { phone: P1, password: "wrong!" });
  check("7th wrong password starts the countdown", r.status === 401 && /3 try baaki/.test(r.json.message), r.json.message);
  check("...and says how long the lock will be", /24 ghante/.test(r.json.message), r.json.message);
  r = await api("POST", "/auth/login", { phone: P1, password: "wrong!" });
  check("8th says 2 try baaki", r.status === 401 && /2 try baaki/.test(r.json.message), r.json.message);
  r = await api("POST", "/auth/login", { phone: P1, password: "wrong!" });
  r = await api("POST", "/auth/login", { phone: P1, password: "wrong!" });
  check("10th wrong password locks the account for a day", r.status === 423 && r.json.code === "ACCOUNT_LOCKED" && /24 ghante/.test(r.json.message), r.json.message);
  check("lock really is 24 hours", r.json.retryAfterSec === 24 * 60 * 60, `${r.json.retryAfterSec}s`);
  r = await api("POST", "/auth/login", { phone: P1, password: "secret123" });
  check("correct password refused while locked", r.status === 423);
  await db.collection("users").updateOne({ phone: P1 }, { $set: { lockUntil: new Date(Date.now() - 1000) } });
  r = await api("POST", "/auth/login", { phone: P1, password: "secret123" });
  const tokenBeforeReset = r.json.token;
  const u1 = await db.collection("users").findOne({ phone: P1 });
  check("login works after lock expires and counters reset", r.status === 200 && !u1.failedLoginAttempts && !u1.lockUntil);
  r = await api("POST", "/auth/login", { phone: "9999999999", password: "whatever" });
  check("unknown number gets the same generic error", r.status === 401 && /galat/.test(r.json.message));

  // ---- forgot password by EMAIL
  const smsCount = () => (fs.readFileSync(CAPTURED, "utf8").match(/"ch":"sms"/g) || []).length;
  const smsBeforeReset = smsCount();
  r = await api("POST", "/auth/forgot-password", { phone: P1 });
  check("reset code sent by email, address masked", r.status === 200 && r.json.maskedEmail === "s*********e@test.com" && !!lastCode("email", E1), r.json.maskedEmail);
  r = await api("POST", "/auth/forgot-password", { phone: P1 });
  check("reset email resend blocked (60s cooldown)", r.status === 429);
  check("forgot password sent NO SMS", smsCount() === smsBeforeReset, `sms before ${smsBeforeReset}, after ${smsCount()}`);

  for (let i = 1; i <= 5; i++) r = await api("POST", "/auth/reset-password", { phone: P1, code: "000000", newPassword: "newpass1" });
  check("5 wrong reset codes discard the code", r.status === 400 && r.json.code === "CODE_ATTEMPTS_EXCEEDED");
  r = await api("POST", "/auth/reset-password", { phone: P1, code: lastCode("email", E1), newPassword: "newpass1" });
  check("discarded reset code no longer works", r.status === 400);

  await rewindThrottle(`email:reset:${u1._id}`);
  await api("POST", "/auth/forgot-password", { phone: P1 });
  r = await api("POST", "/auth/reset-password", { phone: P1, code: lastCode("email", E1), newPassword: "newpass1" });
  check("password reset with emailed code", r.status === 200, r.json.message);
  r = await api("GET", "/auth/me", null, tokenBeforeReset);
  check("reset logged out existing sessions", r.status === 401);
  check("old password rejected", (await api("POST", "/auth/login", { phone: P1, password: "secret123" })).status === 401);
  r = await api("POST", "/auth/login", { phone: P1, password: "newpass1" });
  const token1 = r.json.token;
  check("new password works", r.status === 200);
  check("older app builds sending `otp` instead of `code` still accepted",
    (await api("POST", "/auth/reset-password", { phone: P1, otp: "111111", newPassword: "newpass1" })).status === 400);

  r = await api("POST", "/auth/forgot-password", { phone: "9000000011" });
  check("account without email gets a clear NO_EMAIL answer", r.status === 400 && r.json.code === "NO_EMAIL");
  check("unknown number on forgot password -> 404", (await api("POST", "/auth/forgot-password", { phone: "9876543210" })).status === 404);

  // ---- changing the recovery email needs the password
  r = await api("PATCH", "/auth/profile", { email: "changed@test.com" }, token1);
  check("email change without password refused", r.status === 401 && r.json.code === "PASSWORD_REQUIRED");
  r = await api("PATCH", "/auth/profile", { email: "changed@test.com", currentPassword: "wrongpw" }, token1);
  check("email change with wrong password refused", r.status === 401);
  r = await api("PATCH", "/auth/profile", { email: E2, currentPassword: "newpass1" }, token1);
  check("email change to someone else's email refused", r.status === 409);
  r = await api("PATCH", "/auth/profile", { email: "changed@test.com", currentPassword: "newpass1" }, token1);
  check("email change with correct password works", r.status === 200 && r.json.user.email === "changed@test.com");
  r = await api("PATCH", "/auth/profile", { name: "Renamed" }, token1);
  check("name change still needs no password", r.status === 200 && r.json.user.name === "Renamed");

  // the email-change password box shares the login lockout (stolen unlocked phone can't brute-force it)
  for (let i = 1; i <= 10; i++) await api("PATCH", "/auth/profile", { email: "thief@test.com", currentPassword: "guess" + i }, token1);
  r = await api("PATCH", "/auth/profile", { email: "thief@test.com", currentPassword: "newpass1" }, token1);
  check("10 wrong passwords on email change lock it", r.status === 423 && r.json.code === "ACCOUNT_LOCKED", `status ${r.status}`);
  r = await api("POST", "/auth/login", { phone: P1, password: "newpass1" });
  check("...and the same lock applies to login", r.status === 423 || r.status === 429, `status ${r.status}`);
  const lockedDoc = await db.collection("users").findOne({ phone: P1 });
  check("lock is stored on the account itself", lockedDoc.lockUntil > new Date());

  // ---- provider failure + wallet protection
  r = await api("POST", "/auth/signup/request-otp", { phone: P5 });
  const retry = await api("POST", "/auth/signup/request-otp", { phone: P5 });
  check("failed SMS is not counted against the student", r.status === 502 && retry.status === 502, `first ${r.status}, retry ${retry.status}`);

  await db.collection("otpthrottles").updateOne({ key: "sms:global" }, { $set: { count: 50 } });
  r = await api("POST", "/auth/signup/request-otp", { phone: P6 });
  check("global daily SMS cap stops sending", r.status === 503 && r.json.code === "SMS_BUDGET");
  await db.collection("otpthrottles").updateOne({ key: "sms:global" }, { $set: { count: 0 } });
  r = await api("POST", "/auth/signup/request-otp", { phone: P6 });
  check("budget block didn't burn that number's cooldown", r.status === 200, `status ${r.status}`);

  // ---- race: 5 simultaneous OTP requests for one number must send ONE SMS
  const P8 = "9000000008";
  const before = smsCount();
  const burst = await Promise.all([1, 2, 3, 4, 5].map(() => api("POST", "/auth/signup/request-otp", { phone: P8 })));
  const oks = burst.filter((b) => b.status === 200).length;
  check("5 simultaneous requests -> exactly 1 SMS", oks === 1 && smsCount() - before === 1, `200s: ${oks}, SMS sent: ${smsCount() - before}, statuses: ${burst.map((b) => b.status).join(",")}`);

  // ---- rate limit keyed per phone, so one number can't block others on a shared IP
  for (let i = 1; i <= 20; i++) await api("POST", "/auth/login", { phone: P7, password: "x" });
  r = await api("POST", "/auth/login", { phone: P7, password: "x" });
  check("21st login attempt for one number is rate-limited", r.status === 429, `status undefined`);
  r = await api("POST", "/auth/login", { phone: P2, password: "secret123" });
  check("another student on the same IP is unaffected", r.status === 200, `status ${r.status}`);

  // ---- no secrets leak
  r = await api("GET", "/auth/me", null, r.json.token);
  const leaked = ["passwordHash", "passwordResetOTPHash", "failedLoginAttempts", "lockUntil", "activeSessionId"].filter((k) => k in (r.json.user || {}));
  check("/auth/me leaks no auth internals", r.status === 200 && leaked.length === 0, leaked.join(","));

  // ---- in-app account deletion
  const P10 = "9000000010", E10 = "del.me@test.com";
  const refCode = (await db.collection("users").findOne({ phone: P2 })).referralCode;
  const credits = async () => (await db.collection("users").findOne({ phone: P2 })).referralCredits || 0;
  const credBefore = await credits();
  await api("POST", "/auth/signup/request-otp", { phone: P10, email: E10 });
  r = await api("POST", "/auth/signup", { name: "Del Me", phone: P10, password: "delpass1", email: E10, otp: lastCode("sms", P10), referralCode: refCode });
  const delToken = r.json.token;
  const credAfterFirst = await credits();
  check("referral paid on first signup", r.status === 201 && credAfterFirst === credBefore + 5, `status ${r.status}, credits ${credBefore} -> ${credAfterFirst}`);
  const oid = (await db.collection("users").findOne({ phone: P10 }))._id;
  await db.collection("users").updateOne({ _id: oid }, { $set: { "freeUsage.mockTestsUsed": 2 } });
  await db.collection("attempts").insertOne({ user: oid, test: new mongoose.Types.ObjectId(), status: "submitted", answers: [] });
  await db.collection("reports").insertOne({ question: new mongoose.Types.ObjectId(), reportedBy: oid, reason: "typo" });
  await db.collection("tests").insertOne({ title: "personal practice", generatedForUser: oid });
  await db.collection("subscriptions").insertMany([
    { user: oid, plan: "yearly", amount: 449, startDate: new Date(), endDate: new Date(), status: "paid" },
    { user: oid, plan: "yearly", amount: 449, startDate: new Date(), endDate: new Date(), status: "created" },
  ]);

  r = await api("POST", "/auth/delete-account", {}, delToken);
  check("delete without password refused", r.status === 401 && r.json.code === "PASSWORD_REQUIRED");
  r = await api("POST", "/auth/delete-account", { password: "wrong" }, delToken);
  check("delete with wrong password refused, nothing deleted", r.status === 401 && !!(await db.collection("users").findOne({ _id: oid })));
  r = await api("POST", "/auth/delete-account", { password: "delpass1" }, delToken);
  check("delete with correct password works", r.status === 200, r.json.message);
  check("user document gone", !(await db.collection("users").findOne({ _id: oid })));
  check("attempts, reports and personal tests gone",
    (await db.collection("attempts").countDocuments({ user: oid })) === 0 &&
    (await db.collection("reports").countDocuments({ reportedBy: oid })) === 0 &&
    (await db.collection("tests").countDocuments({ generatedForUser: oid })) === 0);
  const subsLeft = await db.collection("subscriptions").find({ user: oid }).toArray();
  check("paid record kept for tax, unpaid order removed", subsLeft.length === 1 && subsLeft[0].status === "paid");
  const tombs = await db.collection("deletedaccounts").find({}).toArray();
  const tombText = JSON.stringify(tombs);
  check("left-behind record holds no phone/email/name", tombs.length === 1 && !tombText.includes(P10) && !tombText.includes(E10) && !tombText.includes("Del Me"));
  check("old session stops working", (await api("GET", "/auth/me", null, delToken)).status === 401);
  check("deleted account can't log in", (await api("POST", "/auth/login", { phone: P10, password: "delpass1" })).status === 401);

  await rewindThrottle("sms:signup:" + P10);
  await api("POST", "/auth/signup/request-otp", { phone: P10, email: E10 });
  r = await api("POST", "/auth/signup", { name: "Del Me Again", phone: P10, password: "delpass2", email: E10, otp: lastCode("sms", P10), referralCode: refCode });
  const againToken = r.json.token;
  const again = await db.collection("users").findOne({ phone: P10 });
  check("same number + email can sign up again", r.status === 201, `status ${r.status} ${r.json.message || ""}`);
  check("re-signup pays no second referral reward", (await credits()) === credAfterFirst, `credits ${await credits()}`);
  check("re-signup keeps already-used free tests", again && again.freeUsage && again.freeUsage.mockTestsUsed === 2, JSON.stringify(again && again.freeUsage));

  await db.collection("users").updateOne({ _id: again._id }, { $set: { role: "admin" } });
  r = await api("POST", "/auth/delete-account", { password: "delpass2" }, againToken);
  check("admin account can't be deleted from the app", r.status === 403 && !!(await db.collection("users").findOne({ _id: again._id })));

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) { console.log("\n--- server log tail ---\n" + log.split("\n").slice(-25).join("\n")); process.exit(1); }
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
