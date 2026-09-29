// The marked answer has to appear in the question's own solution. This is the
// one check that is arithmetic rather than linguistic, and the surest of them:
// a solution that works the question out and ends on 60 km/h, next to a ticked
// option of 75, is a wrong answer key and nothing else.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 92) + "]" : ""}`);
};

const { solutionReachesTheAnswer } = require(path.join(SERVER, "utils/answerAgrees"));
const { arguesWithItself } = require(path.join(SERVER, "utils/selfDoubt"));
const { ruleBasedCheck } = require(path.join(SERVER, "services/validationPipeline"));

const q = (options, correctIndex, solution) => ({ options, correctIndex, solution });

// ---- real ones from the bank, all with the wrong option ticked
const wrongKey = [
  q(["80 km/h", "60 km/h", "100 km/h", "75 km/h"], 3,
    "Let original speed be x. 600/x - 600/(x+20) = 2. x^2 + 20x - 6000 = 0. (x+100)(x-60) = 0. x = 60 km/h."),
  q(["7", "8", "10", "9"], 1,
    "The primes are 53, 59, 61, 67, 71, 73, 79, 83, 89 - that is 9 primes."),
  q(["20", "25", "10", "15"], 2,
    "(12.25 + 7.75) x (12.25 - 7.75) / 4.5 = 20 x 4.5 / 4.5 = 20."),
  q(["1", "5", "7", "13"], 1,
    "sqrt(1 + 25/144) = sqrt(169/144) = 13/12 = 1 + 1/12, so x = 1."),
  q(["667", "715", "693", "725"], 0,
    "The numbers are 23, 25, 27, 29, 31. Largest times smallest = 31 x 23 = 713."),
];
check("a solution that never reaches the ticked answer is caught",
  wrongKey.every((x) => !solutionReachesTheAnswer(x)),
  `${wrongKey.filter(solutionReachesTheAnswer).length} slipped through`);

// ---- and the ones where it does reach it, verbatim from the bank
const soundKey = [
  q(["Rs 72", "Rs 70", "Rs 74", "Rs 75"], 0,
    "Total Cost = (20*60) + (30*80) = 3600. Total quantity = 50 kg. Average price = 3600/50 = Rs 72/kg."),
  q(["Rs 8,820", "Rs 8,410", "Rs 8,420", "Rs 8,405"], 3,
    "Rate = 2.5% per half year. Amount = 8000 * (1.025)^2 = 8000 * 1.050625 = 8405."),
  q(["12 liters", "15 liters", "18 liters", "10 liters"], 0,
    "Milk = 42L, Water = 18L. 42/(18+x) = 7/5 => 210 = 126 + 7x => 7x = 84 => x = 12."),
  // rounding is normal: 16.3636... written as 16.36
  q(["18.42", "16.36", "15.82", "17.14"], 1, "Total time = 7.1667h. Avg = 120 / 7.1667 = 16.3636 km/h."),
];
check("a solution that does reach it passes", soundKey.every(solutionReachesTheAnswer),
  `${soundKey.filter((x) => !solutionReachesTheAnswer(x)).length} wrongly caught`);
check("...including one rounded on the way", solutionReachesTheAnswer(soundKey[3]));

// ---- the tolerance has to be smaller than the gap between the options
// A compound-interest question with options 200/202/204/206 ticked 204 while
// its own solution ended on 202, and a flat 2% allowed 4 either way, so the
// two looked like the same number.
check("close options are judged tightly",
  !solutionReachesTheAnswer(q(["Rs. 206", "Rs. 200", "Rs. 202", "Rs. 204"], 3,
    "A = 5000(1.02)^2 = 5000 * 1.0404 = 5202. CI = 5202 - 5000 = 202.")));
check("...and the same question ticked correctly still passes",
  solutionReachesTheAnswer(q(["Rs. 206", "Rs. 200", "Rs. 202", "Rs. 204"], 2,
    "A = 5000(1.02)^2 = 5000 * 1.0404 = 5202. CI = 5202 - 5000 = 202.")));

// ---- questions this cannot judge are left alone
const notJudgeable = [
  q(["1:7", "2:7", "1:8", "4:32"], 0, "By alligation: (28-0) : (32-28) = 7:1, so water to milk is 1:7."),
  q(["Both I and II follow", "Only II follows", "Neither follows", "Only I follows"], 3,
    "All cars are inside the train circle, so Conclusion I follows and II does not."),
  q(["भाववाचक", "व्यक्तिवाचक", "समूहवाचक", "जातिवाचक"], 1, "'राम' एक विशेष व्यक्ति का नाम है।"),
  q(["School", "Book", "College", "Student"], 0, "A doctor works in a hospital; a teacher works in a school."),
];
check("a ratio, a syllogism, a Hindi or a word question is not judged this way",
  notJudgeable.every(solutionReachesTheAnswer),
  `${notJudgeable.filter((x) => !solutionReachesTheAnswer(x)).length} wrongly caught`);

// ---- the re-verify family, which the first version of the other rule missed
const flailing =
  "Rate = (532/6588)*100 = 8.07% approx, however calculation based on common CGL set leads to 7%. " +
  "Let's re-verify: SI for 2yr is 1064. 532/6588 = 8.07%. If we assume standard values, 7% is standard.";
check("'let's re-verify' is caught, not just 're-check'", arguesWithItself(flailing));
check("...as is 'if we assume standard values'", arguesWithItself("The answer is 12. If we assume standard values, 15 is standard."));
check("...while a solution that simply explains is not",
  !["15% of 800 = (15/100) * 800 = 120.",
    "Average price = (2*20 + 3*30) / 5 = Rs. 26.",
    "Option A is ruled out because a committee is singular here.",
  ].some(arguesWithItself));

// ---- through the gate, and never mended
const full = {
  text: "A train covers 600 km. If its speed rises by 20 km/h the journey is 2 hours shorter. What was its original speed?",
  textHi: "एक ट्रेन 600 किमी चलती है। गति 20 किमी/घंटा बढ़ने पर यात्रा 2 घंटे कम हो जाती है। मूल गति क्या थी?",
  options: ["80 km/h", "60 km/h", "100 km/h", "75 km/h"],
  optionsHi: ["80 किमी/घंटा", "60 किमी/घंटा", "100 किमी/घंटा", "75 किमी/घंटा"],
  correctIndex: 3,
  solution: "600/x - 600/(x+20) = 2 gives x^2 + 20x - 6000 = 0, so (x+100)(x-60) = 0 and x = 60 km/h.",
  solutionHi: "हल करने पर x = 60 किमी/घंटा आता है।",
  subject: "Maths", topic: "Time Speed Distance",
};
const r = ruleBasedCheck(full);
check("the gate refuses it", !r.passed, r.issues.join(", "));
check("...saying the solution never arrives there", /never arrives/.test(r.issues.join(", ")), r.issues.join(", "));
check("...and ticking the answer its own solution reaches makes it pass",
  ruleBasedCheck({ ...full, correctIndex: 1 }).passed,
  ruleBasedCheck({ ...full, correctIndex: 1 }).issues.join(", "));

const factorySrc = require("fs").readFileSync(path.join(SERVER, "services/questionFactory.js"), "utf8");
check("it is fatal, never repaired into passing",
  /never arrives/.test((factorySrc.match(/const fatal[^\n]*/) || [""])[0]));

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
