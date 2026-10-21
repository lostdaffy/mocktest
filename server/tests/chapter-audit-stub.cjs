// Preloaded into the server under test for the chapter audit. The checker's
// verdict comes from a marker in the question text:
//   WRONG - disputed on every check
//   FLAKY - disputed the first time, sound on the second check
//   QUOTA - the checker cannot answer (the day's allowance is spent)
//   THIN  - rule failure: the solution is too short (mendable)
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");

const gemini = require(path.join(SERVER, "services/geminiService"));
const pipeline = require(path.join(SERVER, "services/validationPipeline"));

const LONG = "Step 1: 20% of 500 = 100. Step 2: 500 - 100 = 400. Answer 400.";
const seen = new Map();

pipeline.runValidationPipelineBatch = async (questions) =>
  questions.map((q) => {
    const n = (seen.get(q.text) || 0) + 1;
    seen.set(q.text, n);
    if (/QUOTA/.test(q.text)) {
      return { ...q, status: "under_review", flagReason: "AI verification could not be completed - daily limit reached", aiConfidenceScore: 0 };
    }
    if (/WRONG/.test(q.text) || (/FLAKY/.test(q.text) && n === 1)) {
      return { ...q, status: "under_review", flagReason: 'AI verification disagreed - it answered "b"', aiConfidenceScore: 0.2 };
    }
    if (/THIN/.test(q.text) && (q.solution || "").length < 25) {
      return { ...q, status: "under_review", flagReason: "Rule check failed: solution too short", aiConfidenceScore: 0 };
    }
    return { ...q, status: "published", aiConfidenceScore: 1 };
  });
pipeline.runValidationPipeline = async (q) => (await pipeline.runValidationPipelineBatch([q]))[0];

// Nothing here may reach the real AI (a top-up drafts a blueprint through it).
gemini.callGemini = async () => { throw new Error("no AI in this test"); };

gemini.repairQuestion =async (q) => ({ ...q, solution: LONG, solutionHi: "हिंदी हल: " + LONG });

gemini.generateQuestions = async ({ subject, difficulty, count }) =>
  Array.from({ length: count }, (_, i) => ({
    text: `FRESH ${subject} ${difficulty} #${Date.now()}-${i}`,
    options: ["a", "b", "c", "d"],
    correctIndex: 0,
    solution: LONG,
    subject,
    topic: subject,
    difficulty,
    source: "ai_generated",
    status: "draft",
    createdBy: "ai",
  }));

console.log("[stub] chapter audit checker driven by markers in the question text");
