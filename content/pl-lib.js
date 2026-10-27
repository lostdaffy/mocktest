// Shared helpers for the Profit & Loss chapter (pl-*.js). One list of used
// numbers for the whole chapter, so no set of numbers is asked twice in any
// topic; people and items for the questions, in English and Hindi.
//
// Hindi: verbs agree with the person (खरीदता / खरीदती), so every sentence
// has the person as the subject in the present tense - never "ने" with the
// item - and items are nouns that do not change before का/को/में (घड़ी,
// कूलर, लैपटॉप ...), so "घड़ी का अंकित मूल्य" is always right.
const { Q, P } = require("./pct-builders");
const { choices } = require("./pct-adv-builders");
const { numbersOf } = require("./gen");
const { n, rs, pct, clean, isInt } = P;

const USED = new Set();
const cross = (...lists) => lists.reduce((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
const whole = (x) => isInt(clean(x));
const near2 = (x) => isInt(clean(x) * 100);
// A percentage a student can write: whole, 2 decimals, or ⅓-style - never 7 11/27%.
const nicePct = (x) => !/\d \d/.test(pct(clean(x))) && !/\.\d{3,}/.test(pct(clean(x)));
const money = (x) => rs(Math.round(clean(x)));
const paise = (x) => rs(clean(x)); // ₹12.50 when it is not whole
const stepOf = (x) => 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(x) || 1)) - 1);
const hashOf = (p) => [...numbersOf(p)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11);
const f = (x) => n(1 + x / 100); // 20 -> "1.2", -15 -> "0.85"
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const ratio = (a, b) => { const A = Math.round(a * 1000), B = Math.round(b * 1000), g = gcd(A, B); return `${A / g} : ${B / g}`; };

// People: English name, Hindi name, feminine?
const PEOPLE = [["Ravi", "रवि", false], ["Sunita", "सुनीता", true], ["Amit", "अमित", false], ["Neha", "नेहा", true], ["Rahul", "राहुल", false], ["Pooja", "पूजा", true], ["Mohan", "मोहन", false], ["Kavita", "कविता", true], ["Arjun", "अर्जुन", false], ["Meena", "मीना", true], ["Suresh", "सुरेश", false], ["Anjali", "अंजलि", true], ["Vikas", "विकास", false], ["Rekha", "रेखा", true], ["Deepak", "दीपक", false], ["Sapna", "सपना", true]];
const who = (prm, salt = 0) => {
  const [name, nameH, fem] = PEOPLE[(hashOf(prm) + salt) % PEOPLE.length];
  return { name, nameH, he: fem ? "she" : "he", He: fem ? "She" : "He", his: fem ? "her" : "his", His: fem ? "Her" : "His", him: fem ? "her" : "him", v: (m, fm) => (fem ? fm : m) };
};
// A seller who is not named: always masculine in Hindi.
const SELLERS = [["A shopkeeper", "एक दुकानदार"], ["A trader", "एक व्यापारी"], ["A dealer", "एक विक्रेता"], ["A retailer", "एक खुदरा विक्रेता"]];
const seller = (prm) => { const [en, hi] = SELLERS[hashOf(prm) % SELLERS.length]; return { en, hi, low: en.replace(/^A /, "a ") }; };

// Items with a sensible price range (₹) - an item is only asked at a price
// it could really cost. Hindi nouns chosen not to change before का/को/में.
const ITEMS = [
  ["a watch", "एक घड़ी", 300, 6000], ["a chair", "एक कुर्सी", 300, 4000], ["a table", "एक मेज़", 800, 9000], ["an iron", "एक इस्त्री", 400, 2500],
  ["a radio", "एक रेडियो", 300, 2500], ["a bicycle", "एक साइकिल", 2000, 15000], ["a mixer", "एक मिक्सर", 1200, 7000], ["a cooler", "एक कूलर", 3000, 16000],
  ["a sewing machine", "एक सिलाई मशीन", 3000, 16000], ["a mobile phone", "एक मोबाइल फ़ोन", 4000, 30000], ["a TV", "एक टीवी", 8000, 45000], ["a fridge", "एक फ्रिज", 10000, 45000],
  ["a laptop", "एक लैपटॉप", 18000, 80000], ["a sofa set", "एक सोफ़ा सेट", 8000, 60000], ["a scooter", "एक स्कूटर", 40000, 120000], ["a gold ring", "एक सोने की अंगूठी", 8000, 80000],
];
const itemFor = (price, prm) => {
  const fit = ITEMS.filter(([, , lo, hi]) => price >= lo && price <= hi);
  if (!fit.length) return { en: "an article", hi: "एक वस्तु", the: "the article", theH: "वस्तु" };
  const [en, hi] = fit[hashOf(prm) % fit.length];
  return { en, hi, the: en.replace(/^an? /, "the "), theH: hi.replace(/^एक /, "") };
};

// Round prices people actually pay.
const PRICES = [120, 150, 160, 180, 200, 240, 250, 280, 300, 320, 350, 360, 400, 420, 450, 480, 500, 540, 560, 600, 640, 700, 720, 750, 800, 840, 900, 960, 1000, 1080, 1200, 1250, 1400, 1500, 1600, 1800, 2000, 2400, 2500, 2800, 3000, 3200, 3600, 4000, 4500, 4800, 5000, 5400, 6000, 6400, 7200, 7500, 8000, 9000, 9600, 10000, 12000, 12500, 14000, 15000, 16000, 18000, 20000, 24000, 25000, 30000, 32000, 36000, 40000, 45000, 48000, 50000];
const GAINS = [4, 5, 6, 8, 10, 12, 15, 16, 18, 20, 24, 25, 30, 35, 40, 45, 50, 60];
const LOSSES = [4, 5, 6, 8, 10, 12, 15, 16, 18, 20, 24, 25, 30, 35, 40];

const need = (cond, what) => { if (!cond) throw new Error(what); };

module.exports = { Q, P, choices, n, rs, pct, clean, isInt, USED, cross, whole, near2, nicePct, money, paise, stepOf, hashOf, f, gcd, ratio, who, seller, itemFor, PRICES, GAINS, LOSSES, need };
