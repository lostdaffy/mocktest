const Subject = require("../models/Subject");
const Question = require("../models/Question");
const Test = require("../models/Test");
const User = require("../models/User");

// The adaptive difficulty ladder. A student climbs this per-chapter as their
// accuracy improves, so they start easy and are pushed toward advanced.
const LEVEL_LADDER = ["easy", "medium", "hard", "advanced"];

// Accuracy (%) needed to be promoted to the next level.
const PROMOTION_THRESHOLD = 70;

// GET /api/subjects -> full catalog of subjects + chapters
async function listSubjects(req, res) {
  const subjects = await Subject.find({ isActive: true }).sort({ displayOrder: 1 });
  res.json({ subjects });
}

// POST /api/subjects (admin) -> create/update a subject with its chapters
async function upsertSubject(req, res) {
  const { name, nameHi, icon, displayOrder, chapters } = req.body;
  const subject = await Subject.findOneAndUpdate(
    { name },
    { name, nameHi, icon, displayOrder, chapters, isActive: true },
    { upsert: true, new: true }
  );
  res.json({ subject });
}

// GET /api/subjects/my -> the student's selected subjects with per-chapter progress
async function getMySubjects(req, res) {
  const user = await User.findById(req.user._id);
  const selected = user.selectedSubjects || [];

  const subjects = await Subject.find({ name: { $in: selected }, isActive: true }).sort({ displayOrder: 1 });

  // Attach this user's progress to each chapter
  const withProgress = subjects.map((subj) => {
    const chapters = subj.chapters.map((ch) => {
      const prog = (user.chapterProgress || []).find(
        (p) => p.subject === subj.name && p.chapter === ch.name
      );
      return {
        name: ch.name,
        nameHi: ch.nameHi,
        topics: ch.topics,
        currentLevel: prog?.currentLevel || "easy",
        testsCompleted: prog?.testsCompleted || 0,
        bestAccuracy: prog?.bestAccuracy || 0,
        isCompleted: prog?.isCompleted || false,
      };
    });
    const completedCount = chapters.filter((c) => c.isCompleted).length;
    return {
      _id: subj._id,
      name: subj.name,
      nameHi: subj.nameHi,
      icon: subj.icon,
      chapters,
      completedCount,
      totalChapters: chapters.length,
    };
  });

  res.json({ subjects: withProgress });
}

// PATCH /api/subjects/my -> update the student's selected subjects
async function updateMySubjects(req, res) {
  const { subjects } = req.body; // array of subject names
  if (!Array.isArray(subjects)) return res.status(400).json({ message: "subjects array chahiye" });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { selectedSubjects: subjects },
    { new: true }
  ).select("selectedSubjects");
  res.json({ selectedSubjects: user.selectedSubjects });
}

// POST /api/subjects/chapter-test  { subject, chapter }
// Generates an adaptive chapter test at the student's CURRENT level for that
// chapter. As they clear levels, subsequent tests get harder automatically.
async function generateChapterTest(req, res) {
  try {
    const { subject, chapter } = req.body;
    if (!subject || !chapter) return res.status(400).json({ message: "subject aur chapter chahiye" });

    const subjectDoc = await Subject.findOne({ name: subject });
    if (!subjectDoc) return res.status(404).json({ message: "Subject nahi mila" });

    const chapterDoc = subjectDoc.chapters.find((c) => c.name === chapter);
    if (!chapterDoc) return res.status(404).json({ message: "Chapter nahi mila" });

    const user = await User.findById(req.user._id);
    const prog = (user.chapterProgress || []).find((p) => p.subject === subject && p.chapter === chapter);
    const level = prog?.currentLevel || "easy";

    // "advanced" isn't a stored question difficulty (we only tag easy/medium/hard),
    // so at the advanced level we pull the hardest questions available.
    const questionDifficulty = level === "advanced" ? "hard" : level;

    const topics = chapterDoc.topics && chapterDoc.topics.length ? chapterDoc.topics : [chapter];

    const questions = await Question.aggregate([
      {
        $match: {
          topic: { $in: topics },
          difficulty: questionDifficulty,
          status: "published",
        },
      },
      { $sample: { size: 15 } },
    ]);

    if (questions.length === 0) {
      return res.status(400).json({
        message: `Is chapter (${chapter}) ke ${level} level ke liye abhi questions available nahi hain.`,
      });
    }

    const test = await Test.create({
      title: `${chapter} - ${level.charAt(0).toUpperCase() + level.slice(1)} Level`,
      type: "topic_wise",
      examType: "CHAPTER_PRACTICE",
      subject,
      topic: chapter,
      questions: questions.map((q) => q._id),
      durationMinutes: Math.max(10, questions.length),
      generatedForUser: req.user._id,
    });

    res.status(201).json({ test, level });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Called after a chapter test is submitted (from the test submit flow) to
// update mastery and possibly promote the student to the next level.
// Exported so testController can call it.
async function updateChapterMastery(userId, subject, chapter, accuracy) {
  const user = await User.findById(userId);
  if (!user) return;

  let prog = user.chapterProgress.find((p) => p.subject === subject && p.chapter === chapter);
  if (!prog) {
    prog = { subject, chapter, currentLevel: "easy", testsCompleted: 0, bestAccuracy: 0, lastAccuracy: 0, isCompleted: false };
    user.chapterProgress.push(prog);
    prog = user.chapterProgress[user.chapterProgress.length - 1];
  }

  prog.testsCompleted += 1;
  prog.lastAccuracy = accuracy;
  if (accuracy > prog.bestAccuracy) prog.bestAccuracy = accuracy;

  // Promote to next level if they cleared the threshold
  if (accuracy >= PROMOTION_THRESHOLD) {
    const currentIdx = LEVEL_LADDER.indexOf(prog.currentLevel);
    if (currentIdx < LEVEL_LADDER.length - 1) {
      prog.currentLevel = LEVEL_LADDER[currentIdx + 1];
    } else {
      // Already at "advanced" and cleared it -> chapter mastered
      prog.isCompleted = true;
    }
  }

  await user.save();
  return { newLevel: prog.currentLevel, isCompleted: prog.isCompleted };
}

module.exports = {
  listSubjects,
  upsertSubject,
  getMySubjects,
  updateMySubjects,
  generateChapterTest,
  updateChapterMastery,
};