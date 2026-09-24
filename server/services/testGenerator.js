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
      // Shown to a student, so it says what THEY can do - not what the
      // admin should run on the server.
      `Is exam ke questions abhi taiyaar ho rahe hain. Thodi der baad dobara try karo.`
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
    throw new Error(`${topic} ke questions abhi taiyaar ho rahe hain. Thodi der baad dobara try karo.`);
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
// How many questions "Aaj Ka Test" asks for. Also what the daily goal on
// the home screen counts towards, so the two can never disagree.
const DAILY_TEST_SIZE = 20;

// Every question this student has already answered, across every test they
// have taken. Used to keep the daily test genuinely new.
async function answeredQuestionIds(userId) {
  const Attempt = require("../models/Attempt");
  const rows = await Attempt.find({ user: userId }).select("answers.question").lean();
  const ids = new Set();
  for (const attempt of rows) {
    for (const a of attempt.answers || []) if (a.question) ids.add(String(a.question));
  }
  return [...ids].map((id) => new (require("mongoose").Types.ObjectId)(id));
}

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

  // Questions this student has already answered. "Today's test" that hands
  // back yesterday's questions isn't practice, and it's the fastest way to
  // lose someone who shows up every day. Weak-topic questions are the one
  // thing worth repeating - but only after everything new is used up.
  const seenIds = await answeredQuestionIds(userId);

  let questions = [];

  if (weakTopics.length > 0) {
    for (const wt of weakTopics) {
      const qs = await Question.aggregate([
        { $match: { examType, subject: wt.subject, topic: wt.topic, status: "published", _id: { $nin: seenIds } } },
        { $sample: { size: 10 } },
      ]);
      questions = questions.concat(qs);
    }
  }

  // Not enough unseen weak-topic material - top up with anything else they
  // haven't answered yet.
  if (questions.length < DAILY_TEST_SIZE) {
    const alreadyIds = questions.map((q) => q._id);
    const filler = await Question.aggregate([
      { $match: { examType, status: "published", _id: { $nin: [...seenIds, ...alreadyIds] } } },
      { $sample: { size: DAILY_TEST_SIZE - questions.length } },
    ]);
    questions = questions.concat(filler);
  }

  // Only once the bank has nothing new left do we revisit old questions -
  // and then the weakest topics first, because those are worth a second go.
  if (questions.length < DAILY_TEST_SIZE) {
    const alreadyIds = questions.map((q) => String(q._id));
    const revision = await Question.aggregate([
      { $match: { examType, status: "published", _id: { $nin: questions.map((q) => q._id) } } },
      { $sample: { size: DAILY_TEST_SIZE - questions.length } },
    ]);
    questions = questions.concat(revision.filter((q) => !alreadyIds.includes(String(q._id))));
  }

  if (questions.length === 0) {
    throw new Error(
      `Aaj ka test abhi taiyaar ho raha hai. Thodi der baad dobara try karo.`
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
    throw new Error("Revision ke liye abhi koi galat ya bookmark kiya hua question nahi hai. Pehle kuch test do.");
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