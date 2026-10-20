// Maths typed the keyboard way - 2^15 * 3^10 - reaches the student exactly
// like that: the app shows text as it is, so a caret never becomes a power.
// This writes powers as raised digits (2¹⁵ × 3¹⁰) and a spaced * as ×.
//
// What it leaves alone, on purpose:
//   - a power of a power, 7^(7^7): written flat it would read as 7^77
//   - an unspaced * between digits, 5432*1: that is a missing digit
const SUP_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUP_LETTERS = { a: "ᵃ", b: "ᵇ", c: "ᶜ", k: "ᵏ", m: "ᵐ", n: "ⁿ", p: "ᵖ", r: "ʳ", x: "ˣ", y: "ʸ" };
const SUP_SIGNS = { "+": "⁺", "-": "⁻", "−": "⁻", "=": "⁼" };

const raise = (s) =>
  [...s].map((c) => (/\d/.test(c) ? SUP_DIGITS[+c] : SUP_LETTERS[c] || SUP_SIGNS[c] || (c === " " ? "" : null)));

function plainMaths(value) {
  if (typeof value !== "string" || !value) return value;
  let t = value;
  // 2^15, (245)^102, x^2, 5^-1
  t = t.replace(/([0-9A-Za-z)\]])\s*\^\s*(-?\d+)(?!\d|\.\d)/g, (m, base, exp) => base + raise(exp).join(""));
  // 2^(100) - brackets round a plain number add nothing
  t = t.replace(/([0-9A-Za-z)\]])\^\((\d+)\)/g, (m, base, exp) => base + raise(exp).join(""));
  // 5^n, 2^a
  t = t.replace(/([0-9A-Za-z)\]])\^([abckmnpxy])(?![A-Za-z])/g, (m, base, exp) => base + SUP_LETTERS[exp]);
  // 3^(x − y), 2^(n + 1): raised, keeping the brackets
  t = t.replace(/([0-9A-Za-z)\]])\^\(([0-9abckmnpxy +\-−]+)\)/g, (m, base, exp) => {
    const r = raise(exp);
    return r.includes(null) ? m : `${base}⁽${r.join("")}⁾`;
  });
  // ⁽²⁰²⁶⁾ left by an earlier pass: the brackets go
  t = t.replace(/⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾/g, "$1");
  // 2 * 3, (6) * (10), 4*(5): multiplication. 5432*1 is not touched.
  t = t
    .replace(/(\d|\)|\]|[⁰¹²³⁴⁵⁶⁷⁸⁹])\s+\*\s+(?=[\d([√])/g, "$1 × ")
    .replace(/(\d|\))\*(?=\()/g, "$1 × ")
    .replace(/\)\s*\*\s*(?=\d)/g, ") × ");
  return t;
}

const FIELDS = ["text", "textHi", "solution", "solutionHi"];

// The fields of one question that change, or null when none do.
function plainMathsUpdate(q) {
  const set = {};
  for (const f of FIELDS) {
    const v = plainMaths(q[f]);
    if (v !== q[f]) set[f] = v;
  }
  for (const f of ["options", "optionsHi"]) {
    if (!Array.isArray(q[f])) continue;
    const v = q[f].map(plainMaths);
    if (v.some((o, i) => o !== q[f][i])) set[f] = v;
  }
  return Object.keys(set).length ? set : null;
}

module.exports = { plainMaths, plainMathsUpdate };
