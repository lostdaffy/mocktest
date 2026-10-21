// Nightly chapter health: every chapter's practice tests checked the way the
// chapter-health screen checks them, and each fault handed to the quality
// desk. In-process, against a throwaway in-memory MongoDB; the quality desk's
// replacement writer is a fake, so nothing here spends the Gemini allowance.
//
//   node tests/nightly-health-test.cjs
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
  await mongoose.connect(mem.getUri() + "nightly_health_test");
  const Subject = require(path.join(SERVER, "models/Subject"));
  const Question = require(path.join(SERVER, "models/Question"));
  const Test = require(path.join(SERVER, "models/Test"));
  const QualityFix = require(path.join(SERVER, "models/QualityFix"));
  const QualitySettings = require(path.join(SERVER, "models/QualitySettings"));
  const GenerationJob = require(path.join(SERVER, "models/GenerationJob"));
  const desk = require(path.join(SERVER, "services/qualityDesk"));
  const nh = require(path.join(SERVER, "services/nightlyHealth"));

  // The replacement writer: a fresh question each time, or the AI out of allowance.
  let made = 0;
  let aiOut = false;
  desk.buildReplacement = async (q) => {
    if (aiOut) throw new Error("Every model has used its allowance for today");
    made++;
    // As the real one: a draft question, returned by id.
    const r = await Question.create({ examType: ["PRACTICE"], subject: "Maths", topic: "Percentage", source: "ai_generated", status: "draft", text: `Replacement ${made} for ${q._id}`, options: ["1", "2", "3", "4"], correctIndex: 0, solution: "1" });
    return r._id;
  };
  const applied = [];
  desk.applyFix = async (id) => { applied.push(String(id)); return { ok: true }; };

  await Subject.create({ name: "Maths", chapters: [{ name: "Percentage" }, { name: "Ratio" }] });

  // Distinct, clean questions: each asks something different, with its own numbers.
  const SUBJECTS = ["a pen", "a bag", "a lamp", "a shirt", "a watch", "a chair", "a kettle", "a radio", "a bicycle", "a table", "a clock", "a camera"];
  const VERBS = ["Find", "Work out", "Calculate", "Determine"];
  const clean = (i) => ({
    text: `${VERBS[i % 4]} what ${12 + i}% of the price of ${SUBJECTS[i % SUBJECTS.length]} costing ₹${(i + 3) * 150} amounts to, in rupees.`,
    options: [`₹${((12 + i) * (i + 3) * 1.5).toFixed(0)}`, "₹1", "₹2", "₹3"],
    correctIndex: 0,
    solution: `${12 + i}% of ₹${(i + 3) * 150} = ₹${((12 + i) * (i + 3) * 1.5).toFixed(0)}.`,
  });
  // Hindi carrying the same numbers, so the rule gate has nothing to say about it.
  const nums = (s) => (String(s).match(/[\d.,]+%?/g) || []).join(", ");
  const make = (fields) =>
    Question.create({
      examType: ["PRACTICE"], subject: "Maths", topic: "Percentage", chapter: "Percentage", source: "manual", difficulty: "easy", status: "published",
      textHi: `प्रश्न: ${nums(fields.text)} का मान ज्ञात कीजिए।`,
      optionsHi: fields.options,
      solutionHi: `हल: ${nums(fields.solution)} होता है।`,
      ...fields,
    });

  const qs = [];
  for (let i = 0; i < 8; i++) qs.push(await make(clean(i)));
  // The same question twice in one test.
  const twinA = await make({ text: "What is 35% of ₹4,200?", options: ["₹1,470", "₹1,400", "₹1,500", "₹1,370"], correctIndex: 0, solution: "35% of 4200 = 1470." });
  const twinB = await make({ text: "What is 35% of ₹4,200 ?", options: ["₹1,470", "₹1,400", "₹1,500", "₹1,370"], correctIndex: 0, solution: "35% of 4200 = 1470." });
  // Maths written as LaTeX.
  const latex = await make({ text: "Find \\frac{3}{4} of 80% of 600.", options: ["360", "480", "300", "400"], correctIndex: 0, solution: "\\frac{3}{4} × 480 = 360." });
  // One pattern drilled seven times.
  const drill = [];
  for (let i = 0; i < 7; i++) {
    const p = 100 * (i + 2);
    drill.push(await make({ text: `A shop sells a pen at ₹${p}. Find its price after a 10% rise.`, options: [`₹${p * 1.1}`, "₹1", "₹2", "₹3"], correctIndex: 0, solution: `${p} × 1.1 = ${p * 1.1}.` }));
  }

  const base = { type: "practice", examType: "PRACTICE", subject: "Maths", topic: "Percentage", durationMinutes: 20, difficultyLevel: "easy", publishStatus: "published" };
  await Test.create({ ...base, title: "Percentage · Easy #1", questions: [...qs.slice(0, 4), twinA, twinB, latex].map((q) => q._id) });
  await Test.create({ ...base, title: "Percentage · Easy #2", questions: [...qs.slice(4, 8), ...drill].map((q) => q._id) });

  // ---- the faults are found
  const faults = await nh.chapterFaults("Percentage");
  const ids = new Set(faults.map((f) => f.id));
  check("the second of two twins is a fault", ids.has(String(twinB._id)), faults.map((f) => f.reason.slice(0, 50)).join(" | "));
  check("the first twin is kept", !ids.has(String(twinA._id)));
  check("LaTeX maths is a fault", ids.has(String(latex._id)));
  const drillFaults = drill.filter((q) => ids.has(String(q._id))).length;
  check(`a pattern drilled 7 times: the 2 above ${nh.MAX_SAME_PATTERN_IN_TEST} are faults`, drillFaults === 7 - nh.MAX_SAME_PATTERN_IN_TEST, `${drillFaults}`);
  check("the first drills stay", !ids.has(String(drill[0]._id)) && !ids.has(String(drill[4]._id)));
  check("clean questions are not faults", qs.every((q) => !ids.has(String(q._id))));
  check("one entry per question", ids.size === faults.length);

  // ---- approval mode: proposals wait for the admin, at most `max` a night
  const r1 = await nh.runNightlyHealth({ max: 2 });
  check("only chapters with practice tests are checked", r1.chapters === 1, `${r1.chapters}`);
  check("at most `max` replacements a night", r1.proposed === 2, JSON.stringify(r1));
  check("the rest is left for the next night", r1.left === faults.length - 2, `${r1.left}`);
  check("approval mode applies nothing", applied.length === 0 && r1.applied === 0);
  const pending = await QualityFix.find({ status: "pending" }).lean();
  check("proposals are saved as health fixes", pending.length === 2 && pending.every((f) => f.source === "health" && f.kind === "replace"));

  // ---- a question already waiting is not proposed again
  const r2 = await nh.runNightlyHealth({ max: 50 });
  check("waiting proposals are skipped", r2.waiting === 2 && r2.proposed === faults.length - 2, JSON.stringify(r2));
  check("nothing is proposed twice", (await QualityFix.countDocuments({})) === faults.length);

  // ---- auto mode applies what it proposes
  await QualityFix.deleteMany({});
  await QualitySettings.updateOne({ key: "quality" }, { $set: { mode: "auto" } }, { upsert: true });
  const r3 = await nh.runNightlyHealth({ max: 3 });
  check("auto mode applies each replacement", r3.applied === 3 && applied.length === 3, JSON.stringify(r3));

  // ---- the AI running out stops the night, and says so
  await QualityFix.deleteMany({});
  aiOut = true;
  const r4 = await nh.runNightlyHealth({ max: 5 });
  check("AI out of allowance stops the run", r4.aiOut === true && r4.proposed === 0, JSON.stringify(r4));
  check("the note says the allowance ran out", /allowance ran out/.test(nh.healthNote(r4)));
  aiOut = false;

  // ---- queued once per IST night, never in the day
  const night = new Date("2026-10-21T19:00:00Z"); // 00:30 IST on 22 Oct
  const j1 = await nh.queueNightlyHealth(night);
  const j2 = await nh.queueNightlyHealth(new Date(night.getTime() + 60 * 60 * 1000));
  check("the night tick queues one chapter_health job", j1 && j1.kind === "chapter_health" && /2026-10-22/.test(j1.label), j1 && j1.label);
  check("a second tick the same night queues nothing", j2 === null);
  const day = await nh.queueNightlyHealth(new Date("2026-10-22T02:00:00Z")); // 07:30 IST
  check("the morning tick queues nothing", day === null);
  const next = await nh.queueNightlyHealth(new Date(night.getTime() + 24 * 60 * 60 * 1000));
  check("the next night queues again", next && /2026-10-23/.test(next.label));
  check("two jobs in all", (await GenerationJob.countDocuments({ kind: "chapter_health" })) === 2);

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
