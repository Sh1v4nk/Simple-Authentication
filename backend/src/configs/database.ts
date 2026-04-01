import mongoose from "mongoose";
import { logger } from "@/configs/logger";
import { getEnv } from "@/configs/env";

let connectionPromise: Promise<typeof mongoose> | null = null;
let listenersAttached = false;

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);
mongoose.set("autoIndex", false);

const MONGO_OPTIONS: mongoose.ConnectOptions = {
    maxPoolSize: 5,
    minPoolSize: 1,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    family: 4,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 5000,
};

export async function connectDB(): Promise<typeof mongoose> {
    const state = mongoose.connection.readyState;

    if (state === 1) {
        return mongoose;
    }

    if (state === 2 && connectionPromise) {
        return connectionPromise;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = (async () => {
        try {
            const { MONGO_URI } = getEnv();
            await mongoose.connect(MONGO_URI, MONGO_OPTIONS);

            if (!listenersAttached) {
                mongoose.connection.on("error", (err) => {
                    logger.error({ err }, "[DB] Connection error");
                });

                mongoose.connection.on("disconnected", () => {
                    logger.warn("[DB] Disconnected");
                });

                mongoose.connection.on("reconnected", () => {
                    logger.info("[DB] Reconnected");
                });

                listenersAttached = true;
            }

            logger.info("[DB] Connected");

            return mongoose;
        } catch (error) {
            logger.error({ err: error }, "[DB] Connection failed");
            throw error;
        } finally {
            connectionPromise = null;
        }
    })();

    return connectionPromise;
}

export async function disconnectDB(): Promise<void> {
    const state = mongoose.connection.readyState;

    if (state === 0) return;

    try {
        await mongoose.connection.close(false);
        logger.info("[DB] Disconnected manually");
    } catch (error) {
        logger.error({ err: error }, "[DB] Disconnect failed");
        throw error;
    }
}

export function resetConnectionState(): void {
    connectionPromise = null;
    listenersAttached = false;
}

export default connectDB;
