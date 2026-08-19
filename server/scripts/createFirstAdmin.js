// Recreates the admin account from FIRST_ADMIN_PHONE / FIRST_ADMIN_PASSWORD
// in .env - use this when the admin account has been deleted (e.g.
// accidentally removed directly in Atlas) rather than just needing a
// password reset.
//
// Safe to run more than once: if an admin with that phone already exists,
// it does nothing rather than creating a duplicate.
//
// Usage (from the server/ folder):
//   node scripts/createFirstAdmin.js

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function main() {
  const phone = process.env.FIRST_ADMIN_PHONE;
  const password = process.env.FIRST_ADMIN_PASSWORD;

  if (!phone || !password) {
    console.error("FIRST_ADMIN_PHONE and FIRST_ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ phone });
  if (existing) {
    if (existing.role === "admin") {
      console.log(`Admin already exists for ${phone} (${existing.name}) - nothing to do. Use resetAdminPassword.js if you need to change the password instead.`);
    } else {
      console.error(`A non-admin account already exists with phone ${phone} - refusing to overwrite it. Pick a different FIRST_ADMIN_PHONE or handle this account manually.`);
    }
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.create({
    name: "Admin",
    phone,
    passwordHash,
    authProvider: "password",
    role: "admin",
    referralCode: `ADMIN${Date.now().toString(36).toUpperCase()}`,
  });

  console.log(`Admin account created for ${admin.phone}. You can log in now with the password from FIRST_ADMIN_PASSWORD.`);
  console.log(`Consider changing FIRST_ADMIN_PASSWORD in .env to something you'll actually remember, and updating the account's password (resetAdminPassword.js) to match, since that .env value is now the account's real password.`);
  process.exit(0);
}



main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});