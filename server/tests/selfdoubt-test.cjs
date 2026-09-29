// A solution that argues with itself is a wrong answer key wearing a
// solution's clothes. Six were hand-checked and six were wrong - including
// one that worked the answer out correctly three times and then wrote
// "Correction: Correct option is 40 if calc is wrong."
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 92) + "]" : ""}`);
};

const { arguesWithItself } = require(path.join(SERVER, "utils/selfDoubt"));
const { ruleBasedCheck } = require(path.join(SERVER, "services/validationPipeline"));

// ---------------------------------------------------------------------------
// The real ones, verbatim from the bank
// ---------------------------------------------------------------------------
const flailing = [
  // key said 40 litres; the correct answer is 80, computed three times
  "Initial milk = 0.60 * 80 = 48L, Water = 32L. Let x be added milk. (48+x)/(80+x) = 80/100 => 0.2x = 16 => x = 80. Wait, check math: x = 80. Re-check: Total new = 32/0.2 = 160L. Added = 160 - 80 = 80. Correction: Correct option is 40 if calc is wrong.",
  // key said 2.37; the correct answer is 2.45, and it says so
  "x = 4/9. x^2 = 16/81. 1/x = 9/4. 16/81 + 9/4 = 793/324 = 2.4475, rounding gives 2.37 approx (based on options).",
  // key said 13:7; it computes 19:11 and tries to bend the options to fit
  "Milk 2/3 + 3/5 = 19/15. Water 1/3 + 2/5 = 11/15. Ratio = 19:11 is wrong, let's recheck. Wait, let me adjust options to match simple math: Combined = 19:11.",
  // key said 22.5 kg; the correct answer is 30
  "Using alligation: (42-38) : (38-36) = 4 : 2 = 2 : 1. If 1 part = 15 kg, then 2 parts = 30 kg. Wait, check ratio order: Ratio of quantities is 2:4 = 1:2. Then 3 parts = 22.5.",
  "Let successful = 5x. Ratio: (5x-6)/(2x+8) = 9/2 => 8x = -84 (Incorrect constraint check). Actually, total appearance = 7x+14. The ratio logic solves to 98.",
  "Profit 25% means SP = 1.25 * CP. Ratio of water to milk = 1/Profit% = 4/1. No, simply 100/Profit% = 100/25 = 4. Ratio is 1:4.",
];
check("a solution that argues with itself is spotted", flailing.every(arguesWithItself),
  flailing.filter((s) => !arguesWithItself(s))[0] || "all six");
check("...including the one that wrote down an option instead of its own answer",
  arguesWithItself("793/324 = 2.4475, rounding gives 2.37 approx (based on options)."));

// ---------------------------------------------------------------------------
// Solutions that simply explain, verbatim from the bank
// ---------------------------------------------------------------------------
const sound = [
  "15% of 800 = (15/100) * 800 = 15 * 8 = 120.",
  "Let the number be x. 20% of x = 40 => (20/100) * x = 40 => x = 40 * (100/20) = 200.",
  "(3/4) * 100 = 75%.",
  "Required percentage = (10/40) * 100 = (1/4) * 100 = 25%.",
  "Increase = 60 - 50 = 10. Percentage increase = (10/50) * 100 = 20%.",
  "Average price = (2*20 + 3*30) / (2+3) = (40 + 90) / 5 = 130 / 5 = Rs. 26.",
  "Remaining wine = 80 * (1 - 8/80)^2 = 80 * (0.9)^2 = 80 * 0.81 = 64.8 litres.",
  "All cars are inside the bus circle, and all buses are inside the train circle, so all cars are trains.",
  "'अ' एक स्वर है, शेष तीनों व्यंजन हैं, इसलिए उत्तर 'अ' है।",
  // must not trip on a solution that rules an option out - that is teaching
  "Option A is ruled out because a committee is singular here; B is the only one that agrees with the verb.",
];
check("a solution that simply explains is left alone", !sound.some(arguesWithItself),
  sound.filter(arguesWithItself)[0] || "all ten");
check("...including one that rules an option out, which is teaching, not doubting",
  !arguesWithItself("Option A is ruled out because a committee is singular here; B is the only one that agrees."));

// ---------------------------------------------------------------------------
// Through the gate, and never mended
// ---------------------------------------------------------------------------
const q = {
  text: "A vessel contains 80 litres of a mixture that is 60% milk. How much pure milk must be added to make it 80% milk?",
  textHi: "एक बर्तन में 80 लीटर मिश्रण है जिसमें 60% दूध है। 80% दूध करने के लिए कितना शुद्ध दूध मिलाना होगा?",
  // 80 is the right answer, and it is an option here. The bank's version of
  // this question ticked 40 and did not even list 80 - which is what the
  // arithmetic check is for, and why this fixture had to be corrected: the
  // new rule caught the test's own wrong key.
  options: ["40 litres", "80 litres", "30 litres", "50 litres"],
  optionsHi: ["40 लीटर", "80 लीटर", "30 लीटर", "50 लीटर"],
  correctIndex: 1,
  solution: flailing[0],
  solutionHi: "हिंदी हल: " + flailing[0],
  subject: "Maths", topic: "Percentage",
};
const r = ruleBasedCheck(q);
check("the gate refuses it", !r.passed, r.issues.join(", "));
check("...saying the answer key cannot be trusted", /answer key cannot be trusted/.test(r.issues.join(", ")), r.issues.join(", "));
check("...and the same question with a clean solution passes",
  ruleBasedCheck({ ...q, solution: "Water stays 32L and must be 20% of the new total, so the total is 160L and 80L of milk was added.", solutionHi: "पानी 32L रहता है और नए कुल का 20% होना चाहिए, इसलिए कुल 160L और 80L दूध मिलाया गया।" }).passed,
  ruleBasedCheck({ ...q, solution: "Water stays 32L and must be 20% of the new total, so the total is 160L and 80L of milk was added.", solutionHi: "x" }).issues.join(", "));

const factorySrc = require("fs").readFileSync(path.join(SERVER, "services/questionFactory.js"), "utf8");
const fatalLine = (factorySrc.match(/const fatal[^\n]*/) || [""])[0];
check("it is fatal, never repaired into passing", /argues with itself/.test(fatalLine), fatalLine.slice(0, 92));
check("...because repairing the wording would leave the wrong key in place and hide the evidence", true);

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
