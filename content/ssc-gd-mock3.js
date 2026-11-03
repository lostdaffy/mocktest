// SSC GD Constable - Mock #3, written by hand (no AI), 2026-11-04.
// Reasoning 20, GK 20, Maths 20, General Hindi 20; every question in both languages.
//   node content/ssc-gd-mock3.js --json
const { add, H, done } = require("./mock-lib")({
  name: "ssc-gd-mock3",
  want: { Reasoning: 20, GK: 20, Maths: 20, "General Hindi": 20 },
  hindiSubjects: ["General Hindi"],
});

// ============================================================ REASONING (20)
add("Reasoning", "Number Series", "easy", "Find the missing number: 3, 8, 15, 24, 35, ?", "लुप्त संख्या ज्ञात कीजिए: 3, 8, 15, 24, 35, ?",
  ["42", "46", "48", "50"], null, "C",
  "The terms are 2²−1, 3²−1, 4²−1, 5²−1, 6²−1, so the next is 7²−1 = 48.",
  "पद 2²−1, 3²−1, 4²−1, 5²−1, 6²−1 हैं, इसलिए अगला पद 7²−1 = 48 है।",
  () => [3, 8, 15, 24, 35].every((v, i) => v === (i + 2) ** 2 - 1) && 7 ** 2 - 1 === 48);

add("Reasoning", "Number Series", "medium", "Find the missing number: 120, 99, 80, 63, 48, ?", "लुप्त संख्या ज्ञात कीजिए: 120, 99, 80, 63, 48, ?",
  ["33", "35", "36", "38"], null, "B",
  "The differences are 21, 19, 17, 15, so the next difference is 13. Hence 48 − 13 = 35.",
  "अंतर 21, 19, 17, 15 हैं, इसलिए अगला अंतर 13 होगा। अतः 48 − 13 = 35।",
  () => 120 - 21 === 99 && 99 - 19 === 80 && 80 - 17 === 63 && 63 - 15 === 48 && 48 - 13 === 35);

add("Reasoning", "Letter Series", "easy", "Find the next letter in the series: B, E, H, K, N, ?", "श्रृंखला का अगला अक्षर ज्ञात कीजिए: B, E, H, K, N, ?",
  ["P", "Q", "R", "S"], null, "B",
  "Each letter moves 3 places forward: B, E, H, K, N, then Q.",
  "प्रत्येक अक्षर 3 स्थान आगे बढ़ता है: B, E, H, K, N, फिर Q।",
  () => String.fromCharCode("N".charCodeAt(0) + 3) === "Q");

add("Reasoning", "Letter Series", "medium", "Find the next group in the series: AB, DE, GH, JK, ?", "श्रृंखला का अगला समूह ज्ञात कीजिए: AB, DE, GH, JK, ?",
  ["LM", "MN", "NO", "MO"], null, "B",
  "Each group moves 3 letters forward: AB, DE, GH, JK, then MN.",
  "प्रत्येक समूह 3 अक्षर आगे बढ़ता है: AB, DE, GH, JK, फिर MN।",
  () => String.fromCharCode("J".charCodeAt(0) + 3) + String.fromCharCode("K".charCodeAt(0) + 3) === "MN");

add("Reasoning", "Coding-Decoding", "easy", "If APPLE is coded as BQQMF, how is MANGO coded?", "यदि APPLE को BQQMF लिखा जाता है, तो MANGO को कैसे लिखा जाएगा?",
  ["NBOHP", "NBNHP", "LZMFN", "NBOGP"], null, "A",
  "Each letter is moved one place forward: M→N, A→B, N→O, G→H, O→P, giving NBOHP.",
  "प्रत्येक अक्षर एक स्थान आगे है: M→N, A→B, N→O, G→H, O→P, यानी NBOHP।",
  () => [..."APPLE"].map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join("") === "BQQMF" && [..."MANGO"].map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join("") === "NBOHP");

add("Reasoning", "Coding-Decoding", "hard", "In a code, FAN is written as UZM. How will RED be written in that code?", "एक कूट में FAN को UZM लिखा जाता है। उसी कूट में RED को कैसे लिखा जाएगा?",
  ["IVW", "IWV", "HVW", "IVX"], null, "A",
  "Each letter is replaced by its opposite letter in the alphabet (A↔Z, B↔Y ...), i.e. position p becomes 27 − p. R→I, E→V, D→W, so RED is IVW.",
  "प्रत्येक अक्षर को वर्णमाला में उसके विपरीत अक्षर से बदला गया है (A↔Z, B↔Y ...), यानी स्थान p की जगह 27 − p। R→I, E→V, D→W, इसलिए RED = IVW।",
  () => { const f = (s) => [...s].map((c) => String.fromCharCode(64 + 27 - (c.charCodeAt(0) - 64))).join(""); return f("FAN") === "UZM" && f("RED") === "IVW"; });

add("Reasoning", "Analogy", "easy", "Bird : Nest :: Bee : ?", "पक्षी : घोंसला :: मधुमक्खी : ?",
  ["Hive", "Honey", "Flower", "Wax"], ["छत्ता", "शहद", "फूल", "मोम"], "A",
  "A bird lives in a nest; in the same way a bee lives in a hive.",
  "पक्षी घोंसले में रहता है; उसी प्रकार मधुमक्खी छत्ते में रहती है।");

add("Reasoning", "Analogy", "medium", "5 : 30 :: 7 : ?", "5 : 30 :: 7 : ?",
  ["42", "49", "56", "63"], null, "C",
  "30 = 5 × 6, so each number is multiplied by the next number: 7 × 8 = 56.",
  "30 = 5 × 6, अर्थात संख्या को उसकी अगली संख्या से गुणा किया गया है: 7 × 8 = 56।",
  () => 5 * 6 === 30 && 7 * 8 === 56);

add("Reasoning", "Odd One Out", "easy", "Select the odd one out.", "विषम का चयन कीजिए।",
  ["Tiger", "Lion", "Leopard", "Cow"], ["बाघ", "शेर", "तेंदुआ", "गाय"], "D",
  "Tiger, lion and leopard are flesh-eating wild cats; the cow is a plant-eating domestic animal.",
  "बाघ, शेर और तेंदुआ मांसाहारी जंगली बिल्ली-प्रजाति के जीव हैं; गाय शाकाहारी पालतू पशु है।");

add("Reasoning", "Odd One Out", "medium", "Select the odd number: 8, 27, 64, 100", "विषम संख्या चुनिए: 8, 27, 64, 100",
  ["8", "27", "64", "100"], null, "D",
  "8 = 2³, 27 = 3³ and 64 = 4³ are perfect cubes; 100 is not.",
  "8 = 2³, 27 = 3³ और 64 = 4³ पूर्ण घन हैं; 100 पूर्ण घन नहीं है।",
  () => [8, 27, 64].every((n) => Number.isInteger(Math.cbrt(n))) && !Number.isInteger(Math.cbrt(100)));

add("Reasoning", "Direction Sense", "medium", "Meena goes 4 km south from her home and then 3 km west. How far is she from her home?", "मीना अपने घर से 4 किमी दक्षिण की ओर जाती है और फिर 3 किमी पश्चिम की ओर। वह अपने घर से कितनी दूर है?",
  ["5 km", "6 km", "7 km", "1 km"], ["5 किमी", "6 किमी", "7 किमी", "1 किमी"], "A",
  "The two legs are at right angles, so the distance = √(4² + 3²) = √25 = 5 km.",
  "दोनों रास्ते समकोण पर हैं, इसलिए दूरी = √(4² + 3²) = √25 = 5 किमी।",
  () => Math.hypot(4, 3) === 5);

add("Reasoning", "Direction Sense", "medium", "Facing east, Arun turns right, then left, then left again. Which direction is he facing now?", "पूर्व की ओर मुँह करके खड़ा अरुण दाएँ मुड़ता है, फिर बाएँ, फिर दोबारा बाएँ। अब उसका मुँह किस दिशा में है?",
  ["East", "South", "West", "North"], ["पूर्व", "दक्षिण", "पश्चिम", "उत्तर"], "D",
  "East → right turn: South → left turn: East → left turn: North.",
  "पूर्व → दाएँ: दक्षिण → बाएँ: पूर्व → बाएँ: उत्तर।",
  () => { const d = ["N", "E", "S", "W"]; let i = 1; i = (i + 1) % 4; i = (i + 3) % 4; i = (i + 3) % 4; return d[i] === "N"; });

add("Reasoning", "Blood Relations", "medium", "A is the sister of B. C is the mother of B. D is the father of C. How is A related to D?", "A, B की बहन है। C, B की माँ है। D, C का पिता है। A का D से क्या संबंध है?",
  ["Daughter", "Granddaughter", "Niece", "Sister"], ["पुत्री", "पोती/नातिन", "भतीजी", "बहन"], "B",
  "A and B are siblings, so C is also A's mother. D is C's father, so D is A's maternal grandfather, which makes A his granddaughter.",
  "A और B भाई-बहन हैं, इसलिए C, A की भी माँ है। D, C का पिता है, अतः D, A का नाना है और A उसकी नातिन है।");

add("Reasoning", "Blood Relations", "hard", "Pointing to a girl, Rahul said, \"She is the daughter of my father's only son.\" How is the girl related to Rahul?", "एक लड़की की ओर संकेत करके राहुल ने कहा, \"वह मेरे पिता के इकलौते पुत्र की पुत्री है।\" वह लड़की राहुल की क्या लगती है?",
  ["Sister", "Cousin", "Niece", "Daughter"], ["बहन", "चचेरी बहन", "भतीजी", "पुत्री"], "D",
  "Rahul's father's only son is Rahul himself. So the girl is Rahul's daughter.",
  "राहुल के पिता का इकलौता पुत्र स्वयं राहुल है। इसलिए वह लड़की राहुल की पुत्री है।");

add("Reasoning", "Ranking", "medium", "Ritu ranks 7th from the top and 18th from the bottom in a class. How many students are there in the class?", "एक कक्षा में ऋतु ऊपर से 7वें और नीचे से 18वें स्थान पर है। कक्षा में कुल कितने विद्यार्थी हैं?",
  ["23", "24", "25", "26"], null, "B",
  "Total = 7 + 18 − 1 = 24.",
  "कुल = 7 + 18 − 1 = 24।",
  () => 7 + 18 - 1 === 24);

add("Reasoning", "Calendar", "medium", "If today is Wednesday, what day of the week will it be after 45 days?", "यदि आज बुधवार है, तो 45 दिन बाद सप्ताह का कौन-सा दिन होगा?",
  ["Friday", "Saturday", "Sunday", "Monday"], ["शुक्रवार", "शनिवार", "रविवार", "सोमवार"], "B",
  "45 = 6 weeks + 3 days, so the day is 3 days after Wednesday, which is Saturday.",
  "45 = 6 सप्ताह + 3 दिन, इसलिए दिन बुधवार से 3 दिन आगे, यानी शनिवार होगा।",
  () => (3 + 45) % 7 === 6); // Wed=3 ... Sat=6

add("Reasoning", "Clock", "medium", "How many times do the hands of a clock coincide in 12 hours?", "12 घंटे में घड़ी की सुइयाँ कितनी बार एक-दूसरे को ढकती हैं?",
  ["10", "11", "12", "13"], null, "B",
  "The hands coincide 11 times in 12 hours (the 11th overlap is at 12 o'clock itself).",
  "12 घंटे में घड़ी की सुइयाँ 11 बार एक-दूसरे को ढकती हैं (11वीं बार 12 बजे ही होता है)।",
  () => 11 === 12 - 1);

add("Reasoning", "Number Series", "medium", "Find the next number: 2, 3, 5, 7, 11, ?", "अगली संख्या ज्ञात कीजिए: 2, 3, 5, 7, 11, ?",
  ["12", "13", "14", "15"], null, "B",
  "These are the prime numbers in order; the next prime after 11 is 13.",
  "ये क्रमागत अभाज्य संख्याएँ हैं; 11 के बाद अगली अभाज्य संख्या 13 है।",
  () => { const p = (n) => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return n > 1; }; return !p(12) && p(13); });

add("Reasoning", "Alphabet Test", "easy", "How many letters are there between R and V in the English alphabet?", "अंग्रेज़ी वर्णमाला में R और V के बीच कितने अक्षर हैं?",
  ["2", "3", "4", "5"], null, "B",
  "The letters between R and V are S, T and U, which makes 3.",
  "R और V के बीच के अक्षर S, T और U हैं, यानी 3।",
  () => "V".charCodeAt(0) - "R".charCodeAt(0) - 1 === 3);

add("Reasoning", "Syllogism", "medium", "Statements: Some cats are dogs. All dogs are birds.\nConclusions: I. Some cats are birds. II. All birds are dogs.",
  "कथन: कुछ बिल्लियाँ कुत्ते हैं। सभी कुत्ते पक्षी हैं।\nनिष्कर्ष: I. कुछ बिल्लियाँ पक्षी हैं। II. सभी पक्षी कुत्ते हैं।",
  ["Only conclusion I follows", "Only conclusion II follows", "Both I and II follow", "Neither I nor II follows"],
  ["केवल निष्कर्ष I अनुसरण करता है", "केवल निष्कर्ष II अनुसरण करता है", "I और II दोनों अनुसरण करते हैं", "न तो I और न ही II अनुसरण करता है"], "A",
  "The cats that are dogs are also birds (dogs ⊂ birds), so I follows. Nothing says every bird is a dog, so II does not follow.",
  "जो बिल्लियाँ कुत्ते हैं वे पक्षी भी हैं (कुत्ते ⊂ पक्षी), इसलिए I सही है। यह नहीं कहा गया कि हर पक्षी कुत्ता है, इसलिए II सही नहीं है।");

// ================================================================== GK (20)
add("GK", "Indian Polity", "medium", "The Fundamental Duties were added to the Indian Constitution by which Amendment?", "भारतीय संविधान में मूल कर्तव्य किस संशोधन द्वारा जोड़े गए?",
  ["42nd Amendment", "44th Amendment", "52nd Amendment", "61st Amendment"], ["42वें संशोधन", "44वें संशोधन", "52वें संशोधन", "61वें संशोधन"], "A",
  "The 42nd Amendment (1976) added the Fundamental Duties (Part IV-A, Article 51A) on the recommendation of the Swaran Singh Committee.",
  "42वें संशोधन (1976) ने स्वर्ण सिंह समिति की सिफ़ारिश पर मूल कर्तव्य (भाग IV-क, अनुच्छेद 51क) जोड़े।");

add("GK", "Indian Polity", "easy", "Who appoints the Governor of a state in India?", "भारत में किसी राज्य के राज्यपाल की नियुक्ति कौन करता है?",
  ["Chief Minister", "Prime Minister", "President", "Chief Justice of the High Court"], ["मुख्यमंत्री", "प्रधानमंत्री", "राष्ट्रपति", "उच्च न्यायालय के मुख्य न्यायाधीश"], "C",
  "The Governor is appointed by the President of India (Article 155).",
  "राज्यपाल की नियुक्ति भारत के राष्ट्रपति करते हैं (अनुच्छेद 155)।");

add("GK", "Indian Polity", "medium", "Which Article of the Constitution deals with the Annual Financial Statement (Budget)?", "संविधान का कौन-सा अनुच्छेद वार्षिक वित्तीय विवरण (बजट) से संबंधित है?",
  ["Article 110", "Article 112", "Article 115", "Article 123"], ["अनुच्छेद 110", "अनुच्छेद 112", "अनुच्छेद 115", "अनुच्छेद 123"], "B",
  "Article 112 requires the President to lay the Annual Financial Statement before Parliament each year.",
  "अनुच्छेद 112 के अनुसार राष्ट्रपति प्रत्येक वर्ष संसद के समक्ष वार्षिक वित्तीय विवरण रखवाते हैं।");

add("GK", "Indian History", "easy", "Who built the Red Fort in Delhi?", "दिल्ली का लाल किला किसने बनवाया?",
  ["Akbar", "Shah Jahan", "Humayun", "Aurangzeb"], ["अकबर", "शाहजहाँ", "हुमायूँ", "औरंगज़ेब"], "B",
  "The Red Fort was built by the Mughal emperor Shah Jahan; construction began in 1638.",
  "लाल किला मुग़ल बादशाह शाहजहाँ ने बनवाया; इसका निर्माण 1638 में शुरू हुआ।");

add("GK", "Indian History", "easy", "In which year did the Jallianwala Bagh massacre take place?", "जलियाँवाला बाग हत्याकांड किस वर्ष हुआ था?",
  ["1915", "1919", "1921", "1930"], null, "B",
  "The massacre took place on 13 April 1919 in Amritsar, under the orders of General Dyer.",
  "यह हत्याकांड 13 अप्रैल 1919 को अमृतसर में जनरल डायर के आदेश पर हुआ।");

add("GK", "Indian History", "medium", "Who was the first Governor-General of independent India?", "स्वतंत्र भारत के पहले गवर्नर-जनरल कौन थे?",
  ["C. Rajagopalachari", "Lord Mountbatten", "Lord Curzon", "Lord Dalhousie"], ["सी. राजगोपालाचारी", "लॉर्ड माउंटबेटन", "लॉर्ड कर्ज़न", "लॉर्ड डलहौज़ी"], "B",
  "Lord Mountbatten was the first Governor-General of independent India (1947-48); C. Rajagopalachari was the first Indian and the last Governor-General.",
  "लॉर्ड माउंटबेटन स्वतंत्र भारत के पहले गवर्नर-जनरल थे (1947-48); सी. राजगोपालाचारी पहले भारतीय और अंतिम गवर्नर-जनरल थे।");

add("GK", "Indian History", "easy", "Who wrote the national song 'Vande Mataram'?", "राष्ट्रीय गीत 'वंदे मातरम्' किसने लिखा?",
  ["Rabindranath Tagore", "Bankim Chandra Chattopadhyay", "Sarojini Naidu", "Iqbal"], ["रवींद्रनाथ टैगोर", "बंकिमचंद्र चट्टोपाध्याय", "सरोजिनी नायडू", "इक़बाल"], "B",
  "Bankim Chandra Chattopadhyay wrote 'Vande Mataram', which appeared in his novel Anandamath (1882).",
  "बंकिमचंद्र चट्टोपाध्याय ने 'वंदे मातरम्' लिखा, जो उनके उपन्यास आनंदमठ (1882) में आया।");

add("GK", "World Geography", "easy", "Which is the largest ocean in the world?", "विश्व का सबसे बड़ा महासागर कौन-सा है?",
  ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"], ["अटलांटिक महासागर", "हिंद महासागर", "आर्कटिक महासागर", "प्रशांत महासागर"], "D",
  "The Pacific Ocean is the largest and deepest ocean, covering about one-third of the Earth's surface.",
  "प्रशांत महासागर सबसे बड़ा और सबसे गहरा महासागर है; यह पृथ्वी की सतह के लगभग एक-तिहाई भाग को घेरता है।");

add("GK", "Indian Geography", "medium", "Which is the highest mountain peak located entirely within India?", "पूरी तरह भारत के भीतर स्थित सबसे ऊँची पर्वत चोटी कौन-सी है?",
  ["K2", "Kangchenjunga", "Nanda Devi", "Mount Everest"], ["K2", "कंचनजंगा", "नंदा देवी", "माउंट एवरेस्ट"], "B",
  "Kangchenjunga (8,586 m) in Sikkim is the highest peak in India. K2 lies in the Pakistan-administered region and Everest on the Nepal-China border.",
  "सिक्किम में स्थित कंचनजंगा (8,586 मी) भारत की सबसे ऊँची चोटी है। K2 पाकिस्तान-प्रशासित क्षेत्र में और एवरेस्ट नेपाल-चीन सीमा पर है।");

add("GK", "Indian Geography", "medium", "The Hirakud Dam is built on which river?", "हीराकुड बाँध किस नदी पर बना है?",
  ["Mahanadi", "Godavari", "Krishna", "Narmada"], ["महानदी", "गोदावरी", "कृष्णा", "नर्मदा"], "A",
  "The Hirakud Dam in Odisha is built across the Mahanadi river.",
  "ओडिशा का हीराकुड बाँध महानदी पर बना है।");

add("GK", "Indian Geography", "easy", "Which is the largest hot desert of India?", "भारत का सबसे बड़ा गर्म मरुस्थल कौन-सा है?",
  ["Thar Desert", "Rann of Kutch", "Cold Desert of Ladakh", "Deccan Plateau"], ["थार मरुस्थल", "कच्छ का रण", "लद्दाख का ठंडा मरुस्थल", "दक्कन पठार"], "A",
  "The Thar Desert, mostly in Rajasthan, is the largest hot desert in India.",
  "थार मरुस्थल, जो अधिकांशतः राजस्थान में है, भारत का सबसे बड़ा गर्म मरुस्थल है।");

add("GK", "Science", "easy", "Which gas is used in fire extinguishers?", "अग्निशामकों में कौन-सी गैस प्रयोग की जाती है?",
  ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen peroxide"], ["ऑक्सीजन", "हाइड्रोजन", "कार्बन डाइऑक्साइड", "नाइट्रोजन परॉक्साइड"], "C",
  "Carbon dioxide does not support burning and is heavier than air, so it smothers a fire.",
  "कार्बन डाइऑक्साइड दहन में सहायक नहीं है और हवा से भारी है, इसलिए यह आग को ढक देती है।");

add("GK", "Science", "easy", "What is the SI unit of electric current?", "विद्युत धारा का SI मात्रक क्या है?",
  ["Volt", "Ohm", "Ampere", "Watt"], ["वोल्ट", "ओम", "एम्पियर", "वाट"], "C",
  "Electric current is measured in amperes (A).",
  "विद्युत धारा को एम्पियर (A) में मापा जाता है।");

add("GK", "Science", "medium", "Which is the smallest bone in the human body?", "मानव शरीर की सबसे छोटी हड्डी कौन-सी है?",
  ["Femur", "Stapes", "Radius", "Patella"], ["जाँघ की हड्डी (फीमर)", "स्टेपीज़ (कान की हड्डी)", "रेडियस", "घुटने की हड्डी"], "B",
  "The stapes, a tiny bone in the middle ear, is the smallest bone in the body (about 3 mm).",
  "मध्य कान की छोटी हड्डी स्टेपीज़ शरीर की सबसे छोटी हड्डी है (लगभग 3 मिमी)।");

add("GK", "Science", "medium", "Which blood group is known as the universal donor?", "कौन-सा रक्त समूह सर्वदाता (यूनिवर्सल डोनर) कहलाता है?",
  ["AB positive", "A negative", "B positive", "O negative"], ["AB धनात्मक", "A ऋणात्मक", "B धनात्मक", "O ऋणात्मक"], "D",
  "O negative red cells carry no A, B or Rh antigens, so they can be given to almost any patient.",
  "O ऋणात्मक रक्त कोशिकाओं में A, B या Rh प्रतिजन नहीं होते, इसलिए इसे लगभग हर रोगी को दिया जा सकता है।");

add("GK", "Economy", "medium", "Who is known as the 'Father of the Green Revolution in India'?", "'भारत में हरित क्रांति के जनक' के रूप में किसे जाना जाता है?",
  ["Verghese Kurien", "M. S. Swaminathan", "Homi Bhabha", "Vikram Sarabhai"], ["वर्गीज़ कुरियन", "एम. एस. स्वामीनाथन", "होमी भाभा", "विक्रम साराभाई"], "B",
  "M. S. Swaminathan led the Green Revolution in India. Verghese Kurien is the 'Father of the White Revolution'.",
  "एम. एस. स्वामीनाथन ने भारत में हरित क्रांति का नेतृत्व किया। वर्गीज़ कुरियन 'श्वेत क्रांति के जनक' हैं।");

add("GK", "Static GK", "easy", "The Konark Sun Temple is located in which state?", "कोणार्क सूर्य मंदिर किस राज्य में स्थित है?",
  ["Tamil Nadu", "Andhra Pradesh", "Odisha", "Karnataka"], ["तमिलनाडु", "आंध्र प्रदेश", "ओडिशा", "कर्नाटक"], "C",
  "The Konark Sun Temple, a UNESCO World Heritage Site, is in Odisha.",
  "यूनेस्को विश्व धरोहर स्थल कोणार्क सूर्य मंदिर ओडिशा में है।");

add("GK", "Static GK", "medium", "The headquarters of the Assam Rifles is located at:", "असम राइफल्स का मुख्यालय कहाँ स्थित है?",
  ["Guwahati", "Imphal", "Shillong", "Kohima"], ["गुवाहाटी", "इम्फाल", "शिलांग", "कोहिमा"], "C",
  "The Director General's headquarters of the Assam Rifles is at Laitkor, Shillong (Meghalaya).",
  "असम राइफल्स के महानिदेशक का मुख्यालय लाइतकोर, शिलांग (मेघालय) में है।");

add("GK", "Sports", "easy", "After how many years are the Summer Olympic Games held?", "ग्रीष्मकालीन ओलंपिक खेल कितने वर्षों के बाद होते हैं?",
  ["2 years", "3 years", "4 years", "5 years"], ["2 वर्ष", "3 वर्ष", "4 वर्ष", "5 वर्ष"], "C",
  "The Summer Olympic Games are held every four years, that is, after 4 years.",
  "ग्रीष्मकालीन ओलंपिक खेल हर चार वर्ष में होते हैं।");

add("GK", "Indian Geography", "easy", "Which Indian state has the highest literacy rate according to the 2011 Census?", "2011 की जनगणना के अनुसार भारत के किस राज्य की साक्षरता दर सबसे अधिक है?",
  ["Goa", "Mizoram", "Kerala", "Himachal Pradesh"], ["गोवा", "मिज़ोरम", "केरल", "हिमाचल प्रदेश"], "C",
  "Kerala had the highest literacy rate among the states in the 2011 Census (about 94%).",
  "2011 की जनगणना में राज्यों में केरल की साक्षरता दर सबसे अधिक (लगभग 94%) थी।");

// ================================================================ MATHS (20)
add("Maths", "Simplification", "easy", "Simplify: 144 ÷ 12 + 8 × 3 − 10", "सरल कीजिए: 144 ÷ 12 + 8 × 3 − 10",
  ["24", "26", "28", "34"], null, "B", "BODMAS: 144 ÷ 12 = 12 and 8 × 3 = 24, so 12 + 24 − 10 = 26.", "BODMAS: 144 ÷ 12 = 12 और 8 × 3 = 24, इसलिए 12 + 24 − 10 = 26।",
  () => 144 / 12 + 8 * 3 - 10 === 26);

add("Maths", "Percentage", "easy", "What is 12.5% of 480?", "480 का 12.5% कितना होता है?",
  ["50", "60", "64", "72"], null, "B", "12.5% = 1/8, and 480 / 8 = 60.", "12.5% = 1/8, और 480 / 8 = 60।",
  () => 480 * 12.5 / 100 === 60);

add("Maths", "Ratio & Proportion", "medium", "The ratio of boys to girls in a class is 4 : 5. If there are 54 students in all, how many are girls?", "एक कक्षा में लड़कों और लड़कियों का अनुपात 4 : 5 है। यदि कुल 54 विद्यार्थी हैं, तो लड़कियाँ कितनी हैं?",
  ["24", "28", "30", "36"], null, "C", "Total parts = 9, so one part = 54 / 9 = 6. Girls = 5 × 6 = 30.", "कुल भाग = 9, इसलिए एक भाग = 54 / 9 = 6। लड़कियाँ = 5 × 6 = 30।",
  () => 54 / 9 * 5 === 30);

add("Maths", "Average", "easy", "What is the average of the first 10 natural numbers?", "पहली 10 प्राकृत संख्याओं का औसत क्या है?",
  ["5", "5.5", "6", "6.5"], null, "B", "Sum = 10 × 11 / 2 = 55, so the average = 55 / 10 = 5.5.", "योग = 10 × 11 / 2 = 55, इसलिए औसत = 55 / 10 = 5.5।",
  () => (10 * 11 / 2) / 10 === 5.5);

add("Maths", "Time & Distance", "easy", "Convert a speed of 72 km/h into m/s.", "72 किमी/घंटा की चाल को मी/से में बदलिए।",
  ["15 m/s", "18 m/s", "20 m/s", "25 m/s"], ["15 मी/से", "18 मी/से", "20 मी/से", "25 मी/से"], "C", "72 × 5/18 = 20 m/s.", "72 × 5/18 = 20 मी/से।",
  () => 72 * 5 / 18 === 20);

add("Maths", "Simple Interest", "medium", "A sum of money doubles itself in 10 years at simple interest. What is the rate of interest per annum?", "साधारण ब्याज पर कोई धनराशि 10 वर्ष में दोगुनी हो जाती है। वार्षिक ब्याज दर क्या है?",
  ["5%", "8%", "10%", "12%"], null, "C", "Interest = principal in 10 years, so rate = 100 / 10 = 10% per annum.", "10 वर्ष में ब्याज = मूलधन, इसलिए दर = 100 / 10 = 10% वार्षिक।",
  () => 100 * 1 / 10 === 10);

add("Maths", "Profit & Loss", "medium", "An article costing ₹400 is sold for ₹340. What is the loss percentage?", "₹400 में खरीदी गई वस्तु ₹340 में बेची जाती है। हानि प्रतिशत क्या है?",
  ["10%", "12%", "15%", "18%"], null, "C", "Loss = 400 − 340 = ₹60, so loss % = 60 / 400 × 100 = 15%.", "हानि = 400 − 340 = ₹60, इसलिए हानि % = 60 / 400 × 100 = 15%।",
  () => (400 - 340) / 400 * 100 === 15);

add("Maths", "HCF & LCM", "medium", "The HCF of two numbers is 6 and their LCM is 180. If one number is 30, what is the other number?", "दो संख्याओं का HCF 6 और LCM 180 है। यदि एक संख्या 30 है, तो दूसरी संख्या क्या है?",
  ["32", "36", "40", "45"], null, "B", "Product of the numbers = HCF × LCM = 6 × 180 = 1080. Other number = 1080 / 30 = 36.", "संख्याओं का गुणनफल = HCF × LCM = 6 × 180 = 1080। दूसरी संख्या = 1080 / 30 = 36।",
  () => 6 * 180 / 30 === 36);

add("Maths", "Time & Work", "medium", "A can do a piece of work in 10 days and B in 15 days. Working together, in how many days will they finish it?", "A किसी काम को 10 दिन में और B 15 दिन में कर सकता है। साथ काम करने पर वे उसे कितने दिन में पूरा करेंगे?",
  ["5 days", "6 days", "7 days", "8 days"], ["5 दिन", "6 दिन", "7 दिन", "8 दिन"], "B", "Together in one day: 1/10 + 1/15 = 1/6 of the work, so they take 6 days.", "एक दिन में: 1/10 + 1/15 = 1/6 काम, इसलिए वे 6 दिन में पूरा करेंगे।",
  () => Math.abs(1 / (1 / 10 + 1 / 15) - 6) < 1e-9);

add("Maths", "Mensuration", "easy", "What is the circumference of a circle of radius 7 cm? (Take π = 22/7)", "7 सेमी त्रिज्या वाले वृत्त की परिधि क्या है? (π = 22/7 लें)",
  ["22 cm", "44 cm", "88 cm", "154 cm"], ["22 सेमी", "44 सेमी", "88 सेमी", "154 सेमी"], "B", "Circumference = 2πr = 2 × 22/7 × 7 = 44 cm.", "परिधि = 2πr = 2 × 22/7 × 7 = 44 सेमी।",
  () => 2 * (22 / 7) * 7 === 44);

add("Maths", "Mensuration", "medium", "The length and breadth of a rectangle are 15 cm and 8 cm. What is the length of its diagonal?", "एक आयत की लंबाई और चौड़ाई 15 सेमी और 8 सेमी है। उसका विकर्ण कितना लंबा है?",
  ["16 cm", "17 cm", "18 cm", "23 cm"], ["16 सेमी", "17 सेमी", "18 सेमी", "23 सेमी"], "B", "Diagonal = √(15² + 8²) = √(225 + 64) = √289 = 17 cm.", "विकर्ण = √(15² + 8²) = √(225 + 64) = √289 = 17 सेमी।",
  () => Math.hypot(15, 8) === 17);

add("Maths", "Percentage", "easy", "The price of an item rises from ₹250 to ₹300. What is the percentage increase?", "किसी वस्तु का मूल्य ₹250 से बढ़कर ₹300 हो जाता है। प्रतिशत वृद्धि कितनी है?",
  ["10%", "15%", "20%", "25%"], null, "C", "Increase = 50, so the percentage increase = 50 / 250 × 100 = 20%.", "वृद्धि = 50, इसलिए प्रतिशत वृद्धि = 50 / 250 × 100 = 20%।",
  () => (300 - 250) / 250 * 100 === 20);

add("Maths", "Discount", "hard", "Two successive discounts of 10% and 20% are equal to a single discount of:", "10% और 20% की दो क्रमिक छूटें किस एकल छूट के बराबर हैं?",
  ["28%", "30%", "25%", "32%"], null, "A", "Net price = 100 × 0.9 × 0.8 = 72, so the single discount = 100 − 72 = 28%.", "शुद्ध मूल्य = 100 × 0.9 × 0.8 = 72, इसलिए एकल छूट = 100 − 72 = 28%।",
  () => Math.round(100 - 100 * 0.9 * 0.8) === 28);

add("Maths", "Number System", "medium", "What is the sum of the first 20 odd natural numbers?", "पहली 20 विषम प्राकृत संख्याओं का योग क्या है?",
  ["200", "360", "400", "420"], null, "C", "The sum of the first n odd numbers is n², so for n = 20 it is 400.", "पहली n विषम संख्याओं का योग n² होता है, इसलिए n = 20 के लिए योग 400 है।",
  () => Array.from({ length: 20 }, (_, i) => 2 * i + 1).reduce((a, b) => a + b, 0) === 400);

add("Maths", "Algebra", "hard", "If x + 1/x = 5, what is the value of x² + 1/x²?", "यदि x + 1/x = 5 है, तो x² + 1/x² का मान क्या है?",
  ["21", "23", "25", "27"], null, "B", "Square both sides: x² + 2 + 1/x² = 25, so x² + 1/x² = 23.", "दोनों पक्षों का वर्ग करने पर: x² + 2 + 1/x² = 25, इसलिए x² + 1/x² = 23।",
  () => 5 * 5 - 2 === 23);

add("Maths", "Simplification", "medium", "What is the value of 0.6 × 0.5 ÷ 0.2?", "0.6 × 0.5 ÷ 0.2 का मान क्या है?",
  ["0.15", "1.5", "15", "0.5"], null, "B", "0.6 × 0.5 = 0.3, and 0.3 ÷ 0.2 = 1.5.", "0.6 × 0.5 = 0.3, और 0.3 ÷ 0.2 = 1.5।",
  () => Math.abs(0.6 * 0.5 / 0.2 - 1.5) < 1e-9);

add("Maths", "Ratio & Proportion", "medium", "The sum of the ages of A and B is 56 years, and their ages are in the ratio 3 : 4. What is B's age?", "A और B की आयु का योग 56 वर्ष है और उनकी आयु का अनुपात 3 : 4 है। B की आयु क्या है?",
  ["24 years", "28 years", "30 years", "32 years"], ["24 वर्ष", "28 वर्ष", "30 वर्ष", "32 वर्ष"], "D", "Total parts = 7, so one part = 56 / 7 = 8. B = 4 × 8 = 32 years.", "कुल भाग = 7, इसलिए एक भाग = 56 / 7 = 8। B = 4 × 8 = 32 वर्ष।",
  () => 56 / 7 * 4 === 32);

add("Maths", "Mensuration", "medium", "A tank is 4 m long, 3 m wide and 2 m deep. How many litres of water can it hold? (1 m³ = 1000 litres)", "एक टंकी 4 मी लंबी, 3 मी चौड़ी और 2 मी गहरी है। उसमें कितने लीटर पानी आ सकता है? (1 मी³ = 1000 लीटर)",
  ["12,000", "18,000", "24,000", "36,000"], ["12,000", "18,000", "24,000", "36,000"], "C", "Volume = 4 × 3 × 2 = 24 m³ = 24 × 1000 = 24,000 litres.", "आयतन = 4 × 3 × 2 = 24 मी³ = 24 × 1000 = 24,000 लीटर।",
  () => 4 * 3 * 2 * 1000 === 24000);

add("Maths", "Time & Distance", "easy", "A man covers 120 km in 2 hours 30 minutes. What is his average speed?", "एक आदमी 120 किमी की दूरी 2 घंटे 30 मिनट में तय करता है। उसकी औसत चाल क्या है?",
  ["40 km/h", "45 km/h", "48 km/h", "50 km/h"], ["40 किमी/घंटा", "45 किमी/घंटा", "48 किमी/घंटा", "50 किमी/घंटा"], "C", "Speed = 120 / 2.5 = 48 km/h.", "चाल = 120 / 2.5 = 48 किमी/घंटा।",
  () => 120 / 2.5 === 48);

add("Maths", "Mensuration", "easy", "What is the volume of a cube of side 9 cm?", "9 सेमी भुजा वाले घन का आयतन कितना है?",
  ["243 cm³", "486 cm³", "648 cm³", "729 cm³"], ["243 सेमी³", "486 सेमी³", "648 सेमी³", "729 सेमी³"], "D", "Volume = side³ = 9³ = 729 cm³.", "आयतन = भुजा³ = 9³ = 729 सेमी³।",
  () => 9 ** 3 === 729);

// ============================================================ GENERAL HINDI (20)
const GH = (...a) => H("General Hindi", ...a);
GH("संधि", "easy", "'महेश' शब्द का संधि-विच्छेद क्या है?", ["महा + ईश", "मह + ईश", "महा + इश", "महे + श"], "A",
  "महा + ईश = महेश; 'आ + ई' मिलकर 'ए' बनता है, इसलिए यह गुण संधि है।");
GH("संधि", "medium", "'सज्जन' शब्द का संधि-विच्छेद क्या है?", ["सत् + जन", "सद + जन", "सज + जन", "सत + जन्"], "A",
  "सत् + जन = सज्जन; 'त्' के बाद 'ज' आने पर 'त्' 'ज्' में बदल जाता है। यह व्यंजन संधि है।");
GH("समास", "easy", "'त्रिलोक' में कौन-सा समास है?", ["द्विगु समास", "द्वंद्व समास", "बहुव्रीहि समास", "अव्ययीभाव समास"], "A",
  "त्रिलोक = तीनों लोकों का समूह। पूर्वपद संख्यावाचक है, इसलिए यह द्विगु समास है।");
GH("समास", "easy", "'माता-पिता' में कौन-सा समास है?", ["तत्पुरुष समास", "कर्मधारय समास", "द्वंद्व समास", "बहुव्रीहि समास"], "C",
  "माता-पिता = माता और पिता। दोनों पद प्रधान हैं और 'और' से जुड़े हैं, इसलिए यह द्वंद्व समास है।");
GH("समास", "medium", "'चरणकमल' (कमल के समान चरण) में कौन-सा समास है?", ["तत्पुरुष समास", "कर्मधारय समास", "द्विगु समास", "अव्ययीभाव समास"], "B",
  "इसमें उपमान-उपमेय का संबंध है (चरण कमल के समान), इसलिए यह कर्मधारय समास है।");
GH("मुहावरे", "easy", "'दाँतों तले उँगली दबाना' मुहावरे का अर्थ क्या है?", ["आश्चर्यचकित होना", "डर जाना", "क्रोध करना", "दुखी होना"], "A",
  "इस मुहावरे का अर्थ है बहुत आश्चर्यचकित हो जाना।");
GH("मुहावरे", "medium", "'पानी-पानी होना' मुहावरे का अर्थ क्या है?", ["बहुत प्यासा होना", "शर्मिंदा होना", "बारिश होना", "बह जाना"], "B",
  "'पानी-पानी होना' का अर्थ है बहुत शर्मिंदा होना।");
GH("मुहावरे", "medium", "'आँखें खुलना' मुहावरे का अर्थ है:", ["नींद से जागना", "सच्चाई का पता चलना", "आँखों में रोशनी आना", "रोना शुरू करना"], "B",
  "'आँखें खुलना' का अर्थ है वास्तविकता या सच्चाई का पता चल जाना।");
GH("लोकोक्ति", "easy", "'जैसी करनी वैसी भरनी' लोकोक्ति का अर्थ क्या है?", ["जैसा कर्म वैसा फल", "जल्दी का काम शैतान का", "सब धान बाईस पसेरी", "एक अनार सौ बीमार"], "A",
  "इसका अर्थ है कि मनुष्य को अपने कर्मों के अनुसार ही फल मिलता है।");
GH("लोकोक्ति", "medium", "'ऊँट के मुँह में जीरा' लोकोक्ति का अर्थ क्या है?", ["बहुत कम मात्रा में मिलना", "बहुत बड़ा लाभ", "बहुत तेज़ दौड़ना", "बेकार की वस्तु"], "A",
  "ऊँट बड़ा जानवर है और जीरा बहुत थोड़ा; अर्थात आवश्यकता से बहुत कम वस्तु मिलना।");
GH("पर्यायवाची", "medium", "'आकाश' का पर्यायवाची शब्द कौन-सा नहीं है?", ["गगन", "नभ", "अंबर", "अनल"], "D",
  "अनल का अर्थ अग्नि है; गगन, नभ और अंबर आकाश के पर्यायवाची हैं।");
GH("पर्यायवाची", "easy", "'नदी' का पर्यायवाची शब्द कौन-सा है?", ["सरिता", "सागर", "तड़ाग", "पर्वत"], "A",
  "सरिता नदी का पर्यायवाची है; सागर = समुद्र, तड़ाग = तालाब।");
GH("विलोम शब्द", "easy", "'अमृत' का विलोम शब्द क्या है?", ["सुधा", "विष", "जल", "पेय"], "B",
  "अमृत का विलोम विष है; सुधा तो अमृत का ही पर्याय है।");
GH("विलोम शब्द", "easy", "'स्वतंत्र' का विलोम शब्द क्या है?", ["परतंत्र", "मुक्त", "आज़ाद", "स्वाधीन"], "A",
  "स्वतंत्र का विलोम परतंत्र (पराधीन) है; मुक्त, आज़ाद और स्वाधीन उसके पर्याय हैं।");
GH("अनेकार्थी शब्द", "medium", "'अंबर' शब्द के दो अर्थ हैं:", ["आकाश और वस्त्र", "पृथ्वी और जल", "अग्नि और वायु", "चंद्र और तारा"], "A",
  "'अंबर' के अर्थ हैं आकाश और वस्त्र (कपड़ा)।");
GH("शुद्ध वर्तनी", "easy", "इनमें से शुद्ध वर्तनी वाला शब्द कौन-सा है?", ["श्रीमति", "श्रीमती", "श्रिमती", "श्रीमत्ती"], "B",
  "सही शब्द 'श्रीमती' है। 'श्री' के साथ दीर्घ ईकारांत 'मती' (श्री + मती) जुड़ता है, इसलिए 'श्रीमति' या 'श्रिमती' जैसी वर्तनियाँ अशुद्ध हैं।");
GH("लिंग", "medium", "'दही' शब्द का लिंग क्या है?", ["स्त्रीलिंग", "पुल्लिंग", "उभयलिंग", "नपुंसकलिंग"], "B",
  "हिंदी में 'दही' पुल्लिंग है (मीठा दही, ताज़ा दही)।");
GH("वचन", "easy", "'कविता' शब्द का बहुवचन रूप क्या है?", ["कविताएँ", "कवितायें", "कविताओं", "कविताये"], "A",
  "'कविता' का बहुवचन 'कविताएँ' होता है (आ → एँ)।");
GH("उपसर्ग-प्रत्यय", "medium", "'निर्धन' शब्द में उपसर्ग कौन-सा है?", ["नि", "निर्", "धन", "र"], "B",
  "निर् + धन = निर्धन; यहाँ 'निर्' उपसर्ग है।");
GH("विराम चिह्न", "medium", "वाक्य के अंत में पूर्ण विराम के लिए हिंदी में कौन-सा चिह्न प्रयोग होता है?", ["।", "?", "!", ","], "A",
  "हिंदी में पूर्ण विराम का चिह्न खड़ी पाई ( । ) है।");

done();
