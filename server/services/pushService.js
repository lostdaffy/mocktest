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
      if (!res.ok) {
        console.error("Push send failed:", res.status, await res.text());
        continue;
      }
      // Expo answers 200 even when a message failed; the failures are in
      // the per-message tickets. A phone that removed the app keeps failing
      // with DeviceNotRegistered - its token is dropped.
      const body = await res.json().catch(() => ({}));
      const tickets = Array.isArray(body.data) ? body.data : [];
      const gone = [];
      tickets.forEach((t, i) => {
        if (t?.status === "ok") sent += 1;
        else if (t?.details?.error === "DeviceNotRegistered") gone.push(batch[i]);
        else if (t?.status === "error") console.error("Push ticket error:", t.details?.error || t.message);
      });
      if (!tickets.length) sent += batch.length;
      if (gone.length) {
        const User = require("../models/User");
        await User.updateMany({ pushToken: { $in: gone } }, { $unset: { pushToken: 1 }, pushError: "App removed from the phone" });
      }
    } catch (err) {
      console.error("Push send error:", err.message);
    }
  }
  return { sent };
}

module.exports = { sendPushNotifications };
