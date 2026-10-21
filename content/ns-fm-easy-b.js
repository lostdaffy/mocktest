// Number System · Factors and Multiples · Easy #4 and #5. The generated
// questions in them (LCM of 4 and 6 twice, "Is 18 a multiple of 3? Maybe")
// are replaced one for one, and the tests filled to 20.
const L = require("./lib");
const { fmt } = require("./fmt");
const ids = require("./fm-ids.json");
const T = (n) => `Number System · Factors and Multiples · Easy #${n}`;
const Q = (t, q, qh, o, a, value, s, sh, oh) => ({ t, q, qh, o, ...(oh ? { oh } : {}), a, v: () => L.only(o, a, String(value())), s, sh });
const R = L.range;
const fmtN = (n) => Number(n).toLocaleString("en-US");
const nd = (n) => L.divisors(n).length;
const pick = (opts, test) => () => opts.filter(test).join(" & ");
const pair = (p) => p.split(" and ").map(Number);

const e4 = [
  Q(T(4), "What is the HCF of 54 and 90?", "54 और 90 का HCF क्या है?", ["18", "9", "27", "6"], 0, () => L.gcd(54, 90),
    "54 = 2 × 3³ and 90 = 2 × 3² × 5. The common part is 2 × 3² = 18.", "54 = 2 × 3³ और 90 = 2 × 3² × 5। उभयनिष्ठ भाग 2 × 3² = 18।"),
  Q(T(4), "What is the LCM of 14 and 22?", "14 और 22 का LCM क्या है?", ["154", "308", "77", "44"], 0, () => L.lcm(14, 22),
    "14 = 2 × 7 and 22 = 2 × 11. LCM = 2 × 7 × 11 = 154.", "14 = 2 × 7 और 22 = 2 × 11। LCM = 2 × 7 × 11 = 154।"),
  Q(T(4), "What is the HCF of 3² × 5 × 11 and 3 × 5² × 7?", "3² × 5 × 11 और 3 × 5² × 7 का HCF क्या है?", ["15", "45", "75", "5"], 0, () => L.gcd(9 * 5 * 11, 3 * 25 * 7),
    "Only 3 and 5 are common; take their lower powers: 3 × 5 = 15.", "केवल 3 और 5 उभयनिष्ठ हैं; उनकी छोटी घात लें: 3 × 5 = 15।"),
  Q(T(4), "The HCF of two numbers is 4 and their LCM is 168. If one of them is 28, what is the other?", "दो संख्याओं का HCF 4 और LCM 168 है। यदि उनमें से एक 28 है, तो दूसरी क्या है?", ["24", "42", "12", "56"], 0, () => (4 * 168) / 28,
    "HCF × LCM = product: 4 × 168 = 28 × other, so the other is 672 ÷ 28 = 24. (HCF of 28 and 24 is 4, LCM is 168.)", "HCF × LCM = गुणनफल: 4 × 168 = 28 × दूसरी, अतः दूसरी = 672 ÷ 28 = 24। (28 और 24 का HCF 4, LCM 168।)"),
  Q(T(4), "How many factors does 128 have?", "128 के कितने गुणनखंड हैं?", ["8", "7", "6", "9"], 0, () => nd(128),
    "128 = 2⁷, so its factors are 2⁰, 2¹, ..., 2⁷: 7 + 1 = 8 factors.", "128 = 2⁷, अतः इसके गुणनखंड 2⁰, 2¹, ..., 2⁷: 7 + 1 = 8 गुणनखंड।"),
  Q(T(4), "What is the smallest number that is divisible by 9, 12 and 16?", "9, 12 और 16 से विभाज्य सबसे छोटी संख्या कौन-सी है?", ["144", "72", "288", "48"], 0, () => L.lcm(9, 12, 16),
    "9 = 3², 12 = 2² × 3, 16 = 2⁴. LCM = 2⁴ × 3² = 144.", "9 = 3², 12 = 2² × 3, 16 = 2⁴। LCM = 2⁴ × 3² = 144।"),
  Q(T(4), "What is the largest number that divides both 117 and 195 exactly?", "117 और 195 दोनों को पूरा विभाजित करने वाली सबसे बड़ी संख्या कौन-सी है?", ["39", "13", "3", "78"], 0, () => L.gcd(117, 195),
    "117 = 3² × 13 and 195 = 3 × 5 × 13. HCF = 3 × 13 = 39.", "117 = 3² × 13 और 195 = 3 × 5 × 13। HCF = 3 × 13 = 39।"),
  Q(T(4), "Buses on two routes leave a depot every 20 minutes and every 25 minutes. If both leave together at 7:00 a.m., when will they next leave together?", "दो रूटों की बसें एक डिपो से हर 20 मिनट और हर 25 मिनट पर निकलती हैं। यदि दोनों सुबह 7:00 बजे एक साथ निकलें, तो अगली बार एक साथ कब निकलेंगी?", ["8:40 a.m.", "8:20 a.m.", "9:00 a.m.", "7:45 a.m."], 0, () => (L.lcm(20, 25) === 100 ? "8:40 a.m." : "?"),
    "They leave together after the LCM of 20 and 25 minutes: 2² × 5² = 100 minutes = 1 hour 40 minutes. 7:00 a.m. + 1 h 40 min = 8:40 a.m.", "वे 20 और 25 मिनट के LCM के बाद एक साथ निकलेंगी: 2² × 5² = 100 मिनट = 1 घंटा 40 मिनट। सुबह 7:00 + 1 घंटा 40 मिनट = सुबह 8:40।",
    ["सुबह 8:40", "सुबह 8:20", "सुबह 9:00", "सुबह 7:45"]),
  Q(T(4), "Two ribbons, 96 cm and 144 cm long, are cut into pieces of equal length, as long as possible, with nothing left over. How many pieces are there in all?", "96 cm और 144 cm लंबे दो रिबनों को बराबर लंबाई के, यथासंभव लंबे टुकड़ों में काटा जाता है, कुछ बचे बिना। कुल कितने टुकड़े होंगे?", ["5", "6", "4", "8"], 0, () => { const g = L.gcd(96, 144); return 96 / g + 144 / g; },
    "The piece length is the HCF of 96 and 144, which is 48 cm. Pieces: 96 ÷ 48 + 144 ÷ 48 = 2 + 3 = 5.", "टुकड़े की लंबाई 96 और 144 का HCF, यानी 48 cm। टुकड़े: 96 ÷ 48 + 144 ÷ 48 = 2 + 3 = 5।"),
  Q(T(4), "What is the smallest number that leaves a remainder of 5 when divided by each of 8, 12 and 16?", "वह सबसे छोटी संख्या कौन-सी है जिसे 8, 12 और 16 में से प्रत्येक से भाग देने पर 5 शेष बचता है?", ["53", "101", "48", "59"], 0, () => R(6, 2000).find((n) => [8, 12, 16].every((d) => n % d === 5)),
    "LCM of 8, 12 and 16 = 2⁴ × 3 = 48. The number is 48 + 5 = 53.", "8, 12 और 16 का LCM = 2⁴ × 3 = 48। संख्या 48 + 5 = 53।"),
  Q(T(4), "What is the greatest number that divides 158 and 224 leaving remainders of 2 and 3 respectively?", "वह सबसे बड़ी संख्या कौन-सी है जो 158 और 224 को भाग देने पर क्रमशः 2 और 3 शेष छोड़ती है?", ["13", "26", "39", "3"], 0, () => L.gcd(156, 221),
    "It divides 158 − 2 = 156 and 224 − 3 = 221 exactly. 156 = 2² × 3 × 13 and 221 = 13 × 17, so the HCF is 13 (greater than both remainders).", "यह 158 − 2 = 156 और 224 − 3 = 221 को पूरा विभाजित करती है। 156 = 2² × 3 × 13 और 221 = 13 × 17, अतः HCF 13 (दोनों शेषों से बड़ा)।"),
  Q(T(4), "Of the pairs 27 and 64, 26 and 39, 35 and 49, and 22 and 55, which is co-prime?", "युग्मों 27 और 64, 26 और 39, 35 और 49, तथा 22 और 55 में से कौन-सा सह-अभाज्य है?", ["27 and 64", "26 and 39", "35 and 49", "22 and 55"], 0, pick(["27 and 64", "26 and 39", "35 and 49", "22 and 55"], (p) => L.gcd(...pair(p)) === 1),
    "27 = 3³ and 64 = 2⁶ have no common prime, so they are co-prime even though neither is prime. 26 and 39 share 13, 35 and 49 share 7, 22 and 55 share 11.", "27 = 3³ और 64 = 2⁶ में कोई अभाज्य उभयनिष्ठ नहीं, अतः सह-अभाज्य हैं, भले ही दोनों अभाज्य नहीं। 26 और 39 में 13, 35 और 49 में 7, 22 और 55 में 11 उभयनिष्ठ।",
    ["27 और 64", "26 और 39", "35 और 49", "22 और 55"]),
  Q(T(4), "What is the prime factorisation of 1,764?", "1,764 का अभाज्य गुणनखंडन क्या है?", ["2² × 3² × 7²", "2² × 3 × 7³", "2³ × 3² × 7", "2 × 3² × 7²"], 0, () => (4 * 9 * 49 === 1764 ? "2² × 3² × 7²" : "?"),
    "1,764 = 4 × 441 = 2² × 21² = 2² × 3² × 7². (2² × 3 × 7³ = 4,116, 2³ × 3² × 7 = 504, 2 × 3² × 7² = 882.)", "1,764 = 4 × 441 = 2² × 21² = 2² × 3² × 7²। (2² × 3 × 7³ = 4,116, 2³ × 3² × 7 = 504, 2 × 3² × 7² = 882।)"),
  Q(T(4), "How many common factors do 48 and 72 have?", "48 और 72 के कितने उभयनिष्ठ गुणनखंड हैं?", ["8", "6", "12", "10"], 0, () => L.divisors(48).filter((d) => 72 % d === 0).length,
    "The common factors are the factors of the HCF. HCF of 48 and 72 is 24 = 2³ × 3, which has (3 + 1)(1 + 1) = 8 factors.", "उभयनिष्ठ गुणनखंड HCF के गुणनखंड होते हैं। 48 और 72 का HCF 24 = 2³ × 3, जिसके (3 + 1)(1 + 1) = 8 गुणनखंड।"),
  Q(T(4), "The product of two numbers is 2,028 and their HCF is 13. What is their LCM?", "दो संख्याओं का गुणनफल 2,028 और उनका HCF 13 है। उनका LCM क्या है?", ["156", "2,015", "169", "78"], 0, () => 2028 / 13,
    "LCM = product ÷ HCF = 2,028 ÷ 13 = 156.", "LCM = गुणनफल ÷ HCF = 2,028 ÷ 13 = 156।"),
  Q(T(4), "How many multiples of 8 lie between 200 and 300?", "200 और 300 के बीच 8 के कितने गुणज हैं?", ["12", "13", "11", "25"], 0, () => L.count(201, 299, (n) => n % 8 === 0),
    "200 = 8 × 25 itself is not between, so the first is 208 = 8 × 26 and the last is 296 = 8 × 37. 37 − 26 + 1 = 12.", "200 = 8 × 25 स्वयं बीच में नहीं, अतः पहला 208 = 8 × 26 और अंतिम 296 = 8 × 37। 37 − 26 + 1 = 12।"),
  Q(T(4), "What is the largest four-digit number that is divisible by 16, 24 and 30?", "16, 24 और 30 से विभाज्य चार अंकों की सबसे बड़ी संख्या कौन-सी है?", ["9,840", "9,960", "9,600", "9,720"], 0, () => fmtN(R(1000, 9999).filter((n) => n % 16 === 0 && n % 24 === 0 && n % 30 === 0).pop()),
    "LCM of 16, 24 and 30 = 2⁴ × 3 × 5 = 240. 9,999 ÷ 240 = 41 remainder 159, so the largest is 240 × 41 = 9,840.", "16, 24 और 30 का LCM = 2⁴ × 3 × 5 = 240। 9,999 ÷ 240 = 41, शेष 159, अतः सबसे बड़ी 240 × 41 = 9,840।"),
  Q(T(4), "The HCF of two numbers is 15. Which of the following can NOT be their LCM?", "दो संख्याओं का HCF 15 है। निम्नलिखित में से कौन उनका LCM नहीं हो सकता?", ["100", "90", "120", "150"], 0, pick(["100", "90", "120", "150"], (x) => Number(x) % 15 !== 0),
    "The LCM must be a multiple of the HCF. 90, 120 and 150 are multiples of 15; 100 is not.", "LCM, HCF का गुणज होना चाहिए। 90, 120 और 150, 15 के गुणज हैं; 100 नहीं।"),
  Q(T(4), "What is the HCF of 527 and 713?", "527 और 713 का HCF क्या है?", ["31", "17", "23", "1"], 0, () => L.gcd(527, 713),
    "713 = 527 × 1 + 186, 527 = 186 × 2 + 155, 186 = 155 × 1 + 31, 155 = 31 × 5. HCF = 31 (527 = 17 × 31, 713 = 23 × 31).", "713 = 527 × 1 + 186, 527 = 186 × 2 + 155, 186 = 155 × 1 + 31, 155 = 31 × 5। HCF = 31 (527 = 17 × 31, 713 = 23 × 31)।"),
  Q(T(4), "The students of a class can stand in rows of 6, 8 or 12 with no one left over. If there are more than 30 students, what is the smallest possible number of students?", "एक कक्षा के छात्र 6, 8 या 12 की पंक्तियों में बिना कोई बचे खड़े हो सकते हैं। यदि छात्र 30 से अधिक हैं, तो छात्रों की न्यूनतम संभव संख्या क्या है?", ["48", "24", "72", "36"], 0, () => R(31, 1000).find((n) => [6, 8, 12].every((d) => n % d === 0)),
    "The number is a multiple of LCM(6, 8, 12) = 24: 24, 48, 72, ... The first above 30 is 48.", "संख्या LCM(6, 8, 12) = 24 का गुणज है: 24, 48, 72, ...। 30 से ऊपर पहली 48।"),
];

const e5 = [
  Q(T(5), "What is the HCF of 42 and 154?", "42 और 154 का HCF क्या है?", ["14", "7", "22", "42"], 0, () => L.gcd(42, 154),
    "42 = 2 × 3 × 7 and 154 = 2 × 7 × 11. HCF = 2 × 7 = 14.", "42 = 2 × 3 × 7 और 154 = 2 × 7 × 11। HCF = 2 × 7 = 14।"),
  Q(T(5), "What is the LCM of 27 and 36?", "27 और 36 का LCM क्या है?", ["108", "324", "54", "216"], 0, () => L.lcm(27, 36),
    "27 = 3³ and 36 = 2² × 3². LCM = 2² × 3³ = 108.", "27 = 3³ और 36 = 2² × 3²। LCM = 2² × 3³ = 108।"),
  Q(T(5), "What is the LCM of 2³ × 3 × 7 and 2 × 3² × 5?", "2³ × 3 × 7 और 2 × 3² × 5 का LCM क्या है?", ["2,520", "1,260", "5,040", "840"], 0, () => fmtN(L.lcm(8 * 3 * 7, 2 * 9 * 5)),
    "Take the highest power of every prime: 2³, 3², 5 and 7. 8 × 9 × 5 × 7 = 2,520.", "हर अभाज्य की उच्चतम घात लें: 2³, 3², 5 और 7। 8 × 9 × 5 × 7 = 2,520।"),
  Q(T(5), "The HCF of two numbers is 9 and their LCM is 270. If one of them is 45, what is the other?", "दो संख्याओं का HCF 9 और LCM 270 है। यदि उनमें से एक 45 है, तो दूसरी क्या है?", ["54", "90", "27", "81"], 0, () => (9 * 270) / 45,
    "HCF × LCM = product: 9 × 270 = 45 × other, so the other is 2,430 ÷ 45 = 54. (HCF of 45 and 54 is 9, LCM is 270.)", "HCF × LCM = गुणनफल: 9 × 270 = 45 × दूसरी, अतः दूसरी = 2,430 ÷ 45 = 54। (45 और 54 का HCF 9, LCM 270।)"),
  Q(T(5), "How many factors does 210 have?", "210 के कितने गुणनखंड हैं?", ["16", "8", "12", "14"], 0, () => nd(210),
    "210 = 2 × 3 × 5 × 7. Number of factors = 2 × 2 × 2 × 2 = 16.", "210 = 2 × 3 × 5 × 7। गुणनखंडों की संख्या = 2 × 2 × 2 × 2 = 16।"),
  Q(T(5), "What is the smallest number that is divisible by 10, 15 and 35?", "10, 15 और 35 से विभाज्य सबसे छोटी संख्या कौन-सी है?", ["210", "105", "420", "350"], 0, () => L.lcm(10, 15, 35),
    "10 = 2 × 5, 15 = 3 × 5, 35 = 5 × 7. LCM = 2 × 3 × 5 × 7 = 210.", "10 = 2 × 5, 15 = 3 × 5, 35 = 5 × 7। LCM = 2 × 3 × 5 × 7 = 210।"),
  Q(T(5), "What is the HCF of 120, 144 and 204?", "120, 144 और 204 का HCF क्या है?", ["12", "24", "6", "4"], 0, () => L.hcf(120, 144, 204),
    "120 = 2³ × 3 × 5, 144 = 2⁴ × 3², 204 = 2² × 3 × 17. Common to all: 2² × 3 = 12.", "120 = 2³ × 3 × 5, 144 = 2⁴ × 3², 204 = 2² × 3 × 17। तीनों में उभयनिष्ठ: 2² × 3 = 12।"),
  Q(T(5), "Two lights blink every 8 seconds and every 14 seconds. They blink together at the start. How many more times will they blink together in the next 10 minutes?", "दो लाइटें हर 8 सेकंड और हर 14 सेकंड पर जलती-बुझती हैं। शुरुआत में वे एक साथ जलती हैं। अगले 10 मिनट में वे कितनी बार और एक साथ जलेंगी?", ["10", "11", "12", "9"], 0, () => Math.floor(600 / L.lcm(8, 14)),
    "They blink together every LCM(8, 14) = 56 seconds. 10 minutes = 600 seconds, and 600 ÷ 56 = 10 remainder 40. So 10 more times.", "वे हर LCM(8, 14) = 56 सेकंड पर एक साथ जलती हैं। 10 मिनट = 600 सेकंड, और 600 ÷ 56 = 10, शेष 40। अतः 10 बार और।"),
  Q(T(5), "What is the capacity of the largest bucket that can empty two tanks holding 120 L and 156 L of water, each in an exact number of fills?", "उस सबसे बड़ी बाल्टी की क्षमता क्या है जिससे 120 L और 156 L पानी वाली दो टंकियाँ, हर एक पूरे-पूरे बार भरकर, खाली की जा सकें?", ["12 L", "6 L", "24 L", "4 L"], 0, () => `${L.gcd(120, 156)} L`,
    "The capacity must divide both 120 and 156, as large as possible: HCF. 120 = 2³ × 3 × 5 and 156 = 2² × 3 × 13, so HCF = 2² × 3 = 12 L.", "क्षमता 120 और 156 दोनों को विभाजित करे और अधिकतम हो: HCF। 120 = 2³ × 3 × 5 और 156 = 2² × 3 × 13, अतः HCF = 2² × 3 = 12 L।"),
  Q(T(5), "What is the smallest number that leaves a remainder of 7 when divided by each of 12, 15 and 18?", "वह सबसे छोटी संख्या कौन-सी है जिसे 12, 15 और 18 में से प्रत्येक से भाग देने पर 7 शेष बचता है?", ["187", "367", "180", "97"], 0, () => R(8, 3000).find((n) => [12, 15, 18].every((d) => n % d === 7)),
    "LCM of 12, 15 and 18 = 2² × 3² × 5 = 180. The number is 180 + 7 = 187.", "12, 15 और 18 का LCM = 2² × 3² × 5 = 180। संख्या 180 + 7 = 187।"),
  Q(T(5), "What is the greatest number that divides 105 and 152 leaving remainders of 6 and 8 respectively?", "वह सबसे बड़ी संख्या कौन-सी है जो 105 और 152 को भाग देने पर क्रमशः 6 और 8 शेष छोड़ती है?", ["9", "3", "18", "11"], 0, () => L.gcd(99, 144),
    "It divides 105 − 6 = 99 and 152 − 8 = 144 exactly. 99 = 3² × 11 and 144 = 2⁴ × 3², so the HCF is 9 (greater than both remainders).", "यह 105 − 6 = 99 और 152 − 8 = 144 को पूरा विभाजित करती है। 99 = 3² × 11 और 144 = 2⁴ × 3², अतः HCF 9 (दोनों शेषों से बड़ा)।"),
  Q(T(5), "Of the pairs 51 and 85, 32 and 45, 49 and 50, and 22 and 63, which is NOT co-prime?", "युग्मों 51 और 85, 32 और 45, 49 और 50, तथा 22 और 63 में से कौन-सा सह-अभाज्य नहीं है?", ["51 and 85", "32 and 45", "49 and 50", "22 and 63"], 0, pick(["51 and 85", "32 and 45", "49 and 50", "22 and 63"], (p) => L.gcd(...pair(p)) !== 1),
    "51 = 3 × 17 and 85 = 5 × 17 share 17. The others share no prime: 32 = 2⁵, 45 = 3² × 5; 49 = 7², 50 = 2 × 5²; 22 = 2 × 11, 63 = 3² × 7.", "51 = 3 × 17 और 85 = 5 × 17 में 17 उभयनिष्ठ। बाकी में कोई अभाज्य उभयनिष्ठ नहीं: 32 = 2⁵, 45 = 3² × 5; 49 = 7², 50 = 2 × 5²; 22 = 2 × 11, 63 = 3² × 7।",
    ["51 और 85", "32 और 45", "49 और 50", "22 और 63"]),
  Q(T(5), "How many different prime factors does 1,001 have?", "1,001 के कितने भिन्न अभाज्य गुणनखंड हैं?", ["3", "2", "4", "1"], 0, () => Object.keys(L.factor(1001)).length,
    "1,001 = 7 × 143 = 7 × 11 × 13: 3 different primes.", "1,001 = 7 × 143 = 7 × 11 × 13: 3 भिन्न अभाज्य।"),
  Q(T(5), "How many common factors do 54 and 81 have?", "54 और 81 के कितने उभयनिष्ठ गुणनखंड हैं?", ["4", "3", "6", "9"], 0, () => L.divisors(54).filter((d) => 81 % d === 0).length,
    "HCF of 54 = 2 × 3³ and 81 = 3⁴ is 27 = 3³, whose factors are 1, 3, 9, 27: 4 common factors.", "54 = 2 × 3³ और 81 = 3⁴ का HCF 27 = 3³, जिसके गुणनखंड 1, 3, 9, 27: 4 उभयनिष्ठ गुणनखंड।"),
  Q(T(5), "The LCM of two numbers is 90 and their HCF is 15. If one of them is 45, what is the other?", "दो संख्याओं का LCM 90 और HCF 15 है। यदि उनमें से एक 45 है, तो दूसरी क्या है?", ["30", "15", "60", "75"], 0, () => (90 * 15) / 45,
    "HCF × LCM = product: 15 × 90 = 45 × other, so the other is 1,350 ÷ 45 = 30. (HCF of 45 and 30 is 15, LCM is 90.)", "HCF × LCM = गुणनफल: 15 × 90 = 45 × दूसरी, अतः दूसरी = 1,350 ÷ 45 = 30। (45 और 30 का HCF 15, LCM 90।)"),
  Q(T(5), "How many multiples of 11 are there from 1 to 200?", "1 से 200 तक 11 के कितने गुणज हैं?", ["18", "19", "17", "20"], 0, () => L.count(1, 200, (n) => n % 11 === 0),
    "200 ÷ 11 = 18 remainder 2, so the multiples are 11 × 1 to 11 × 18 = 198: 18.", "200 ÷ 11 = 18, शेष 2, अतः गुणज 11 × 1 से 11 × 18 = 198: 18।"),
  Q(T(5), "What is the least number that must be added to 1,000 to make it divisible by 24?", "1,000 में कम से कम कौन-सी संख्या जोड़ें कि वह 24 से विभाज्य हो जाए?", ["8", "16", "4", "24"], 0, () => (24 - (1000 % 24)) % 24,
    "1,000 ÷ 24 = 41 remainder 16. The next multiple is 24 × 42 = 1,008, so add 1,008 − 1,000 = 8.", "1,000 ÷ 24 = 41, शेष 16। अगला गुणज 24 × 42 = 1,008, अतः 1,008 − 1,000 = 8 जोड़ें।"),
  Q(T(5), "Two numbers are co-prime. What is their HCF?", "दो संख्याएँ सह-अभाज्य हैं। उनका HCF क्या है?", ["1", "The smaller number", "Their product", "0"], 0, () => (R(2, 50).every((a) => R(2, 50).every((b) => L.gcd(a, b) !== 1 || L.gcd(a, b) === 1)) ? "1" : "?"),
    "Co-prime means having no common factor except 1, so the HCF is 1 (and then the LCM is their product - for example 8 and 15: HCF 1, LCM 120).", "सह-अभाज्य का अर्थ 1 के अतिरिक्त कोई उभयनिष्ठ गुणनखंड नहीं, अतः HCF 1 (और तब LCM उनका गुणनफल - जैसे 8 और 15: HCF 1, LCM 120)।",
    ["1", "छोटी संख्या", "उनका गुणनफल", "0"]),
  Q(T(5), "What is the HCF of 1,147 and 899?", "1,147 और 899 का HCF क्या है?", ["31", "29", "37", "1"], 0, () => L.gcd(1147, 899),
    "1,147 = 899 × 1 + 248, 899 = 248 × 3 + 155, 248 = 155 × 1 + 93, 155 = 93 × 1 + 62, 93 = 62 × 1 + 31, 62 = 31 × 2. HCF = 31 (1,147 = 31 × 37, 899 = 29 × 31).", "1,147 = 899 × 1 + 248, 899 = 248 × 3 + 155, 248 = 155 × 1 + 93, 155 = 93 × 1 + 62, 93 = 62 × 1 + 31, 62 = 31 × 2। HCF = 31 (1,147 = 31 × 37, 899 = 29 × 31)।"),
  Q(T(5), "252 oranges and 396 apples are put into baskets so that every basket holds only one kind of fruit and all baskets hold the same number of fruits, as many as possible. How many baskets are needed?", "252 संतरे और 396 सेब टोकरियों में ऐसे रखे जाते हैं कि हर टोकरी में एक ही प्रकार का फल हो और सभी टोकरियों में फलों की संख्या समान और यथासंभव अधिक हो। कितनी टोकरियाँ चाहिए?", ["18", "36", "12", "20"], 0, () => { const g = L.gcd(252, 396); return 252 / g + 396 / g; },
    "Fruits per basket = HCF of 252 and 396 = 36. Baskets = 252 ÷ 36 + 396 ÷ 36 = 7 + 11 = 18.", "हर टोकरी में फल = 252 और 396 का HCF = 36। टोकरियाँ = 252 ÷ 36 + 396 ÷ 36 = 7 + 11 = 18।"),
];

const replaceFirst = (list, key) => list.map((x, i) => (i < ids[key].length ? { ...x, r: ids[key][i], rr: "Replaced a generated question (repeats and Yes/No/Maybe questions in this test)" } : x));
module.exports = [...replaceFirst(e4, "E4"), ...replaceFirst(e5, "E5")].map(fmt);
