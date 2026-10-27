// One idea asked twice in one paper, in other words (services/sameIdea.js).
//
// The questions are real, read out of the bank (same-idea-questions.json):
// u2_N is question N of UPTET Paper 1 Mock #2 as it was built on 22 Oct 2026,
// before 39 of its questions were rewritten by hand on 26 Oct; u1_ is UPTET
// Mock #1, who1/2 Super TET Mock #1, work/shop the early Agniveer and RRB
// NTPC mocks. The two Kohlberg stage 2 / stage 3 questions are written for
// this test: no mock has a stage 2 question.
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const SERVER = path.resolve(__dirname, "..");
const Q = require("./same-idea-questions.json");
const { sameIdeaInPaper, conceptMatch } = require(path.join(SERVER, "services/sameIdea"));
const { sameFactInPaper, looksLikeRepeat } = require(path.join(SERVER, "services/validationPipeline"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 160) + "]" : ""}`);
};
const score = (a, b) => conceptMatch(a, b)?.score ?? "-";

// ---- repeats that went out in UPTET Mock #2. Each pair both ways.
const REPEATS = [
  ["three dyslexia questions: read, spell, decode / reverses 'b' and 'd'", "u2_2", "u2_17"],
  ["...read, spell, decode / reversing 'b' and 'd', decoding", "u2_2", "u2_27"],
  ["...both reversing 'b' and 'd'", "u2_17", "u2_27"],
  ["two dyscalculia questions", "u2_16", "u2_28"],
  ["two Kohlberg punishment / pre-conventional", "u2_4", "u2_19"],
  ["two CCE as holistic evaluation", "u2_9", "u2_29"],
  ["two 'heredity sets the potential'", "u2_10", "u2_26"],
  ["two intrinsic motivation", "u2_11", "u2_22"],
  ["two home language as a resource", "u2_13", "u2_14"],
  ["Maths: two '1/2 + 1/3 = 2/5' error questions", "u2_110", "u2_115"],
  ["Maths: the same 45 m x 30 m park, perimeter / fencing cost", "u2_113", "u2_119"],
  ["three बहुभाषी कक्षा questions (1)", "u2_38", "u2_48"],
  ["three बहुभाषी कक्षा questions (2)", "u2_38", "u2_52"],
  ["three बहुभाषी कक्षा questions (3)", "u2_48", "u2_52"],
  ["across sections: Child Development's home language / Hindi Pedagogy's बहुभाषी कक्षा", "u2_13", "u2_38"],
];
for (const [name, a, b] of REPEATS) {
  const r = sameIdeaInPaper(Q[a], Q[b]) && sameIdeaInPaper(Q[b], Q[a]);
  check(`caught: ${name}`, r, `${a} x ${b} score ${score(Q[a], Q[b])}`);
}
// The checks before this one let them all through - that is why it exists.
check(
  "the older checks miss these pairs",
  REPEATS.every(([, a, b]) => !looksLikeRepeat(Q[a].text, [Q[b].text]).repeat) &&
    REPEATS.filter(([, a, b]) => sameFactInPaper(Q[a], Q[b])).length <= 2,
  REPEATS.filter(([, a, b]) => sameFactInPaper(Q[a], Q[b])).map(([n]) => n).join("; ")
);

// ---- near misses: different questions on the same ground
const stage = (scene, answer) => ({
  subject: "Child Development",
  topic: "Development & Learning",
  text: `According to Lawrence Kohlberg, a child who ${scene} is at which stage of moral development?`,
  options: [
    "Stage 1: obedience and punishment orientation",
    "Stage 2: individualism and exchange (instrumental purpose)",
    "Stage 3: good interpersonal relationships (good boy - good girl)",
    "Stage 4: maintaining the social order",
  ],
  correctIndex: answer,
});
const stage2 = stage("helps a classmate only because the classmate promised to share his tiffin in return", 1);
const stage3 = stage("shares her tiffin so that the teacher and her classmates think of her as a good girl", 2);
const NOT_REPEATS = [
  ["Kohlberg stage 2 / stage 3", stage2, stage3],
  ["Kohlberg stage 1 (Heinz, prison) / stage 3 (social approval)", Q.u2_4, Q.u2_5],
  ["Kohlberg pre-conventional level / stage 3", Q.u2_19, Q.u2_5],
  // Borderline: the same theory, but one asks what the zone is and the other
  // how to teach in it. Kept apart.
  ["ZPD definition / scaffolding strategy", Q.u2_8, Q.u2_18],
  ["dyslexia / dyscalculia, same 'reverses... average intelligence' frame", Q.u2_17, Q.u2_28],
  ["two poems: personification / metaphor", Q.u2_71, Q.u2_79],
  ["the stock answer 'connect to their experiences' to two different questions", Q.u2_21, Q.u2_148],
  ["WHO life skills: their aim / decision making (sameFactInPaper's own case)", Q.who1, Q.who2],
  ["an EVS fact is not a theory question", Q.u2_143, { ...Q.u2_143, text: "Which gas do we breathe out when we exhale?", textHi: "साँस छोड़ते समय हम कौन सी गैस बाहर निकालते हैं?" }],
  ["Maths: 10 and 15 days for A and B / 15 men in 20 days", Q.work1, Q.work2],
  ["Maths: discount then profit / mark-up then discount", Q.shop1, Q.shop2],
];
for (const [name, a, b] of NOT_REPEATS) {
  check(`left alone: ${name}`, !sameIdeaInPaper(a, b) && !sameIdeaInPaper(b, a), `score ${score(a, b)}`);
}

// ---- another mock of the exam: only the same question reworded counts
check(
  "sibling mock: the same question reworded is caught (UPTET #1 / #2, Dyslexia)",
  sameIdeaInPaper(Q.u2_2, Q.u1_dyslexia, { sibling: true }),
  `score ${score(Q.u2_2, Q.u1_dyslexia)}`
);
check(
  "sibling mock: the same concept asked another way is not (family as socialiser)",
  !sameIdeaInPaper(Q.u2_1, Q.u1_family, { sibling: true }) && sameIdeaInPaper(Q.u2_1, Q.u1_family),
  `score ${score(Q.u2_1, Q.u1_family)}`
);
check("sibling mock: the same figures in another mock are not checked", !sameIdeaInPaper(Q.u2_113, Q.u2_119, { sibling: true }));

// ---- wired into question generation
(async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const mem = await MongoMemoryServer.create();
  const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
  await mongoose.connect(mem.getUri() + "sameidea");
  require(path.join(__dirname, "mock-stub.cjs"));
  const gemini = require(path.join(SERVER, "services/geminiService"));
  // The factory takes generateQuestions when it loads; this lets each case
  // below say what the model offers.
  let offer = async () => [];
  gemini.generateQuestions = (...args) => offer(...args);
  const Question = require(path.join(SERVER, "models/Question"));
  const RejectedQuestion = require(path.join(SERVER, "models/RejectedQuestion"));
  const { createVerifiedQuestions } = require(path.join(SERVER, "services/questionFactory"));

  const solution = { solution: "Explained step by step for the student, with the reason for the answer.", solutionHi: "चरण दर चरण समझाया गया उत्तर।" };
  const params = { examType: "UPTET", subject: "Child Development", topic: "Child Development", difficulty: "medium" };
  const inBank = async (q) =>
    (await Question.create({ ...q, ...solution, examType: ["UPTET"], source: "ai_generated", status: "published" }))._id;
  // The model offers the 'b' and 'd' dyslexia question and one on the family.
  offer = async ({ count }) =>
    gemini.tagGenerated([Q.u2_27, Q.u1_family].slice(0, count).map((q) => ({ ...q, ...solution })), { ...params, syllabusTopics: ["Inclusive Education"] });
  const kept = async (built) => (await Question.find({ _id: { $in: built.ids } }).lean()).map((q) => q.text);

  // A mock that already asks "which learning difficulty ... read, spell, decode".
  const paperQ = await inBank(Q.u2_2);
  let built = await createVerifiedQuestions({ needed: 2, maxRounds: 1, generateParams: params, inTest: [paperQ], onePerIdea: true });
  let texts = await kept(built);
  const note = await RejectedQuestion.findOne({ detail: /already asks this idea/ }).lean();
  check("in a mock, the reworded dyslexia question is dropped and the other kept", texts.length === 1 && !texts.some((t) => /'b' and 'd'/.test(t)), JSON.stringify(texts));
  check("...with a note naming the check", note && /same concept \(dyslexia/.test(note.detail) && note.reason === "reworded", note?.detail);

  // A chapter practice test drills one idea on purpose.
  await Question.deleteMany({ _id: { $in: built.ids } });
  built = await createVerifiedQuestions({ needed: 2, maxRounds: 1, generateParams: params, inTest: [paperQ] });
  texts = await kept(built);
  check("in a practice test (no onePerIdea) both are kept", texts.length === 2, JSON.stringify(texts));

  // The same question in ANOTHER mock of the exam: still dropped; the same
  // concept asked another way there: kept.
  await Question.deleteMany({ _id: { $in: built.ids } });
  const otherMockDyslexia = await inBank(Q.u1_dyslexia);
  const otherMockFamily = await inBank(Q.u2_1);
  offer = async ({ count }) =>
    gemini.tagGenerated([Q.u2_17, Q.u1_family].slice(0, count).map((q) => ({ ...q, ...solution })), { ...params, syllabusTopics: ["Development & Learning"] });
  const siblings = [otherMockDyslexia, otherMockFamily];
  built = await createVerifiedQuestions({ needed: 2, maxRounds: 1, generateParams: params, inTest: siblings, siblings, onePerIdea: true });
  texts = await kept(built);
  check(
    "against another mock: the reworded question is dropped, the same concept asked differently kept",
    texts.length === 1 && /emotional development and socialisation/.test(texts[0]),
    JSON.stringify(texts)
  );

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
