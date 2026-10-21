// Two "between" questions where an end of the range was itself a multiple
// (3,000 = 60 × 50, 300 = 12 × 25), so 33/34 and 16/17 were both arguable -
// flagged by the AI check on 2026-10-21. New ranges whose ends are not
// multiples, so "between" can only mean one count.
const L = require("./lib");
const Q = (t, r, rr, q, qh, o, a, value, s, sh) => ({ t: `Number System · ${t}`, r, rr, q, qh, o, a, v: () => L.only(o, a, String(value())), s, sh });

module.exports = [
  Q("Factors and Multiples · Medium #5", "6ad83f4f2b875a7048b00bc7", "ambiguous: 3,000 is itself a multiple of 60, so 33 or 34 depending on whether it counts",
    "How many numbers between 1,000 and 3,100 are divisible by each of 15, 20 and 30?", "1,000 और 3,100 के बीच कितनी संख्याएँ 15, 20 और 30 में से प्रत्येक से विभाज्य हैं?", ["35", "36", "34", "51"], 0, () => L.count(1001, 3099, (n) => n % 15 === 0 && n % 20 === 0 && n % 30 === 0),
    "Divisible by each of 15, 20 and 30 means divisible by their LCM, 60. Multiples of 60 up to 3,100: 51 (60 × 51 = 3,060); up to 1,000: 16 (60 × 16 = 960). Neither end is a multiple, so between them there are 51 − 16 = 35.", "15, 20 और 30 में से प्रत्येक से विभाज्य का अर्थ उनके LCM, 60 से विभाज्य। 3,100 तक 60 के गुणज: 51 (60 × 51 = 3,060); 1,000 तक: 16 (60 × 16 = 960)। कोई भी सिरा गुणज नहीं, अतः बीच में 51 − 16 = 35।"),
  Q("Factors and Multiples · Easy #7", "6ad83b322b875a7048afff40", "ambiguous: 300 is itself a multiple of 12, so 16 or 17 depending on whether it counts",
    "How many multiples of 12 lie between 310 and 500?", "310 और 500 के बीच 12 के कितने गुणज हैं?", ["16", "17", "15", "18"], 0, () => L.count(311, 499, (n) => n % 12 === 0),
    "Multiples of 12 up to 500: 41 (12 × 41 = 492); up to 310: 25 (12 × 25 = 300). Neither 310 nor 500 is a multiple, so between them there are 41 − 25 = 16 (from 312 to 492).", "500 तक 12 के गुणज: 41 (12 × 41 = 492); 310 तक: 25 (12 × 25 = 300)। न 310 न 500 गुणज है, अतः बीच में 41 − 25 = 16 (312 से 492 तक)।"),
];
