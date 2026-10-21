// Number System · Factors and Multiples · Easy #8 - #10. Every answer is
// worked out again in `v`.
const L = require("./lib");
const { fmt } = require("./fmt");
const T = (n) => `Number System · Factors and Multiples · Easy #${n}`;
const Q = (t, q, qh, o, a, value, s, sh, oh) => ({ t, q, qh, o, ...(oh ? { oh } : {}), a, v: () => L.only(o, a, String(value())), s, sh });
const R = L.range;
const fmtN = (n) => Number(n).toLocaleString("en-US");
const nd = (n) => L.divisors(n).length;
const pick = (opts, test) => () => opts.filter(test).join(" & ");
const pair = (p) => p.split(" and ").map(Number);
const remainderLeast = (ds, r) => () => R(r + 1, 100000).find((n) => ds.every((d) => n % d === r));

const list = [
  // ------------------------------------------------------------ EASY #8
  Q(T(8), "What is the HCF of 78 and 130?", "78 और 130 का HCF क्या है?", ["26", "13", "39", "52"], 0, () => L.gcd(78, 130),
    "78 = 2 × 3 × 13 and 130 = 2 × 5 × 13. HCF = 2 × 13 = 26.", "78 = 2 × 3 × 13 और 130 = 2 × 5 × 13। HCF = 2 × 13 = 26।"),
  Q(T(8), "What is the LCM of 40 and 72?", "40 और 72 का LCM क्या है?", ["360", "720", "180", "2,880"], 0, () => L.lcm(40, 72),
    "40 = 2³ × 5 and 72 = 2³ × 3². LCM = 2³ × 3² × 5 = 360.", "40 = 2³ × 5 और 72 = 2³ × 3²। LCM = 2³ × 3² × 5 = 360।"),
  Q(T(8), "How many factors does 300 have?", "300 के कितने गुणनखंड हैं?", ["18", "12", "16", "24"], 0, () => nd(300),
    "300 = 2² × 3 × 5². Number of factors = (2 + 1)(1 + 1)(2 + 1) = 18.", "300 = 2² × 3 × 5²। गुणनखंडों की संख्या = (2 + 1)(1 + 1)(2 + 1) = 18।"),
  Q(T(8), "The HCF of two numbers is 17 and their LCM is 255. If one of them is 51, what is the other?", "दो संख्याओं का HCF 17 और LCM 255 है। यदि उनमें से एक 51 है, तो दूसरी क्या है?", ["85", "68", "34", "102"], 0, () => (17 * 255) / 51,
    "HCF × LCM = product: 17 × 255 = 51 × other, so the other is 4,335 ÷ 51 = 85. (HCF of 51 and 85 is 17, LCM is 255.)", "HCF × LCM = गुणनफल: 17 × 255 = 51 × दूसरी, अतः दूसरी = 4,335 ÷ 51 = 85। (51 और 85 का HCF 17, LCM 255।)"),
  Q(T(8), "What is the smallest number divisible by 9, 12 and 20?", "9, 12 और 20 से विभाज्य सबसे छोटी संख्या कौन-सी है?", ["180", "360", "90", "240"], 0, () => L.lcm(9, 12, 20),
    "9 = 3², 12 = 2² × 3, 20 = 2² × 5. LCM = 2² × 3² × 5 = 180.", "9 = 3², 12 = 2² × 3, 20 = 2² × 5। LCM = 2² × 3² × 5 = 180।"),
  Q(T(8), "What is the HCF of 54, 90 and 126?", "54, 90 और 126 का HCF क्या है?", ["18", "9", "6", "27"], 0, () => L.hcf(54, 90, 126),
    "54 = 2 × 3³, 90 = 2 × 3² × 5, 126 = 2 × 3² × 7. Common to all: 2 × 3² = 18.", "54 = 2 × 3³, 90 = 2 × 3² × 5, 126 = 2 × 3² × 7। तीनों में उभयनिष्ठ: 2 × 3² = 18।"),
  Q(T(8), "Two numbers are in the ratio 3 : 5 and their HCF is 8. What is their LCM?", "दो संख्याओं का अनुपात 3 : 5 और उनका HCF 8 है। उनका LCM क्या है?", ["120", "40", "24", "64"], 0, () => L.lcm(24, 40),
    "The numbers are 3 × 8 = 24 and 5 × 8 = 40. Their LCM is 8 × 3 × 5 = 120.", "संख्याएँ 3 × 8 = 24 और 5 × 8 = 40। उनका LCM = 8 × 3 × 5 = 120।"),
  Q(T(8), "Three ferries leave a jetty every 18, 24 and 32 minutes. If all three leave together at 9:00 a.m., when will they next leave together?", "तीन नौकाएँ एक घाट से हर 18, 24 और 32 मिनट पर चलती हैं। यदि तीनों सुबह 9:00 बजे एक साथ चलें, तो अगली बार एक साथ कब चलेंगी?", ["1:48 p.m.", "3:48 p.m.", "12:36 p.m.", "2:24 p.m."], 0, () => { const m = 9 * 60 + L.lcm(18, 24, 32); return m === 13 * 60 + 48 ? "1:48 p.m." : String(m); },
    "They leave together after the LCM of 18, 24 and 32 minutes: 2⁵ × 3² = 288 minutes = 4 hours 48 minutes. 9:00 a.m. + 4 h 48 min = 1:48 p.m.", "वे 18, 24 और 32 मिनट के LCM के बाद एक साथ चलेंगी: 2⁵ × 3² = 288 मिनट = 4 घंटे 48 मिनट। सुबह 9:00 + 4 घंटे 48 मिनट = दोपहर 1:48।",
    ["दोपहर 1:48", "दोपहर 3:48", "दोपहर 12:36", "दोपहर 2:24"]),
  Q(T(8), "Two water tanks hold 1,080 L and 1,200 L. What is the largest bucket that can fill each tank in an exact number of buckets?", "दो टंकियों में 1,080 L और 1,200 L पानी आता है। वह सबसे बड़ी बाल्टी कौन-सी है जिससे हर टंकी पूरे-पूरे बाल्टियों में भरी जा सके?", ["120 L", "60 L", "40 L", "240 L"], 0, () => `${L.gcd(1080, 1200)} L`,
    "The bucket must divide both 1,080 and 1,200: HCF. 1,080 = 2³ × 3³ × 5 and 1,200 = 2⁴ × 3 × 5², so HCF = 2³ × 3 × 5 = 120 L.", "बाल्टी 1,080 और 1,200 दोनों को विभाजित करे: HCF। 1,080 = 2³ × 3³ × 5 और 1,200 = 2⁴ × 3 × 5², अतः HCF = 2³ × 3 × 5 = 120 L।"),
  Q(T(8), "What is the smallest number that leaves a remainder of 6 when divided by each of 9, 12 and 15?", "वह सबसे छोटी संख्या कौन-सी है जिसे 9, 12 और 15 में से प्रत्येक से भाग देने पर 6 शेष बचता है?", ["186", "366", "180", "96"], 0, remainderLeast([9, 12, 15], 6),
    "LCM of 9, 12 and 15 = 2² × 3² × 5 = 180. The number is 180 + 6 = 186.", "9, 12 और 15 का LCM = 2² × 3² × 5 = 180। संख्या 180 + 6 = 186।"),
  Q(T(8), "What is the greatest number that divides 152 and 248 leaving a remainder of 8 in each case?", "वह सबसे बड़ी संख्या कौन-सी है जो 152 और 248 को भाग देने पर प्रत्येक में 8 शेष छोड़ती है?", ["48", "24", "16", "96"], 0, () => L.gcd(144, 240),
    "It divides 152 − 8 = 144 and 248 − 8 = 240 exactly. 144 = 2⁴ × 3² and 240 = 2⁴ × 3 × 5, so the HCF is 2⁴ × 3 = 48.", "यह 152 − 8 = 144 और 248 − 8 = 240 को पूरा विभाजित करती है। 144 = 2⁴ × 3² और 240 = 2⁴ × 3 × 5, अतः HCF = 2⁴ × 3 = 48।"),
  Q(T(8), "Of 18, 24, 30 and 40, which is a factor of 360 but NOT of 240?", "18, 24, 30 और 40 में से कौन 360 का गुणनखंड है पर 240 का नहीं?", ["18", "24", "30", "40"], 0, pick(["18", "24", "30", "40"], (x) => 360 % Number(x) === 0 && 240 % Number(x) !== 0),
    "360 = 2³ × 3² × 5 and 240 = 2⁴ × 3 × 5. 18 = 2 × 3² needs 3², which 240 does not have, so it divides 360 but not 240. 24, 30 and 40 divide both.", "360 = 2³ × 3² × 5 और 240 = 2⁴ × 3 × 5। 18 = 2 × 3² को 3² चाहिए, जो 240 में नहीं, अतः यह 360 को विभाजित करता है पर 240 को नहीं। 24, 30 और 40 दोनों को विभाजित करते हैं।"),
  Q(T(8), "What is the least number that must be subtracted from 1,000 to make it a multiple of 35?", "1,000 में से कम से कम कौन-सी संख्या घटाएँ कि वह 35 का गुणज बन जाए?", ["20", "15", "5", "35"], 0, () => 1000 % 35,
    "1,000 ÷ 35 = 28 remainder 20 (35 × 28 = 980). Subtract 20.", "1,000 ÷ 35 = 28, शेष 20 (35 × 28 = 980)। 20 घटाएँ।"),
  Q(T(8), "How many common factors do 96 and 160 have?", "96 और 160 के कितने उभयनिष्ठ गुणनखंड हैं?", ["6", "5", "8", "4"], 0, () => L.divisors(96).filter((d) => 160 % d === 0).length,
    "HCF of 96 = 2⁵ × 3 and 160 = 2⁵ × 5 is 2⁵ = 32, whose factors are 1, 2, 4, 8, 16, 32: 6.", "96 = 2⁵ × 3 और 160 = 2⁵ × 5 का HCF 2⁵ = 32, जिसके गुणनखंड 1, 2, 4, 8, 16, 32: 6।"),
  Q(T(8), "The LCM of two numbers is 840 and their product is 20,160. What is their HCF?", "दो संख्याओं का LCM 840 और गुणनफल 20,160 है। उनका HCF क्या है?", ["24", "12", "48", "42"], 0, () => 20160 / 840,
    "HCF = product ÷ LCM = 20,160 ÷ 840 = 24 (for example, 120 and 168).", "HCF = गुणनफल ÷ LCM = 20,160 ÷ 840 = 24 (जैसे 120 और 168)।"),
  Q(T(8), "How many multiples of 15 lie between 100 and 400?", "100 और 400 के बीच 15 के कितने गुणज हैं?", ["20", "21", "19", "26"], 0, () => L.count(101, 399, (n) => n % 15 === 0),
    "The first is 105 = 15 × 7 and the last is 390 = 15 × 26. 26 − 7 + 1 = 20.", "पहला 105 = 15 × 7 और अंतिम 390 = 15 × 26। 26 − 7 + 1 = 20।"),
  Q(T(8), "What is the largest four-digit number that is divisible by 14, 21 and 35?", "14, 21 और 35 से विभाज्य चार अंकों की सबसे बड़ी संख्या कौन-सी है?", ["9,870", "9,975", "9,660", "9,940"], 0, () => fmtN(R(1000, 9999).filter((n) => n % 14 === 0 && n % 21 === 0 && n % 35 === 0).pop()),
    "LCM of 14, 21 and 35 = 2 × 3 × 5 × 7 = 210. 9,999 ÷ 210 = 47 remainder 129, so the largest is 210 × 47 = 9,870.", "14, 21 और 35 का LCM = 2 × 3 × 5 × 7 = 210। 9,999 ÷ 210 = 47, शेष 129, अतः सबसे बड़ी 210 × 47 = 9,870।"),
  Q(T(8), "The HCF of two numbers is 14. Which of the following can NOT be their LCM?", "दो संख्याओं का HCF 14 है। निम्नलिखित में से कौन उनका LCM नहीं हो सकता?", ["150", "196", "168", "252"], 0, pick(["150", "196", "168", "252"], (x) => Number(x) % 14 !== 0),
    "The LCM must be a multiple of the HCF. 196 = 14 × 14, 168 = 14 × 12 and 252 = 14 × 18 are multiples of 14; 150 is not.", "LCM, HCF का गुणज होना चाहिए। 196 = 14 × 14, 168 = 14 × 12 और 252 = 14 × 18, 14 के गुणज हैं; 150 नहीं।"),
  Q(T(8), "What is the HCF of 667 and 851?", "667 और 851 का HCF क्या है?", ["23", "29", "37", "1"], 0, () => L.gcd(667, 851),
    "851 = 667 × 1 + 184, 667 = 184 × 3 + 115, 184 = 115 × 1 + 69, 115 = 69 × 1 + 46, 69 = 46 × 1 + 23, 46 = 23 × 2. HCF = 23 (667 = 23 × 29, 851 = 23 × 37).", "851 = 667 × 1 + 184, 667 = 184 × 3 + 115, 184 = 115 × 1 + 69, 115 = 69 × 1 + 46, 69 = 46 × 1 + 23, 46 = 23 × 2। HCF = 23 (667 = 23 × 29, 851 = 23 × 37)।"),
  Q(T(8), "A gardener has 168 rose plants and 120 marigold plants. He plants them in rows, each row having plants of only one kind, all rows having the same number of plants, as many as possible. How many rows will there be?", "एक माली के पास 168 गुलाब और 120 गेंदे के पौधे हैं। वह इन्हें पंक्तियों में लगाता है, हर पंक्ति में एक ही प्रकार के पौधे, सभी पंक्तियों में पौधों की संख्या समान और यथासंभव अधिक। कितनी पंक्तियाँ होंगी?", ["12", "24", "7", "5"], 0, () => { const g = L.gcd(168, 120); return 168 / g + 120 / g; },
    "Plants per row = HCF of 168 and 120 = 24. Rows = 168 ÷ 24 + 120 ÷ 24 = 7 + 5 = 12.", "हर पंक्ति में पौधे = 168 और 120 का HCF = 24। पंक्तियाँ = 168 ÷ 24 + 120 ÷ 24 = 7 + 5 = 12।"),
];
module.exports = list.map(fmt);
