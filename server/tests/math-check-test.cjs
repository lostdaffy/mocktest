// The sums a question rests on, worked out in code. Every "wrong" case below
// was published - in the Super TET mocks or in the HCF & LCM practice tests -
// and the model's own re-solve had passed it. Every "left alone" case is a
// real question the first version of the checker misread.
const path = require("path");
const SERVER = path.resolve(__dirname, "..");
const { checkArithmetic } = require(path.join(SERVER, "services/mathCheck"));
const { ruleBasedCheck } = require(path.join(SERVER, "services/validationPipeline"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 110) + "]" : ""}`);
};
const run = (text, options, correctIndex) => checkArithmetic({ text, options, correctIndex });

const WRONG = [
  ["यदि दो संख्याओं का महत्तम समापवर्तक (HCF) 12 है और उनका लघुत्तम समापवर्त्य (LCM) 600 है, तथा एक संख्या 120 है, तो दूसरी संख्या क्या होगी?", ["72", "90", "48", "60"], 3],
  ["The HCF of two numbers is 12 and their LCM is 240. If one of the numbers is 80, then the other number is:", ["60", "36", "48", "72"], 1],
  ["The HCF of two numbers is 12 and their LCM is 600. If one of the numbers is 84, what is the other number?", ["86.42", "88.24", "87.55", "85.71"], 3],
  ["The HCF and LCM of two numbers are 8 and 480 respectively. If one number is 80, find the other number.", ["60", "42", "48", "54"], 2],
  ["The HCF of two numbers is 11 and their product is 770. What is their LCM?", ["90", "70", "60", "80"], 1],
  ["संख्या पद्धति के अनुसार, 58439 में अंक 4 का स्थानीय मान तथा जातीय मान का अंतर क्या है?", ["3996", "4004", "4040", "3960"], 0],
  ["संख्या 75689 में अंक 6 के स्थानीय मान और जातीय मान का अंतर क्या है?", ["5996", "5994", "6000", "5990"], 1],
  ["एक निश्चित राशि साधारण ब्याज की दर से 4 वर्षों में 6800 रुपये और 7 वर्षों में 8600 रुपये हो जाती है। ब्याज की वार्षिक दर ज्ञात कीजिए।", ["15%", "8%", "12.5%", "10%"], 2],
  ["12, 18 और 24 का लघुत्तम समापवर्त्य (LCM) ज्ञात कीजिए।", ["36", "72", "96", "48"], 0],
];
WRONG.forEach(([t, o, c], i) => {
  const r = run(t, o, c);
  check(`a wrong key or an impossible question is caught (${i + 1})`, r.ok === false, r.reason);
});

const RIGHT = [
  ["दो संख्याओं का HCF 12 है और LCM 72 है, एक संख्या 24 है, तो दूसरी संख्या?", ["72", "48", "36", "60"], 2],
  ["दो संख्याओं का महत्तम समापवर्तक (HCF) 8 है और उनका गुणनफल 384 है, तो उनका लघुत्तम समापवर्त्य (LCM) क्या होगा?", ["48", "52", "56", "42"], 0],
  ["एक राशि साधारण ब्याज पर 3 वर्षों में 815 रुपये और 4 वर्षों में 854 रुपये हो जाती है। वह मूलधन क्या है?", ["718 रुपये", "698 रुपये", "688 रुपये", "708 रुपये"], 1],
  ["संख्या 4567 में अंक 5 का स्थानीय मान क्या है?", ["5000", "50", "5", "500"], 3],
  ["12, 18 और 24 का लघुत्तम समापवर्त्य (LCM) ज्ञात कीजिए।", ["36", "72", "96", "48"], 1],
  ["संख्या 45, 75 और 165 का महत्तम समापवर्तक (HCF) क्या होगा?", ["5", "25", "45", "15"], 3],
];
RIGHT.forEach(([t, o, c], i) => {
  const r = run(t, o, c);
  check(`a right one passes (${i + 1})`, r.ok === true, JSON.stringify(r));
});

const LEFT = [
  ["The LCM of two numbers is 12 times their HCF. The sum of HCF and LCM is 403. If one of the numbers is 93, then the other number is:", ["124", "132", "128", "136"], 0],
  ["Find the LCM and HCF of two numbers whose product is 2160 and their HCF is 12. Find the other number if one number is 60.", ["42", "36", "48", "32"], 1],
  ["If two numbers are 15 and 20, what is the product of their HCF and LCM?", ["150", "300", "200", "450"], 1],
  ["The LCM of two numbers is 120 and their HCF is 6. If one of the numbers is 30, what is the sum of the other number and the first number?", ["50", "54", "60", "48"], 1],
  ["The HCF and LCM of two numbers are 29 and 4147 respectively. If one of the numbers is greater than 29, find the number.", ["319", "696", "435", "961"], 0],
  ["2^3 × 3^2 और 2^2 × 3^3 का HCF क्या है?", ["36", "72", "108", "216"], 2],
  ["वह छोटी से छोटी संख्या कौन सी है जिसे 12, 16, 24 और 36 से विभाजित करने पर शेषफल 7 बचे?", ["151", "439", "583", "295"], 0],
  ["The HCF of two natural numbers is 12 and their sum is 144. How many such pairs of numbers are there?", ["2", "3", "4", "6"], 0],
  ["The LCM of two co-prime numbers is 391. If one of them is 17, what is the other?", ["19", "21", "23", "29"], 2],
  ["What is the LCM of the first ten natural numbers (1 to 10)?", ["2520", "5040", "1260", "3628800"], 0],
];
LEFT.forEach(([t, o, c], i) => {
  const r = run(t, o, c);
  check(`a shape it cannot read for certain is left alone (${i + 1})`, r.ok === null, JSON.stringify(r));
});

// ---- and the quality gate refuses on it
const gate = ruleBasedCheck({
  text: WRONG[0][0], options: WRONG[0][1], correctIndex: WRONG[0][2],
  solution: "HCF x LCM = product of the numbers, so 12 x 600 = 120 x b, b = 60.",
  textHi: "x", optionsHi: ["a", "b", "c", "d"], solutionHi: "y", subject: "Maths",
});
check("the quality gate refuses an impossible HCF/LCM question", !gate.passed && gate.issues.some((i) => /maths check/.test(i)), gate.issues.join("; "));

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
