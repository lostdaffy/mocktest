// Agniveer Technical - Mock #1, written by hand (no AI), 2026-10-29.
//
// Follows the official "Syllabus for Agniveer Technical" and the split of a
// real past paper: General Knowledge & Reasoning 10 (5 + 5), Maths 15,
// Physics 15, Chemistry 10 - in that order, every question bilingual.
// Every question is original; the past paper was used for level only.
//
//   node content/agt-mock1.js            runs the checks, prints a summary
//   node content/agt-mock1.js --json     also writes content/agt-mock1.json (rows for the manual-questions API)
//
// Each numerical question carries `check`: the answer recomputed from the
// numbers in the question. The file refuses to build if any check fails,
// if an answer is not among its options, or if options repeat.

const fs = require("fs");
const path = require("path");

const Q = [];
const add = (subject, topic, difficulty, question, questionHi, options, optionsHi, correct, solution, solutionHi, check) =>
  Q.push({ subject, topic, difficulty, question, questionHi, options, optionsHi, correct, solution, solutionHi, check });

// ---------------------------------------------------------------- GK (5)
add("GK", "Books, Awards & Sports", "easy",
  "Which is the highest peacetime gallantry award of India?",
  "भारत का सर्वोच्च शांतिकालीन वीरता पुरस्कार कौन-सा है?",
  ["Param Vir Chakra", "Ashoka Chakra", "Kirti Chakra", "Vir Chakra"],
  ["परमवीर चक्र", "अशोक चक्र", "कीर्ति चक्र", "वीर चक्र"],
  "B",
  "The Ashoka Chakra is India's highest peacetime gallantry award. The Param Vir Chakra is the highest wartime award.",
  "अशोक चक्र भारत का सर्वोच्च शांतिकालीन वीरता पुरस्कार है। परमवीर चक्र सर्वोच्च युद्धकालीन पुरस्कार है।");

add("GK", "Books, Awards & Sports", "easy",
  "The Indian Military Academy (IMA), which trains officers of the Indian Army, is located at:",
  "भारतीय सेना के अधिकारियों को प्रशिक्षण देने वाली भारतीय सैन्य अकादमी (IMA) कहाँ स्थित है?",
  ["Pune", "Chennai", "Dehradun", "Mhow"],
  ["पुणे", "चेन्नई", "देहरादून", "महू"],
  "C",
  "The Indian Military Academy is at Dehradun, Uttarakhand. Pune (Khadakwasla) has the National Defence Academy.",
  "भारतीय सैन्य अकादमी देहरादून (उत्तराखंड) में है। पुणे (खड़कवासला) में राष्ट्रीय रक्षा अकादमी है।");

add("GK", "Indian Geography", "medium",
  "With which neighbouring country does India share its longest land border?",
  "भारत की सबसे लंबी स्थलीय सीमा किस पड़ोसी देश के साथ है?",
  ["China", "Pakistan", "Nepal", "Bangladesh"],
  ["चीन", "पाकिस्तान", "नेपाल", "बांग्लादेश"],
  "D",
  "India's border with Bangladesh is about 4,096 km long, the longest of all its land borders; China comes second.",
  "भारत-बांग्लादेश सीमा लगभग 4,096 किमी लंबी है, जो भारत की सबसे लंबी स्थलीय सीमा है; दूसरे स्थान पर चीन है।");

add("GK", "Constitution", "easy",
  "In which Part of the Constitution of India are the Fundamental Rights given?",
  "भारत के संविधान के किस भाग में मौलिक अधिकार दिए गए हैं?",
  ["Part III", "Part II", "Part IV", "Part V"],
  ["भाग III", "भाग II", "भाग IV", "भाग V"],
  "A",
  "Fundamental Rights are in Part III (Articles 12 to 35). Part IV has the Directive Principles.",
  "मौलिक अधिकार भाग III (अनुच्छेद 12 से 35) में हैं। भाग IV में नीति निदेशक तत्व हैं।");

add("GK", "Books, Awards & Sports", "easy",
  "Where is the headquarters of the United Nations Organisation (UNO)?",
  "संयुक्त राष्ट्र संघ (UNO) का मुख्यालय कहाँ है?",
  ["Geneva", "New York", "Paris", "Vienna"],
  ["जिनेवा", "न्यूयॉर्क", "पेरिस", "वियना"],
  "B",
  "The UN headquarters is in New York, USA. Geneva and Vienna host other UN offices.",
  "संयुक्त राष्ट्र का मुख्यालय न्यूयॉर्क (अमेरिका) में है। जिनेवा और वियना में इसके अन्य कार्यालय हैं।");

// ---------------------------------------------------------- Reasoning (5)
const pairs = [[2, 8], [3, 27], [4, 64], [5, 120]];
add("Reasoning", "Classification", "easy",
  "In each number pair, the second number is obtained from the first by the same operation, except in one pair. Find the odd pair.",
  "प्रत्येक संख्या युग्म में दूसरी संख्या पहली संख्या पर एक ही संक्रिया करके प्राप्त की गई है, केवल एक युग्म को छोड़कर। विषम युग्म ज्ञात कीजिए।",
  ["2 : 8", "3 : 27", "4 : 64", "5 : 120"],
  ["2 : 8", "3 : 27", "4 : 64", "5 : 120"],
  "D",
  "The second number is the cube of the first: 2³ = 8, 3³ = 27, 4³ = 64. But 5³ = 125, not 120, so 5 : 120 is the odd pair.",
  "दूसरी संख्या पहली संख्या का घन है: 2³ = 8, 3³ = 27, 4³ = 64। परंतु 5³ = 125 है, 120 नहीं, अतः 5 : 120 विषम युग्म है।",
  () => pairs.findIndex(([a, b]) => a ** 3 !== b) === 3);

const shift = (w, k) => w.split("").map((c) => String.fromCharCode(65 + ((c.charCodeAt(0) - 65 + k) % 26))).join("");
add("Reasoning", "Number & Letter Series", "medium",
  "Which letter-cluster will replace the question mark (?) in the series?\nBDF, GIK, LNP, ?, VXZ",
  "शृंखला में प्रश्नवाचक चिह्न (?) के स्थान पर कौन-सा अक्षर-समूह आएगा?\nBDF, GIK, LNP, ?, VXZ",
  ["QSU", "QTU", "RSU", "PSU"],
  ["QSU", "QTU", "RSU", "PSU"],
  "A",
  "Each letter moves 5 places forward: B→G→L→Q→V, D→I→N→S→X, F→K→P→U→Z. So the missing cluster is QSU.",
  "प्रत्येक अक्षर 5 स्थान आगे बढ़ता है: B→G→L→Q→V, D→I→N→S→X, F→K→P→U→Z। अतः लुप्त अक्षर-समूह QSU है।",
  () => shift("LNP", 5) === "QSU" && shift("QSU", 5) === "VXZ" && shift("BDF", 5) === "GIK");

add("Reasoning", "Blood Relation", "medium",
  "Pointing to a girl, Ravi said, \"She is the daughter of the only son of my father's father.\" How is the girl related to Ravi?",
  "एक लड़की की ओर इशारा करते हुए रवि ने कहा, \"वह मेरे पिता के पिता के इकलौते पुत्र की पुत्री है।\" लड़की का रवि से क्या संबंध है?",
  ["Cousin", "Aunt", "Sister", "Niece"],
  ["चचेरी बहन", "बुआ", "बहन", "भतीजी"],
  "C",
  "Ravi's father's father is his grandfather, whose only son is Ravi's father. The daughter of Ravi's father is Ravi's sister.",
  "रवि के पिता के पिता उसके दादा हैं, जिनका इकलौता पुत्र रवि का पिता है। रवि के पिता की पुत्री रवि की बहन है।");

const ev = (s) => Function(`return ${s.replace(/÷/g, "/").replace(/×/g, "*").replace(/−/g, "-")}`)();
add("Reasoning", "Coding-Decoding", "medium",
  "Which two signs should be interchanged to make the equation correct?\n42 ÷ 7 + 5 × 4 − 9 = 25",
  "समीकरण को सही करने के लिए किन दो चिह्नों को आपस में बदलना चाहिए?\n42 ÷ 7 + 5 × 4 − 9 = 25",
  ["÷ and −", "+ and ×", "+ and −", "× and ÷"],
  ["÷ और −", "+ और ×", "+ और −", "× और ÷"],
  "B",
  "Interchanging + and × gives 42 ÷ 7 × 5 + 4 − 9 = 6 × 5 + 4 − 9 = 30 + 4 − 9 = 25. The other interchanges do not give 25.",
  "+ और × को बदलने पर 42 ÷ 7 × 5 + 4 − 9 = 6 × 5 + 4 − 9 = 30 + 4 − 9 = 25। अन्य किसी परिवर्तन से 25 नहीं आता।",
  () => ev("42 ÷ 7 × 5 + 4 − 9") === 25 && ev("42 ÷ 7 + 5 × 4 − 9") !== 25
    && ev("42 − 7 + 5 × 4 ÷ 9") !== 25 && ev("42 ÷ 7 − 5 × 4 + 9") !== 25 && ev("42 × 7 + 5 ÷ 4 − 9") !== 25);

add("Reasoning", "Seating Arrangement", "easy",
  "In a row of students, Amit is 12th from the left end and 18th from the right end. How many students are there in the row?",
  "छात्रों की एक पंक्ति में अमित बाएँ छोर से 12वाँ और दाएँ छोर से 18वाँ है। पंक्ति में कुल कितने छात्र हैं?",
  ["28", "30", "31", "29"],
  ["28", "30", "31", "29"],
  "D",
  "Total = position from left + position from right − 1 = 12 + 18 − 1 = 29.",
  "कुल छात्र = बाएँ से स्थान + दाएँ से स्थान − 1 = 12 + 18 − 1 = 29।",
  () => 12 + 18 - 1 === 29);

// ------------------------------------------------------------- Maths (15)
add("Maths", "Matrices & Determinants", "easy",
  "Find the value of the determinant |3  2; 4  5| (first row 3, 2; second row 4, 5).",
  "सारणिक |3  2; 4  5| (पहली पंक्ति 3, 2; दूसरी पंक्ति 4, 5) का मान ज्ञात कीजिए।",
  ["23", "7", "−7", "2"],
  ["23", "7", "−7", "2"],
  "B",
  "|a b; c d| = ad − bc = 3 × 5 − 2 × 4 = 15 − 8 = 7.",
  "|a b; c d| = ad − bc = 3 × 5 − 2 × 4 = 15 − 8 = 7।",
  () => 3 * 5 - 2 * 4 === 7);

add("Maths", "Matrices & Determinants", "medium",
  "Find the value of the determinant with rows (2, 1, 3), (0, 4, 1) and (0, 0, 5).",
  "उस सारणिक का मान ज्ञात कीजिए जिसकी पंक्तियाँ (2, 1, 3), (0, 4, 1) और (0, 0, 5) हैं।",
  ["11", "20", "40", "0"],
  ["11", "20", "40", "0"],
  "C",
  "All entries below the main diagonal are 0, so the determinant is the product of the diagonal entries: 2 × 4 × 5 = 40.",
  "मुख्य विकर्ण के नीचे सभी प्रविष्टियाँ 0 हैं, अतः सारणिक विकर्ण प्रविष्टियों का गुणनफल है: 2 × 4 × 5 = 40।",
  () => {
    const m = [[2, 1, 3], [0, 4, 1], [0, 0, 5]];
    const d = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    return d === 40;
  });

const poly = (cs, x) => cs.reduce((a, c) => a * x + c, 0); // highest power first
add("Maths", "Calculus", "medium",
  "Find the derivative of (2x² + 3)(x − 1) with respect to x.",
  "(2x² + 3)(x − 1) का x के सापेक्ष अवकलज ज्ञात कीजिए।",
  ["6x² − 4x + 3", "4x − 2", "6x² + 4x − 3", "2x³ − 2x² + 3x"],
  ["6x² − 4x + 3", "4x − 2", "6x² + 4x − 3", "2x³ − 2x² + 3x"],
  "A",
  "(2x² + 3)(x − 1) = 2x³ − 2x² + 3x − 3. Differentiating term by term: 6x² − 4x + 3.",
  "(2x² + 3)(x − 1) = 2x³ − 2x² + 3x − 3। प्रत्येक पद का अवकलन करने पर: 6x² − 4x + 3।",
  () => [0.5, 1.7, -2.3].every((x) => {
    const f = (t) => (2 * t * t + 3) * (t - 1), h = 1e-6;
    return Math.abs((f(x + h) - f(x - h)) / (2 * h) - poly([6, -4, 3], x)) < 1e-4;
  }));

add("Maths", "Calculus", "easy",
  "∫(4x³ + 2x) dx = ?",
  "∫(4x³ + 2x) dx = ?",
  ["12x² + 2 + C", "x⁴ + 2x² + C", "4x⁴ + x² + C", "x⁴ + x² + C"],
  ["12x² + 2 + C", "x⁴ + 2x² + C", "4x⁴ + x² + C", "x⁴ + x² + C"],
  "D",
  "∫xⁿ dx = xⁿ⁺¹/(n + 1). So ∫4x³ dx = x⁴ and ∫2x dx = x². Answer: x⁴ + x² + C.",
  "∫xⁿ dx = xⁿ⁺¹/(n + 1)। अतः ∫4x³ dx = x⁴ तथा ∫2x dx = x²। उत्तर: x⁴ + x² + C।",
  () => [0.3, 1.1, 2].every((x) => {
    const F = (t) => t ** 4 + t ** 2, h = 1e-6;
    return Math.abs((F(x + h) - F(x - h)) / (2 * h) - (4 * x ** 3 + 2 * x)) < 1e-4;
  }));

add("Maths", "Calculus", "medium",
  "Evaluate the definite integral ∫₀² 3x² dx.",
  "निश्चित समाकल ∫₀² 3x² dx का मान ज्ञात कीजिए।",
  ["6", "8", "12", "4"],
  ["6", "8", "12", "4"],
  "B",
  "∫3x² dx = x³. From 0 to 2: 2³ − 0³ = 8.",
  "∫3x² dx = x³। 0 से 2 तक: 2³ − 0³ = 8।",
  () => { let s = 0; const n = 20000; for (let i = 0; i < n; i++) { const x = (i + 0.5) * 2 / n; s += 3 * x * x * 2 / n; } return Math.abs(s - 8) < 1e-6; });

add("Maths", "Calculus", "medium",
  "Find the minimum value of x² − 6x + 11.",
  "x² − 6x + 11 का न्यूनतम मान ज्ञात कीजिए।",
  ["3", "11", "2", "−2"],
  ["3", "11", "2", "−2"],
  "C",
  "x² − 6x + 11 = (x − 3)² + 2. The square is least (zero) at x = 3, so the minimum value is 2.",
  "x² − 6x + 11 = (x − 3)² + 2। x = 3 पर वर्ग शून्य (न्यूनतम) होता है, अतः न्यूनतम मान 2 है।",
  () => { let m = Infinity; for (let x = -10; x <= 10; x += 0.001) m = Math.min(m, x * x - 6 * x + 11); return Math.abs(m - 2) < 1e-5; });

add("Maths", "Probability & Statistics", "easy",
  "Two coins are tossed together. What is the probability of getting at least one head?",
  "दो सिक्के एक साथ उछाले जाते हैं। कम से कम एक चित (head) आने की प्रायिकता क्या है?",
  ["1/4", "1/2", "2/3", "3/4"],
  ["1/4", "1/2", "2/3", "3/4"],
  "D",
  "Outcomes: HH, HT, TH, TT. Only TT has no head, so P(at least one head) = 1 − 1/4 = 3/4.",
  "परिणाम: HH, HT, TH, TT। केवल TT में कोई चित नहीं है, अतः P(कम से कम एक चित) = 1 − 1/4 = 3/4।",
  () => ["HH", "HT", "TH", "TT"].filter((o) => o.includes("H")).length / 4 === 0.75);

const med = [7, 3, 9, 5, 11, 4];
add("Maths", "Probability & Statistics", "medium",
  "Find the median of 7, 3, 9, 5, 11, 4.",
  "7, 3, 9, 5, 11, 4 की माध्यिका ज्ञात कीजिए।",
  ["6", "7", "5", "6.5"],
  ["6", "7", "5", "6.5"],
  "A",
  "In order: 3, 4, 5, 7, 9, 11. There are 6 values, so the median is the average of the 3rd and 4th: (5 + 7)/2 = 6.",
  "क्रम में: 3, 4, 5, 7, 9, 11। मान 6 हैं, अतः माध्यिका तीसरे और चौथे मान का औसत है: (5 + 7)/2 = 6।",
  () => { const s = [...med].sort((a, b) => a - b); return (s[2] + s[3]) / 2 === 6; });

add("Maths", "Geometry", "easy",
  "Find the distance between the points (2, 3) and (8, 11).",
  "बिंदुओं (2, 3) और (8, 11) के बीच की दूरी ज्ञात कीजिए।",
  ["14", "10", "12", "8"],
  ["14", "10", "12", "8"],
  "B",
  "Distance = √[(8 − 2)² + (11 − 3)²] = √(36 + 64) = √100 = 10.",
  "दूरी = √[(8 − 2)² + (11 − 3)²] = √(36 + 64) = √100 = 10।",
  () => Math.hypot(8 - 2, 11 - 3) === 10);

add("Maths", "Trigonometry", "medium",
  "If tan θ = 3/4 and θ is acute, find the value of 5 sin θ + 5 cos θ.",
  "यदि tan θ = 3/4 है और θ न्यूनकोण है, तो 5 sin θ + 5 cos θ का मान ज्ञात कीजिए।",
  ["5", "6", "7", "8"],
  ["5", "6", "7", "8"],
  "C",
  "tan θ = 3/4 gives a right triangle with sides 3, 4 and hypotenuse 5, so sin θ = 3/5 and cos θ = 4/5. Then 5 × 3/5 + 5 × 4/5 = 3 + 4 = 7.",
  "tan θ = 3/4 से समकोण त्रिभुज की भुजाएँ 3, 4 और कर्ण 5 है, अतः sin θ = 3/5 तथा cos θ = 4/5। तब 5 × 3/5 + 5 × 4/5 = 3 + 4 = 7।",
  () => { const t = Math.atan(3 / 4); return Math.abs(5 * Math.sin(t) + 5 * Math.cos(t) - 7) < 1e-9; });

const nCr = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x = (x * (n - i)) / (i + 1); return x; };
add("Maths", "Algebra", "easy",
  "Find the value of ⁸C₃.",
  "⁸C₃ का मान ज्ञात कीजिए।",
  ["336", "24", "28", "56"],
  ["336", "24", "28", "56"],
  "D",
  "⁸C₃ = 8!/(3! × 5!) = (8 × 7 × 6)/(3 × 2 × 1) = 336/6 = 56.",
  "⁸C₃ = 8!/(3! × 5!) = (8 × 7 × 6)/(3 × 2 × 1) = 336/6 = 56।",
  () => nCr(8, 3) === 56);

add("Maths", "Algebra", "medium",
  "If α and β are the roots of x² − 7x + 12 = 0, find α² + β².",
  "यदि α और β, x² − 7x + 12 = 0 के मूल हैं, तो α² + β² ज्ञात कीजिए।",
  ["25", "49", "24", "37"],
  ["25", "49", "24", "37"],
  "A",
  "α + β = 7 and αβ = 12. α² + β² = (α + β)² − 2αβ = 49 − 24 = 25. (The roots are 3 and 4: 9 + 16 = 25.)",
  "α + β = 7 तथा αβ = 12। α² + β² = (α + β)² − 2αβ = 49 − 24 = 25। (मूल 3 और 4 हैं: 9 + 16 = 25।)",
  () => 3 * 3 - 7 * 3 + 12 === 0 && 4 * 4 - 7 * 4 + 12 === 0 && 9 + 16 === 25);

add("Maths", "Profit & Loss", "easy",
  "A shopkeeper marks his goods 50% above the cost price and allows a discount of 20%. What is his profit percent?",
  "एक दुकानदार अपने सामान पर क्रय मूल्य से 50% अधिक मूल्य अंकित करता है और 20% की छूट देता है। उसका लाभ प्रतिशत क्या है?",
  ["30%", "20%", "25%", "10%"],
  ["30%", "20%", "25%", "10%"],
  "B",
  "Let CP = 100. Marked price = 150. Selling price = 150 × 80/100 = 120. Profit = 20 on 100, i.e. 20%.",
  "माना क्रय मूल्य = 100। अंकित मूल्य = 150। विक्रय मूल्य = 150 × 80/100 = 120। लाभ = 100 पर 20, अर्थात 20%।",
  () => Math.abs(150 * 0.8 - 100 - 20) < 1e-9);

add("Maths", "Time & Work", "easy",
  "15 workers can finish a job in 24 days. In how many days will 20 workers finish the same job?",
  "15 मजदूर एक काम 24 दिनों में पूरा कर सकते हैं। वही काम 20 मजदूर कितने दिनों में पूरा करेंगे?",
  ["16 days", "20 days", "18 days", "32 days"],
  ["16 दिन", "20 दिन", "18 दिन", "32 दिन"],
  "C",
  "Total work = 15 × 24 = 360 worker-days. Days for 20 workers = 360 ÷ 20 = 18 days.",
  "कुल काम = 15 × 24 = 360 मजदूर-दिन। 20 मजदूरों के लिए दिन = 360 ÷ 20 = 18 दिन।",
  () => (15 * 24) / 20 === 18);

add("Maths", "Mensuration 2D & 3D", "medium",
  "Find the volume of a cylinder of radius 7 cm and height 10 cm. (Take π = 22/7)",
  "7 सेमी त्रिज्या और 10 सेमी ऊँचाई वाले बेलन का आयतन ज्ञात कीजिए। (π = 22/7 लीजिए)",
  ["1540 cm³", "440 cm³", "770 cm³", "3080 cm³"],
  ["1540 सेमी³", "440 सेमी³", "770 सेमी³", "3080 सेमी³"],
  "A",
  "Volume = πr²h = 22/7 × 7 × 7 × 10 = 22 × 7 × 10 = 1540 cm³.",
  "आयतन = πr²h = 22/7 × 7 × 7 × 10 = 22 × 7 × 10 = 1540 सेमी³।",
  () => Math.round((22 / 7) * 49 * 10) === 1540);

// ----------------------------------------------------------- Physics (15)
add("Physics", "Units & Measurement", "easy",
  "What is the SI unit of pressure?",
  "दाब का SI मात्रक क्या है?",
  ["Newton", "Joule", "Pascal", "Watt"],
  ["न्यूटन", "जूल", "पास्कल", "वाट"],
  "C",
  "Pressure = force/area, measured in newton per square metre, which is called the pascal (Pa).",
  "दाब = बल/क्षेत्रफल, जिसे न्यूटन प्रति वर्ग मीटर में मापा जाता है; इसे पास्कल (Pa) कहते हैं।");

add("Physics", "Units & Measurement", "medium",
  "What is the dimensional formula of force?",
  "बल का विमीय सूत्र क्या है?",
  ["[MLT⁻²]", "[ML²T⁻²]", "[MLT⁻¹]", "[ML⁻¹T⁻²]"],
  ["[MLT⁻²]", "[ML²T⁻²]", "[MLT⁻¹]", "[ML⁻¹T⁻²]"],
  "A",
  "Force = mass × acceleration = [M] × [LT⁻²] = [MLT⁻²]. ([ML²T⁻²] is energy and [ML⁻¹T⁻²] is pressure.)",
  "बल = द्रव्यमान × त्वरण = [M] × [LT⁻²] = [MLT⁻²]। ([ML²T⁻²] ऊर्जा का और [ML⁻¹T⁻²] दाब का सूत्र है।)");

add("Physics", "Pressure & Archimedes Principle", "medium",
  "A body weighs 50 N in air and 30 N when fully immersed in water. What is the buoyant force on it?",
  "एक वस्तु का भार हवा में 50 N और पानी में पूरी तरह डुबोने पर 30 N है। उस पर लगने वाला उत्प्लावन बल कितना है?",
  ["80 N", "50 N", "30 N", "20 N"],
  ["80 N", "50 N", "30 N", "20 N"],
  "D",
  "By Archimedes' principle, the loss of weight in water equals the buoyant force: 50 − 30 = 20 N.",
  "आर्किमिडीज़ के सिद्धांत से पानी में भार में कमी उत्प्लावन बल के बराबर होती है: 50 − 30 = 20 N।",
  () => 50 - 30 === 20);

add("Physics", "Matter & Its Properties", "medium",
  "The specific gravity (relative density) of a substance is 2.5. What is its density in SI units? (Density of water = 1000 kg/m³)",
  "किसी पदार्थ का विशिष्ट गुरुत्व (आपेक्षिक घनत्व) 2.5 है। SI मात्रक में उसका घनत्व क्या है? (जल का घनत्व = 1000 kg/m³)",
  ["250 kg/m³", "2500 kg/m³", "25 kg/m³", "2.5 kg/m³"],
  ["250 kg/m³", "2500 kg/m³", "25 kg/m³", "2.5 kg/m³"],
  "B",
  "Density = specific gravity × density of water = 2.5 × 1000 = 2500 kg/m³.",
  "घनत्व = विशिष्ट गुरुत्व × जल का घनत्व = 2.5 × 1000 = 2500 kg/m³।",
  () => 2.5 * 1000 === 2500);

add("Physics", "Motion", "easy",
  "A car starts from rest and moves with a uniform acceleration of 2 m/s². How far does it travel in 5 seconds?",
  "एक कार विरामावस्था से चलकर 2 m/s² के एकसमान त्वरण से चलती है। 5 सेकंड में वह कितनी दूरी तय करेगी?",
  ["10 m", "50 m", "25 m", "20 m"],
  ["10 मीटर", "50 मीटर", "25 मीटर", "20 मीटर"],
  "C",
  "s = ut + ½at² = 0 + ½ × 2 × 5² = 25 m.",
  "s = ut + ½at² = 0 + ½ × 2 × 5² = 25 मीटर।",
  () => 0.5 * 2 * 25 === 25);

add("Physics", "Force & Laws of Motion", "easy",
  "The motion of a rocket is based on which law?",
  "रॉकेट की गति किस नियम पर आधारित है?",
  ["Newton's first law of motion", "Newton's third law of motion", "Law of gravitation", "Archimedes' principle"],
  ["न्यूटन का गति का पहला नियम", "न्यूटन का गति का तीसरा नियम", "गुरुत्वाकर्षण का नियम", "आर्किमिडीज़ का सिद्धांत"],
  "B",
  "The rocket pushes hot gases backward (action) and the gases push the rocket forward (reaction): Newton's third law.",
  "रॉकेट गर्म गैसों को पीछे की ओर धकेलता है (क्रिया) और गैसें रॉकेट को आगे धकेलती हैं (प्रतिक्रिया): यह न्यूटन का तीसरा नियम है।");

add("Physics", "Force & Laws of Motion", "easy",
  "What is the momentum of a ball of mass 2 kg moving with a velocity of 5 m/s?",
  "5 m/s के वेग से चल रही 2 kg द्रव्यमान की गेंद का संवेग कितना है?",
  ["10 kg·m/s", "2.5 kg·m/s", "7 kg·m/s", "25 kg·m/s"],
  ["10 kg·m/s", "2.5 kg·m/s", "7 kg·m/s", "25 kg·m/s"],
  "A",
  "Momentum p = mv = 2 × 5 = 10 kg·m/s.",
  "संवेग p = mv = 2 × 5 = 10 kg·m/s।",
  () => 2 * 5 === 10);

add("Physics", "Force & Laws of Motion", "medium",
  "Two forces of 3 N and 4 N act on a body at right angles to each other. What is the magnitude of their resultant?",
  "3 N और 4 N के दो बल किसी वस्तु पर परस्पर लंबवत लगते हैं। उनके परिणामी बल का परिमाण क्या है?",
  ["7 N", "1 N", "12 N", "5 N"],
  ["7 N", "1 N", "12 N", "5 N"],
  "D",
  "By the parallelogram law, for forces at 90°: R = √(3² + 4²) = √25 = 5 N.",
  "बलों के समांतर चतुर्भुज नियम से, 90° पर लगे बलों का परिणामी: R = √(3² + 4²) = √25 = 5 N।",
  () => Math.hypot(3, 4) === 5);

add("Physics", "Gravitation", "medium",
  "What is the value of acceleration due to gravity (g) at the centre of the Earth?",
  "पृथ्वी के केंद्र पर गुरुत्वीय त्वरण (g) का मान क्या है?",
  ["9.8 m/s²", "Infinite", "Zero", "4.9 m/s²"],
  ["9.8 m/s²", "अनंत", "शून्य", "4.9 m/s²"],
  "C",
  "g decreases with depth as g(1 − d/R). At the centre d = R, so g = 0.",
  "गहराई के साथ g का मान g(1 − d/R) के अनुसार घटता है। केंद्र पर d = R, अतः g = 0।");

add("Physics", "Work, Power & Energy", "easy",
  "What is the kinetic energy of a body of mass 4 kg moving with a speed of 3 m/s?",
  "3 m/s की चाल से चल रही 4 kg द्रव्यमान की वस्तु की गतिज ऊर्जा कितनी है?",
  ["12 J", "18 J", "36 J", "6 J"],
  ["12 J", "18 J", "36 J", "6 J"],
  "B",
  "KE = ½mv² = ½ × 4 × 3² = 18 J.",
  "गतिज ऊर्जा = ½mv² = ½ × 4 × 3² = 18 J।",
  () => 0.5 * 4 * 9 === 18);

add("Physics", "Heat", "medium",
  "At what temperature do the Celsius and Fahrenheit scales show the same reading?",
  "किस तापमान पर सेल्सियस और फ़ारेनहाइट पैमाने एक ही पाठ्यांक दर्शाते हैं?",
  ["0°", "−40°", "100°", "−273°"],
  ["0°", "−40°", "100°", "−273°"],
  "B",
  "F = 9C/5 + 32. Putting F = C: C = 9C/5 + 32, so −4C/5 = 32 and C = −40. Thus −40 °C = −40 °F.",
  "F = 9C/5 + 32। F = C रखने पर: C = 9C/5 + 32, अतः −4C/5 = 32 और C = −40। अर्थात −40 °C = −40 °F।",
  () => (9 * -40) / 5 + 32 === -40);

add("Physics", "Sound", "easy",
  "Sound waves travelling in air are:",
  "वायु में चलने वाली ध्वनि तरंगें होती हैं:",
  ["Longitudinal waves", "Transverse waves", "Electromagnetic waves", "Light waves"],
  ["अनुदैर्घ्य तरंगें", "अनुप्रस्थ तरंगें", "विद्युतचुंबकीय तरंगें", "प्रकाश तरंगें"],
  "A",
  "In air, particles vibrate back and forth along the direction in which sound travels, forming compressions and rarefactions, so sound waves are longitudinal.",
  "वायु में कण ध्वनि के चलने की दिशा में ही आगे-पीछे कंपन करते हैं और संपीडन व विरलन बनाते हैं, अतः ध्वनि तरंगें अनुदैर्घ्य होती हैं।");

add("Physics", "Light", "easy",
  "The radius of curvature of a concave mirror is 30 cm. What is its focal length?",
  "एक अवतल दर्पण की वक्रता त्रिज्या 30 सेमी है। उसकी फोकस दूरी कितनी है?",
  ["60 cm", "30 cm", "10 cm", "15 cm"],
  ["60 सेमी", "30 सेमी", "10 सेमी", "15 सेमी"],
  "D",
  "For a spherical mirror, f = R/2 = 30/2 = 15 cm.",
  "गोलीय दर्पण के लिए f = R/2 = 30/2 = 15 सेमी।",
  () => 30 / 2 === 15);

add("Physics", "Electricity", "easy",
  "A potential difference of 12 V is applied across a resistor of 4 Ω. What current flows through it?",
  "4 Ω के प्रतिरोधक के सिरों पर 12 V का विभवांतर लगाया जाता है। उसमें कितनी धारा बहेगी?",
  ["48 A", "3 A", "0.33 A", "16 A"],
  ["48 A", "3 A", "0.33 A", "16 A"],
  "B",
  "By Ohm's law, I = V/R = 12/4 = 3 A.",
  "ओम के नियम से, I = V/R = 12/4 = 3 A।",
  () => 12 / 4 === 3);

add("Physics", "Electricity", "medium",
  "Resistors of 6 Ω and 3 Ω are connected in parallel. What is their equivalent resistance?",
  "6 Ω और 3 Ω के प्रतिरोधक समांतर क्रम में जोड़े गए हैं। उनका तुल्य प्रतिरोध कितना है?",
  ["9 Ω", "4.5 Ω", "2 Ω", "18 Ω"],
  ["9 Ω", "4.5 Ω", "2 Ω", "18 Ω"],
  "C",
  "1/R = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2, so R = 2 Ω. (Or R = 6 × 3/(6 + 3) = 18/9 = 2 Ω.)",
  "1/R = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2, अतः R = 2 Ω। (या R = 6 × 3/(6 + 3) = 18/9 = 2 Ω।)",
  () => (6 * 3) / (6 + 3) === 2);

// --------------------------------------------------------- Chemistry (10)
add("Chemistry", "Matter & Its Changes", "easy",
  "Rusting of iron is an example of a:",
  "लोहे पर जंग लगना किसका उदाहरण है?",
  ["Physical change", "Chemical change", "Reversible change", "Change of state"],
  ["भौतिक परिवर्तन", "रासायनिक परिवर्तन", "उत्क्रमणीय परिवर्तन", "अवस्था परिवर्तन"],
  "B",
  "In rusting, iron reacts with oxygen and moisture to form a new substance, hydrated iron(III) oxide, so it is a chemical change.",
  "जंग लगने में लोहा ऑक्सीजन और नमी से क्रिया करके एक नया पदार्थ (जलयोजित आयरन(III) ऑक्साइड) बनाता है, अतः यह रासायनिक परिवर्तन है।");

add("Chemistry", "Acids, Bases & Salts", "easy",
  "What is the chemical formula of baking soda?",
  "बेकिंग सोडा का रासायनिक सूत्र क्या है?",
  ["Na₂CO₃", "NaCl", "NaHCO₃", "NaOH"],
  ["Na₂CO₃", "NaCl", "NaHCO₃", "NaOH"],
  "C",
  "Baking soda is sodium hydrogen carbonate, NaHCO₃. Na₂CO₃ is washing soda (anhydrous form).",
  "बेकिंग सोडा सोडियम हाइड्रोजन कार्बोनेट (NaHCO₃) है। Na₂CO₃ धावन सोडा (निर्जल रूप) है।");

add("Chemistry", "Atomic Structure", "easy",
  "What is the valency of nitrogen in ammonia (NH₃)?",
  "अमोनिया (NH₃) में नाइट्रोजन की संयोजकता कितनी है?",
  ["3", "1", "5", "2"],
  ["3", "1", "5", "2"],
  "A",
  "One nitrogen atom combines with three hydrogen atoms (each of valency 1), so the valency of nitrogen in NH₃ is 3.",
  "एक नाइट्रोजन परमाणु तीन हाइड्रोजन परमाणुओं (प्रत्येक की संयोजकता 1) से जुड़ता है, अतः NH₃ में नाइट्रोजन की संयोजकता 3 है।",
  () => 3 * 1 === 3);

add("Chemistry", "Atomic Structure", "medium",
  "The molecular weight of sulphuric acid (H₂SO₄) is 98. What is its equivalent weight?",
  "सल्फ्यूरिक अम्ल (H₂SO₄) का अणुभार 98 है। इसका तुल्यांकी भार कितना है?",
  ["98", "32.7", "196", "49"],
  ["98", "32.7", "196", "49"],
  "D",
  "Equivalent weight of an acid = molecular weight ÷ basicity. H₂SO₄ has 2 replaceable H atoms, so 98 ÷ 2 = 49.",
  "अम्ल का तुल्यांकी भार = अणुभार ÷ क्षारकता। H₂SO₄ में 2 प्रतिस्थापनीय H परमाणु हैं, अतः 98 ÷ 2 = 49।",
  () => 2 * 1 + 32 + 4 * 16 === 98 && 98 / 2 === 49);

add("Chemistry", "Air & Water", "easy",
  "Which gas makes up the largest part (about 78%) of the air by volume?",
  "आयतन के अनुसार वायु का सबसे बड़ा भाग (लगभग 78%) कौन-सी गैस है?",
  ["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"],
  ["ऑक्सीजन", "नाइट्रोजन", "कार्बन डाइऑक्साइड", "आर्गन"],
  "B",
  "Air is about 78% nitrogen, 21% oxygen and about 0.9% argon; carbon dioxide is only about 0.04%.",
  "वायु में लगभग 78% नाइट्रोजन, 21% ऑक्सीजन और लगभग 0.9% आर्गन होती है; कार्बन डाइऑक्साइड केवल लगभग 0.04% है।");

add("Chemistry", "Hydrogen, Oxygen, Nitrogen & CO2", "easy",
  "Which gas turns lime water milky?",
  "कौन-सी गैस चूने के पानी को दूधिया कर देती है?",
  ["Oxygen", "Hydrogen", "Nitrogen", "Carbon dioxide"],
  ["ऑक्सीजन", "हाइड्रोजन", "नाइट्रोजन", "कार्बन डाइऑक्साइड"],
  "D",
  "CO₂ reacts with lime water, Ca(OH)₂, to form insoluble calcium carbonate (CaCO₃), which makes it milky.",
  "CO₂ चूने के पानी Ca(OH)₂ से क्रिया करके अघुलनशील कैल्शियम कार्बोनेट (CaCO₃) बनाती है, जिससे पानी दूधिया हो जाता है।");

add("Chemistry", "Oxidation & Reduction", "medium",
  "What is the oxidation state of chromium in potassium dichromate (K₂Cr₂O₇)?",
  "पोटैशियम डाइक्रोमेट (K₂Cr₂O₇) में क्रोमियम की ऑक्सीकरण अवस्था क्या है?",
  ["+7", "+3", "+6", "+12"],
  ["+7", "+3", "+6", "+12"],
  "C",
  "Let Cr = x. 2(+1) + 2x + 7(−2) = 0, so 2 + 2x − 14 = 0, 2x = 12 and x = +6.",
  "माना Cr = x। 2(+1) + 2x + 7(−2) = 0, अतः 2 + 2x − 14 = 0, 2x = 12 और x = +6।",
  () => 2 * 1 + 2 * 6 + 7 * -2 === 0);

add("Chemistry", "Acids, Bases & Salts", "easy",
  "What is the pH of a neutral solution at 25 °C?",
  "25 °C पर किसी उदासीन विलयन का pH कितना होता है?",
  ["7", "0", "14", "1"],
  ["7", "0", "14", "1"],
  "A",
  "At 25 °C pure water and neutral solutions have pH 7; below 7 is acidic and above 7 is basic.",
  "25 °C पर शुद्ध जल और उदासीन विलयनों का pH 7 होता है; 7 से कम अम्लीय और 7 से अधिक क्षारीय होता है।");

add("Chemistry", "Carbon & Its Forms", "easy",
  "Which allotrope of carbon is the hardest natural substance?",
  "कार्बन का कौन-सा अपररूप सबसे कठोर प्राकृतिक पदार्थ है?",
  ["Graphite", "Coal", "Fullerene", "Diamond"],
  ["ग्रेफाइट", "कोयला", "फुलरीन", "हीरा"],
  "D",
  "In diamond each carbon atom is bonded to four others in a rigid 3-D network, making it the hardest natural substance. Graphite is soft and slippery.",
  "हीरे में प्रत्येक कार्बन परमाणु चार अन्य परमाणुओं से एक दृढ़ त्रिविमीय जाल में जुड़ा होता है, इसलिए यह सबसे कठोर प्राकृतिक पदार्थ है। ग्रेफाइट मुलायम और चिकना होता है।");

add("Chemistry", "Fertilizers", "easy",
  "Which of the following is a nitrogenous fertilizer?",
  "निम्नलिखित में से कौन-सा नाइट्रोजनी उर्वरक है?",
  ["Superphosphate", "Urea", "Potash", "Gypsum"],
  ["सुपरफॉस्फेट", "यूरिया", "पोटाश", "जिप्सम"],
  "B",
  "Urea, CO(NH₂)₂, contains about 46% nitrogen. Superphosphate supplies phosphorus, potash supplies potassium and gypsum is a soil conditioner.",
  "यूरिया CO(NH₂)₂ में लगभग 46% नाइट्रोजन होती है। सुपरफॉस्फेट फॉस्फोरस देता है, पोटाश पोटैशियम देता है और जिप्सम मृदा सुधारक है।",
  () => Math.abs((28 / 60) * 100 - 46.7) < 0.1);

// ------------------------------------------------------------------ checks
const want = { GK: 5, Reasoning: 5, Maths: 15, Physics: 15, Chemistry: 10 };
const errs = [];
const count = {};
Q.forEach((q, i) => {
  const n = i + 1;
  count[q.subject] = (count[q.subject] || 0) + 1;
  if (q.options.length !== 4 || q.optionsHi.length !== 4) errs.push(`Q${n}: needs 4 options in both languages`);
  if (new Set(q.options).size !== 4) errs.push(`Q${n}: options repeat`);
  if (!/^[A-D]$/.test(q.correct)) errs.push(`Q${n}: correct must be A-D`);
  if (q.check && !q.check()) errs.push(`Q${n}: answer check FAILED`);
  if (!q.solution || !q.solutionHi || !q.questionHi) errs.push(`Q${n}: missing Hindi or solution`);
  if (/[ऀ-ॿ]/.test(q.question + q.options.join("") + q.solution)) errs.push(`Q${n}: Hindi in the English text`);
});
for (const [s, n] of Object.entries(want)) if (count[s] !== n) errs.push(`${s}: ${count[s] || 0} questions, want ${n}`);
const keys = Q.map((q) => q.correct).join("");
const spread = Object.fromEntries("ABCD".split("").map((k) => [k, [...keys].filter((x) => x === k).length]));

console.log(`${Q.length} questions`, count, "answers", spread, `checked by code: ${Q.filter((q) => q.check).length}`);
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
console.log("All checks pass.");

if (process.argv.includes("--json")) {
  const rows = Q.map((q) => ({
    subject: q.subject, topic: q.topic, difficulty: q.difficulty,
    question: q.question, questionHi: q.questionHi,
    optionA: q.options[0], optionB: q.options[1], optionC: q.options[2], optionD: q.options[3],
    optionAHi: q.optionsHi[0], optionBHi: q.optionsHi[1], optionCHi: q.optionsHi[2], optionDHi: q.optionsHi[3],
    correct: q.correct, solution: q.solution, solutionHi: q.solutionHi,
  }));
  fs.writeFileSync(path.join(__dirname, "agt-mock1.json"), JSON.stringify(rows, null, 1));
  console.log("Wrote content/agt-mock1.json");
}
