// Factors and Multiples · Medium #1 (generated): eight questions replaced -
// a repeat (divisors of 120 = factors of 120), three more "sum of factors"
// and "factors of 180" twins, and four that were Easy-level.
const L = require("./lib");
const { fmt } = require("./fmt");
const T = "Number System · Factors and Multiples · Medium #1";
const Q = (q, qh, o, a, value, s, sh, r, rr, oh) => ({ t: T, q, qh, o, ...(oh ? { oh } : {}), a, v: () => L.only(o, a, String(value())), s, sh, r, rr });
const R = L.range;
const nd = (n) => L.divisors(n).length;

const list = [
  Q("How many factors of 360 are multiples of 6?", "360 के कितने गुणनखंड 6 के गुणज हैं?", ["12", "24", "18", "8"], 0, () => L.divisors(360).filter((d) => d % 6 === 0).length,
    "A factor of 360 that is a multiple of 6 is 6 × (a factor of 360 ÷ 6 = 60). 60 = 2² × 3 × 5 has (2 + 1)(1 + 1)(1 + 1) = 12 factors, so 12.", "360 का जो गुणनखंड 6 का गुणज है, वह 6 × (360 ÷ 6 = 60 का गुणनखंड) है। 60 = 2² × 3 × 5 के (2 + 1)(1 + 1)(1 + 1) = 12 गुणनखंड, अतः 12।",
    "6ad7bac4a987cb7a04d7eeb0", "Another sum-of-factors question in the same test"),
  Q("How many factors of 2⁴ × 3³ × 5² are perfect squares?", "2⁴ × 3³ × 5² के कितने गुणनखंड पूर्ण वर्ग हैं?", ["12", "60", "18", "8"], 0, () => L.divisors(2 ** 4 * 27 * 25).filter((d) => Number.isInteger(Math.sqrt(d))).length,
    "A factor is a perfect square when every prime in it has an even power. The power of 2 can be 0, 2 or 4 (3 ways), of 3 can be 0 or 2 (2 ways), of 5 can be 0 or 2 (2 ways): 3 × 2 × 2 = 12.", "कोई गुणनखंड पूर्ण वर्ग तब है जब उसमें हर अभाज्य की घात सम हो। 2 की घात 0, 2 या 4 (3 तरह), 3 की 0 या 2 (2 तरह), 5 की 0 या 2 (2 तरह): 3 × 2 × 2 = 12।",
    "6ad7bac4a987cb7a04d7eeb1", "The test already asks for the even factors of 180"),
  Q("Two numbers are in the ratio 3 : 4 and their LCM is 84. What is their HCF?", "दो संख्याओं का अनुपात 3 : 4 है और उनका LCM 84 है। उनका HCF क्या है?", ["7", "12", "21", "4"], 0, () => { const k = R(1, 100).find((k) => L.lcm(3 * k, 4 * k) === 84); return L.gcd(3 * k, 4 * k); },
    "Let the numbers be 3k and 4k; since 3 and 4 have no common factor, their HCF is k and their LCM is 12k. 12k = 84 gives k = 7, so the numbers are 21 and 28 and the HCF is 7.", "मान लें संख्याएँ 3k और 4k; 3 और 4 का कोई उभयनिष्ठ गुणनखंड नहीं, अतः HCF = k और LCM = 12k। 12k = 84 से k = 7, अतः संख्याएँ 21 और 28 और HCF 7।",
    "6ad7bb3da987cb7a04d7eef4", "Repeats question 7 (divisors of 120 are its factors)"),
  Q("The HCF of two numbers is 16 and their sum is 112. How many such pairs of numbers are there?", "दो संख्याओं का HCF 16 है और उनका योग 112 है। ऐसी संख्याओं के कितने युग्म हैं?", ["3", "2", "4", "6"], 0, () => { let c = 0; for (let x = 16; x <= 56; x += 16) { const y = 112 - x; if (y >= x && L.gcd(x, y) === 16) c++; } return c; },
    "Write the numbers as 16a and 16b with a and b having no common factor. 16(a + b) = 112 gives a + b = 7: (1, 6), (2, 5), (3, 4). The pairs are 16 and 96, 32 and 80, 48 and 64: 3 pairs.", "संख्याएँ 16a और 16b लिखें, जहाँ a और b का कोई उभयनिष्ठ गुणनखंड नहीं। 16(a + b) = 112 से a + b = 7: (1, 6), (2, 5), (3, 4)। युग्म 16 और 96, 32 और 80, 48 और 64: 3 युग्म।",
    "6ad7bb3da987cb7a04d7eef5", "A third sum-of-factors question in the same test"),
  Q("What is the largest number that divides 245 and 1,029 leaving a remainder of 5 in each case?", "वह सबसे बड़ी संख्या कौन-सी है जो 245 और 1,029 को भाग देने पर प्रत्येक में 5 शेष छोड़ती है?", ["16", "8", "32", "48"], 0, () => L.gcd(240, 1024),
    "The number must divide 245 − 5 = 240 and 1,029 − 5 = 1,024 exactly, so it is their HCF. 240 = 2⁴ × 15 and 1,024 = 2¹⁰, so the HCF is 2⁴ = 16 (and 16 is greater than the remainder 5).", "संख्या 245 − 5 = 240 और 1,029 − 5 = 1,024 को पूरा विभाजित करे, अतः यह उनका HCF है। 240 = 2⁴ × 15 और 1,024 = 2¹⁰, अतः HCF 2⁴ = 16 (और 16, शेष 5 से बड़ा है)।",
    "6ad7bb3da987cb7a04d7eef7", "Easy level: a common multiple of 8 and 12"),
  Q("What is the least number which, when divided by 6, 9, 12 and 15, leaves a remainder of 4 in each case?", "वह न्यूनतम संख्या कौन-सी है जिसे 6, 9, 12 और 15 से भाग देने पर प्रत्येक में 4 शेष बचता है?", ["184", "364", "176", "94"], 0, () => R(5, 2000).find((n) => [6, 9, 12, 15].every((d) => n % d === 4)),
    "The number is 4 more than a common multiple of 6, 9, 12 and 15. Their LCM is 2² × 3² × 5 = 180, so the least such number is 180 + 4 = 184.", "संख्या 6, 9, 12 और 15 के किसी उभयनिष्ठ गुणज से 4 अधिक है। इनका LCM 2² × 3² × 5 = 180, अतः न्यूनतम संख्या 180 + 4 = 184।",
    "6ad7bb3da987cb7a04d7eef8", "Easy level: the HCF of 30 and 45"),
  Q("The LCM of two numbers is 495 and their HCF is 5. If their sum is 100, what is their difference?", "दो संख्याओं का LCM 495 और HCF 5 है। यदि उनका योग 100 है, तो उनका अंतर क्या है?", ["10", "20", "5", "15"], 0, () => { for (let a = 5; a < 100; a += 5) { const b = 100 - a; if (b > a && L.gcd(a, b) === 5 && L.lcm(a, b) === 495) return b - a; } return "none"; },
    "The product of the numbers is HCF × LCM = 5 × 495 = 2,475. Two numbers with sum 100 and product 2,475 are 45 and 55 (45 × 55 = 2,475), whose HCF is 5 and LCM 495. Their difference is 10.", "संख्याओं का गुणनफल = HCF × LCM = 5 × 495 = 2,475। योग 100 और गुणनफल 2,475 वाली दो संख्याएँ 45 और 55 (45 × 55 = 2,475), जिनका HCF 5 और LCM 495। अंतर 10।",
    "6ad7bb3da987cb7a04d7eef9", "Easy level: the sum of the first five multiples of 9"),
  Q("What is the greatest four-digit number that is exactly divisible by 12, 15, 20 and 35?", "चार अंकों की वह सबसे बड़ी संख्या कौन-सी है जो 12, 15, 20 और 35 से पूरी विभाज्य है?", ["9,660", "9,240", "9,980", "9,800"], 0, () => { const l = L.lcm(12, 15, 20, 35); return (Math.floor(9999 / l) * l).toLocaleString("en-US"); },
    "The number must be a multiple of the LCM of 12, 15, 20 and 35, which is 2² × 3 × 5 × 7 = 420. 9,999 ÷ 420 = 23 with remainder 339, so the greatest is 420 × 23 = 9,660.", "संख्या 12, 15, 20 और 35 के LCM का गुणज हो, जो 2² × 3 × 5 × 7 = 420 है। 9,999 ÷ 420 = 23, शेष 339, अतः सबसे बड़ी 420 × 23 = 9,660।",
    "6ad7bb3da987cb7a04d7eefc", "Same kind as question 4 (the LCM of three numbers)"),
];
module.exports = list.map(fmt);
