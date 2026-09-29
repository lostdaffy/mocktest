// Pacing and retry: requests to Gemini must go out one at a time with a
// gap, and a rate-limit reply must be waited out instead of failing.
// (What a test costs in calls, and the quality gate itself, are covered by
// quality-test.cjs and quality-gate-test.cjs.)
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

const calls = [];
let nextResponses = []; // queue of forced replies, e.g. a 429

function question(n) {
  return {
    text: `Fake question ${n} about percentage and ratio`,
    textHi: `नकली प्रश्न ${n} प्रतिशत और अनुपात पर`,
    options: ["first option", "second option", "third option", "fourth option"],
    optionsHi: ["पहला विकल्प", "दूसरा विकल्प", "तीसरा विकल्प", "चौथा विकल्प"],
    correctIndex: 0,
    solution: "Work through the ratio step by step and the first option comes out correct.",
    solutionHi: "अनुपात को चरण दर चरण हल करने पर पहला विकल्प सही आता है।",
  };
}

function fakeReply(body) {
  const prompt = JSON.parse(body).contents[0].parts.map((p) => p.text || "[file]").join("\n");
  calls.push({ at: Date.now(), prompt });

  if (nextResponses.length) {
    const forced = nextResponses.shift();
    return { ok: false, status: forced.status, text: async () => forced.body };
  }

  let payload;
  if (/Solve each multiple-choice question|Solve this multiple-choice question/.test(prompt)) {
    // Answer by content, wherever the shuffle moved the right option.
    const blocks = prompt.split(/^Q(\d+)\. /m).slice(1);
    payload = [];
    for (let i = 0; i < blocks.length; i += 2) {
      let idx = 0;
      for (const line of blocks[i + 1].split("\n")) {
        const m = line.match(/^([0-3])\. (.*)$/);
        if (m && /first option/.test(m[2])) idx = Number(m[1]);
      }
      payload.push({ q: Number(blocks[i]), correctIndex: idx, confidence: 0.95 });
    }
  } else {
    const wanted = Number((prompt.match(/Generate exactly (\d+)/) || [])[1] || 1);
    payload = Array.from({ length: wanted }, () => question(calls.length + "-" + Math.random().toString(36).slice(2, 6)));
  }

  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }) };
}

const fetchPath = require.resolve("node-fetch", { paths: [SERVER] });
require.cache[fetchPath] = { id: fetchPath, filename: fetchPath, loaded: true, exports: async (url, opts) => fakeReply(opts.body) };

process.env.GEMINI_API_KEY = "fake-key";
process.env.GEMINI_MIN_GAP_MS = "120"; // the real default is 4500ms; keep the test quick

const { generateQuestions, verifyQuestions } = require(path.join(SERVER, "services/geminiService"));

(async () => {
  // ---- calls are spaced, never fired back to back
  calls.length = 0;
  const questions = await generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "easy", count: 12 });
  await verifyQuestions(questions);
  const gaps = calls.slice(1).map((c, i) => c.at - calls[i].at);
  check("12 questions generated", questions.length === 12, `${questions.length}`);
  check("every call is spaced out from the last", gaps.every((g) => g >= 110), `gaps: ${gaps.join(",")}ms`);

  // ---- a 429 is waited out and retried, honouring Gemini's own delay
  calls.length = 0;
  nextResponses = [{ status: 429, body: '{"error":{"message":"quota","details":[{"retryDelay":"1s"}]}}' }];
  const started = Date.now();
  const afterLimit = await generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "easy", count: 3 });
  check("a rate-limit reply is retried, not surfaced as a failure", afterLimit.length === 3, `${afterLimit.length} questions`);
  check("...after waiting the delay Gemini asked for", Date.now() - started >= 3000, `${Date.now() - started}ms`);

  // ---- "model is busy" (503) must be waited out too. Not retrying this
  // once cost 24 rebuilt practice tests in one go.
  calls.length = 0;
  nextResponses = [
    { status: 503, body: JSON.stringify({ error: { code: 503, message: "This model is currently experiencing high demand.", status: "UNAVAILABLE" } }) },
  ];
  const busyStart = Date.now();
  const afterBusy = await generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "easy", count: 3 });
  check("a busy model (503) is retried, not treated as a failure", afterBusy.length === 3, afterBusy.length + " questions");
  check("...after a real pause", Date.now() - busyStart >= 10000, (Date.now() - busyStart) + "ms");

  // ---- a 400 is a real mistake and must NOT be retried forever
  calls.length = 0;
  nextResponses = [{ status: 400, body: JSON.stringify({ error: { code: 400, message: "bad request" } }) }];
  let rejected = null;
  try { await generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "easy", count: 2 }); }
  catch (e) { rejected = e.message; }
  check("a genuine error is reported straight away", /400/.test(rejected || ""), (rejected || "no error").slice(0, 60));
  check("...without burning retries on it", calls.length === 1, calls.length + " calls");

  // ---- two admins generating at once must not double the request rate
  calls.length = 0;
  const t0 = Date.now();
  await Promise.all([
    generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "A", difficulty: "easy", count: 2 }),
    generateQuestions({ examType: "PRACTICE", subject: "GK", topic: "B", difficulty: "easy", count: 2 }),
    generateQuestions({ examType: "PRACTICE", subject: "Reasoning", topic: "C", difficulty: "easy", count: 2 }),
  ]);
  const parallelGaps = calls.slice(1).map((c, i) => c.at - calls[i].at);
  check("parallel generations queue up instead of firing together",
    calls.length === 3 && parallelGaps.every((g) => g >= 110), `gaps: ${parallelGaps.join(",")}ms, total ${Date.now() - t0}ms`);

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
