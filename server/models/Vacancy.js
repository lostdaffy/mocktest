const mongoose = require("mongoose");

// One recruitment notice: "RRB Group D 2025", "SSC GD 2026".
//
// An exam pattern says what a paper looks like (sections, marks, time). A
// vacancy is one sitting of that exam, with its own notification syllabus -
// RRB Group D's 2025 notice does not list exactly what 2019's did. Mocks built
// for a vacancy follow its syllabus, so a student preparing for the 2025
// notice practises the 2025 syllabus.
//
// The app lists vacancies in two sections, "Upcoming exam mock series" and
// "Previous exam mock series", by `status`. "hidden" is for one that is still
// being set up.
const vacancySchema = new mongoose.Schema(
  {
    examType: { type: String, required: true, index: true }, // the exam pattern it follows
    name: { type: String, required: true }, // "RRB Group D 2025"
    year: { type: Number, required: true },
    seriesName: { type: String, required: true }, // "RRB Group D 2025 Mock Series"
    status: { type: String, enum: ["upcoming", "previous", "hidden"], default: "hidden", index: true },
    displayOrder: { type: Number, default: 0 },

    examDate: { type: Date }, // when the exam is (or was), if known
    notificationUrl: { type: String }, // the official notice
    notes: { type: String }, // a line for students: posts, vacancies, eligibility

    // The notification's syllabus, section by section. A section left out
    // here uses the exam pattern's own syllabus.
    syllabus: [
      {
        _id: false,
        subject: { type: String, required: true }, // a section subject of the pattern
        topics: [
          {
            _id: false,
            topic: { type: String, required: true },
            subTopics: [{ type: String }],
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

vacancySchema.index({ status: 1, displayOrder: 1, year: -1 });

module.exports = mongoose.model("Vacancy", vacancySchema);
