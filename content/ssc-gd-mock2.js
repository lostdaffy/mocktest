// SSC GD Constable - Mock #2, written by hand (no AI), 2026-11-04.
//
// Follows the exam pattern: Reasoning 20, GK 20, Maths 20, General Hindi 20,
// in that order, every question in English and Hindi (the Hindi section is in
// Hindi in both). Original questions at SSC GD level. Every numerical question
// carries `check`: the answer recomputed from the numbers in the question; the
// file refuses to build if one fails, if the marked answer is not among the
// options, or if options repeat.
//
//   node content/ssc-gd-mock2.js           runs the checks, prints a summary
//   node content/ssc-gd-mock2.js --json    also writes content/ssc-gd-mock2.json

const fs = require("fs");
const path = require("path");

const Q = [];
// opts / optsHi: arrays of 4. `a` is the correct letter. check() recomputes it.
const add = (subject, topic, difficulty, question, questionHi, options, optionsHi, correct, solution, solutionHi, check) =>
  Q.push({ subject, topic, difficulty, question, questionHi, options, optionsHi: optionsHi || [...options], correct, solution, solutionHi, check });
const L = (c) => "ABCD".indexOf(c);

// ============================================================ REASONING (20)
add("Reasoning", "Number Series", "easy",
  "Find the missing number in the series: 4, 9, 19, 39, ?",
  "श्रृंखला में लुप्त संख्या ज्ञात कीजिए: 4, 9, 19, 39, ?",
  ["59", "69", "78", "79"], null, "D",
  "Each term is double the previous term plus 1: 4×2+1=9, 9×2+1=19, 19×2+1=39, 39×2+1=79.",
  "प्रत्येक पद पिछले पद का दोगुना जोड़ 1 है: 4×2+1=9, 9×2+1=19, 19×2+1=39, 39×2+1=79।",
  () => 39 * 2 + 1 === 79 && 4 * 2 + 1 === 9 && 9 * 2 + 1 === 19 && 19 * 2 + 1 === 39);

add("Reasoning", "Number Series", "medium",
  "Find the missing number in the series: 2, 6, 12, 20, 30, ?",
  "श्रृंखला में लुप्त संख्या ज्ञात कीजिए: 2, 6, 12, 20, 30, ?",
  ["40", "42", "44", "36"], null, "B",
  "The terms are 1×2, 2×3, 3×4, 4×5, 5×6, so the next is 6×7 = 42.",
  "पद 1×2, 2×3, 3×4, 4×5, 5×6 हैं, इसलिए अगला पद 6×7 = 42 है।",
  () => 6 * 7 === 42 && [1, 2, 3, 4, 5].every((n, i) => [2, 6, 12, 20, 30][i] === n * (n + 1)));

add("Reasoning", "Letter Series", "easy",
  "Find the next group in the series: AZ, BY, CX, DW, ?",
  "श्रृंखला का अगला समूह ज्ञात कीजिए: AZ, BY, CX, DW, ?",
  ["EV", "EU", "FV", "EW"], null, "A",
  "The first letter moves forward (A, B, C, D, E) and the second moves backward (Z, Y, X, W, V). The next group is EV.",
  "पहला अक्षर आगे बढ़ता है (A, B, C, D, E) और दूसरा पीछे (Z, Y, X, W, V)। अगला समूह EV है।",
  () => String.fromCharCode(69) === "E" && String.fromCharCode(90 - 4) === "V");

add("Reasoning", "Coding-Decoding", "medium",
  "In a certain code language, CAT is written as FDW. How is DOG written in that code?",
  "एक कूट भाषा में CAT को FDW लिखा जाता है। उसी कूट भाषा में DOG को कैसे लिखा जाएगा?",
  ["GRJ", "GQJ", "FRJ", "GRK"], null, "A",
  "Each letter is moved 3 places forward: C→F, A→D, T→W. So D→G, O→R, G→J, giving GRJ.",
  "प्रत्येक अक्षर को 3 स्थान आगे बढ़ाया गया है: C→F, A→D, T→W। अतः D→G, O→R, G→J, यानी GRJ।",
  () => [..."CAT"].map((c) => String.fromCharCode(c.charCodeAt(0) + 3)).join("") === "FDW" && [..."DOG"].map((c) => String.fromCharCode(c.charCodeAt(0) + 3)).join("") === "GRJ");

add("Reasoning", "Coding-Decoding", "medium",
  "If in a code, 'MOTHER' is written as 'NPUIFS', then how will 'SISTER' be written in that code?",
  "यदि किसी कूट में 'MOTHER' को 'NPUIFS' लिखा जाता है, तो उसी कूट में 'SISTER' को कैसे लिखा जाएगा?",
  ["TJTUFS", "TJSUFS", "TKTUFS", "RJTUFS"], null, "A",
  "Each letter is moved one place forward: S→T, I→J, S→T, T→U, E→F, R→S, giving TJTUFS.",
  "प्रत्येक अक्षर को एक स्थान आगे बढ़ाया गया है: S→T, I→J, S→T, T→U, E→F, R→S, यानी TJTUFS।",
  () => [..."MOTHER"].map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join("") === "NPUIFS" && [..."SISTER"].map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join("") === "TJTUFS");

add("Reasoning", "Analogy", "easy",
  "Doctor : Hospital :: Teacher : ?",
  "डॉक्टर : अस्पताल :: शिक्षक : ?",
  ["Student", "School", "Book", "Class"], ["विद्यार्थी", "विद्यालय", "पुस्तक", "कक्षा"], "B",
  "A doctor works in a hospital; in the same way a teacher works in a school.",
  "डॉक्टर अस्पताल में कार्य करता है; उसी प्रकार शिक्षक विद्यालय में कार्य करता है।");

add("Reasoning", "Analogy", "medium",
  "Select the number that is related to the third number in the same way as the second number is related to the first. 6 : 216 :: 8 : ?",
  "उस संख्या का चयन कीजिए जो तीसरी संख्या से उसी प्रकार संबंधित है जिस प्रकार दूसरी संख्या पहली से संबंधित है। 6 : 216 :: 8 : ?",
  ["64", "512", "256", "1024"], null, "B",
  "216 = 6³, so the second number is the cube of the first. Hence 8³ = 512.",
  "216 = 6³, अतः दूसरी संख्या पहली संख्या का घन है। इसलिए 8³ = 512।",
  () => 6 ** 3 === 216 && 8 ** 3 === 512);

add("Reasoning", "Odd One Out", "easy",
  "Select the odd one out.",
  "विषम का चयन कीजिए।",
  ["Mango", "Apple", "Potato", "Banana"], ["आम", "सेब", "आलू", "केला"], "C",
  "Mango, apple and banana are fruits, while potato is a vegetable (a tuber).",
  "आम, सेब और केला फल हैं, जबकि आलू एक सब्ज़ी (कंद) है।");

add("Reasoning", "Odd One Out", "medium",
  "Select the odd number from the given alternatives: 17, 23, 29, 33",
  "दिए गए विकल्पों में से विषम संख्या चुनिए: 17, 23, 29, 33",
  ["17", "23", "29", "33"], null, "D",
  "17, 23 and 29 are prime numbers; 33 = 3 × 11 is not.",
  "17, 23 और 29 अभाज्य संख्याएँ हैं; 33 = 3 × 11 अभाज्य नहीं है।",
  () => [17, 23, 29].every((n) => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }) && 33 % 3 === 0);

add("Reasoning", "Direction Sense", "medium",
  "Ravi walks 8 km towards the east, then turns left and walks 6 km. How far is he from the starting point?",
  "रवि पूर्व की ओर 8 किमी चलता है, फिर बाएँ मुड़कर 6 किमी चलता है। वह प्रारंभिक बिंदु से कितनी दूर है?",
  ["14 km", "10 km", "12 km", "2 km"], ["14 किमी", "10 किमी", "12 किमी", "2 किमी"], "B",
  "The two walks are at right angles, so the distance is √(8² + 6²) = √100 = 10 km.",
  "दोनों रास्ते समकोण पर हैं, इसलिए दूरी = √(8² + 6²) = √100 = 10 किमी।",
  () => Math.hypot(8, 6) === 10);

add("Reasoning", "Direction Sense", "medium",
  "Facing the north, Sita turns 90° clockwise, then 180° anticlockwise. In which direction is she facing now?",
  "उत्तर की ओर मुँह करके खड़ी सीता 90° दक्षिणावर्त (घड़ी की दिशा में) घूमती है, फिर 180° वामावर्त घूमती है। अब उसका मुँह किस दिशा में है?",
  ["East", "West", "South", "North"], ["पूर्व", "पश्चिम", "दक्षिण", "उत्तर"], "B",
  "North turned 90° clockwise is East. Turning 180° anticlockwise from East points to West.",
  "उत्तर से 90° दक्षिणावर्त घूमने पर पूर्व होता है। पूर्व से 180° वामावर्त घूमने पर पश्चिम होता है।",
  () => ((0 + 90 - 180) % 360 + 360) % 360 === 270);

add("Reasoning", "Blood Relations", "easy",
  "Pointing to a man, Rekha said, \"He is the son of my mother's only brother.\" How is the man related to Rekha?",
  "एक पुरुष की ओर संकेत करके रेखा ने कहा, \"वह मेरी माँ के इकलौते भाई का पुत्र है।\" वह पुरुष रेखा का क्या लगता है?",
  ["Brother", "Uncle", "Cousin", "Nephew"], ["भाई", "चाचा/मामा", "ममेरा भाई", "भतीजा"], "C",
  "Mother's only brother is Rekha's maternal uncle (mama); his son is her maternal cousin.",
  "माँ का इकलौता भाई रेखा का मामा है; उसका पुत्र रेखा का ममेरा भाई है।");

add("Reasoning", "Blood Relations", "medium",
  "A is the father of B. B is the sister of C. C is the son of D. How is D related to A?",
  "A, B का पिता है। B, C की बहन है। C, D का पुत्र है। D, A से किस प्रकार संबंधित है?",
  ["Wife", "Mother", "Daughter", "Sister"], ["पत्नी", "माँ", "पुत्री", "बहन"], "A",
  "B and C are siblings, so A is also the father of C. C is D's son, so D is C's mother, which makes D the wife of A.",
  "B और C भाई-बहन हैं, अतः A, C का भी पिता है। C, D का पुत्र है, इसलिए D, C की माँ है और A की पत्नी है।");

add("Reasoning", "Ranking", "medium",
  "In a row of 40 students, Amit is 12th from the left end. What is his position from the right end?",
  "40 विद्यार्थियों की एक पंक्ति में अमित बाएँ छोर से 12वें स्थान पर है। दाएँ छोर से उसका स्थान क्या है?",
  ["27th", "28th", "29th", "30th"], ["27वाँ", "28वाँ", "29वाँ", "30वाँ"], "C",
  "Position from the right = 40 − 12 + 1 = 29.",
  "दाएँ से स्थान = 40 − 12 + 1 = 29।",
  () => 40 - 12 + 1 === 29);

add("Reasoning", "Calendar", "medium",
  "If 5 March of a year falls on a Monday, on which day does 20 March of the same year fall?",
  "यदि किसी वर्ष 5 मार्च सोमवार को पड़ता है, तो उसी वर्ष 20 मार्च किस दिन पड़ेगा?",
  ["Sunday", "Monday", "Wednesday", "Tuesday"], ["रविवार", "सोमवार", "बुधवार", "मंगलवार"], "D",
  "The gap is 15 days = 2 weeks + 1 day, so the day is one day after Monday, which is Tuesday.",
  "अंतर 15 दिन = 2 सप्ताह + 1 दिन है, इसलिए दिन सोमवार से एक दिन आगे, यानी मंगलवार होगा।",
  () => (1 + (20 - 5)) % 7 === 2); // Mon=1 -> Tue=2

add("Reasoning", "Clock", "medium",
  "What is the angle between the hands of a clock at 3:00?",
  "3:00 बजे घड़ी की सुइयों के बीच कितना कोण होता है?",
  ["60°", "75°", "90°", "120°"], null, "C",
  "At 3:00 the minute hand is at 12 and the hour hand at 3. Three hour-marks make 3 × 30° = 90°.",
  "3:00 बजे मिनट की सुई 12 पर और घंटे की सुई 3 पर होती है। तीन खानों का कोण 3 × 30° = 90° होता है।",
  () => 3 * 30 === 90);

add("Reasoning", "Missing Number", "medium",
  "Find the missing number: if 3 + 4 = 25 and 5 + 12 = 169, then 8 + 15 = ?",
  "लुप्त संख्या ज्ञात कीजिए: यदि 3 + 4 = 25 और 5 + 12 = 169, तो 8 + 15 = ?",
  ["289", "529", "361", "225"], null, "A",
  "The result is a² + b² of the two numbers: 3² + 4² = 25 and 5² + 12² = 169, so 8² + 15² = 64 + 225 = 289.",
  "परिणाम a² + b² है: 3²+4² = 25, 5²+12² = 169, इसलिए 8²+15² = 64 + 225 = 289।",
  () => 3 * 3 + 4 * 4 === 25 && 5 * 5 + 12 * 12 === 169 && 8 * 8 + 15 * 15 === 289);

add("Reasoning", "Alphabet Test", "easy",
  "Which letter is the 5th to the right of the 12th letter from the left end of the English alphabet?",
  "अंग्रेज़ी वर्णमाला के बाएँ छोर से 12वें अक्षर के दाईं ओर 5वाँ अक्षर कौन-सा है?",
  ["P", "Q", "R", "S"], null, "B",
  "The 12th letter is L. Five places to its right is the 17th letter, which is Q.",
  "12वाँ अक्षर L है। उसके दाईं ओर 5 स्थान आगे 17वाँ अक्षर Q है।",
  () => String.fromCharCode(64 + 12 + 5) === "Q");

add("Reasoning", "Syllogism", "medium",
  "Statements: All pens are books. All books are tables.\nConclusions: I. All pens are tables. II. All tables are books.",
  "कथन: सभी पेन किताबें हैं। सभी किताबें मेज़ हैं।\nनिष्कर्ष: I. सभी पेन मेज़ हैं। II. सभी मेज़ किताबें हैं।",
  ["Only conclusion I follows", "Only conclusion II follows", "Both I and II follow", "Neither I nor II follows"],
  ["केवल निष्कर्ष I अनुसरण करता है", "केवल निष्कर्ष II अनुसरण करता है", "I और II दोनों अनुसरण करते हैं", "न तो I और न ही II अनुसरण करता है"], "A",
  "Pens ⊂ books ⊂ tables, so all pens are tables (I follows). Nothing says every table is a book, so II does not follow.",
  "पेन ⊂ किताबें ⊂ मेज़, इसलिए सभी पेन मेज़ हैं (I सही)। यह कहीं नहीं कहा गया कि हर मेज़ किताब है, इसलिए II सही नहीं है।");

add("Reasoning", "Venn Diagram", "easy",
  "Which of the following diagrams best represents the relationship among Mother, Woman, Doctor?",
  "माँ, महिला, डॉक्टर के बीच संबंध को सबसे अच्छा कौन-सा कथन दर्शाता है?",
  ["Mother and Doctor are both inside Woman and overlap each other", "All three are separate circles", "Woman is inside Doctor, which is inside Mother", "Mother and Woman are separate; Doctor contains both"],
  ["माँ और डॉक्टर दोनों महिला के भीतर हैं और एक-दूसरे को काटते हैं", "तीनों अलग-अलग वृत्त हैं", "महिला, डॉक्टर के भीतर और डॉक्टर, माँ के भीतर है", "माँ और महिला अलग हैं; डॉक्टर में दोनों समाए हैं"], "A",
  "Every mother is a woman, and a doctor who is a woman is a woman too, so both circles lie inside 'Woman'. Some women are both mothers and doctors, so those two circles overlap.",
  "हर माँ एक महिला है और महिला डॉक्टर भी महिला है, इसलिए दोनों वृत्त 'महिला' के भीतर हैं। कुछ महिलाएँ माँ भी हैं और डॉक्टर भी, इसलिए दोनों वृत्त एक-दूसरे को काटते हैं।");

// ================================================================== GK (20)
add("GK", "Indian Polity", "easy",
  "Who is the constitutional head of the Indian state?",
  "भारतीय राज्य का संवैधानिक प्रमुख कौन है?",
  ["Prime Minister", "President", "Chief Justice", "Speaker of Lok Sabha"], ["प्रधानमंत्री", "राष्ट्रपति", "मुख्य न्यायाधीश", "लोकसभा अध्यक्ष"], "B",
  "The President is the head of the state and the executive power of the Union is vested in the President (Article 53).",
  "राष्ट्रपति राज्य का प्रमुख है और संघ की कार्यपालिका शक्ति राष्ट्रपति में निहित है (अनुच्छेद 53)।");

add("GK", "Indian Polity", "medium",
  "What is the minimum age to be elected as a member of the Lok Sabha?",
  "लोकसभा का सदस्य निर्वाचित होने के लिए न्यूनतम आयु कितनी है?",
  ["18 years", "21 years", "25 years", "30 years"], ["18 वर्ष", "21 वर्ष", "25 वर्ष", "30 वर्ष"], "C",
  "A person must be at least 25 years old to contest a Lok Sabha election (30 for the Rajya Sabha).",
  "लोकसभा चुनाव लड़ने के लिए न्यूनतम आयु 25 वर्ष है (राज्यसभा के लिए 30 वर्ष)।");

add("GK", "Indian Polity", "easy",
  "Which Article of the Indian Constitution abolishes untouchability?",
  "भारतीय संविधान का कौन-सा अनुच्छेद अस्पृश्यता का अंत करता है?",
  ["Article 14", "Article 15", "Article 17", "Article 21"], ["अनुच्छेद 14", "अनुच्छेद 15", "अनुच्छेद 17", "अनुच्छेद 21"], "C",
  "Article 17 abolishes untouchability and forbids its practice in any form.",
  "अनुच्छेद 17 अस्पृश्यता का अंत करता है और किसी भी रूप में इसके आचरण को निषिद्ध करता है।");

add("GK", "Indian History", "easy",
  "Who founded the Maurya Empire?",
  "मौर्य साम्राज्य की स्थापना किसने की?",
  ["Ashoka", "Bindusara", "Chandragupta Maurya", "Samudragupta"], ["अशोक", "बिंदुसार", "चंद्रगुप्त मौर्य", "समुद्रगुप्त"], "C",
  "Chandragupta Maurya founded the Maurya Empire around 321 BCE with the help of Chanakya.",
  "चंद्रगुप्त मौर्य ने चाणक्य की सहायता से लगभग 321 ई.पू. में मौर्य साम्राज्य की स्थापना की।");

add("GK", "Indian History", "medium",
  "The Battle of Plassey was fought in the year:",
  "प्लासी का युद्ध किस वर्ष लड़ा गया था?",
  ["1757", "1764", "1761", "1857"], null, "A",
  "The Battle of Plassey (1757) was fought between Robert Clive of the East India Company and Nawab Siraj-ud-Daulah of Bengal.",
  "प्लासी का युद्ध (1757) ईस्ट इंडिया कंपनी के रॉबर्ट क्लाइव और बंगाल के नवाब सिराजुद्दौला के बीच लड़ा गया था।");

add("GK", "Indian History", "medium",
  "Who gave the slogan 'Do or Die' during the Quit India Movement in 1942?",
  "1942 के भारत छोड़ो आंदोलन के दौरान 'करो या मरो' का नारा किसने दिया?",
  ["Jawaharlal Nehru", "Mahatma Gandhi", "Subhas Chandra Bose", "Sardar Patel"], ["जवाहरलाल नेहरू", "महात्मा गांधी", "सुभाष चंद्र बोस", "सरदार पटेल"], "B",
  "Mahatma Gandhi gave the call 'Do or Die' (Karo ya Maro) at Gowalia Tank Maidan, Bombay, on 8 August 1942.",
  "महात्मा गांधी ने 8 अगस्त 1942 को बंबई के गोवालिया टैंक मैदान में 'करो या मरो' का आह्वान किया।");

add("GK", "Indian Geography", "easy",
  "Which is the longest river of the Indian peninsula?",
  "प्रायद्वीपीय भारत की सबसे लंबी नदी कौन-सी है?",
  ["Krishna", "Godavari", "Kaveri", "Narmada"], ["कृष्णा", "गोदावरी", "कावेरी", "नर्मदा"], "B",
  "The Godavari, about 1,465 km long, is the longest river of peninsular India and is called the 'Dakshin Ganga'.",
  "गोदावरी लगभग 1,465 किमी लंबी है और प्रायद्वीपीय भारत की सबसे लंबी नदी है; इसे 'दक्षिण गंगा' कहा जाता है।");

add("GK", "Indian Geography", "easy",
  "Which Indian state has the largest area?",
  "क्षेत्रफल की दृष्टि से भारत का सबसे बड़ा राज्य कौन-सा है?",
  ["Madhya Pradesh", "Maharashtra", "Uttar Pradesh", "Rajasthan"], ["मध्य प्रदेश", "महाराष्ट्र", "उत्तर प्रदेश", "राजस्थान"], "D",
  "Rajasthan, with about 3.42 lakh sq km, is the largest Indian state by area.",
  "राजस्थान लगभग 3.42 लाख वर्ग किमी के साथ क्षेत्रफल में भारत का सबसे बड़ा राज्य है।");

add("GK", "Indian Geography", "medium",
  "The Tropic of Cancer does NOT pass through which of the following states?",
  "कर्क रेखा निम्नलिखित में से किस राज्य से होकर नहीं गुज़रती?",
  ["Gujarat", "Rajasthan", "Odisha", "Jharkhand"], ["गुजरात", "राजस्थान", "ओडिशा", "झारखंड"], "C",
  "The Tropic of Cancer passes through eight states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura and Mizoram. Odisha is not one of them.",
  "कर्क रेखा आठ राज्यों से गुज़रती है: गुजरात, राजस्थान, मध्य प्रदेश, छत्तीसगढ़, झारखंड, पश्चिम बंगाल, त्रिपुरा और मिज़ोरम। ओडिशा इनमें नहीं है।");

add("GK", "Science", "easy",
  "Which gas is most abundant in the Earth's atmosphere?",
  "पृथ्वी के वायुमंडल में कौन-सी गैस सबसे अधिक मात्रा में है?",
  ["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"], ["ऑक्सीजन", "नाइट्रोजन", "कार्बन डाइऑक्साइड", "आर्गन"], "B",
  "Nitrogen makes up about 78% of the atmosphere; oxygen is about 21%.",
  "वायुमंडल में लगभग 78% नाइट्रोजन है; ऑक्सीजन लगभग 21% है।");

add("GK", "Science", "easy",
  "The SI unit of force is:",
  "बल का SI मात्रक है:",
  ["Joule", "Watt", "Newton", "Pascal"], ["जूल", "वाट", "न्यूटन", "पास्कल"], "C",
  "Force is measured in newtons (N); 1 N = 1 kg·m/s².",
  "बल का मात्रक न्यूटन (N) है; 1 N = 1 किग्रा·मी/से²।");

add("GK", "Science", "medium",
  "Which vitamin is produced in the human skin when it is exposed to sunlight?",
  "सूर्य के प्रकाश के संपर्क में आने पर मानव त्वचा में कौन-सा विटामिन बनता है?",
  ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"], ["विटामिन A", "विटामिन B12", "विटामिन C", "विटामिन D"], "D",
  "Sunlight (UV-B) helps the skin make vitamin D, which is needed for strong bones.",
  "सूर्य के प्रकाश (UV-B) से त्वचा में विटामिन D बनता है, जो मज़बूत हड्डियों के लिए आवश्यक है।");

add("GK", "Science", "medium",
  "The chemical formula of common salt is:",
  "सामान्य नमक का रासायनिक सूत्र है:",
  ["NaCl", "KCl", "CaCl₂", "Na₂CO₃"], null, "A",
  "Common salt is sodium chloride, NaCl.",
  "सामान्य नमक सोडियम क्लोराइड, NaCl है।");

add("GK", "Economy", "medium",
  "Which institution issues currency notes of ₹10 and above in India?",
  "भारत में ₹10 और उससे ऊपर के नोट कौन-सी संस्था जारी करती है?",
  ["Ministry of Finance", "State Bank of India", "Reserve Bank of India", "NITI Aayog"], ["वित्त मंत्रालय", "भारतीय स्टेट बैंक", "भारतीय रिज़र्व बैंक", "नीति आयोग"], "C",
  "The Reserve Bank of India issues all banknotes (the ₹1 note and coins are issued by the Government through the Ministry of Finance).",
  "सभी बैंक नोट भारतीय रिज़र्व बैंक जारी करता है (₹1 का नोट और सिक्के वित्त मंत्रालय के माध्यम से सरकार जारी करती है)।");

add("GK", "Economy", "medium",
  "GST in India came into effect on:",
  "भारत में GST कब लागू हुआ?",
  ["1 April 2016", "1 July 2017", "1 January 2018", "1 April 2017"], ["1 अप्रैल 2016", "1 जुलाई 2017", "1 जनवरी 2018", "1 अप्रैल 2017"], "B",
  "The Goods and Services Tax came into force across India on 1 July 2017.",
  "वस्तु एवं सेवा कर (GST) पूरे भारत में 1 जुलाई 2017 से लागू हुआ।");

add("GK", "Static GK", "easy",
  "Which is the national animal of India?",
  "भारत का राष्ट्रीय पशु कौन-सा है?",
  ["Lion", "Elephant", "Tiger", "Leopard"], ["शेर", "हाथी", "बाघ", "तेंदुआ"], "C",
  "The Bengal tiger is the national animal of India.",
  "बंगाल टाइगर (बाघ) भारत का राष्ट्रीय पशु है।");

add("GK", "Static GK", "easy",
  "The headquarters of the Border Security Force (BSF) is located in:",
  "सीमा सुरक्षा बल (BSF) का मुख्यालय कहाँ स्थित है?",
  ["Jaipur", "New Delhi", "Chandigarh", "Dehradun"], ["जयपुर", "नई दिल्ली", "चंडीगढ़", "देहरादून"], "B",
  "BSF's headquarters is in New Delhi; it guards India's borders with Pakistan and Bangladesh.",
  "BSF का मुख्यालय नई दिल्ली में है; यह पाकिस्तान और बांग्लादेश से लगी भारत की सीमाओं की रक्षा करता है।");

add("GK", "Sports", "easy",
  "How many players are there in a cricket team on the field?",
  "मैदान पर एक क्रिकेट टीम में कितने खिलाड़ी होते हैं?",
  ["9", "10", "11", "12"], null, "C",
  "Each side fields 11 players in cricket.",
  "क्रिकेट में प्रत्येक टीम के 11 खिलाड़ी मैदान पर होते हैं।");

add("GK", "Art & Culture", "medium",
  "Kathak, the classical dance form, is mainly associated with which region?",
  "शास्त्रीय नृत्य कथक मुख्यतः किस क्षेत्र से जुड़ा है?",
  ["South India", "North India", "Assam", "Kerala"], ["दक्षिण भारत", "उत्तर भारत", "असम", "केरल"], "B",
  "Kathak developed in North India (Uttar Pradesh, Rajasthan), while Bharatanatyam belongs to Tamil Nadu and Kathakali to Kerala.",
  "कथक का विकास उत्तर भारत (उत्तर प्रदेश, राजस्थान) में हुआ; भरतनाट्यम तमिलनाडु का और कथकली केरल का नृत्य है।");

add("GK", "Indian Polity", "easy",
  "Who was the Chairman of the Drafting Committee of the Constituent Assembly of India?",
  "भारत की संविधान सभा की प्रारूप समिति के अध्यक्ष कौन थे?",
  ["Jawaharlal Nehru", "Rajendra Prasad", "Sardar Vallabhbhai Patel", "B. R. Ambedkar"], ["जवाहरलाल नेहरू", "राजेंद्र प्रसाद", "सरदार वल्लभभाई पटेल", "बी. आर. अंबेडकर"], "D",
  "Dr. B. R. Ambedkar chaired the Drafting Committee and is called the 'Father of the Indian Constitution'. Dr. Rajendra Prasad was the President of the Constituent Assembly.",
  "डॉ. बी. आर. अंबेडकर प्रारूप समिति के अध्यक्ष थे और उन्हें 'भारतीय संविधान का जनक' कहा जाता है। डॉ. राजेंद्र प्रसाद संविधान सभा के अध्यक्ष थे।");

// ================================================================ MATHS (20)
add("Maths", "Simplification", "easy",
  "Simplify: 15 + 18 ÷ 3 × 2 − 4",
  "सरल कीजिए: 15 + 18 ÷ 3 × 2 − 4",
  ["19", "21", "23", "27"], null, "C",
  "BODMAS: 18 ÷ 3 = 6, 6 × 2 = 12, then 15 + 12 − 4 = 23.",
  "BODMAS: 18 ÷ 3 = 6, 6 × 2 = 12, फिर 15 + 12 − 4 = 23।",
  () => 15 + 18 / 3 * 2 - 4 === 23);

add("Maths", "Percentage", "easy",
  "What is 35% of 640?",
  "640 का 35% कितना होता है?",
  ["196", "208", "224", "240"], null, "C",
  "35% of 640 = 640 × 35 / 100 = 224.",
  "640 का 35% = 640 × 35 / 100 = 224।",
  () => 640 * 35 / 100 === 224);

add("Maths", "Ratio & Proportion", "easy",
  "₹2,400 is divided between two persons in the ratio 3 : 5. What is the larger share?",
  "₹2,400 को दो व्यक्तियों में 3 : 5 के अनुपात में बाँटा जाता है। बड़ा हिस्सा कितना है?",
  ["₹1,000", "₹1,200", "₹1,500", "₹1,800"], ["₹1,000", "₹1,200", "₹1,500", "₹1,800"], "C",
  "Total parts = 8, so one part = 2400 / 8 = ₹300. The larger share = 5 × 300 = ₹1,500.",
  "कुल भाग = 8, इसलिए एक भाग = 2400 / 8 = ₹300। बड़ा हिस्सा = 5 × 300 = ₹1,500।",
  () => 2400 / 8 * 5 === 1500);

add("Maths", "Average", "medium",
  "The average of five numbers is 24. If four of them are 20, 22, 26 and 28, what is the fifth number?",
  "पाँच संख्याओं का औसत 24 है। यदि उनमें से चार संख्याएँ 20, 22, 26 और 28 हैं, तो पाँचवीं संख्या क्या है?",
  ["22", "24", "26", "28"], null, "B",
  "Sum of five numbers = 24 × 5 = 120. Sum of four = 96. Fifth = 120 − 96 = 24.",
  "पाँचों का योग = 24 × 5 = 120। चार का योग = 96। पाँचवीं संख्या = 120 − 96 = 24।",
  () => 24 * 5 - (20 + 22 + 26 + 28) === 24);

add("Maths", "Time & Distance", "medium",
  "A train 150 m long crosses a pole in 15 seconds. What is its speed in km/h?",
  "150 मीटर लंबी एक रेलगाड़ी एक खंभे को 15 सेकंड में पार करती है। उसकी चाल किमी/घंटा में क्या है?",
  ["30", "40", "45", "36"], null, "D",
  "Speed = 150 / 15 = 10 m/s = 10 × 18/5 = 36 km/h.",
  "चाल = 150 / 15 = 10 मी/से = 10 × 18/5 = 36 किमी/घंटा।",
  () => 150 / 15 * 18 / 5 === 36);

add("Maths", "Simple Interest", "easy",
  "What is the simple interest on ₹5,000 at 8% per annum for 3 years?",
  "₹5,000 पर 8% वार्षिक दर से 3 वर्ष का साधारण ब्याज कितना होगा?",
  ["₹1,200", "₹1,000", "₹1,500", "₹1,400"], ["₹1,200", "₹1,000", "₹1,500", "₹1,400"], "A",
  "SI = P × R × T / 100 = 5000 × 8 × 3 / 100 = ₹1,200.",
  "साधारण ब्याज = P × R × T / 100 = 5000 × 8 × 3 / 100 = ₹1,200।",
  () => 5000 * 8 * 3 / 100 === 1200);

add("Maths", "Profit & Loss", "easy",
  "An article bought for ₹750 is sold at a profit of 20%. What is the selling price?",
  "₹750 में खरीदी गई एक वस्तु 20% लाभ पर बेची जाती है। विक्रय मूल्य कितना है?",
  ["₹850", "₹875", "₹900", "₹950"], ["₹850", "₹875", "₹900", "₹950"], "C",
  "SP = 750 × 120 / 100 = ₹900.",
  "विक्रय मूल्य = 750 × 120 / 100 = ₹900।",
  () => 750 * 120 / 100 === 900);

add("Maths", "HCF & LCM", "easy",
  "What is the LCM of 12, 15 and 20?",
  "12, 15 और 20 का LCM क्या है?",
  ["30", "60", "90", "120"], null, "B",
  "12 = 2²×3, 15 = 3×5, 20 = 2²×5. LCM = 2² × 3 × 5 = 60.",
  "12 = 2²×3, 15 = 3×5, 20 = 2²×5। LCM = 2² × 3 × 5 = 60।",
  () => { const g = (a, b) => (b ? g(b, a % b) : a); const l = (a, b) => (a / g(a, b)) * b; return l(l(12, 15), 20) === 60; });

add("Maths", "HCF & LCM", "easy",
  "What is the HCF of 36 and 54?",
  "36 और 54 का HCF क्या है?",
  ["6", "9", "12", "18"], null, "D",
  "36 = 2²×3², 54 = 2×3³. HCF = 2 × 3² = 18.",
  "36 = 2²×3², 54 = 2×3³। HCF = 2 × 3² = 18।",
  () => { const g = (a, b) => (b ? g(b, a % b) : a); return g(36, 54) === 18; });

add("Maths", "Time & Work", "medium",
  "A can fill a tank in 12 hours and B can fill it in 18 hours. If both are opened together, in how much time will the tank be filled?",
  "A एक टंकी को 12 घंटे में और B 18 घंटे में भर सकता है। यदि दोनों को एक साथ खोला जाए, तो टंकी कितने समय में भरेगी?",
  ["7 h", "7 h 12 min", "7 h 30 min", "8 h"], ["7 घंटे", "7 घंटे 12 मिनट", "7 घंटे 30 मिनट", "8 घंटे"], "B",
  "Together in one hour: 1/12 + 1/18 = 5/36 of the tank. Time = 36/5 = 7.2 hours = 7 h 12 min.",
  "एक घंटे में: 1/12 + 1/18 = 5/36 टंकी। समय = 36/5 = 7.2 घंटे = 7 घंटे 12 मिनट।",
  () => Math.abs(1 / (1 / 12 + 1 / 18) - 7.2) < 1e-9);

add("Maths", "Mensuration", "easy",
  "The area of a square is 196 cm². What is its perimeter?",
  "एक वर्ग का क्षेत्रफल 196 सेमी² है। उसका परिमाप कितना है?",
  ["28 cm", "49 cm", "56 cm", "64 cm"], ["28 सेमी", "49 सेमी", "56 सेमी", "64 सेमी"], "C",
  "Side = √196 = 14 cm. Perimeter = 4 × 14 = 56 cm.",
  "भुजा = √196 = 14 सेमी। परिमाप = 4 × 14 = 56 सेमी।",
  () => 4 * Math.sqrt(196) === 56);

add("Maths", "Discount", "medium",
  "The marked price of a shirt is ₹800. After a discount of 15%, what is its selling price?",
  "एक कमीज़ का अंकित मूल्य ₹800 है। 15% छूट के बाद उसका विक्रय मूल्य क्या होगा?",
  ["₹650", "₹680", "₹700", "₹720"], ["₹650", "₹680", "₹700", "₹720"], "B",
  "Discount = 15% of 800 = ₹120. Selling price = 800 − 120 = ₹680.",
  "छूट = 800 का 15% = ₹120। विक्रय मूल्य = 800 − 120 = ₹680।",
  () => 800 - 800 * 15 / 100 === 680);

add("Maths", "Ages", "medium",
  "A father is three times as old as his son. If the sum of their ages is 48 years, what is the son's age?",
  "एक पिता की आयु उसके पुत्र की आयु की तीन गुनी है। यदि उन दोनों की आयु का योग 48 वर्ष है, तो पुत्र की आयु क्या है?",
  ["12 years", "10 years", "14 years", "16 years"], ["12 वर्ष", "10 वर्ष", "14 वर्ष", "16 वर्ष"], "A",
  "Let the son's age be x. Then x + 3x = 48, so 4x = 48 and x = 12 years.",
  "माना पुत्र की आयु x है। तब x + 3x = 48, अर्थात 4x = 48 और x = 12 वर्ष।",
  () => 48 / 4 === 12 && 12 * 3 + 12 === 48);

add("Maths", "Simplification", "medium",
  "What is the value of (−3)² + (−2)³?",
  "(−3)² + (−2)³ का मान क्या है?",
  ["1", "−1", "17", "5"], null, "A",
  "(−3)² = 9 and (−2)³ = −8, so 9 + (−8) = 1.",
  "(−3)² = 9 और (−2)³ = −8, इसलिए 9 + (−8) = 1।",
  () => (-3) ** 2 + (-2) ** 3 === 1);

add("Maths", "Time & Distance", "medium",
  "A car travels at 60 km/h for 2.5 hours and then at 40 km/h for 1.5 hours. What is the total distance covered?",
  "एक कार 60 किमी/घंटा की चाल से 2.5 घंटे और फिर 40 किमी/घंटा की चाल से 1.5 घंटे चलती है। कुल दूरी कितनी तय की गई?",
  ["190 km", "200 km", "210 km", "220 km"], ["190 किमी", "200 किमी", "210 किमी", "220 किमी"], "C",
  "Distance = 60 × 2.5 + 40 × 1.5 = 150 + 60 = 210 km.",
  "दूरी = 60 × 2.5 + 40 × 1.5 = 150 + 60 = 210 किमी।",
  () => 60 * 2.5 + 40 * 1.5 === 210);

add("Maths", "Compound Interest", "medium",
  "What is the compound interest on ₹2,000 at 10% per annum for 2 years, compounded annually?",
  "₹2,000 पर 10% वार्षिक दर से 2 वर्ष का चक्रवृद्धि ब्याज (वार्षिक संयोजन) कितना होगा?",
  ["₹400", "₹410", "₹440", "₹420"], ["₹400", "₹410", "₹440", "₹420"], "D",
  "Amount = 2000 × (1.1)² = 2000 × 1.21 = ₹2,420. Compound interest = 2420 − 2000 = ₹420.",
  "मिश्रधन = 2000 × (1.1)² = 2000 × 1.21 = ₹2,420। चक्रवृद्धि ब्याज = 2420 − 2000 = ₹420।",
  () => Math.round(2000 * 1.1 * 1.1 - 2000) === 420);

add("Maths", "Square Roots", "easy",
  "What is the square root of 2025?",
  "2025 का वर्गमूल क्या है?",
  ["35", "45", "55", "65"], null, "B",
  "45 × 45 = 2025, so √2025 = 45.",
  "45 × 45 = 2025, इसलिए √2025 = 45।",
  () => 45 * 45 === 2025);

add("Maths", "Time & Work", "medium",
  "6 men can complete a piece of work in 15 days. In how many days can 9 men complete the same work?",
  "6 आदमी किसी काम को 15 दिन में पूरा कर सकते हैं। उसी काम को 9 आदमी कितने दिन में पूरा करेंगे?",
  ["8 days", "9 days", "10 days", "12 days"], ["8 दिन", "9 दिन", "10 दिन", "12 दिन"], "C",
  "Total work = 6 × 15 = 90 man-days. With 9 men: 90 / 9 = 10 days.",
  "कुल कार्य = 6 × 15 = 90 आदमी-दिन। 9 आदमियों से: 90 / 9 = 10 दिन।",
  () => 6 * 15 / 9 === 10);

add("Maths", "Linear Equations", "easy",
  "If 3x + 7 = 28, what is the value of x?",
  "यदि 3x + 7 = 28 है, तो x का मान क्या है?",
  ["5", "6", "7", "8"], null, "C",
  "3x = 28 − 7 = 21, so x = 7.",
  "3x = 28 − 7 = 21, इसलिए x = 7।",
  () => (28 - 7) / 3 === 7);

add("Maths", "Mensuration", "easy",
  "What is the area of a triangle with base 12 cm and height 9 cm?",
  "आधार 12 सेमी और ऊँचाई 9 सेमी वाले त्रिभुज का क्षेत्रफल कितना है?",
  ["27 cm²", "36 cm²", "48 cm²", "54 cm²"], ["27 सेमी²", "36 सेमी²", "48 सेमी²", "54 सेमी²"], "D",
  "Area = ½ × base × height = ½ × 12 × 9 = 54 cm².",
  "क्षेत्रफल = ½ × आधार × ऊँचाई = ½ × 12 × 9 = 54 सेमी²।",
  () => 0.5 * 12 * 9 === 54);

// ============================================================ GENERAL HINDI (20)
// This section is in Hindi in both languages.
const H = (topic, difficulty, q, opts, correct, sol, check) =>
  add("General Hindi", topic, difficulty, q, q, opts, [...opts], correct, sol, sol, check);

H("संधि", "easy", "'विद्यालय' शब्द का संधि-विच्छेद क्या है?",
  ["विद्या + आलय", "विद + आलय", "विद्या + लय", "वि + द्यालय"], "A",
  "विद्या + आलय में 'आ + आ' मिलकर दीर्घ 'आ' बनाते हैं, इसलिए यह दीर्घ स्वर संधि है: विद्या + आलय = विद्यालय।");

H("संधि", "medium", "'सूर्योदय' में कौन-सी संधि है?",
  ["दीर्घ संधि", "गुण संधि", "वृद्धि संधि", "यण संधि"], "B",
  "सूर्य + उदय = सूर्योदय; यहाँ 'अ + उ' मिलकर 'ओ' बनता है, जो गुण संधि का नियम है।");

H("संधि", "medium", "'नमस्ते' शब्द का संधि-विच्छेद क्या है?",
  ["नम + ते", "नमः + ते", "नमस + ते", "नमा + ते"], "B",
  "नमः + ते = नमस्ते; विसर्ग (ः) के बाद 'त' आने पर विसर्ग 'स्' में बदल जाता है। यह विसर्ग संधि है।");

H("समास", "easy", "'राजपुत्र' में कौन-सा समास है?",
  ["द्वंद्व समास", "तत्पुरुष समास", "कर्मधारय समास", "द्विगु समास"], "B",
  "राजपुत्र = राजा का पुत्र। 'का' (संबंध कारक) का लोप होने से यह तत्पुरुष समास है।");

H("समास", "medium", "'दशानन' (दस हैं आनन जिसके, अर्थात रावण) में कौन-सा समास है?",
  ["तत्पुरुष", "द्विगु", "बहुव्रीहि", "अव्ययीभाव"], "C",
  "इसमें कोई भी पद प्रधान नहीं है; दोनों पद मिलकर तीसरे (रावण) का बोध कराते हैं, इसलिए यह बहुव्रीहि समास है।");

H("समास", "easy", "'यथाशक्ति' में कौन-सा समास है?",
  ["अव्ययीभाव", "द्वंद्व", "कर्मधारय", "बहुव्रीहि"], "A",
  "यथाशक्ति = शक्ति के अनुसार। पहला पद 'यथा' अव्यय है और प्रधान है, इसलिए अव्ययीभाव समास है।");

H("मुहावरे", "easy", "'आँखों का तारा' मुहावरे का अर्थ क्या है?",
  ["बहुत प्यारा", "बहुत दुखी", "बहुत क्रोधित", "बहुत गरीब"], "A",
  "'आँखों का तारा' का अर्थ है बहुत प्यारा या अत्यंत प्रिय व्यक्ति।");

H("मुहावरे", "medium", "'नौ दो ग्यारह होना' मुहावरे का अर्थ क्या है?",
  ["जोड़ लगाना", "भाग जाना", "धनवान होना", "हार जाना"], "B",
  "'नौ दो ग्यारह होना' का अर्थ है चुपचाप भाग जाना या गायब हो जाना।");

H("मुहावरे", "medium", "'आसमान टूट पड़ना' मुहावरे का सही अर्थ है:",
  ["बहुत प्रसन्न होना", "अचानक भारी विपत्ति आना", "ऊँचाई पर चढ़ना", "बहुत मेहनत करना"], "B",
  "'आसमान टूट पड़ना' का अर्थ है अचानक कोई भारी संकट या विपत्ति आ जाना।");

H("लोकोक्ति", "easy", "'अधजल गगरी छलकत जाए' लोकोक्ति का अर्थ क्या है?",
  ["कम ज्ञान वाला अधिक दिखावा करता है", "जो भरा हो वह नहीं छलकता", "पानी की कमी होना", "घड़ा टूट जाना"], "A",
  "आधी भरी गगरी ज़्यादा छलकती है; इसी प्रकार थोड़ा ज्ञान रखने वाला व्यक्ति अधिक दिखावा करता है।");

H("लोकोक्ति", "medium", "'दूध का दूध और पानी का पानी' लोकोक्ति का अर्थ है:",
  ["मिलावट करना", "पूरा-पूरा न्याय होना", "दूध बेचना", "पानी की बर्बादी"], "B",
  "इसका अर्थ है सही-सही और निष्पक्ष न्याय होना, जिसमें सच-झूठ अलग हो जाए।");

H("पर्यायवाची", "easy", "'सूर्य' का पर्यायवाची शब्द कौन-सा नहीं है?",
  ["दिनकर", "भास्कर", "प्रभाकर", "निशाकर"], "D",
  "निशाकर का अर्थ चंद्रमा है; दिनकर, भास्कर और प्रभाकर सूर्य के पर्यायवाची हैं।");

H("पर्यायवाची", "medium", "'कमल' का पर्यायवाची शब्द कौन-सा है?",
  ["जलज", "पवन", "विटप", "भुजंग"], "A",
  "जलज (जल में उत्पन्न होने वाला) कमल का पर्यायवाची है; पवन = हवा, विटप = वृक्ष, भुजंग = साँप।");

H("विलोम शब्द", "easy", "'उत्थान' का विलोम शब्द क्या है?",
  ["उन्नति", "पतन", "विकास", "उदय"], "B",
  "उत्थान (उठना, उन्नति) का विलोम पतन (गिरना) है।");

H("विलोम शब्द", "medium", "'आदि' का विलोम शब्द क्या है?",
  ["मध्य", "अंत", "प्रारंभ", "आरंभ"], "B",
  "आदि (आरंभ) का विलोम अंत (समाप्ति) है; प्रारंभ और आरंभ तो आदि के पर्याय हैं।");

H("अनेकार्थी शब्द", "medium", "'कनक' शब्द के दो अर्थ हैं:",
  ["सोना और धतूरा", "चाँदी और लोहा", "आम और केला", "पानी और हवा"], "A",
  "'कनक' के अर्थ हैं सोना (स्वर्ण) और धतूरा।");

H("शुद्ध वर्तनी", "easy", "इनमें से शुद्ध वर्तनी वाला शब्द कौन-सा है?",
  ["परिक्षा", "परीक्षा", "पारीक्षा", "परिक्शा"], "B",
  "सही शब्द 'परीक्षा' है (प + री + क्षा)।");

H("लिंग", "easy", "'पुस्तक' शब्द का लिंग क्या है?",
  ["पुल्लिंग", "स्त्रीलिंग", "उभयलिंग", "नपुंसकलिंग"], "B",
  "हिंदी में 'पुस्तक' स्त्रीलिंग है (एक पुस्तक, मेरी पुस्तक)।");

H("वचन", "easy", "'लड़की' शब्द का बहुवचन रूप क्या है?",
  ["लड़कीएँ", "लड़कियाँ", "लड़कियों", "लड़कीयाँ"], "B",
  "'लड़की' का बहुवचन 'लड़कियाँ' होता है (ई → ियाँ)।");

H("उपसर्ग-प्रत्यय", "medium", "'अनुशासन' शब्द में उपसर्ग कौन-सा है?",
  ["अ", "अनु", "अन", "शासन"], "B",
  "अनु + शासन = अनुशासन; यहाँ 'अनु' उपसर्ग है।");

// ---------------------------------------------------- balance answer letters
// Swapping the right answer with another option never changes what is asked.
// Skipped where the order carries meaning (ascending numbers, "only I follows").
const orderMatters = (q) =>
  q.topic === "Syllogism" || q.topic === "Venn Diagram" ||
  q.options.every((o) => /^[-−₹]?[d,.]+/.test(o.trim())) ||
  q.options.some((o) => /^(Only|Both|Neither|केवल|न तो|I और)/.test(o.trim()));
const tally = () => { const c = { A: 0, B: 0, C: 0, D: 0 }; Q.forEach((q) => c[q.correct]++); return c; };
for (let pass = 0; pass < 200; pass++) {
  const c = tally();
  const most = Object.keys(c).sort((a, b) => c[b] - c[a])[0];
  const least = Object.keys(c).sort((a, b) => c[a] - c[b])[0];
  if (c[most] - c[least] <= 2) break;
  const q = Q.find((x) => x.correct === most && !orderMatters(x) && !x.__moved);
  if (!q) break;
  const i = L(most), j = L(least);
  [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
  [q.optionsHi[i], q.optionsHi[j]] = [q.optionsHi[j], q.optionsHi[i]];
  q.correct = least; q.__moved = true;
}

// ------------------------------------------------------------------ checks
const want = { Reasoning: 20, GK: 20, Maths: 20, "General Hindi": 20 };
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
  if (q.subject !== "General Hindi" && /[ऀ-ॿ]/.test(q.question + q.options.join("") + q.solution)) errs.push(`Q${n}: Hindi in the English text`);
  if (q.subject === "General Hindi" && !/[ऀ-ॿ]/.test(q.question)) errs.push(`Q${n}: Hindi question has no Hindi`);
});
for (const [s, n] of Object.entries(want)) if (count[s] !== n) errs.push(`${s}: ${count[s] || 0} questions, want ${n}`);
// The same question must not appear twice inside the paper.
const seen = new Set();
Q.forEach((q, i) => { const k = q.question.replace(/\s+/g, " ").toLowerCase(); if (seen.has(k)) errs.push(`Q${i + 1}: repeats an earlier question`); seen.add(k); });
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
  fs.writeFileSync(path.join(__dirname, "ssc-gd-mock2.json"), JSON.stringify(rows, null, 1));
  console.log("Wrote content/ssc-gd-mock2.json");
}
