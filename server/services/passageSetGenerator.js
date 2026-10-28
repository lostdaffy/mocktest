const crypto = require("crypto");
const gemini = require("./geminiService");
const { isHindiMedium } = require("../utils/language");

// Writes a passage set: ONE unseen passage and several questions on it, the
// way UPSSSC PET prints its Hindi passages (about 250 words, five questions).
// Used only for a pattern section that asks for it (section.passageSets);
// every other comprehension question keeps its own short passage.
//
// Each question carries the whole passage in its text - a student sees one
// question at a time - and the set's questions share passageSetId, so the
// mock keeps them together. passageStem (the question alone) is not saved;
// questionFactory uses it so siblings are not taken for repeats of each other.
//
// Called through this module (passageGen.generatePassageSet), never
// destructured, so a test stub can stand in for the model.

const DIRECTION_HI = "निर्देश : निम्नलिखित अपठित गद्यांश को ध्यानपूर्वक पढ़िए और उस पर आधारित प्रश्न का उत्तर दीजिए :";
const DIRECTION_EN = "Direction : Read the following passage carefully and answer the question that follows :";

function passagePrompt({ count, examDisplayName, examLevel, hindi, avoidTexts, guidance }) {
  const lang = hindi
    ? `- Write EVERYTHING in Hindi (Devanagari): the passage, the questions, the options and the solutions. Never romanise Hindi.`
    : `- Write in English, with an accurate Hindi translation in the "Hi" fields.`;
  return `You are an expert question setter for ${examDisplayName || "Indian government competitive exams"}.
${examLevel ? `Level: ${examLevel}\n` : ""}${guidance ? `\nLEVEL AND STYLE TO MATCH (patterns only - never copy):\n${guidance}\n` : ""}
Write ONE unseen-passage set: a passage and exactly ${count} questions on it.

THE PASSAGE
- 220 to 300 words, three paragraphs, formal exam prose.
- Either a reflective essay on a value or social theme (service to others, discipline, honesty, environment, science and society, education, health), or a factual account of a well-known real event, movement, institution or person from India. A factual passage states its facts (names, places, years) correctly; never invent history.
- Everything a question asks must be stated in the passage.
${lang}

THE QUESTIONS
- Each answerable from the passage alone, never from outside knowledge.
- Spread across: the central idea; a quality, fact or name the passage states; what the passage says matters more than something; which statement best matches the passage; what the passage says about a present-day situation; a comparison the writer makes.
- 4 options, exactly one correct. Wrong options are plausible: the opposite idea, an exaggeration ("only", "completely"), or something the passage mentions in another context.
- Do NOT repeat the passage inside "question"; it is added for you.
- "solution" quotes or points to the line of the passage that gives the answer.${
    avoidTexts?.length ? `\n\nALREADY USED - choose a different theme:\n${avoidTexts.slice(0, 10).map((t, i) => `${i + 1}. ${String(t).slice(0, 120)}`).join("\n")}` : ""
  }

Return ONLY valid JSON, no markdown, in exactly this shape:
{
  "passage": "...", "passageHi": "${hindi ? "(same as passage)" : "..."}",
  "questions": [
    { "question": "...", "questionHi": "...", "options": ["..","..","..",".."], "optionsHi": ["..","..","..",".."], "correctIndex": 0, "solution": "...", "solutionHi": "..." }
  ]
}`;
}

/** The model's reply to questions, each carrying its passage. Exported for the tests. */
function buildPassageSet(raw, { hindi }) {
  const passage = String(raw?.passage || "").trim();
  const passageHi = hindi ? passage : String(raw?.passageHi || "").trim();
  if (passage.split(/\s+/).length < 120) return { questions: [], reason: "the passage is missing or too short" };
  const setId = crypto.randomBytes(6).toString("hex");
  const questions = [];
  for (const q of raw?.questions || []) {
    const stem = String(q?.question || "").trim();
    const options = (q?.options || []).map((o) => String(o ?? "").trim());
    if (!stem || options.length !== 4) continue;
    const stemHi = hindi ? stem : String(q?.questionHi || "").trim();
    const optionsHi = hindi ? options : (q?.optionsHi || []).map((o) => String(o ?? "").trim());
    const solution = String(q?.solution || "").trim();
    questions.push({
      text: `${hindi ? DIRECTION_HI : DIRECTION_EN}\n\n${passage}\n\n${stem}`,
      textHi: stemHi && passageHi ? `${DIRECTION_HI}\n\n${passageHi}\n\n${stemHi}` : "",
      options,
      optionsHi,
      correctIndex: Number(q?.correctIndex),
      solution,
      solutionHi: hindi ? solution : String(q?.solutionHi || "").trim(),
      passageSetId: setId,
      passageStem: stem,
    });
  }
  return { questions, setId };
}

/**
 * One passage with `count` questions, tagged like any generated question.
 * May return fewer when the model's reply is short; never pads.
 */
async function generatePassageSet(params) {
  const { count = 5 } = params;
  const hindi = isHindiMedium(params);
  let guidance = "";
  try {
    guidance = await require("./referenceLearning").guidanceFor(params.examType, params.subject);
  } catch (_) {
    guidance = "";
  }
  const raw = await gemini.callGemini(passagePrompt({ ...params, count, hindi, guidance }), { jsonMode: true });
  const built = buildPassageSet(Array.isArray(raw) ? raw[0] : raw, { hindi });
  return gemini.tagGenerated(built.questions.slice(0, count), params);
}

module.exports = { generatePassageSet, buildPassageSet, passagePrompt, DIRECTION_HI, DIRECTION_EN };
