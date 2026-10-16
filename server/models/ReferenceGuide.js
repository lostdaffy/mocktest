const mongoose = require("mongoose");

// A reference paper the admin gives the AI to learn from - a coaching mock,
// a past paper, a page of notes - and what was learned from it.
//
// What the generator sees is only `guideText`: the level, the mix of topics
// and formats, how options and traps are built - written abstractly, never a
// question. The reference's own questions are kept as `stems` for one reason
// only: so a generated question that copies one is caught and thrown out.
// They are never put in a prompt and never shown to students.
const referenceGuideSchema = new mongoose.Schema(
  {
    // Which exam this teaches ("ALL" for every exam) and, optionally, which
    // subject within it.
    examType: { type: String, required: true, index: true },
    subject: { type: String, default: "" },
    title: { type: String, required: true },

    // "lessons": written by the app itself from rejected questions (services/lessons.js).
    kind: { type: String, enum: ["pdf", "images", "text", "lessons"], required: true },
    fileName: String,
    fileHash: { type: String, index: true },
    // The file itself (base64), kept until it has been read.
    payload: { type: String, select: false },
    mimeTypes: [String],

    status: { type: String, enum: ["queued", "reading", "ready", "failed"], default: "queued", index: true },
    error: String,

    // What the model learned, as it reported it.
    blueprint: {
      summary: String,
      level: String,
      topics: [{ _id: false, topic: String, count: Number }],
      formats: [String],
      language: String,
      options: String,
      traps: [String],
      difficulty: String,
    },
    // What goes into the generator's prompt. Written from the blueprint;
    // the admin can edit it.
    guideText: String,
    guideEdited: { type: Boolean, default: false },

    // The reference's questions, for the copy check only.
    stems: { type: [String], select: false },
    stemCount: { type: Number, default: 0 },

    active: { type: Boolean, default: true },
    createdBy: String,
    readAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReferenceGuide", referenceGuideSchema);
