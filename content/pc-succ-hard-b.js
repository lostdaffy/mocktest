// Percentage · Successive Percentage Change · Hard #4 - #6: the same twenty
// kinds as #1 - #3 with new numbers (no set of changes reused in another
// order). Every answer is worked out again in `v`.
const { K } = require("./pct-builders");
const { H } = require("./pct-hard-builders");
const { fmt } = require("./fmt");
const T = (n) => `Percentage · Successive Percentage Change · Hard #${n}`;

const h4 = [
  H.four(T(4), [15, -20, 10, -10], ["8.92% decrease", "5% decrease", "8.92% increase", "No change"]),
  H.chainAmount(T(4), "monthly income", "मासिक आय", true, 20, 50, 8000, ["₹18,000", "₹10,000", "₹15,000", "₹16,000"]),
  H.quantity(T(4), "wheat", "गेहूँ", 25, 15, 50, "kg", "kg", ["46", "43", "50", "42"]),
  H.updownAmount(T(4), "price", "मूल्य", 10, 40, true, ["₹4,000", "₹400", "₹40,000", "₹2,000"]),
  H.restore(T(4), "factory's daily output", "कारख़ाने का दैनिक उत्पादन", 20, 50, ["150%", "70%", "100%", "120%"]),
  H.power(T(4), 10, -10, 2, 1, ["8.9% increase", "No change", "1% decrease", "10% increase"]),
  H.timeSaved(T(4), "A truck driver", "एक ट्रक चालक", 20, 15, ["90", "75", "60", "100"]),
  H.toBelow(T(4), "a refrigerator", "एक फ़्रिज", 25, 20, ["36%", "45%", "40%", "20%"]),
  H.radiusUpDown(T(4), 40, ["29.44% decrease", "16% decrease", "No change", "29.44% increase"]),
  H.markup2(T(4), 60, 25, 10, ["8% increase", "25% increase", "8% decrease", "No change"]),
  H.secondDiscount(T(4), "an air conditioner", "एक एयर कंडीशनर", 40000, 15, 27200, ["20%", "15%", "35%", "32%"]),
  H.spend3(T(4), "edible oil", "खाद्य तेल", 15, 20, -20, ["10.4% increase", "15% increase", "10.4% decrease", "No change"]),
  H.doubleNext(T(4), 25, ["25%", "29.17%", "30%", "20%"]),
  H.third(T(4), 20, 20, 8, ["25% decrease", "32% decrease", "25% increase", "20% decrease"]),
  H.cuboid(T(4), [10, 10, 10], ["33.1% increase", "30% increase", "33% increase", "21% increase"]),
  K.equal(T(4), 96, ["40%", "48%", "45%", "36%"]),
  K.chain(T(4), "score", "स्कोर", false, 20, -25, ["10%", "5%", "15%", "20%"]),
  K.three_d(T(4), [40, 20, 5], ["54.4%", "65%", "55%", "50%"]),
  K.offer(T(4), 42, 25, 20),
  K.revenue(T(4), "diesel", "डीज़ल", 30, -25, ["2.5% decrease", "5% increase", "2.5% increase", "No change"]),
];

const h5 = [
  H.four(T(5), [25, -20, -10, 20], ["8% increase", "15% increase", "8% decrease", "No change"]),
  H.chainAmount(T(5), "pension", "पेंशन", true, 25, 40, 7500, ["₹17,500", "₹10,000", "₹12,500", "₹18,750"]),
  H.quantity(T(5), "pulses", "दाल", 50, 20, 15, "kg", "kg", ["12", "10", "13.5", "18"]),
  H.updownAmount(T(5), "bill", "बिल", 40, 320, true, ["₹2,000", "₹3,200", "₹800", "₹1,600"]),
  H.restore(T(5), "production", "उत्पादन", 20, 37.5, ["100%", "57.5%", "50%", "75%"]),
  H.power(T(5), -10, 20, 1, 2, ["29.6% increase", "30% increase", "34% increase", "10% increase"]),
  H.timeSaved(T(5), "A cyclist", "एक साइकिल चालक", 25, 12, ["60", "48", "50", "75"]),
  H.toBelow(T(5), "a sofa", "एक सोफ़ा", 60, 20, ["50%", "80%", "40%", "60%"]),
  H.radiusUpDown(T(5), 50, ["43.75% decrease", "25% decrease", "No change", "43.75% increase"]),
  H.markup2(T(5), 20, 10, 10, ["2.8% decrease", "No change", "2.8% increase", "8% decrease"]),
  H.secondDiscount(T(5), "a computer", "एक कंप्यूटर", 12000, 20, 8400, ["12.5%", "10%", "30%", "15%"]),
  H.spend3(T(5), "milk", "दूध", 10, 10, -15, ["2.85% increase", "5% increase", "2.85% decrease", "No change"]),
  H.doubleNext(T(5), 15, ["15%", "16.5%", "20%", "12%"]),
  H.third(T(5), -20, -10, 8, ["50% increase", "38% increase", "50% decrease", "40% increase"]),
  H.cuboid(T(5), [-20, 25, 10], ["10% increase", "15% increase", "10% decrease", "No change"]),
  K.equal(T(5), -43.75, ["25%", "21.875%", "22%", "30%"]),
  K.chain(T(5), "monthly savings", "मासिक बचत", true, -20, 50, ["20%", "30%", "25%", "10%"]),
  K.three_d(T(5), [50, 20, 10], ["64%", "80%", "70%", "60%"]),
  K.offer(T(5), 28, 15, 15),
  K.revenue(T(5), "kerosene", "मिट्टी के तेल", 20, -25, ["10% decrease", "5% decrease", "10% increase", "No change"]),
];

const h6 = [
  H.four(T(6), [30, -30, 20, -20], ["12.64% decrease", "No change", "12.64% increase", "9% decrease"]),
  H.chainAmount(T(6), "annual bonus", "वार्षिक बोनस", false, 10, 20, 3200, ["₹13,200", "₹10,000", "₹12,000", "₹14,000"]),
  H.quantity(T(6), "tea", "चाय", 20, 8, 10, "kg", "kg", ["9", "8", "10.8", "8.5"]),
  H.updownAmount(T(6), "population", "जनसंख्या", 20, 1200, false, ["30,000", "12,000", "24,000", "6,000"], true),
  H.restore(T(6), "worker's weekly wage", "मज़दूर की साप्ताहिक मज़दूरी", 50, 50, ["300%", "100%", "200%", "150%"], true),
  H.power(T(6), 20, -25, 1, 2, ["32.5% decrease", "5% decrease", "30% decrease", "10% decrease"]),
  H.timeSaved(T(6), "A motorcyclist", "एक मोटरसाइकिल चालक", 50, 20, ["60", "40", "45", "80"]),
  H.toBelow(T(6), "a camera", "एक कैमरा", 20, 10, ["25%", "30%", "20%", "10%"]),
  H.radiusUpDown(T(6), 60, ["59.04% decrease", "36% decrease", "No change", "59.04% increase"]),
  H.markup2(T(6), 30, 20, 5, ["1.2% decrease", "5% increase", "1.2% increase", "No change"]),
  H.secondDiscount(T(6), "a speaker set", "एक स्पीकर सेट", 8000, 25, 5100, ["15%", "10%", "40%", "20%"]),
  H.spend3(T(6), "sugar", "चीनी", 20, 25, -20, ["20% increase", "25% increase", "20% decrease", "No change"]),
  H.doubleNext(T(6), 30, ["30%", "36%", "40%", "27%"]),
  H.third(T(6), 25, 20, 20, ["20% decrease", "25% decrease", "20% increase", "5% decrease"]),
  H.cuboid(T(6), [50, -20, -25], ["10% decrease", "5% increase", "10% increase", "No change"]),
  K.equal(T(6), 110.25, ["45%", "55.125%", "50%", "40%"]),
  K.chain(T(6), "height", "लंबाई", true, 10, 20, ["32%", "30%", "28%", "22%"]),
  K.three_d(T(6), [40, 25, 10], ["59.5%", "75%", "60%", "55%"]),
  K.offer(T(6), 48, 30, 25),
  K.revenue(T(6), "cooking oil", "खाने के तेल", -20, 40, ["12% increase", "20% increase", "12% decrease", "No change"]),
];

module.exports = [...h4, ...h5, ...h6].map(fmt);
