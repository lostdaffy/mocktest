// Figure questions: not one wrong. Two things reached students -
//  1. options shuffled like text options, so the app showed "A. Figure (C)"
//     under a picture whose boxes read (A)-(D), and box A was marked wrong;
//  2. analogies, rule-less series and unclear odd-ones-out kept "by eye",
//     their answers never worked out by anything.
// Now: options stay in picture order, every figure's answer is worked out in
// code (and no other rule may lead to another option), and the ones already
// out are put back in order and re-checked.
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const V = require(path.join(SERVER, "services/visuals"));
const { ruleBasedCheck, shuffleOptions } = require(path.join(SERVER, "services/validationPipeline"));
const { buildVisualQuestions, FIGURE_OPTIONS } = require(path.join(SERVER, "services/visualGenerator"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 140) + "]" : ""}`);
};

const p1 = { elements: [{ shape: "arrow", row: 1, col: 1, fill: "black", rotate: 0 }, { shape: "square", row: 3, col: 3, fill: "striped" }] };
const p3 = { elements: [{ shape: "triangle", row: 1, col: 2, fill: "white", rotate: 0 }, { shape: "circle", row: 3, col: 1, fill: "black" }] };
const rot = (p, by = 90) => V.rotatePanel(p, by, 3);

// ---- analogy, worked out
const analogy = (rule, q2, q3, options) => V.normaliseFigure({ layout: "analogy", grid: 3, rule, question: [p1, q2, q3], options });
const a = analogy({ type: "rotate", by: 90 }, rot(p1), p3, [V.mirrorPanel(p3, 3), rot(p3), p3, V.waterPanel(p3, 3)]);
check("an analogy's answer is worked out from its rule", V.checkFigureAnswer(a, 1).ok === true, JSON.stringify(V.checkFigureAnswer(a, 1)));
check("...a wrong key is refused, naming the right box", V.checkFigureAnswer(a, 2).ok === false && /option B/.test(V.checkFigureAnswer(a, 2).reason), V.checkFigureAnswer(a, 2).reason);
const lying = analogy({ type: "rotate", by: 90 }, V.mirrorPanel(p1, 3), p3, [V.mirrorPanel(p3, 3), rot(p3), p3, V.waterPanel(p3, 3)]);
check("an analogy whose figure 2 does not follow its stated rule is refused", V.checkFigureAnswer(lying, 1).ok === false, V.checkFigureAnswer(lying, 1).reason);
const noRule = analogy({ type: "none" }, rot(p1), p3, [V.mirrorPanel(p3, 3), rot(p3), p3, V.waterPanel(p3, 3)]);
check("an analogy with no rule code can apply is not passed as checked", V.checkFigureAnswer(noRule, 1).ok !== true);

// ---- a second rule that fits is a second answer
// A lone circle in the centre: rotating it 180 and turning it look the same,
// so a rule that changes nothing is refused.
const dot = { elements: [{ shape: "circle", row: 2, col: 2, fill: "black" }] };
const still = V.normaliseFigure({ layout: "series", grid: 3, rule: { type: "turn_shapes", by: 90 }, question: [dot, dot, dot],
  options: [dot, { elements: [{ shape: "circle", row: 1, col: 1, fill: "black" }] }, { elements: [{ shape: "square", row: 2, col: 2, fill: "black" }] }, { elements: [{ shape: "circle", row: 3, col: 3, fill: "black" }] }] });
check("a rule that leaves the figure unchanged is refused (any rule fits)", V.checkFigureAnswer(still, 0).ok === false, V.checkFigureAnswer(still, 0).reason);
// A shape symmetric left-right on the centre column: mirror and turn 180
// differ on figure 3 - if both fit 1 -> 2, two options are defensible.
const sym1 = { elements: [{ shape: "triangle", row: 1, col: 2, fill: "black", rotate: 0 }] };
const sym2 = { elements: [{ shape: "triangle", row: 3, col: 2, fill: "black", rotate: 180 }] }; // water image AND rotate 180 of sym1
const odd3 = { elements: [{ shape: "arrow", row: 1, col: 1, fill: "black", rotate: 90 }] };
const two = V.normaliseFigure({ layout: "analogy", grid: 3, rule: { type: "rotate", by: 180 }, question: [sym1, sym2, odd3],
  options: [rot(odd3, 180), V.waterPanel(odd3, 3), V.mirrorPanel(odd3, 3), odd3] });
const twoCheck = V.checkFigureAnswer(two, 0);
check("an analogy another fitting rule answers differently is refused, naming that option", twoCheck.ok === false && /option B/.test(twoCheck.reason), twoCheck.reason);

// ---- the gate keeps only what code has worked out
const asQuestion = (spec, correctIndex) => ({
  text: "Which answer figure completes the analogy?", textHi: "कौन-सी उत्तर आकृति सादृश्य पूरा करती है?",
  options: [...FIGURE_OPTIONS], optionsHi: ["आकृति (A)", "आकृति (B)", "आकृति (C)", "आकृति (D)"], correctIndex,
  solution: "Each figure turns 90 degrees clockwise, so Figure (B).", solutionHi: "हर आकृति 90 डिग्री घूमती है, इसलिए आकृति (B)।",
  subject: "Reasoning", visual: { kind: "figure", figure: { spec } },
});
check("the gate passes a worked-out figure", ruleBasedCheck(asQuestion(a, 1)).passed, ruleBasedCheck(asQuestion(a, 1)).issues.join("; "));
const gateNoRule = ruleBasedCheck(asQuestion(noRule, 1));
check("the gate refuses a figure whose answer code cannot work out", !gateNoRule.passed && gateNoRule.issues.some((i) => /not checked in code/.test(i)), gateNoRule.issues.join("; "));

// ---- options stay in picture order
let stayed = true;
for (let i = 0; i < 40; i++) {
  const s = shuffleOptions(asQuestion(a, 1));
  if (s.options.join() !== FIGURE_OPTIONS.join() || s.correctIndex !== 1) stayed = false;
}
check("a figure's options are never shuffled", stayed);
let moved = false;
for (let i = 0; i < 40 && !moved; i++) moved = shuffleOptions({ options: ["w", "x", "y", "z"], correctIndex: 0 }).correctIndex !== 0;
check("...text options still are", moved);

// ---- the generator keeps only checked figures
const raw = { questions: [
  { text: "Next in the analogy?", textHi: "?", correctIndex: 1, solution: "s", solutionHi: "s",
    figure: { layout: "analogy", grid: 3, rule: { type: "rotate", by: 90 }, question: [p1, rot(p1), p3], options: [V.mirrorPanel(p3, 3), rot(p3), p3, V.waterPanel(p3, 3)] } },
  { text: "Odd one?", textHi: "?", correctIndex: 3, solution: "s", solutionHi: "s",
    figure: { layout: "odd_one_out", grid: 3, question: [], options: [p1, rot(p1), rot(rot(p1)), V.mirrorPanel(p1, 3)] } },
] };
const built = buildVisualQuestions("figure", raw, { examType: "SSC_CGL", subject: "Reasoning", topic: "Analogy", difficulty: "medium" });
check("the generator keeps the worked-out analogy", built.questions.length === 1 && built.questions[0].visual.figure.answerCheck === "checked",
  JSON.stringify(built.questions.map((q) => q.visual.figure.answerCheck)));
check("...and throws out the odd one out nothing settles", built.rejected.length === 1 && /figure check/.test(built.rejected[0].reason), built.rejected[0]?.reason);
check("...its options read Figure (A)-(D) in order", built.questions[0]?.options.join() === FIGURE_OPTIONS.join());

// ---- repairing the ones already out
(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "figure_repair");
  const Question = require(path.join(SERVER, "models/Question"));
  const Attempt = require(path.join(SERVER, "models/Attempt"));
  const Test = require(path.join(SERVER, "models/Test"));
  const { repairFigures } = require(path.join(SERVER, "services/figureRepair"));

  const base = { solution: "s", examType: ["SSC_CGL"], subject: "Reasoning", topic: "Non-verbal", source: "ai_generated", status: "published" };
  // Answer is box B; shuffled, "Figure (B)" sits at position 3.
  const shuffled = await Question.create({ ...base, text: "Analogy?", options: ["Figure (C)", "Figure (D)", "Figure (A)", "Figure (B)"],
    optionsHi: ["आकृति (C)", "आकृति (D)", "आकृति (A)", "आकृति (B)"], correctIndex: 3,
    visual: { kind: "figure", figure: { spec: a, answerCheck: "by_eye" } } });
  const unverifiable = await Question.create({ ...base, text: "Rule-less analogy?", options: [...FIGURE_OPTIONS], correctIndex: 1,
    visual: { kind: "figure", figure: { spec: noRule, answerCheck: "by_eye" } } });
  const test = await Test.create({ title: "Reasoning Mock #1", type: "full_mock", examType: "SSC_CGL", questions: [shuffled._id, unverifiable._id], durationMinutes: 60, publishStatus: "published" });
  const user = new mongoose.Types.ObjectId();
  // A student who picked position 3 ("Figure (B)", right) and one who picked position 0 ("Figure (C)").
  const right = await Attempt.create({ user, test: test._id, answers: [{ question: shuffled._id, selectedIndex: 3, isCorrect: true }] });
  const wrong = await Attempt.create({ user, test: test._id, answers: [{ question: shuffled._id, selectedIndex: 0, isCorrect: false }] });

  let r = await repairFigures();
  check("a dry run reports and changes nothing", r.reordered === 1 && (await Question.findById(shuffled._id)).correctIndex === 3, JSON.stringify({ reordered: r.reordered }));
  r = await repairFigures({ apply: true });
  const fixed = await Question.findById(shuffled._id).lean();
  check("the options go back to Figure (A)-(D)", fixed.options.join() === FIGURE_OPTIONS.join() && fixed.optionsHi[0] === "आकृति (A)", fixed.options.join());
  check("...and the answer is still box B", fixed.correctIndex === 1, String(fixed.correctIndex));
  check("...now marked as checked in code", fixed.visual.figure.answerCheck === "checked");
  const ra = await Attempt.findById(right._id).lean();
  const wa = await Attempt.findById(wrong._id).lean();
  check("a student's right answer still points at box B", ra.answers[0].selectedIndex === 1 && ra.answers[0].isCorrect === true, JSON.stringify(ra.answers[0]));
  check("...and a wrong one still at box C", wa.answers[0].selectedIndex === 2 && wa.answers[0].isCorrect === false, JSON.stringify(wa.answers[0]));
  check("one code cannot work out is listed to replace, with its test", r.notChecked.length === 1 && String(r.notChecked[0]._id) === String(unverifiable._id) && r.notChecked[0].tests[0] === "Reasoning Mock #1",
    JSON.stringify(r.notChecked));
  r = await repairFigures({ apply: true });
  check("running it again moves nothing", r.reordered === 0 && r.answersMoved === 0, JSON.stringify({ reordered: r.reordered, moved: r.answersMoved }));

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
