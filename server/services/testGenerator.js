const Question = require("../models/Question");
const ExamPattern = require("../models/ExamPattern");
const Test = require("../models/Test");
const User = require("../models/User");

// Picks N random published questions matching filters, respecting an
// easy/medium/hard mix percentage.
async function pickQuestionsForSection({ examType, subject, count, difficultyMix, excludeIds = [] }) {
  const buckets = [
    { difficulty: "easy", n: Math.round((count * (difficultyMix?.easy ?? 30)) / 100) },
    { difficulty: "medium", n: Math.round((count * (difficultyMix?.medium ?? 50)) / 100) },
    { difficulty: "hard", n: Math.round((count * (difficultyMix?.hard ?? 20)) / 100) },
  ];

  let picked = [];
  for (const bucket of buckets) {
    if (bucket.n <= 0) continue;
    const docs = await Question.aggregate([
      {
        $match: {
          examType: examType,
          subject,
          difficulty: bucket.difficulty,
          status: "published",
          _id: { $nin: excludeIds },
        },
      },
      { $sample: { size: bucket.n } },
    ]);
    picked = picked.concat(docs);
  }

  // Top up if we came short (e.g. not enough "hard" questions yet in bank)
  if (picked.length < count) {
    const shortBy = count - picked.length;
    const alreadyIds = picked.map((p) => p._id);
    const filler = await Question.aggregate([
      {
        $match: {
          examType: examType,
          subject,
          status: "published",
          _id: { $nin: [...excludeIds, ...alreadyIds] },
        },
      },
      { $sample: { size: shortBy } },
    ]);
    picked = picked.concat(filler);
  }

  return picked;
}

/**
 * Generates a full-length mock test automatically from the exam's configured pattern.
 * No manual test creation needed - admin only defines the pattern once per exam.
 */
async function generateFullMock(examType) {
  const pattern = await ExamPattern.findOne({ examType, isActive: true });
  if (!pattern) throw new Error(`No active exam pattern configured for ${examType}`);

  let allQuestions = [];
  for (const section of pattern.sections) {
    const qs = await pickQuestionsForSection({
      examType,
      subject: section.subject,
      count: section.questionCount,
      difficultyMix: section.difficultyMix,
    });
    allQuestions = allQuestions.concat(qs);
  }

  if (allQuestions.length === 0) {
    throw new Error(
      `Abhi ${examType} ke liye koi published question available nahi hai. Pehle backend mein "npm run generate:questions" chalao.`
    );
  }

  const test = await Test.create({
    title: `${pattern.displayName} - Full Mock (${new Date().toLocaleDateString("en-IN")})`,
    type: "full_mock",
    examType,
    questions: allQuestions.map((q) => q._id),
    durationMinutes: pattern.durationMinutes,
    marksPerQuestion: pattern.marksPerQuestion,
    negativeMarking: pattern.negativeMarking,
    createdBy: "system_auto",
  });

  return test;
}

/**
 * Generates a topic-wise practice test - a small set of questions on one topic.
 */
async function generateTopicTest({ examType, subject, topic, count = 15 }) {
  const questions = await Question.aggregate([
    { $match: { examType, subject, topic, status: "published" } },
    { $sample: { size: count } },
  ]);

  if (questions.length === 0) {
    throw new Error(`Is topic (${topic}) ke liye abhi koi published question available nahi hai.`);
  }

  const test = await Test.create({
    title: `${topic} Practice`,
    type: "topic_wise",
    examType,
    subject,
    topic,
    questions: questions.map((q) => q._id),
    durationMinutes: Math.max(10, count * 1), // ~1 min/question
  });

  return test;
}

/**
 * Smart "Aaj Ka Test" - personalized daily test.
 * Mix: weak topics (from user.topicStats where accuracy < 60) + one
 * high-weightage topic, so practice is always relevant, not random.
 */
// Returns the start of "today" in IST, since that's the audience's timezone -
// a test generated at 11:58 PM and one at 12:02 AM should count as different days.
function startOfTodayIST() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffsetMs);
}

// This never calls Gemini - it only samples from the pre-existing published
// question bank built by the admin's "Generate & Add" workflow. That pool is
// what needs to stay healthy; this function just needs to be safe to call
// from thousands of concurrent requests, which means:
//   1. Idempotent per (user, day) - repeat calls return the SAME test instead
//      of creating a new Test document every time (was silently bloating the
//      DB by one document per open of the Home tab).
//   2. A graceful fallback when a user's specific weak-topic pool is thin,
//      instead of a hard error that fires for every affected user at once.
async function generatePersonalizedDailyTest(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const todayStart = startOfTodayIST();
  const existing = await Test.findOne({
    generatedForUser: userId,
    type: "revision",
    title: "Aaj Ka Test",
    createdAt: { $gte: todayStart },
  });
  if (existing) return existing;

  const examType = user.examGoals?.[0] || "SSC_CGL";
  const weakTopics = (user.topicStats || [])
    .filter((t) => t.accuracy < 60 && t.attempted >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 2);

  let questions = [];

  if (weakTopics.length > 0) {
    for (const wt of weakTopics) {
      const qs = await Question.aggregate([
        { $match: { examType, subject: wt.subject, topic: wt.topic, status: "published" } },
        { $sample: { size: 10 } },
      ]);
      questions = questions.concat(qs);
    }
  }

  // Weak-topic pool came back thin (or the user has no weak-topic data yet) -
  // top up with a general set instead of erroring. This is what keeps a
  // sudden traffic spike from turning into a wall of failed requests.
  if (questions.length < 15) {
    const alreadyIds = questions.map((q) => q._id);
    const filler = await Question.aggregate([
      { $match: { examType, status: "published", _id: { $nin: alreadyIds } } },
      { $sample: { size: 20 - questions.length } },
    ]);
    questions = questions.concat(filler);
  }

  if (questions.length === 0) {
    throw new Error(
      `No published questions available for ${examType} yet. Ask the admin to publish some first.`
    );
  }

  const test = await Test.create({
    title: "Aaj Ka Test",
    type: "revision",
    examType,
    questions: questions.map((q) => q._id),
    durationMinutes: Math.max(15, questions.length * 1),
    generatedForUser: userId,
  });

  return test;
}

/**
 * Weekly auto-revision test built purely from a user's wrong/bookmarked questions.
 */
async function generateWeeklyRevisionTest(userId, wrongQuestionIds) {
  if (!wrongQuestionIds || wrongQuestionIds.length === 0) {
    throw new Error("No wrong/bookmarked questions available for revision yet");
  }
  const questions = await Question.find({ _id: { $in: wrongQuestionIds }, status: "published" }).limit(25);

  const test = await Test.create({
    title: "Weekly Weak-Topic Revision",
    type: "revision",
    examType: questions[0]?.examType?.[0] || "GENERAL",
    questions: questions.map((q) => q._id),
    durationMinutes: Math.max(15, questions.length * 1),
    generatedForUser: userId,
  });

  return test;
}

module.exports = {
  generateFullMock,
  generateTopicTest,
  generatePersonalizedDailyTest,
  generateWeeklyRevisionTest,
};