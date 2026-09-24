/**
 * Puts a backup taken by scripts/backupDb.js back into the database.
 *
 *   node scripts/restoreDb.js <folder>                      # report only
 *   node scripts/restoreDb.js <folder> --apply              # insert what's missing
 *   node scripts/restoreDb.js <folder> --apply --replace    # wipe each collection first
 *
 * Default is additive: documents whose _id already exists are left alone, so
 * running this on a live database can't quietly overwrite newer data.
 * --replace is the "I want exactly this backup back" switch, and it says
 * out loud what it is about to delete.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const folder = process.argv[2];
const APPLY = process.argv.includes("--apply");
const REPLACE = process.argv.includes("--replace");

(async () => {
  if (!folder || folder.startsWith("--")) throw new Error("Which backup folder? e.g. node scripts/restoreDb.js backups/2026-09-24T12-00");
  if (!fs.existsSync(folder)) throw new Error(`Folder not found: ${folder}`);
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing - run this from the server folder");

  const files = fs.readdirSync(folder).filter((f) => f.endsWith(".json") && f !== "_backup.json");
  if (!files.length) throw new Error("No collection files in that folder");

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  console.log(`\nRestoring into "${db.databaseName}". Mode: ${APPLY ? (REPLACE ? "APPLY + REPLACE" : "APPLY (additive)") : "REPORT ONLY"}\n`);

  for (const file of files) {
    const name = file.replace(/\.json$/, "");
    const docs = JSON.parse(fs.readFileSync(path.join(folder, file), "utf8"));
    const live = await db.collection(name).countDocuments();

    if (!APPLY) {
      console.log(`  ${name.padEnd(22)} backup ${String(docs.length).padStart(5)}   currently in db ${live}`);
      continue;
    }

    if (REPLACE) {
      await db.collection(name).deleteMany({});
      console.log(`  ${name.padEnd(22)} cleared ${live}`);
    }

    if (!docs.length) continue;

    // Dates and ObjectIds come back from JSON as plain strings; hand them to
    // the driver as they were so queries and references keep working.
    const revived = docs.map((doc) => JSON.parse(JSON.stringify(doc), reviver));

    let inserted = 0;
    let skipped = 0;
    for (const doc of revived) {
      try {
        await db.collection(name).insertOne(doc);
        inserted++;
      } catch (err) {
        if (err.code === 11000) skipped++; // already there - additive restores leave it
        else throw err;
      }
    }
    console.log(`  ${name.padEnd(22)} inserted ${inserted}${skipped ? `, left alone ${skipped}` : ""}`);
  }

  if (!APPLY) console.log("\nNothing was changed. Add --apply to restore.\n");
  else console.log("\nRestore finished.\n");

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Restore failed:", err.message);
  process.exit(1);
});

const OBJECT_ID = /^[0-9a-f]{24}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function reviver(key, value) {
  if (typeof value !== "string") return value;
  if ((key === "_id" || key.endsWith("Id") || OBJECT_ID.test(value)) && OBJECT_ID.test(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  if (ISO_DATE.test(value)) return new Date(value);
  return value;
}
