const mongoose = require("mongoose");


async function connectDB() {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 50, // concurrent connections this server instance can use
      minPoolSize: 5, // keep a few warm so the first requests after idle aren't slow
      serverSelectionTimeoutMS: 8000, // fail fast if Atlas is unreachable, don't hang
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }

  // Mongoose builds any missing index in the background at startup. When one
  // fails - a unique index on a field that already holds duplicates is the
  // usual cause - it does so silently, and the app keeps running without it.
  // That is how a "unique" constraint turns out never to have existed. Say so
  // loudly; scripts/syncIndexes.js shows the offending rows.
  for (const name of mongoose.modelNames()) {
    mongoose.model(name).on("index", (err) => {
      if (err) console.error(`INDEX BUILD FAILED on ${name}: ${err.message}\n  Run: node scripts/syncIndexes.js`);
    });
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected - Mongoose will attempt to reconnect automatically");
  });
}

module.exports = connectDB;