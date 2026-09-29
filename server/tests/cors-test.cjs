// Who is allowed to call this API from a browser, and does forgetting one
// environment variable reopen it to everybody?
const { spawn } = require("child_process");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const PORT = 5062;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "x".repeat(40);

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer(uri, extra) {
  const srv = spawn(process.execPath, ["server.js"], {
    cwd: SERVER,
    env: {
      ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT),
      TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
      EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "",
      ALLOWED_ORIGINS: "", NODE_ENV: "", ...extra,
    },
  });
  srv.log = "";
  srv.stdout.on("data", (d) => (srv.log += d));
  srv.stderr.on("data", (d) => (srv.log += d));
  for (let i = 0; i < 80 && !/Server running/.test(srv.log); i++) await sleep(250);
  if (!/Server running/.test(srv.log)) { console.log(srv.log); throw new Error("server did not start"); }
  return srv;
}

const allowedFor = async (origin) => {
  const res = await fetch(BASE + "/health", { headers: origin ? { Origin: origin } : {} });
  return res.headers.get("access-control-allow-origin");
};

const stop = async (srv) => { srv.kill("SIGKILL"); await new Promise((r) => srv.on("exit", r)); };

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "cors_test";

  // ---- production, nothing configured
  let srv = await startServer(uri, { NODE_ENV: "production" });
  check("a random website is refused even with nothing configured",
    (await allowedFor("https://evil-example.com")) === null, String(await allowedFor("https://evil-example.com")));
  check("the real site is allowed by default", (await allowedFor("https://rankveer.com")) === "https://rankveer.com",
    String(await allowedFor("https://rankveer.com")));
  check("...and so is the www version", (await allowedFor("https://www.rankveer.com")) === "https://www.rankveer.com");
  check("the mobile app (no Origin header at all) still works", (await fetch(BASE + "/health")).status === 200);
  check("localhost is NOT allowed in production", (await allowedFor("http://localhost:5173")) === null,
    String(await allowedFor("http://localhost:5173")));
  check("the log says which origins it fell back to", /falling back to https:\/\/rankveer\.com/.test(srv.log));
  await stop(srv);

  // ---- an explicit allowlist replaces the default
  srv = await startServer(uri, { NODE_ENV: "production", ALLOWED_ORIGINS: "https://admin.rankveer.com" });
  check("a configured allowlist is used", (await allowedFor("https://admin.rankveer.com")) === "https://admin.rankveer.com");
  check("...and it replaces the default rather than adding to it",
    (await allowedFor("https://rankveer.com")) === null, String(await allowedFor("https://rankveer.com")));
  await stop(srv);

  // ---- development
  srv = await startServer(uri, { NODE_ENV: "" });
  check("localhost works while developing", (await allowedFor("http://localhost:5173")) === "http://localhost:5173",
    String(await allowedFor("http://localhost:5173")));
  check("...but a random website still isn't allowed", (await allowedFor("https://evil-example.com")) === null);
  await stop(srv);

  // ---- security headers
  srv = await startServer(uri, { NODE_ENV: "production" });
  const res = await fetch(BASE + "/health");
  const h = (n) => res.headers.get(n);
  check("the server no longer announces what it is built with", h("x-powered-by") === null, String(h("x-powered-by")));
  check("a JSON reply can not be sniffed into a script", h("x-content-type-options") === "nosniff");
  check("the API can not be framed by another site", h("x-frame-options") === "DENY");
  check("referring URLs are not leaked onward", h("referrer-policy") === "no-referrer");
  check("browsers are told never to fall back to plain HTTP", (h("strict-transport-security") || "").startsWith("max-age="), h("strict-transport-security"));
  await stop(srv);

  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
