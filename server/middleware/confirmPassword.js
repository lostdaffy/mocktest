const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { audit } = require("../services/audit");

// Step-up check for actions that move money (plan prices and lengths). A
// stolen admin token alone is not enough: the request must also carry the
// admin's own password in the X-Confirm-Password header. Five wrong tries
// lock the confirmation for 15 minutes for that admin, whatever the IP, and
// every failure is written to the audit log.
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const state = new Map(); // adminId -> { fails, lockedUntil }

async function requireConfirmPassword(req, res, next) {
  const id = String(req.user?._id || "");
  const s = state.get(id) || { fails: 0, lockedUntil: 0 };

  if (s.lockedUntil > Date.now()) {
    const mins = Math.ceil((s.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({ message: `Too many wrong passwords. Try again in ${mins} minute(s).`, code: "CONFIRM_LOCKED" });
  }

  const given = req.headers["x-confirm-password"];
  if (!given || typeof given !== "string" || given.length > 200) {
    return res.status(403).json({ message: "Enter your admin password to confirm this change.", code: "CONFIRM_REQUIRED" });
  }

  const me = await User.findById(req.user._id).select("+passwordHash");
  const ok = !!me?.passwordHash && (await bcrypt.compare(given, me.passwordHash));

  if (!ok) {
    s.fails += 1;
    if (s.fails >= MAX_FAILS) {
      s.lockedUntil = Date.now() + LOCK_MS;
      s.fails = 0;
    }
    state.set(id, s);
    await audit(req, "auth.confirm_failed", { target: req.originalUrl, ok: false });
    return res.status(403).json({ message: "That password is not correct.", code: "CONFIRM_WRONG" });
  }

  state.delete(id);
  next();
}

module.exports = { requireConfirmPassword };
