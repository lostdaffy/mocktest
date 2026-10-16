const crypto = require("crypto");
const gemini = require("./geminiService");
const RejectedQuestion = require("../models/RejectedQuestion");
const { normaliseChart, checkChartAnswer, normaliseFigure, checkFigureAnswer, CHART_TYPES, SHAPES } = require("./visuals");
const { isHindiMedium } = require("../utils/language");

// Writes Data Interpretation sets and figure-reasoning questions.
//
// The model is asked for structure, not pictures: a chart as numbers, a
// figure as shapes on a grid. buildVisualQuestions() then checks every
// question against that structure in code and keeps only the ones whose
// marked answer the structure actually gives. What survives goes through the
// normal quality gate like any other question.
//
// Called through this module (visualGen.generateVisualQuestions), never
// destructured, so the test stub can stand in for the model.

const QUESTIONS_PER_CHART = 5;
const FIGURES_PER_CALL = 3;

const FIGURE_OPTIONS = ["Figure (A)", "Figure (B)", "Figure (C)", "Figure (D)"];
const FIGURE_OPTIONS_HI = ["आकृति (A)", "आकृति (B)", "आकृति (C)", "आकृति (D)"];

function syllabusNames(syllabusTopics) {
  return (syllabusTopics || []).map((t) => (typeof t === "string" ? t : t?.topic)).filter(Boolean);
}

function chartPrompt({ count, subject, topic, difficulty, examDisplayName, examLevel, avoidTexts, chartType }) {
  const type = chartType || CHART_TYPES[Math.floor(Math.random() * (CHART_TYPES.length - 1))];
  return `You are an expert question setter for ${examDisplayName || "Indian government competitive exams"}.
${examLevel ? `Level: ${examLevel}\n` : ""}
Write ONE Data Interpretation set for "${subject}" - topic "${topic}", difficulty "${difficulty}": a ${type} chart${type === "caselet" ? " (a short paragraph of figures instead of a picture)" : ""} and exactly ${count} questions about it.

THE CHART
- Realistic Indian exam data: production, sales, population, students, expenditure. 3 to 7 categories (years, cities, companies...) and 1 to 4 series.
- Round, readable numbers (multiples of 5 or 10 mostly), chosen so the answers come out clean.
- type must be "${type}". For "mixed" give each series "as": "bar" or "line". For "pie" give exactly one series of positive values. For "caselet" give the paragraph in "caselet" (with all the numbers in it) and no categories/series.

THE QUESTIONS
- Every question must be answerable from the chart alone, with arithmetic: totals, averages, differences, ratios, percentages, percentage change.
- 4 options, exactly one correct, all in the same format. Wrong options must be close and plausible.
- For EVERY question give "formula": how the answer is computed from the chart, written ONLY with numbers, + - * / ( ) and these functions:
    v("Series name", "Category")  sum("Series name")  avg("Series name")  max("Series name")  min("Series name")
    cat("Category") (all series added for one category)  pct(a, b) (a as a percentage of b)  round(x)  abs(x)
  Use the exact series and category names from the chart. Example: pct(v("A", "2021") - v("A", "2020"), v("A", "2020"))
  For a ratio answer like "4 : 5", the formula gives 4/5 as a number. If the answer is a name (a year, a city), give "formula": "".
- The correct option must equal the formula's value (rounded the way the option shows it). It is checked by computer; a mismatch is thrown away.
- Solutions show the working with the actual numbers.
- English text, with an accurate Hindi translation in the "Hi" fields.${
    avoidTexts?.length ? `\n\nALREADY ASKED - do not repeat:\n${avoidTexts.slice(0, 20).map((t, i) => `${i + 1}. ${t}`).join("\n")}` : ""
  }

Return ONLY valid JSON, no markdown, in exactly this shape:
{
  "chart": { "type": "${type}", "title": "...", "titleHi": "...", "unit": "e.g. in thousand tonnes", "xLabel": "...", "yLabel": "...",
             "categories": ["2019", "2020"], "series": [{ "name": "...", "values": [10, 20] }], "caselet": "", "caseletHi": "" },
  "questions": [
    { "text": "...", "textHi": "...", "options": ["..","..","..",".."], "optionsHi": ["..","..","..",".."], "correctIndex": 0,
      "formula": "...", "solution": "...", "solutionHi": "..." }
  ]
}`;
}

function figurePrompt({ count, subject, topic, difficulty, examDisplayName, examLevel, avoidTexts }) {
  return `You are an expert setter of NON-VERBAL (figure) reasoning questions for ${examDisplayName || "Indian government competitive exams"}.
${examLevel ? `Level: ${examLevel}\n` : ""}
Write exactly ${count} figure questions for "${subject}" - topic "${topic}", difficulty "${difficulty}".

Each figure is described as SHAPES ON A GRID, never as a picture. Every box (problem figure or answer figure) is a square divided into a grid x grid layout of cells - "grid" is 3 unless the question needs 2 or 4. Rows are numbered from the top (1), columns from the left (1).

A box is { "elements": [ { "shape", "row", "col", "fill", "size", "rotate" } ] }:
- shape: one of ${SHAPES.map((s) => `"${s}"`).join(", ")}
- fill: "black", "white" (outline only) or "striped"
- size: "small", "medium" or "large"
- rotate: clockwise turn in degrees, a multiple of 45. At 0 a triangle/arrow points UP, a semicircle's curved side is UP, a heart is upright, a line is vertical.
- At most one shape per cell. 1 to 5 shapes per box.

Question kinds (use a mix):
- "series": 3 to 5 problem figures that change by a rule; the answer is the next figure. Give the rule:
      { "type": "rotate", "by": 90 }        the whole box turns clockwise by 90/180/270 each step (positions AND shapes turn)
      { "type": "turn_shapes", "by": 45 }   every shape turns in place by a multiple of 45 each step
      Only these two rules - the answer is worked out by computer, and any other rule is thrown out.
- "mirror": 1 problem figure, a mirror on its RIGHT; the answer is its mirror image. rule { "type": "mirror" }
- "water": 1 problem figure, water BELOW it; the answer is its water image. rule { "type": "water" }
- "odd_one_out": no problem figures; four answer figures, three follow a rule and one does not. rule { "type": "none" }. The odd one must differ in ONE visible way (number of shapes, which shapes, colour, size, position or facing) while the other three agree on it - and no other figure may stand out on any of those: if one of the three is the only black one, or the only one in different cells, that is a second answer and the question is thrown out.
- "analogy": 3 problem figures (1 : 2 :: 3 : ?). Figure 2 is figure 1 changed by ONE rule - { "type": "rotate", "by": 90|180|270 }, { "type": "turn_shapes", "by": 45..315 }, { "type": "mirror" } or { "type": "water" } - and the answer is figure 3 changed by the same rule. Give that rule.

Rules:
- Exactly 4 answer figures, all different, exactly one correct.
- Every answer is CHECKED BY COMPUTER from the figures and the rule: the correct option must be exactly the result, and no wrong option may be what any other rotation, turn, mirror or water image of the figures gives. A question that fails is thrown out.
- The rule must visibly change the figure (no shape that looks the same after the turn).
- "correctIndex" is the position in "options": 0 = (A), 1 = (B), 2 = (C), 3 = (D). The solution names the answer as "Figure (A)"...(D), never "option 1".
- Wrong options should be the classic traps: turned the wrong way, mirrored instead of rotated, one shape out of place.
- "text" asks the question in words (e.g. "Which answer figure will come next in the series?"), with a Hindi translation in "textHi".
- The solution explains the rule step by step, in English and Hindi.${
    avoidTexts?.length ? `\n\nALREADY ASKED - make these different:\n${avoidTexts.slice(0, 15).map((t, i) => `${i + 1}. ${t}`).join("\n")}` : ""
  }

Return ONLY valid JSON, no markdown, in exactly this shape:
{ "questions": [
  { "text": "...", "textHi": "...", "correctIndex": 0, "solution": "...", "solutionHi": "...",
    "figure": { "layout": "series", "grid": 3, "rule": { "type": "rotate", "by": 90 },
                "question": [ { "elements": [ { "shape": "arrow", "row": 1, "col": 1, "fill": "black", "size": "medium", "rotate": 0 } ] } ],
                "options": [ { "elements": [] }, { "elements": [] }, { "elements": [] }, { "elements": [] } ] } }
] }`;
}

/**
 * Turns what the model returned into questions, keeping only those whose
 * answer the chart or figure actually gives. Pure - no model, no database -
 * so it is what the tests exercise directly.
 *
 * Returns { questions, rejected: [{ text, reason }] }.
 */
function buildVisualQuestions(kind, raw, { examType, subject, topic, difficulty, syllabusTopics }) {
  const kept = [];
  const rejected = [];

  if (kind === "chart") {
    let chart;
    try {
      chart = normaliseChart(raw?.chart);
    } catch (err) {
      return { questions: [], rejected: (raw?.questions || [{}]).map((q) => ({ text: q?.text || "(chart)", reason: `chart unusable: ${err.message}` })) };
    }
    const setId = crypto.randomBytes(6).toString("hex");
    for (const q of raw?.questions || []) {
      const check = checkChartAnswer(q, chart);
      if (check.ok === false) {
        rejected.push({ text: q?.text, reason: `chart check: ${check.reason}` });
        continue;
      }
      const { formula, ...rest } = q;
      kept.push({ ...rest, visual: { kind: "chart", setId, chart, formula: formula || undefined } });
    }
  } else if (kind === "figure") {
    for (const q of raw?.questions || []) {
      let spec;
      try {
        spec = normaliseFigure(q?.figure);
      } catch (err) {
        rejected.push({ text: q?.text, reason: `figure unusable: ${err.message}` });
        continue;
      }
      const correctIndex = Number(q.correctIndex);
      if (!(correctIndex >= 0 && correctIndex <= 3)) {
        rejected.push({ text: q?.text, reason: "no valid correct option" });
        continue;
      }
      const check = checkFigureAnswer(spec, correctIndex);
      if (check.ok !== true) {
        rejected.push({ text: q?.text, reason: `figure check: ${check.reason}` });
        continue;
      }
      const { figure, ...rest } = q;
      kept.push({
        ...rest,
        correctIndex,
        options: [...FIGURE_OPTIONS],
        optionsHi: [...FIGURE_OPTIONS_HI],
        visual: { kind: "figure", figure: { spec, answerCheck: "checked" } },
      });
    }
  }

  return {
    questions: gemini.tagGenerated(kept, { examType, subject, topic, difficulty, syllabusTopics }),
    rejected,
  };
}

/**
 * Asks the model for `count` chart or figure questions and returns the ones
 * that survive buildVisualQuestions. May return fewer: a chart whose numbers
 * do not add up is not padded out with guesses.
 */
async function generateVisualQuestions(params) {
  const { kind, count = 5 } = params;
  if (isHindiMedium(params)) throw new Error("chart and figure questions are written in English with Hindi translations");
  const out = [];
  const maxRounds = Math.ceil(count / (kind === "chart" ? QUESTIONS_PER_CHART : FIGURES_PER_CALL)) + 2;

  for (let round = 0; round < maxRounds && out.length < count; round++) {
    const ask = Math.min(kind === "chart" ? QUESTIONS_PER_CHART : FIGURES_PER_CALL, count - out.length);
    const topicNames = syllabusNames(params.syllabusTopics);
    const prompt =
      kind === "chart"
        ? chartPrompt({ ...params, count: Math.max(ask, 3), topic: topicNames.join(", ") || params.topic, avoidTexts: [...(params.avoidTexts || []), ...out.map((q) => q.text)] })
        : figurePrompt({ ...params, count: ask, topic: topicNames.join(", ") || params.topic, avoidTexts: [...(params.avoidTexts || []), ...out.map((q) => q.text)] });

    const raw = await gemini.callGemini(prompt, { jsonMode: true });
    const built = buildVisualQuestions(kind, raw, params);
    for (const r of built.rejected) {
      RejectedQuestion.create({
        text: String(r.text || "(no text)").slice(0, 500),
        subject: params.subject,
        topic: params.topic,
        difficulty: params.difficulty,
        reason: kind === "chart" ? "chart_check" : "figure_check",
        detail: String(r.reason).slice(0, 200),
      }).catch(() => {});
    }
    // A DI set is used whole or not at all past what is needed: asked for 3
    // more, a 5-question set gives its first 3.
    out.push(...built.questions.slice(0, count - out.length));
  }
  return out;
}

module.exports = { generateVisualQuestions, buildVisualQuestions, QUESTIONS_PER_CHART, FIGURE_OPTIONS };
