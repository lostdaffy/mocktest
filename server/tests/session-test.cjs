// "Where am I logged in, and can I actually kick that device out?"
// Real server, throwaway in-memory MongoDB.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const bcrypt = require(path.join(SERVER, "node_modules/bcryptjs"));
const PORT = 5062;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

async function api(method, p, { body, token, agent } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(agent ? { "User-Agent": agent } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const LAPTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const PHONE = "Mozilla/5.0 (Linux; Android 13; SM-A520F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
const APP = "okhttp/4.9.2";

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "session_test";
  const srv = spawn(process.execPath, ["server.js"], {
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

  // An admin account, because admins are the ones allowed on several devices.
  await db.collection("users").insertOne({
    name: "Admin", phone: "9000000001", email: "admin@test.com", role: "admin", referralCode: "ADM",
    passwordHash: await bcrypt.hash("adminpass1", 10),
  });

  const login = async (agent) => {
    const r = await api("POST", "/auth/login", { body: { phone: "9000000001", password: "adminpass1" }, agent });
    return r.json.token;
  };

  // ---- three devices
  const laptop = await login(LAPTOP);
  const phone = await login(PHONE);
  const app = await login(APP);
  check("admin can be signed in on several devices", !!laptop && !!phone && !!app);

  let r = await api("GET", "/auth/sessions", { token: laptop });
  check("all three sessions are listed", r.status === 200 && r.json.sessions.length === 3, `${r.json.sessions?.length}`);
  check("each one is named in a way a person recognises",
    r.json.sessions.map((s) => s.device).sort().join(" | ") === "Chrome on Android | Chrome on Windows | Rankveer app",
    r.json.sessions.map((s) => s.device).join(" | "));
  check("the device asking is marked as the current one",
    r.json.sessions.filter((s) => s.current).length === 1 &&
      r.json.sessions.find((s) => s.current).device === "Chrome on Windows",
    r.json.sessions.find((s) => s.current)?.device);
  check("IP and times are shown", r.json.sessions.every((s) => s.ip && s.startedAt && s.lastSeenAt));

  // ---- ending one device
  const phoneSession = r.json.sessions.find((s) => s.device === "Chrome on Android");
  r = await api("DELETE", `/auth/sessions/${phoneSession._id}`, { token: laptop });
  check("a device can be logged out from another device", r.status === 200, r.json.message);

  r = await api("GET", "/auth/me", { token: phone });
  check("...and that device really is locked out on its next request",
    r.status === 401 && r.json.code === "SESSION_REVOKED", `${r.status} ${r.json.code || ""}`);

  r = await api("GET", "/auth/me", { token: laptop });
  check("the device that did it stays signed in", r.status === 200);

  r = await api("GET", "/auth/sessions", { token: laptop });
  check("the ended session disappears from the list", r.json.sessions.length === 2);

  // ---- "log out everywhere else"
  r = await api("POST", "/auth/sessions/revoke-others", { token: laptop });
  check("one click signs out every other device", r.status === 200 && r.json.revoked === 1, JSON.stringify(r.json));
  check("the app session is gone", (await api("GET", "/auth/me", { token: app })).status === 401);
  check("this device still works", (await api("GET", "/auth/me", { token: laptop })).status === 200);
  r = await api("GET", "/auth/sessions", { token: laptop });
  check("only this device is left", r.json.sessions.length === 1 && r.json.sessions[0].current);

  // ---- nobody can see or touch someone else's sessions
  await db.collection("users").insertOne({
    name: "Student", phone: "9000000002", email: "s@test.com", role: "student", referralCode: "STU",
    passwordHash: await bcrypt.hash("studentpw1", 10),
  });
  const studentToken = (await api("POST", "/auth/login", { body: { phone: "9000000002", password: "studentpw1" }, agent: APP })).json.token;
  r = await api("GET", "/auth/sessions", { token: studentToken });
  check("a student only ever sees their own sessions", r.json.sessions.length === 1 && r.json.sessions[0].device === "Rankveer app");

  const adminSessionId = (await api("GET", "/auth/sessions", { token: laptop })).json.sessions[0]._id;
  r = await api("DELETE", `/auth/sessions/${adminSessionId}`, { token: studentToken });
  check("one account cannot end another account's session", r.status === 404, `${r.status}`);
  check("the admin session survives that attempt", (await api("GET", "/auth/me", { token: laptop })).status === 200);

  // ---- logging out ends the session properly
  r = await api("POST", "/auth/logout", { token: studentToken });
  check("logout is accepted", r.status === 200, r.json.message);
  check("...and the token stops working immediately", (await api("GET", "/auth/me", { token: studentToken })).status === 401);

  // ---- a password reset throws every device out
  const student2 = await db.collection("users").findOne({ phone: "9000000002" });
  const freshToken = (await api("POST", "/auth/login", { body: { phone: "9000000002", password: "studentpw1" }, agent: PHONE })).json.token;
  await db.collection("users").updateOne(
    { _id: student2._id },
    { $set: { passwordResetOTPHash: await bcrypt.hash("123456", 10), passwordResetExpires: new Date(Date.now() + 600000), passwordResetAttempts: 0 } }
  );
  r = await api("POST", "/auth/reset-password", { body: { phone: "9000000002", code: "123456", newPassword: "brandnew1" } });
  check("password reset works", r.status === 200, r.json.message);
  check("...and signs every device out", (await api("GET", "/auth/me", { token: freshToken })).status === 401);
  const leftover = await db.collection("sessions").countDocuments({ user: student2._id, revokedAt: null });
  check("no session is left marked active after a reset", leftover === 0, `${leftover} still active`);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) { console.log("\n--- server log tail ---\n" + log.split("\n").slice(-15).join("\n")); process.exit(1); }
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
