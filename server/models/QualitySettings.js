const mongoose = require("mongoose");

// How the AI quality desk acts on what it finds (one row).
//
//   approval - it proposes; the admin applies or dismisses each proposal
//   auto     - it applies its own proposals, and records each one
//
// Approval is the default: nothing in a published question changes until the
// admin has chosen to let the AI change it.
const qualitySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "quality", unique: true },
    mode: { type: String, enum: ["approval", "auto"], default: "approval" },
    // Check every row of a practice spreadsheet with the AI after it is saved.
    checkCsvUploads: { type: Boolean, default: true },
    // The whole-bank audit: where it has got to, so it carries on after a
    // pause or a spent allowance instead of starting again.
    auditCursor: { type: mongoose.Schema.Types.ObjectId },
    auditStartedAt: Date,
    auditFinishedAt: Date,
    auditChecked: { type: Number, default: 0 },
  },
  { timestamps: true }
);

qualitySettingsSchema.statics.get = async function () {
  return (await this.findOne({ key: "quality" })) || this.create({ key: "quality" });
};

module.exports = mongoose.model("QualitySettings", qualitySettingsSchema);
