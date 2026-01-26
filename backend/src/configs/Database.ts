import mongoose from "mongoose";

async function connectDB(): Promise<void> {
    try {
        mongoose.set("strictQuery", true);
        mongoose.set("bufferCommands", false);
        mongoose.set("bufferTimeoutMS", 0);

        const mongoUri: string = process.env.MONGO_URI || "mongodb://localhost:27017/Auth-Project";

        await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000, //45s
            serverSelectionTimeoutMS: 5000,
            family: 4,
            maxIdleTimeMS: 60000, // 60s
            waitQueueTimeoutMS: 5000,
        });

        mongoose.set("autoIndex", false);

        // Add connection error handler
        mongoose.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err);
        });

        mongoose.connection.on("disconnected", () => {
            console.log("MongoDB disconnected - cleaning up");
        });

        mongoose.connection.on("reconnected", () => {
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
