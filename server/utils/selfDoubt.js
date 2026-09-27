// A solution that argues with itself is a wrong answer key wearing a
// solution's clothes.
//
// Six were hand-checked and six were wrong:
//
//   "...=> 0.2x = 16 => x = 80. Wait, check math: ... x = 80. Re-check: ...
//    Added = 160 - 80 = 80. Correction: Correct option is 40 if calc is
//    wrong."                                  - the key said 40. It is 80.
//
//   "16/81 + 9/4 = 793/324 ≈ 2.4475, rounding gives 2.37 approx (based on
//    options)."                               - the key said 2.37. It is 2.45.
//
// The second one is the tell: the model worked out the real answer, saw it
// was not among the options, and wrote the option down instead. 124 questions
// in the bank carry a marker like this, 66 of them published.
//
// This is never mendable. Rewriting the solution would leave the wrong key in
// place and hide the only evidence that it is wrong - the question has to go.

const ARGUES_WITH_ITSELF = [
  /\bwait\b/i,
  // The whole family, not just "re-check". Naming one of them let this
  // through, on a question whose solution reads "Rate = 8.07% ... however
  // calculation based on common CGL set leads to 7%. Let's RE-VERIFY: ...
  // 532/6588 = 8.07%. If we assume standard values, 7% is standard." - with
  // 7% ticked and 8% sitting right there among the options.
  /\bre-?(check|verify|calculat|examin|do)\b/i,
  /if we assume standard/i,
  /\bcorrection\s*:/i,
  /\b(i made a|my) mistake\b/i,
  // Working out the real answer and then writing down an option instead.
  /based on (the )?options/i,
  /(adjust|match)\w*\s+(the\s+)?(options|calculation)/i,
  /\bactually,/i,
  /(^|[.;]\s)no,\s/i,
  /\bincorrect (constraint|calculation|result)/i,
  /\blet me (redo|reconsider|try again)\b/i,
];

// True when the solution stops explaining and starts arguing.
const argueswithItself = (solution) => ARGUES_WITH_ITSELF.some((re) => re.test(String(solution || "")));

module.exports = { arguesWithItself: argueswithItself };
