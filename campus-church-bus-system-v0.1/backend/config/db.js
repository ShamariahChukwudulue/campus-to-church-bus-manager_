const mongoose = require("mongoose");

let mongoMemoryServer = null;

/**
 * Connect to MongoDB database.
 * Tries the MONGODB_URI first. If local MongoDB is unavailable (e.g., ECONNREFUSED in development),
 * it seamlessly initializes an in-memory MongoDB server so testing and local development work out of the box.
 */
const connectDB = async () => {
  const uri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campus_church_bus";

  try {
    // Attempt standard connection with 3-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[MongoDB] Connected successfully to database at ${uri}`);
  } catch (err) {
    console.warn(`[MongoDB] Unable to connect to ${uri} (${err.message}).`);

    // In development/test mode, fall back to MongoMemoryServer
    if (process.env.NODE_ENV !== "production") {
      try {
        console.log(
          "[MongoDB] Starting embedded MongoDB Memory Server for seamless local execution...",
        );
        const { MongoMemoryServer } = require("mongodb-memory-server");
        mongoMemoryServer = await MongoMemoryServer.create();
        const memUri = mongoMemoryServer.getUri();
        await mongoose.connect(memUri);
        console.log(
          `[MongoDB] Connected to embedded Memory Server at ${memUri}`,
        );
      } catch (memErr) {
        console.error(
          "[MongoDB] Fatal error initializing embedded database:",
          memErr.message,
        );
        throw memErr;
      }
    } else {
      throw err;
    }
  }
};

/**
 * Disconnect from MongoDB and stop memory server if running.
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log("[MongoDB] Disconnected successfully");
  } catch (err) {
    console.error("[MongoDB] Disconnection error:", err.message);
  }
};

module.exports = { connectDB, disconnectDB };
