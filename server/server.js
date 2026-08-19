require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const questionRoutes = require("./routes/questionRoutes");
const testRoutes = require("./routes/testRoutes");
const examRoutes = require("./routes/examRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const examSeriesRoutes = require("./routes/examSeriesRoutes");
const pyqRoutes = require("./routes/pyqRoutes");

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

const app = express();

// Render (and most PaaS hosts) sit in front of the app as a reverse proxy,
// adding an X-Forwarded-For header with the real client IP. Without this,
// express-rate-limit can't tell users apart (it would rate-limit everyone
// as if they were Render's proxy IP) and throws a validation error on every
// request. "1" trusts exactly one hop - Render's own proxy - rather than
// blindly trusting the whole chain, which matters if this ever runs behind
// additional proxies/CDNs later.
app.set("trust proxy", 1);

app.use(cors());
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
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1200 });
app.use("/api", generalLimiter);

// Auth/OTP endpoints get their own, much stricter limit - this is where
// abuse actually costs money (SMS credits) or enables account takeover
// attempts, so it's worth being tight here even though it's generous
// everywhere else.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/login-otp", authLimiter);
app.use("/api/auth/signup/request-otp", authLimiter);
app.use("/api/auth/request-otp", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/exam-series", examSeriesRoutes);
app.use("/api/pyq", pyqRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong", error: err.message });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();

module.exports = app;