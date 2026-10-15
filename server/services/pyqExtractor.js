// The model's part in reading a previous-year paper. Each call is small and
// does one thing, so a long paper never asks for an answer longer than the
// model can write (the first version asked for a whole paper at once, and a
// 100-question bilingual paper came back cut off without a word of warning).
//
// The model is told to COPY, never to write: the question, its options and
// the printed answer key are the paper's. Anything it adds of its own - a
// translation, its own solve, a topic - is kept apart and labelled, so the
// review can always tell the paper from the model.
//
// Called through the module object (not destructured) so the tests can stand
// in for the model.

const gemini = require("./geminiService");

const pdfPart = (base64) => ({ inline_data: { mime_type: "application/pdf", data: base64 } });

/** Exam name, date, shift, language and question count, from the first pages. */
async function detectPaperInfo(base64) {
  const prompt = `These are the first pages of an Indian government exam question paper (it may be in English, Hindi or both, typed or scanned).

Read what is PRINTED and return ONLY this JSON, with null for anything not printed (never guess):
{
  "examName": "the exam as printed, e.g. 'SSC CGL Tier 1' or 'UP Police Constable'",
  "examDate": "YYYY-MM-DD if a date of the exam is printed, else null",
  "shift": "the shift / session / sitting as printed, e.g. 'Shift 1' or '9:00 AM - 10:00 AM', else null",
  "year": 2024,
  "language": "english" | "hindi" | "bilingual",
  "totalQuestions": 100
}
"language" is "bilingual" when each question is printed in both English and Hindi.`;
  const out = await gemini.callGeminiRaw([pdfPart(base64), { text: prompt }], { jsonMode: true, maxRetries: 3 });
  return out && typeof out === "object" && !Array.isArray(out) ? out : {};
}

/**
 * Every question that STARTS on pages first..last of the paper, and any
 * answer-key table printed on them. `withNextPage` means one more page is
 * attached only so a question running over the page break can be finished.
 */
async function extractPages(base64, { first, last, withNextPage }) {
  const prompt = `This file holds pages ${first} to ${last} of an Indian government exam question paper${
    withNextPage ? `, followed by page ${last + 1}, which is there ONLY so you can finish a question that runs over from page ${last}` : ""
  }. It may be typed or scanned, in English, Hindi or both.

COPY every multiple-choice question that STARTS on pages ${first}-${last}.${
    withNextPage ? ` Do not include a question that starts on page ${last + 1}.` : ""
  } Copy, do not write:
- exactly as printed - no rewording, no correcting, no summarising;
- do NOT translate: "textEn"/"optionsEn" only if English is printed, "textHi"/"optionsHi" only if Hindi is printed, otherwise "";
- a question printed in both languages is ONE question with both filled in, never two;
- copy as many options as are printed (if five are printed, copy five), without the (a)/(1) labels;
- do NOT solve anything.

For each question also give:
- "number": its printed question number;
- "section": the section heading it falls under, as printed (e.g. "General Awareness"), or "";
- "page": the page it starts on (counting the first page of the whole paper as 1);
- "passage"/"passageHi": the FULL passage, table or set of statements it depends on, if it is one of a group of questions about a shared passage ("Read the passage and answer..."), else "";
- "needsFigure": true if it cannot be answered without a diagram, figure, picture or graph printed with it;
- "answer": the correct option as MARKED in the paper itself (a tick, bold, "Ans: (b)", "Correct option: 2"), copied as printed, e.g. "(b)" or "2" - else null;
- "solutionEn"/"solutionHi": an explanation only if the paper prints one, else "".

Also copy any ANSWER KEY table on these pages (e.g. "1-b 2-d 3-a") into "answerKey".

Instructions, cover pages and headers are not questions. Return ONLY this JSON:
{ "questions": [ { "number": 1, "section": "", "page": ${first}, "passage": "", "passageHi": "", "textEn": "", "textHi": "", "optionsEn": [], "optionsHi": [], "needsFigure": false, "answer": null, "solutionEn": "", "solutionHi": "" } ],
  "answerKey": [ { "number": 1, "section": "", "answer": "(b)" } ] }`;
  const out = await gemini.callGeminiRaw([pdfPart(base64), { text: prompt }], { jsonMode: true, maxRetries: 3 });
  return {
    questions: Array.isArray(out?.questions) ? out.questions : [],
    answerKey: Array.isArray(out?.answerKey) ? out.answerKey : [],
  };
}

/**
 * The model's own answer to each question, worked out, without any key.
 * items: [{ id, text, options, passage }]. Returns [{ id, answer, working }]
 * where answer is the copied option text (matched to an index by the caller,
 * which is where a misnumbered reply is caught).
 */
async function solveRows(items) {
  const list = items
    .map(
      (q, i) =>
        `Q${i + 1} (id ${q.id})\n${q.passage ? `Passage: ${q.passage}\n` : ""}${q.text}\n${q.options.map((o, j) => `${j + 1}. ${o}`).join("\n")}`
    )
    .join("\n\n");
  const prompt = `Solve each of these exam questions yourself. Show the working first, briefly - steps and arithmetic - then the answer.

${list}

Return ONLY a JSON array, one entry per question, in the same order:
[ { "id": "<the id given>", "working": "<2-4 short lines in English>", "answer": "<the correct option's text, copied exactly>" } ]`;
  const out = await gemini.callGemini(prompt, { jsonMode: true });
  return Array.isArray(out) ? out : [];
}

/**
 * Translations of what the paper did not print. items: [{ id, text, options,
 * passage, solution }], to: "hi" | "en". Returns the same shape translated.
 */
async function translateRows(items, to) {
  const lang = to === "hi" ? "Hindi" : "English";
  const prompt = `Translate these exam questions into ${lang}, the way an Indian government exam paper would print them: natural, exact, with technical terms as such papers use them. Keep numbers, names, units and option order exactly. Do not answer or change anything.

${JSON.stringify(items)}

Return ONLY a JSON array with the same ids and fields, translated:
[ { "id": "...", "text": "...", "options": ["...", "...", "...", "..."], "passage": "...", "solution": "..." } ]`;
  const out = await gemini.callGemini(prompt, { jsonMode: true });
  return Array.isArray(out) ? out : [];
}

/**
 * The syllabus topic of each question, chosen from the exam's own list.
 * items: [{ id, text, section }], sections: [{ subject, topics: [names] }].
 */
async function tagRows(items, sections) {
  const syllabus = sections.map((s) => `- ${s.subject}: ${s.topics.join("; ")}`).join("\n");
  const prompt = `Each question below is from an exam with these sections and topics:
${syllabus}

For each question pick its section ("subject") and topic from the lists above, copied exactly.

${items.map((q) => `id ${q.id}${q.section ? ` [printed section: ${q.section}]` : ""}: ${q.text.slice(0, 300)}`).join("\n")}

Return ONLY a JSON array: [ { "id": "...", "subject": "...", "topic": "..." } ]`;
  const out = await gemini.callGemini(prompt, { jsonMode: true });
  return Array.isArray(out) ? out : [];
}

module.exports = { detectPaperInfo, extractPages, solveRows, translateRows, tagRows };
