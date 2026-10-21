// Percentage · Successive Percentage Change · Hard #7 - #10: the twenty kinds
// of #1 - #6 with new numbers (no set of changes reused in another order).
// #10 has x/y in place of the circle, whose clean radii are all used.
// Every answer is worked out again in `v`.
const { K } = require("./pct-builders");
const { H } = require("./pct-hard-builders");
const { fmt } = require("./fmt");
const T = (n) => `Percentage · Successive Percentage Change · Hard #${n}`;

const h7 = [
  H.four(T(7), [40, -25, 10, -20], ["7.6% decrease", "5% increase", "7.6% increase", "No change"]),
  H.chainAmount(T(7), "commission", "कमीशन", false, 30, 10, 4300, ["₹14,300", "₹10,000", "₹13,000", "₹14,000"]),
  H.quantity(T(7), "onions", "प्याज़", 60, 20, 40, "kg", "kg", ["30", "32", "25", "36"]),
  H.updownAmount(T(7), "fee", "शुल्क", 50, 1000, true, ["₹4,000", "₹2,000", "₹5,000", "₹1,000"]),
  H.restore(T(7), "machine's output", "मशीन का उत्पादन", 60, 50, ["400%", "110%", "300%", "250%"]),
  H.power(T(7), 30, -10, 1, 2, ["5.3% increase", "10% increase", "17% increase", "5.3% decrease"]),
  H.timeSaved(T(7), "A van driver", "एक वैन चालक", 60, 15, ["40", "25", "30", "50"]),
  H.toBelow(T(7), "a microwave oven", "एक माइक्रोवेव ओवन", 40, 16, ["40%", "56%", "30%", "24%"]),
  H.radiusUpDown(T(7), 70, ["73.99% decrease", "49% decrease", "No change", "73.99% increase"]),
  H.markup2(T(7), 40, 25, 10, ["5.5% decrease", "5% increase", "5.5% increase", "No change"]),
  H.secondDiscount(T(7), "a printer", "एक प्रिंटर", 15000, 10, 12150, ["10%", "9%", "19%", "20%"]),
  H.spend3(T(7), "vegetables", "सब्ज़ियों", 25, 20, -10, ["35% increase", "45% increase", "35% decrease", "30% increase"]),
  H.doubleNext(T(7), 35, ["35%", "43.17%", "40%", "30%"]),
  H.third(T(7), 25, -20, 20, ["20% increase", "15% increase", "20% decrease", "25% increase"]),
  H.cuboid(T(7), [20, 20, -25], ["8% increase", "15% increase", "8% decrease", "No change"]),
  K.equal(T(7), 25.44, ["12%", "12.72%", "13%", "10%"]),
  K.chain(T(7), "income", "आय", true, 25, 20, ["50%", "45%", "40%", "55%"]),
  K.three_d(T(7), [30, 30, 10], ["55.9%", "70%", "60%", "51%"]),
  K.offer(T(7), 45, 25, 25),
  K.revenue(T(7), "gold", "सोने", 35, -20, ["8% increase", "15% increase", "8% decrease", "No change"]),
];

const h8 = [
  H.four(T(8), [-20, 10, 25, -10], ["1% decrease", "5% increase", "1% increase", "No change"]),
  H.chainAmount(T(8), "tuition fee", "ट्यूशन शुल्क", false, 50, 10, 6500, ["₹16,500", "₹10,000", "₹15,000", "₹16,000"]),
  H.quantity(T(8), "petrol", "पेट्रोल", 25, 10, 60, "litres", "लीटर", ["52.8", "54", "50", "48"]),
  H.updownAmount(T(8), "deposit", "जमा राशि", 30, 900, true, ["₹10,000", "₹9,000", "₹3,000", "₹30,000"], true),
  H.restore(T(8), "train's speed", "रेलगाड़ी की गति", 25, 60, ["233⅓%", "85%", "200%", "150%"], true),
  H.power(T(8), -20, 10, 2, 1, ["29.6% decrease", "10% decrease", "30% decrease", "29.6% increase"]),
  H.timeSaved(T(8), "A delivery rider", "एक डिलीवरी राइडर", 25, 10, ["50", "40", "60", "45"]),
  H.toBelow(T(8), "a geyser", "एक गीज़र", 50, 25, ["50%", "75%", "25%", "40%"]),
  H.radiusUpDown(T(8), 80, ["87.04% decrease", "64% decrease", "No change", "87.04% increase"]),
  H.markup2(T(8), 50, 20, 10, ["8% increase", "20% increase", "8% decrease", "No change"]),
  H.secondDiscount(T(8), "a mixer grinder", "एक मिक्सर ग्राइंडर", 5000, 20, 3400, ["15%", "12%", "35%", "20%"]),
  H.spend3(T(8), "bread", "ब्रेड", 10, 25, -20, ["10% increase", "15% increase", "10% decrease", "No change"]),
  H.doubleNext(T(8), 40, ["40%", "50.67%", "50%", "38%"]),
  H.third(T(8), -25, -20, -10, ["50% increase", "35% increase", "50% decrease", "45% increase"]),
  H.cuboid(T(8), [-10, -10, -10], ["27.1% decrease", "30% decrease", "27% decrease", "19% decrease"]),
  K.equal(T(8), -57.75, ["35%", "28.875%", "30%", "40%"]),
  K.chain(T(8), "speed", "गति", true, 40, -25, ["5%", "15%", "10%", "35%"]),
  K.three_d(T(8), [30, 10, 10], ["43.3%", "50%", "45%", "40%"]),
  K.offer(T(8), 32, 20, 15),
  K.revenue(T(8), "electricity", "बिजली", -15, 25, ["6.25% increase", "10% increase", "6.25% decrease", "No change"]),
];

const h9 = [
  H.four(T(9), [50, -40, 20, 10], ["18.8% increase", "40% increase", "18.8% decrease", "20% increase"]),
  H.chainAmount(T(9), "monthly wage", "मासिक मज़दूरी", true, 20, 40, 6800, ["₹16,800", "₹10,000", "₹14,000", "₹16,000"]),
  H.quantity(T(9), "flour", "आटा", 20, 12, 30, "kg", "kg", ["28", "27", "26", "33.6"]),
  H.updownAmount(T(9), "loan", "ऋण", 25, 250, true, ["₹4,000", "₹2,500", "₹1,000", "₹6,250"]),
  H.restore(T(9), "bus's speed", "बस की गति", 40, 20, ["108⅓%", "60%", "100%", "75%"], true),
  H.power(T(9), -30, 10, 1, 2, ["15.3% decrease", "10% decrease", "9% increase", "15.3% increase"]),
  H.timeSaved(T(9), "A ferry captain", "एक नौका चालक", 10, 5, ["55", "50", "60", "45"]),
  H.toBelow(T(9), "a fan", "एक पंखे", 20, 16, ["30%", "36%", "25%", "20%"]),
  H.radiusUpDown(T(9), 90, ["96.39% decrease", "81% decrease", "No change", "96.39% increase"]),
  H.markup2(T(9), 25, 20, 4, ["4% decrease", "1% increase", "4% increase", "No change"]),
  H.secondDiscount(T(9), "a dining set", "एक डाइनिंग सेट", 20000, 30, 11900, ["15%", "12%", "45%", "20%"]),
  H.spend3(T(9), "rice", "चावल", 30, 10, -30, ["0.1% increase", "10% increase", "0.1% decrease", "No change"]),
  H.doubleNext(T(9), 45, ["45%", "58.5%", "50%", "40%"]),
  H.third(T(9), 40, -20, -16, ["25% decrease", "36% decrease", "25% increase", "20% decrease"]),
  H.cuboid(T(9), [25, -20, -10], ["10% decrease", "5% decrease", "10% increase", "No change"]),
  K.equal(T(9), 156, ["60%", "78%", "70%", "56%"]),
  K.chain(T(9), "pocket money", "जेब ख़र्च", false, -10, -20, ["28%", "30%", "32%", "20%"]),
  K.three_d(T(9), [35, 20, 10], ["53.2%", "65%", "55%", "50%"]),
  K.offer(T(9), 52, 40, 20),
  K.revenue(T(9), "cotton cloth", "सूती कपड़े", 50, -30, ["5% increase", "20% increase", "5% decrease", "No change"]),
];

const h10 = [
  H.four(T(10), [-10, -10, 20, -5], ["7.66% decrease", "5% decrease", "7.66% increase", "No change"]),
  H.chainAmount(T(10), "monthly profit", "मासिक लाभ", false, 15, 20, 3800, ["₹13,800", "₹10,000", "₹13,500", "₹14,000"]),
  H.quantity(T(10), "coffee", "कॉफ़ी", 25, 5, 5, "kg", "kg", ["4.2", "4", "4.5", "3.8"]),
  H.updownAmount(T(10), "number", "संख्या", 15, 45, false, ["2,000", "4,500", "1,500", "3,000"], true),
  H.restore(T(10), "company's profit", "कंपनी का लाभ", 20, 60, ["212.5%", "80%", "200%", "150%"]),
  H.power(T(10), 50, -20, 1, 2, ["4% decrease", "10% increase", "4% increase", "No change"]),
  H.timeSaved(T(10), "A taxi driver", "एक टैक्सी चालक", 40, 10, ["35", "25", "30", "40"]),
  H.toBelow(T(10), "a tablet computer", "एक टैबलेट कंप्यूटर", 40, 30, ["50%", "70%", "40%", "30%"]),
  K.ratio(T(10), 25, -20, ["56.25% increase", "45% increase", "56.25% decrease", "5% increase"]),
  H.markup2(T(10), 20, 25, 4, ["13.6% decrease", "9% decrease", "13.6% increase", "No change"]),
  H.secondDiscount(T(10), "an inverter", "एक इन्वर्टर", 6000, 15, 4590, ["10%", "8%", "25%", "15%"]),
  H.spend3(T(10), "medicines", "दवाओं", 5, 20, -10, ["13.4% increase", "15% increase", "13.4% decrease", "No change"]),
  H.doubleNext(T(10), 50, ["50%", "66.67%", "60%", "40%"]),
  H.third(T(10), -10, 50, 8, ["20% decrease", "32% decrease", "20% increase", "28% decrease"]),
  H.cuboid(T(10), [30, -10, -20], ["6.4% decrease", "No change", "6.4% increase", "10% decrease"]),
  K.equal(T(10), -22.56, ["12%", "11.28%", "11%", "13%"]),
  K.chain(T(10), "salary", "वेतन", false, 30, -30, ["9%", "0%", "10%", "6%"]),
  K.three_d(T(10), [25, 10, 8], ["37.9%", "43%", "40%", "35%"]),
  K.offer(T(10), 55, 30, 35),
  K.revenue(T(10), "cement", "सीमेंट", -40, 60, ["4% decrease", "20% increase", "4% increase", "No change"]),
];

module.exports = [...h7, ...h8, ...h9, ...h10].map(fmt);
