// Number System: the rest of the "same pattern over and over" fixes for
// Remainder Theorem Easy, Divisibility Rules Easy #2 and Unit Digit
// Medium / Hard / Advanced. Every answer is worked out again in `v`.
const L = require("./lib");
const NS = (s) => `Number System · ${s}`;
const RR = "too many questions of one pattern in the test";
const Q = (t, r, q, qh, o, a, value, s, sh, oh) => ({ t: NS(t), r, rr: RR, q, qh, o, ...(oh ? { oh } : {}), a, v: () => L.only(o, a, String(value())), s, sh });
const B = (x) => BigInt(x);
const mod = (x, m) => Number(((B(x) % B(m)) + B(m)) % B(m));
const two = (n) => String(n).padStart(2, "0");
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

module.exports = [
  // ---------------------------------------------------- Remainder Easy
  Q("Remainder Theorem · Easy #1", "6ad3183b08ddbd98ed037b62", "A rope 100 m long is cut into as many 7 m pieces as possible. How many metres of rope are left over?", "100 m लंबी रस्सी से जितने हो सकें उतने 7 m के टुकड़े काटे जाते हैं। कितने मीटर रस्सी बचती है?", ["2", "3", "5", "1"], 0, () => 100 % 7,
    "100 = 7 × 14 + 2, so 14 pieces are cut and 2 m is left over (the remainder).", "100 = 7 × 14 + 2, अतः 14 टुकड़े कटते हैं और 2 m बचती है (शेषफल)।"),
  Q("Remainder Theorem · Easy #1", "6ad3183b08ddbd98ed037b63", "1 January of a year is a Sunday. What day of the week is 31 January of the same year?", "किसी वर्ष की 1 जनवरी रविवार है। उसी वर्ष की 31 जनवरी को सप्ताह का कौन-सा दिन है?", ["Tuesday", "Monday", "Wednesday", "Sunday"], 0, () => DAYS[(0 + 30) % 7],
    "31 January is 30 days after 1 January. 30 = 7 × 4 + 2, so it is 2 days after Sunday: Tuesday.", "31 जनवरी, 1 जनवरी के 30 दिन बाद है। 30 = 7 × 4 + 2, अतः रविवार के 2 दिन बाद: मंगलवार।", ["मंगलवार", "सोमवार", "बुधवार", "रविवार"]),
  Q("Remainder Theorem · Easy #2", "6ad3184108ddbd98ed037bb6", "What is the smallest two-digit number that leaves a remainder of 2 when divided by 5?", "दो अंकों की वह सबसे छोटी संख्या कौन-सी है जिसे 5 से भाग देने पर शेषफल 2 आता है?", ["12", "10", "17", "22"], 0, () => L.range(10, 99).find((n) => n % 5 === 2),
    "Numbers leaving 2 on division by 5 are 2, 7, 12, 17, ... The first two-digit one is 12.", "5 से भाग देने पर शेष 2 वाली संख्याएँ 2, 7, 12, 17, ... हैं। दो अंकों की पहली 12 है।"),
  Q("Remainder Theorem · Easy #3", "6ad3184908ddbd98ed037c1c", "It is 9 a.m. now. What time will it be 100 hours from now?", "अभी सुबह के 9 बजे हैं। अब से 100 घंटे बाद क्या समय होगा?", ["1 p.m.", "9 a.m.", "4 a.m.", "5 p.m."], 0, () => { const h = (9 + 100) % 24; return h === 0 ? "12 a.m." : h < 12 ? `${h} a.m.` : h === 12 ? "12 p.m." : `${h - 12} p.m.`; },
    "100 = 24 × 4 + 4, so 100 hours is 4 full days and 4 hours. 4 hours after 9 a.m. is 1 p.m.", "100 = 24 × 4 + 4, अतः 100 घंटे = 4 पूरे दिन और 4 घंटे। सुबह 9 बजे के 4 घंटे बाद दोपहर 1 बजे।", ["दोपहर 1 बजे", "सुबह 9 बजे", "सुबह 4 बजे", "शाम 5 बजे"]),
  Q("Remainder Theorem · Easy #3", "6ad3184908ddbd98ed037c22", "How many numbers between 1 and 50 leave a remainder of 3 when divided by 7?", "1 और 50 के बीच कितनी संख्याएँ 7 से भाग देने पर शेषफल 3 देती हैं?", ["7", "6", "8", "5"], 0, () => L.count(2, 49, (n) => n % 7 === 3),
    "They are 3, 10, 17, 24, 31, 38 and 45 (the next, 52, is too big). That is 7.", "ये 3, 10, 17, 24, 31, 38 और 45 हैं (अगली 52 बड़ी है)। कुल 7।"),
  Q("Remainder Theorem · Easy #5", "6ad3185708ddbd98ed037ca0", "What is the largest two-digit number that leaves a remainder of 4 when divided by 9?", "दो अंकों की वह सबसे बड़ी संख्या कौन-सी है जिसे 9 से भाग देने पर शेषफल 4 आता है?", ["94", "99", "85", "90"], 0, () => L.range(10, 99).filter((n) => n % 9 === 4).pop(),
    "99 = 9 × 11 leaves 0, so go back to the last number leaving 4: 9 × 10 + 4 = 94.", "99 = 9 × 11 का शेष 0, अतः पीछे जाकर शेष 4 वाली अंतिम संख्या: 9 × 10 + 4 = 94।"),
  Q("Remainder Theorem · Easy #6", "6ad3185d08ddbd98ed037ccf", "What is the sum of the remainders when 25, 26 and 27 are each divided by 4?", "25, 26 और 27 को अलग-अलग 4 से भाग देने पर मिले शेषफलों का योग क्या है?", ["6", "3", "2", "5"], 0, () => (25 % 4) + (26 % 4) + (27 % 4),
    "25 = 4 × 6 + 1, 26 = 4 × 6 + 2, 27 = 4 × 6 + 3. The remainders 1 + 2 + 3 = 6.", "25 = 4 × 6 + 1, 26 = 4 × 6 + 2, 27 = 4 × 6 + 3। शेषफल 1 + 2 + 3 = 6।"),
  Q("Remainder Theorem · Easy #6", "6ad3185d08ddbd98ed037cd5", "In a class of 47 students, the teacher makes groups of 6. How many students are left without a group?", "47 छात्रों की कक्षा में शिक्षक 6-6 के समूह बनाते हैं। कितने छात्र किसी समूह में नहीं आ पाते?", ["5", "1", "6", "7"], 0, () => 47 % 6,
    "47 = 6 × 7 + 5, so 7 groups are made and 5 students are left over.", "47 = 6 × 7 + 5, अतः 7 समूह बनते हैं और 5 छात्र बचते हैं।"),
  // -------------------------------------------------- Divisibility Easy #2
  Q("Divisibility Rules · Easy #2", "6ad279db1f0dee15d7edb3c2", "A number is divisible by 25. Which of these can be its last two digits: 35, 45, 75 or 85?", "एक संख्या 25 से विभाज्य है। इनमें से कौन-से अंक उसके अंतिम दो अंक हो सकते हैं: 35, 45, 75 या 85?", ["75", "35", "45", "85"], 0, () => ["75", "35", "45", "85"].filter((s) => Number(s) % 25 === 0).join(),
    "A number is divisible by 25 when its last two digits are 00, 25, 50 or 75. Of these, only 75 fits.", "कोई संख्या 25 से तब विभाज्य है जब उसके अंतिम दो अंक 00, 25, 50 या 75 हों। इनमें केवल 75।"),
  // ------------------------------------------------- Unit Digit Medium/Hard
  Q("Unit Digit · Medium #9", "6ad30e0e96cd975efdf8ad71", "What is the unit digit of 3²⁰²⁵ + 7²⁰²⁵?", "3²⁰²⁵ + 7²⁰²⁵ का इकाई अंक क्या है?", ["0", "4", "6", "2"], 0, () => mod(B(3) ** B(2025) + B(7) ** B(2025), 10),
    "2025 = 4 × 506 + 1, so 3²⁰²⁵ ends like 3¹ (3) and 7²⁰²⁵ ends like 7¹ (7). 3 + 7 = 10, so the unit digit is 0.", "2025 = 4 × 506 + 1, अतः 3²⁰²⁵ का इकाई अंक 3¹ जैसा (3) और 7²⁰²⁵ का 7¹ जैसा (7)। 3 + 7 = 10, अतः इकाई अंक 0।"),
  Q("Unit Digit · Hard #8", "6ad313935a3455552d243ff1", "What are the last two digits of 3¹⁰ + 7¹⁰?", "3¹⁰ + 7¹⁰ के अंतिम दो अंक क्या हैं?", ["98", "58", "49", "00"], 0, () => two(mod(B(3) ** 10n + B(7) ** 10n, 100)),
    "3¹⁰ = 59,049 ends in 49. 7⁴ = 2,401 ends in 01, so 7¹⁰ = 7⁸ × 7² ends like 01 × 49 = 49. 49 + 49 = 98.", "3¹⁰ = 59,049 के अंतिम दो अंक 49। 7⁴ = 2,401 के 01, अतः 7¹⁰ = 7⁸ × 7² के 01 × 49 = 49। 49 + 49 = 98।"),
  // ---------------------------------------------------- Unit Digit Advanced
  Q("Unit Digit · Advanced #4", "6ad3172b08ddbd98ed03750a", "What is the unit digit of 17⁴⁵ × 23⁶⁷ × 29⁸⁹?", "17⁴⁵ × 23⁶⁷ × 29⁸⁹ का इकाई अंक क्या है?", ["1", "9", "3", "7"], 0, () => mod(B(17) ** 45n * B(23) ** 67n * B(29) ** 89n, 10),
    "45 = 4 × 11 + 1, so 17⁴⁵ ends like 7¹: 7. 67 = 4 × 16 + 3, so 23⁶⁷ ends like 3³: 7. 89 is odd, so 29⁸⁹ ends in 9. 7 × 7 = 49 → 9, and 9 × 9 = 81 → 1.", "45 = 4 × 11 + 1, अतः 17⁴⁵ का इकाई अंक 7¹ जैसा: 7। 67 = 4 × 16 + 3, अतः 23⁶⁷ का 3³ जैसा: 7। 89 विषम है, अतः 29⁸⁹ का 9। 7 × 7 = 49 → 9, और 9 × 9 = 81 → 1।"),
  Q("Unit Digit · Advanced #4", "6ad3172b08ddbd98ed03750b", "What is the unit digit of (2⁵⁰ − 1) × (3⁵⁰ + 1)?", "(2⁵⁰ − 1) × (3⁵⁰ + 1) का इकाई अंक क्या है?", ["0", "3", "9", "7"], 0, () => mod((B(2) ** 50n - 1n) * (B(3) ** 50n + 1n), 10),
    "50 = 4 × 12 + 2. 2⁵⁰ ends like 2² = 4, so 2⁵⁰ − 1 ends in 3. 3⁵⁰ ends like 3² = 9, so 3⁵⁰ + 1 ends in 0. Anything times a number ending in 0 ends in 0.", "50 = 4 × 12 + 2। 2⁵⁰ का इकाई अंक 2² = 4 जैसा, अतः 2⁵⁰ − 1 का 3। 3⁵⁰ का 3² = 9 जैसा, अतः 3⁵⁰ + 1 का 0। 0 पर समाप्त संख्या से गुणा करने पर इकाई अंक 0।"),
  Q("Unit Digit · Advanced #6", "6ad3173908ddbd98ed037597", "What are the last two digits of 3⁴⁰ × 7⁴⁰?", "3⁴⁰ × 7⁴⁰ के अंतिम दो अंक क्या हैं?", ["01", "21", "41", "81"], 0, () => two(mod(B(3) ** 40n * B(7) ** 40n, 100)),
    "3⁴⁰ × 7⁴⁰ = 21⁴⁰. A power of 21 = 1 + 20 ends like 1 + (power) × 20 in its last two digits: 1 + 40 × 20 = 801, so 01.", "3⁴⁰ × 7⁴⁰ = 21⁴⁰। 21 = 1 + 20 की घात के अंतिम दो अंक 1 + (घात) × 20 जैसे: 1 + 40 × 20 = 801, अतः 01।"),
  Q("Unit Digit · Advanced #6", "6ad3173908ddbd98ed037598", "What are the last two digits of 11¹¹ + 21²¹?", "11¹¹ + 21²¹ के अंतिम दो अंक क्या हैं?", ["32", "22", "12", "42"], 0, () => two(mod(B(11) ** 11n + B(21) ** 21n, 100)),
    "For a number ending in 1, the last two digits of its power follow 1 + (power) × (tens digit) × 10. 11¹¹: 1 + 11 × 10 = 111 → 11. 21²¹: 1 + 21 × 20 = 421 → 21. 11 + 21 = 32.", "1 पर समाप्त संख्या की घात के अंतिम दो अंक 1 + (घात) × (दहाई अंक) × 10 जैसे। 11¹¹: 1 + 11 × 10 = 111 → 11। 21²¹: 1 + 21 × 20 = 421 → 21। 11 + 21 = 32।"),
  Q("Unit Digit · Advanced #6", "6ad3173908ddbd98ed037599", "What are the last two digits of the product 1 × 3 × 5 × ... × 99 of all odd numbers below 100?", "100 से कम सभी विषम संख्याओं के गुणनफल 1 × 3 × 5 × ... × 99 के अंतिम दो अंक क्या हैं?", ["75", "25", "05", "50"], 0, () => { let o = 1n; for (let k = 1n; k <= 99n; k += 2n) o *= k; return two(mod(o, 100)); },
    "The product is odd and a multiple of 25 (it contains 5 × 15), so its last two digits are 25 or 75. It is also 3 more than a multiple of 4 (the product of the odd numbers up to 99 leaves remainder 3 on division by 4), and of 25 and 75 only 75 leaves 3 on division by 4. So 75.", "गुणनफल विषम है और 25 का गुणज (इसमें 5 × 15 है), अतः अंतिम दो अंक 25 या 75। साथ ही 4 से भाग पर इसका शेष 3 है, और 25, 75 में केवल 75 का 4 से शेष 3 है। अतः 75।"),
  Q("Unit Digit · Advanced #6", "6ad3173908ddbd98ed03759a", "What are the last two digits of 5²⁰²⁶ + 6²⁰²⁶?", "5²⁰²⁶ + 6²⁰²⁶ के अंतिम दो अंक क्या हैं?", ["81", "31", "61", "01"], 0, () => two(mod(B(5) ** 2026n + B(6) ** 2026n, 100)),
    "Every power of 5 from 5² on ends in 25. Powers of 6 from 6² on end in 36, 16, 96, 76, 56 and repeat every 5; 2026 = 5 × 405 + 1 lands where 6⁶ does, ending in 56. 25 + 56 = 81.", "5² से आगे 5 की हर घात 25 पर समाप्त होती है। 6² से आगे 6 की घातें 36, 16, 96, 76, 56 पर समाप्त होकर हर 5 पर दोहराती हैं; 2026 = 5 × 405 + 1, 6⁶ के स्थान पर, यानी 56। 25 + 56 = 81।"),
];
