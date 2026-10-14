const mongoose = require("mongoose");

// Home's "Question of the Day": one question a day, the same for everyone,
// and each student's answer to it (the first answer counts).

const questionOfDaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // IST day, "YYYY-MM-DD"
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  },
  { timestamps: true }
);

const qotdAnswerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    selectedIndex: { type: Number, required: true },
    correct: { type: Boolean, required: true },
  },
  { timestamps: true }
);
qotdAnswerSchema.index({ user: 1, date: 1 }, { unique: true });
qotdAnswerSchema.index({ date: 1 });

module.exports = {
  QuestionOfDay: mongoose.model("QuestionOfDay", questionOfDaySchema),
  QotdAnswer: mongoose.model("QotdAnswer", qotdAnswerSchema),
};
