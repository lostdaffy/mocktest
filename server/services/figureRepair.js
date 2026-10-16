// Puts every figure question's options back in the order of its picture and
// re-checks its answer in code.
//
// Figure options used to go through the same shuffle as text options, so the
// app showed "A. Figure (C)  B. Figure (D) ..." under a picture whose boxes
// read (A) (B) (C) (D) - a student who picked box A was marked wrong. The
// labels moved with the answer, so the label still names the right box:
// putting the labels back in order and moving correctIndex with them restores
// the question. Answers students already gave are moved the same way, so a
// past result still shows what they picked.
//
// Then each figure is checked against its rule. One code cannot check (an
// analogy or series with no rule it can apply, an odd one out with no single
// feature) or that fails is reported, not changed - the caller rejects it,
// which replaces it in its tests.

const Question = require("../models/Question");
const Attempt = require("../models/Attempt");
const Test = require("../models/Test");
const { normaliseFigure, checkFigureAnswer } = require("./visuals");
const { FIGURE_OPTIONS } = require("./visualGenerator");

const FIGURE_OPTIONS_HI = ["आकृति (A)", "आकृति (B)", "आकृति (C)", "आकृति (D)"];
const letterOf = (label) => {
  const m = String(label || "").match(/\(([A-D])\)\s*$/);
  return m ? "ABCD".indexOf(m[1]) : -1;
};

async function repairFigures({ apply = false } = {}) {
  const figures = await Question.find({ "visual.kind": "figure", "visual.figure.spec": { $exists: true }, status: { $ne: "rejected" } })
    .select("text options optionsHi correctIndex status visual")
    .lean();

  const report = { looked: figures.length, reordered: 0, answersMoved: 0, checked: 0, notChecked: [], failed: [], unreadable: [] };

  for (const q of figures) {
    // Where each label now sits: order[k] = the box shown at position k.
    const order = (q.options || []).map(letterOf);
    if (order.length !== 4 || new Set(order).size !== 4 || order.includes(-1)) {
      report.unreadable.push({ _id: q._id, options: q.options });
      continue;
    }
    const correct = order[q.correctIndex];
    const moved = order.some((box, k) => box !== k);

    let check;
    try {
      check = checkFigureAnswer(normaliseFigure(q.visual.figure.spec), correct);
    } catch (err) {
      check = { ok: false, reason: `figure unusable: ${err.message}` };
    }
    const entry = { _id: q._id, text: q.text, status: q.status, reason: check.reason };
    if (check.ok === true) report.checked += 1;
    else if (check.ok === false) report.failed.push(entry);
    else report.notChecked.push(entry);

    if (moved) report.reordered += 1;
    if (!apply) continue;

    const set = { options: [...FIGURE_OPTIONS], optionsHi: [...FIGURE_OPTIONS_HI], correctIndex: correct };
    if (check.ok === true) set["visual.figure.answerCheck"] = "checked";
    await Question.updateOne({ _id: q._id }, { $set: set });

    if (moved) {
      // A saved answer is a position: position k showed box order[k].
      const attempts = await Attempt.find({ "answers.question": q._id }).select("answers").lean();
      for (const a of attempts) {
        let changed = false;
        const answers = a.answers.map((ans) => {
          if (String(ans.question) !== String(q._id) || ans.selectedIndex == null) return ans;
          changed = true;
          return { ...ans, selectedIndex: order[ans.selectedIndex] };
        });
        if (changed) {
          await Attempt.updateOne({ _id: a._id }, { $set: { answers } });
          report.answersMoved += 1;
        }
      }
    }
  }

  // Which tests hold the ones that need replacing.
  const bad = [...report.failed, ...report.notChecked];
  if (bad.length) {
    const tests = await Test.find({ questions: { $in: bad.map((b) => b._id) } }).select("title publishStatus questions").lean();
    for (const b of bad) {
      b.tests = tests.filter((t) => t.questions.some((id) => String(id) === String(b._id))).map((t) => `${t.title}${t.publishStatus === "published" ? "" : ` (${t.publishStatus})`}`);
    }
  }
  return report;
}

module.exports = { repairFigures, letterOf, FIGURE_OPTIONS_HI };
