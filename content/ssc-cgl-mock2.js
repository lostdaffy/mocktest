// SSC CGL Tier 1 - Mock #2, written by hand (no AI), 2026-11-04.
// Maths 25, Reasoning 25, English 25, GK 25 (the order of the pattern). Maths,
// Reasoning and GK are in both languages; the English section is English.
//   node content/ssc-cgl-mock2.js --json
const { add, H, done } = require("./mock-lib")({
  name: "ssc-cgl-mock2",
  want: { Maths: 25, Reasoning: 25, English: 25, GK: 25 },
});
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// ================================================================ MATHS (25)
add("Maths", "Simplification", "easy", "What is the value of (3/4 of 560) ÷ 7 + 15?", "(560 का 3/4) ÷ 7 + 15 का मान क्या है?",
  ["65", "75", "85", "95"], null, "B", "3/4 of 560 = 420; 420 ÷ 7 = 60; 60 + 15 = 75.", "560 का 3/4 = 420; 420 ÷ 7 = 60; 60 + 15 = 75।",
  () => (560 * 3 / 4) / 7 + 15 === 75);

add("Maths", "Time & Work", "medium", "A can do a piece of work in 20 days and B in 30 days. They work together for 6 days and then A leaves. In how many more days will B finish the remaining work?", "A किसी काम को 20 दिन में और B 30 दिन में कर सकता है। दोनों 6 दिन साथ काम करते हैं, फिर A चला जाता है। शेष काम B कितने और दिन में पूरा करेगा?",
  ["10 days", "12 days", "15 days", "18 days"], ["10 दिन", "12 दिन", "15 दिन", "18 दिन"], "C",
  "In 6 days they finish 6 × (1/20 + 1/30) = 6 × 5/60 = 1/2 of the work. B does the other 1/2 at 1/30 per day: (1/2) ÷ (1/30) = 15 days.",
  "6 दिन में वे 6 × (1/20 + 1/30) = 6 × 5/60 = 1/2 काम पूरा करते हैं। शेष 1/2 काम B 1/30 प्रतिदिन की दर से (1/2) ÷ (1/30) = 15 दिन में करेगा।",
  () => Math.abs((1 - 6 * (1 / 20 + 1 / 30)) / (1 / 30) - 15) < 1e-9);

add("Maths", "Compound Interest", "medium", "What is the compound interest on ₹8,000 at 10% per annum for 2 years, compounded annually?", "₹8,000 पर 10% वार्षिक दर से 2 वर्ष का चक्रवृद्धि ब्याज (वार्षिक संयोजन) कितना होगा?",
  ["₹1,600", "₹1,640", "₹1,680", "₹1,720"], ["₹1,600", "₹1,640", "₹1,680", "₹1,720"], "C",
  "Amount = 8000 × 1.1 × 1.1 = ₹9,680. Compound interest = 9680 − 8000 = ₹1,680.", "मिश्रधन = 8000 × 1.1 × 1.1 = ₹9,680। चक्रवृद्धि ब्याज = 9680 − 8000 = ₹1,680।",
  () => Math.round(8000 * 1.1 * 1.1 - 8000) === 1680);

add("Maths", "Profit & Loss", "medium", "Two articles are each sold for ₹1,200, one at a gain of 20% and the other at a loss of 20%. What is the overall result?", "दो वस्तुएँ प्रत्येक ₹1,200 में बेची जाती हैं, एक 20% लाभ पर और दूसरी 20% हानि पर। कुल परिणाम क्या है?",
  ["No profit, no loss", "4% loss", "4% profit", "2% loss"], ["न लाभ न हानि", "4% हानि", "4% लाभ", "2% हानि"], "B",
  "CP of the first = 1200 / 1.2 = ₹1,000; CP of the second = 1200 / 0.8 = ₹1,500. Total CP = 2,500, total SP = 2,400, loss = 100, which is 100/2500 = 4%.",
  "पहली का क्रय मूल्य = 1200 / 1.2 = ₹1,000; दूसरी का = 1200 / 0.8 = ₹1,500। कुल क्रय मूल्य = 2,500, कुल विक्रय मूल्य = 2,400, हानि = 100 यानी 100/2500 = 4%।",
  () => Math.round((1200 / 1.2 + 1200 / 0.8 - 2400) / (1200 / 1.2 + 1200 / 0.8) * 100) === 4);

add("Maths", "Time & Distance", "medium", "Two trains of lengths 120 m and 180 m run in opposite directions at 54 km/h and 36 km/h. In how many seconds will they completely cross each other?", "120 मी और 180 मी लंबी दो रेलगाड़ियाँ विपरीत दिशाओं में 54 किमी/घंटा और 36 किमी/घंटा की चाल से चल रही हैं। वे एक-दूसरे को पूरी तरह पार करने में कितने सेकंड लेंगी?",
  ["10 s", "12 s", "15 s", "18 s"], ["10 से", "12 से", "15 से", "18 से"], "B",
  "Relative speed = 54 + 36 = 90 km/h = 25 m/s. Total length = 300 m. Time = 300 / 25 = 12 seconds.", "सापेक्ष चाल = 54 + 36 = 90 किमी/घंटा = 25 मी/से। कुल लंबाई = 300 मी। समय = 300 / 25 = 12 सेकंड।",
  () => 300 / ((54 + 36) * 5 / 18) === 12);

add("Maths", "Average", "easy", "The average of 8 numbers is 25. If every number is multiplied by 3, what is the new average?", "8 संख्याओं का औसत 25 है। यदि प्रत्येक संख्या को 3 से गुणा कर दिया जाए, तो नया औसत क्या होगा?",
  ["28", "50", "75", "100"], null, "C", "When every number is multiplied by 3, the average is also multiplied by 3: 25 × 3 = 75.", "प्रत्येक संख्या को 3 से गुणा करने पर औसत भी 3 गुना हो जाता है: 25 × 3 = 75।",
  () => 25 * 3 === 75);

add("Maths", "Mixture", "hard", "A 40-litre mixture of milk and water has milk and water in the ratio 3 : 1. How much water must be added to make the ratio 3 : 2?", "40 लीटर के दूध-पानी के मिश्रण में दूध और पानी का अनुपात 3 : 1 है। अनुपात 3 : 2 करने के लिए कितना पानी मिलाना होगा?",
  ["5 litres", "8 litres", "10 litres", "12 litres"], ["5 लीटर", "8 लीटर", "10 लीटर", "12 लीटर"], "C",
  "Milk = 30 L, water = 10 L. For the ratio 3 : 2 with 30 L milk, water must be 20 L, so 20 − 10 = 10 litres must be added.",
  "दूध = 30 ली, पानी = 10 ली। 30 ली दूध के साथ अनुपात 3 : 2 के लिए पानी 20 ली चाहिए, इसलिए 20 − 10 = 10 लीटर पानी मिलाना होगा।",
  () => 40 * 3 / 4 * 2 / 3 - 40 / 4 === 10);

add("Maths", "Mensuration", "easy", "What is the curved surface area of a cylinder of radius 7 cm and height 10 cm? (π = 22/7)", "7 सेमी त्रिज्या और 10 सेमी ऊँचाई वाले बेलन का वक्र पृष्ठीय क्षेत्रफल कितना है? (π = 22/7)",
  ["220 cm²", "308 cm²", "440 cm²", "880 cm²"], ["220 सेमी²", "308 सेमी²", "440 सेमी²", "880 सेमी²"], "C", "CSA = 2πrh = 2 × 22/7 × 7 × 10 = 440 cm².", "वक्र पृष्ठीय क्षेत्रफल = 2πrh = 2 × 22/7 × 7 × 10 = 440 सेमी²।",
  () => 2 * (22 / 7) * 7 * 10 === 440);

add("Maths", "Trigonometry", "easy", "What is the value of sin 30° + cos 60°?", "sin 30° + cos 60° का मान क्या है?",
  ["0", "1/2", "1", "√3/2"], null, "C", "sin 30° = 1/2 and cos 60° = 1/2, so the sum is 1.", "sin 30° = 1/2 और cos 60° = 1/2, इसलिए योग 1 है।",
  () => Math.abs(Math.sin(Math.PI / 6) + Math.cos(Math.PI / 3) - 1) < 1e-9);

add("Maths", "Percentage", "medium", "The population of a town is 20,000. It increases by 10% in one year and then decreases by 10% in the next year. What is the population after two years?", "एक शहर की जनसंख्या 20,000 है। वह एक वर्ष में 10% बढ़ती है और अगले वर्ष 10% घटती है। दो वर्ष बाद जनसंख्या कितनी होगी?",
  ["19,600", "19,800", "20,000", "20,200"], ["19,600", "19,800", "20,000", "20,200"], "B",
  "After the increase: 20000 × 1.1 = 22,000. After the decrease: 22000 × 0.9 = 19,800.", "वृद्धि के बाद: 20000 × 1.1 = 22,000। कमी के बाद: 22000 × 0.9 = 19,800।",
  () => Math.round(20000 * 1.1 * 0.9) === 19800);

add("Maths", "HCF & LCM", "hard", "What is the greatest number that divides 61 and 99, leaving remainders 5 and 3 respectively?", "वह महत्तम संख्या क्या है जिससे 61 और 99 को भाग देने पर क्रमशः 5 और 3 शेष बचें?",
  ["4", "6", "8", "12"], null, "C", "The number must divide 61 − 5 = 56 and 99 − 3 = 96. HCF(56, 96) = 8, and 8 is larger than both remainders.", "संख्या को 61 − 5 = 56 और 99 − 3 = 96 दोनों को विभाजित करना होगा। HCF(56, 96) = 8, और 8 दोनों शेषफलों से बड़ा है।",
  () => gcd(56, 96) === 8 && 61 % 8 === 5 && 99 % 8 === 3);

add("Maths", "Algebra", "medium", "If a + b = 10 and ab = 21, what is the value of a² + b²?", "यदि a + b = 10 और ab = 21 है, तो a² + b² का मान क्या है?",
  ["52", "58", "64", "79"], null, "B", "a² + b² = (a + b)² − 2ab = 100 − 42 = 58.", "a² + b² = (a + b)² − 2ab = 100 − 42 = 58।",
  () => 100 - 42 === 58);

add("Maths", "Ratio & Proportion", "medium", "A : B = 2 : 3 and B : C = 4 : 5. If a sum of ₹175 is divided among A, B and C in the ratio A : B : C, how much does C get?", "A : B = 2 : 3 और B : C = 4 : 5 है। यदि ₹175 को A, B और C में A : B : C के अनुपात में बाँटा जाए, तो C को कितना मिलेगा?",
  ["₹60", "₹70", "₹75", "₹80"], ["₹60", "₹70", "₹75", "₹80"], "C",
  "Make B equal: A : B = 8 : 12 and B : C = 12 : 15, so A : B : C = 8 : 12 : 15. Total parts = 35, so C = 175 × 15 / 35 = ₹75.",
  "B को समान बनाने पर A : B = 8 : 12 और B : C = 12 : 15, इसलिए A : B : C = 8 : 12 : 15। कुल भाग = 35, अतः C = 175 × 15 / 35 = ₹75।",
  () => 175 * 15 / 35 === 75 && 2 * 4 === 8 && 3 * 4 === 12 && 3 * 4 === 12 && 5 * 3 === 15);

add("Maths", "Simple Interest", "medium", "A sum of money amounts to ₹1,100 in 2 years and ₹1,200 in 4 years at simple interest. What is the rate of interest per annum?", "साधारण ब्याज पर कोई धन 2 वर्ष में ₹1,100 और 4 वर्ष में ₹1,200 हो जाता है। वार्षिक ब्याज दर क्या है?",
  ["4%", "5%", "6%", "8%"], null, "B",
  "Interest for 2 years = 1200 − 1100 = ₹100, so ₹50 a year. Principal = 1100 − 100 = ₹1,000. Rate = 50 / 1000 × 100 = 5%.",
  "2 वर्ष का ब्याज = 1200 − 1100 = ₹100, यानी ₹50 प्रति वर्ष। मूलधन = 1100 − 100 = ₹1,000। दर = 50 / 1000 × 100 = 5%।",
  () => (1200 - 1100) / 2 / (1100 - (1200 - 1100)) * 100 === 5);

add("Maths", "Pipes & Cisterns", "hard", "A pipe can fill a tank in 6 hours, but a leak at the bottom can empty it in 12 hours. If both are working, in how many hours will the tank be filled?", "एक नल किसी टंकी को 6 घंटे में भर सकता है, पर तली में एक रिसाव उसे 12 घंटे में खाली कर सकता है। दोनों के चालू रहने पर टंकी कितने घंटे में भरेगी?",
  ["8 hours", "10 hours", "12 hours", "18 hours"], ["8 घंटे", "10 घंटे", "12 घंटे", "18 घंटे"], "C",
  "Net filling in one hour = 1/6 − 1/12 = 1/12 of the tank, so it takes 12 hours.", "एक घंटे में शुद्ध भराव = 1/6 − 1/12 = 1/12 टंकी, इसलिए 12 घंटे लगेंगे।",
  () => Math.abs(1 / (1 / 6 - 1 / 12) - 12) < 1e-9);

add("Maths", "Geometry", "easy", "What is each interior angle of a regular hexagon?", "एक सम षट्भुज का प्रत्येक आंतरिक कोण कितना होता है?",
  ["108°", "120°", "135°", "150°"], null, "B", "Each interior angle of a regular n-gon = (n − 2) × 180° / n = 4 × 180° / 6 = 120°.", "सम n-भुज का प्रत्येक आंतरिक कोण = (n − 2) × 180° / n = 4 × 180° / 6 = 120°।",
  () => (6 - 2) * 180 / 6 === 120);

add("Maths", "Geometry", "easy", "The angles of a triangle are in the ratio 2 : 3 : 4. What is the largest angle?", "एक त्रिभुज के कोणों का अनुपात 2 : 3 : 4 है। सबसे बड़ा कोण कितना है?",
  ["60°", "70°", "80°", "90°"], null, "C", "Total parts = 9, so one part = 180° / 9 = 20°. The largest angle = 4 × 20° = 80°.", "कुल भाग = 9, इसलिए एक भाग = 180° / 9 = 20°। सबसे बड़ा कोण = 4 × 20° = 80°।",
  () => 180 / 9 * 4 === 80);

add("Maths", "Number System", "hard", "What is the remainder when 2¹⁰ is divided by 7?", "2¹⁰ को 7 से भाग देने पर शेषफल क्या बचता है?",
  ["1", "2", "4", "6"], null, "B", "2³ = 8 leaves remainder 1 when divided by 7. So 2¹⁰ = (2³)³ × 2 leaves remainder 1 × 2 = 2. (Check: 1024 = 7 × 146 + 2.)", "2³ = 8 को 7 से भाग देने पर शेष 1 बचता है। इसलिए 2¹⁰ = (2³)³ × 2 का शेष 1 × 2 = 2 है। (जाँच: 1024 = 7 × 146 + 2।)",
  () => 1024 % 7 === 2);

add("Maths", "Ages", "medium", "The present age of A is twice that of B. Five years ago A was three times as old as B. What is A's present age?", "A की वर्तमान आयु B की आयु की दोगुनी है। पाँच वर्ष पहले A की आयु B की आयु की तीन गुनी थी। A की वर्तमान आयु क्या है?",
  ["16 years", "20 years", "24 years", "30 years"], ["16 वर्ष", "20 वर्ष", "24 वर्ष", "30 वर्ष"], "B",
  "Let B be x years, so A is 2x. Then 2x − 5 = 3(x − 5), giving x = 10. A = 20 years.", "माना B की आयु x वर्ष है, तो A की 2x। तब 2x − 5 = 3(x − 5), जिससे x = 10। A = 20 वर्ष।",
  () => 2 * 10 - 5 === 3 * (10 - 5));

add("Maths", "Discount", "medium", "A shopkeeper marks an article at ₹1,500 and allows a discount of 20%. If he still makes a profit of 20%, what is the cost price?", "एक दुकानदार किसी वस्तु का अंकित मूल्य ₹1,500 रखता है और 20% छूट देता है। फिर भी उसे 20% लाभ होता है। क्रय मूल्य क्या है?",
  ["₹900", "₹1,000", "₹1,050", "₹1,200"], ["₹900", "₹1,000", "₹1,050", "₹1,200"], "B",
  "SP = 1500 × 0.8 = ₹1,200. With a 20% profit, CP = 1200 / 1.2 = ₹1,000.", "विक्रय मूल्य = 1500 × 0.8 = ₹1,200। 20% लाभ पर क्रय मूल्य = 1200 / 1.2 = ₹1,000।",
  () => Math.round(1500 * 0.8 / 1.2) === 1000);

add("Maths", "Square Roots", "easy", "What is the value of √0.0625?", "√0.0625 का मान क्या है?",
  ["0.025", "0.25", "0.5", "2.5"], null, "B", "0.25 × 0.25 = 0.0625, so √0.0625 = 0.25.", "0.25 × 0.25 = 0.0625, इसलिए √0.0625 = 0.25।",
  () => Math.abs(Math.sqrt(0.0625) - 0.25) < 1e-9);

add("Maths", "Boats & Streams", "medium", "The speed of a boat in still water is 12 km/h and the speed of the stream is 3 km/h. How long will it take to go 45 km downstream?", "स्थिर जल में नाव की चाल 12 किमी/घंटा और धारा की चाल 3 किमी/घंटा है। 45 किमी धारा के अनुकूल जाने में कितना समय लगेगा?",
  ["2 hours", "3 hours", "4 hours", "5 hours"], ["2 घंटे", "3 घंटे", "4 घंटे", "5 घंटे"], "B",
  "Downstream speed = 12 + 3 = 15 km/h. Time = 45 / 15 = 3 hours.", "धारा के अनुकूल चाल = 12 + 3 = 15 किमी/घंटा। समय = 45 / 15 = 3 घंटे।",
  () => 45 / (12 + 3) === 3);

add("Maths", "Percentage", "medium", "If x is 25% more than y, then y is what percent less than x?", "यदि x, y से 25% अधिक है, तो y, x से कितने प्रतिशत कम है?",
  ["15%", "20%", "25%", "30%"], null, "B", "Let y = 100, so x = 125. y is less than x by 25, which is 25/125 × 100 = 20%.", "माना y = 100, तो x = 125। y, x से 25 कम है, यानी 25/125 × 100 = 20%।",
  () => (125 - 100) / 125 * 100 === 20);

add("Maths", "Mensuration", "medium", "The diagonal of a square is 20 cm. What is its area?", "एक वर्ग का विकर्ण 20 सेमी है। उसका क्षेत्रफल कितना है?",
  ["100 cm²", "200 cm²", "300 cm²", "400 cm²"], ["100 सेमी²", "200 सेमी²", "300 सेमी²", "400 सेमी²"], "B", "Area of a square = d² / 2 = 400 / 2 = 200 cm².", "वर्ग का क्षेत्रफल = d² / 2 = 400 / 2 = 200 सेमी²।",
  () => 20 * 20 / 2 === 200);

add("Maths", "Probability", "easy", "A fair die is rolled once. What is the probability of getting a prime number?", "एक संतुलित पासे को एक बार फेंका जाता है। अभाज्य संख्या आने की प्रायिकता क्या है?",
  ["1/3", "1/2", "2/3", "5/6"], null, "B", "The prime numbers on a die are 2, 3 and 5, so the probability = 3/6 = 1/2.", "पासे पर अभाज्य संख्याएँ 2, 3 और 5 हैं, इसलिए प्रायिकता = 3/6 = 1/2।",
  () => [1, 2, 3, 4, 5, 6].filter((n) => [2, 3, 5].includes(n)).length / 6 === 0.5);

// ============================================================ REASONING (25)
add("Reasoning", "Number Series", "medium", "Find the missing number: 7, 10, 16, 28, 52, ?", "लुप्त संख्या ज्ञात कीजिए: 7, 10, 16, 28, 52, ?",
  ["76", "88", "100", "104"], null, "C", "The differences are 3, 6, 12, 24, so the next difference is 48 and the term is 52 + 48 = 100.", "अंतर 3, 6, 12, 24 हैं, इसलिए अगला अंतर 48 और पद 52 + 48 = 100 है।",
  () => 7 + 3 === 10 && 10 + 6 === 16 && 16 + 12 === 28 && 28 + 24 === 52 && 52 + 48 === 100);
add("Reasoning", "Number Series", "easy", "Find the missing number: 2, 5, 10, 17, 26, ?", "लुप्त संख्या ज्ञात कीजिए: 2, 5, 10, 17, 26, ?",
  ["35", "36", "37", "38"], null, "C", "The terms are 1²+1, 2²+1, 3²+1, 4²+1, 5²+1; the next is 6²+1 = 37.", "पद 1²+1, 2²+1, 3²+1, 4²+1, 5²+1 हैं; अगला 6²+1 = 37 है।",
  () => [2, 5, 10, 17, 26].every((v, i) => v === (i + 1) ** 2 + 1) && 6 ** 2 + 1 === 37);
add("Reasoning", "Number Series", "medium", "Find the missing number: 1, 2, 6, 24, 120, ?", "लुप्त संख्या ज्ञात कीजिए: 1, 2, 6, 24, 120, ?",
  ["240", "480", "600", "720"], null, "D", "Each term is the previous one multiplied by 2, 3, 4, 5, and then 6: 120 × 6 = 720.", "प्रत्येक पद पिछले पद को क्रमशः 2, 3, 4, 5 और फिर 6 से गुणा करने पर मिलता है: 120 × 6 = 720।",
  () => 1 * 2 === 2 && 2 * 3 === 6 && 6 * 4 === 24 && 24 * 5 === 120 && 120 * 6 === 720);
add("Reasoning", "Number Series", "medium", "Find the missing number: 6, 11, 21, 36, 56, ?", "लुप्त संख्या ज्ञात कीजिए: 6, 11, 21, 36, 56, ?",
  ["76", "79", "81", "86"], null, "C", "The differences are 5, 10, 15, 20, so the next difference is 25 and the term is 56 + 25 = 81.", "अंतर 5, 10, 15, 20 हैं, इसलिए अगला अंतर 25 और पद 56 + 25 = 81 है।",
  () => 6 + 5 === 11 && 11 + 10 === 21 && 21 + 15 === 36 && 36 + 20 === 56 && 56 + 25 === 81);
add("Reasoning", "Letter Series", "hard", "Find the next letter in the series: Z, X, U, Q, ?", "श्रृंखला का अगला अक्षर ज्ञात कीजिए: Z, X, U, Q, ?",
  ["K", "L", "M", "N"], null, "B", "The positions are 26, 24, 21, 17 and the steps backward are 2, 3, 4, so the next step is 5: 17 − 5 = 12, which is L.", "अक्षरों के स्थान 26, 24, 21, 17 हैं और पीछे के कदम 2, 3, 4 हैं, इसलिए अगला कदम 5 होगा: 17 − 5 = 12, यानी L।",
  () => String.fromCharCode(64 + 12) === "L" && 26 - 2 === 24 && 24 - 3 === 21 && 21 - 4 === 17);
add("Reasoning", "Coding-Decoding", "medium", "In a code, CAT = 24 and DOG = 26 (the sum of the positions of the letters in the alphabet). What is the code for BAT?", "एक कूट में CAT = 24 और DOG = 26 है (अक्षरों के वर्णमाला-स्थानों का योग)। BAT का कूट क्या होगा?",
  ["21", "22", "23", "25"], null, "C", "B = 2, A = 1, T = 20, and 2 + 1 + 20 = 23. (Check: C + A + T = 3 + 1 + 20 = 24.)", "B = 2, A = 1, T = 20 और 2 + 1 + 20 = 23। (जाँच: C + A + T = 3 + 1 + 20 = 24।)",
  () => { const s = (w) => [...w].reduce((a, c) => a + c.charCodeAt(0) - 64, 0); return s("CAT") === 24 && s("DOG") === 26 && s("BAT") === 23; });
add("Reasoning", "Coding-Decoding", "hard", "In a code, ROSE is written as 6821, CHAIR as 73596 and PREACH as 416573. How is SEARCH written in that code?", "एक कूट में ROSE को 6821, CHAIR को 73596 और PREACH को 416573 लिखा जाता है। उसी कूट में SEARCH को कैसे लिखा जाएगा?",
  ["215673", "215637", "251673", "215763"], null, "A", "From the codes: S = 2, E = 1, A = 5, R = 6, C = 7, H = 3. So SEARCH = 2 1 5 6 7 3 = 215673.", "कूटों से: S = 2, E = 1, A = 5, R = 6, C = 7, H = 3। इसलिए SEARCH = 2 1 5 6 7 3 = 215673।",
  () => { const m = { S: 2, E: 1, A: 5, R: 6, C: 7, H: 3 }; return [..."SEARCH"].map((c) => m[c]).join("") === "215673"; });
add("Reasoning", "Analogy", "easy", "Pen : Write :: Knife : ?", "कलम : लिखना :: चाकू : ?",
  ["Cut", "Sharp", "Kitchen", "Steel"], ["काटना", "तेज़", "रसोई", "इस्पात"], "A", "A pen is used to write; in the same way a knife is used to cut.", "कलम से लिखा जाता है; उसी प्रकार चाकू से काटा जाता है।");
add("Reasoning", "Analogy", "medium", "ACE : GIK :: BDF : ?", "ACE : GIK :: BDF : ?",
  ["HJL", "HIL", "GJL", "HJK"], null, "A", "Each letter moves 6 places forward: A→G, C→I, E→K. So B→H, D→J, F→L, giving HJL.", "प्रत्येक अक्षर 6 स्थान आगे है: A→G, C→I, E→K। इसलिए B→H, D→J, F→L, यानी HJL।",
  () => [..."ACE"].map((c) => String.fromCharCode(c.charCodeAt(0) + 6)).join("") === "GIK" && [..."BDF"].map((c) => String.fromCharCode(c.charCodeAt(0) + 6)).join("") === "HJL");
add("Reasoning", "Classification", "easy", "Select the odd one out.", "विषम का चयन कीजिए।",
  ["Square", "Rectangle", "Triangle", "Rhombus"], ["वर्ग", "आयत", "त्रिभुज", "समचतुर्भुज"], "C", "Square, rectangle and rhombus have four sides; a triangle has three.", "वर्ग, आयत और समचतुर्भुज की चार भुजाएँ होती हैं; त्रिभुज की तीन।");
add("Reasoning", "Classification", "medium", "Select the odd number: 14, 21, 35, 42, 50", "विषम संख्या चुनिए: 14, 21, 35, 42, 50",
  ["21", "35", "42", "50"], null, "D", "14, 21, 35 and 42 are multiples of 7; 50 is not.", "14, 21, 35 और 42, 7 के गुणज हैं; 50 नहीं है।",
  () => [14, 21, 35, 42].every((n) => n % 7 === 0) && 50 % 7 !== 0);
add("Reasoning", "Direction Sense", "medium", "A man starts from point P, walks 10 m north, turns right and walks 15 m, then turns right and walks 10 m. How far is he from P?", "एक आदमी बिंदु P से 10 मी उत्तर की ओर चलता है, दाएँ मुड़कर 15 मी चलता है, फिर दाएँ मुड़कर 10 मी चलता है। वह P से कितनी दूर है?",
  ["10 m", "15 m", "20 m", "25 m"], ["10 मी", "15 मी", "20 मी", "25 मी"], "B", "He goes 10 m north, 15 m east and 10 m south, so he is back on the starting line, 15 m east of P.", "वह 10 मी उत्तर, 15 मी पूर्व और 10 मी दक्षिण चलता है, इसलिए वह प्रारंभिक रेखा पर लौट आता है और P से 15 मी पूर्व में है।",
  () => 10 - 10 === 0 && 15 === 15);
add("Reasoning", "Direction Sense", "medium", "Facing south, Rohan turns left and walks 5 m, then turns left again and walks 5 m. In which direction is he now from his starting point?", "दक्षिण की ओर मुँह करके खड़ा रोहन बाएँ मुड़कर 5 मी चलता है, फिर दोबारा बाएँ मुड़कर 5 मी चलता है। वह अब अपने प्रारंभिक बिंदु से किस दिशा में है?",
  ["North-West", "South-East", "North-East", "South-West"], ["उत्तर-पश्चिम", "दक्षिण-पूर्व", "उत्तर-पूर्व", "दक्षिण-पश्चिम"], "C",
  "Facing south, a left turn points east, so he walks 5 m east. Turning left again he faces north and walks 5 m north. He is now north-east of the start.",
  "दक्षिण की ओर मुँह हो तो बायाँ हाथ पूर्व की ओर होता है, इसलिए वह 5 मी पूर्व जाता है। फिर बाएँ मुड़कर उत्तर की ओर 5 मी चलता है। अब वह प्रारंभिक बिंदु से उत्तर-पूर्व में है।");
add("Reasoning", "Blood Relations", "medium", "X is the father of Y. Y is the brother of Z. Z is the daughter of W. How is X related to W?", "X, Y का पिता है। Y, Z का भाई है। Z, W की पुत्री है। X का W से क्या संबंध है?",
  ["Husband", "Brother", "Father", "Son"], ["पति", "भाई", "पिता", "पुत्र"], "A", "Y and Z are siblings, so X is also Z's father. W is Z's other parent, hence her mother, so X is W's husband.", "Y और Z भाई-बहन हैं, इसलिए X, Z का भी पिता है। W, Z की दूसरी अभिभावक यानी माँ है, इसलिए X, W का पति है।");
add("Reasoning", "Blood Relations", "medium", "Introducing a man, a woman said, \"His mother is the only daughter of my mother.\" How is the woman related to the man?", "एक पुरुष का परिचय कराते हुए एक महिला ने कहा, \"उसकी माँ मेरी माँ की इकलौती पुत्री है।\" वह महिला उस पुरुष की क्या लगती है?",
  ["Aunt", "Sister", "Mother", "Grandmother"], ["मौसी", "बहन", "माँ", "दादी"], "C", "The only daughter of the woman's mother is the woman herself. So the man's mother is the woman, and she is his mother.", "महिला की माँ की इकलौती पुत्री स्वयं वह महिला है। इसलिए पुरुष की माँ वही महिला है।");
add("Reasoning", "Ranking", "hard", "In a row of boys, A is 9th from the left and B is 15th from the right. When they interchange places, A becomes 18th from the left. How many boys are there in the row?", "लड़कों की एक पंक्ति में A बाएँ से 9वाँ और B दाएँ से 15वाँ है। स्थान बदलने पर A बाएँ से 18वाँ हो जाता है। पंक्ति में कितने लड़के हैं?",
  ["30", "31", "32", "33"], null, "C", "After the swap A is at B's old place, which is 18th from the left and 15th from the right. Total = 18 + 15 − 1 = 32.", "अदला-बदली के बाद A, B की पुरानी जगह पर है, जो बाएँ से 18वीं और दाएँ से 15वीं है। कुल = 18 + 15 − 1 = 32।",
  () => 18 + 15 - 1 === 32);
add("Reasoning", "Clock", "medium", "What is the angle between the hour hand and the minute hand of a clock at 4:30?", "4:30 बजे घड़ी की घंटे और मिनट की सुइयों के बीच कितना कोण होता है?",
  ["30°", "45°", "60°", "75°"], null, "B", "At 4:30 the hour hand is at 4.5 × 30° = 135° and the minute hand at 6 × 30° = 180°. The angle = 45°.", "4:30 बजे घंटे की सुई 4.5 × 30° = 135° पर और मिनट की सुई 6 × 30° = 180° पर होती है। कोण = 45°।",
  () => 180 - 4.5 * 30 === 45);
add("Reasoning", "Calendar", "hard", "1 January 2025 was a Wednesday. On which day did 15 August 2025 fall?", "1 जनवरी 2025 को बुधवार था। 15 अगस्त 2025 को कौन-सा दिन था?",
  ["Wednesday", "Thursday", "Friday", "Saturday"], ["बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"], "C",
  "Days from 1 Jan to 15 Aug = 31 + 28 + 31 + 30 + 31 + 30 + 31 + 14 = 226. 226 = 32 weeks + 2 days, so the day is Wednesday + 2 = Friday.",
  "1 जनवरी से 15 अगस्त तक दिन = 31 + 28 + 31 + 30 + 31 + 30 + 31 + 14 = 226। 226 = 32 सप्ताह + 2 दिन, इसलिए दिन बुधवार + 2 = शुक्रवार।",
  () => new Date(Date.UTC(2025, 7, 15)).getUTCDay() === 5 && new Date(Date.UTC(2025, 0, 1)).getUTCDay() === 3);
add("Reasoning", "Syllogism", "medium", "Statements: All roses are flowers. Some flowers are red.\nConclusions: I. Some roses are red. II. Some red things are flowers.",
  "कथन: सभी गुलाब फूल हैं। कुछ फूल लाल हैं।\nनिष्कर्ष: I. कुछ गुलाब लाल हैं। II. कुछ लाल वस्तुएँ फूल हैं।",
  ["Only conclusion I follows", "Only conclusion II follows", "Both I and II follow", "Neither I nor II follows"],
  ["केवल निष्कर्ष I अनुसरण करता है", "केवल निष्कर्ष II अनुसरण करता है", "I और II दोनों अनुसरण करते हैं", "न तो I और न ही II अनुसरण करता है"], "B",
  "'Some flowers are red' converts to 'some red things are flowers', so II follows. The red flowers may not be roses, so I does not follow.",
  "'कुछ फूल लाल हैं' से 'कुछ लाल वस्तुएँ फूल हैं' बनता है, इसलिए II सही है। लाल फूल गुलाब न भी हों, इसलिए I सही नहीं है।");
add("Reasoning", "Syllogism", "hard", "Statements: No pen is a book. All books are papers.\nConclusions: I. No pen is a paper. II. Some papers are books.",
  "कथन: कोई पेन किताब नहीं है। सभी किताबें कागज़ हैं।\nनिष्कर्ष: I. कोई पेन कागज़ नहीं है। II. कुछ कागज़ किताबें हैं।",
  ["Only conclusion I follows", "Only conclusion II follows", "Both I and II follow", "Neither I nor II follows"],
  ["केवल निष्कर्ष I अनुसरण करता है", "केवल निष्कर्ष II अनुसरण करता है", "I और II दोनों अनुसरण करते हैं", "न तो I और न ही II अनुसरण करता है"], "B",
  "'All books are papers' gives 'some papers are books', so II follows. Pens and papers may still overlap (a pen is not a book, but could be a paper), so I does not follow.",
  "'सभी किताबें कागज़ हैं' से 'कुछ कागज़ किताबें हैं' बनता है, इसलिए II सही है। पेन और कागज़ का मेल हो सकता है (पेन किताब नहीं है पर कागज़ हो सकता है), इसलिए I सही नहीं है।");
add("Reasoning", "Seating Arrangement", "medium", "Five friends A, B, C, D and E sit in a row facing north. B sits immediately to the right of A. C sits at the extreme left end. D sits between B and E. Who sits in the middle?", "पाँच मित्र A, B, C, D और E उत्तर की ओर मुँह करके एक पंक्ति में बैठे हैं। B, A के ठीक दाईं ओर बैठा है। C बाएँ छोर पर बैठा है। D, B और E के बीच में बैठा है। बीच में कौन बैठा है?",
  ["A", "B", "D", "E"], null, "B", "C is at the left end and A, B sit together with B on A's right, then D, then E. The order from the left is C, A, B, D, E, so B is in the middle.", "C बाएँ छोर पर है, फिर A और उसके दाएँ B, फिर D, फिर E। बाएँ से क्रम C, A, B, D, E है, इसलिए बीच में B है।");
add("Reasoning", "Inequality", "medium", "Statements: P > Q ≥ R, R > S.\nConclusions: I. P > S  II. Q > S",
  "कथन: P > Q ≥ R, R > S।\nनिष्कर्ष: I. P > S  II. Q > S",
  ["Only conclusion I follows", "Only conclusion II follows", "Both I and II follow", "Neither I nor II follows"],
  ["केवल निष्कर्ष I अनुसरण करता है", "केवल निष्कर्ष II अनुसरण करता है", "I और II दोनों अनुसरण करते हैं", "न तो I और न ही II अनुसरण करता है"], "C",
  "P > Q ≥ R > S gives P > S (I) and Q > S (II), so both follow.", "P > Q ≥ R > S से P > S (I) और Q > S (II) दोनों मिलते हैं, इसलिए दोनों सही हैं।");
add("Reasoning", "Logical Order", "medium", "Arrange in a meaningful order: 1. Seed 2. Plant 3. Fruit 4. Flower 5. Sapling", "अर्थपूर्ण क्रम में लगाइए: 1. बीज 2. पौधा 3. फल 4. फूल 5. अंकुर",
  ["1, 5, 2, 4, 3", "1, 2, 5, 4, 3", "5, 1, 2, 4, 3", "1, 5, 2, 3, 4"], null, "A", "The natural order is Seed (1), Sapling (5), Plant (2), Flower (4), Fruit (3).", "प्राकृतिक क्रम है: बीज (1), अंकुर (5), पौधा (2), फूल (4), फल (3)।");
add("Reasoning", "Number Pattern", "medium", "If 4 → 16 → 64 and 5 → 25 → 125 follow the same pattern (n → n² → n³), what is the third number for 6?", "यदि 4 → 16 → 64 और 5 → 25 → 125 एक ही प्रतिरूप (n → n² → n³) पर हैं, तो 6 के लिए तीसरी संख्या क्या होगी?",
  ["36", "108", "216", "256"], null, "C", "The third number is the cube of the first: 6³ = 216.", "तीसरी संख्या पहली संख्या का घन है: 6³ = 216।",
  () => 4 ** 3 === 64 && 5 ** 3 === 125 && 6 ** 3 === 216);
add("Reasoning", "Calendar", "easy", "If the day before yesterday was Thursday, what day will it be tomorrow?", "यदि परसों (बीता हुआ) गुरुवार था, तो कल (आने वाला) कौन-सा दिन होगा?",
  ["Saturday", "Sunday", "Monday", "Friday"], ["शनिवार", "रविवार", "सोमवार", "शुक्रवार"], "B", "The day before yesterday was Thursday, so yesterday was Friday, today is Saturday and tomorrow is Sunday.", "बीता परसों गुरुवार था, इसलिए बीता कल शुक्रवार, आज शनिवार और आने वाला कल रविवार होगा।",
  () => (4 + 3) % 7 === 0);

// ================================================================ ENGLISH (25)
const E = (...a) => H("English", ...a);
E("Synonyms", "easy", "Select the synonym of 'BENEVOLENT'.", ["Kind", "Cruel", "Selfish", "Careless"], "A", "'Benevolent' means kind and generous. Cruel and selfish are its opposites.");
E("Synonyms", "medium", "Select the synonym of 'CANDID'.", ["Secretive", "Frank", "Proud", "Shy"], "B", "'Candid' means open and honest, that is, frank.");
E("Synonyms", "easy", "Select the synonym of 'DILIGENT'.", ["Lazy", "Hardworking", "Clever", "Careless"], "B", "'Diligent' means showing steady, careful effort, that is, hardworking.");
E("Antonyms", "easy", "Select the antonym of 'SCARCE'.", ["Rare", "Limited", "Abundant", "Costly"], "C", "'Scarce' means in short supply; its opposite is 'abundant'.");
E("Antonyms", "easy", "Select the antonym of 'EXPAND'.", ["Grow", "Contract", "Spread", "Widen"], "B", "'Expand' means to become larger; its opposite is 'contract'.");
E("Antonyms", "medium", "Select the antonym of 'HOSTILE'.", ["Friendly", "Angry", "Bitter", "Distant"], "A", "'Hostile' means unfriendly or opposed; its opposite is 'friendly'.");
E("Spelling", "easy", "Select the correctly spelt word.", ["Accomodation", "Acommodation", "Accommodation", "Accommodetion"], "C", "The correct spelling is 'Accommodation' (double c and double m).");
E("Spelling", "easy", "Choose the word that is spelt correctly.", ["Neccessary", "Necessary", "Necesary", "Nescessary"], "B", "The correct spelling is 'Necessary' (one c, two s).");
E("Idioms", "easy", "Select the meaning of the idiom 'a piece of cake'.", ["Something very easy", "A sweet dish", "A small gift", "A difficult task"], "A", "'A piece of cake' means something that is very easy to do.");
E("Idioms", "medium", "Select the meaning of the idiom 'to break the ice'.", ["To break something cold", "To start a conversation in an awkward situation", "To make someone angry", "To end a friendship"], "B", "'To break the ice' means to ease the tension and start a conversation in an awkward situation.");
E("Idioms", "medium", "Select the meaning of the idiom 'once in a blue moon'.", ["Very often", "Every night", "Very rarely", "Never"], "C", "'Once in a blue moon' means very rarely.");
E("One Word Substitution", "easy", "Select the one word for 'a person who loves books'.", ["Bibliophile", "Philanthropist", "Misanthrope", "Optimist"], "A", "A person who loves books is a 'bibliophile'.");
E("One Word Substitution", "medium", "Select the one word for 'government by the people'.", ["Autocracy", "Democracy", "Aristocracy", "Monarchy"], "B", "Government by the people is 'democracy'.");
E("One Word Substitution", "medium", "Select the one word for 'fear of heights'.", ["Claustrophobia", "Hydrophobia", "Acrophobia", "Xenophobia"], "C", "Fear of heights is 'acrophobia'.");
E("Error Spotting", "medium", "Find the part with an error: Each of the boys (A) / have completed (B) / his homework. (C) / No error (D)", ["A", "B", "C", "D"], "B", "'Each' takes a singular verb, so it should be 'has completed'. Part B has the error.");
E("Error Spotting", "medium", "Find the part with an error: She is senior (A) / than me (B) / in the office. (C) / No error (D)", ["A", "B", "C", "D"], "B", "'Senior' takes 'to', not 'than': 'senior to me'. Part B has the error.");
E("Fill in the Blanks", "easy", "Fill in the blank: He has been living in this city ___ 2010.", ["for", "since", "from", "in"], "B", "'Since' is used with a point in time (2010) in the present perfect continuous.");
E("Fill in the Blanks", "medium", "Fill in the blank: Neither of the two answers ___ correct.", ["are", "were", "is", "have been"], "C", "'Neither' is singular and takes the singular verb 'is'.");
E("Fill in the Blanks", "easy", "Fill in the blank: Mathematics ___ my favourite subject.", ["are", "is", "were", "have"], "B", "'Mathematics' is a singular subject, so it takes 'is'.");
E("Active & Passive", "medium", "Change into the passive voice: 'The teacher praised the student.'", ["The student praised the teacher.", "The student was praised by the teacher.", "The student is praised by the teacher.", "The teacher was praised by the student."], "B", "Simple past active becomes 'was + past participle' in the passive: 'The student was praised by the teacher.'");
E("Active & Passive", "medium", "Change into the active voice: 'The letter was written by Sita.'", ["Sita writes the letter.", "Sita has written the letter.", "Sita wrote the letter.", "Sita was writing the letter."], "C", "The passive 'was written' is simple past, so the active is 'Sita wrote the letter.'");
E("Direct & Indirect Speech", "medium", "Change into indirect speech: He said, \"I am busy.\"", ["He said that he is busy.", "He said that he was busy.", "He said that I was busy.", "He said that he had been busy."], "B", "In reported speech the present tense 'am' becomes 'was' and 'I' becomes 'he': 'He said that he was busy.'");
E("Sentence Improvement", "hard", "Select the correct sentence.", ["I am working here since 2019.", "I have been working here since 2019.", "I was working here since 2019.", "I work here since 2019."], "B", "'Since' with a point in time needs the present perfect continuous: 'have been working'.");
E("Prepositions", "easy", "Fill in the blank: She is good ___ playing chess.", ["in", "at", "on", "for"], "B", "The correct phrase is 'good at' (a skill).");
E("Articles", "easy", "Fill in the blank: He is ___ honest man.", ["a", "an", "the", "no article"], "B", "'Honest' begins with a vowel sound (the 'h' is silent), so the article is 'an'.");

// ================================================================== GK (25)
add("GK", "Indian Polity", "easy", "Who is the highest law officer of India?", "भारत का सर्वोच्च विधि अधिकारी कौन है?",
  ["Solicitor General", "Attorney General", "Advocate General", "Chief Justice"], ["सॉलिसिटर जनरल", "महान्यायवादी (अटॉर्नी जनरल)", "महाधिवक्ता", "मुख्य न्यायाधीश"], "B", "The Attorney General of India is the highest law officer of the country (Article 76).", "भारत का महान्यायवादी देश का सर्वोच्च विधि अधिकारी है (अनुच्छेद 76)।");
add("GK", "Indian Polity", "medium", "Which Article of the Constitution gives the Right to Constitutional Remedies?", "संविधान का कौन-सा अनुच्छेद संवैधानिक उपचारों का अधिकार देता है?",
  ["Article 19", "Article 21", "Article 32", "Article 44"], ["अनुच्छेद 19", "अनुच्छेद 21", "अनुच्छेद 32", "अनुच्छेद 44"], "C", "Article 32 gives the right to move the Supreme Court for enforcing Fundamental Rights; Dr. Ambedkar called it the 'heart and soul' of the Constitution.", "अनुच्छेद 32 मौलिक अधिकारों के प्रवर्तन के लिए सर्वोच्च न्यायालय जाने का अधिकार देता है; डॉ. अंबेडकर ने इसे संविधान की 'आत्मा और हृदय' कहा था।");
add("GK", "Indian History", "medium", "In which year did Mahatma Gandhi lead the Dandi March (Salt Satyagraha)?", "महात्मा गांधी ने डांडी मार्च (नमक सत्याग्रह) का नेतृत्व किस वर्ष किया?",
  ["1920", "1927", "1930", "1942"], null, "C", "The Dandi March began on 12 March 1930 from Sabarmati Ashram and reached Dandi on 6 April 1930.", "डांडी मार्च 12 मार्च 1930 को साबरमती आश्रम से शुरू हुआ और 6 अप्रैल 1930 को डांडी पहुँचा।");
add("GK", "Indian History", "easy", "Who founded the Arya Samaj in 1875?", "1875 में आर्य समाज की स्थापना किसने की?",
  ["Raja Ram Mohan Roy", "Swami Dayananda Saraswati", "Swami Vivekananda", "Ishwar Chandra Vidyasagar"], ["राजा राममोहन राय", "स्वामी दयानंद सरस्वती", "स्वामी विवेकानंद", "ईश्वरचंद्र विद्यासागर"], "B", "Swami Dayananda Saraswati founded the Arya Samaj in Bombay in 1875.", "स्वामी दयानंद सरस्वती ने 1875 में बंबई में आर्य समाज की स्थापना की।");
add("GK", "Indian History", "medium", "The First Battle of Panipat (1526) was fought between Babur and:", "पानीपत का प्रथम युद्ध (1526) बाबर और किसके बीच लड़ा गया?",
  ["Rana Sanga", "Ibrahim Lodi", "Sher Shah Suri", "Hemu"], ["राणा सांगा", "इब्राहीम लोदी", "शेरशाह सूरी", "हेमू"], "B", "Babur defeated Ibrahim Lodi, the last Sultan of Delhi, at Panipat in 1526 and founded the Mughal Empire.", "बाबर ने 1526 में पानीपत में दिल्ली के अंतिम सुल्तान इब्राहीम लोदी को हराकर मुग़ल साम्राज्य की नींव रखी।");
add("GK", "Indian Geography", "easy", "Which is the longest river flowing within India?", "भारत के भीतर बहने वाली सबसे लंबी नदी कौन-सी है?",
  ["Yamuna", "Brahmaputra", "Ganga", "Godavari"], ["यमुना", "ब्रह्मपुत्र", "गंगा", "गोदावरी"], "C", "The Ganga (about 2,525 km) is the longest river of India. The Brahmaputra and the Indus rise outside India.", "गंगा (लगभग 2,525 किमी) भारत की सबसे लंबी नदी है। ब्रह्मपुत्र और सिंधु भारत के बाहर से निकलती हैं।");
add("GK", "Indian Geography", "medium", "Which soil is considered best for growing cotton?", "कपास की खेती के लिए कौन-सी मिट्टी सर्वोत्तम मानी जाती है?",
  ["Alluvial soil", "Red soil", "Black soil", "Laterite soil"], ["जलोढ़ मिट्टी", "लाल मिट्टी", "काली मिट्टी", "लैटेराइट मिट्टी"], "C", "Black (regur) soil holds moisture well and is ideal for cotton, so it is also called 'black cotton soil'.", "काली (रेगुर) मिट्टी नमी को अच्छी तरह रोकती है और कपास के लिए आदर्श है, इसलिए इसे 'काली कपास मिट्टी' भी कहते हैं।");
add("GK", "Science", "easy", "Which is the largest planet of the solar system?", "सौरमंडल का सबसे बड़ा ग्रह कौन-सा है?",
  ["Saturn", "Jupiter", "Neptune", "Earth"], ["शनि", "बृहस्पति", "वरुण", "पृथ्वी"], "B", "Jupiter is the largest planet of the solar system.", "बृहस्पति सौरमंडल का सबसे बड़ा ग्रह है।");
add("GK", "Science", "easy", "Which acid is present in lemon?", "नींबू में कौन-सा अम्ल पाया जाता है?",
  ["Acetic acid", "Citric acid", "Lactic acid", "Tartaric acid"], ["एसीटिक अम्ल", "साइट्रिक अम्ल", "लैक्टिक अम्ल", "टार्टरिक अम्ल"], "B", "Lemon and other citrus fruits contain citric acid.", "नींबू और अन्य खट्टे फलों में साइट्रिक अम्ल होता है।");
add("GK", "Science", "easy", "Photosynthesis takes place in which part of the plant cell?", "पादप कोशिका के किस भाग में प्रकाश-संश्लेषण होता है?",
  ["Mitochondria", "Nucleus", "Chloroplast", "Ribosome"], ["माइटोकॉन्ड्रिया", "केंद्रक", "हरित लवक (क्लोरोप्लास्ट)", "राइबोसोम"], "C", "Photosynthesis takes place in the chloroplasts, which contain the green pigment chlorophyll.", "प्रकाश-संश्लेषण हरित लवकों में होता है, जिनमें हरा वर्णक क्लोरोफिल होता है।");
add("GK", "Science", "medium", "The study of fungi is called:", "कवकों के अध्ययन को क्या कहते हैं?",
  ["Mycology", "Virology", "Ornithology", "Pathology"], ["कवक विज्ञान (माइकोलॉजी)", "विषाणु विज्ञान", "पक्षी विज्ञान", "रोग विज्ञान"], "A", "Mycology is the study of fungi; virology studies viruses and ornithology studies birds.", "माइकोलॉजी कवकों का अध्ययन है; विषाणु विज्ञान वायरस का और पक्षी विज्ञान पक्षियों का अध्ययन करता है।");
add("GK", "Science", "medium", "What is the approximate speed of light in a vacuum?", "निर्वात में प्रकाश की लगभग चाल कितनी है?",
  ["3 × 10⁵ m/s", "3 × 10⁸ m/s", "3 × 10¹⁰ m/s", "3 × 10⁶ m/s"], null, "B", "Light travels at about 3 × 10⁸ metres per second (3 lakh km/s) in a vacuum.", "निर्वात में प्रकाश लगभग 3 × 10⁸ मीटर प्रति सेकंड (3 लाख किमी/से) की चाल से चलता है।");
add("GK", "Science", "easy", "Who discovered penicillin?", "पेनिसिलिन की खोज किसने की?",
  ["Louis Pasteur", "Alexander Fleming", "Robert Koch", "Edward Jenner"], ["लुई पाश्चर", "अलेक्ज़ेंडर फ्लेमिंग", "रॉबर्ट कॉख", "एडवर्ड जेनर"], "B", "Alexander Fleming discovered penicillin in 1928.", "अलेक्ज़ेंडर फ्लेमिंग ने 1928 में पेनिसिलिन की खोज की।");
add("GK", "Science", "easy", "Which organ of the human body produces insulin?", "मानव शरीर का कौन-सा अंग इंसुलिन बनाता है?",
  ["Liver", "Pancreas", "Kidney", "Spleen"], ["यकृत", "अग्न्याशय", "गुर्दा", "प्लीहा"], "B", "The pancreas produces insulin, which controls blood sugar.", "अग्न्याशय इंसुलिन बनाता है, जो रक्त शर्करा को नियंत्रित करता है।");
add("GK", "Economy", "easy", "The headquarters of the Reserve Bank of India is located in:", "भारतीय रिज़र्व बैंक का मुख्यालय कहाँ स्थित है?",
  ["New Delhi", "Kolkata", "Chennai", "Mumbai"], ["नई दिल्ली", "कोलकाता", "चेन्नई", "मुंबई"], "D", "The RBI's central office is in Mumbai.", "RBI का केंद्रीय कार्यालय मुंबई में है।");
add("GK", "Economy", "medium", "Which of the following is a direct tax?", "निम्नलिखित में से कौन-सा प्रत्यक्ष कर है?",
  ["GST", "Customs duty", "Income tax", "Excise duty"], ["GST", "सीमा शुल्क", "आयकर", "उत्पाद शुल्क"], "C", "Income tax is paid directly by the person earning the income, so it is a direct tax. GST, customs and excise are indirect taxes.", "आयकर आय अर्जित करने वाला व्यक्ति सीधे देता है, इसलिए यह प्रत्यक्ष कर है। GST, सीमा शुल्क और उत्पाद शुल्क अप्रत्यक्ष कर हैं।");
add("GK", "Economy", "medium", "NITI Aayog replaced which earlier body in 2015?", "2015 में नीति आयोग ने किस पूर्ववर्ती संस्था का स्थान लिया?",
  ["Finance Commission", "Planning Commission", "Election Commission", "National Development Council"], ["वित्त आयोग", "योजना आयोग", "निर्वाचन आयोग", "राष्ट्रीय विकास परिषद"], "B", "NITI Aayog replaced the Planning Commission on 1 January 2015.", "नीति आयोग ने 1 जनवरी 2015 को योजना आयोग का स्थान लिया।");
add("GK", "Static GK", "easy", "Which is the national flower of India?", "भारत का राष्ट्रीय पुष्प कौन-सा है?",
  ["Rose", "Lotus", "Marigold", "Jasmine"], ["गुलाब", "कमल", "गेंदा", "चमेली"], "B", "The lotus is the national flower of India.", "कमल भारत का राष्ट्रीय पुष्प है।");
add("GK", "Static GK", "easy", "The Gateway of India is located in which city?", "गेटवे ऑफ इंडिया किस शहर में स्थित है?",
  ["Kolkata", "Chennai", "Mumbai", "Delhi"], ["कोलकाता", "चेन्नई", "मुंबई", "दिल्ली"], "C", "The Gateway of India is on the waterfront of Mumbai; it was built to mark the 1911 visit of King George V.", "गेटवे ऑफ इंडिया मुंबई के समुद्र तट पर है; यह 1911 में किंग जॉर्ज पंचम की यात्रा की याद में बना।");
add("GK", "Art & Culture", "medium", "Kuchipudi is the classical dance form of which state?", "कुचिपुड़ी किस राज्य का शास्त्रीय नृत्य है?",
  ["Kerala", "Tamil Nadu", "Andhra Pradesh", "Odisha"], ["केरल", "तमिलनाडु", "आंध्र प्रदेश", "ओडिशा"], "C", "Kuchipudi comes from the village of Kuchipudi in Andhra Pradesh.", "कुचिपुड़ी आंध्र प्रदेश के कुचिपुड़ी गाँव से आया है।");
add("GK", "Awards", "medium", "In which year did Mother Teresa receive the Nobel Peace Prize?", "मदर टेरेसा को नोबेल शांति पुरस्कार किस वर्ष मिला?",
  ["1969", "1975", "1979", "1985"], null, "C", "Mother Teresa was awarded the Nobel Peace Prize in 1979 for her work with the poor and the dying.", "मदर टेरेसा को गरीबों और मरणासन्न लोगों की सेवा के लिए 1979 में नोबेल शांति पुरस्कार मिला।");
add("GK", "Science", "medium", "In which layer of the atmosphere is the ozone layer found?", "वायुमंडल की किस परत में ओज़ोन परत पाई जाती है?",
  ["Troposphere", "Stratosphere", "Mesosphere", "Exosphere"], ["क्षोभमंडल", "समतापमंडल", "मध्यमंडल", "बाह्यमंडल"], "B", "The ozone layer lies in the stratosphere, about 15 to 35 km above the Earth.", "ओज़ोन परत समतापमंडल में, पृथ्वी से लगभग 15 से 35 किमी ऊपर होती है।");
add("GK", "Science", "easy", "What is the SI unit of pressure?", "दाब का SI मात्रक क्या है?",
  ["Newton", "Pascal", "Joule", "Watt"], ["न्यूटन", "पास्कल", "जूल", "वाट"], "B", "Pressure is measured in pascals (Pa); 1 Pa = 1 N/m².", "दाब को पास्कल (Pa) में मापा जाता है; 1 Pa = 1 N/m²।");
add("GK", "Static GK", "easy", "What is the currency of Japan?", "जापान की मुद्रा क्या है?",
  ["Yuan", "Won", "Yen", "Ringgit"], ["युआन", "वॉन", "येन", "रिंगिट"], "C", "The currency of Japan is the yen.", "जापान की मुद्रा येन है।");
add("GK", "Sports", "easy", "The Wimbledon Championships are associated with which sport?", "विंबलडन चैंपियनशिप किस खेल से जुड़ी है?",
  ["Golf", "Cricket", "Tennis", "Badminton"], ["गोल्फ", "क्रिकेट", "टेनिस", "बैडमिंटन"], "C", "Wimbledon, held in London, is the oldest tennis tournament and one of the four Grand Slams.", "लंदन में होने वाली विंबलडन सबसे पुरानी टेनिस प्रतियोगिता और चार ग्रैंड स्लैम में से एक है।");

done();
