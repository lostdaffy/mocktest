const AdminAudit = require("../models/AdminAudit");

// Never throws: failing to write the log must not break (or silently block)
// the action, but it is shouted about in the server log.
async function audit(req, action, { target, before, after, ok = true, note } = {}) {
  try {
    await AdminAudit.create({
      actor: req.user?._id,
      actorName: req.user?.name || req.user?.phone,
      action,
      target,
      before,
      after,
      ok,
      note,
      ip: req.ip,
      userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
    });
  } catch (err) {
    console.error("AUDIT WRITE FAILED", action, target, err.message);
  }
}

module.exports = { audit };
