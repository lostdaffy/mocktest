// Practice tests filled from one spreadsheet: each row names its test, a
// test is filled to its size and no further, a question the bank has is
// refused, and a maths row whose working does not give its key is refused.
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 160) + "]" : ""}`);
};

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "practice_csv");
  const Question = require(path.join(SERVER, "models/Question"));
  const Test = require(path.join(SERVER, "models/Test"));
  const { addPracticeCsv } = require(path.join(SERVER, "services/manualQuestions"));
  const { questionKey } = require(path.join(SERVER, "services/validationPipeline"));

  const old = await Question.insertMany(Array.from({ length: 18 }, (_, i) => ({
    text: `Old simplification question ${i}`, textKey: questionKey(`Old simplification question ${i}`), options: ["1", "2", "3", "4"], correctIndex: 0,
    solution: "s", examType: ["PRACTICE"], subject: "Maths", topic: "Simplification", source: "ai_generated", status: "published",
  })));
  const a = await Test.create({ title: "Simplification · Mixed Practice · Easy #1", type: "practice", examType: "PRACTICE", subject: "Maths", topic: "Simplification", questions: old.slice(0, 12).map((q) => q._id), durationMinutes: 20, publishStatus: "published" });
  const b = await Test.create({ title: "Simplification · Mixed Practice · Easy #2", type: "practice", examType: "PRACTICE", subject: "Maths", topic: "Simplification", questions: old.slice(0, 18).map((q) => q._id), durationMinutes: 20, publishStatus: "published" });

  const row = (test, i, over = {}) => ({
    test, subject: "Maths", topic: "Simplification", difficulty: "easy",
    question: `Simplify: ${10 + i} + 6 / 3 x 2`, optionA: `${14 + i}`, optionB: `${18 + i}`, optionC: `${16 + i}`, optionD: `${12 + i}`, correct: "A",
    formula: `${10 + i} + 6 / 3 * 2`,
    solution: `6 / 3 = 2, 2 x 2 = 4, ${10 + i} + 4 = ${14 + i}.`,
    questionHi: `सरल कीजिए: ${10 + i} + 6 ÷ 3 × 2`, optionAHi: `${14 + i}`, optionBHi: `${18 + i}`, optionCHi: `${16 + i}`, optionDHi: `${12 + i}`,
    solutionHi: `6 ÷ 3 = 2, 2 × 2 = 4, ${10 + i} + 4 = ${14 + i}।`,
    ...over,
  });
  const rows = [
    ...Array.from({ length: 8 }, (_, i) => row(String(a._id), i)),
    row(a.title, 20), // a ninth for test A, by title - one too many
    row(String(b._id), 30), row(String(b._id), 31), row(String(b._id), 32), // B has room for 2
    row(String(b._id), 40, { correct: "B" }), // key not the working's result
    { ...row(String(b._id), 41), question: "Old simplification question 3" }, // already in the bank
    row("no such test", 50),
  ];

  let r = await addPracticeCsv(rows, { dryRun: true });
  check("a dry run adds nothing", r.added === 0 && (await Test.findById(a._id)).questions.length === 12);
  check("...and says what would happen", r.wouldAdd === 10, JSON.stringify(r.tests));
  r = await addPracticeCsv(rows);
  const ta = await Test.findById(a._id).lean();
  const tb = await Test.findById(b._id).lean();
  check("rows go to the test they name, by id or title, up to 20", ta.questions.length === 20 && tb.questions.length === 20, `${ta.questions.length} ${tb.questions.length}`);
  const why = (n) => (r.rejected.find((x) => x.row === n)?.errors || []).join("; ");
  check("a row past the test's size is refused", /full/.test(why(9)), why(9));
  check("...and so is the third row for a test with room for two", /full/.test(why(12)), why(12));
  check("a maths key that is not the working's result is refused", /working/.test(why(13)), why(13));
  check("a question already in the bank is refused", /already in the question bank/.test(why(14)), why(14));
  check("an unknown test is refused", /no practice test/.test(why(15)), why(15));
  const added = await Question.findOne({ text: "Simplify: 10 + 6 / 3 x 2" }).lean();
  check("added questions carry their key, formula and chapter", added && added.textKey && added.formula && added.chapter === "Simplification" && added.status === "published");

  // ---- a file can name tests that do not exist yet
  const Subject = require(path.join(SERVER, "models/Subject"));
  await Subject.create({ name: "Maths", isActive: true, chapters: [{ name: "Number System", topics: ["Number System", "Unit Digit"], exams: ["SSC_CGL", "RRB_GROUP_D"] }] });
  const ud = (i, title = "Number System · Unit Digit · Easy #1") => ({
    ...row(title, 100 + i), topic: "Unit Digit",
    question: `What is the unit digit of ${2 + i} + ${3 + i} × 10?`, optionA: `${(2 + i) % 10}`, optionB: `${(3 + i) % 10}`, optionC: `${(4 + i) % 10}`, optionD: `${(5 + i) % 10}`, correct: "A",
    formula: "", solution: `${3 + i} × 10 ends in 0, so the unit digit is that of ${2 + i}: ${(2 + i) % 10}.`, questionHi: `${2 + i} + ${3 + i} × 10 का इकाई अंक क्या है?`,
    optionAHi: `${(2 + i) % 10}`, optionBHi: `${(3 + i) % 10}`, optionCHi: `${(4 + i) % 10}`, optionDHi: `${(5 + i) % 10}`, solutionHi: `इकाई अंक ${(2 + i) % 10} है।`,
  });
  const fresh = Array.from({ length: 20 }, (_, i) => ud(i * 10));
  r = await addPracticeCsv(fresh, { dryRun: true });
  check("a dry run of a new test creates nothing", r.wouldAdd === 20 && r.tests[0].created && !(await Test.exists({ title: "Number System · Unit Digit · Easy #1" })), JSON.stringify(r.rejected.slice(0, 2)));
  r = await addPracticeCsv(fresh);
  const made = await Test.findOne({ title: "Number System · Unit Digit · Easy #1" }).lean();
  check("the test is made from its title and filled", made && made.subtopic === "Unit Digit" && made.topic === "Number System" && made.difficultyLevel === "easy" && made.seriesNumber === 1 && made.questions.length === 20,
    JSON.stringify(made && { subtopic: made.subtopic, n: made.questions.length }));
  check("...and goes live once it has all 20", made.publishStatus === "published" && made.durationMinutes === 20);
  const tagged = await Question.findById(made.questions[0]).lean();
  check("its questions carry the chapter's exams, not PRACTICE", tagged.examType.join() === "SSC_CGL,RRB_GROUP_D", tagged.examType.join());
  r = await addPracticeCsv([ud(500, "Number System · Remainders · Easy #1"), ud(501, "Algebra · Mixed Practice · Easy #1")]);
  check("a topic the chapter does not have is refused", /not a topic/.test(r.rejected[0]?.errors.join()), r.rejected[0]?.errors.join());
  check("...and so is a chapter Subjects does not have", /not a chapter/.test(r.rejected[1]?.errors.join()), r.rejected[1]?.errors.join());

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
