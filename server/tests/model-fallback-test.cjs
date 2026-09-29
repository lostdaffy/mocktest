// The free tier allows 500 requests a day per model, and a full question bank
// needs more. The allowances are separate, so when one model is spent the next
// carries the same day's work at the same quality. A 429 for the per-MINUTE
// limit must not do that - that one clears in seconds and burning a model on
// it would waste the whole allowance.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");
const fetchPath = require.resolve("node-fetch", { paths: [SERVER] });

process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_MIN_GAP_MS = "0";
process.env.GEMINI_MODEL = "model-one,model-two,model-three";

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

// What the fake API does, per call.
let script = [];
const calls = [];

const dailyQuota = JSON.stringify({
  error: {
    code: 429,
    message: "You exceeded your current quota",
    details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier", quotaValue: "500" }] }],
  },
});
const minuteQuota = JSON.stringify({
  error: {
    code: 429,
    message: "You exceeded your current quota",
    details: [{ violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }] }, { retryDelay: "1s" }],
  },
});

require.cache[fetchPath] = {
  id: fetchPath,
  filename: fetchPath,
  loaded: true,
  exports: async (url) => {
    const model = String(url).match(/models\/([^:]+):/)[1];
    calls.push(model);
    const next = script.shift() || "ok";
    if (next === "daily") return { ok: false, status: 429, text: async () => dailyQuota };
    if (next === "minute") return { ok: false, status: 429, text: async () => minuteQuota };
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ said: model }) }] } }] }),
    };
  },
};

const gem = require(path.join(SERVER, "services/geminiService"));

(async () => {
  check("the models are read in order", gem.GEMINI_MODELS.join(",") === "model-one,model-two,model-three", gem.GEMINI_MODELS.join(","));
  check("...starting with the first", gem.currentModel() === "model-one", gem.currentModel());

  // ---- an ordinary call uses the first model
  calls.length = 0;
  script = [];
  let out = await gem.callGemini("hello");
  check("an ordinary call goes to the first model", out.said === "model-one", out.said);

  // ---- the per-minute limit is waited out, NOT escaped by changing model
  calls.length = 0;
  script = ["minute"];
  out = await gem.callGemini("hello");
  check("a per-minute limit is waited out on the same model",
    out.said === "model-one" && calls.every((c) => c === "model-one"), calls.join(" -> "));
  check("...and the model has not moved on", gem.currentModel() === "model-one", gem.currentModel());

  // ---- the daily allowance moves to the next model
  calls.length = 0;
  script = ["daily"];
  out = await gem.callGemini("hello");
  check("a spent daily allowance hands over to the next model", out.said === "model-two", out.said);
  check("...and it tried the first one before giving up on it",
    calls[0] === "model-one" && calls[1] === "model-two", calls.join(" -> "));
  check("...and stays there for the calls that follow", gem.currentModel() === "model-two", gem.currentModel());

  calls.length = 0;
  script = [];
  out = await gem.callGemini("hello");
  check("...it does not drift back to the spent one", out.said === "model-two", out.said);

  // ---- and again, to the last one
  calls.length = 0;
  script = ["daily"];
  out = await gem.callGemini("hello");
  check("the next one being spent moves on again", out.said === "model-three", out.said);

  // ---- when every model is spent, the error is real
  calls.length = 0;
  script = ["daily", "daily", "daily", "daily", "daily"];
  let failed = null;
  try {
    await gem.callGemini("hello");
  } catch (e) {
    failed = e.message;
  }
  check("with nothing left, it fails rather than looping", !!failed, String(failed).slice(0, 60));
  check("...and the error names the model that refused", /model-three/.test(failed || ""), String(failed).slice(0, 80));

  const bad = results.filter((x) => !x.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed`);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
