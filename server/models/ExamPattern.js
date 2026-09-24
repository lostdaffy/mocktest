const mongoose = require("mongoose");

// One document per exam (or per exam-stage, e.g. SSC_CGL_TIER1).
// The auto test generator reads this to assemble a full mock without
// any manual test creation.
const examPatternSchema = new mongoose.Schema(
  {
    examType: { type: String, required: true, unique: true, index: true }, // "SSC_CGL", "AGNIVEER_GD", etc.
    displayName: { type: String, required: true }, // "Agniveer Army GD"

    // One pattern per POST, because two posts of the same exam have
    // different papers - Agniveer GD and Agniveer Technical share a name and
    // almost nothing else. examGroup is just the family they belong to
    // ("Agniveer"), so the admin can see them together; postName is the post
    // itself ("Army GD"). Both are labels only: nothing is generated from
    // them, so adding a new post is purely an admin job.
    examGroup: { type: String, index: true },
    postName: { type: String },
    durationMinutes: { type: Number, required: true },
    negativeMarking: { type: Number, default: 0.25 },
    marksPerQuestion: { type: Number, default: 1 },

    // Told to the question generator as "this exam's level and scope", e.g.
    // "10th-pass level Army entrance; basic maths and science, NOT graduate
    // level". Kept here rather than in code so a new exam needs no code
    // change - see EXAM_CONTEXT in services/geminiService.js for the
    // built-in fallbacks used when this is empty.
    examLevel: { type: String },

    sections: [
      {
        subject: { type: String, required: true }, // "Maths"
        questionCount: { type: Number, required: true },
        // The official syllabus for this section of this post's paper. The
        // generator is told to ask ONLY from these and to spread questions
        // across them instead of hammering one topic.
        //
        // subTopics is what makes a topic precise: "Percentage" alone can
        // mean anything, "Percentage - successive change, profit link" can't.
        // A plain string is still accepted by the API and stored as a topic
        // with no sub-topics, so nothing that already exists breaks.
        syllabus: [
          {
            topic: { type: String, required: true },
            subTopics: [{ type: String }],
          },
        ],
        difficultyMix: {
          easy: { type: Number, default: 30 }, // percentage
          medium: { type: Number, default: 50 },
          hard: { type: Number, default: 20 },
        },
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamPattern", examPatternSchema);
