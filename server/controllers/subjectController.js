const Subject = require("../models/Subject");
const Question = require("../models/Question");
const Test = require("../models/Test");
const User = require("../models/User");
const ExamPattern = require("../models/ExamPattern");
const { subjectsForExams, chaptersForExams, sectionSubjectNames } = require("../services/catalog");

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
  const { name, nameHi, icon, displayOrder, chapters, aliases } = req.body;
  const subject = await Subject.findOneAndUpdate(
    { name },
    { name, nameHi, icon, displayOrder, chapters, aliases: aliases || [], isActive: true },
    { upsert: true, new: true }
  );
  res.json({ subject });
}

// GET /api/subjects/my -> the student's selected subjects with per-chapter progress
async function getMySubjects(req, res) {
  const user = await User.findById(req.user._id);
  const examGoals = user.examGoals || [];

  // Subjects follow from the exam chosen at signup - nobody is asked to
  // set them up. A student who picks SSC CGL has already said they study
  // Maths, Reasoning, English and GK; asking them to tick those again only
  // creates a way to get it wrong, and it did: of the first paying users,
  // one had picked one subject of four and another none at all, leaving
  // their Practice tab empty.
  //
  // Anything they added themselves is kept on top, so someone preparing
  // for two exams can still pull in an extra subject.
  const fromExam = await subjectsForExams(examGoals);
  const names = [...new Set([...fromExam, ...(user.selectedSubjects || [])])];

  const subjects = await Subject.find({ name: { $in: names }, isActive: true }).sort({ displayOrder: 1 });

  // Attach this user's progress to each chapter
  const withProgress = subjects.map((subj) => {
    // Only the chapters this student's own exam asks for - an Agniveer
    // aspirant is never shown Coordinate Geometry.
    const chapters = chaptersForExams(subj.chapters, examGoals).map((ch) => {
      const prog = (user.chapterProgress || []).find(
        (p) => p.subject === subj.name && p.chapter === ch.name
      );
      return {
        name: ch.name,
        nameHi: ch.nameHi,
        topics: ch.topics,
        category: ch.category || null,
        categoryHi: ch.categoryHi || null,
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

    // Prefer questions written for this student's own exam. "Hard" at SSC
    // CGL level is not "hard" at Agniveer level, and a question pitched two
    // exams above someone is the quickest way to convince them they can't
    // do this. The bank is shared on purpose, so fall back to the rest of
    // it rather than show an empty screen.
    const examGoals = user.examGoals || [];
    const base = { topic: { $in: topics }, difficulty: questionDifficulty, status: "published" };

    let questions = [];
    if (examGoals.length) {
      questions = await Question.aggregate([
        { $match: { ...base, examType: { $in: examGoals } } },
        { $sample: { size: 15 } },
      ]);
    }
    if (questions.length < 15) {
      const have = questions.map((q) => q._id);
      const filler = await Question.aggregate([
        { $match: { ...base, _id: { $nin: have } } },
        { $sample: { size: 15 - questions.length } },
      ]);
      questions = questions.concat(filler);
    }

    if (questions.length === 0) {
      return res.status(400).json({
        message: `${chapter} ke ${level} level ke questions abhi taiyaar ho rahe hain. Thodi der baad try karo.`,
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
    // A chapter whose bank isn't built yet is a normal, expected state -
    // answering 500 made the app show a server-error screen for it.
    res.status(400).json({ message: err.message });
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


// GET /api/subjects/health (admin) -> everything in the catalog that is
// wired up wrong.
//
// Nothing here throws an error at the time it is set up: a section naming a
// subject that doesn't exist saves fine, a chapter whose topics match no
// question saves fine. They fail silently, months later, as an empty screen
// for one group of students. Three were already live when this was written -
// a Banking section asking for "Quant" when the catalog said "Maths", four
// CTET subjects with no catalog entry, and Current Affairs questions that no
// exam section could ever reach. This is the screen that would have caught
// all three the same day.
async function catalogHealth(req, res) {
  const [subjects, patterns, topicCounts] = await Promise.all([
    Subject.find({ isActive: true }).lean(),
    ExamPattern.find({ isActive: true }).lean(),
    Question.aggregate([
      { $match: { status: "published" } },
      { $group: { _id: "$topic", n: { $sum: 1 } } },
    ]),
  ]);

  const questionsByTopic = new Map(topicCounts.map((t) => [t._id, t.n]));
  const examTypes = new Set(patterns.map((p) => p.examType));

  // Every name the catalog answers to, alias included.
  const known = new Map();
  for (const subj of subjects) {
    known.set(subj.name, subj.name);
    for (const alias of subj.aliases || []) known.set(alias, subj.name);
  }

  const problems = [];
  const usedSubjects = new Set();

  // No exam patterns at all means no mock can be built for anybody, and
  // nothing else on this screen would say so plainly - every subject would
  // just look unused. It has happened once: the collection was found empty
  // when it had held five patterns minutes earlier.
  if (!patterns.length) {
    problems.push({
      kind: "no_exam_patterns",
      severity: "high",
      detail: "There are no exam patterns. No mock test can be generated for any student.",
      fix: "Restore them from a backup (scripts/restoreDb.js) or add them in Exam Patterns.",
    });
  }

  for (const pattern of patterns) {
    for (const section of pattern.sections || []) {
      for (const name of sectionSubjectNames(section)) {
        const resolved = known.get(name);
        if (resolved) {
          usedSubjects.add(resolved);
        } else {
          problems.push({
            kind: "section_subject_missing",
            severity: `high`,
            exam: pattern.displayName || pattern.examType,
            detail: `Section asks for "${name}", but no subject has that name or alias.`,
            fix: `Either rename the section, or add "${name}" to that subject's other names.`,
          });
        }
      }
    }
  }

  for (const subj of subjects) {
    if (!usedSubjects.has(subj.name)) {
      problems.push({
        kind: "subject_unused",
        severity: "high",
        subject: subj.name,
        detail: `No exam section draws on ${subj.name}, so its questions can never appear in a mock.`,
        fix: `Add ${subj.name} to a section's "also draw from", or leave it as practice-only on purpose.`,
      });
    }

    for (const ch of subj.chapters || []) {
      const topics = ch.topics && ch.topics.length ? ch.topics : [ch.name];
      const have = topics.reduce((sum, t) => sum + (questionsByTopic.get(t) || 0), 0);

      if (!have) {
        problems.push({
          kind: "chapter_empty",
          severity: "medium",
          subject: subj.name,
          chapter: ch.name,
          detail: `No published questions match this chapter's topics (${topics.join(", ")}).`,
          fix: `Generate questions for it, or correct the topics so they match the question tags.`,
        });
      }

      const unknownExams = (ch.exams || []).filter((e) => !examTypes.has(e));
      if (unknownExams.length) {
        problems.push({
          kind: "chapter_unknown_exam",
          severity: "medium",
          subject: subj.name,
          chapter: ch.name,
          detail: `Tagged to ${unknownExams.join(", ")}, which is not a configured exam.`,
          fix: `Remove the tag, or add that exam pattern.`,
        });
      }
    }
  }

  // A syllabus topic the generator is told to ask from, with no chapter for
  // students to practise it in.
  const chapterTopics = new Set();
  for (const subj of subjects) {
    for (const ch of subj.chapters || []) {
      // Both the chapter name and its topic tags count as practisable: a
      // syllabus entry may name either, and both lead a student to the
      // same chapter.
      chapterTopics.add(ch.name);
      (ch.topics || []).forEach((t) => chapterTopics.add(t));
    }
  }
  for (const pattern of patterns) {
    for (const section of pattern.sections || []) {
      for (const entry of section.syllabus || []) {
        const topic = typeof entry === `string` ? entry : entry.topic;
        if (topic && !chapterTopics.has(topic)) {
          problems.push({
            kind: "syllabus_topic_unpractisable",
            severity: "low",
            exam: pattern.displayName || pattern.examType,
            detail: `"${topic}" is in the syllabus but no chapter covers it.`,
            fix: `Add a chapter with this topic so students can practise it.`,
          });
        }
      }
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  problems.sort((a, b) => order[a.severity] - order[b.severity]);

  res.json({
    checkedAt: new Date(),
    subjects: subjects.length,
    exams: patterns.length,
    chapters: subjects.reduce((n, s) => n + (s.chapters || []).length, 0),
    publishedQuestions: topicCounts.reduce((n, t) => n + t.n, 0),
    problems,
  });
}

module.exports = {
  listSubjects,
  catalogHealth,
  upsertSubject,
  getMySubjects,
  updateMySubjects,
  generateChapterTest,
  updateChapterMastery,
};