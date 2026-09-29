// Preloaded with `node -r`. Adds three routes to the app the moment
// server.js creates it - one that throws, one that takes its time, one that
// raises SIGTERM - so the error handler and the shutdown path can be
// exercised for real. Nothing in the app's own code is changed.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");
const expressPath = require.resolve("express", { paths: [SERVER] });
const express = require(expressPath);

function wrapped(...args) {
  const app = express(...args);

  app.get("/api/__boom", () => {
    throw new Error("connect ECONNREFUSED mongodb+srv://rankveer:hunter2@cluster0.mongodb.net");
  });

  app.get("/api/__slow", (req, res) => {
    setTimeout(() => res.json({ finished: true }), 1500);
  });

  // Windows has no POSIX signals: child.kill("SIGTERM") from the test would
  // terminate the process outright, which would test the operating system
  // rather than our shutdown code. Render runs Linux and really does deliver
  // SIGTERM, so this raises the same event in-process and the handler
  // server.js registered runs exactly as it does on a deploy.
  app.get("/api/__sigterm", (req, res) => {
    res.json({ raising: "SIGTERM" });
    setTimeout(() => process.emit("SIGTERM"), 50);
  });

  return app;
}
Object.assign(wrapped, express);
require.cache[expressPath].exports = wrapped;
