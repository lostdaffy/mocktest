// Preloaded into the server under test for admin-tools-test: push
// notifications are recorded to a file instead of going to Expo.
const fs = require("fs");
const path = require("path");
const push = require(path.join(__dirname, "..", "services/pushService"));
const OUT = process.env.PUSH_LOG;

push.sendPushNotifications = async (tokens, msg) => {
  const valid = (tokens || []).filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));
  fs.appendFileSync(OUT, JSON.stringify({ tokens: valid, title: msg.title, data: msg.data }) + "\n");
  return { sent: valid.length, errors: [] };
};
