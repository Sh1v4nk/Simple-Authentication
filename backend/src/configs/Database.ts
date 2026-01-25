import mongoose from "mongoose";

async function connectDB(): Promise<void> {
    try {
        mongoose.set("strictQuery", true);
        mongoose.set("bufferCommands", false);
        mongoose.set("bufferTimeoutMS", 0);

        const mongoUri: string = process.env.MONGO_URI || "mongodb://localhost:27017/Auth-Project";

        await mongoose.connect(mongoUri, {
            maxPoolSize: 2,
            minPoolSize: 1,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 5000,
            family: 4, // Use IPv4
            maxIdleTimeMS: 10000, // Close idle connections after 10s
            waitQueueTimeoutMS: 5000, // Fail fast if pool is exhausted
        });

        mongoose.set("autoIndex", false); // Don't build indexes on every model compilation

        mongoose.connection.on("disconnected", () => {
            console.log("MongoDB disconnected - cleaning up");
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
