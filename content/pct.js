// Helpers for Percentage questions: exact-looking numbers for options and
// checks. Every value goes through `clean` so 0.1 + 0.2 style float dust
// never decides an answer.
const clean = (x) => Math.round(x * 1e9) / 1e9;
const isInt = (x) => Math.abs(clean(x) - Math.round(clean(x))) < 1e-9;

// 12100 -> "12,100"; 12.5 -> "12.5"; 0.125 -> "0.125" (up to 4 places).
const n = (x) => {
  const v = clean(x);
  if (isInt(v)) return Math.round(v).toLocaleString("en-US");
  return Number(v.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 });
};
const rs = (x) => "₹" + (isInt(x) ? n(x) : clean(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// "8% increase" / "4% decrease" / "No change", and the Hindi words for them.
const chg = (x) => (Math.abs(clean(x)) < 1e-9 ? "No change" : `${pct(Math.abs(x))} ${x > 0 ? "increase" : "decrease"}`);
const chgH = (s) => s === "No change" ? "कोई परिवर्तन नहीं" : s.replace(" increase", " वृद्धि").replace(" decrease", " कमी");

// A value as a whole number and a simple fraction when it is one:
// 33.333... -> "33⅓", 12.5 -> "12½", 4.7619 (= 100/21) -> "4 16/21".
const VULGAR = { "1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾", "1/5": "⅕", "2/5": "⅖", "3/5": "⅗", "4/5": "⅘", "1/6": "⅙", "5/6": "⅚", "1/7": "⅐", "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞", "1/9": "⅑", "1/10": "⅒" };
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const mixed = (x) => {
  const v = clean(x);
  if (isInt(v)) return Math.round(v).toLocaleString("en-US");
  // Up to two decimal places it is written as a decimal: 23.5, 0.25, 33.1.
  if (isInt(v * 100)) return n(v);
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const w = Math.floor(a + 1e-9);
  const f = a - w;
  for (let d = 2; d <= 200; d++) {
    const p = Math.round(f * d);
    if (p > 0 && p < d && Math.abs(f - p / d) < 1e-9) {
      const g = gcd(p, d);
      const key = `${p / g}/${d / g}`;
      const fracText = VULGAR[key] || (w ? ` ${key}` : key);
      return sign + (w ? w.toLocaleString("en-US") : "") + fracText;
    }
  }
  return sign + n(a);
};
const pct = (x) => mixed(x) + "%";

// Net % change of successive changes: [20, -10] -> 8.
const net = (...ch) => clean((ch.reduce((m, c) => m * (1 + c / 100), 1) - 1) * 100);
// Value after successive changes.
const after = (v, ...ch) => clean(ch.reduce((m, c) => m * (1 + c / 100), v));
// The change that undoes a change of c%: 25 -> -20.
const undo = (c) => clean((100 / (100 + c) - 1) * 100);

// "an" before a number said with a vowel sound: 8, 80-89, 11, 18 (not 110, 180).
const an = (s) => (/^(8|1[18](?![\d,]))/.test(String(s)) ? "an" : "a");

module.exports = { an, clean, isInt, n, rs, mixed, pct, net, after, undo, chg, chgH };
