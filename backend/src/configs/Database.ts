import mongoose from "mongoose";
import { logger } from "@/utils/logger";

async function connectDB(): Promise<void> {
    try {
        mongoose.set("strictQuery", true);
        mongoose.set("bufferCommands", false);
        mongoose.set("autoIndex", false);

        const mongoUri = process.env.MONGO_URI!;

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

        mongoose.connection.removeAllListeners("error");
        mongoose.connection.removeAllListeners("disconnected");
        mongoose.connection.removeAllListeners("reconnected");

        mongoose.connection.on("error", (err) => {
            logger.error({ err }, "[DB] Connection error");
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("[DB] Disconnected");
        });

        mongoose.connection.on("reconnected", () => {
            logger.info("[DB] Reconnected");
        });

        logger.info("[DB] Connected");
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error({ err: error }, "[DB] Connection failed");
        } else {
            logger.error({ err: error }, "[DB] Unexpected connection failure");
        }
        process.exit(1);
    }
}

export default connectDB;
