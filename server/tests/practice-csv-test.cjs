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

  // ---- a row can replace a question in its test, in place
  const before = (await Test.findById(a._id).lean()).questions.map(String);
  const victim = before[3];
  const swap = [
    { ...row(a.title, 60), replaces: victim, replaceReason: "wrong key" },
    { ...row(a.title, 61), replaces: String(old[17]._id) }, // not in test A
    { ...row(a.title, 62), replaces: victim }, // the same one twice
  ];
  r = await addPracticeCsv(swap, { dryRun: true });
  check("a dry run of a replacement changes nothing", r.wouldReplace === 1 && r.wouldAdd === 0 && (await Test.findById(a._id).lean()).questions.map(String).join() === before.join(), JSON.stringify(r));
  r = await addPracticeCsv(swap);
  const after = (await Test.findById(a._id).lean()).questions.map(String);
  const fresh3 = await Question.findOne({ text: "Simplify: 70 + 6 / 3 x 2" }).lean();
  check("the new question takes the old one's place, the test stays at 20", after.length === 20 && fresh3 && after[3] === String(fresh3._id) && !after.includes(victim), after.length);
  const gone = await Question.findById(victim).lean();
  check("...and the old one is rejected with the reason given", gone.status === "rejected" && gone.flagReason === "wrong key", gone.status + " " + gone.flagReason);
  const why2 = (n) => (r.rejected.find((x) => x.row === n)?.errors || []).join("; ");
  check("a replacement for a question not in the test is refused", /not in this test/.test(why2(2)), why2(2));
  check("...and so is a second replacement for the same question", /already replaces/.test(why2(3)), why2(3));

  // ---- a reworded repeat is refused; a replacement may reword its own
  const live = (await Test.findById(a._id).lean()).questions.map(String);
  const udq = (await Test.findById(made._id).lean()).questions.map(String);
  const t1 = made.title;
  const echo = [
    { ...ud(0, t1), question: "Find the unit digit of 2 + 3 × 10.", replaces: udq[5] }, // the bank's first one, reworded
    { ...ud(0, t1), question: "Find the unit digit of 2 + 3 × 10.", replaces: udq[0] }, // rewording the one it replaces
    { ...ud(700, t1), replaces: udq[6] },
    { ...ud(700, t1), question: "Find the unit digit of 702 + 703 × 10.", replaces: udq[7] }, // repeats the row above
  ];
  r = await addPracticeCsv(echo, { dryRun: true });
  const why3 = (n) => (r.rejected.find((x) => x.row === n)?.errors || []).join("; ");
  check("a reworded question already in the chapter is refused", /repeats a question already in this chapter/.test(why3(1)), why3(1));
  check("...but a row may reword the question it replaces", !why3(2), why3(2));
  check("...and a row may not repeat an earlier row of the same file", /repeats a question/.test(why3(4)) && !why3(3), `${why3(3)} | ${why3(4)}`);

  // ---- keyboard maths is saved the way students read it
  await addPracticeCsv([{ ...row(a.title, 90), question: "Simplify: 2^5 * 3 + 0", formula: "2**5 * 3 + 0", optionA: "96", optionB: "97", optionC: "98", optionD: "99", solution: "2^5 = 32 and 32 * 3 = 96, so 96.", replaces: live[8] }]);
  const typed = await Question.findOne({ text: "Simplify: 2⁵ × 3 + 0" }).lean();
  check("2^5 * 3 typed in a spreadsheet is saved as 2⁵ × 3", !!typed && typed.solution === "2⁵ = 32 and 32 × 3 = 96, so 96.", typed?.solution);

  // ---- a test filled later goes live, unless the admin took it off
  const pool = await Question.insertMany(Array.from({ length: 38 }, (_, i) => ({
    text: `Filler question number ${i} about simplification`, textKey: questionKey(`Filler question number ${i} about simplification`),
    options: ["1", "2", "3", "4"], correctIndex: 0, solution: "s", subject: "Maths", topic: "Simplification", source: "ai_generated", status: "published",
  })));
  const never = await Test.create({ title: "Simplification · Mixed Practice · Easy #5", type: "practice", examType: "PRACTICE", subject: "Maths", topic: "Simplification", questions: pool.slice(0, 19).map((q) => q._id), durationMinutes: 19, publishStatus: "draft" });
  const takenOff = await Test.create({ title: "Simplification · Mixed Practice · Easy #6", type: "practice", examType: "PRACTICE", subject: "Maths", topic: "Simplification", questions: pool.slice(19, 38).map((q) => q._id), durationMinutes: 19, publishStatus: "draft", publishedAt: new Date("2026-01-01") });
  await addPracticeCsv([row(never.title, 300), row(takenOff.title, 301)]);
  check("a never-published test a file fills to 20 goes live", (await Test.findById(never._id).lean()).publishStatus === "published");
  check("...but one the admin took off the app stays off", (await Test.findById(takenOff._id).lean()).publishStatus === "draft");

  // ---- raised digits are part of a question, not noise
  check("9⁴⁰ and 9⁹ are different questions", questionKey("What is the unit digit of 9⁴⁰?") !== questionKey("What is the unit digit of 9⁹?"),
    questionKey("What is the unit digit of 9⁴⁰?"));
  check("a sum and a product of the same powers are different questions", questionKey("Unit digit of 1¹ + 2² + 3³?") !== questionKey("Unit digit of 1¹ × 2² × 3³?"));
  check("...and so are 2^(3^5) and (2^3)^5", questionKey("Unit digit of 2^(3^5)?") !== questionKey("Unit digit of (2^3)^5?"));
  check("...but spacing and a typed * still match", questionKey("Find 12*5 + 3") === questionKey("Find 12 × 5+3"));
  check("...and 2⁴⁸ keys like 2^48", questionKey("2⁴⁸ − 1 is divisible by") === questionKey("2^48 - 1 is divisible by"), questionKey("2⁴⁸ − 1 is divisible by"));

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
