// The marked answer has to appear in the question's own solution.
//
// This is the one check that is arithmetic rather than linguistic, and it is
// the surest of them. A solution works the question out and ends on a number;
// if the option ticked is a different number, one of the two is wrong, and it
// is almost always the tick:
//
//   "600/x - 600/(x+20) = 2 ... (x+100)(x-60) = 0. x = 60 km/h."
//    ...with 75 km/h marked.
//
//   "How many prime numbers are there between 50 and 90?"
//    "53, 59, 61, 67, 71, 73, 79, 83, 89 - 9 primes."   ...with 8 marked.
//
//   "sqrt(1 + 25/144) = 13/12 = 1 + 1/12, so x = 1."    ...with 5 marked.
//
// Twelve in a bank of eleven hundred, seven of them published. Every one
// checked by hand had the wrong key.
//
// Only applied where all four options are a single plain number, because
// anywhere else the comparison is guesswork: "1:7" is two numbers, "Either I
// or II follows" is none.

const numbersIn = (s) =>
  (String(s ?? "").match(/-?\d[\d,]*\.?\d*/g) || []).map((x) => parseFloat(x.replace(/,/g, "")));

// "Rs 72", "72 kg", "16.36 km/h" all carry exactly one number. "1:7" and
// "2 years 6 months" carry two, so they are left alone.
const singleNumber = (option) => {
  const n = numbersIn(option);
  return n.length === 1 ? n[0] : null;
};

// Rounding is normal in these solutions - 16.3636... written as 16.36 - so a
// small relative difference still counts as the same number.
const TOLERANCE = 0.02;
const same = (a, b) => Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(b));

/**
 * False when the question's own solution never arrives at the answer it ticks.
 * True when it does, or when the question is not the kind this can judge.
 */
function solutionReachesTheAnswer(q) {
  const options = (q.options || []).map(singleNumber);
  if (options.length !== 4 || options.some((o) => o === null)) return true;

  const marked = options[q.correctIndex];
  if (marked === null || marked === undefined) return true;

  const working = numbersIn(q.solution);
  if (!working.length) return true;

  return working.some((n) => same(n, marked));
}

module.exports = { solutionReachesTheAnswer, numbersIn, singleNumber };
