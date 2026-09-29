const { solutionReachesTheAnswer } = require("./answerAgrees");
const { arguesWithItself } = require("./selfDoubt");
const { refersToAPassage, carriesItsPassage } = require("./comprehension");

// What the quality gate would have said, for a question edited by hand.
//
// Generated questions go through the gate; an edited one does not, and that
// is deliberate - an admin looking straight at a question should be able to
// overrule a rule. But the commonest hand-edit is changing which option is
// correct, and that is exactly the mistake nobody catches by re-reading: the
// solution still works through to the old answer.
//
// So these are warnings, shown after the save, not a refusal.
function checkEditedQuestion(q) {
  const warnings = [];

  if ((q.options || []).length !== 4) {
    warnings.push("This question doesn't have four options.");
  }
  if (q.correctIndex == null || q.correctIndex < 0 || q.correctIndex > 3) {
    warnings.push("No correct option is marked.");
  }

  const marked = (q.options || [])[q.correctIndex];
  if (marked != null) {
    const duplicate = (q.options || []).filter((o) => String(o).trim() === String(marked).trim()).length > 1;
    if (duplicate) warnings.push("Two options are the same, so more than one answer is correct.");
  }

  if (!solutionReachesTheAnswer(q)) {
    warnings.push(
      "The solution's working doesn't arrive at the option you've marked correct - check which one it actually reaches."
    );
  }
  if (arguesWithItself(q.solution) || arguesWithItself(q.solutionHi)) {
    warnings.push("The solution argues with itself (\"wait\", \"recheck\", \"based on the options\"). Students read this.");
  }
  if (refersToAPassage(q.text) && !carriesItsPassage(q.text)) {
    warnings.push("This asks about a passage the question doesn't include, so there is nothing for a student to read.");
  }
  if (!String(q.solution || "").trim()) {
    warnings.push("There's no solution, so a student who gets it wrong learns nothing.");
  }

  return warnings;
}

module.exports = { checkEditedQuestion };
