import mongoose from "mongoose";
import { TokenService } from "./tokenService";

export const runTokenCleanup = async (): Promise<{
    deletedCount: number;
    usersProcessed: number;
}> => {
    console.log("Starting token cleanup...");

    try {
        const result = await TokenService.cleanupExpiredTokens();

        if (global.gc) {
            const before = process.memoryUsage().heapUsed;
            global.gc();
            const after = process.memoryUsage().heapUsed;
            const freed = Math.round((before - after) / 1024 / 1024);
            console.log(`🗑️ Garbage collection freed ${freed}MB`);
        }

        return result;
    } catch (error) {
        console.error("❌ Token cleanup failed:", error);
        throw error;
    }
};

const isMainModule =
    import.meta.url.startsWith("file:") && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMainModule || import.meta.main) {
    (async () => {
        try {
            const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/Auth-Project";
            await mongoose.connect(mongoUri, {
                maxPoolSize: 5,
                minPoolSize: 1,
            });
            console.log("✅ Connected to MongoDB");

            await runTokenCleanup();

            await mongoose.connection.close();
            process.exit(0);
        } catch (error) {
            console.error("Cleanup script failed:", error);
            await mongoose.connection.close();
            process.exit(1);
        }
    })();
}
