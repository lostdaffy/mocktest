// Keyboard maths (2^15 * 3^10) written the way students read it (2¹⁵ × 3¹⁰),
// without touching what only looks similar.
const path = require("path");
const { plainMaths, plainMathsUpdate } = require(path.join(__dirname, "../services/mathNotation"));

const results = [];
const same = (name, got, want) => {
  const ok = got === want;
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   [got ${JSON.stringify(got)}, want ${JSON.stringify(want)}]`}`);
};

same("powers and a spaced * become raised digits and ×",
  plainMaths("What is the number of prime factors in 2^15 * 3^10 * 5^6?"),
  "What is the number of prime factors in 2¹⁵ × 3¹⁰ × 5⁶?");
same("a bracketed base", plainMaths("(245)^102 + (361)^50"), "(245)¹⁰² + (361)⁵⁰");
same("a letter base", plainMaths("x^2 + 1/x^2 = 34"), "x² + 1/x² = 34");
same("a letter power", plainMaths("Unit digit of 5^n is always 5"), "Unit digit of 5ⁿ is always 5");
same("a power ending a sentence", plainMaths("N = 2^10 × 5^5. How many"), "N = 2¹⁰ × 5⁵. How many");
same("a negative power", plainMaths("3^-1"), "3⁻¹");
same("brackets round a plain number go", plainMaths("2^(100) leaves 1"), "2¹⁰⁰ leaves 1");
same("a power with a sum keeps its brackets", plainMaths("3^(x-y) = 27"), "3⁽ˣ⁻ʸ⁾ = 27");
same("brackets left by an earlier pass go", plainMaths("3⁽²⁰²⁶⁾ divided by 80"), "3²⁰²⁶ divided by 80");
same("a power of a power is left readable", plainMaths("What is the unit digit of 7^(7^7)?"), "What is the unit digit of 7^(7⁷)?");
same("a missing digit marked * is not multiplication", plainMaths("the number 5432*1 is divisible by 9"), "the number 5432*1 is divisible by 9");
same("a decimal is not a power", plainMaths("2.5 * 0.36"), "2.5 × 0.36");
same("Hindi text gets the same", plainMaths("2^5 × 3^6 के कितने गुणनखंड"), "2⁵ × 3⁶ के कितने गुणनखंड");
same("already clean text is unchanged", plainMaths("2¹⁵ × 3¹⁰ = 7"), "2¹⁵ × 3¹⁰ = 7");

const q = { text: "2^5 * 3", textHi: "2⁵ × 3", solution: "ok", options: ["2^5", "4"], optionsHi: ["2⁵", "4"], correctIndex: 1 };
const up = plainMathsUpdate(q);
same("only the fields that change are written", JSON.stringify(Object.keys(up)), JSON.stringify(["text", "options"]));
same("...and option order is kept", JSON.stringify(up.options), JSON.stringify(["2⁵", "4"]));
same("a clean question needs no write", plainMathsUpdate({ text: "2⁵", options: ["1", "2", "3", "4"] }), null);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
