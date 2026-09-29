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

        // Extra subjects this one section also draws questions from.
        //
        // A paper's section and a study subject are not the same thing. SSC's
        // "General Awareness" section is built from GK, Science and Current
        // Affairs together, while RRB Group D asks Science as a section of its
        // own. Tying a section to exactly one subject forced an impossible
        // choice - Science had to be either a GK chapter (wrong for Railway)
        // or its own subject (invisible to SSC).
        //
        // The section always includes `subject`; these are added to it. Empty
        // means the section is just `subject`, exactly as before.
        sources: [{ type: String }],

        questionCount: { type: Number, required: true },

        // Set these only where a section really differs from the rest of the
        // paper. SSC MTS is the reason they exist: Session-I carries no
        // penalty while Session-II deducts a full mark, so one number for
        // the whole exam punished a wrong answer the real paper lets you
        // guess freely. Left null, the exam's own rate and marks apply.
        negativeMarking: { type: Number, default: null },
        marksPerQuestion: { type: Number, default: null },

        // Minutes this section alone is given, for the exams that lock a
        // section when its time is up. IBPS PO Prelims is three 20-minute
        // papers in a row, not one 60-minute paper - you cannot return to
        // English once you have moved on. Left null, the paper runs on one
        // clock, which is true of the other nine.
        durationMinutes: { type: Number, default: null },
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
