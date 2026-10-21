// Percentage · Successive Percentage Change · Advanced #1 - #10: twenty
// exam kinds (pct-adv-builders.js), one of each in every test, each with its
// own numbers in every test (no set of changes reused in another order).
// Every answer is worked out again in `v`; the wrong options are the slips
// students make. `pc-succ-adv-a/b/c.js` take tests 1-3, 4-6 and 7-10.
const { A } = require("./pct-adv-builders");
const { fmt } = require("./fmt");
const T = (n) => `Percentage · Successive Percentage Change · Advanced #${n}`;

// One row per test: the numbers of each kind.
const BACK = [
  ["shop's monthly rent", "दुकान का मासिक किराया", false, [20, -10, 25], 10000],
  ["machine's price", "मशीन का मूल्य", false, [-20, 25, 10], 24000],
  ["worker's daily wage", "मज़दूर की दैनिक मज़दूरी", true, [25, -20, 15], 800],
  ["car's value", "कार का मूल्य", false, [-10, -20, 25], 500000],
  ["share's price", "शेयर का मूल्य", false, [30, -20, -25], 1500],
  ["school's annual fee", "स्कूल का वार्षिक शुल्क", false, [10, 20, -25], 12000],
  ["company's profit", "कंपनी का लाभ", false, [50, -40, 20], 80000],
  ["family's monthly budget", "परिवार का मासिक बजट", false, [-25, 20, 10], 20000],
  ["laptop's price", "लैपटॉप का मूल्य", false, [15, -20, -10], 50000],
  ["farmer's income", "किसान की आय", true, [40, -25, -20], 30000],
];
const PER_UNIT = [
  ["sugar", "चीनी", 25, 800, 4, "kg", "kg", "kg", "old"],
  ["rice", "चावल", -20, 600, 3, "kg", "kg", "kg", "new"],
  ["mustard oil", "सरसों के तेल", -10, 900, 2, "litres", "litre", "लीटर", "old"],
  ["wheat", "गेहूँ", 20, 1200, 8, "kg", "kg", "kg", "new"],
  ["apples", "सेब", -25, 1500, 5, "kg", "kg", "kg", "old"],
  ["lentils", "दाल", 50, 1800, 10, "kg", "kg", "kg", "old"],
  ["tea", "चाय", -20, 2400, 2, "kg", "kg", "kg", "new"],
  ["milk", "दूध", 25, 1200, 5, "litres", "litre", "लीटर", "old"],
  ["onions", "प्याज़", -40, 600, 8, "kg", "kg", "kg", "old"],
  ["potatoes", "आलू", 10, 880, 4, "kg", "kg", "kg", "new"],
];
const MARKUP = [[20, 10, 8], [25, 20, 20], [10, 20, 17], [20, 20, 12], [25, 10, 8], [10, 10, 8], [30, 20, 12], [50, 20, 20], [40, 25, 8], [25, 25, 5]];
const GAP_PRICE = [[30, 20, 10, 5000], [35, 20, 20, 12000], [50, 30, 30, 8000], [25, 15, 10, 6000], [45, 25, 25, 16000], [20, 10, 10, 4500], [60, 40, 30, 7500], [33, 20, 15, 9000], [55, 30, 35, 20000], [18, 10, 8, 25000]];
const CYLINDER = [[10, -20], [20, -20], [-10, 20], [50, -50], [-20, 40], [10, 10], [20, -30], [-30, 40], [25, -20], [-25, 60]];
const RATIO_POW = [[20, 20, 2, 1], [20, -10, 2, 1], [-20, 28, 2, 1], [8, 20, 1, 2], [10, 21, 3, 1], [50, 25, 2, 2], [50, 50, 2, 1], [-10, -25, 1, 2], [25, 25, 2, 1], [-20, -20, 3, 2]];
const RAISE_GAP = [[10, 20, 25000], [5, 10, 40000], [10, 15, 20000], [20, 25, 30000], [8, 10, 50000], [10, 10, 60000], [5, 8, 25000], [12, 15, 35000], [15, 20, 45000], [20, 20, 55000]];
const CUT2 = [
  ["sugar", "चीनी", 20, 25, 20], ["petrol", "पेट्रोल", 10, 20, 10], ["milk", "दूध", 25, 20, 5], ["rice", "चावल", 20, 20, 8], ["cooking gas", "रसोई गैस", 25, 28, 20],
  ["electricity", "बिजली", 50, 20, 26], ["tea", "चाय", 40, 25, 5], ["lentils", "दाल", 30, 20, 4], ["vegetables", "सब्ज़ियों", 25, 60, 40], ["coffee", "कॉफ़ी", 10, 25, 10],
];
const CHAIN_GAP = [
  ["salary", "वेतन", false, 20, -10, 30000], ["income", "आय", true, -25, 20, 40000], ["pocket money", "जेब ख़र्च", false, 50, -20, 2000], ["monthly savings", "मासिक बचत", true, 10, 25, 8000],
  ["bonus", "बोनस", false, -20, 50, 6000], ["pension", "पेंशन", true, 25, -40, 15000], ["commission", "कमीशन", false, 30, 10, 5000], ["monthly wage", "मासिक मज़दूरी", true, -10, -20, 12000],
  ["fee", "शुल्क", false, 40, -25, 4000], ["annual bonus", "वार्षिक बोनस", false, -15, 20, 25000],
];
const EQUAL3 = [[10, true], [20, true], [10, false], [20, false], [30, true], [25, false], [50, true], [30, false], [40, false], [5, true]];
const BACK2 = [
  ["salary", "वेतन", false, -25, 60], ["income", "आय", true, -20, -25], ["score", "स्कोर", false, 50, -20], ["weight", "वज़न", false, 25, 60], ["height", "लंबाई", true, 25, 28],
  ["speed", "गति", true, -20, -50], ["savings", "बचत", true, 50, -50], ["profit", "लाभ", false, -40, 25], ["pocket money", "जेब ख़र्च", false, 60, 50], ["turnover", "कारोबार", false, 50, 100],
];
const FIVE = [[20, -25, 10, -10, 50], [10, 10, -20, 25, -10], [-10, 20, -20, 10, -25], [25, -20, 25, -20, 10], [50, -20, -25, 10, -10], [-20, 25, -10, 20, -50], [30, -30, 10, -10, 20], [-5, 10, -10, 20, -20], [40, -50, 20, 25, -10], [15, -20, 10, -10, 25]];
const FOURTH = [[[25, -20, 50], 0], [[10, -20, 25], -12], [[-20, -25, 50], 8], [[50, -40, -20], 8], [[25, 20, -20], 0], [[40, -20, 25], 12], [[-25, -20, 10], -1], [[30, -50, 20], 4], [[10, 10, -50], 21], [[20, 20, -25], -10]];
const NEXT_MORE = [[10, 10], [20, 5], [10, 5], [20, 10], [25, 15], [5, 10], [30, 10], [15, 5], [40, 10], [12.5, 7.5]];
const LATE = [
  ["A bus driver", "एक बस चालक", 20, 15], ["A truck driver", "एक ट्रक चालक", 25, 24], ["A car driver", "एक कार चालक", 10, 6], ["A jeep driver", "एक जीप चालक", 40, 30], ["A van driver", "एक वैन चालक", 50, 40],
  ["A taxi driver", "एक टैक्सी चालक", 20, 25], ["A lorry driver", "एक लॉरी चालक", 25, 15], ["A tractor driver", "एक ट्रैक्टर चालक", 30, 18], ["An auto driver", "एक ऑटो चालक", 15, 9], ["A school bus driver", "एक स्कूल बस चालक", 40, 24],
];
const THIRD_DISCOUNT = [
  ["a sofa set", "एक सोफ़ा सेट", 50000, 20, 10, 34200], ["a refrigerator", "एक फ़्रिज", 40000, 10, 10, 29160], ["a television", "एक टीवी", 30000, 25, 20, 16200], ["a laptop", "एक लैपटॉप", 60000, 15, 10, 36720], ["a music system", "एक म्यूज़िक सिस्टम", 8000, 25, 10, 5184],
  ["a camera", "एक कैमरा", 25000, 20, 20, 14000], ["a scooter", "एक स्कूटर", 12000, 10, 25, 6885], ["an air cooler", "एक एयर कूलर", 15000, 20, 15, 9180], ["a home theatre", "एक होम थिएटर", 36000, 25, 20, 20520], ["a mobile phone", "एक मोबाइल फ़ोन", 20000, 30, 10, 10080],
];
const RESTORE3 = [
  ["price", "मूल्य", false, [20, 25, 50]], ["factory's output", "कारख़ाने का उत्पादन", false, [50, 20, 37.5]], ["worker's wage", "मज़दूर की मज़दूरी", true, [20, 20, 37.5]], ["salary", "वेतन", false, [20, 20, 25]], ["share price", "शेयर का मूल्य", false, [50, 20, 20]],
  ["bus's speed", "बस की गति", true, [50, 50, 20]], ["machine's output", "मशीन का उत्पादन", false, [25, 20, 37.5]], ["club's membership", "क्लब की सदस्यता", true, [50, 50, 50]], ["shop's daily sale", "दुकान की दैनिक बिक्री", true, [60, 50, 20]], ["train's speed", "रेलगाड़ी की गति", true, [60, 37.5, 20]],
];
const QUANTITY2 = [
  ["sugar", "चीनी", 15, 20, 15, 12, "kg", "kg"], ["rice", "चावल", 5, 20, 5, 18, "kg", "kg"], ["milk", "दूध", 25, 12, 12, 50, "litres", "लीटर"], ["wheat", "गेहूँ", 40, 20, 26, 40, "kg", "kg"], ["mustard oil", "सरसों का तेल", 10, 50, 10, 30, "litres", "लीटर"],
  ["potatoes", "आलू", 60, 25, 20, 25, "kg", "kg"], ["tea", "चाय", 25, 40, 40, 5, "kg", "kg"], ["lentils", "दाल", 50, 20, 35, 24, "kg", "kg"], ["onions", "प्याज़", 20, 30, 30, 12, "kg", "kg"], ["coffee", "कॉफ़ी", 20, 50, 8, 10, "kg", "kg"],
];
const TO_ABOVE = [
  ["a sofa", "एक सोफ़े", 50, 26], ["a cooler", "एक कूलर", 25, 10], ["a phone", "एक फ़ोन", 60, 36], ["a jacket", "एक जैकेट", 40, 26], ["a bag", "एक बैग", 20, 8],
  ["a heater", "एक हीटर", 80, 8], ["a mattress", "एक गद्दे", 30, 4], ["a helmet", "एक हेलमेट", 25, 5], ["a printer", "एक प्रिंटर", 50, 5], ["a guitar", "एक गिटार", 60, 4],
];
const SCHEMES = [[10, 20, 30, 5000], [20, 20, 40, 8000], [15, 10, 25, 6000], [25, 20, 48, 10000], [10, 10, 22, 15000], [30, 20, 55, 4000], [5, 10, 15, 20000], [12, 15, 30, 12000], [40, 25, 70, 5000], [8, 10, 18, 25000]];

const test = (i) => {
  const t = T(i + 1);
  return [
    A.back(t, ...BACK[i]),
    A.perUnit(t, ...PER_UNIT[i]),
    A.markup(t, ...MARKUP[i]),
    A.gapPrice(t, ...GAP_PRICE[i]),
    A.cylinder(t, ...CYLINDER[i]),
    A.ratioPow(t, ...RATIO_POW[i]),
    A.raiseGap(t, ...RAISE_GAP[i]),
    A.cut2(t, ...CUT2[i]),
    A.chainGap(t, ...CHAIN_GAP[i]),
    A.equal3(t, ...EQUAL3[i]),
    A.back2(t, ...BACK2[i]),
    A.five(t, FIVE[i]),
    A.fourth(t, ...FOURTH[i]),
    A.nextMore(t, ...NEXT_MORE[i]),
    A.late(t, ...LATE[i]),
    A.thirdDiscount(t, ...THIRD_DISCOUNT[i]),
    A.restore3(t, ...RESTORE3[i]),
    A.quantity2(t, ...QUANTITY2[i]),
    A.toAbove(t, ...TO_ABOVE[i]),
    A.schemes(t, ...SCHEMES[i]),
  ];
};

const tests = (from, to) => Array.from({ length: to - from + 1 }, (_, k) => test(from - 1 + k)).flat().map(fmt);
module.exports = { tests };
