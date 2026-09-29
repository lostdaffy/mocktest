// Quality-vs-free-tier checks: small batches, no lazy repeated questions,
// and a per-generation budget that still fits Gemini's free limits.
// Gemini is replaced by a fake HTTP layer - no key, no network, no cost.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

const calls = [];
let questionFactory = null; // lets a test decide what the fake model returns

function fakeReply(body) {
  const prompt = JSON.parse(body).contents[0].parts.map((p) => p.text || "[file]").join("\n");
  calls.push({ prompt });

  const isVerification = /Solve each multiple-choice question|Solve this multiple-choice question/.test(prompt);
  let payload;

  if (isVerification) {
    const n = (prompt.match(/^Q\d+\. /gm) || ["one"]).length;
    payload = Array.from({ length: n }, (_, i) => ({ q: i + 1, correctIndex: 0, confidence: 0.95 }));
  } else {
    const wanted = Number((prompt.match(/Generate exactly (\d+)/) || [])[1] || 1);
    payload = (questionFactory || defaultFactory)(wanted, calls.length, prompt);
  }

  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }) };
}

const q = (text) => ({
  text,
  textHi: "प्रश्न",
  options: ["a", "b", "c", "d"],
  optionsHi: ["a", "b", "c", "d"],
  correctIndex: 0,
  solution: "because",
  solutionHi: "क्योंकि",
});
const defaultFactory = (wanted, callNo) => Array.from({ length: wanted }, (_, i) => q(`Question ${callNo}-${i}`));

const fetchPath = require.resolve("node-fetch", { paths: [SERVER] });
require.cache[fetchPath] = { id: fetchPath, filename: fetchPath, loaded: true, exports: async (url, opts) => fakeReply(opts.body) };

process.env.GEMINI_API_KEY = "fake-key";
process.env.GEMINI_MIN_GAP_MS = "1"; // pacing is covered by gemini-rate-test

const { generateQuestions, verifyQuestions } = require(path.join(SERVER, "services/geminiService"));

(async () => {
  // ---- questions are asked for in small groups, not one big lazy batch
  calls.length = 0;
  questionFactory = null;
  let got = await generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "easy", count: 12 });
  const asked = calls.map((c) => Number((c.prompt.match(/Generate exactly (\d+)/) || [])[1]));
  check("still returns the full 12 questions", got.length === 12, `${got.length}`);
  check("asked in small groups, not one batch of 12", asked.every((n) => n <= 6) && asked.length >= 2, `batches: ${asked.join("+")}`);

  // ---- the prompt actively fights the lazy tail
  const prompt = calls[0].prompt;
  check("tells the model the last question must match the first", /LAST question must take the same effort/.test(prompt));
  check("forbids re-using a question with swapped numbers", /only the numbers or names swapped/i.test(prompt));
  check("prefers fewer questions over filler", /Quality beats quantity/.test(prompt));
  check("later batches are told what was already asked", /ALREADY ASKED/.test(calls[1].prompt));

  // ---- a model that repeats itself doesn't get repeats into the test
  calls.length = 0;
  let firstBatch = true;
  questionFactory = (wanted) => {
    const repeats = firstBatch;
    firstBatch = false;
    // A realistic lazy model: the first batch repeats itself, later ones don't.
    return Array.from({ length: wanted }, (_, i) => q(repeats && i < 2 ? "What is 15% of 240?" : `Unique ${Math.random()}`));
  };
  got = await generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "easy", count: 10 });
  const texts = got.map((x) => x.text);
  const normalized = texts.map((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  check("repeated questions are dropped, not saved", new Set(normalized).size === normalized.length, `${texts.length} questions, ${new Set(normalized).size} unique`);
  check("...and the missing ones are topped up", got.length === 10, `${got.length}`);

  // ---- near-identical wording counts as a repeat too
  calls.length = 0;
  questionFactory = (wanted) => Array.from({ length: wanted }, (_, i) => q(i % 2 === 0 ? "What is 15% of 240?" : "what is 15 % of 240 ??"));
  got = await generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "easy", count: 4 });
  check("same question in different punctuation is caught", got.length === 1, `${got.length} kept: ${got.map((x) => x.text).join(" | ")}`);
  check("a model that keeps repeating is given up on, not chased forever", calls.length <= 5, `${calls.length} calls`);

  // ---- checking is also done in small groups
  calls.length = 0;
  questionFactory = null;
  const many = Array.from({ length: 12 }, (_, i) => q(`Check me ${i}`));
  const verdicts = await verifyQuestions(many);
  check("all 12 still get checked", verdicts.length === 12, `${verdicts.length}`);
  check("checked in groups of 6, not all at once", calls.length === 2, `${calls.length} verification calls`);

  // ---- the free tier still comfortably fits
  calls.length = 0;
  const practice = await generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "easy", count: 12 });
  await verifyQuestions(practice);
  check("one practice test costs 4 calls (free tier allows 15/min)", calls.length === 4, `${calls.length} calls`);

  calls.length = 0;
  for (let batch = 0; batch < 9; batch++) {
    const qs = await generateQuestions({ examType: "SSC_CGL", subject: "Maths", topic: "Maths", difficulty: "easy", count: 12 });
    await verifyQuestions(qs);
  }
  check("a 108-question mock costs 36 calls, was ~117", calls.length === 36, `${calls.length} calls`);

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
