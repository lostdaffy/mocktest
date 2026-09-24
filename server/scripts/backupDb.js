/**
 * Writes every collection to JSON files on this machine.
 *
 *   node scripts/backupDb.js                 # -> server/backups/<date>/
 *   node scripts/backupDb.js --out "D:/my/folder"
 *
 * MongoDB Atlas's free tier takes no automatic backups: if the data goes,
 * it is gone. Until the cluster is on a paid plan, this is the backup.
 * Run it before anything that rewrites data in bulk, and on a routine you
 * can actually keep (a weekly reminder beats a perfect plan nobody runs).
 *
 * Restoring is deliberately manual - see scripts/restoreDb.js.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const outFlag = process.argv.find((a) => a.startsWith("--out"));
const outArg = outFlag ? (outFlag.includes("=") ? outFlag.split("=")[1] : process.argv[process.argv.indexOf(outFlag) + 1]) : null;
// Stamped in IST, like everything else in this app. In UTC a backup taken at
// 1am on the 25th lands in a folder named the 24th, and the one time you are
// restoring in a hurry is the worst time to work that out.
const stamp = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  .toISOString()
  .replace(/[:.]/g, "-")
  .slice(0, 16)
  .replace("T", "_");
const OUT = outArg || path.join(__dirname, "..", "backups", stamp);

(async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing - run this from the server folder");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  fs.mkdirSync(OUT, { recursive: true });
  const names = (await db.listCollections().toArray()).map((c) => c.name).sort();

  let total = 0;
  const summary = {};
  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(docs, null, 1));
    summary[name] = docs.length;
    total += docs.length;
    console.log(`  ${name.padEnd(22)} ${docs.length}`);
  }

  fs.writeFileSync(
    path.join(OUT, "_backup.json"),
    JSON.stringify({ takenAt: new Date(), database: db.databaseName, collections: summary, totalDocuments: total }, null, 2)
  );

  console.log(`\n${total} documents saved to:\n${OUT}\n`);
  console.log("Keep a copy somewhere that isn't this laptop - a backup that lives");
  console.log("on the same machine as nothing else is only half a backup.\n");

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
