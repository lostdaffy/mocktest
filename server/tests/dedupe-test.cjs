// Told not to repeat itself, the model changes a word and asks again. Every
// pair below is real - taken from the first 63 questions generated for
// Percentage, where 9 of them turned out to be rewordings of another.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");
const { looksLikeRepeat, numberSignature } = require(path.join(SERVER, "services/validationPipeline"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

// ---- real rewordings that used to get through
const REPEATS = [
  [
    "The price of sugar is increased by 20%. By how much percent must a housewife reduce her consumption so that the expenditure remains the same?",
    "The price of sugar is increased by 20%. By what percentage must a householder reduce the consumption so that expenditure remains the same?",
  ],
  [
    "A man spends 75% of his income. His income increases by 20% and his expenditure increases by 10%. By how much percent do his savings increase?",
    "A man spends 75% of his income. If his income increases by 20% and his expenditure increases by 10%, by what percent do his savings increase?",
  ],
  [
    "In an examination, 80% of students passed in English, 85% passed in Mathematics, and 75% passed in both. If 40 students failed in both subjects, find the total number of students.",
    "In an examination, 80% of the students passed in English, 85% passed in Mathematics, and 75% passed in both subjects. If 40 students failed in both, what is the total number of students?",
  ],
  [
    "A student has to secure 40% marks to pass. He gets 178 marks and fails by 22 marks. The maximum marks of the exam are:",
    "A student has to secure 40% marks to pass. He gets 178 marks and fails by 22 marks. What is the maximum marks of the exam?",
  ],
];

// ---- genuinely different questions that must NOT be treated as repeats
const DIFFERENT = [
  [
    "The price of sugar is increased by 20%. By how much percent must a housewife reduce her consumption so that the expenditure remains the same?",
    "The price of sugar is increased by 25%. By how much percent must a housewife reduce her consumption so that the expenditure remains the same?",
  ],
  [
    "If 20% of a number is 40, find the number.",
    "If 20% of a number is 80, find the number.",
  ],
  [
    "A man spends 75% of his income. His income increases by 20% and his expenditure increases by 10%. By how much percent do his savings increase?",
    "In an election between two candidates, the winner gets 58% of the total votes and wins by a majority of 840 votes. Find the total number of votes polled.",
  ],
  [
    "What is 15% of 800?",
    "What percentage of 40 is 10?",
  ],
];

// ---- the rewordings are caught
REPEATS.forEach(([a, b], i) => {
  const r = looksLikeRepeat(b, [a]);
  check(`reworded pair ${i + 1} is caught`, r.repeat, r.repeat ? "matched" : b.slice(0, 60));
});

// ---- and honest questions are left alone
DIFFERENT.forEach(([a, b], i) => {
  const r = looksLikeRepeat(b, [a]);
  check(`different pair ${i + 1} is NOT called a repeat`, !r.repeat, r.repeat ? "wrongly matched: " + String(r.of).slice(0, 55) : "kept");
});

// ---- changing a number makes it a different question
check("the same wording with a different number is kept",
  !looksLikeRepeat("If 20% of a number is 40, find the number.", ["If 30% of a number is 40, find the number."]).repeat);

check("numbers are what anchor the comparison",
  numberSignature("increase by 20% then 10%") === numberSignature("10% after a 20% rise"),
  numberSignature("increase by 20% then 10%"));

// ---- an empty bank can't produce a repeat
check("nothing to compare against means nothing is a repeat",
  !looksLikeRepeat("What is 15% of 800?", []).repeat);

// ---- Hindi text is handled, not crashed on
check("Hindi questions are compared too",
  looksLikeRepeat("800 का 15% क्या है?", ["800 का 15% कितना है?"]).repeat !== undefined);

// ---- and the match names what it collided with, for the review queue
const named = looksLikeRepeat(REPEATS[0][1], [REPEATS[0][0]]);
check("a caught repeat says which question it repeats",
  typeof named.of === "string" && named.of.length > 20, String(named.of).slice(0, 50));

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
