// Number System chapter health, second pass (2026-10-21, after the repeat
// check learned signs and powers): two repeats it still found, and Mixed
// Practice Easy #1 had four prime-number questions out of twenty.
const L = require("./lib");
const NS = (s) => `Number System · ${s}`;
const fmtN = (n) => Number(n).toLocaleString("en-US");
const Q = (t, r, rr, q, qh, o, a, value, s, sh) => ({ t: NS(t), r, rr, q, qh, o, a, v: () => L.only(o, a, String(value())), s, sh });
const digitSum = (n) => String(n).split("").reduce((x, d) => x + Number(d), 0);

module.exports = [
  Q("Mixed Practice · Easy #1", "6ab61e5d61dca3cc05bcb9dc", "fourth prime-number question in the test (smallest prime)",
    "What is the place value of 6 in 36,481?", "36,481 में 6 का स्थानीय मान क्या है?", ["6,000", "6", "600", "60,000"], 0, () => fmtN(6 * 1000),
    "36,481 = 3 ten-thousands + 6 thousands + 4 hundreds + 8 tens + 1. The 6 stands in the thousands place, so its place value is 6 × 1,000 = 6,000.", "36,481 = 3 दस-हज़ार + 6 हज़ार + 4 सैकड़े + 8 दहाई + 1। 6 हज़ार के स्थान पर है, अतः उसका स्थानीय मान 6 × 1,000 = 6,000 है।"),
  Q("Mixed Practice · Easy #1", "6acd18004b4d1fff46f7fd22", "fourth prime-number question in the test (which is prime)",
    "What is the least number that must be added to 2,345 to make it divisible by 9?", "2,345 में कम से कम कौन-सी संख्या जोड़ी जाए कि वह 9 से विभाज्य हो जाए?", ["4", "5", "3", "1"], 0, () => (9 - (2345 % 9)) % 9,
    "A number is divisible by 9 when its digit sum is. 2 + 3 + 4 + 5 = 14, and the next multiple of 9 is 18, so add 4 (2,349: 2 + 3 + 4 + 9 = 18).", "कोई संख्या 9 से तब विभाज्य है जब उसके अंकों का योग हो। 2 + 3 + 4 + 5 = 14, और 9 का अगला गुणज 18, अतः 4 जोड़ें (2,349: 2 + 3 + 4 + 9 = 18)।"),
  Q("Mixed Practice · Easy #2", "6acddce57813ed207765eb77", "repeats a question already in the chapter (sum of the first five odd numbers)",
    "What is the product of the smallest two-digit number and the largest one-digit number?", "दो अंकों की सबसे छोटी संख्या और एक अंक की सबसे बड़ी संख्या का गुणनफल क्या है?", ["90", "99", "81", "100"], 0, () => 10 * 9,
    "The smallest two-digit number is 10 and the largest one-digit number is 9. 10 × 9 = 90.", "दो अंकों की सबसे छोटी संख्या 10 और एक अंक की सबसे बड़ी संख्या 9 है। 10 × 9 = 90।"),
  Q("Divisibility Rules · Easy #1", "6acd4776dafb7a49255fdd6a", "repeats a question already in the chapter (divisible by 11)",
    "What is the smallest digit that can replace * in 4*72 so that the number is divisible by 9?", "4*72 में * के स्थान पर कौन-सा सबसे छोटा अंक रखा जाए कि संख्या 9 से विभाज्य हो जाए?", ["5", "4", "6", "0"], 0, () => L.range(0, 9).find((d) => digitSum(4072 + 100 * d) % 9 === 0),
    "The digit sum must be a multiple of 9: 4 + * + 7 + 2 = 13 + *. The smallest choice is * = 5 (sum 18), giving 4,572 = 9 × 508.", "अंकों का योग 9 का गुणज हो: 4 + * + 7 + 2 = 13 + *। सबसे छोटा * = 5 (योग 18), जिससे 4,572 = 9 × 508।"),
];
