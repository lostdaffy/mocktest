// In Hindi, the language IS the subject. The generator wrote every question
// in English with a translation beside it, so a व्याकरण test came out with ten
// of its twelve questions written in English and seven with romanised options
// - "Vyakti vachak" instead of व्यक्तिवाचक. Every one of them passed the gate,
// because a translation was all the gate ever asked for.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");

process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_MIN_GAP_MS = "0";

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 90) + "]" : ""}`);
};

// Gemini is replaced at the network layer: reassigning the export does not
// intercept the call, because generateOneBatch calls callGemini directly.
const fetchPath = require.resolve("node-fetch", { paths: [SERVER] });
let lastPrompt = "";
require.cache[fetchPath] = {
  id: fetchPath, filename: fetchPath, loaded: true,
  exports: async (url, opts) => {
    lastPrompt = JSON.parse(opts.body).contents[0].parts[0].text;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "[]" }] } }] }) };
  },
};

const { isHindiMedium } = require(path.join(SERVER, "utils/language"));

// ---------------------------------------------------------------------------
// Which subjects are Hindi-medium - decided from the catalog as it already is
// ---------------------------------------------------------------------------
const hindi = [
  { subject: "General Hindi", topic: "व्याकरण" },
  { subject: "Hindi Pedagogy", topic: "भाषा शिक्षण" },
  { subject: "General Hindi", chapter: "संधि" },
  { subject: "General Hindi", syllabusTopics: [{ topic: "मुहावरे और लोकोक्तियाँ" }] },
  { subject: "Sanskrit", topic: "Grammar" },
];
const english = [
  { subject: "Maths", topic: "Percentage" },
  { subject: "English Pedagogy", topic: "Language Teaching" },
  { subject: "English", topic: "Error Spotting" },
  { subject: "GK", topic: "Ancient India" },
  { subject: "Reasoning", topic: "Syllogism" },
  { subject: "Quant", syllabusTopics: ["Profit & Loss"] },
];
check("a Hindi subject is recognised from the catalog as it stands", hindi.every(isHindiMedium),
  hindi.filter((c) => !isHindiMedium(c)).map((c) => c.subject).join(",") || "all five");
check("...and English Pedagogy is NOT mistaken for one", english.every((c) => !isHindiMedium(c)),
  english.filter(isHindiMedium).map((c) => c.subject).join(",") || "none of six");

// ---------------------------------------------------------------------------
// The gate: a translation is no longer enough
// ---------------------------------------------------------------------------
const gem = require(path.join(SERVER, "services/geminiService"));
gem.verifyQuestions = async (qs) => qs.map(() => ({ matches: true, confidence: 1 }));
const pipeline = require(path.join(SERVER, "services/validationPipeline"));
const { ruleBasedCheck } = pipeline;

const LONG = "'अ' एक स्वर है, शेष तीनों व्यंजन हैं, इसलिए उत्तर 'अ' है।";

// The question that actually came out of the first व्याकरण run.
const asItWas = {
  text: "Which of the following is a 'swar' (vowel) in Hindi?",
  textHi: "निम्नलिखित में से कौन सा हिंदी में एक स्वर है?",
  options: ["म", "क", "प", "अ"],
  optionsHi: ["म", "क", "प", "अ"],
  correctIndex: 3,
  solution: LONG,
  solutionHi: LONG,
  subject: "General Hindi",
  topic: "व्याकरण",
};
let r = ruleBasedCheck(asItWas);
check("a Hindi question written in English is refused", !r.passed, r.issues.join(", "));
check("...and told why", /written in Hindi/i.test(r.issues.join(", ")), r.issues.join(", "));

const romanised = {
  ...asItWas,
  text: "'राम' शब्द के लिए संज्ञा का प्रकार पहचानें।",
  options: ["Bhavvachak", "Vyakti vachak", "Samuh vachak", "Jativachak"],
  optionsHi: ["भाववाचक", "व्यक्तिवाचक", "समूहवाचक", "जातिवाचक"],
};
r = ruleBasedCheck(romanised);
check("romanised Hinglish options are refused", !r.passed && /romanised/i.test(r.issues.join(", ")), r.issues.join(", "));

const proper = {
  text: "'राम' शब्द के लिए संज्ञा का प्रकार पहचानें।",
  textHi: "'राम' शब्द के लिए संज्ञा का प्रकार पहचानें।",
  options: ["भाववाचक", "व्यक्तिवाचक", "समूहवाचक", "जातिवाचक"],
  optionsHi: ["भाववाचक", "व्यक्तिवाचक", "समूहवाचक", "जातिवाचक"],
  correctIndex: 1,
  solution: "'राम' एक विशेष व्यक्ति का नाम है, इसलिए यह व्यक्तिवाचक संज्ञा है।",
  solutionHi: "'राम' एक विशेष व्यक्ति का नाम है, इसलिए यह व्यक्तिवाचक संज्ञा है।",
  subject: "General Hindi",
  topic: "व्याकरण",
};
r = ruleBasedCheck(proper);
check("a question properly written in Hindi passes", r.passed, r.issues.join(", "));

// A Hindi question whose options are numbers must not be asked to translate
// them - "12" is the same in every language.
const numeric = {
  ...proper,
  text: "'लड़का' शब्द के बहुवचन में कितने अक्षर हैं?",
  options: ["3", "4", "5", "6"],
  optionsHi: ["3", "4", "5", "6"],
  correctIndex: 0,
};
check("numbers as options are left alone in a Hindi question", ruleBasedCheck(numeric).passed,
  ruleBasedCheck(numeric).issues.join(", "));

// And an English subject is untouched by any of this.
const maths = {
  text: "A shopkeeper marks an item 20% above cost and gives a 10% discount. What is the profit percent?",
  textHi: "एक दुकानदार वस्तु पर लागत से 20% अधिक अंकित करता है और 10% छूट देता है। लाभ प्रतिशत क्या है?",
  options: ["8%", "10%", "12%", "6%"],
  optionsHi: ["8%", "10%", "12%", "6%"],
  correctIndex: 0,
  solution: "Cost 100, marked 120, discount 12, sells at 108. Profit = 8, so 8%.",
  solutionHi: "लागत 100, अंकित 120, छूट 12, विक्रय 108। लाभ = 8, यानी 8%।",
  subject: "Maths",
  topic: "Profit & Loss",
};
check("an English subject's question is unaffected", ruleBasedCheck(maths).passed, ruleBasedCheck(maths).issues.join(", "));

// ---------------------------------------------------------------------------
// A number is the same in every language
// ---------------------------------------------------------------------------
// 22 sound Maths questions were parked in the review queue for "Hindi options
// missing" over options like "42.8%", "14 2/3" and "11". There is no Hindi
// version of 11 to be missing.
const mathsNumeric = {
  text: "Calculate: 16 - [5 - 2 + {3 - (2 - 1)}]",
  textHi: "गणना करें: 16 - [5 - 2 + {3 - (2 - 1)}]",
  options: ["11", "12", "10", "13"],
  correctIndex: 0,
  solution: "16 - [5 - 2 + {3 - 1}] = 16 - [5 - 2 + 2] = 16 - 5 = 11.",
  solutionHi: "हल: कोष्ठक क्रम से हल करने पर उत्तर 11 आता है।",
  subject: "Maths", topic: "Simplification",
};
const wordy = {
  ...mathsNumeric,
  text: "Which of these is the largest river in India by length?",
  textHi: "इनमें से भारत की सबसे लंबी नदी कौन सी है?",
  options: ["Ganga", "Godavari", "Yamuna", "Brahmaputra"],
  solution: "The Ganga is the longest river within India at about 2525 km.",
  solutionHi: "गंगा भारत की सबसे लंबी नदी है, लगभग 2525 किमी।",
  subject: "GK", topic: "Indian Geography",
};

// ---------------------------------------------------------------------------
// The prompt: what the model is actually told
// ---------------------------------------------------------------------------
(async () => {
  await gem.generateQuestions({
    examType: "CTET", examDisplayName: "CTET", subject: "General Hindi",
    topic: "व्याकरण", difficulty: "easy", count: 4, syllabusTopics: ["व्याकरण"],
  });
  const [outNum] = await pipeline.runValidationPipelineBatch([mathsNumeric], { reshuffle: false });
  check("numeric options are accepted without a separate Hindi list",
    outNum.status === "published", outNum.flagReason || outNum.status);
  check("...by copying them across, so the app has both", 
    JSON.stringify(outNum.options) === JSON.stringify(outNum.optionsHi), JSON.stringify(outNum.optionsHi));

  let aligned = true;
  for (let i = 0; i < 25; i++) {
    const [s] = await pipeline.runValidationPipelineBatch([mathsNumeric]);
    if (JSON.stringify(s.options) !== JSON.stringify(s.optionsHi)) aligned = false;
    if (s.options[s.correctIndex] !== "11") aligned = false;
  }
  check("...and shuffling keeps them lined up, answer included", aligned, "25 shuffles");

  const [outWord] = await pipeline.runValidationPipelineBatch([wordy], { reshuffle: false });
  check("but word options with no Hindi are still refused",
    outWord.status !== "published" && /Hindi options missing/.test(outWord.flagReason || ""), outWord.flagReason);

  check("a Hindi subject is told to write in Devanagari", /Devanagari/.test(lastPrompt));
  check("...and told not to romanise", /Never romanise|व्यक्तिवाचक/.test(lastPrompt));
  check("...and the JSON shape it is shown is in Hindi", /"प्रश्न हिंदी में"/.test(lastPrompt),
    (lastPrompt.match(/"text":[^\n]*/) || [])[0]);
  // The shape it is shown must not still ask for an English question. The
  // words "question in English" DO appear in the Hindi prompt - in the line
  // forbidding it - so the shape is what gets checked.
  check("...and the shape no longer asks for an English question",
    !/"text": "question in English"/.test(lastPrompt),
    (lastPrompt.match(/"text":.*/) || [])[0]);

  await gem.generateQuestions({
    examType: "SSC_CGL", examDisplayName: "SSC CGL", subject: "Maths",
    topic: "Percentage", difficulty: "easy", count: 4, syllabusTopics: ["Percentage"],
  });
  check("an English subject is still asked for English plus a translation",
    /question in English/.test(lastPrompt) && /accurate Hindi translation/.test(lastPrompt));
  check("...and is NOT told to write in Devanagari", !/Devanagari/.test(lastPrompt));

  // The format reminder that Error Spotting needed - nine of its first
  // twenty-one questions were thrown away for having three options.
  await gem.generateQuestions({
    examType: "SSC_CGL", examDisplayName: "SSC CGL", subject: "English",
    topic: "Error Spotting", difficulty: "easy", count: 4, syllabusTopics: ["Error Spotting"],
  });
  check("every format is told it still needs exactly 4 options", /spot the error/i.test(lastPrompt),
    (lastPrompt.match(/This holds for EVERY format[^\n]*/) || [])[0]);
  check("...including when the options are just segment labels", /segment labels/i.test(lastPrompt));

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
