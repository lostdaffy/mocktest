// Run this daily (manually, or via a cron job / Render Cron Job) to auto-fill
// the question bank. Usage:
//   node scripts/generateQuestions.js
//
// It walks through a config list of exam/subject/topic combinations, asks
// Gemini for a batch of questions, runs them through the validation pipeline,
// and saves them - low-risk ones go straight to "published", risky ones land
// in "under_review" for you to check in the admin panel.

require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");
const { generateQuestions } = require("../services/geminiService");
const { runValidationPipeline } = require("../services/validationPipeline");

// Edit this list to control what gets generated. Add more exam/topic
// combinations as your syllabus coverage grows.
const GENERATION_PLAN = [
  { examType: "SSC_CGL", subject: "Maths", topic: "Percentage", difficulty: "medium", count: 10 },
  { examType: "SSC_CGL", subject: "Reasoning", topic: "Blood Relation", difficulty: "medium", count: 10 },
  { examType: "SSC_CGL", subject: "GK", topic: "Static GK - Indian History", difficulty: "easy", count: 10 },
  { examType: "UP_POLICE", subject: "GK", topic: "UP Current Affairs", difficulty: "medium", count: 10 },
  { examType: "UP_POLICE", subject: "Reasoning", topic: "Number Series", difficulty: "medium", count: 10 },
  { examType: "RAILWAY", subject: "Maths", topic: "Time and Work", difficulty: "medium", count: 10 },
  { examType: "BANKING", subject: "Reasoning", topic: "Syllogism", difficulty: "hard", count: 10 },
  { examType: "CTET", subject: "Child Development", topic: "Piaget Theory", difficulty: "medium", count: 10 },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB. Starting generation run...\n");

  let totalPublished = 0;
  let totalFlagged = 0;

  for (const job of GENERATION_PLAN) {
    try {
      console.log(`Generating ${job.count} questions: ${job.examType} / ${job.subject} / ${job.topic}...`);
      const rawQuestions = await generateQuestions(job);

      for (const raw of rawQuestions) {
        const validated = await runValidationPipeline(raw);
        await Question.create(validated);
        if (validated.status === "published") totalPublished++;
        else totalFlagged++;
      }
      console.log(`  -> done.\n`);
    } catch (err) {
      console.error(`  -> FAILED for ${job.examType}/${job.topic}:`, err.message, "\n");
    }
  }

  console.log(`\nRun complete. Published: ${totalPublished}, Sent to review queue: ${totalFlagged}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Script crashed:", err);
  process.exit(1);
});
