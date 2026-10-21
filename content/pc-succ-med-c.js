// Percentage · Successive Percentage Change · Medium #8 - #10: one question of
// each of twenty kinds per test (builders in pct-builders.js), numbers chosen
// so that none repeats an earlier test - in any order. Every answer is worked
// out again in `v`.
const { K } = require("./pct-builders");
const T = (n) => `Percentage · Successive Percentage Change · Medium #${n}`;

const m8 = [
  K.three(T(8), [25, -40, 30], ["2.5% decrease", "15% increase", "2.5% increase", "No change"]),
  K.needed(T(8), "a smartwatch", "एक स्मार्टवॉच", 60, 20, ["25%", "40%", "33⅓%", "20%"]),
  K.diff(T(8), 20, 15, 2280, ["6,000", "6,900", "5,700", "8,280"]),
  K.rise(T(8), "teacher's salary", "शिक्षक का वेतन", 25, -12, 2400, ["₹24,000", "₹18,462", "₹20,000", "₹21,818"]),
  K.solid(T(8), "The radius of a sphere is increased by 10%. What is the change in its volume?", "एक गोले की त्रिज्या 10% बढ़ाई जाती है। उसके आयतन में क्या परिवर्तन होता है?", [10, 10, 10], ["33.1% increase", "30% increase", "21% increase", "10% increase"], "Volume depends on radius × radius × radius: 1.1 × 1.1 × 1.1 = 1.331, a 33.1% increase.", "आयतन त्रिज्या × त्रिज्या × त्रिज्या पर निर्भर है: 1.1 × 1.1 × 1.1 = 1.331, यानी 33.1% वृद्धि।"),
  K.ratio(T(8), -30, 40, ["50% decrease", "70% decrease", "10% increase", "42% decrease"]),
  K.product(T(8), 15, -20, ["8% decrease", "5% decrease", "8% increase", "3% decrease"]),
  K.equal(T(8), 56.25, ["25%", "28.125%", "22.5%", "26%"]),
  K.updown(T(8), "electricity tariff", "बिजली टैरिफ़", 0.25, ["5%", "0.5%", "2.5%", "25%"]),
  K.marked(T(8), "a bookshelf", "एक बुकशेल्फ़", 20, 25, 3600, ["₹6,000", "₹5,400", "₹6,480", "₹5,000"]),
  K.area(T(8), "length", "लंबाई", "breadth", "चौड़ाई", 20, -4, ["20% decrease", "24% decrease", "20% increase", "16% decrease"]),
  K.three_d(T(8), [5, 20, 25], ["43%", "50%", "45%", "40%"]),
  K.chain(T(8), "height", "लंबाई", true, -20, 50, ["20%", "30%", "10%", "25%"]),
  K.tax(T(8), 9000, 10, 18, 25, ["₹8,761.50", "₹9,000.00", "₹11,682.00", "₹8,250.00"]),
  K.offer(T(8), 28, 20, 10),
  K.revenue(T(8), "petrol", "पेट्रोल", -10, 10, ["1% decrease", "No change", "1% increase", "2% decrease"]),
  K.other(T(8), 25, 50, ["20%", "25%", "15%", "18%"]),
  K.cut(T(8), "milk", "दूध", 25, 5, ["16%", "20%", "21%", "15%"]),
  K.speed(T(8), "A cyclist", "एक साइकिल चालक", 50, -20, ["20% increase", "30% increase", "20% decrease", "10% increase"]),
  K.shape(T(8), "circle", "वृत्त", "radius", "त्रिज्या", -36, ["20%", "18%", "36%", "40%"]),
];

const m9 = [
  K.three(T(9), [-30, 50, -10], ["5.5% decrease", "10% increase", "5.5% increase", "No change"]),
  K.needed(T(9), "a printer", "एक प्रिंटर", -20, 8, ["35%", "28%", "30%", "40%"]),
  K.diff(T(9), -20, 50, 400, ["2,000", "1,333", "1,600", "2,400"]),
  K.rise(T(9), "officer's house rent allowance", "अधिकारी का मकान किराया भत्ता", 10, 10, 840, ["₹4,000", "₹4,200", "₹3,818", "₹4,400"]),
  K.solid(T(9), "The radius of a cylinder is decreased by 10% and its height is increased by 25%. What is the change in its volume?", "एक बेलन की त्रिज्या 10% घटाई जाती है और ऊँचाई 25% बढ़ाई जाती है। उसके आयतन में क्या परिवर्तन होता है?", [-10, -10, 25], ["1.25% increase", "15% increase", "1.25% decrease", "No change"], "Volume depends on radius × radius × height: 0.9 × 0.9 × 1.25 = 1.0125, a 1.25% increase.", "आयतन त्रिज्या × त्रिज्या × ऊँचाई पर निर्भर है: 0.9 × 0.9 × 1.25 = 1.0125, यानी 1.25% वृद्धि।"),
  K.ratio(T(9), 40, -30, ["100% increase", "70% increase", "10% increase", "98% increase"]),
  K.product(T(9), -30, -30, ["51% decrease", "60% decrease", "49% decrease", "9% decrease"]),
  K.equal(T(9), -27.75, ["15%", "13.875%", "14%", "16%"]),
  K.updown(T(9), "toll tax", "टोल टैक्स", 1, ["10%", "1%", "5%", "0.1%"]),
  K.marked(T(9), "a geyser", "एक गीज़र", 30, 10, 6300, ["₹10,000", "₹9,000", "₹10,500", "₹8,190"]),
  K.area(T(9), "breadth", "चौड़ाई", "length", "लंबाई", 25, 0, ["20% decrease", "25% decrease", "20% increase", "16⅔% decrease"]),
  K.three_d(T(9), [10, 20, 30], ["49.6%", "60%", "50.4%", "48%"]),
  K.chain(T(9), "age", "आयु", true, 50, -20, ["20%", "30%", "10%", "25%"]),
  K.tax(T(9), 15000, 20, 12, 30, ["₹14,112", "₹15,000", "₹20,160", "₹12,600"]),
  K.offer(T(9), 20, 10, 12),
  K.revenue(T(9), "tobacco", "तंबाकू", 40, -30, ["2% decrease", "10% increase", "2% increase", "No change"]),
  K.other(T(9), -25, -40, ["20%", "15%", "25%", "18%"]),
  K.cut(T(9), "rice", "चावल", 20, -16, ["30%", "36%", "4%", "25%"]),
  K.speed(T(9), "A motorcyclist", "एक मोटरसाइकिल चालक", -20, 10, ["12% decrease", "10% decrease", "12% increase", "8% decrease"]),
  K.shape(T(9), "square", "वर्ग", "side", "भुजा", 96, ["40%", "48%", "44%", "36%"]),
];

const m10 = [
  K.three(T(10), [10, -10, 50], ["48.5% increase", "50% increase", "49% increase", "48.5% decrease"]),
  K.needed(T(10), "a refrigerator", "एक फ़्रिज", 10, -12, ["20%", "22%", "18%", "25%"]),
  K.diff(T(10), 40, -25, 250, ["5,000", "1,667", "2,500", "4,000"]),
  K.rise(T(10), "monthly allowance", "मासिक भत्ता", 20, -10, 480, ["₹6,000", "₹4,800", "₹5,000", "₹4,000"]),
  K.solid(T(10), "The radius of the base of a cone is decreased by 20% and its height is increased by 25%. What is the change in its volume?", "एक शंकु के आधार की त्रिज्या 20% घटाई जाती है और ऊँचाई 25% बढ़ाई जाती है। उसके आयतन में क्या परिवर्तन होता है?", [-20, -20, 25], ["20% decrease", "No change", "20% increase", "15% decrease"], "Volume depends on radius × radius × height: 0.8 × 0.8 × 1.25 = 0.8, a 20% decrease.", "आयतन त्रिज्या × त्रिज्या × ऊँचाई पर निर्भर है: 0.8 × 0.8 × 1.25 = 0.8, यानी 20% कमी।"),
  K.ratio(T(10), 60, 28, ["25% increase", "32% increase", "20% increase", "28% increase"]),
  K.product(T(10), 20, 20, ["44% increase", "40% increase", "42% increase", "4% increase"]),
  K.equal(T(10), 125, ["50%", "62.5%", "60%", "55%"]),
  K.updown(T(10), "school fee", "स्कूल फ़ीस", 2.89, ["17%", "1.7%", "28.9%", "13%"]),
  K.marked(T(10), "a camera", "एक कैमरा", 20, 30, 5040, ["₹9,000", "₹10,080", "₹8,400", "₹7,200"]),
  K.area(T(10), "length", "लंबाई", "breadth", "चौड़ाई", -30, 5, ["50% increase", "35% increase", "50% decrease", "45% increase"]),
  K.three_d(T(10), [30, 10, 5], ["40.15%", "45%", "42%", "39.85%"]),
  K.chain(T(10), "pocket money", "जेब ख़र्च", false, -40, 25, ["25%", "15%", "35%", "20%"]),
  K.tax(T(10), 20000, 10, 5, 20, ["₹18,480", "₹19,000", "₹23,100", "₹17,600"]),
  K.offer(T(10), 50, 40, 15),
  K.revenue(T(10), "chocolate", "चॉकलेट", 50, -40, ["10% decrease", "10% increase", "No change", "20% decrease"]),
  K.other(T(10), 50, 80, ["20%", "30%", "25%", "15%"]),
  K.cut(T(10), "vegetables", "सब्ज़ियों", 40, 12, ["20%", "28%", "25%", "15%"]),
  K.speed(T(10), "A boat", "एक नाव", 25, 20, ["50% increase", "45% increase", "5% increase", "40% increase"]),
  K.shape(T(10), "circle", "वृत्त", "radius", "त्रिज्या", -51, ["30%", "25.5%", "49%", "35%"]),
];

module.exports = [...m8, ...m9, ...m10];
