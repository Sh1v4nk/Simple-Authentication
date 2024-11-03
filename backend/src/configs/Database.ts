import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function connectDB(): Promise<void> {
  try {
    mongoose.set("strictQuery", true);
    const mongoUri: string =
      process.env.MONGO_URI || "mongodb://localhost:27017/Auth-Project";

    await mongoose.connect(mongoUri);
    console.log("🥳 Connected to MongoDB successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("😕 Error connecting to MongoDB:", error.message);
    } else {
      console.error("😕 An unexpected error occurred:", error);
    }
    process.exit(1);
  }
}

export default connectDB;
