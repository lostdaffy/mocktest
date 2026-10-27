// One idea asked twice in one paper, in other words.
//
// The repeat checks before this one compare wording: looksLikeRepeat wants the
// same numbers and most of the same words (it was built on maths), and
// sameFactInPaper wants the same answer and 40% of the same words (built on
// GK). A pedagogy question reworded shares neither. UPTET Paper 1 Mock #2,
// built on 22 Oct 2026, went out with this in one 30-question Child
// Development section:
//
//   "Which learning difficulty primarily affects a child's ability to read,
//    spell, and decode words accurately?"                      -> Dyslexia
//   "...a child frequently reverses letter orientations like 'b' and 'd'
//    while reading and writing..."    -> Dyslexia involving reading and ...
//   "...struggles with reading fluency, reversing letters like 'b' and 'd'..."
//                                                       -> Dyslexia disorder
//
// and two each of dyscalculia, Kohlberg's pre-conventional level, CCE as
// holistic evaluation, heredity setting the potential, intrinsic motivation
// and the home language as a resource; three "बहुभाषी कक्षा" questions in
// Hindi Pedagogy; and in Maths two "1/2 + 1/3 = 2/5" error questions and the
// same 45 m x 30 m park twice. 39 of its 150 questions were rewritten by hand
// on 26 Oct.
//
// Two checks, each for the kind of section it was measured on:
//
//   conceptMatch  - theory (Child Development, the pedagogies, Teaching and
//                   Life Skills, EVS teaching questions). Same answer idea,
//                   same topic.
//   sameFigures   - maths. The same figures in the same setting, asked for
//                   something else ("perimeter of the park" / "cost of
//                   fencing the same park").

// ---------------------------------------------------------------- words

// Hindi spellings of one word vary from question to question: डिस्कैल्कुलिया
// and डिसकैल्कुलिया, पढ़ and पढ, चुनौतियाँ and चुनौतियां. Halant and nukta are
// dropped and chandrabindu read as anusvara before anything is compared.
const plainHi = (s) => String(s).replace(/[़्]/g, "").replace(/ँ/g, "ं");
const rx = (source) => new RegExp(plainHi(source), "g");

// Syllabus terms, each written several ways in English, Hindi and initials,
// read as one token. One of these in both questions counts double: it says
// what the questions are about, where "teacher" and "child" say nothing.
// Taken from the mocks: these are the ideas the generator returns to.
const CONCEPTS = [
  ["cce", String.raw`continuous\s*(and|&)?\s*comprehensive\s*(evaluation|assessment)s?|\bcce\b|सतत\s*(और|एवं|व)\s*व्यापक\s*मूल्यांकन|सीसीई`],
  ["zpd", String.raw`zone of proximal development|\bzpd\b|(समीपस्थ|निकटस्थ)\s*विकास\S*\s*(का|के)?\s*क्षेत्र`],
  ["tlm", String.raw`teaching\s*learning\s*materials?|\btlms?\b|शिक्षण\s*अधिगम\s*सामग्री|टीएलएम`],
  ["lad", String.raw`language acquisition device|\blad\b|भाषा\s*अर्जन\s*(उपकरण|यंत्र|युक्ति)`],
  ["ncf", String.raw`national curriculum framework|\bncf\b|राष्ट्रीय\s*पाठ्यचर्या\s*(की\s*)?(रूपरेखा|ढांचा)`],
  ["rte", String.raw`right (of children )?to (free and compulsory )?education|\brte\b|शिक्षा\s*का\s*अधिकार`],
  ["mothertongue", String.raw`\b(home|native|first|mother)\s+(language|tongue)s?\b|घर\s*(की|के)\s*भाषा\S*|मातृ\s*भाषा\S*|मातृभाषा\S*`],
  ["multilingual", String.raw`\bmulti\s*lingual(ism)?\b|\bdiverse\s+linguistic\b|बहुभाषी|बहुभाषिक\S*|विविध\s*भाषाई`],
  ["intrinsicmotivation", String.raw`intrinsic(ally)?\s+motivat\w*|आंतरिक\s*(अभि)?प्रेरणा`],
  ["extrinsicmotivation", String.raw`extrinsic(ally)?\s+motivat\w*|बाह्य\s*(अभि)?प्रेरणा`],
  ["dyslexia", String.raw`dyslexi\w*|डिस्?ले[क्]?सिया|डिस्?लैक्सिया`],
  ["dyscalculia", String.raw`dyscalcul\w*|डिस्?क[ैे]ल्?कुलिया`],
  ["dysgraphia", String.raw`dysgraph\w*|डिस्?ग्राफिया`],
  ["dyspraxia", String.raw`dyspraxi\w*|डिस्?प्र[ाैे]क्सिया`],
  ["preconventional", String.raw`pre\s*-?\s*conventional|पूर्व[\s-]*(पारंपरिक|परंपरागत|परम्परागत|रूढ़िगत)`],
  ["postconventional", String.raw`post\s*-?\s*conventional|(उत्तर|पश्च)[\s-]*(पारंपरिक|परंपरागत|परम्परागत|रूढ़िगत)`],
  ["heredity", String.raw`\bheredit\w*|वंशानुक्रम\S*|आनुवंशिकता|वंशानुगत`],
  ["socialisation", String.raw`\bsociali[sz]\w*|समाजीकरण`],
  ["remedial", String.raw`\bremedial\b|उपचारात्मक`],
  ["diagnostic", String.raw`\bdiagnos\w*|निदानात्मक|नैदानिक`],
  ["inductive", String.raw`\binductive\w*|आगमन(ात्मक)?`],
  ["deductive", String.raw`\bdeductive\w*|निगमन(ात्मक)?`],
  ["portfolio", String.raw`portfolio\w*|पोर्टफोलियो`],
  ["empathy", String.raw`\bempath\w*|समानुभूति`],
];
// Names, so that a Hindi question and the Hindi of an English one spell them
// alike. Not doubled: Kohlberg in both questions is the setting, and stage 1
// against stage 3 is two questions.
const NAMES = [
  ["piaget", "piaget|पियाजे"],
  ["vygotsky", "vygotsky|वाइगोत्स्की|वायगोत्स्की|वाइगोत्सकी"],
  ["kohlberg", "kohlberg|कोहलबर्ग|कोलबर्ग"],
  ["erikson", "erikson|एरिक्सन|एरिकसन"],
  ["bruner", "bruner|ब्रूनर"],
  ["gardner", "gardner|गार्डनर"],
  ["thorndike", "thorndike|थार्नडाइक|थॉर्नडाइक|थॉर्नडाईक|थार्नडाईक"],
  ["pavlov", "pavlov|पावलोव|पैवलोव"],
  ["skinner", "skinner|स्किनर"],
  ["chomsky", "chomsky|चोमस्की|चॉम्स्की|चोम्स्की"],
  ["maslow", "maslow|मास्लो|मैस्लो"],
];
const PHRASES = [...CONCEPTS, ...NAMES].map(([token, source]) => [rx(source), ` ${token} `]);
const NAMED = new Set(CONCEPTS.map(([t]) => t));
const TOKENS = new Set([...CONCEPTS, ...NAMES].map(([t]) => t));

const STOP_EN = ("the a an of is are was were be been to in on at by for with and or if then than that this these those it its his her he she they them their what which who whom how much many find value must can will would should does do did has have had from so as but no yes there here when where why per each every into about over under also only very more most less least such any all some other others own same both around").split(" ");
// Words every pedagogy question uses - the classroom, the frame of the
// question, the passage template - and the stock answer itself: "connect
// learning to the child's daily life experiences" is the key to dozens of
// different questions, so sharing it says nothing. Measured as the most
// frequent words across the theory sections of all 45 mocks.
const GENERIC_EN = ("following primary teacher teachers student students learner learners learning learn class classes classroom classrooms school schools teaching teach child children pupil pupils young " +
  "best during while wants want according using use used through provide providing specific specifically concept concepts level levels stage stages role primarily mainly main " +
  "activity activities appropriate suitable effective effectively important approach method methods strategy strategies process help helps make makes based because after before like may " +
  "different various rather between across among within without describe describes described true correct statement option example term termed known called refer refers considered consider " +
  "indicate indicates typically usually generally commonly often always new way ways given answer question questions develop developing development ability abilities skill skills " +
  "understand understanding practice context overall purpose objective objectives aim aims goal function importance essential particularly highly significant significance " +
  "education educational pedagogical pedagogy instruction instructional notice notices observes observed situation scenario " +
  "english hindi maths mathematics evs environmental studies language languages " +
  "foster fosters promote promotes encourage encourages ensure ensures enable enables enhance enhances improve improves support supports principle principles emphasize emphasizes emphasized " +
  "organize organise organizes organises organizing organising orientation orientations oriented " +
  "passage passages prose short poem poems poet lines line stanza verse idea follows inferred infer narrator author literary device describing " +
  "daily everyday life real world experience experiences experiential connect connects connecting connected link linking relate relating meaningful " +
  "rote memorization memorisation memorize memorise memorizing guide guided guiding").split(" ");
const STOP_HI = ("में से का की के है हैं को कौन सा सी किस किसे क्या होगा होती होता निम्नलिखित निम्न द्वारा लिए एक और था थी थे गया गई किया जाता जाती कीजिए चुनिए शब्द सही यह वह इस उस ये वे पर तो भी ही नहीं न तथा एवं या कि जो जब तक " +
  "अपने अपनी अपना उनके उनकी उनका इसके इसकी उसके उसकी उसे इसे हुए हुई हुआ करते करती करता करने करना करें कर रहा रही रहे होना होने होते जाने जाते जा सकता सकती सकते बात प्रति बजाय हेतु " +
  "जिसमें जिसके जिसकी जिससे जिसका शामिल जबकि बावजूद आमतौर बारबार ऐसे ऐसा ऐसी हमारे हमारी हमारा आसपास").split(" ");
const GENERIC_HI = ("प्राथमिक कक्षा कक्षाओं शिक्षक शिक्षिका शिक्षकों छात्र छात्रों छात्रा विद्यार्थी विद्यार्थियों शिक्षार्थी शिक्षार्थियों बच्चे बच्चों बच्चा बालक बालकों स्कूल विद्यालय " +
  "सबसे अधिक मुख्य मुख्यतः रूप चाहिए शिक्षण अधिगम सीखने सीखना विकास भाषा भाषाओं उपयोग प्रयोग स्तर सिद्धांत सिद्धांतों अनुसार समय दौरान उपयुक्त साथ प्रभावी प्रदान क्षमता उद्देश्य संदर्भ " +
  "कैसे वाले वाली वाला कार्य विशिष्ट प्रक्रिया देना देने विभिन्न अवधारणा अवधारणाओं सामग्री शैक्षणिक समझने समझ बारे भूमिका दृष्टिकोण महत्वपूर्ण अच्छा अच्छी माध्यम चाहता चाहती " +
  "विधि विधियों माना जाना बीच बाद क्यों आधार आधारित प्रकार मदद सहायता तरीका तरीके गतिविधि गतिविधियों कौशल शिक्षा उचित केवल हिंदी अंग्रेजी गणित पर्यावरण अध्ययन " +
  "देखता देखती पाता पाती प्रश्न उत्तर कथन वर्णन विशेष विशेषतः काफी चरण चरणों अवस्था अवस्थाओं जैसे जैसा सिखाने सिखाना पढ़ाते पढ़ाने पढ़ाना बढ़ावा " +
  "गद्यांश पद्यांश काव्यांश पंक्तियों पंक्ति कविता दैनिक जीवन वास्तविक अनुभव अनुभवों जोड़ना जोड़ने जोड़ते जोड़कर संबंधित सार्थक रटने रटना निर्देशित").split(" ");

// Light stemming, the same on both sides: "evaluating", "evaluation" and
// "evaluate" all become "evalu"; "मातृभाषाओं" and "मातृभाषा" one word.
const EN_SUFFIXES = ["izations", "ization", "isation", "ations", "ation", "ating", "ated", "ates", "ate", "ments", "ment", "ness", "ings", "ing", "ions", "ion", "ence", "ance", "ies", "ied", "ers", "er", "es", "ed", "ly", "al", "y", "s", "e"];
const stemEn = (w) => {
  w = w.replace(/'s$|s'$/, "");
  if (w.length <= 4) return w;
  for (const s of EN_SUFFIXES) {
    if (!w.endsWith(s) || w.length - s.length < 4) continue;
    if (s === "s" && w.endsWith("ss")) continue; // "progress" stays whole
    return w.slice(0, -s.length);
  }
  return w;
};
const HI_SUFFIXES = ["ियों", "ाओं", "ाएं", "ाएँ", "ुओं", "ियाँ", "ियां", "ों", "ें", "ाँ", "ां", "ीं", "ो", "े", "ी", "ा", "ि", "ु", "ू"].map(plainHi);
const stemHi = (w) => {
  for (const s of HI_SUFFIXES) if (w.endsWith(s) && w.length - s.length >= 2) return w.slice(0, -s.length);
  return w;
};
const stem = (w) => (TOKENS.has(w) ? w : /[ऀ-ॿ]/.test(w) ? stemHi(w) : stemEn(w));
const LISTED = [...STOP_EN, ...GENERIC_EN, ...STOP_HI, ...GENERIC_HI].map((w) => plainHi(w.toLowerCase()));
const LISTED_RAW = new Set(LISTED);
const LISTED_STEMS = new Set(LISTED.map(stem));

// The meaningful words of a text, in order.
function termList(text) {
  let t = plainHi(String(text || "").toLowerCase()).replace(/([a-zऀ-ॣ])-(?=[a-zऀ-ॿ])/g, "$1"); // pre-conventional = preconventional
  for (const [re, token] of PHRASES) t = t.replace(re, token);
  return t
    .replace(/[^a-z0-9ऀ-ॣ०-९ॱ-ॿ]+/g, " ")
    .split(" ")
    .filter((w) => w && !/^\d+$/.test(w) && (w.length > 2 || TOKENS.has(w)) && !LISTED_RAW.has(w))
    .map(stem)
    .filter((w) => w.length > 1 && !LISTED_STEMS.has(w));
}
const termSet = (text) => new Set(termList(text));
const shared = (a, b) => [...a].filter((w) => b.has(w));

// ---------------------------------------------------------------- theory

// Which questions the concept check is for. Not GK, Science or reasoning,
// where one answer ("Rajasthan", "Carbon dioxide") keys many different facts
// and sameFactInPaper already looks; and not maths, which has sameFigures.
// EVS is both: its teaching questions are pedagogy, its facts are GK.
const THEORY_SUBJECT = /child|pedagog|teaching|life skill|बाल विकास|शिक्षण|शिक्षाशास्त्र/i;
const THEORY_TOPIC = /pedagog|शिक्षण\s*विधि|शिक्षाशास्त्र/i;
const EVS = /^(evs|environment|पर्यावरण)/i;
const CLASSROOM = /\b(teacher|teaching|classroom|learners?|pupils?)\b|शिक्षक|शिक्षण/i;
const isTheory = (q) =>
  THEORY_SUBJECT.test(q?.subject || "") ||
  THEORY_TOPIC.test(`${q?.topic || ""} ${q?.chapter || ""}`) ||
  (EVS.test(q?.subject || "") && CLASSROOM.test(`${q?.text || ""} ${q?.textHi || ""}`));

// A comprehension question takes its words from its passage or poem, not
// from a concept: two "main idea" questions on two passages share "short",
// "prose" and "daily" and nothing else. Those are left to the wording checks.
const POINTS_AT_A_PASSAGE = [
  /\bthe\s+(\w+\s+){0,2}(passage|paragraph|text|extract|poem|stanza)\b/i,
  /\b(this|that|above|following|given)\s+(\w+\s+){0,2}(passage|paragraph|text|extract|poem|stanza|lines)\b/i,
  /\bthe (narrator|author|poet)\b(?!\s+of\b)/i,
  /(गद्यांश|पद्यांश|काव्यांश|अवतरण|कविता|पंक्तियों)\)?\s*(के|में|का|की|से|को)/,
];
const LONG_QUOTE = /['‘’"“”][^'‘’"“”]{40,}['‘’"“”]/;
const aboutAPassage = (q) => [q.text, q.textHi].some((s) => s && (LONG_QUOTE.test(s) || POINTS_AT_A_PASSAGE.some((re) => re.test(s))));

const DEVANAGARI = /[ऀ-ॿ]{3}/;
const NEGATED = /\bnot\b|\bleast\b|\bexcept\b|नहीं|सबसे कम|अतिरिक्त/i;
const numbersIn = (s) => (String(s || "").match(/\d+(?:\.\d+)?/g) || []).sort().join(",");
const wordCount = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

// Each question in each language it carries: the English, and the Hindi
// (its own text, or textHi). A Hindi Pedagogy question is compared with the
// Hindi of a Child Development one - "home language as a resource" was asked
// in both. Worked out once per question: a mock is checked against twelve
// others.
const prepared = new WeakMap();
function viewsOf(q) {
  if (prepared.has(q)) return prepared.get(q);
  const view = (lang, text, options) => {
    const answer = String(options[q.correctIndex] ?? "");
    return {
      lang,
      text,
      stem: termList(text),
      answer: termSet(answer),
      answerWords: wordCount(answer),
      answerNumbers: numbersIn(answer),
      wrong: options.filter((_, i) => i !== q.correctIndex).map(termSet),
      negated: NEGATED.test(text),
    };
  };
  const options = (q.options || []).map(String);
  const ownHindi = DEVANAGARI.test(q.text || "");
  const views = [];
  if (!ownHindi && /[a-z]{3}/i.test(q.text || "")) views.push(view("en", q.text, options));
  const hiText = ownHindi ? q.text : q.textHi;
  const hiOptions = ownHindi ? options : (q.optionsHi || []).map(String);
  if (hiText && DEVANAGARI.test(hiText) && hiOptions[q.correctIndex]) views.push(view("hi", hiText, hiOptions));
  const out = { views, passage: aboutAPassage(q) };
  prepared.set(q, out);
  return out;
}

const cover = (x, y) => (x.size && y.size ? shared(x, y).length / Math.min(x.size, y.size) : 0);
// One question's answer is a wrong option of the other: they ask for rival
// facts. Kohlberg's stage 1 ("Pre-conventional ... avoid punishment") and
// stage 3 ("interpersonal accord") are each among the other's options;
// dyslexia and dyscalculia likewise.
const rivals = (x, y) => {
  const ownMatch = cover(x.answer, y.answer);
  return y.wrong.some((w) => {
    const c = cover(x.answer, w);
    return c >= 0.5 && c >= ownMatch;
  });
};
// Shared words that run together in both stems are one name: "World Health
// Organization" in two Life Skills questions is the setting, not three
// pieces of evidence that they ask the same thing.
const runsTogether = (a, b, both) => {
  const pairsB = new Set(b.slice(1).map((w, i) => `${b[i]} ${w}`));
  let n = 0;
  for (let i = 1; i < a.length; i++) {
    const p = a[i - 1], w = a[i];
    if (both.has(p) && both.has(w) && !NAMED.has(p) && !NAMED.has(w) && pairsB.has(`${p} ${w}`)) n++;
  }
  return n;
};

function scoreViews(x, y) {
  // A different number in each answer is a different fact ("stage 2" /
  // "stage 3", "6 to 14 years"), and "which is NOT" turns the answer around.
  if (x.answerNumbers && y.answerNumbers && x.answerNumbers !== y.answerNumbers) return null;
  if (x.negated !== y.negated) return null;
  const stemA = new Set(x.stem), stemB = new Set(y.stem);
  const inBothStems = new Set(shared(stemA, stemB));
  // What the answers share, less the subject both questions name anyway:
  // "moon" in two poems' answers is the poem's, not the answer's.
  const answers = shared(x.answer, y.answer).filter((w) => !inBothStems.has(w));
  if (!answers.length) return null;
  if (rivals(x, y) || rivals(y, x)) return null;
  const all = shared(new Set([...x.stem, ...x.answer]), new Set([...y.stem, ...y.answer]));
  // Answers alone are not a topic: "connect to their lived experiences" keys
  // questions about anything.
  if (!all.some((w) => !answers.includes(w))) return null;
  // The answers agree closely: most of both, or a term ("Dyslexia",
  // "Preconventional moral level") that the other answer names.
  const union = new Set([...x.answer, ...y.answer]).size;
  const shorter = x.answerWords <= y.answerWords ? x.answer : y.answer;
  const close = answers.length / union >= 0.5 || (Math.min(x.answerWords, y.answerWords) <= 3 && answers.length / shorter.size >= 0.5);
  const score =
    all.reduce((n, w) => n + (NAMED.has(w) ? 2 : 1), 0) -
    runsTogether(x.stem, y.stem, new Set(all)) +
    (close ? 1 : 0) +
    (answers.length >= 2 ? 1 : 0);
  return { score, lang: x.lang, answers, all };
}

/**
 * How strongly two theory questions test the same concept: the best of their
 * English and Hindi readings, or null when they plainly do not (no answer in
 * common, rival answers, a passage question). Higher is surer; see IN_PAPER
 * and SIBLING for where the lines are drawn.
 */
function conceptMatch(a, b) {
  const pa = viewsOf(a), pb = viewsOf(b);
  if (pa.passage || pb.passage) return null;
  let best = null;
  for (const x of pa.views) for (const y of pb.views) {
    if (x.lang !== y.lang) continue;
    const r = scoreViews(x, y);
    if (r && (!best || r.score > best.score)) best = r;
  }
  return best;
}

// Where the lines are, measured on the mocks as they stood (UPTET Mock #2 as
// it was before the 26 Oct rewrite):
//
//   IN_PAPER 4 - in UPTET Mock #2 it finds all 13 pairs named above and 24
//     more, nearly all among the 39 rewritten by hand; across the theory
//     sections of all 14 mocks that have them, 96 of 23,011 pairs, and read
//     one by one they are repeats (four dyslexia questions in UPTET Mock #1,
//     three "the family socialises the child"). It leaves Kohlberg stage 1
//     against stage 3, dyslexia against dyscalculia and the WHO life-skills
//     pair (sameFactInPaper's own test) alone.
//   SIBLING 7 - another mock of the exam is held to a higher line. The
//     syllabus is the same, so a concept is SUPPOSED to come round again:
//     at 4, 36% of UPTET's and 25% of Super TET's theory questions have a
//     twin in another mock. At 7 that is 9% and 5%, and those are the same
//     question reworded ("A child has severe difficulty in reading words,
//     recognising symbols and spelling" / "Which learning difficulty affects
//     a child's ability to read, spell and decode words?" - Dyslexia).
const IN_PAPER = 4;
const SIBLING = 7;

// ---------------------------------------------------------------- maths

// The same figures in the same setting, whatever is asked of them: "the
// perimeter of a rectangular park 45 m by 30 m" and "the cost of fencing a
// rectangular park 45 m by 30 m at ₹12 a metre" are one sum and a
// multiplication. Every figure of one question in the other, in the same
// order, two of them 10 or more, and four words of the setting in common.
// Across the maths sections of all 45 mocks: 9 of 11,646 pairs, the park and
// eight word-for-word copies left in the early RRB NTPC and Agniveer mocks;
// nothing that was two questions.
const IS_MATHS = /^(math|गणित|quant|arith|numerical)/i;
const SETTING_STOP = new Set(
  ("the a an of is are was were be been to in on at by for with and or if then than that this these those it its his her he she they them their what which who how much many find value must can will would should does do did has have had from so as but not no yes there here when where why per each every " +
    "में से का की के है हैं को कौन सा सी किस किसे क्या होगा होती होता निम्नलिखित ज्ञात कीजिए कीजिये एक और तो फिर वह यह अपने अपनी उसके बाद अब पर तक").split(" ")
);
const SETTING_SAME = { metres: "metre", meters: "metre", meter: "metre", width: "breadth", wide: "breadth", broad: "breadth", long: "length", rs: "rupees", rupee: "rupees" };
const settingWords = (t) =>
  new Set(
    String(t || "").toLowerCase().replace(/[^a-z0-9ऀ-ॣ०-९ॱ-ॿ]+/g, " ").split(" ")
      .filter((w) => w.length > 2 && !SETTING_STOP.has(w) && !/^\d/.test(w))
      .map((w) => SETTING_SAME[w] || w)
  );
const figures = (s) => String(s || "").replace(/(\d),(\d{3})/g, "$1$2").match(/\d+(?:\.\d+)?/g) || [];
const inOrder = (few, many) => {
  let i = 0;
  for (const n of many) if (n === few[i]) i++;
  return i === few.length;
};
function sameFigures(a, b) {
  if (!IS_MATHS.test(a?.subject || "") || !IS_MATHS.test(b?.subject || "")) return null;
  const fa = figures(a.text), fb = figures(b.text);
  const [few, many] = fa.length <= fb.length ? [fa, fb] : [fb, fa];
  if (few.length < 2 || few.filter((n) => Number(n) >= 10).length < 2 || !inOrder(few, many)) return null;
  const setting = shared(settingWords(a.text), settingWords(b.text));
  return setting.length >= 4 ? { figures: few, setting } : null;
}

// ---------------------------------------------------------------- the check

/**
 * Does `a` ask an idea `b` already asks? `sibling` when `b` is in another
 * mock of the exam rather than this paper: then only the same question
 * reworded counts, not the same concept or the same figures. Returns a short
 * reason, or null.
 */
function sameIdeaInPaper(a, b, { sibling = false } = {}) {
  if (!a || !b || a.visual?.kind || b.visual?.kind) return null;
  if (isTheory(a) && isTheory(b)) {
    const m = conceptMatch(a, b);
    if (m && m.score >= (sibling ? SIBLING : IN_PAPER)) return { why: `same concept (${m.answers.join(", ")})`, ...m };
  }
  if (!sibling) {
    const f = sameFigures(a, b);
    if (f) return { why: `same figures (${f.figures.join(", ")})`, ...f };
  }
  return null;
}

module.exports = { sameIdeaInPaper, conceptMatch, sameFigures, isTheory, termList, IN_PAPER, SIBLING };
