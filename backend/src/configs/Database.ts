import mongoose from "mongoose";

async function connectDB(): Promise<void> {
    try {
        // Disable command buffering for fail-fast behavior in production
        mongoose.set("strictQuery", true);
        mongoose.set("bufferCommands", false);
        mongoose.set("bufferTimeoutMS", 0);

        const mongoUri: string = process.env.MONGO_URI || "mongodb://localhost:27017/Auth-Project";

        await mongoose.connect(mongoUri, {
            maxPoolSize: 5,
            minPoolSize: 1,
        });
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
