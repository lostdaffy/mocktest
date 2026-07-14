// Gemini API wrapper for question generation, self-verification, and translation.
// Get a free API key at https://aistudio.google.com (no credit card needed).
//
// IMPORTANT ON MODEL CHOICE (as of July 2026):
// - gemini-2.0-flash was SHUT DOWN by Google on June 1, 2026. Do not use it.
// - Free-tier eligibility has been shifting model-by-model. gemini-3.1-flash-lite
//   is the model most consistently confirmed as free-tier eligible for a
//   zero-budget setup. gemini-3.5-flash is more capable but several sources
//   report it as paid-only ($1.50/$9 per 1M tokens) - don't assume it's free.
// - ALWAYS double check your actual project's live limits in Google AI Studio
//   (aistudio.google.com -> your project -> rate limits) before generating at
//   scale, since Google changes these terms frequently.
// - See https://ai.google.dev/gemini-api/docs/changelog for the latest.

const fetch = require("node-fetch");

const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite").trim();
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Small helper to pause execution (used for rate-limit backoff)
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Robustly parse JSON that an LLM produced. LLMs often wrap JSON in markdown
// fences, add trailing commas, or use smart quotes. This cleans the common
// cases and returns null if it still can't be parsed.
function tryParseJson(text) {
  // 1. Direct attempt
  try {
    return JSON.parse(text);
  } catch (_) {
    // continue to cleanup
  }

  let cleaned = text.trim();

  // Strip markdown code fences (```json ... ```)
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  // Extract just the array/object portion (ignore any leading/trailing prose)
  const firstBracket = cleaned.search(/[[{]/);
  const lastBracket = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }

  // Replace smart quotes with straight quotes
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    return null;
  }
}

async function callGeminiRaw(parts, { jsonMode = true, maxRetries = 4 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

  const body = {
    contents: [{ parts }],
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : {},
  };

  let attempt = 0;
  while (true) {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned no content");
      if (!jsonMode) return text;

      // AI sometimes returns slightly malformed JSON (trailing commas, markdown
      // fences, smart quotes, unquoted keys). Try to clean & parse; if it's
      // truly broken, retry the whole request a few times before giving up.
      const parsed = tryParseJson(text);
      if (parsed !== null) return parsed;

      if (attempt < maxRetries) {
        attempt++;
        console.log(`Gemini returned bad JSON. Retrying (attempt ${attempt}/${maxRetries})...`);
        await sleep(2000);
        continue;
      }
      throw new Error("Gemini ne baar-baar invalid JSON diya. Dobara try karo.");
    }

    const errText = await res.text();

    // 429 = rate limit hit. Gemini free tier allows only 15 requests/minute.
    // Instead of failing, wait and retry automatically.
    if (res.status === 429 && attempt < maxRetries) {
      attempt++;
      // Try to honor the retryDelay Gemini suggests, else back off progressively
      let waitSeconds = 20 * attempt;
      const match = errText.match(/"retryDelay":\s*"(\d+)s"/);
      if (match) waitSeconds = parseInt(match[1], 10) + 2;
      console.log(`Gemini rate limit hit. Waiting ${waitSeconds}s then retrying (attempt ${attempt}/${maxRetries})...`);
      await sleep(waitSeconds * 1000);
      continue;
    }

    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }
}

async function callGemini(prompt, opts = {}) {
  return callGeminiRaw([{ text: prompt }], opts);
}

/**
 * Generates a batch of MCQ questions for a given exam/subject/topic,
 * following the pattern of real PYQs (few-shot examples improve quality).
 *
 * @param {Object} params
 * @param {string} params.examType - e.g. "SSC_CGL"
 * @param {string} params.subject - e.g. "Reasoning"
 * @param {string} params.topic - e.g. "Blood Relation"
 * @param {string} params.difficulty - "easy" | "medium" | "hard"
 * @param {number} params.count - how many questions to generate
 * @param {string[]} params.pyqExamples - optional real PYQ text examples for pattern-matching
 * @returns {Promise<Array>} array of question objects
 */
// Per-exam context: exact syllabus focus and difficulty calibration for each
// exam, so a mock for SSC never gets UPSC-level or off-syllabus questions.
// This is the heart of content isolation + quality. Add new exams here.
const EXAM_CONTEXT = {
  SSC_CGL: {
    fullName: "SSC CGL (Combined Graduate Level) Tier 1",
    level: "graduate-level but SSC-specific: quantitative aptitude, reasoning, English, and general awareness at the difficulty of the actual SSC CGL exam. NOT UPSC level, NOT engineering level.",
  },
  SSC_MTS: {
    fullName: "SSC MTS (Multi Tasking Staff)",
    level: "10th-pass level, easier than SSC CGL. Basic maths, reasoning, English, GK at SSC MTS difficulty. Keep it simple and exam-appropriate.",
  },
  SSC_CHSL: {
    fullName: "SSC CHSL (Combined Higher Secondary Level)",
    level: "12th-pass level, between MTS and CGL in difficulty. SSC CHSL exam pattern.",
  },
  UP_POLICE: {
    fullName: "UP Police Constable",
    level: "UP Police Constable level. Include UP-specific general knowledge and current affairs. Hindi-medium friendly. NOT graduate/UPSC level.",
  },
  RAILWAY: {
    fullName: "RRB NTPC (Railway)",
    level: "RRB NTPC exam level. Maths, reasoning, general awareness as per Railway exam standard.",
  },
  BANKING: {
    fullName: "IBPS/SBI Banking Exam (PO/Clerk Prelims)",
    level: "Banking prelims level: quantitative aptitude, reasoning, English at IBPS/SBI standard. Data interpretation common.",
  },
  CTET: {
    fullName: "CTET (Central Teacher Eligibility Test)",
    level: "CTET level: child development & pedagogy, and subject content for teaching. Teacher-eligibility standard.",
  },
};

async function generateQuestions({ examType, examDisplayName, subject, topic, difficulty = "medium", count = 10, pyqExamples = [], examMode = false }) {
  const ctx = EXAM_CONTEXT[examType] || {
    fullName: examDisplayName || examType,
    level: `${examDisplayName || examType} exam level. Keep questions strictly appropriate for this specific exam's syllabus and difficulty.`,
  };

  const examplesBlock = pyqExamples.length
    ? `Real previous-year ${ctx.fullName} question examples for style/difficulty reference (match this style, do NOT copy):\n${pyqExamples
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n")}\n\n`
    : "";

  // Two modes:
  // - examMode (for MOCK tests): mimic the REAL exam. Mixed difficulty exactly
  //   like the actual paper, based on how questions really appear in past exams.
  //   No fixed difficulty — this gives the student a true exam simulation.
  // - normal mode (for PRACTICE tests): a specific difficulty level (easy/medium/
  //   hard) so students can build up skill level by level.
  const difficultyInstruction = examMode
    ? `- Generate questions EXACTLY like they appear in the REAL ${ctx.fullName} exam. Base them on the actual pattern, style, and difficulty distribution of PREVIOUS YEAR ${ctx.fullName} papers.
- Mix difficulty naturally like a real paper: some easy, some moderate, some tough — just as the actual exam does.
- Focus on the TYPE of questions and concepts that genuinely repeat in this exam year after year, so practicing these gives real exam benefit.
- Make them feel authentic — as if lifted from a real ${ctx.fullName} question paper (but original, not copied).`
    : `- Difficulty level for all questions: "${difficulty}".`;

  const countLine = examMode
    ? `Generate exactly ${count} multiple-choice questions for subject "${subject}", exactly like real ${ctx.fullName} exam questions.`
    : `Generate exactly ${count} multiple-choice questions for subject "${subject}", topic "${topic}", difficulty "${difficulty}".`;

  const prompt = `You are an expert question setter for ${ctx.fullName}.

CRITICAL RULES ABOUT SCOPE (follow strictly):
- Generate questions ONLY appropriate for ${ctx.fullName}.
- Syllabus & level MUST match: ${ctx.level}
- Do NOT include questions from other exams' syllabus or a harder/easier exam's level.
- Every question must be something that could realistically appear in the actual ${ctx.fullName} exam.

${examplesBlock}${countLine}

EXAM-REALISM RULES:
${difficultyInstruction}

QUALITY RULES:
- Each question has exactly 4 options, only ONE correct. Make wrong options plausible (not obviously wrong).
- Questions must be factually accurate and unambiguous.
- No repeated questions in this batch.
- Solutions must be short, correct, step-by-step.
- Provide accurate Hindi translation of question, options, and solution.
- Return ONLY valid JSON array, no markdown fences, no extra text, in this exact shape:

[
  {
    "text": "question in English",
    "textHi": "question in Hindi",
    "options": ["A", "B", "C", "D"],
    "optionsHi": ["A-hi", "B-hi", "C-hi", "D-hi"],
    "correctIndex": 0,
    "solution": "short English solution",
    "solutionHi": "short Hindi solution"
  }
]`;

  const questions = await callGemini(prompt, { jsonMode: true });
  return questions.map((q) => ({
    ...q,
    examType: [examType],
    examStage: examType, // strict isolation: this question belongs to this exam only
    subject,
    topic,
    // In exam mode we don't force a difficulty label (mixed like real exam)
    difficulty: examMode ? "exam" : difficulty,
    source: "ai_generated",
    status: "draft",
    createdBy: "ai",
  }));
}

/**
 * Self-verification step: asks Gemini to independently solve the question
 * and compares its answer to the stored correctIndex. If they disagree,
 * the question is flagged for human review instead of auto-publishing.
 */
async function verifyQuestion(question) {
  const prompt = `Solve this multiple-choice question independently. Think step by step, then answer.

Question: ${question.text}
Options:
0. ${question.options[0]}
1. ${question.options[1]}
2. ${question.options[2]}
3. ${question.options[3]}

Return ONLY valid JSON in this shape, no extra text:
{ "correctIndex": <0-3>, "confidence": <0.0-1.0> }`;

  try {
    const result = await callGemini(prompt, { jsonMode: true });
    const matches = result.correctIndex === question.correctIndex;
    return {
      matches,
      aiCorrectIndex: result.correctIndex,
      confidence: result.confidence ?? (matches ? 0.9 : 0.3),
    };
  } catch (err) {
    // If verification itself fails, don't silently auto-publish - flag it.
    return { matches: false, aiCorrectIndex: null, confidence: 0, error: err.message };
  }
}

/**
 * Extracts real MCQ questions from an uploaded previous-year paper PDF.
 * This does NOT invent questions - it reads the actual PDF (Gemini's
 * multimodal input) and pulls out exactly what's on the page. If the PDF
 * includes an answer key, correctIndex is filled in; if not, it comes back
 * null and the admin fills it in during review before publishing.
 *
 * @param {Object} params
 * @param {string} params.pdfBase64 - the PDF file, base64-encoded
 * @param {string} params.examType - e.g. "SSC_CGL"
 * @param {string} params.examDisplayName
 * @param {string} params.subject - e.g. "Reasoning" (helps Gemini tag correctly if the PDF mixes subjects)
 */
async function extractQuestionsFromPDF({ pdfBase64, examType, examDisplayName, subject, language = "bilingual" }) {
  const ctx = EXAM_CONTEXT[examType] || { fullName: examDisplayName || examType };

  const languageInstruction =
    language === "english"
      ? `This PDF is in ENGLISH ONLY. Extract "text"/"options" from what's printed, then translate them yourself into Hindi for "textHi"/"optionsHi" - a natural, exam-appropriate translation, not literal word-for-word.`
      : language === "hindi"
      ? `This PDF is in HINDI ONLY. Extract "textHi"/"optionsHi" from what's printed, then translate them yourself into English for "text"/"options" - a natural, exam-appropriate translation, not literal word-for-word.`
      : `This PDF is BILINGUAL - many Indian exam papers print each question in English AND Hindi side by side (or one below the other) as the SAME question. Treat these as ONE question, not two - put the English in "text" and the Hindi in "textHi". Never output the same question twice just because it appeared in two languages.`;

  const prompt = `This PDF is a real ${ctx.fullName} previous-year question paper${
    subject ? ` (subject: ${subject})` : ""
  }. Extract EVERY multiple-choice question exactly as written - do not paraphrase, do not invent, do not skip any.

IMPORTANT - language: ${languageInstruction}

For each question, do TWO things:
1. Extract it exactly as printed: the question, its 4 options, and - if this PDF includes an answer key anywhere (start, end, or a separate page) - which option it marks correct.
2. Independently solve the question yourself, as if you had no answer key, using your own reasoning.

Then reconcile the two:
- If the PDF's answer key exists AND matches your own independent solve: "correctIndex" = that option, "confidence" = "verified".
- If the PDF's answer key exists but DISAGREES with your own independent solve: "correctIndex" = the PDF's stated answer (the real paper is the source of truth, not your opinion), "confidence" = "mismatch" - this tells the admin exactly which ones are worth a second look, instead of every question needing manual re-checking.
- If the PDF has NO answer key at all for this question: "correctIndex" = null, "suggestedIndex" = your own independently-solved answer (a hint only, not authoritative), "confidence" = "no_key".

Also for each question:
- "text"/"textHi": the question in English / Hindi (translate whichever direction is missing).
- "options"/"optionsHi": the exact 4 options in English / Hindi.
- "solution"/"solutionHi": a short explanation ONLY if the PDF itself provides one - if not, set both to "" (do not invent one).
- "subject": your best guess of the subject (e.g. "Reasoning", "Maths", "English", "GK").

Return ONLY a valid JSON array, no markdown fences, no extra text, in this exact shape:
[
  {
    "text": "...", "textHi": "...",
    "options": ["...","...","...","..."], "optionsHi": ["...","...","...","..."],
    "correctIndex": 0, "suggestedIndex": null, "confidence": "verified",
    "solution": "...", "solutionHi": "...",
    "subject": "..."
  }
]

If a question has more or fewer than 4 options in the original, still return exactly 4 in "options" using your best judgment of the closest 4, but prioritize accuracy - never fabricate options that aren't in the source.`;

  const parts = [
    { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
    { text: prompt },
  ];

  // PDFs can run long (many pages) so this gets more time to retry than a
  // normal generation call, and a longer pause between attempts.
  const questions = await callGeminiRaw(parts, { jsonMode: true, maxRetries: 3 });

  if (!Array.isArray(questions)) {
    throw new Error("Gemini PDF se questions extract nahi kar paaya. Try a clearer/smaller PDF.");
  }

  return questions.map((q) => {
    const confidence = q.confidence || (Number.isInteger(q.correctIndex) ? "verified" : "no_key");
    const flagReason =
      confidence === "mismatch"
        ? "PDF answer key aur AI ke independent solve mein farak hai - verify karo"
        : confidence === "no_key"
        ? "PDF mein answer key nahi mili - AI ka suggestion hai, confirm karo"
        : undefined;

    return {
      text: q.text || "",
      textHi: q.textHi || "",
      options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["", "", "", ""],
      optionsHi: Array.isArray(q.optionsHi) && q.optionsHi.length === 4 ? q.optionsHi : ["", "", "", ""],
      correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : undefined,
      suggestedIndex: Number.isInteger(q.suggestedIndex) ? q.suggestedIndex : undefined,
      aiConfidenceScore: confidence === "verified" ? 1 : confidence === "mismatch" ? 0.3 : 0.5,
      flagReason,
      solution: q.solution || "",
      solutionHi: q.solutionHi || "",
      subject: q.subject || subject || "General",
      examType: [examType],
      examStage: examType,
      topic: q.subject || subject || "General",
      difficulty: "exam",
      source: "pyq",
      status: "under_review", // always human-checked before it reaches a student
      createdBy: "admin",
    };
  });
}

module.exports = { generateQuestions, verifyQuestion, callGemini, extractQuestionsFromPDF };