// The admin's reference papers: the AI learns the level and style from them,
// and never copies them.
//  - a reference is read once (through the queue) into a description of how
//    it is built; only that description reaches the generator's prompt
//  - the reference's own questions never reach a prompt, and a generated
//    question that copies one - even with the numbers changed - is dropped
//  - the admin can edit what was learned, switch a reference off, delete it
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
process.env.GEMINI_API_KEY = "test-key";

// The model, faked at the HTTP layer so the real prompt-building code runs.
const sent = [];
const REF_Q = "A shopkeeper marks his goods 40% above cost price and allows a discount of 25%. Find his profit percent.";
require.cache[require.resolve(path.join(SERVER, "node_modules/node-fetch"))] = {
  exports: async (url, opts) => {
    const body = JSON.parse(opts.body);
    const parts = body.contents[0].parts;
    const prompt = parts.map((p) => p.text || "").join("\n");
    sent.push({ prompt, hasFile: parts.some((p) => p.inline_data) });
    let answer;
    if (/Write the LESSONS/.test(prompt)) {
      answer = { lessons: ["Always run the full calculation and make sure the marked option is its result.", "Never give two options with the same value."] };
    } else if (/LEARN HOW IT IS BUILT/.test(prompt)) {
      answer = {
        summary: "A Maths paper of two-step arithmetic at SSC CGL standard.",
        level: "Most questions need two steps; options are close together.",
        difficulty: "20/50/30",
        topics: [{ topic: "Profit and Loss", count: 4 }, { topic: "Percentage", count: 3 }],
        formats: ["marked price and discount, find the profit percent", "successive percentage change"],
        language: "Short, direct sentences.",
        options: "Wrong options are the single-step answer and the answer with the discount on cost price.",
        traps: ["taking the discount on cost price instead of marked price"],
        questions: [REF_Q, "The price of sugar rises by 20%. By what percent must a family cut consumption to keep spending the same?"],
      };
    } else {
      answer = [];
    }
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }), text: async () => "" };
  },
};

const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 160) + "]" : ""}`);
};
const call = (fn, req) =>
  new Promise((resolve) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
    fn({ user: { name: "Admin" }, query: {}, params: {}, body: {}, ...req }, res);
  });

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "references");
  const ReferenceGuide = require(path.join(SERVER, "models/ReferenceGuide"));
  const GenerationJob = require(path.join(SERVER, "models/GenerationJob"));
  const ctrl = require(path.join(SERVER, "controllers/referenceController"));
  const { readReference, guidanceFor } = require(path.join(SERVER, "services/referenceLearning"));
  const gemini = require(path.join(SERVER, "services/geminiService"));

  // ---- adding one
  let r = await call(ctrl.addReference, { body: { examType: "SSC_CGL", subject: "Maths", title: "Coaching mock 1", text: `Q1. ${REF_Q}\n(a) 5% (b) 10% (c) 15% (d) 20%` } });
  check("a reference can be added as pasted text", r.status === 201 && r.body.reference?.status === "queued", JSON.stringify(r.body));
  const id = r.body.reference._id;
  const job = await GenerationJob.findOne({ kind: "reference_read", reference: id }).lean();
  check("...and is queued to be read, ahead of other work", job && job.status === "queued" && job.priority > 0);
  r = await call(ctrl.addReference, { body: { examType: "SSC_CGL", subject: "Maths", text: `Q1. ${REF_Q}\n(a) 5% (b) 10% (c) 15% (d) 20%` } });
  check("the same reference twice is refused", r.status === 409, r.body.message);
  r = await call(ctrl.addReference, { body: { subject: "Maths", text: "x" } });
  check("one without an exam is refused", r.status === 400);
  r = await call(ctrl.addReference, { body: { examType: "SSC_CGL", pdf: "data:application/pdf;base64," + Buffer.from("not a pdf").toString("base64") } });
  check("a file that is not a PDF is refused", r.status === 400, r.body.message);

  // ---- reading it
  const msg = await readReference(id);
  const g = await ReferenceGuide.findById(id).select("+stems +payload").lean();
  check("reading it records how the paper is built", g.status === "ready" && g.blueprint.formats.length === 2 && g.blueprint.topics.length === 2, msg);
  check("...keeps its questions only for the copy check", g.stemCount === 2 && g.stems[0] === REF_Q);
  check("...and drops the uploaded file once read", !g.payload);
  check("what reaches the generator has the level and formats", /two-step/.test(g.guideText) && /successive percentage change/.test(g.guideText), g.guideText);
  check("...and none of the reference's questions", !g.guideText.includes("shopkeeper") && !g.guideText.includes("sugar"));

  // ---- the generator's prompt
  sent.length = 0;
  await gemini.generateQuestions({ examType: "SSC_CGL", examDisplayName: "SSC CGL", subject: "Maths", topic: "Profit and Loss", difficulty: "medium", count: 2 });
  const genPrompt = sent.map((s) => s.prompt).find((p) => /expert question setter/.test(p)) || "";
  check("the generation prompt carries what was learned", /LEVEL AND STYLE TO MATCH/.test(genPrompt) && /two-step/.test(genPrompt), genPrompt.slice(0, 100));
  check("...tells the model to write new questions only", /never reuse a reference question/i.test(genPrompt));
  check("...and never contains a reference question", !genPrompt.includes("shopkeeper marks his goods") && !genPrompt.includes("price of sugar"));
  check("another subject's prompt does not get it", (await guidanceFor("SSC_CGL", "English")) === "");
  check("another exam's does not either", (await guidanceFor("SSC_GD", "Maths")) === "");

  // ---- the admin's controls
  r = await call(ctrl.updateReference, { params: { id }, body: { guideText: "Level: hard two-step sums only." } });
  check("the admin can rewrite what was learned", r.status === 200 && (await guidanceFor("SSC_CGL", "Maths")).includes("hard two-step sums only"));
  r = await call(ctrl.updateReference, { params: { id }, body: { active: false } });
  check("...switch it off, and the prompt stops carrying it", (await guidanceFor("SSC_CGL", "Maths")) === "");
  await call(ctrl.updateReference, { params: { id }, body: { active: true } });
  r = await call(ctrl.listReferences, {});
  check("the list never sends the reference questions or the file", r.body.references.length === 1 && !("stems" in r.body.references[0]) && !("payload" in r.body.references[0]));

  // ---- the AI's own mistakes become lessons
  const { refreshLessons } = require(path.join(SERVER, "services/lessons"));
  const RejectedQuestion = require(path.join(SERVER, "models/RejectedQuestion"));
  await RejectedQuestion.insertMany(Array.from({ length: 6 }, (_, i) => ({ text: `Sum ${i}`, subject: "Maths", reason: "verification_failed", detail: "the working gives another option" })));
  await RejectedQuestion.insertMany(Array.from({ length: 9 }, (_, i) => ({ text: `Twin ${i}`, subject: "GK", reason: "duplicate" })));
  const learned = await refreshLessons();
  check("rejected questions are turned into lessons, subject by subject", learned.length === 1 && learned[0].subject === "Maths" && learned[0].lessons === 2, JSON.stringify(learned));
  check("...repeats are not counted as mistakes to learn from", !learned.some((l) => l.subject === "GK"));
  const withLessons = await guidanceFor("SSC_CGL", "Maths");
  check("...and the lessons reach the generator for that subject", /never repeat them/.test(withLessons) && /same value/.test(withLessons), withLessons.slice(-160));
  check("...for every exam", /same value/.test(await guidanceFor("RRB_GROUP_D", "Maths")));
  await refreshLessons();
  check("refreshing again updates the same lessons, not a second copy", (await ReferenceGuide.countDocuments({ kind: "lessons" })) === 1);

  // ---- a generated question that copies the reference is dropped
  require(path.join(__dirname, "mock-stub.cjs"));
  gemini.generateQuestions = async ({ count }) =>
    gemini.tagGenerated(
      [
        // the reference question with its numbers changed - still a copy
        { text: "A shopkeeper marks his goods 50% above cost price and allows a discount of 20%. Find his profit percent.", options: ["20%", "25%", "30%", "15%"], correctIndex: 0, solution: "1.5 x 0.8 = 1.2, so 20%." },
        { text: "A trader buys 30 pens for the price of 25 and sells them at cost. What is the gain percent?", options: ["20%", "25%", "15%", "10%"], correctIndex: 0, solution: "30/25 = 1.2, so 20%." },
      ].slice(0, count),
      { examType: "SSC_CGL", subject: "Maths", topic: "Profit and Loss", difficulty: "medium" }
    );
  const { createVerifiedQuestions } = require(path.join(SERVER, "services/questionFactory"));
  const built = await createVerifiedQuestions({ needed: 2, maxRounds: 1, generateParams: { examType: "SSC_CGL", subject: "Maths", topic: "Profit and Loss", difficulty: "medium" } });
  const kept = await mongoose.connection.db.collection("questions").find({ _id: { $in: built.ids } }).toArray();
  const dropped = await mongoose.connection.db.collection("rejectedquestions").findOne({ reason: "reference_copy" });
  check("a copy of a reference question, numbers changed, is thrown out", kept.length === 1 && /trader/.test(kept[0].text) && !!dropped, JSON.stringify({ kept: kept.map((k) => k.text), dropped: dropped?.detail }));

  // ---- removing it
  r = await call(ctrl.deleteReference, { params: { id } });
  check("a reference can be deleted", r.status === 200 && !(await ReferenceGuide.exists({ _id: id })));

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
