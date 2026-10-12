const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");
const { refreshesUserItself } = require("../utils/appVersion");

// Verifies the JWT AND that it's still the most recent one issued for this
// user. Every login (password or OTP) generates a fresh
// activeSessionId and embeds it in the token; if a newer login has
// happened since this token was issued, the value here won't match
// anymore and the request is rejected - this is the single-device
// enforcement, checked on every authenticated request.
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Session expired, please log in again", code: "TOKEN_INVALID" });
    }

    const user = await User.findById(decoded.id).select("+activeSessionId");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // "Log out that device" has to actually lock the door, not just hide a
    // row in a list - so a revoked session's token stops working here, on
    // its very next request. Tokens issued before sessions existed carry no
    // sid and keep working until they expire.
    if (decoded.sid) {
      const session = await Session.findById(decoded.sid).select("revokedAt lastSeenAt");
      if (!session || session.revokedAt) {
        // Sent as TOKEN_INVALID because that is the code every installed
        // app already acts on - it clears the session and opens the sign-in
        // screen. SESSION_REVOKED alone was ignored by the app, which then
        // failed every request and showed empty screens instead.
        return res.status(401).json({
          message: "You have been signed out on this device. Please sign in again.",
          code: "TOKEN_INVALID",
          reason: "SESSION_REVOKED",
        });
      }

      // "Last active" is only useful to the minute, and writing it on every
      // single request would double the database traffic of the whole app.
      if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
        Session.updateOne({ _id: session._id }, { lastSeenAt: new Date() }).catch(() => {});
      }
      req.sessionId = String(session._id);
    }

    // Single-device enforcement applies to student accounts only - an admin
    // legitimately working from the admin panel and, say, checking the
    // mobile app shouldn't get logged out of one by the other.
    if (user.role !== "admin" && (!user.activeSessionId || decoded.sessionId !== user.activeSessionId)) {
      return res.status(401).json({
        message: "You've been logged out because your account was signed in on another device",
        code: "SESSION_REPLACED",
      });
    }

    // An admin changed this student's plan after this token was issued.
    // Apps before 1.2.0 hold the plan they saw at sign-in and never ask for
    // it again, so the new plan only reaches them through a fresh sign-in -
    // TOKEN_INVALID is what makes them go there. 1.2.0+ re-reads the user
    // itself and is left signed in.
    if (
      user.role !== "admin" &&
      user.planChangedAt &&
      // iat is whole seconds: a sign-in in the same second as the change
      // counts as after it, or re-signing-in right away would bounce too.
      decoded.iat < Math.floor(user.planChangedAt.getTime() / 1000) &&
      !refreshesUserItself(req)
    ) {
      return res.status(401).json({
        message: "Your plan has been updated. Please sign in again to see it.",
        code: "TOKEN_INVALID",
        reason: "PLAN_CHANGED",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Not authorized" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

module.exports = { protect, adminOnly };