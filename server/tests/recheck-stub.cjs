// Preloaded into the server under test. The gate's verdict is driven by a
// marker in the question text, so the test can set up one of each kind.
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");

const gemini = require(path.join(SERVER, "services/geminiService"));
const pipeline = require(path.join(SERVER, "services/validationPipeline"));

const LONG = "Step 1: 20% of 500 = 100. Step 2: 500 - 100 = 400. Answer 400.";

pipeline.runValidationPipelineBatch = async (questions, { reshuffle = true } = {}) => {
  // Recorded so the test can prove a question already in circulation is not
  // reshuffled under the student who answered it.
  pipeline.__lastReshuffle = reshuffle;
  return questions.map((q) => {
    if (/WRONG/.test(q.text)) {
      return { ...q, status: "under_review", flagReason: 'AI verification disagreed - it answered "b"', aiConfidenceScore: 0.2 };
    }
    if (/THIN/.test(q.text) && (q.solution || "").length < 25) {
      return { ...q, status: "under_review", flagReason: "Rule check failed: solution too short", aiConfidenceScore: 0 };
    }
    return { ...q, status: "published", aiConfidenceScore: 1 };
  });
};
pipeline.runValidationPipeline = async (q) => (await pipeline.runValidationPipelineBatch([q]))[0];

// Repair fills the gap it is asked about and nothing else.
gemini.repairQuestion = async (q) => ({ ...q, solution: LONG, solutionHi: "हिंदी हल: " + LONG });

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

console.log("[stub] gate driven by markers in the question text");
