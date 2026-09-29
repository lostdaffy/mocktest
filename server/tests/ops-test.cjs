// The parts nobody sees until the worst moment: the health check, what a
// crash tells the student, what a Render deploy does to a request that is
// already running, and whether the indexes in the database match the models.
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const PORT = 5062;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);
const STUB = path.join(__dirname, "ops-stub.cjs");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

async function api(p) {
  const res = await fetch(BASE + p);
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const baseEnv = (uri, extra = {}) => ({
  ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT),
  TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
  EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", ALLOWED_ORIGINS: "",
  ...extra,
});

async function startServer(uri, extraEnv) {
  const srv = spawn(process.execPath, ["-r", STUB, "server.js"], { cwd: SERVER, env: baseEnv(uri, extraEnv) });
  srv.log = "";
  srv.stdout.on("data", (d) => (srv.log += d));
  srv.stderr.on("data", (d) => (srv.log += d));
  for (let i = 0; i < 80 && !/Server running/.test(srv.log); i++) await sleep(250);
  if (!/Server running/.test(srv.log)) { console.log(srv.log); throw new Error("server did not start"); }
  return srv;
}

(async () => {
  // ===================================================================
  // 1. Health check, error handler, graceful shutdown - as production
  // ===================================================================
  let mem = await MongoMemoryServer.create();
  let uri = mem.getUri() + "ops_test";
  let srv = await startServer(uri, { NODE_ENV: "production" });

  let r = await api("/health");
  check("health says ok while the database is reachable", r.status === 200 && r.json.status === "ok", `${r.status} ${r.json.status}`);
  check("...and names the database state, not just the web server", r.json.database === "connected", r.json.database);
  check("...with uptime, so a silent restart loop is visible", typeof r.json.uptimeSeconds === "number");

  // ---- what a crash shows a student
  r = await api("/__boom");
  check("an unexpected crash answers 500, not a hang", r.status === 500, String(r.status));
  check("the student gets plain Hindi, not a stack trace", r.json.message === "Kuch galat ho gaya. Thodi der baad try karo.", r.json.message);
  check("no connection string, host or password reaches the phone",
    !JSON.stringify(r.json).includes("mongodb") && !JSON.stringify(r.json).includes("hunter2") && r.json.error === undefined,
    JSON.stringify(r.json));
  const errorId = r.json.errorId;
  check("...but it carries an id support can search for", !!errorId && errorId.length >= 4, errorId);
  await sleep(200);
  check("the full error is in the server log under that same id",
    srv.log.includes(`[${errorId}]`) && srv.log.includes("hunter2"),
    srv.log.split("\n").find((l) => l.includes(`[${errorId}]`))?.slice(0, 60));

  const r2 = await api("/__boom");
  check("two crashes get two different ids", r2.json.errorId !== errorId, `${errorId} vs ${r2.json.errorId}`);

  // ---- a Render deploy in the middle of a request
  const inFlight = fetch(BASE + "/__slow").then(async (res) => ({ status: res.status, json: await res.json() })).catch((e) => ({ error: e.message }));
  await sleep(300); // it's running now
  await api("/__sigterm"); // exactly what Render sends on every deploy
  const finished = await inFlight;
  check("a request already running survives the deploy", finished.status === 200 && finished.json?.finished === true, JSON.stringify(finished));

  const exitCode = await new Promise((res) => srv.on("exit", res));
  check("the server then exits cleanly", exitCode === 0, `exit ${exitCode}`);
  check("...and says so, after closing the database", /Shutdown complete/.test(srv.log));
  check("it didn't have to be force-killed", !/didn't finish in 10s/.test(srv.log));

  // ===================================================================
  // 2. Health check when the database is gone
  // ===================================================================
  srv = await startServer(uri, { NODE_ENV: "production" });
  await mem.stop(); // Atlas unreachable

  let degraded = null;
  for (let i = 0; i < 40; i++) {
    const h = await api("/health").catch(() => null);
    if (h && h.status === 503) { degraded = h; break; }
    await sleep(500);
  }
  check("an unreachable database makes health fail, not pass", !!degraded, degraded ? `503 ${degraded.json.status}` : "stayed 200 for 20s");
  check("...and says which part is down", degraded?.json.database !== "connected", degraded?.json.database);
  srv.kill("SIGKILL");
  await new Promise((res) => srv.on("exit", res));

  // ===================================================================
  // 3. Indexes: does the database match the models?
  // ===================================================================
  mem = await MongoMemoryServer.create();
  uri = mem.getUri() + "index_test";

  // Async spawn, not spawnSync: spawnSync blocks this process's event loop,
  // which stops it draining the in-memory mongod's log pipe. Once that pipe
  // fills - which an index build's logging does - mongod blocks on write and
  // the whole thing deadlocks.
  const runSync = (args = []) =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, ["scripts/syncIndexes.js", ...args], { cwd: SERVER, env: baseEnv(uri) });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (out += d));
      child.on("exit", () => resolve(out));
    });

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // Two orders that somehow share one Razorpay order id - the exact shape of
  // a payment counted twice, and the reason the unique index exists.
  await db.collection("subscriptions").insertMany([
    { user: new mongoose.Types.ObjectId(), plan: "yearly", amount: 999, razorpayOrderId: "order_DUP", status: "paid", startDate: new Date(), endDate: new Date() },
    { user: new mongoose.Types.ObjectId(), plan: "yearly", amount: 999, razorpayOrderId: "order_DUP", status: "paid", startDate: new Date(), endDate: new Date() },
  ]);

  let out = await runSync();
  check("a report-only run lists what the database is missing", /missing/.test(out), out.split("\n").find((l) => l.includes("missing"))?.trim());
  check("...and changes nothing", /Nothing was changed/.test(out));
  check("report-only really left the indexes alone", (await db.collection("subscriptions").indexes()).length === 1);

  out = await runSync(["--apply"]);
  check("the duplicate order ids stop the unique index being built", /FAILED/.test(out), out.split("\n").find((l) => l.includes("FAILED"))?.trim());
  check("...and it says what to do about it, instead of failing silently", /duplicates exist/.test(out));

  await db.collection("subscriptions").deleteOne({ razorpayOrderId: "order_DUP" });
  out = await runSync(["--apply"]);
  check("once the duplicate is gone the index builds", !/FAILED/.test(out) && /created/.test(out), out.split("\n").find((l) => l.includes("Done"))?.trim());

  const subIdx = (await db.collection("subscriptions").indexes()).map((i) => i.name);
  check("razorpayOrderId is now unique - one order can never be two subscriptions",
    (await db.collection("subscriptions").indexes()).some((i) => i.key.razorpayOrderId && i.unique), subIdx.join(", "));

  // The indexes the slow screens depend on.
  const testIdx = (await db.collection("tests").indexes()).map((i) => JSON.stringify(i.key));
  check("practice lookups are indexed (Subject Practice was a full scan)",
    testIdx.includes(JSON.stringify({ type: 1, subject: 1, topic: 1 })), testIdx.length + " indexes");
  const qIdx = (await db.collection("questions").indexes()).map((i) => JSON.stringify(i.key));
  check("the duplicate-question key is indexed", qIdx.some((k) => k.includes("textKey")), qIdx.join(" "));

  // ---- same fields, wrong rules
  //
  // The shape that actually bit us: users.phone was unique but NOT sparse,
  // while the model asked for sparse. The index looked present, so a report
  // that only compared fields called it up to date - and a second account
  // without a phone would have been rejected for a duplicate it did not have.
  // The sync above already built it correctly, so put the bad version back
  // to recreate the situation found in production.
  await db.collection("users").dropIndex("phone_1").catch(() => {});
  await db.collection("users").createIndex({ phone: 1 }, { unique: true, name: "phone_1" });
  out = await runSync();
  check("an index with the right fields but the wrong rules is reported",
    out.includes("wrong") && out.includes(String.fromCharCode(34) + "phone" + String.fromCharCode(34) + ":1") && out.includes("sparse:"),
    out.split(String.fromCharCode(10)).find((l) => l.includes("wrong"))?.trim() || "not reported");

  out = await runSync(["--apply"]);
  const phoneIdx = (await db.collection("users").indexes()).find((i) => i.name === "phone_1");
  check("...and syncing rebuilds it with the rules the model asks for",
    phoneIdx && phoneIdx.unique === true && phoneIdx.sparse === true,
    JSON.stringify({ unique: phoneIdx?.unique, sparse: phoneIdx?.sparse }));

  out = await runSync();
  check("a second report says everything is up to date", !/missing/.test(out) && !/obsolete/.test(out),
    out.split("\n").filter((l) => l.includes("up to date")).length + " models up to date");

  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
