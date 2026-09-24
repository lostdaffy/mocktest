const mongoose = require("mongoose");

// One row per sign-in, so an account holder can SEE where they are logged in
// and end a session they don't recognise.
//
// Students are still limited to one device at a time (activeSessionId on the
// User document does that). Admins are deliberately not - an admin works
// from a laptop and checks things on a phone - which is exactly why the
// admin panel needs this list: without it, an admin session left open on
// someone else's machine would be invisible and impossible to end.
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Matches the `sid` carried inside the JWT. Rejecting a token whose
    // session is revoked is what makes "log out that device" actually take
    // effect instead of just hiding a row.
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String },

    // Whatever the client tells us about itself. Only ever shown back to the
    // account's own owner, never to anyone else.
    userAgent: { type: String },
    ip: { type: String },

    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Old, revoked sessions are history nobody needs after a while.
sessionSchema.index({ revokedAt: 1, updatedAt: 1 });

module.exports = mongoose.model("Session", sessionSchema);
