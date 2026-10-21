// The answer-proof engine: the working language (services/mathCheck.js), the
// two-working proof (services/answerProof.js) and the rules found by reading
// real questions (services/qualityRules.js). Pure functions - no server, no
// database, no AI.
//
//   node tests/answer-proof-test.cjs
const path = require("path");
const SERVER = path.resolve(__dirname, "..");
const { evaluateArithmetic } = require(path.join(SERVER, "services/mathCheck"));
const { proveAnswer } = require(path.join(SERVER, "services/answerProof"));
const R = require(path.join(SERVER, "services/qualityRules"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `   [${detail}]` : ""}`);
};
const val = (s) => { try { return evaluateArithmetic(s).value; } catch (e) { return "ERR " + e.message; } };
const fails = (s) => { try { evaluateArithmetic(s); return false; } catch { return true; } };

// ---- the working language: everything the old one did still works
[["1200 * 12 * 3 / 100", 432], ["(450 - 360) / 360 * 100", 25], ["lcm(12, 18, 24)", 72], ["sqrt(144) + 3^2", 21], ["20% * 500", 100], ["hcf(48, 72)", 24], ["2 ^ 3 ^ 2", 512]]
  .forEach(([s, v]) => check(`arithmetic: ${s} = ${v}`, val(s) === v, String(val(s))));

// ---- and the counting questions of Number System can now be worked in code
// (each answer below was verified independently when the questions were written)
[
  ["count(n, 1, 2000, mod(n,2)!=0 and mod(n,3)!=0 and mod(n,5)!=0 and mod(n,7)!=0)", 458],
  ["count(n, 1, 999, mod(sigma(n), 2) == 1)", 53],
  ["powmod(3, 256, 13)", 3],
  ["powmod(9, 99, 80)", 9],
  ["mod(unitdigit(24, 57) * unitdigit(37, 49), 10)", 8],
  ["sum(d, 1, 2520, (mod(2520, d) == 0 and mod(d, 2) == 1) * d)", 1 + 3 + 5 + 7 + 9 + 15 + 21 + 35 + 45 + 63 + 105 + 315],
  ["count(d, 1, 2520, mod(2520, d) == 0 and mod(d, 2) == 1)", 12],
  ["tau(2520)", 48],
  ["sigma(84)", 224],
  ["phi(360)", 96],
  ["first(n, 1000, 9999, mod(n, 23) == 0)", 1012],
  ["last(n, 100, 999, mod(n,4)==1 and mod(n,5)==2 and mod(n,7)==3)", 997],
  ["count(n, 1, 100, isprime(n))", 25],
  ["fact(5) / fact(3)", 20],
  ["ncr(10, 3)", 120],
  ["digitsum(4572)", 18],
  ["count(n, 311, 499, mod(n, 12) == 0)", 16],
].forEach(([s, v]) => check(`counting: ${s} = ${v}`, val(s) === v, String(val(s))));

// ---- and it cannot be made to misbehave
check("an unknown function is refused", fails("process(1)"));
check("a letter outside a loop is refused", fails("n + 1"));
check("a loop needs a letter", fails("count(3, 1, 2, 1)"));
check("a huge loop is refused", fails("count(n, 1, 5000000, 1)"));
check("nested loops are capped in total", fails("count(a, 1, 2000, count(b, 1, 2000, 1) > 0)"));
check("mod by zero is refused", fails("mod(5, 0)"));
check("tau of a giant number is refused", fails("tau(10000000000000)"));
check("no way to reach JavaScript", fails("constructor") && fails("this") && fails("require(1)"));

// ---- proof: two workings, both run in code, both must land on the key
const q = { options: ["458", "457", "480", "456"], correctIndex: 0, formula: "count(n,1,2000,mod(n,2)!=0 and mod(n,3)!=0 and mod(n,5)!=0 and mod(n,7)!=0)" };
check("two agreeing workings prove the key", proveAnswer(q, "2000 - count(n,1,2000, mod(n,2)==0 or mod(n,3)==0 or mod(n,5)==0 or mod(n,7)==0)").verdict === "proven");
check("a checker landing elsewhere disproves it", proveAnswer(q, "457 + 1 - 1").verdict === "disproved");
check("a setter landing elsewhere disproves it", proveAnswer({ ...q, correctIndex: 1 }, "").verdict === "disproved");
check("one working alone is not a proof", proveAnswer(q, "").verdict === "unproven");
check("a working off every option disproves it", proveAnswer(q, "400 + 1").verdict === "disproved");
check("word answers are left to the checker", proveAnswer({ options: ["3:4", "4:3", "1:2", "2:1"], correctIndex: 0 }, "").verdict === "unproven");

// ---- rules found in real questions
check("between 300 and 500 for multiples of 12 is ambiguous", !!R.ambiguousBetween({ text: "How many multiples of 12 lie between 300 and 500?" }));
check("between 310 and 500 is not", !R.ambiguousBetween({ text: "How many multiples of 12 lie between 310 and 500?" }));
check("saying the ends count settles it", !R.ambiguousBetween({ text: "How many multiples of 12 are there between 300 and 500 (both included)?" }));
check("primes between 30 and 50 is not ambiguous", !R.ambiguousBetween({ text: "How many prime numbers are there between 30 and 50?" }));
check("Hindi 'के बीच' is read too", !!R.ambiguousBetween({ text: "How many multiples of 12 are there?", textHi: "300 और 500 के बीच 12 के कितने गुणज हैं?" }));
check("Yes / No / Maybe options are refused", !!R.yesNoOptions({ options: ["Yes", "No", "Maybe", "Cannot say"] }));
check("numeric options are fine", !R.yesNoOptions({ options: ["1", "2", "3", "4"] }));
check("a number changed in the Hindi question is caught", !!R.numbersChangedInHindi({ text: "What is 15% of 800?", textHi: "800 का 51% क्या है?" }));
check("an option changed in Hindi is caught", !!R.numbersChangedInHindi({ text: "What is 15% of 800?", textHi: "800 का 15% क्या है?", options: ["120", "45"], optionsHi: ["120", "54"] }));
check("Devanagari digits are the same numbers", !R.numbersChangedInHindi({ text: "What is 15% of 800?", textHi: "८०० का १५% क्या है?", options: ["120"], optionsHi: ["१२०"] }));
check("numbers written as words in Hindi are fine", !R.numbersChangedInHindi({ text: "What is the sum of 2 and 3?", textHi: "दो और तीन का योग क्या है?" }));
check("the same pattern with new numbers is one pattern", R.samePattern("How many even factors does 5,040 have?", "How many even factors does 1,800 have?"));
check("odd factors is another pattern", !R.samePattern("How many even factors does 5,040 have?", "How many odd factors does 5,040 have?"));
check("a different question is another pattern", !R.samePattern("How many even factors does 5,040 have?", "What is the sum of the factors of 5,040?"));

// ---- the gate's decision: code outranks a model's say-so
const { applyVerification, ruleBasedCheck } = require(path.join(SERVER, "services/validationPipeline"));
const mq = { ...q, subject: "Maths", text: "How many numbers from 1 to 2,000 are divisible by none of 2, 3, 5 and 7?" };
const goodChecker = "2000 - count(n,1,2000, mod(n,2)==0 or mod(n,3)==0 or mod(n,5)==0 or mod(n,7)==0)";
let d = applyVerification(mq, { matches: false, aiSaid: "457", confidence: 0.4, checkerFormula: goodChecker });
check("a right key the checker's words dispute is still published when both workings prove it", d.status === "published" && d.answerProof === "proven", d.flagReason);
d = applyVerification(mq, { matches: true, aiSaid: "458", confidence: 0.95, checkerFormula: "count(n,1,2000,mod(n,2)!=0) - 543" });
check("a key the checker 'agrees' with is held when its own working lands elsewhere", d.status === "under_review" && /worked in code/.test(d.flagReason), d.flagReason);
d = applyVerification(mq, { matches: true, aiSaid: "458", confidence: 0.95, checkerFormula: "" });
check("with only one working the model's verdict decides, as before", d.status === "published" && !d.answerProof);
d = applyVerification({ ...mq, subject: "GK", options: ["Delhi", "Agra", "Pune", "Goa"] }, { matches: true, aiSaid: "Delhi", confidence: 0.9 });
check("non-maths questions are judged as before", d.status === "published");
d = applyVerification(mq, { matches: false, aiSaid: null, confidence: 0, error: "quota", checkerFormula: goodChecker });
check("a checker that failed proves nothing", d.status === "under_review");

// ---- and the new rules reach the gate itself
const base = { subject: "Maths", textHi: "प्रश्न", options: ["16", "17", "15", "18"], optionsHi: ["16", "17", "15", "18"], correctIndex: 0, solution: "From 312 to 492 there are 16 multiples of 12 = 16.", solutionHi: "312 से 492 तक 16 गुणज = 16।" };
const gate = (over) => ruleBasedCheck({ ...base, ...over }).issues;
check("the gate refuses an ambiguous 'between'", gate({ text: "How many multiples of 12 lie between 300 and 500?" }).some((i) => /^ambiguous:/.test(i)));
check("the gate refuses a number changed in Hindi", gate({ text: "How many multiples of 12 lie between 310 and 500?", textHi: "310 और 600 के बीच 12 के कितने गुणज हैं?" }).some((i) => /^translation:/.test(i)));
check("the gate passes the clear version", !gate({ text: "How many multiples of 12 lie between 310 and 500?", textHi: "310 और 500 के बीच 12 के कितने गुणज हैं?" }).some((i) => /^(ambiguous|translation):/.test(i)));

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
