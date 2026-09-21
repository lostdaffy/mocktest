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

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected - Mongoose will attempt to reconnect automatically");
  });
}

module.exports = connectDB;