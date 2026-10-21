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

// ---- maths stems: the few words that make a different question
const MATHS_DIFFERENT = [
  ["What is the largest three-digit number divisible by 7?", "What is the smallest three-digit number divisible by 7?"],
  ["What is the smallest four-digit number divisible by 7?", "What is the smallest three-digit number divisible by 7?"],
  ["Every number divisible by 8 is also divisible by:", "A number is divisible by 8 if:"],
  ["Which of 2,346 and 4,566 is NOT divisible by 4?", "Which of 2,346 and 4,566 is divisible by 4?"],
  ["What is the unit digit of 3⁷?", "What is the unit digit of 7³?"],
  ["What is the unit digit of 7⁴⁵?", "What is the unit digit of 7⁴⁶?"],
  ["How many three-digit numbers are divisible by 13?", "Find the sum of all three-digit numbers which are divisible by 13."],
  ["How many four-digit numbers have all their digits even and are divisible by 5?", "How many four-digit numbers have all their digits odd and are divisible by 5?"],
  ["What is the largest five-digit number with all digits different that is divisible by 4?", "What is the largest four-digit number with all digits different that is divisible by 5?"],
  ["How many two-digit numbers are divisible by the product of their own digits?", "How many two-digit numbers are divisible by the sum of their own digits?"],
  ["If the four-digit number 7ab6 is divisible by 66, what is the value of a − b?", "If the four-digit number 7a6b is divisible by 66, what is the value of a + b?"],
  ["The product of any five consecutive natural numbers is always divisible by:", "The product of any four consecutive natural numbers is always divisible by:"],
  // Number System chapter health, 2026-10-21: pairs it called repeats.
  ["What is the remainder when (123 + 456) is divided by 7?", "What is the remainder when 123 × 456 is divided by 7?"],
  ["What is the unit digit of 3⁴ × 7⁴?", "What is the unit digit of 7⁴ − 3⁴?"],
  ["For any natural number n, what is the unit digit of 6ⁿ + 5ⁿ?", "For any natural number n, what is the unit digit of 6ⁿ − 5ⁿ?"],
  ["What is the remainder when 3¹⁰⁰ is divided by 4?", "What is the remainder when 4¹⁰⁰ is divided by 3?"],
  ["What is the unit digit of 5⁵ + 6⁶?", "What is the unit digit of 5⁶ + 6⁵?"],
  ["What is the remainder when 1! + 2! + 3! + ... + 100! is divided by 7?", "What is the remainder when 1 + 2 + 3 + ... + 100 is divided by 7?"],
  ["How many zeros are there at the end of (100! − 99!)?", "How many zeros are there at the end of 99! + 100!?"],
  ["How many different digits can occur as the unit digit of a perfect square?", "How many different digits can occur as the unit digit of a perfect cube?"],
  ["How many three-digit numbers are divisible by 7?", "What is the smallest three-digit number divisible by 7?"],
  ["How many three-digit numbers are divisible by 9?", "How many three-digit numbers with all digits different are divisible by 9?"],
  ["Find the unit digit of 7³.", "The unit digit of x³ is 7. What is the unit digit of x?"],
  ["What is the unit digit of the product of all prime numbers less than 100?", "What is the unit digit of the product of all odd prime numbers less than 100?"],
  ["What is the sum of the reciprocals of all the divisors of 360?", "Find the sum of all divisors (factors) of 360."],
  // Percentage, 2026-10-21: the same numbers going the other way
  ["x is increased by 40% and y is decreased by 30%. What is the change in x/y?", "x is decreased by 30% and y is increased by 40%. What is the change in x/y?"],
  ["A delivery rider lowers the speed by 10% and travels for 20% more time. What is the change in the distance covered?", "A motorcyclist lowers the speed by 20% and travels for 10% more time. What is the change in the distance covered?"],
  ["The radius of a cylinder is increased by 20% and its height is decreased by 25%. What is the change in its volume?", "The radius of the base of a cone is decreased by 20% and its height is increased by 25%. What is the change in its volume?"],
  ["A's salary is 20% more than B's. By what percent is B's salary less than A's?", "A's salary is 20% less than B's. By what percent is B's salary more than A's?"],
];
MATHS_DIFFERENT.forEach(([a, b], i) => check(`a different maths question is not a repeat (${i + 1})`, !looksLikeRepeat(a, [b]).repeat && !looksLikeRepeat(b, [a]).repeat, a));
const MATHS_SAME = [
  ["What is the smallest four-digit number divisible by 15?", "What is the smallest four-digit number that is divisible by 15?"],
  ["What is the LCM of 12, 15 and 20?", "Find the LCM of 12, 15, and 20."],
  ["What is the unit digit of 7⁴⁵?", "Find the unit digit of 7^45."],
  // divisors are factors, GCD is HCF
  ["Find the number of total divisors of the number 120.", "Find the number of total factors of 120."],
  ["What is the GCD of 48 and 72?", "Find the HCF of 48 and 72."],
  // and the real repeats chapter health found must stay repeats
  ["Find the unit digit in the product 7 × 12 × 15 × 19.", "Find the unit digit of the product 7 x 12 x 15 x 19."],
  ["What is the unit digit of 7⁹⁵ - 3⁵⁸?", "What is the unit digit of the expression 7⁹⁵ - 3⁵⁸?"],
  ["For any natural number n, what is the unit digit of 5ⁿ + 6ⁿ + 1?", "For any natural number n, what is the unit digit of 1ⁿ + 5ⁿ + 6ⁿ?"],
  ["The sum of three consecutive odd numbers is 57. What is the middle number?", "The sum of three consecutive odd numbers is 57. What is the largest of these numbers?"],
  ["How many divisors of 10800 are perfect squares?", "Find the number of divisors of 10800 which are perfect squares."],
  // ...and the same changes in another order, or with another verb, stay repeats
  ["A value is increased by 20%, then decreased by 20% and then increased by 25%. What is the overall change?", "A price is decreased by 20%, then increased by 25% and then increased by 20%. What is the overall change?"],
  ["Two successive discounts of 10% and 20% are equal to a single discount of:", "Two successive discounts of 20% and 10% are equal to a single discount of:"],
  ["x is increased by 40% and y is decreased by 30%. What is the change in x/y?", "x is increased by 40% and y is reduced by 30%. What is the change in x/y?"],
  ["The price of sugar rises by 25%. By what percentage must a family reduce its consumption so that its spending stays the same?", "The price of sugar is increased by 25%. By what percentage must a family reduce its consumption so that its spending stays the same?"],
];
MATHS_SAME.forEach(([a, b], i) => check(`a reworded maths question is a repeat (${i + 1})`, looksLikeRepeat(a, [b]).repeat, a));
// Which factors it asks about changes the question.
[["How many even factors does 5,040 have?", "How many factors does 5,040 have?"], ["How many odd factors does 540 have?", "How many factors does 540 have?"], ["How many composite factors does 360 have?", "How many factors does 360 have?"]].forEach(([a, b], i) => check(`a different kind of factor is not a repeat (${i + 1})`, !looksLikeRepeat(a, [b]).repeat, a));

// ---- one paper asking the same fact twice, across sections. Real pairs
//      from the first two Super TET mocks; the bank check (one subject at a
//      time) let every one through.
const { sameFactInPaper } = require(path.join(SERVER, "services/validationPipeline"));
const Q = (text, options, correctIndex) => ({ text, options, correctIndex });
const SAME = [
  [Q("भारतीय संविधान की प्रस्तावना में 'समाजवादी' शब्द किस संशोधन द्वारा जोड़ा गया था?", ["44वां संशोधन", "61वां संशोधन", "52वां संशोधन", "42वां संशोधन"], 3),
   Q("भारतीय संविधान की प्रस्तावना में 'समाजवादी' शब्द किस संशोधन के माध्यम से जोड़ा गया था?", ["61वां संविधान संशोधन", "44वां संविधान संशोधन", "52वां संविधान संशोधन", "42वां संविधान संशोधन"], 3)],
  [Q("प्रसिद्ध रचना 'कामायनी' के रचयिता कौन हैं?", ["सूर्यकांत त्रिपाठी", "जयशंकर प्रसाद", "महादेवी वर्मा", "सुमित्रानंदन पंत"], 1),
   Q("हिंदी के प्रसिद्ध उपन्यास 'कामायनी' के रचयिता कौन हैं?", ["महावीर प्रसाद द्विवेदी", "सूर्यकांत त्रिपाठी 'निराला'", "जयशंकर प्रसाद", "सुमित्रानंदन पंत"], 2)],
  [Q("अक्षर श्रृंखला 2, 6, 12, 20, 30, ? में लुप्त संख्या ज्ञात कीजिए।", ["42", "36", "44", "40"], 0),
   Q("श्रृंखला का अगला पद ज्ञात कीजिए: 2, 6, 12, 20, 30, ?", ["44", "40", "36", "42"], 3)],
  [Q("भारत की सबसे लंबी नदी कौन सी है जो पूरी तरह से भारत में बहती है?", ["गोदावरी", "गंगा नदी", "यमुना", "नर्मदा"], 1),
   Q("भारत की सबसे लंबी नदी कौन सी है?", ["सिंधु", "ब्रह्मपुत्र", "गंगा", "गोदावरी"], 2)],
];
SAME.forEach(([a, b], i) => check(`same fact in one paper is caught (${i + 1})`, sameFactInPaper(a, b) && sameFactInPaper(b, a)));

const NOT_SAME = [
  // same answer, different question
  [Q("‘रामचरितमानस’ के रचयिता कौन हैं?", ["तुलसीदास", "कबीरदास", "सूरदास", "रसखान"], 0),
   Q("'रामाज्ञा प्रश्न' किसकी रचना है?", ["सूरदास", "जायसी", "कबीरदास", "तुलसीदास"], 3)],
  // similar words, different answer
  [Q("निम्न में से कौन सा शब्द ‘आकाश’ का पर्यायवाची नहीं है?", ["गगन", "अवनि", "नभ", "व्योम"], 1),
   Q("निम्न में से कौन सा शब्द 'हवा' का पर्यायवाची शब्द है?", ["अंश", "अंबु", "अनल", "अनिल"], 3)],
  // same answer, unrelated
  [Q("संख्याओं 12 और 18 का महत्तम समापवर्त्य (HCF) क्या होगा?", ["9", "3", "4", "6"], 3),
   Q("पहली पाँच प्राकृतिक संख्याओं का औसत क्या है?", ["4", "2", "6", "5"], 2)],
  [Q("विश्व स्वास्थ्य संगठन (WHO) द्वारा परिभाषित जीवन कौशल शिक्षा का मुख्य उद्देश्य क्या है?", ["व्यक्तिगत कौशल का विकास करना", "x", "y", "z"], 0),
   Q("विश्व स्वास्थ्य संगठन (WHO) द्वारा प्रतिपादित जीवन कौशल प्रारूप में, निर्णय लेने की क्षमता का अर्थ है:", ["तर्कपूर्ण विकल्पों का चयन करना", "x", "y", "z"], 0)],
];
NOT_SAME.forEach(([a, b], i) => check(`different questions are left alone (${i + 1})`, !sameFactInPaper(a, b) && !sameFactInPaper(b, a)));

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
