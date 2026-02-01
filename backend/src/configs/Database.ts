import mongoose from "mongoose";

async function connectDB(): Promise<void> {
    try {
        mongoose.set("strictQuery", true);
        mongoose.set("bufferCommands", false);
        mongoose.set("bufferTimeoutMS", 0);
        mongoose.set("autoIndex", false);
        mongoose.set("maxTimeMS", 10000);

        const mongoUri: string = process.env.MONGO_URI || "mongodb://localhost:27017/Auth-Project";

        await mongoose.connect(mongoUri, {
            maxPoolSize: 3,
            minPoolSize: 1,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            family: 4,
            maxIdleTimeMS: 30000,
            waitQueueTimeoutMS: 5000,
            compressors: ["zlib"],
        });

        await mongoose.connection.asPromise();

        mongoose.connection.removeAllListeners("error");
        mongoose.connection.removeAllListeners("disconnected");
        mongoose.connection.removeAllListeners("reconnected");

        mongoose.connection.once("error", (err) => {
            console.error("MongoDB connection error:", err);
        });

        mongoose.connection.once("disconnected", () => {
            console.log("MongoDB disconnected - cleaning up");
        });

        mongoose.connection.once("reconnected", () => {
            console.log("MongoDB reconnected");
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
