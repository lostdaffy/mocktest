// app.json holds the config; this only adds Firebase once its file is here.
// Push on Android needs google-services.json (from the Firebase console,
// project rankveer-1bafe). Until it is dropped into mobile/, builds go on
// without it rather than failing.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const file = path.join(__dirname, "google-services.json");
  if (!fs.existsSync(file)) return config;
  return { ...config, android: { ...config.android, googleServicesFile: "./google-services.json" } };
};
