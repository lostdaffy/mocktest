const bcrypt = require("bcryptjs");
const User = require("../models/User");

// GET /api/admin/users?phone=9876543210 (admin only)
async function searchUsers(req, res) {
  const { phone, name } = req.query;
  const filter = {};
  if (phone) filter.phone = { $regex: phone, $options: "i" };
  if (name) filter.name = { $regex: name, $options: "i" };

  const users = await User.find(filter)
    .select("name phone email subscriptionStatus subscriptionExpiresAt createdAt role")
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ users });
}

// PATCH /api/admin/users/:id/reset-password (admin only)
// Fallback for students who don't have an email on file for self-service reset.
async function adminResetPassword(req, res) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Naya password kam se kam 6 characters ka hona chahiye" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { passwordHash }, { new: true }).select("name phone");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: `Password reset ho gaya ${user.name} (${user.phone}) ke liye`, user });
  } catch (err) {
    res.status(500).json({ message: "Reset failed", error: err.message });
  }
}

module.exports = { searchUsers, adminResetPassword };