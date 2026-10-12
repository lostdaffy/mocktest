const mongoose = require("mongoose");

// The picture for a figure question, stored in the database itself.
//
// The admin panel shrinks it before upload (longest side 1200px, WebP or
// JPEG), so a figure is tens of kilobytes. Kept in its own collection so that
// reading questions - which happens constantly - never drags image bytes
// along. Served by GET /api/question-images/:id with a long cache: a new
// upload is a new document with a new id, so a cached copy is never stale.
const questionImageSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", index: true },
    mime: { type: String, enum: ["image/png", "image/jpeg", "image/webp"], required: true },
    data: { type: Buffer, required: true },
    bytes: { type: Number, required: true },
    width: Number,
    height: Number,
    uploadedBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionImage", questionImageSchema);
