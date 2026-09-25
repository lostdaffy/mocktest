/**
 * Brings the database's indexes in line with what the models declare.
 *
 *   node scripts/syncIndexes.js            # show what differs
 *   node scripts/syncIndexes.js --apply    # create the missing ones, drop the obsolete ones
 *
 * Mongoose builds new indexes on its own at startup, but it never removes
 * one that a model no longer declares, and if a build fails (a unique index
 * on a field that already has duplicates) it fails quietly in the
 * background. Running this deliberately means the failure is on screen,
 * with the duplicate rows named, instead of being discovered months later
 * as a slow query or a double payment.
 *
 * Safe to run against the live database: index changes don't touch documents.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");

(async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing - run this from the server folder");

  // Off, so that simply loading the models here doesn't start building the
  // very indexes this run is supposed to report on.
  mongoose.set("autoIndex", false);

  // Load every model so mongoose knows the full set of declared indexes.
  const modelsDir = path.join(__dirname, "..", "models");
  for (const file of fs.readdirSync(modelsDir).filter((f) => f.endsWith(".js"))) {
    require(path.join(modelsDir, file));
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`\nDatabase: ${mongoose.connection.db.databaseName}   Mode: ${APPLY ? "APPLY" : "REPORT ONLY"}\n`);

  let created = 0;
  let dropped = 0;
  let failed = 0;

  for (const name of mongoose.modelNames()) {
    const Model = mongoose.model(name);
    const declared = Model.schema.indexes().map(([keys, options]) => ({ key: JSON.stringify(keys), options }));

    let existing = [];
    try {
      existing = await Model.collection.indexes();
    } catch (_) {
      // collection doesn't exist yet - everything is "missing", which is fine
    }
    const live = existing.filter((i) => i.name !== "_id_");
    const existingKeys = live.map((i) => JSON.stringify(i.key));

    const missing = declared.filter((d) => !existingKeys.includes(d.key)).map((d) => d.key);
    const obsolete = existingKeys.filter((e) => !declared.some((d) => d.key === e));

    // Same fields, different rules. This is the one that hides: an index that
    // is unique but not sparse still looks present and still enforces
    // uniqueness, so nothing complains - right up until a second document
    // without that field is rejected for a duplicate it doesn't have.
    // Comparing keys alone reported these as "up to date", which is how a
    // real mismatch on users.phone sat unnoticed.
    const wrongOptions = [];
    for (const d of declared) {
      const found = live.find((i) => JSON.stringify(i.key) === d.key);
      if (!found) continue;
      for (const opt of ["unique", "sparse", "expireAfterSeconds", "partialFilterExpression"]) {
        const want = d.options?.[opt] ?? false;
        const have = found[opt] ?? false;
        if (JSON.stringify(want) !== JSON.stringify(have)) {
          wrongOptions.push(`${d.key}  ${opt}: database has ${JSON.stringify(have)}, model wants ${JSON.stringify(want)}`);
        }
      }
    }

    if (!missing.length && !obsolete.length && !wrongOptions.length) {
      console.log(`  ${name.padEnd(16)} up to date (${existingKeys.length} index${existingKeys.length === 1 ? "" : "es"})`);
      continue;
    }

    console.log(`  ${name}`);
    missing.forEach((m) => console.log(`      missing   ${m}`));
    obsolete.forEach((o) => console.log(`      obsolete  ${o}`));
    wrongOptions.forEach((w) => console.log(`      wrong     ${w}`));

    if (!APPLY) continue;

    try {
      const diff = await Model.syncIndexes();
      created += missing.length;
      dropped += Array.isArray(diff) ? diff.length : 0;
      console.log(`      -> synced`);
    } catch (err) {
      failed++;
      console.log(`      -> FAILED: ${err.message}`);
      if (err.code === 11000) {
        console.log(`         A unique index can't be built while duplicates exist.`);
        console.log(`         Clear the duplicate rows shown above, then run this again.`);
      }
    }
  }

  if (!APPLY) console.log("\nNothing was changed. Add --apply to sync.\n");
  else console.log(`\nDone. ${created} created, ${dropped} dropped${failed ? `, ${failed} failed` : ""}.\n`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error("Index sync failed:", err.message);
  process.exit(1);
});
