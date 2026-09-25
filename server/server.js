require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const { paymentsEnabled } = require("./controllers/paymentController");

const authRoutes = require("./routes/authRoutes");
const questionRoutes = require("./routes/questionRoutes");
const testRoutes = require("./routes/testRoutes");
const examRoutes = require("./routes/examRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const examSeriesRoutes = require("./routes/examSeriesRoutes");
const liveExamRoutes = require("./routes/liveExamRoutes");
const pyqRoutes = require("./routes/pyqRoutes");
const couponRoutes = require("./routes/couponRoutes");

// Security check: refuse to start with placeholder secrets. This catches
// the common mistake of copying .env.example without changing these values -
// if JWT_SECRET is guessable/default, anyone could forge login tokens.
function validateEnv() {
  const problems = [];
  const placeholders = ["change_this_to_a_long_random_string", "change_this_to_another_long_random_string"];

  if (!process.env.JWT_SECRET || placeholders.includes(process.env.JWT_SECRET)) {
    problems.push("JWT_SECRET is missing or still the placeholder value from .env.example");
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 20) {
    problems.push("JWT_SECRET is too short (use at least 20+ random characters)");
  }
  if (!process.env.MONGO_URI) {
    problems.push("MONGO_URI is missing");
  }

  if (problems.length > 0) {
    console.error("\n🚨 STARTUP BLOCKED - fix your .env file:\n");
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error("\nTip: generate a strong secret with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n");
    process.exit(1);
  }
}

validateEnv();

if (!paymentsEnabled()) {
  console.warn(
    "⚠️  Payments are OFF - Razorpay test keys (or no keys) configured. Put the rzp_live_ keys in the environment to turn them on."
  );
}

// Not fatal - the app still works - but "forgot password" is dead until
// this is set, and nobody notices until a student is locked out.
if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
  console.warn(
    "⚠️  EMAIL_USER / EMAIL_APP_PASSWORD not set - password reset emails will fail. See services/emailService.js for setup."
  );
}

// Render sets RENDER=true on every deploy. If we are running there and
// NODE_ENV was never set, the app is in development mode in production:
// Express skips its production optimisations, and the error handler
// attaches the real exception message to replies that go to students.
// It was live like this and nothing said so.
if (process.env.RENDER && process.env.NODE_ENV !== "production") {
  console.warn(
    "⚠️  NODE_ENV is not \"production\" on a deployed server. " +
      "Internal error messages are being sent to clients. Set NODE_ENV=production."
  );
}

const app = express();

// Render (and most PaaS hosts) sit in front of the app as a reverse proxy,
// adding an X-Forwarded-For header with the real client IP. Without this,
// express-rate-limit can't tell users apart (it would rate-limit everyone
// as if they were Render's proxy IP) and throws a validation error on every
// request. "1" trusts exactly one hop - Render's own proxy - rather than
// blindly trusting the whole chain, which matters if this ever runs behind
// additional proxies/CDNs later.
app.set("trust proxy", 1);

// Security headers. Deliberately hand-written rather than pulling in a
// package: this is a JSON API, so only a handful of headers actually do
// anything for it, and each one below is here for a stated reason.
//
// The server was answering every request with "X-Powered-By: Express",
// which tells an attacker what to look up known exploits for and buys us
// nothing in return.
app.disable("x-powered-by");

app.use((req, res, next) => {
  // Don't let a browser second-guess our Content-Type and run a JSON
  // response as if it were a script.
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Nothing here is ever meant to be displayed inside someone else's page.
  res.setHeader("X-Frame-Options", "DENY");
  // Never leak the URL a request came from - those can carry ids.
  res.setHeader("Referrer-Policy", "no-referrer");
  // Once a browser has seen this, it refuses to talk to us over plain HTTP
  // again - so a student on cafe wifi cannot be downgraded and listened to.
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// CORS allowlist. ALLOWED_ORIGINS (comma-separated) overrides the default.
// The sites this API is actually for. Used when ALLOWED_ORIGINS is not set,
// so the safe behaviour is the DEFAULT rather than something that has to be
// remembered. This used to fall back to allowing every website, which was
// the right call while the domains didn't exist yet - but the domains are
// live now, and a deployment that forgets one environment variable should
// not quietly reopen the API to the whole web.
const DEFAULT_ORIGINS = ["https://rankveer.com", "https://www.rankveer.com"];

const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length ? configuredOrigins : DEFAULT_ORIGINS;

if (!configuredOrigins.length) {
  console.warn(
    `⚠️  ALLOWED_ORIGINS is not set - falling back to ${DEFAULT_ORIGINS.join(", ")}. ` +
      "Set it in the environment if the admin panel is served from anywhere else."
  );
}

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header at all: native mobile apps, server-to-server calls
      // and the Razorpay webhook. CORS is a browser policy - it protects a
      // user from OTHER websites spending their credentials, and was never
      // what stops a direct curl request. Authorisation is the JWT and the
      // adminOnly middleware on each route.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Local development, never in production.
      if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Blocked by CORS: ${origin} is not an allowed origin`));
    },
    credentials: true,
  })
);
// Raised from 2mb to fit base64-encoded PYQ PDF uploads (a ~15mb source PDF
// becomes ~20mb once base64-encoded). Keep individual PDF uploads under
// ~15mb for reliability - split a very long paper by section if needed.
// verify() captures the raw bytes alongside the normal parse - the
// Razorpay webhook needs the exact raw body to check its signature, which
// isn't recoverable once JSON.parse has already run.
app.use(
  express.json({
    limit: "25mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// General API traffic - generous, because a student actively taking a test
// legitimately fires many requests (loading questions, saving answers,
// checking sections). This exists to catch runaway/abusive clients, not to
// throttle normal use. 300/15min (~20/min) was too tight for that and would
// have started blocking real students under real load - especially ones
// sharing an IP behind a college or cyber-cafe NAT, which is common for
// this audience.
//
// Keyed per LOGGED-IN USER where possible, not per IP. Most Indian mobile
// users sit behind carrier-grade NAT, so thousands of real students can
// share one public IP - an IP-only limit would start blocking genuine
// users exactly when traffic peaks (e.g. everyone opening a live exam at
// once). Only a token with a valid signature earns its own bucket;
// anything else falls back to the IP, so inventing random tokens can't be
// used to dodge the limit.
const tokenUserId = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => (tokenUserId(req) ? 1200 : 3000),
  keyGenerator: (req) => {
    const userId = tokenUserId(req);
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", generalLimiter);

// Auth endpoints: a tight limit per (IP + phone number), plus a looser one
// per IP. The per-phone limit is what stops someone hammering one account;
// the per-IP one caps a single machine spraying many different numbers,
// while staying generous enough for a whole carrier-NAT'd city behind one
// IP. The real protections sit deeper, in the database: per-account login
// lockout, per-number SMS limits and per-code attempt limits (see
// authController.js) - these just shed obvious abuse early and cheaply.
const phoneKey = (req) => `${req.ip}|${String(req.body?.phone || "").trim()}`;
const tooMany = { message: "Bahut zyada requests. Kuch minute baad dobara try karo." };

const authLimit = (max, keyGenerator) =>
  rateLimit({ windowMs: 15 * 60 * 1000, max, keyGenerator, message: tooMany, standardHeaders: true, legacyHeaders: false });

// app.post (exact path), NOT app.use: app.use matches by prefix, so a
// limiter on "/api/auth/signup" would also count every
// "/api/auth/signup/request-otp" call and lock a real student out of
// finishing signup after a resend and a couple of mistyped codes.
// 20, not 10: the account itself locks for a day after 10 wrong passwords
// (see MAX_LOGIN_FAILURES), so this limiter only needs to stop request
// floods. At 10 it fired first and a genuine student saw "too many
// requests" instead of the countdown telling them how many tries were left.
app.post("/api/auth/login", authLimit(20, phoneKey), authLimit(300));
app.post("/api/auth/signup/request-otp", authLimit(5, phoneKey), authLimit(30));
app.post("/api/auth/signup", authLimit(15, phoneKey));
app.post("/api/auth/forgot-password", authLimit(5, phoneKey), authLimit(60));
app.post("/api/auth/reset-password", authLimit(10, phoneKey), authLimit(60));

// Health check. Reports the DATABASE state too, because "the web server is
// up" is not the same as "the app works" - a server that can't reach Mongo
// answers every request with an error while looking perfectly healthy here.
app.get("/api/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = states[require("mongoose").connection.readyState] || "unknown";
  const healthy = dbState === "connected";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    database: dbState,
    // So "did my deploy actually go live?" can be answered from a browser,
    // without reading Render's logs.
    version: require("./package.json").version,
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date(),
  });
});

// GET /api/app-config -> what the mobile app checks on every launch.
//
// This is the escape hatch that makes it safe to ship the app pointed at
// the Render URL today: if we ever need every student off an old build (a
// hosting move, a breaking API change, a serious bug), raise
// APP_MIN_VERSION in Render's environment and any older install shows a
// blocking "Update required" screen on its next launch - no code change,
// no redeploy of the app.
//
// Public (no auth) on purpose: it has to work before login, and an expired
// session must never stop a student from being told to update.
app.get("/api/app-config", (req, res) => {
  res.json({
    minVersion: process.env.APP_MIN_VERSION || "0.0.0",
    latestVersion: process.env.APP_LATEST_VERSION || null,
    androidStoreUrl:
      process.env.ANDROID_STORE_URL ||
      "https://play.google.com/store/apps/details?id=com.satya.smarttestengine",
    updateMessage: process.env.APP_UPDATE_MESSAGE || null,
    // false while Razorpay is on test keys - the app shows "coming soon"
    // instead of a buy button (see paymentController.paymentsEnabled).
    paymentsEnabled: paymentsEnabled(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/exam-series", examSeriesRoutes);
app.use("/api/live-exams", liveExamRoutes);
app.use("/api/pyq", pyqRoutes);
app.use("/api/admin/coupons", couponRoutes);

// Fallback error handler.
//
// The full error goes to the server log with a short id; the student only
// gets that id. An exception message can carry a database name, a file path
// or part of a query, and none of that belongs on a phone screen - but
// without an id, "something went wrong" is unsupportable: nobody can find
// which error it was.
app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.error(`[${errorId}] ${req.method} ${req.originalUrl} ->`, err.stack || err.message);

  res.status(err.status || 500).json({
    message: "Kuch galat ho gaya. Thodi der baad try karo.",
    errorId,
    // Only while developing, never from the deployed server.
    ...(process.env.NODE_ENV === "production" ? {} : { error: err.message }),
  });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // The only background job in this app - see server/jobs/liveExamScheduler.js
  // for what it does. Runs every 30s for the lifetime of the process.
  const { runLiveExamTick } = require("./jobs/liveExamScheduler");
  const tick = setInterval(runLiveExamTick, 30_000);

  // Render sends SIGTERM on every deploy and then kills the process. Without
  // this, requests in flight at that moment are cut off mid-answer - and the
  // worst possible moment for that is a student submitting a live exam.
  // Finish what's already started, then close the database cleanly.
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received - finishing in-flight requests, then shutting down...`);
    clearInterval(tick);

    const forceExit = setTimeout(() => {
      console.error("Requests didn't finish in 10s - shutting down anyway.");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await require("mongoose").connection.close();
      } catch (_) {
        // closing on the way out - nothing useful left to do about it
      }
      console.log("Shutdown complete.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // A promise nobody caught used to take the whole server down silently,
  // logging nothing. Log it and keep serving - one broken request must not
  // end the session of everyone mid-exam.
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });
}

start();

module.exports = app;