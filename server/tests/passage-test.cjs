// "According to the passage, why did the protagonist leave the village?" is
// half a question. Every one of the first twelve Unseen Passage questions read
// like that, and nine of twelve in अपठित गद्यांश - four options, a correct
// index, a solution, Hindi throughout, and no passage anywhere. A student
// opening one has nothing to read and nothing to answer from.
//
// Reading Comprehension got it right unprompted - all twelve carry their
// passage inside the question - which is the shape the others must match.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");

process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_MIN_GAP_MS = "0";

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + String(detail).slice(0, 88) + "]" : ""}`);
};

const fetchPath = require.resolve("node-fetch", { paths: [SERVER] });
let lastPrompt = "";
require.cache[fetchPath] = {
  id: fetchPath, filename: fetchPath, loaded: true,
  exports: async (url, opts) => {
    lastPrompt = JSON.parse(opts.body).contents[0].parts[0].text;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "[]" }] } }] }) };
  },
};

const { isComprehension } = require(path.join(SERVER, "utils/comprehension"));
const { ruleBasedCheck } = require(path.join(SERVER, "services/validationPipeline"));

// ---------------------------------------------------------------------------
// Which chapters are comprehension chapters
// ---------------------------------------------------------------------------
check("the comprehension chapters are recognised, for the PROMPT",
  ["Unseen Passage", "अपठित गद्यांश", "Reading Comprehension"].every((c) => isComprehension({ chapter: c })));
check("...and an ordinary chapter is not",
  !["Percentage", "Syllogism", "Books, Awards & Sports", "Error Spotting", "व्याकरण"].some((c) => isComprehension({ chapter: c })));

// The gate must NOT judge by chapter. CTET's comprehension chapters are half
// comprehension and half teaching method, and judging by chapter binned 81
// sound pedagogy questions in a single run.
const pedagogy = [
  "When a passage contains an unfamiliar idiomatic expression, what should a student primarily rely on?",
  "Which technique is most appropriate when a student needs to find specific information like a date in a passage?",
  "If a question asks to 'identify the sequence of events' in a narrative passage, what cognitive skill is tested?",
  "What does a question asking about the 'author's tone' in a passage typically evaluate?",
  "When a passage uses a pronoun like 'he' or 'they', what does a question about its 'reference' test?",
  "Which reading skill is most important when answering 'factual' questions based on a passage?",
  "If a passage provides a 'synonym' question, what is the student expected to find?",
  "What is the primary purpose of identifying the 'supporting details' in a comprehension passage?",
];
const hindiPedagogy = ["अपठित गद्यांश पढ़ाते समय शिक्षक को सबसे पहले क्या करना चाहिए?"];

// ---------------------------------------------------------------------------
// The gate, on the questions that actually came out of the first runs
// ---------------------------------------------------------------------------
const sound = {
  options: ["a", "b", "c", "d"], correctIndex: 0,
  solution: "The passage says so explicitly in its second sentence, which names it.",
  textHi: "x", optionsHi: ["a", "b", "c", "d"], solutionHi: "y",
};
const refused = (chapter, text) =>
  ruleBasedCheck({ ...sound, chapter, topic: chapter, text }).issues.some((i) => /passage/.test(i));

// Real ones from the first Unseen Passage test.
const broken = [
  "According to the passage, why did the protagonist leave the village?",
  "Which of the following best describes the tone of the author?",
  "Identify the part of speech of the word 'quickly' used in the second paragraph.",
  "What is the main theme of the passage?",
  "Which word in the text acts as a synonym for 'joyful'?",
  "Which of these statements is NOT supported by the information provided in the passage?",
  "Which of the following phrases from the passage best summarizes the central conflict faced by the narrator?",
];
check("a question about a passage that is not there is refused",
  broken.every((t) => refused("Unseen Passage", t)),
  broken.filter((t) => !refused("Unseen Passage", t))[0] || "all seven refused");

const brokenHi = [
  "गद्यांश का उचित शीर्षक क्या हो सकता है?",
  "गद्यांश में प्रयुक्त 'साहस' शब्द का विलोम क्या होगा?",
  "गद्यांश के अनुसार 'परिश्रम' का क्या फल होता है?",
];
check("...in Hindi too", brokenHi.every((t) => refused("अपठित गद्यांश", t)),
  brokenHi.filter((t) => !refused("अपठित गद्यांश", t))[0] || "all three refused");

check("...and the reason says what is wrong",
  /does not contain/.test(ruleBasedCheck({ ...sound, chapter: "Unseen Passage", topic: "Unseen Passage", text: broken[0] }).issues.join(", ")),
  ruleBasedCheck({ ...sound, chapter: "Unseen Passage", topic: "Unseen Passage", text: broken[0] }).issues.join(", "));

// The shape that works - a real one from Reading Comprehension.
const whole =
  "Read the following passage and answer the question: 'Water is essential for life. It covers 71% of the Earth's surface and is vital for the survival of all known organisms.' What percentage of the Earth's surface is covered by water?";
check("a question that carries its passage passes", !refused("Reading Comprehension", whole));

// The false positive that would have mattered: a GK question about a book.
check("'the author of Wings of Fire' is not mistaken for comprehension",
  !refused("Books, Awards & Sports", "Who is the author of the famous book 'Wings of Fire'?"));
check("...nor 'the author of Godan'",
  !refused("Books, Awards & Sports", "Who is the author of the book 'Godan'?"));
check("an ordinary maths question is untouched",
  !refused("Percentage", "A shopkeeper marks an item 20% above cost and gives a 10% discount. What is the profit percent?"));

// A stray in any chapter, not just the comprehension ones.
check("a stray passage question in another chapter is caught too",
  refused("Error Spotting", "According to the passage, which part has an error?"));

// The heart of it: "A passage" is a general statement, "THE passage" points
// at one that should be on the screen.
check("a pedagogy question that mentions passages in general is NOT binned",
  !pedagogy.some((t) => refused("Unseen Passage", t)),
  pedagogy.filter((t) => refused("Unseen Passage", t))[0] || "all eight kept");
check("...in Hindi too", !hindiPedagogy.some((t) => refused("अपठित गद्यांश", t)),
  hindiPedagogy.filter((t) => refused("अपठित गद्यांश", t))[0] || "kept");
check("...while the same chapter still refuses a question about THE passage",
  refused("Unseen Passage", "According to the passage, why did the protagonist leave the village?") &&
  refused("अपठित गद्यांश", "गद्यांश के अनुसार 'परिश्रम' का क्या फल होता है?"));

// ---------------------------------------------------------------------------
// "A passage" frames the whole sentence; "the text" after it refers back
// ---------------------------------------------------------------------------
// Naming adjectives one by one is always one word short - the first version
// knew first/second/last and then met "the CONCLUDING paragraph", and knew
// "in the text" but not "BASED ON the text". Both were unanswerable and both
// went through.
const missedBefore = [
  "Based on the text, what can be inferred about the protagonist's relationship with his father?",
  "Which statement best summarizes the concluding paragraph?",
  "What is the primary function of the third paragraph in relation to the overall passage?",
];
check("a definite reference is caught however it is worded",
  missedBefore.every((t) => refused("Unseen Passage", t)),
  missedBefore.filter((t) => !refused("Unseen Passage", t))[0] || "all three refused");

// The other half: an indefinite passage sets the frame, and a later "the
// text" refers back to that frame rather than to something on the screen.
const framedGenerically = [
  "When a passage is read to understand the general meaning or the gist of the text, this technique is called what?",
  "What is the most appropriate way for a student to understand the tone of the author in a comprehension passage?",
  "When the author uses a phrase like 'on the other hand' in a passage, what is the intended purpose?",
  "When a passage includes a pronoun, what should a reader do to understand the text better?",
  "When a passage asks for the 'title' of the text, what should the learner specifically look for?",
  "What is the primary purpose of reading an unseen passage in a language examination?",
  "Why are 'True/False' type questions included in comprehension tests?",
];
check("'a passage ... the text' is a teaching question, and is kept",
  !framedGenerically.some((t) => refused("Unseen Passage", t)),
  framedGenerically.filter((t) => refused("Unseen Passage", t))[0] || "all seven kept");

// ---------------------------------------------------------------------------
// It must not be quietly "repaired" into passing
// ---------------------------------------------------------------------------
const factoryPath = path.join(SERVER, "services/questionFactory");
delete require.cache[require.resolve(factoryPath)];
const factorySrc = require("fs").readFileSync(factoryPath + ".js", "utf8");
check("a missing passage is not treated as a fixable wording gap",
  /does not contain/.test(factorySrc.split("const fatal")[1].split("\n")[0]),
  (factorySrc.match(/const fatal[^\n]*/) || [])[0]);

// ---------------------------------------------------------------------------
// The prompt tells the model to write the passage in
// ---------------------------------------------------------------------------
const gem = require(path.join(SERVER, "services/geminiService"));
(async () => {
  await gem.generateQuestions({
    examType: "CTET", examDisplayName: "CTET", subject: "English Pedagogy",
    topic: "Unseen Passage", difficulty: "easy", count: 4, syllabusTopics: ["Unseen Passage"],
  });
  check("a comprehension chapter is told to put the passage in the question", /must stand alone/i.test(lastPrompt));
  check("...and told not to refer to one that is absent", /without the passage being right there/i.test(lastPrompt));
  check("...and told each question gets its own passage", /OWN short passage/i.test(lastPrompt));

  await gem.generateQuestions({
    examType: "SSC_CGL", examDisplayName: "SSC CGL", subject: "Maths",
    topic: "Percentage", difficulty: "easy", count: 4, syllabusTopics: ["Percentage"],
  });
  check("an ordinary chapter gets none of that", !/must stand alone/i.test(lastPrompt));

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
