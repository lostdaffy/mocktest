const mongoose = require("mongoose");

// Append-only record of sensitive admin actions (plan changes so far). Rows
// are only ever created by services/audit.js; nothing in the API updates or
// deletes them, so a compromised admin session can change a price but not
// quietly erase the trace of having done it.
const adminAuditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    actorName: String,
    action: { type: String, required: true, index: true }, // plan.create, plan.update, plan.archive, plan.delete, auth.confirm_failed ...
    target: String, // e.g. the plan key
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    ok: { type: Boolean, default: true },
    note: String,
  },
  { timestamps: { createdAt: "at", updatedAt: false } }
);

module.exports = mongoose.model("AdminAudit", adminAuditSchema);
