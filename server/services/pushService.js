// Sends push notifications via Expo's push API - no SDK/account needed,
// just a plain HTTPS POST per https://docs.expo.dev/push-notifications/sending-notifications/
// This is what actually lands a notification in the phone's notification
// bar when the app is backgrounded or closed.

const fetch = require("node-fetch");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100; // Expo's recommended max tokens per request

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// tokens: string[] of Expo push tokens (e.g. "ExponentPushToken[...]").
// Invalid/malformed tokens are filtered out here rather than left for Expo
// to reject the whole batch over.
async function sendPushNotifications(tokens, { title, body, data } = {}) {
  const validTokens = (tokens || []).filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));
  if (validTokens.length === 0) return { sent: 0 };

  let sent = 0;
  for (const batch of chunk(validTokens, CHUNK_SIZE)) {
    const messages = batch.map((to) => ({ to, title, body, data, sound: "default" }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(messages),
      });
      if (res.ok) sent += batch.length;
      else console.error("Push send failed:", res.status, await res.text());
    } catch (err) {
      console.error("Push send error:", err.message);
    }
  }
  return { sent };
}

module.exports = { sendPushNotifications };
