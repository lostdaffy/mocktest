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

app.use(cors());
// Raised from 2mb to fit base64-encoded PYQ PDF uploads (a ~15mb source PDF
// becomes ~20mb once base64-encoded). Keep individual PDF uploads under
// ~15mb for reliability - split a very long paper by section if needed.
app.use(express.json({ limit: "25mb" }));

// Basic rate limiting to protect free-tier hosting from abuse
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use("/api", limiter);

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