// The checker is asked for a 0-based index and often replies with a 1-based
// one. That is not a bug we can prompt away - it is what models do - and it
// was quietly rejecting correct questions: 1 in 7 of the first real batch.
// These tests pin down that a correct answer is recognised however the
// checker chooses to number it, and that a genuinely wrong one is still caught.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");
const fetchPath = require.resolve("node-fetch", { paths: [SERVER] });

process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_MIN_GAP_MS = "0";

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

// How the fake checker chooses to express its answer.
let mode = "zero-based";

function reply(body) {
  const prompt = JSON.parse(body).contents[0].parts.map((p) => p.text || "").join("\n");
  const blocks = prompt.split(/^Q(\d+)\. /m).slice(1);
  const answers = [];

  for (let i = 0; i < blocks.length; i += 2) {
    const qNo = Number(blocks[i]);
    const lines = blocks[i + 1].split("\n");

    let rightIndex = 0;
    let rightText = "";
    let wrongText = "";
    for (const line of lines) {
      const m = line.match(/^([0-3])\. (.*)$/);
      if (!m) continue;
      if (/RIGHT/.test(m[2])) {
        rightIndex = Number(m[1]);
        rightText = m[2];
      } else if (!wrongText) {
        wrongText = m[2];
      }
    }

    if (mode === "zero-based") answers.push({ q: qNo, correctIndex: rightIndex, confidence: 0.95 });
    if (mode === "one-based") answers.push({ q: qNo, correctIndex: rightIndex + 1, confidence: 0.95 });
    if (mode === "text") answers.push({ q: qNo, answer: rightText, confidence: 0.95 });
    if (mode === "text-reworded") answers.push({ q: qNo, answer: ` ${rightText.toUpperCase()} `, confidence: 0.95 });
    if (mode === "genuinely-wrong") answers.push({ q: qNo, answer: wrongText, correctIndex: (rightIndex + 1) % 4, confidence: 0.95 });
    // Two of the lite models answer "2. 6" for the 6 at index 2, every time.
    if (mode === "numbered-text") answers.push({ q: qNo, answer: rightIndex + ". " + rightText, confidence: 0.95 });
    if (mode === "nothing") answers.push({ q: qNo, confidence: 0.95 });
  }
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(answers) }] } }] };
}

require.cache[fetchPath] = {
  id: fetchPath,
  filename: fetchPath,
  loaded: true,
  exports: async (url, opts) => ({ ok: true, json: async () => reply(opts.body) }),
};

const { runValidationPipelineBatch } = require(path.join(SERVER, "services/validationPipeline"));

const question = (over = {}) => ({
  text: "What is twenty percent of two hundred rupees?",
  textHi: "दो सौ रुपये का बीस प्रतिशत कितना है?",
  options: ["wrong one", "wrong two", "wrong three", "RIGHT forty"],
  optionsHi: ["गलत एक", "गलत दो", "गलत तीन", "सही चालीस"],
  correctIndex: 3,
  solution: "20% of 200 = (20/100) * 200 = 40 rupees.",
  solutionHi: "200 का 20% = (20/100) * 200 = 40 रुपये।",
  subject: "Maths",
  topic: "Percentage",
  difficulty: "easy",
  source: "ai_generated",
  ...over,
});

const run = async (m, q = question()) => {
  mode = m;
  const [out] = await runValidationPipelineBatch([q]);
  return out;
};

(async () => {
  // ---- however the checker numbers its answer, a correct question passes
  let r = await run("zero-based");
  check("checker answers 0-based, as asked -> published", r.status === "published", `${r.status} ${r.flagReason || ""}`);

  r = await run("one-based");
  check("checker answers 1-based instead -> STILL published",
    r.status === "published", `${r.status} ${r.flagReason || ""}`);

  r = await run("text");
  check("checker answers with the option text -> published", r.status === "published", `${r.status} ${r.flagReason || ""}`);

  r = await run("numbered-text");
  check("a checker that prefixes the option number is understood", r.status === "published", r.status + " " + (r.flagReason || ""));

  r = await run("text-reworded");
  check("...even with different case and spacing", r.status === "published", `${r.status} ${r.flagReason || ""}`);

  // ---- and a real disagreement is still caught
  r = await run("genuinely-wrong");
  check("a checker that picks a different answer still flags the question",
    r.status === "under_review", `${r.status}`);
  check("...and the flag names the answer it gave, not a position",
    /it answered/.test(r.flagReason || "") && !/option \d/.test(r.flagReason || ""), r.flagReason);

  r = await run("nothing");
  check("no answer back from the checker -> flagged, never auto-published",
    r.status === "under_review" && /could not be completed/.test(r.flagReason || ""), r.flagReason);

  // ---- the solution rule judges working, not character count
  r = await run("zero-based", question({ solution: "(3/4) * 100 = 75%." }));
  check("a short solution that shows the working is accepted",
    r.status === "published", `${r.status} ${r.flagReason || ""}`);

  r = await run("zero-based", question({ solution: "Forty." }));
  check("a solution that just asserts the answer is rejected",
    r.status === "under_review" && /too short/.test(r.flagReason || ""), r.flagReason);

  r = await run("zero-based", question({ solution: "Because it is obvious." }));
  check("...and so is one that explains nothing, equals sign or not",
    r.status === "under_review" && /too short/.test(r.flagReason || ""), r.flagReason);

  r = await run("zero-based", question({ solution: "Take the fraction and multiply it by one hundred." }));
  check("a longer explanation in words is fine too", r.status === "published", `${r.status} ${r.flagReason || ""}`);

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
