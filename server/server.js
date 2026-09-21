require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");

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

// Not fatal - the app still works - but "forgot password" is dead until
// this is set, and nobody notices until a student is locked out.
if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
  console.warn(
    "⚠️  EMAIL_USER / EMAIL_APP_PASSWORD not set - password reset emails will fail. See services/emailService.js for setup."
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

// CORS allowlist, driven by the ALLOWED_ORIGINS env var (comma-separated,
// e.g. "https://rankveer.com,https://admin.rankveer.com").
//
// Left UNSET, this stays wide open exactly as before - that's deliberate, so
// deploying this change can't knock the admin panel offline before the real
// domains exist. Set the variable in Render once the domains are live and
// browser access is locked to your own sites.
//
// Requests with NO Origin header are always allowed. That is not a hole:
// native mobile apps, server-to-server calls and the Razorpay webhook don't
// send one, and CORS is a browser-enforced policy in the first place - it
// protects users from other *websites* calling this API with their
// credentials, it was never what stops a direct (curl/Postman) request.
// Actual authorisation is the JWT + adminOnly middleware on each route.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn(
    "⚠️  ALLOWED_ORIGINS is not set - CORS is open to every website. " +
      "Set it (e.g. https://rankveer.com,https://admin.rankveer.com) once your domains are live."
  );
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
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
app.post("/api/auth/login", authLimit(10, phoneKey), authLimit(300));
app.post("/api/auth/signup/request-otp", authLimit(5, phoneKey), authLimit(30));
app.post("/api/auth/signup", authLimit(15, phoneKey));
app.post("/api/auth/forgot-password", authLimit(5, phoneKey), authLimit(60));
app.post("/api/auth/reset-password", authLimit(10, phoneKey), authLimit(60));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

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

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong", error: err.message });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // The only background job in this app - see server/jobs/liveExamScheduler.js
  // for what it does. Runs every 30s for the lifetime of the process.
  const { runLiveExamTick } = require("./jobs/liveExamScheduler");
  setInterval(runLiveExamTick, 30_000);
}

start();

module.exports = app;