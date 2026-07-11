// Run once to set up initial exam patterns and the first admin account:
//   node scripts/seedExamPatterns.js

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const ExamPattern = require("../models/ExamPattern");
const User = require("../models/User");

const PATTERNS = [
  {
    examType: "SSC_CGL",
    displayName: "SSC CGL Tier 1",
    durationMinutes: 60,
    negativeMarking: 0.5,
    sections: [
      { subject: "Maths", questionCount: 25, difficultyMix: { easy: 30, medium: 50, hard: 20 } },
      { subject: "Reasoning", questionCount: 25, difficultyMix: { easy: 30, medium: 50, hard: 20 } },
      { subject: "English", questionCount: 25, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
      { subject: "GK", questionCount: 25, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
    ],
  },
  {
    examType: "UP_POLICE",
    displayName: "UP Police Constable",
    durationMinutes: 120,
    negativeMarking: 0,
    sections: [
      { subject: "GK", questionCount: 38, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
      { subject: "Reasoning", questionCount: 38, difficultyMix: { easy: 30, medium: 50, hard: 20 } },
      { subject: "Maths", questionCount: 38, difficultyMix: { easy: 30, medium: 50, hard: 20 } },
      { subject: "General Hindi", questionCount: 37, difficultyMix: { easy: 50, medium: 35, hard: 15 } },
    ],
  },
  {
    examType: "RAILWAY",
    displayName: "RRB NTPC CBT 1",
    durationMinutes: 90,
    negativeMarking: 0.33,
    sections: [
      { subject: "Maths", questionCount: 30, difficultyMix: { easy: 30, medium: 50, hard: 20 } },
      { subject: "Reasoning", questionCount: 30, difficultyMix: { easy: 30, medium: 50, hard: 20 } },
      { subject: "GK", questionCount: 40, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
    ],
  },
  {
    examType: "BANKING",
    displayName: "IBPS PO Prelims",
    durationMinutes: 60,
    negativeMarking: 0.25,
    sections: [
      { subject: "Reasoning", questionCount: 35, difficultyMix: { easy: 20, medium: 50, hard: 30 } },
      { subject: "Quant", questionCount: 35, difficultyMix: { easy: 20, medium: 50, hard: 30 } },
      { subject: "English", questionCount: 30, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
    ],
  },
  {
    examType: "CTET",
    displayName: "CTET Paper 1",
    durationMinutes: 150,
    negativeMarking: 0,
    sections: [
      { subject: "Child Development", questionCount: 30, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
      { subject: "Hindi Pedagogy", questionCount: 30, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
      { subject: "English Pedagogy", questionCount: 30, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
      { subject: "Maths", questionCount: 30, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
      { subject: "EVS", questionCount: 30, difficultyMix: { easy: 40, medium: 40, hard: 20 } },
    ],
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding exam patterns...");

  for (const p of PATTERNS) {
    await ExamPattern.findOneAndUpdate({ examType: p.examType }, p, { upsert: true });
    console.log(`  - ${p.displayName} ready`);
  }

  // Create first admin user if one doesn't already exist
  const adminPhone = process.env.FIRST_ADMIN_PHONE;
  const adminPassword = process.env.FIRST_ADMIN_PASSWORD;
  if (adminPhone && adminPassword) {
    const existing = await User.findOne({ phone: adminPhone });
    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: "Admin",
        phone: adminPhone,
        passwordHash,
        role: "admin",
      });
      console.log(`  - Admin account created for ${adminPhone}`);
    } else {
      console.log(`  - Admin account already exists for ${adminPhone}`);
    }
  }

  console.log("\nSeeding complete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
