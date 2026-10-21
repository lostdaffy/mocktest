// Number System · Unit Digit · Easy #1 - #8: each test had 8 to 13 questions
// of one shape ("the unit digit of a^b"). The extra ones are replaced by
// other easy ideas - products, sums, differences, factorials, cyclicity,
// "a number ends in ..." - so a test teaches more than one thing.
// Every answer is worked out again in `v` (BigInt where numbers get big).
const L = require("./lib");
const T = (n) => `Number System · Unit Digit · Easy #${n}`;
const RR = "the test had more than five 'unit digit of a^b' questions";
const Q = (t, r, q, qh, o, a, value, s, sh, oh) => ({ t, r, rr: RR, q, qh, o, ...(oh ? { oh } : {}), a, v: () => L.only(o, a, String(value())), s, sh });
const ud = (x) => Number(BigInt(x) % 10n);
const prod = (...xs) => xs.reduce((a, b) => a * BigInt(b), 1n);
const fact = (n) => { let r = 1n; for (let k = 2n; k <= BigInt(n); k++) r *= k; return r; };
const pw = (b, e) => BigInt(b) ** BigInt(e);

module.exports = [
  // ------------------------------------------------------------------ #1
  Q(T(1), "6ad30b7f96cd975efdf8a584", "How many of the numbers 2¹, 2², 2³, ..., 2²⁰ have 6 as their unit digit?", "संख्याओं 2¹, 2², 2³, ..., 2²⁰ में से कितनी का इकाई अंक 6 है?", ["5", "4", "10", "6"], 0, () => L.range(1, 20).filter((e) => ud(pw(2, e)) === 6).length,
    "Unit digits of powers of 2 repeat as 2, 4, 8, 6. The unit digit is 6 when the power is a multiple of 4: 2⁴, 2⁸, 2¹², 2¹⁶, 2²⁰. That is 5.", "2 की घातों के इकाई अंक 2, 4, 8, 6 क्रम में दोहराते हैं। घात 4 का गुणज हो तो इकाई अंक 6: 2⁴, 2⁸, 2¹², 2¹⁶, 2²⁰। कुल 5।"),
  Q(T(1), "6ad30b7f96cd975efdf8a585", "What is the unit digit of 123 × 456 × 789?", "123 × 456 × 789 का इकाई अंक क्या है?", ["2", "8", "6", "4"], 0, () => ud(prod(123, 456, 789)),
    "Only the last digits matter: 3 × 6 = 18 → 8, then 8 × 9 = 72 → 2. The unit digit is 2.", "केवल अंतिम अंक देखें: 3 × 6 = 18 → 8, फिर 8 × 9 = 72 → 2। इकाई अंक 2 है।"),
  Q(T(1), "6ad30b7f96cd975efdf8a586", "What is the unit digit of (14 × 15 × 16) + 7?", "(14 × 15 × 16) + 7 का इकाई अंक क्या है?", ["7", "0", "4", "1"], 0, () => ud(14 * 15 * 16 + 7),
    "14 × 15 × 16 contains 2 × 5, so it ends in 0 (it is 3,360). Adding 7 gives a number ending in 7.", "14 × 15 × 16 में 2 × 5 है, अतः यह 0 पर समाप्त होता है (3,360)। 7 जोड़ने पर इकाई अंक 7।"),
  Q(T(1), "6ad30b7f96cd975efdf8a58a", "What is the unit digit of 12 × 25 × 37 + 4?", "12 × 25 × 37 + 4 का इकाई अंक क्या है?", ["4", "0", "8", "6"], 0, () => ud(12 * 25 * 37 + 4),
    "12 × 25 = 300 ends in 0, so 12 × 25 × 37 ends in 0 too (11,100). Adding 4 gives a unit digit of 4.", "12 × 25 = 300 का इकाई अंक 0, अतः 12 × 25 × 37 का भी 0 (11,100)। 4 जोड़ने पर इकाई अंक 4।"),
  Q(T(1), "6ad30b7f96cd975efdf8a58b", "What is the unit digit of 1! + 2! + 3! + 4!?", "1! + 2! + 3! + 4! का इकाई अंक क्या है?", ["3", "4", "0", "2"], 0, () => ud(fact(1) + fact(2) + fact(3) + fact(4)),
    "1! + 2! + 3! + 4! = 1 + 2 + 6 + 24 = 33, so the unit digit is 3.", "1! + 2! + 3! + 4! = 1 + 2 + 6 + 24 = 33, अतः इकाई अंक 3।"),
  Q(T(1), "6ad30b7f96cd975efdf8a58c", "Which of these numbers ends in 4: 2¹⁰, 3¹⁰, 4¹⁰ or 6¹⁰?", "इनमें से कौन-सी संख्या 4 पर समाप्त होती है: 2¹⁰, 3¹⁰, 4¹⁰ या 6¹⁰?", ["2¹⁰", "3¹⁰", "4¹⁰", "6¹⁰"], 0, () => ["2¹⁰", "3¹⁰", "4¹⁰", "6¹⁰"].filter((_, i) => ud(pw([2, 3, 4, 6][i], 10)) === 4).join(),
    "2¹⁰ = 1,024 ends in 4. 3¹⁰ ends in 9 (10 = 4 × 2 + 2), 4¹⁰ ends in 6 (even power) and 6¹⁰ ends in 6. So 2¹⁰.", "2¹⁰ = 1,024 का इकाई अंक 4। 3¹⁰ का 9 (10 = 4 × 2 + 2), 4¹⁰ का 6 (सम घात) और 6¹⁰ का 6। अतः 2¹⁰।"),
  Q(T(1), "6ad30b7f96cd975efdf8a58d", "What is the unit digit of 3² + 3³ + 3⁴?", "3² + 3³ + 3⁴ का इकाई अंक क्या है?", ["7", "9", "1", "3"], 0, () => ud(pw(3, 2) + pw(3, 3) + pw(3, 4)),
    "3² = 9, 3³ = 27, 3⁴ = 81. 9 + 27 + 81 = 117, so the unit digit is 7.", "3² = 9, 3³ = 27, 3⁴ = 81। 9 + 27 + 81 = 117, अतः इकाई अंक 7।"),
  Q(T(1), "6ad30b7f96cd975efdf8a590", "What is the unit digit of 7⁵ − 7⁴?", "7⁵ − 7⁴ का इकाई अंक क्या है?", ["6", "8", "4", "0"], 0, () => ud(pw(7, 5) - pw(7, 4)),
    "7⁴ ends in 1 and 7⁵ ends in 7, so 7⁵ − 7⁴ ends in 7 − 1 = 6 (16,807 − 2,401 = 14,406).", "7⁴ का इकाई अंक 1 और 7⁵ का 7, अतः 7⁵ − 7⁴ का 7 − 1 = 6 (16,807 − 2,401 = 14,406)।"),
  // ------------------------------------------------------------------ #2
  Q(T(2), "6ad30b8796cd975efdf8a5fa", "Which of these can never be the unit digit of a power of 3: 9, 7, 1 or 5?", "इनमें से कौन-सा अंक 3 की किसी घात का इकाई अंक कभी नहीं हो सकता: 9, 7, 1 या 5?", ["5", "9", "7", "1"], 0, () => ["5", "9", "7", "1"].filter((d) => !L.range(1, 8).some((e) => ud(pw(3, e)) === Number(d))).join(),
    "Powers of 3 end in 3, 9, 7, 1 and then repeat. 5 never appears.", "3 की घातें 3, 9, 7, 1 पर समाप्त होकर दोहराती हैं। 5 कभी नहीं आता।"),
  Q(T(2), "6ad30b8796cd975efdf8a5fb", "What is the unit digit of 2468 + 1357 + 9999?", "2468 + 1357 + 9999 का इकाई अंक क्या है?", ["4", "2", "6", "8"], 0, () => ud(2468 + 1357 + 9999),
    "Add the unit digits: 8 + 7 + 9 = 24, so the unit digit is 4 (the sum is 13,824).", "इकाई अंक जोड़ें: 8 + 7 + 9 = 24, अतः इकाई अंक 4 (योग 13,824)।"),
  Q(T(2), "6ad30b8796cd975efdf8a5fc", "What is the unit digit of 3⁵ − 2⁵?", "3⁵ − 2⁵ का इकाई अंक क्या है?", ["1", "3", "9", "5"], 0, () => ud(pw(3, 5) - pw(2, 5)),
    "3⁵ = 243 and 2⁵ = 32. 243 − 32 = 211, so the unit digit is 1.", "3⁵ = 243 और 2⁵ = 32। 243 − 32 = 211, अतः इकाई अंक 1।"),
  Q(T(2), "6ad30b8796cd975efdf8a601", "What is the unit digit of 21 + 22 + 23 + ... + 29?", "21 + 22 + 23 + ... + 29 का इकाई अंक क्या है?", ["5", "0", "9", "1"], 0, () => ud(L.range(21, 29).reduce((a, b) => a + b, 0)),
    "There are 9 numbers with middle number 25, so the sum is 9 × 25 = 225. The unit digit is 5.", "9 संख्याएँ हैं जिनकी बीच की संख्या 25 है, अतः योग 9 × 25 = 225। इकाई अंक 5।"),
  Q(T(2), "6ad30b8796cd975efdf8a602", "What is the unit digit of 3 × 33 × 333 × 3333?", "3 × 33 × 333 × 3333 का इकाई अंक क्या है?", ["1", "3", "9", "7"], 0, () => ud(prod(3, 33, 333, 3333)),
    "Every factor ends in 3, so the product ends like 3⁴ = 81: the unit digit is 1.", "हर गुणनखंड 3 पर समाप्त होता है, अतः गुणनफल 3⁴ = 81 जैसा: इकाई अंक 1।"),
  Q(T(2), "6ad30b8796cd975efdf8a603", "What is the unit digit of 64 × 25 + 3?", "64 × 25 + 3 का इकाई अंक क्या है?", ["3", "0", "7", "5"], 0, () => ud(64 * 25 + 3),
    "64 × 25 = 1,600 ends in 0, so 64 × 25 + 3 = 1,603 ends in 3.", "64 × 25 = 1,600 का इकाई अंक 0, अतः 64 × 25 + 3 = 1,603 का इकाई अंक 3।"),
  Q(T(2), "6ad30b8796cd975efdf8a604", "How many of the numbers 3¹, 3², 3³, ..., 3¹² have 7 as their unit digit?", "संख्याओं 3¹, 3², 3³, ..., 3¹² में से कितनी का इकाई अंक 7 है?", ["3", "4", "2", "6"], 0, () => L.range(1, 12).filter((e) => ud(pw(3, e)) === 7).length,
    "Powers of 3 end in 3, 9, 7, 1 in turn, so the unit digit is 7 for 3³, 3⁷ and 3¹¹. That is 3.", "3 की घातें बारी-बारी 3, 9, 7, 1 पर समाप्त होती हैं, अतः इकाई अंक 7: 3³, 3⁷ और 3¹¹। कुल 3।"),
  // ------------------------------------------------------------------ #3
  Q(T(3), "6ad30b8d96cd975efdf8a62a", "The unit digit of 4ⁿ is 6. What can you say about n?", "4ⁿ का इकाई अंक 6 है। n के बारे में क्या कहा जा सकता है?", ["n is even", "n is odd", "n is a multiple of 3", "n is prime"], 0, () => (L.range(1, 12).every((n) => (ud(pw(4, n)) === 6) === (n % 2 === 0)) ? "n is even" : "x"),
    "Powers of 4 end in 4 (odd power) or 6 (even power). So 4ⁿ ends in 6 exactly when n is even.", "4 की घातें 4 (विषम घात) या 6 (सम घात) पर समाप्त होती हैं। अतः 4ⁿ का इकाई अंक 6 ठीक तब जब n सम हो।", ["n सम है", "n विषम है", "n, 3 का गुणज है", "n अभाज्य है"]),
  Q(T(3), "6ad30b8d96cd975efdf8a62f", "What is the unit digit of 11 × 21 × 31 × 41 × 51?", "11 × 21 × 31 × 41 × 51 का इकाई अंक क्या है?", ["1", "5", "0", "3"], 0, () => ud(prod(11, 21, 31, 41, 51)),
    "Every factor ends in 1, and 1 × 1 × ... × 1 = 1. The unit digit is 1.", "हर गुणनखंड 1 पर समाप्त होता है, और 1 × 1 × ... × 1 = 1। इकाई अंक 1।"),
  Q(T(3), "6ad30b8d96cd975efdf8a630", "A number ends in 9. What is the unit digit of its square?", "एक संख्या 9 पर समाप्त होती है। उसके वर्ग का इकाई अंक क्या है?", ["1", "9", "8", "3"], 0, () => ud(pw(19, 2)),
    "9 × 9 = 81, so the square of any number ending in 9 ends in 1 (for example 19² = 361).", "9 × 9 = 81, अतः 9 पर समाप्त किसी संख्या के वर्ग का इकाई अंक 1 (जैसे 19² = 361)।"),
  Q(T(3), "6ad30b8d96cd975efdf8a631", "What is the unit digit of 5! + 6!?", "5! + 6! का इकाई अंक क्या है?", ["0", "5", "6", "2"], 0, () => ud(fact(5) + fact(6)),
    "5! = 120 and 6! = 720 both end in 0, so their sum 840 ends in 0.", "5! = 120 और 6! = 720 दोनों 0 पर समाप्त, अतः योग 840 का इकाई अंक 0।"),
  Q(T(3), "6ad30b8d96cd975efdf8a632", "What is the unit digit of 48 × 52 + 48 × 48?", "48 × 52 + 48 × 48 का इकाई अंक क्या है?", ["0", "4", "8", "6"], 0, () => ud(48 * 52 + 48 * 48),
    "48 × 52 + 48 × 48 = 48 × (52 + 48) = 48 × 100 = 4,800, so the unit digit is 0.", "48 × 52 + 48 × 48 = 48 × (52 + 48) = 48 × 100 = 4,800, अतः इकाई अंक 0।"),
  // ------------------------------------------------------------------ #4
  Q(T(4), "6ad30b9596cd975efdf8a693", "What is the unit digit of 2 × 22 × 222 × 2222?", "2 × 22 × 222 × 2222 का इकाई अंक क्या है?", ["6", "2", "4", "8"], 0, () => ud(prod(2, 22, 222, 2222)),
    "Every factor ends in 2, so the product ends like 2⁴ = 16: the unit digit is 6.", "हर गुणनखंड 2 पर समाप्त होता है, अतः गुणनफल 2⁴ = 16 जैसा: इकाई अंक 6।"),
  Q(T(4), "6ad30b9596cd975efdf8a694", "7ⁿ ends in 1. Which of these can n be: 12, 13, 14 or 15?", "7ⁿ का इकाई अंक 1 है। n इनमें से क्या हो सकता है: 12, 13, 14 या 15?", ["12", "13", "14", "15"], 0, () => ["12", "13", "14", "15"].filter((n) => ud(pw(7, n)) === 1).join(),
    "Powers of 7 end in 7, 9, 3, 1, so 7ⁿ ends in 1 when n is a multiple of 4. Of the four, only 12 is.", "7 की घातें 7, 9, 3, 1 पर समाप्त होती हैं, अतः 7ⁿ का इकाई अंक 1 तब जब n, 4 का गुणज हो। चारों में केवल 12।"),
  Q(T(4), "6ad30b9596cd975efdf8a695", "What is the unit digit of the product of all the odd numbers from 1 to 15?", "1 से 15 तक की सभी विषम संख्याओं के गुणनफल का इकाई अंक क्या है?", ["5", "0", "1", "3"], 0, () => ud(prod(1, 3, 5, 7, 9, 11, 13, 15)),
    "The product includes 5 and has no even factor, so it ends in 5 (an odd multiple of 5).", "गुणनफल में 5 है और कोई सम गुणनखंड नहीं, अतः इसका इकाई अंक 5 (5 का विषम गुणज)।"),
  // ------------------------------------------------------------------ #5
  Q(T(5), "6ad30b9b96cd975efdf8a6c5", "What is the unit digit of 43 × 43 × 43?", "43 × 43 × 43 का इकाई अंक क्या है?", ["7", "9", "3", "1"], 0, () => ud(prod(43, 43, 43)),
    "Only the 3s matter: 3 × 3 × 3 = 27, so the unit digit is 7 (43 × 43 × 43 = 79,507).", "केवल 3 देखें: 3 × 3 × 3 = 27, अतः इकाई अंक 7 (43 × 43 × 43 = 79,507)।"),
  Q(T(5), "6ad30b9b96cd975efdf8a6c7", "What is the unit digit of 9³ + 9⁴?", "9³ + 9⁴ का इकाई अंक क्या है?", ["0", "8", "1", "9"], 0, () => ud(pw(9, 3) + pw(9, 4)),
    "An odd power of 9 ends in 9 and an even power ends in 1. 9 + 1 = 10, so the unit digit is 0 (729 + 6,561 = 7,290).", "9 की विषम घात का इकाई अंक 9 और सम घात का 1। 9 + 1 = 10, अतः इकाई अंक 0 (729 + 6,561 = 7,290)।"),
  Q(T(5), "6ad30b9b96cd975efdf8a6c8", "What is the unit digit of 27 × 38 − 15?", "27 × 38 − 15 का इकाई अंक क्या है?", ["1", "6", "9", "5"], 0, () => ud(27 * 38 - 15),
    "27 × 38 = 1,026, and 1,026 − 15 = 1,011. The unit digit is 1.", "27 × 38 = 1,026, और 1,026 − 15 = 1,011। इकाई अंक 1।"),
  Q(T(5), "6ad30b9b96cd975efdf8a6cd", "What is the unit digit of 96 × 86 × 76?", "96 × 86 × 76 का इकाई अंक क्या है?", ["6", "8", "4", "2"], 0, () => ud(prod(96, 86, 76)),
    "Every factor ends in 6, and 6 × 6 = 36 ends in 6 again, so the product ends in 6 (96 × 86 × 76 = 627,456).", "हर गुणनखंड 6 पर समाप्त होता है, और 6 × 6 = 36 फिर 6 पर, अतः गुणनफल का इकाई अंक 6 (96 × 86 × 76 = 627,456)।"),
  // ------------------------------------------------------------------ #6
  Q(T(6), "6ad30ba396cd975efdf8a726", "What is the unit digit of 6³ × 5² + 1?", "6³ × 5² + 1 का इकाई अंक क्या है?", ["1", "0", "6", "5"], 0, () => ud(pw(6, 3) * pw(5, 2) + 1n),
    "6³ = 216 is even and 5² = 25 ends in 5, so 6³ × 5² is a multiple of 10 (5,400). Adding 1 gives a unit digit of 1.", "6³ = 216 सम है और 5² = 25 का इकाई अंक 5, अतः 6³ × 5² 10 का गुणज है (5,400)। 1 जोड़ने पर इकाई अंक 1।"),
  Q(T(6), "6ad30ba396cd975efdf8a727", "What is the unit digit of 2⁴ × 4² × 8?", "2⁴ × 4² × 8 का इकाई अंक क्या है?", ["8", "6", "4", "2"], 0, () => ud(pw(2, 4) * pw(4, 2) * 8n),
    "2⁴ = 16 and 4² = 16 both end in 6. 6 × 6 = 36 → 6, and 6 × 8 = 48 → 8. The unit digit is 8.", "2⁴ = 16 और 4² = 16 दोनों का इकाई अंक 6। 6 × 6 = 36 → 6, और 6 × 8 = 48 → 8। इकाई अंक 8।"),
  Q(T(6), "6ad30ba396cd975efdf8a730", "What is the unit digit of 34 × 34 × 34 × 34?", "34 × 34 × 34 × 34 का इकाई अंक क्या है?", ["6", "4", "8", "2"], 0, () => ud(prod(34, 34, 34, 34)),
    "Only the 4s matter: 4 × 4 = 16 → 6, 6 × 4 = 24 → 4, 4 × 4 = 16 → 6. The unit digit is 6.", "केवल 4 देखें: 4 × 4 = 16 → 6, 6 × 4 = 24 → 4, 4 × 4 = 16 → 6। इकाई अंक 6।"),
  // ------------------------------------------------------------------ #7
  Q(T(7), "6ad30ba896cd975efdf8a765", "What is the unit digit of 8² × 8³?", "8² × 8³ का इकाई अंक क्या है?", ["8", "4", "2", "6"], 0, () => ud(pw(8, 2) * pw(8, 3)),
    "8² × 8³ = 8⁵. Powers of 8 end in 8, 4, 2, 6 and repeat, so 8⁵ ends like 8¹: 8 (64 × 512 = 32,768).", "8² × 8³ = 8⁵। 8 की घातें 8, 4, 2, 6 पर समाप्त होकर दोहराती हैं, अतः 8⁵ का 8¹ जैसा: 8 (64 × 512 = 32,768)।"),
  Q(T(7), "6ad30ba896cd975efdf8a766", "What is the unit digit of the product of all the even numbers from 2 to 10?", "2 से 10 तक की सभी सम संख्याओं के गुणनफल का इकाई अंक क्या है?", ["0", "2", "4", "8"], 0, () => ud(prod(2, 4, 6, 8, 10)),
    "The product includes 10, so it ends in 0 (2 × 4 × 6 × 8 × 10 = 3,840).", "गुणनफल में 10 है, अतः इसका इकाई अंक 0 (2 × 4 × 6 × 8 × 10 = 3,840)।"),
  Q(T(7), "6ad30ba896cd975efdf8a76d", "What is the unit digit of 2⁹ + 9²?", "2⁹ + 9² का इकाई अंक क्या है?", ["3", "1", "2", "9"], 0, () => ud(pw(2, 9) + pw(9, 2)),
    "2⁹ = 512 and 9² = 81. 512 + 81 = 593, so the unit digit is 3.", "2⁹ = 512 और 9² = 81। 512 + 81 = 593, अतः इकाई अंक 3।"),
  // ------------------------------------------------------------------ #8
  Q(T(8), "6ad30bb096cd975efdf8a7bb", "How many different digits can appear as the unit digit of the powers of 9 (9¹, 9², 9³, ...)?", "9 की घातों (9¹, 9², 9³, ...) के इकाई अंक के रूप में कितने भिन्न अंक आ सकते हैं?", ["2", "4", "1", "3"], 0, () => new Set(L.range(1, 12).map((e) => ud(pw(9, e)))).size,
    "9¹ = 9, 9² = 81, 9³ = 729, 9⁴ = 6,561: the unit digits go 9, 1, 9, 1, ... So only 2 digits, 9 and 1.", "9¹ = 9, 9² = 81, 9³ = 729, 9⁴ = 6,561: इकाई अंक 9, 1, 9, 1, ...। अतः केवल 2 अंक, 9 और 1।"),
  Q(T(8), "6ad30bb096cd975efdf8a7bc", "What is the unit digit of 15 × 25 × 35 × 45 + 6?", "15 × 25 × 35 × 45 + 6 का इकाई अंक क्या है?", ["1", "6", "5", "0"], 0, () => ud(prod(15, 25, 35, 45) + 6n),
    "Every factor ends in 5 and the product is odd, so it ends in 5. 5 + 6 = 11, so the unit digit is 1.", "हर गुणनखंड 5 पर समाप्त होता है और गुणनफल विषम है, अतः इकाई अंक 5। 5 + 6 = 11, अतः इकाई अंक 1।"),
  Q(T(8), "6ad30bb096cd975efdf8a7c4", "What is the unit digit of 2³ × 3³ × 7?", "2³ × 3³ × 7 का इकाई अंक क्या है?", ["2", "6", "4", "8"], 0, () => ud(pw(2, 3) * pw(3, 3) * 7n),
    "2³ × 3³ = 8 × 27 = 216, ending in 6. 6 × 7 = 42, so the unit digit is 2 (216 × 7 = 1,512).", "2³ × 3³ = 8 × 27 = 216, इकाई अंक 6। 6 × 7 = 42, अतः इकाई अंक 2 (216 × 7 = 1,512)।"),
];
