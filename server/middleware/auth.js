const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies a student/user JWT token, attaches req.user
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
}

// Restricts a route to admin role only (still uses same User model + JWT,
// role field decides access)
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Checks whether the logged-in user has an active paid subscription.
// Use on routes that should be premium-only (e.g. unlimited mocks, full PYQ bank).
function requireActiveSubscription(req, res, next) {
  const isActive =
    req.user.subscriptionStatus === "active" &&
    req.user.subscriptionExpiresAt &&
    new Date(req.user.subscriptionExpiresAt) > new Date();

  if (!isActive) {
    return res.status(402).json({
      message: "This feature needs an active subscription",
      code: "SUBSCRIPTION_REQUIRED",
    });
  }
  next();
}

module.exports = { protect, adminOnly, requireActiveSubscription };
