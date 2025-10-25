// configs/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const url = `${process.env.MONGODB_URL}/pingup`;

    console.log("🟡 Connecting to MongoDB...");
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Increase timeout to 30 seconds
      socketTimeoutMS: 10000, // Socket timeout
      connectTimeoutMS: 10000, // Connection timeout
      maxPoolSize: 50
    });

    mongoose.connection.on('connected', () => {
      console.log("🟢 MongoDB connected successfully");
    });

    mongoose.connection.on('error', (err) => {
      console.error("🔴 MongoDB connection error:", err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log("🟡 MongoDB disconnected");
    });

  } catch (error) {
    console.error("🔴 MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;