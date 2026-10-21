// Percentage · Successive Percentage Change · Hard #1 - #3: fifteen harder
// kinds (pct-hard-builders.js) and five of the medium kinds with harder
// numbers. Every answer is worked out again in `v`.
const { K } = require("./pct-builders");
const { H } = require("./pct-hard-builders");
const { fmt } = require("./fmt");
const T = (n) => `Percentage · Successive Percentage Change · Hard #${n}`;

const h1 = [
  H.four(T(1), [10, -20, 25, -5], ["4.5% increase", "10% increase", "4.5% decrease", "No change"]),
  H.chainAmount(T(1), "salary", "वेतन", false, 25, 20, 16000, ["₹48,000", "₹40,000", "₹32,000", "₹44,000"]),
  H.quantity(T(1), "sugar", "चीनी", 25, 10, 20, "kg", "kg", ["17.6", "18", "16", "22"]),
  H.updownAmount(T(1), "salary", "वेतन", 20, 480, true, ["₹12,000", "₹24,000", "₹2,400", "₹10,000"]),
  H.restore(T(1), "monthly bonus", "मासिक बोनस", 10, 10, ["23 37/81%", "20%", "21%", "25%"]),
  H.power(T(1), 20, -20, 2, 1, ["15.2% increase", "No change", "4% decrease", "20% increase"]),
  H.timeSaved(T(1), "A train driver", "एक रेल चालक", 20, 20, ["120", "100", "80", "144"]),
  H.toBelow(T(1), "a mobile phone", "एक मोबाइल फ़ोन", 25, 10, ["28%", "35%", "30%", "25%"]),
  H.radiusUpDown(T(1), 20, ["7.84% decrease", "No change", "4% decrease", "7.84% increase"]),
  H.markup2(T(1), 30, 10, 10, ["5.3% increase", "10% increase", "5.3% decrease", "No change"]),
  H.secondDiscount(T(1), "a sofa set", "एक सोफ़ा सेट", 25000, 20, 17000, ["15%", "12%", "32%", "20%"]),
  H.spend3(T(1), "cooking gas", "रसोई गैस", 10, 20, -10, ["18.8% increase", "20% increase", "18.8% decrease", "12% increase"]),
  H.doubleNext(T(1), 10, ["10%", "16%", "11%", "12%"]),
  H.third(T(1), 20, -25, 8, ["20% increase", "13% increase", "20% decrease", "8% increase"]),
  H.cuboid(T(1), [10, 20, 25], ["65% increase", "55% increase", "50% increase", "60% increase"]),
  K.equal(T(1), 82.25, ["35%", "41.125%", "40%", "33%"]),
  K.chain(T(1), "weight", "वज़न", false, -25, 60, ["20%", "35%", "15%", "25%"]),
  K.three_d(T(1), [12.5, 20, 10], ["37%", "42.5%", "40%", "35%"]),
  K.offer(T(1), 46, 20, 30),
  K.revenue(T(1), "LPG", "एलपीजी", 15, -15, ["2.25% decrease", "No change", "2.25% increase", "1.5% decrease"]),
];

const h2 = [
  H.four(T(2), [20, -10, -25, 30], ["5.3% increase", "15% increase", "5.3% decrease", "No change"]),
  H.chainAmount(T(2), "pocket money", "जेब ख़र्च", false, 20, 25, 600, ["₹1,800", "₹1,200", "₹1,500", "₹2,400"]),
  H.quantity(T(2), "rice", "चावल", 20, 8, 30, "kg", "kg", ["27", "28", "26", "32.4"]),
  H.updownAmount(T(2), "number", "संख्या", 30, 72, false, ["800", "720", "240", "900"], true),
  H.restore(T(2), "price", "मूल्य", 20, 20, ["56.25%", "40%", "44%", "50%"]),
  H.power(T(2), 10, 10, 1, 2, ["33.1% increase", "21% increase", "30% increase", "33% increase"]),
  H.timeSaved(T(2), "A car driver", "एक कार चालक", 25, 30, ["150", "120", "125", "180"]),
  H.toBelow(T(2), "a scooter", "एक स्कूटर", 50, 10, ["40%", "60%", "50%", "33⅓%"]),
  H.radiusUpDown(T(2), 10, ["1.99% decrease", "No change", "1% decrease", "2% increase"]),
  H.markup2(T(2), 40, 20, 10, ["0.8% increase", "10% increase", "0.8% decrease", "No change"]),
  H.secondDiscount(T(2), "a laptop", "एक लैपटॉप", 50000, 10, 36000, ["20%", "18%", "28%", "25%"]),
  H.spend3(T(2), "electricity", "बिजली", 20, 10, -20, ["5.6% increase", "10% increase", "5.6% decrease", "No change"]),
  H.doubleNext(T(2), 20, ["20%", "22.67%", "25%", "17%"]),
  H.third(T(2), -20, 50, 8, ["10% decrease", "8% decrease", "10% increase", "12% decrease"]),
  H.cuboid(T(2), [-10, 20, 50], ["62% increase", "60% increase", "70% increase", "58% increase"]),
  K.equal(T(2), -64, ["40%", "32%", "36%", "20%"]),
  K.chain(T(2), "bank balance", "बैंक बैलेंस", false, 50, -40, ["10%", "20%", "0%", "15%"]),
  K.three_d(T(2), [25, 25, 20], ["55%", "70%", "60%", "50%"]),
  K.offer(T(2), 36, 20, 20),
  K.revenue(T(2), "coal", "कोयले", -30, 50, ["5% increase", "20% increase", "5% decrease", "No change"]),
];

const h3 = [
  H.four(T(3), [-10, 30, -20, 25], ["17% increase", "25% increase", "17% decrease", "15% increase"]),
  H.chainAmount(T(3), "salary", "वेतन", false, 40, 25, 9000, ["₹21,000", "₹12,000", "₹15,000", "₹25,000"]),
  H.quantity(T(3), "milk", "दूध", 40, 12, 25, "litres", "लीटर", ["20", "22", "18", "21.4"]),
  H.updownAmount(T(3), "rent", "किराया", 25, 500, true, ["₹8,000", "₹5,000", "₹10,000", "₹2,000"]),
  H.restore(T(3), "machine's speed", "मशीन की गति", 20, 25, ["66⅔%", "45%", "50%", "60%"], true),
  H.power(T(3), -20, 25, 2, 1, ["20% decrease", "No change", "5% increase", "15% decrease"]),
  H.timeSaved(T(3), "A bus driver", "एक बस चालक", 50, 30, ["90", "60", "120", "75"]),
  H.toBelow(T(3), "a television", "एक टीवी", 30, 9, ["30%", "39%", "25%", "21%"]),
  H.radiusUpDown(T(3), 30, ["17.19% decrease", "9% decrease", "No change", "17.19% increase"]),
  H.markup2(T(3), 50, 20, 25, ["10% decrease", "5% increase", "10% increase", "No change"]),
  H.secondDiscount(T(3), "a water purifier", "एक वॉटर प्यूरीफ़ायर", 30000, 25, 20250, ["10%", "7.5%", "32.5%", "15%"]),
  H.spend3(T(3), "petrol", "पेट्रोल", 25, 20, -25, ["12.5% increase", "20% increase", "12.5% decrease", "No change"]),
  H.doubleNext(T(3), 5, ["5%", "5.5%", "7.75%", "4%"]),
  H.third(T(3), 25, -20, -10, ["10% decrease", "5% decrease", "10% increase", "15% decrease"]),
  H.cuboid(T(3), [20, -25, 10], ["1% decrease", "5% increase", "1% increase", "No change"]),
  K.equal(T(3), -84, ["60%", "42%", "50%", "40%"]),
  K.chain(T(3), "monthly rent", "मासिक किराया", false, -10, 40, ["26%", "30%", "36%", "20%"]),
  K.three_d(T(3), [40, 20, 10], ["56.8%", "70%", "60%", "52%"]),
  K.offer(T(3), 64, 40, 40),
  K.revenue(T(3), "aviation fuel", "विमान ईंधन", 60, -35, ["4% increase", "25% increase", "4% decrease", "No change"]),
];

module.exports = [...h1, ...h2, ...h3].map(fmt);
