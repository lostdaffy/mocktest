// Preloaded into the server under test (node -r). Replaces Gemini with a
// local generator so mock generation runs instantly and costs nothing, and
// logs every call so the test can inspect what the generator was given.
const path = require("path");
const fs = require("fs");
const SERVER = require("path").resolve(__dirname, "..");
const CALLS = path.join(__dirname, "gen-calls.jsonl");

let n = 0;
const allowanceUsed = {};
const gemini = require(path.join(SERVER, "services/geminiService"));
// Mirrors the real generateQuestions, including the tags it stamps on every
// question - the controllers rely on those being present.
gemini.generateQuestions = async ({ examType, subject, difficulty, count, pyqExamples, examLevel, syllabusTopics, avoidTexts }) => {
  fs.appendFileSync(
    CALLS,
    JSON.stringify({
      subject,
      difficulty,
      count,
      pyqExamples: pyqExamples || [],
      examLevel: examLevel || "",
      avoidTexts: avoidTexts || [],
      syllabusTopics: syllabusTopics || [],
    }) + "\n"
  );
  // Mirrors the real generator: one REAL topic per question, handed out in
  // turn, never the joined "A, B" string that matches nothing.
  // A deliberate hook for the barren path: the branch that runs when the
  // generator produces nothing. It is only reached when the day's allowance
  // is spent, so it went untested and shipped a "res is not defined" - the
  // builder reaching for an HTTP response it no longer has.
  if (subject === "NothingComesBack") return [];

  // The day's allowance running out part way through a mock. An exam whose
  // level says ALLOWANCE_AFTER_<n> gets n batches and then the exact error
  // the real model rotation throws. This is how SSC CHSL was "done" at 9 of
  // 100 - every batch after the first failed, was skipped, and the job was
  // reported finished.
  const cap = /ALLOWANCE_AFTER_(\d+)/.exec(examLevel || "");
  if (cap) {
    allowanceUsed[examType] = (allowanceUsed[examType] || 0) + 1;
    if (allowanceUsed[examType] > Number(cap[1])) {
      throw new Error(
        "Every model has used its allowance for today (gemini-3.1-flash-lite, gemini-3.5-flash-lite, gemini-3.8-flash). Generation can continue tomorrow."
      );
    }
  }

  // The tags come from the real tagGenerated, not from a copy made here.
  // This stub used to re-implement it, and the copy carried the same fault -
  // it handed out the syllabus OBJECT as a question topic, which is the bug
  // no suite could catch precisely because the stub agreed with the code.
  const raw = Array.from({ length: count }, () => {
    n += 1;
    return {
      text: `AI ${subject} ${difficulty} #${n}`,
      options: ["a", "b", "c", "d"],
      correctIndex: 0,
      solution: "stub solution",
      // No topic: like the real model on a bad day, so the fallback runs.
    };
  });
  return gemini.tagGenerated(raw, { examType, subject, topic: subject, difficulty, syllabusTopics });
};

// Nothing here may reach the real API. A suite that quietly calls Gemini
// passes while the day's allowance lasts and fails after it is spent, which
// is exactly what happened: reject-test went green all morning and then
// started reporting "Every model has used its allowance for today" - a
// failure of the test setup wearing the costume of a product bug.
gemini.repairQuestion = async (q) => ({
  ...q,
  solution: "Step 1: work it through. Step 2: the answer follows. Answer confirmed.",
  solutionHi: "चरण 1: हल करें। चरण 2: उत्तर मिलता है।",
});
gemini.verifyQuestions = async (qs) => qs.map(() => ({ matches: true, confidence: 1 }));
gemini.verifyQuestion = async () => ({ matches: true, confidence: 1 });
gemini.callGemini = async () => {
  throw new Error("callGemini reached the real API from a test - stub whatever called it");
};

// The pipeline verifies a whole batch in one Gemini call; stub it out so the
// tests neither call the API nor need a key.
const pipeline = require(path.join(SERVER, "services/validationPipeline"));
const publish = (q) => ({ ...q, status: "published", aiConfidenceScore: 1 });
pipeline.runValidationPipelineBatch = async (questions) => questions.map(publish);
pipeline.runValidationPipeline = async (question) => publish(question);

console.log("[stub] Gemini generation stubbed");
