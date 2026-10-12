// "I gave a student 3 months from the admin panel - the app still shows tests
// locked." Apps before 1.2.0 keep the plan they saw at sign-in, so a plan
// change has to send them back to sign in once; 1.2.0+ re-reads it itself.
// Real server, throwaway in-memory MongoDB.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const bcrypt = require(path.join(SERVER, "node_modules/bcryptjs"));
const PORT = 5071;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

async function api(method, p, { body, token, version } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "okhttp/4.9.2",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(version ? { "X-App-Version": version } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "plan_refresh_test";
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
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await sleep(250);
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  await db.collection("users").insertMany([
    { name: "Admin", phone: "9000000001", email: "admin@test.com", role: "admin", referralCode: "ADM",
      passwordHash: await bcrypt.hash("adminpass1", 10) },
    { name: "Old App", phone: "9000000002", email: "old@test.com", role: "student", referralCode: "OLD",
      examGoals: ["SSC_CGL"], passwordHash: await bcrypt.hash("studentpw1", 10) },
    { name: "New App", phone: "9000000003", email: "new@test.com", role: "student", referralCode: "NEW",
      examGoals: ["SSC_CGL"], passwordHash: await bcrypt.hash("studentpw1", 10) },
  ]);
  const login = async (phone, password) =>
    (await api("POST", "/auth/login", { body: { phone, password } })).json.token;

  const admin = await login("9000000001", "adminpass1");
  const oldApp = await login("9000000002", "studentpw1");
  const newApp = await login("9000000003", "studentpw1");
  const oldUser = await db.collection("users").findOne({ phone: "9000000002" });
  const newUser = await db.collection("users").findOne({ phone: "9000000003" });

  check("before any change, an old app is signed in normally", (await api("GET", "/auth/me", { token: oldApp })).status === 200);

  // Tokens carry whole seconds; make sure the change lands in a later second.
  await sleep(1100);

  let r = await api("PATCH", `/admin/users/${oldUser._id}/subscription`, { token: admin, body: { action: "grant", plan: "quarterly" } });
  check("admin grants 3 months", r.status === 200 && r.json.user.subscriptionStatus === "active", r.json.message);
  check("the admin is told the student may need to sign in again", /sign in again/i.test(r.json.message || ""), r.json.message);

  r = await api("GET", "/auth/me", { token: oldApp });
  check("an app older than 1.2.0 is sent back to sign in (the code it acts on)",
    r.status === 401 && r.json.code === "TOKEN_INVALID" && r.json.reason === "PLAN_CHANGED",
    `${r.status} ${r.json.code || ""} ${r.json.reason || ""}`);

  const oldAgain = await login("9000000002", "studentpw1");
  r = await api("GET", "/auth/me", { token: oldAgain });
  check("after signing in again it works...", r.status === 200);
  check("...and the app now sees the plan", r.json.user?.subscriptionStatus === "active" && new Date(r.json.user.subscriptionExpiresAt) > new Date(),
    `${r.json.user?.subscriptionStatus} ${r.json.user?.subscriptionExpiresAt}`);

  // The 1.2.0 app re-reads /auth/me itself, so it is never thrown out.
  await sleep(1100);
  r = await api("PATCH", `/admin/users/${newUser._id}/subscription`, { token: admin, body: { action: "grant", plan: "half_yearly" } });
  check("admin grants 6 months to the second student", r.status === 200);
  r = await api("GET", "/auth/me", { token: newApp, version: "1.2.0" });
  check("an app on 1.2.0 stays signed in", r.status === 200, `${r.status}`);
  check("...and reads the new plan straight away", r.json.user?.subscriptionStatus === "active");
  r = await api("GET", "/auth/me", { token: newApp, version: "1.10.3" });
  check("a later version (1.10.3) counts as new too", r.status === 200);
  r = await api("GET", "/auth/me", { token: newApp, version: "1.1.1" });
  check("1.1.1 still counts as old", r.status === 401 && r.json.reason === "PLAN_CHANGED");

  // Revoking is a plan change too.
  const oldThird = await login("9000000002", "studentpw1");
  await sleep(1100);
  r = await api("PATCH", `/admin/users/${oldUser._id}/subscription`, { token: admin, body: { action: "revoke" } });
  check("admin revokes", r.status === 200);
  r = await api("GET", "/auth/me", { token: oldThird });
  check("an old app is sent to sign in after a revoke as well", r.status === 401 && r.json.reason === "PLAN_CHANGED");

  // The admin's own session is never affected by changing a plan.
  check("the admin panel stays signed in throughout", (await api("GET", "/auth/me", { token: admin })).status === 200);

  // Students who were not touched keep working.
  const untouched = await login("9000000003", "studentpw1");
  check("a student whose plan did not change in between is not affected", (await api("GET", "/auth/me", { token: untouched })).status === 200);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();
  const passed = results.filter((x) => x.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
