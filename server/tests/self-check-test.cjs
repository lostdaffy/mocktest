// The checks that let the bank stand without a person reading every paper:
//  - every numeric maths answer worked out in code from the setter's formula
//  - a new question about "now" or "recently" refused at the gate
//  - a key the students' answers say is wrong: rejected and replaced
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
require(path.join(__dirname, "mock-stub.cjs")); // nothing here may reach the real model
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const { checkFormula, evaluateArithmetic } = require(path.join(SERVER, "services/mathCheck"));
const { ruleBasedCheck } = require(path.join(SERVER, "services/validationPipeline"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 140) + "]" : ""}`);
};

// ---- the formula
const si = { text: "Find the simple interest on Rs 1200 at 12% per annum for 3 years.", options: ["Rs 432", "Rs 400", "Rs 360", "Rs 480"], correctIndex: 0 };
check("a working that gives the marked option passes", checkFormula({ ...si, formula: "1200 * 12 * 3 / 100" }).ok === true);
const wrongKey = checkFormula({ ...si, correctIndex: 3, formula: "1200 * 12 * 3 / 100" });
check("...one marked on the wrong option is caught, naming the right one", wrongKey.ok === false && /option A/.test(wrongKey.reason), wrongKey.reason);
const missing = checkFormula({ ...si, options: ["Rs 430", "Rs 400", "Rs 360", "Rs 480"], formula: "1200 * 12 * 3 / 100" });
check("...answer not among the options is caught", missing.ok === false && /not among the options/.test(missing.reason), missing.reason);
const fudged = checkFormula({ ...si, formula: "432 * 1" });
check("...a working that brings in the answer itself is refused", fudged.ok === false && /does not give/.test(fudged.reason), fudged.reason);
check("...so is one that is just the number", checkFormula({ ...si, formula: "432" }).ok === false);
check("...and one the computer cannot run", checkFormula({ ...si, formula: "x = 1200*12*3/100" }).ok === false);
check("a ratio answer is not judged by number", checkFormula({ text: "Ratio of 12 to 16?", options: ["3:4", "4:3", "2:3", "3:2"], correctIndex: 0, formula: "" }).ok === null);
check("percent change, roots, powers and lcm are read",
  Math.abs(evaluateArithmetic("(450 - 360) / 360 * 100").value - 25) < 1e-9 && evaluateArithmetic("sqrt(144) + 3^2").value === 21 && evaluateArithmetic("lcm(12, 18, 24)").value === 72);
check("a rounded option is matched within half a percent",
  checkFormula({ text: "One third of 100, as a percent of 100?", options: ["33.33%", "30%", "35%", "40%"], correctIndex: 0, formula: "100 / 3" }).ok === true);

// ---- the gate
const draftMaths = {
  ...si, textHi: "1200 रुपये पर 12% वार्षिक दर से 3 वर्ष का साधारण ब्याज ज्ञात कीजिए।", optionsHi: si.options,
  solution: "SI = 1200 x 12 x 3 / 100 = 432. Answer: Rs 432.", solutionHi: "साधारण ब्याज = 432 रुपये।",
  subject: "Maths", topic: "Simple Interest", status: "draft", source: "ai_generated",
};
check("the gate passes a new maths question whose working holds", ruleBasedCheck({ ...draftMaths, formula: "1200 * 12 * 3 / 100" }).passed,
  ruleBasedCheck({ ...draftMaths, formula: "1200 * 12 * 3 / 100" }).issues.join("; "));
const noFormula = ruleBasedCheck(draftMaths);
check("...refuses a new numeric one with no working", !noFormula.passed && noFormula.issues.some((i) => /no formula/.test(i)), noFormula.issues.join("; "));
check("...but leaves an old published one alone", !ruleBasedCheck({ ...draftMaths, status: "published" }).issues.some((i) => /maths working/.test(i)));

const gk = (text, textHi, subject = "GK") => ({
  text, textHi, options: ["Antonio Guterres", "Ban Ki-moon", "Kofi Annan", "Trygve Lie"], optionsHi: ["एंटोनियो गुटेरेस", "बान की-मून", "कोफी अन्नान", "ट्रिग्वे ली"],
  correctIndex: 0, solution: "Antonio Guterres.", solutionHi: "एंटोनियो गुटेरेस।", subject, topic: "World", status: "draft", source: "ai_generated",
});
const dated = ruleBasedCheck(gk("Who is the current Secretary-General of the UN?", "वर्तमान में संयुक्त राष्ट्र के महासचिव कौन हैं?"));
check("a new question about who holds an office now is refused", !dated.passed && dated.issues.some((i) => /time-bound/.test(i)), dated.issues.join("; "));
const recent = ruleBasedCheck(gk("Which city recently hosted the summit?", "हाल ही में शिखर सम्मेलन की मेजबानी किस शहर ने की?"));
check("...so is 'recently'", recent.issues.some((i) => /time-bound/.test(i)));
check("a fixed fact with its year is not", !ruleBasedCheck(gk("Who became UN Secretary-General in 2017?", "2017 में संयुक्त राष्ट्र के महासचिव कौन बने?")).issues.some((i) => /time-bound/.test(i)));
check("'वर्तमान भारतीय राज्य' (a place today) is not", !ruleBasedCheck(gk("Dholavira is in which present-day Indian state?", "धोलावीरा किस वर्तमान भारतीय राज्य में है?")).issues.some((i) => /time-bound/.test(i)));

// ---- the students' answers
(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "self_check");
  const Question = require(path.join(SERVER, "models/Question"));
  const Test = require(path.join(SERVER, "models/Test"));
  const { sweepSuspectKeys, suspectOption } = require(path.join(SERVER, "services/answerSignals"));

  check("answers gathered on one other option mark a likely wrong key", suspectOption({ correctIndex: 0, picks: { 0: 2, 1: 12, 2: 2, 3: 1 } }) === 1);
  check("...answers spread over the wrong options (a hard question) do not", suspectOption({ correctIndex: 0, picks: { 0: 3, 1: 5, 2: 5, 3: 4 } }) === -1);
  check("...nor a handful of answers", suspectOption({ correctIndex: 0, picks: { 1: 8 } }) === -1);

  const base = { textHi: "x", options: ["a", "b", "c", "d"], optionsHi: ["a", "b", "c", "d"], solution: "s", examType: ["SSC_CGL"], subject: "GK", topic: "History", source: "ai_generated", status: "published" };
  const wrong = await Question.create({ ...base, text: "Wrong key", correctIndex: 0, picks: { 0: 2, 1: 14, 2: 1, 3: 1 } });
  const hard = await Question.create({ ...base, text: "Just hard", correctIndex: 0, picks: { 0: 4, 1: 5, 2: 5, 3: 4 } });
  const t = await Test.create({ title: "GK Practice #1", type: "practice", examType: "PRACTICE", subject: "GK", topic: "History", questions: [wrong._id, hard._id], durationMinutes: 10, publishStatus: "published" });

  const found = await sweepSuspectKeys();
  const after = await Question.findById(wrong._id).lean();
  const kept = await Question.findById(hard._id).lean();
  const paper = await Test.findById(t._id).lean();
  check("the sweep rejects the likely wrong key", found.length === 1 && after.status === "rejected" && /option B/.test(after.flagReason), after.flagReason);
  check("...takes it out of its test", !paper.questions.map(String).includes(String(wrong._id)));
  check("...and leaves the hard question alone", kept.status === "published" && paper.questions.map(String).includes(String(hard._id)));
  check("running it again finds nothing new", (await sweepSuspectKeys()).length === 0);

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
