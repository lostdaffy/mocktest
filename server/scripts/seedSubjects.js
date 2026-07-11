// Seeds the master subject -> chapter -> topics catalog used by the
// subject-first navigation and chapter-wise adaptive tests.
// Run: node scripts/seedSubjects.js

require("dotenv").config();
const mongoose = require("mongoose");
const Subject = require("../models/Subject");

const SUBJECTS = [
  {
    name: "Maths",
    nameHi: "गणित",
    icon: "🔢",
    displayOrder: 1,
    chapters: [
      { name: "Percentage", nameHi: "प्रतिशत", topics: ["Percentage"] },
      { name: "Profit and Loss", nameHi: "लाभ और हानि", topics: ["Profit and Loss"] },
      { name: "Ratio and Proportion", nameHi: "अनुपात और समानुपात", topics: ["Ratio and Proportion"] },
      { name: "Time and Work", nameHi: "समय और कार्य", topics: ["Time and Work"] },
      { name: "Time Speed Distance", nameHi: "समय चाल दूरी", topics: ["Time Speed Distance"] },
      { name: "Average", nameHi: "औसत", topics: ["Average"] },
      { name: "Simple and Compound Interest", nameHi: "साधारण और चक्रवृद्धि ब्याज", topics: ["Simple Interest", "Compound Interest"] },
      { name: "Number System", nameHi: "संख्या प्रणाली", topics: ["Number System"] },
    ],
  },
  {
    name: "Reasoning",
    nameHi: "तर्कशक्ति",
    icon: "🧩",
    displayOrder: 2,
    chapters: [
      { name: "Blood Relation", nameHi: "रक्त संबंध", topics: ["Blood Relation"] },
      { name: "Number Series", nameHi: "संख्या श्रृंखला", topics: ["Number Series"] },
      { name: "Coding Decoding", nameHi: "कोडिंग डिकोडिंग", topics: ["Coding Decoding"] },
      { name: "Syllogism", nameHi: "न्याय निगमन", topics: ["Syllogism"] },
      { name: "Direction Sense", nameHi: "दिशा ज्ञान", topics: ["Direction Sense"] },
      { name: "Analogy", nameHi: "सादृश्यता", topics: ["Analogy"] },
      { name: "Seating Arrangement", nameHi: "बैठक व्यवस्था", topics: ["Seating Arrangement"] },
    ],
  },
  {
    name: "English",
    nameHi: "अंग्रेज़ी",
    icon: "📖",
    displayOrder: 3,
    chapters: [
      { name: "Reading Comprehension", topics: ["Reading Comprehension"] },
      { name: "Grammar", topics: ["Grammar"] },
      { name: "Vocabulary", topics: ["Vocabulary"] },
      { name: "Error Spotting", topics: ["Error Spotting"] },
      { name: "Fill in the Blanks", topics: ["Fill in the Blanks"] },
    ],
  },
  {
    name: "General Hindi",
    nameHi: "सामान्य हिंदी",
    icon: "✍️",
    displayOrder: 4,
    chapters: [
      { name: "Vyakaran", nameHi: "व्याकरण", topics: ["Hindi Grammar"] },
      { name: "Samas", nameHi: "समास", topics: ["Samas"] },
      { name: "Sandhi", nameHi: "संधि", topics: ["Sandhi"] },
      { name: "Muhavare", nameHi: "मुहावरे", topics: ["Muhavare"] },
    ],
  },
  {
    name: "GK",
    nameHi: "सामान्य ज्ञान",
    icon: "🌍",
    displayOrder: 5,
    chapters: [
      { name: "Indian History", nameHi: "भारतीय इतिहास", topics: ["Static GK - Indian History"] },
      { name: "Indian Polity", nameHi: "भारतीय राजव्यवस्था", topics: ["Indian Polity"] },
      { name: "Geography", nameHi: "भूगोल", topics: ["Geography"] },
      { name: "General Science", nameHi: "सामान्य विज्ञान", topics: ["General Science"] },
      { name: "Economics", nameHi: "अर्थशास्त्र", topics: ["Economics"] },
    ],
  },
  {
    name: "Current Affairs",
    nameHi: "समसामयिकी",
    icon: "📰",
    displayOrder: 6,
    chapters: [
      { name: "National Affairs", topics: ["National Current Affairs"] },
      { name: "International Affairs", topics: ["International Current Affairs"] },
      { name: "Sports", topics: ["Sports Current Affairs"] },
      { name: "Awards and Honours", topics: ["Awards and Honours"] },
    ],
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding subjects...");

  for (const s of SUBJECTS) {
    await Subject.findOneAndUpdate({ name: s.name }, s, { upsert: true });
    console.log(`  - ${s.name} (${s.chapters.length} chapters)`);
  }

  console.log("\nSubjects seeded successfully.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});