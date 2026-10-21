// Blueprints: the list of question ideas a practice series is written from.
// In-process, against a throwaway in-memory MongoDB; the AI is a fake that
// records what it was asked. Nothing here spends the Gemini allowance.
//
//   node tests/blueprint-test.cjs
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `   [${detail}]` : ""}`);
};

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "blueprint_test");
  const bp = require(path.join(SERVER, "services/blueprints"));
  const Blueprint = require(path.join(SERVER, "models/Blueprint"));
  const params = { subject: "Maths", chapter: "Percentage", topic: "Successive Percentage Change", level: "medium" };

  // ---- only ideas that really differ are kept
  const kept = bp.distinctIdeas([
    "Net percentage change after two successive increases",
    "Net percentage change after two successive increases",
    "net percentage change after two successive increases",
    "The change that brings a value back to where it started",
    { not: "a string" },
    "short",
    "1. Expenditure when price rises and consumption falls",
  ]);
  check("repeats, non-strings and fragments are dropped", kept.length === 3, JSON.stringify(kept));
  check("a leading number is taken off", kept.includes("Expenditure when price rises and consumption falls"));

  // ---- the first call drafts the blueprint with the AI, once
  const asked = [];
  const ideas = Array.from({ length: 30 }, (_, i) => `Idea number ${i + 1} about ${["prices", "salaries", "areas", "fares", "discounts", "rents"][i % 6]} and ${["successive", "reverse", "combined", "restoring", "comparing"][i % 5]} change ${["A", "B", "C", "D", "E", "F", "G"][i % 7]}`);
  const draft = async (prompt) => { asked.push(prompt); return ideas; };
  let got = await bp.nextIdeas(params, 12, { draft });
  check("a series with no blueprint gets one drafted", asked.length === 1 && got.length === 12, `${asked.length} call(s), ${got.length} ideas`);
  check("the draft prompt names the chapter, topic and level", /Percentage/.test(asked[0]) && /Successive Percentage Change/.test(asked[0]) && /medium/.test(asked[0]));
  const stored = await Blueprint.findOne({ subject: "Maths", chapter: "Percentage", topic: "Successive Percentage Change", level: "medium" }).lean();
  check("it is saved, marked as written by the AI", stored && stored.source === "ai" && stored.ideas.length >= 18, `${stored?.ideas.length}`);

  // ---- later calls do not ask again, and rotate through the ideas
  got = await bp.nextIdeas(params, 12, { draft });
  check("a series with a blueprint does not ask the AI again", asked.length === 1);
  await bp.markUsed(params, got.map((i) => i.id));
  const next = await bp.nextIdeas(params, 12, { draft });
  const overlap = next.filter((i) => got.some((g) => g.id === i.id)).length;
  check("used ideas go to the back: the next test gets different ones", overlap === 0, `${overlap} repeated`);

  // ---- an idea the admin switched off is not used
  await Blueprint.updateOne({ _id: stored._id, "ideas._id": next[0].id }, { $set: { "ideas.$.active": false } });
  const after = await bp.nextIdeas(params, 30, { draft });
  check("an idea switched off is never handed out", !after.some((i) => i.id === next[0].id));

  // ---- no AI today: generation simply goes on without ideas
  const none = await bp.nextIdeas({ ...params, topic: "Population Growth and Depreciation" }, 10, { draft: async () => { throw new Error("quota"); } });
  check("when the AI cannot draft one, there are no ideas and nothing breaks", Array.isArray(none) && none.length === 0);

  // ---- the generator puts the ideas, one per question, into its prompt
  const gemini = require(path.join(SERVER, "services/geminiService"));
  const prompts = [];
  const realCall = gemini.callGemini;
  // generateOneBatch calls callGemini through the module's own scope, so the
  // fake goes in at the network: node-fetch, as fake-model-stub does.
  const fetchPath = require.resolve("node-fetch", { paths: [SERVER] });
  require.cache[fetchPath] = { id: fetchPath, filename: fetchPath, loaded: true, exports: async (url, opts) => {
    prompts.push(JSON.parse(opts.body).contents[0].parts.map((p) => p.text || "").join("\n"));
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "[]" }] } }] }) };
  } };
  delete require.cache[require.resolve(path.join(SERVER, "services/geminiService"))];
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  const fresh = require(path.join(SERVER, "services/geminiService"));
  await fresh.generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "medium", count: 3, ideas: ["Idea alpha one", "Idea beta two", "Idea gamma three"], levelNote: "two or three steps" }).catch(() => []);
  const p0 = prompts[0] || "";
  check("the prompt lists the ideas, one per question", /QUESTION IDEAS/.test(p0) && /1\. Idea alpha one/.test(p0) && /3\. Idea gamma three/.test(p0), p0.slice(0, 80));
  check("...and says what the level means", /What this level means here: two or three steps/.test(p0));
  check("a request without ideas has no ideas block", true && !(await (async () => {
    prompts.length = 0;
    await fresh.generateQuestions({ examType: "PRACTICE", subject: "Maths", topic: "Percentage", difficulty: "medium", count: 2 }).catch(() => []);
    return /QUESTION IDEAS/.test(prompts[0] || "");
  })()));
  gemini.callGemini = realCall;

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
