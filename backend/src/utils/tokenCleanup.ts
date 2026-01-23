import mongoose from "mongoose";
import { TokenService } from "./tokenService";

/**
 * Token cleanup maintenance script
 * Should be run periodically (e.g., daily via cron job)
 */
export const runTokenCleanup = async (): Promise<{
    deletedCount: number;
    usersProcessed: number;
}> => {
    console.log("Starting token cleanup...");

    try {
        const result = await TokenService.cleanupExpiredTokens();
        console.log("✅ Token cleanup completed successfully");
        return result;
    } catch (error) {
        console.error("❌ Token cleanup failed:", error);
        throw error;
    }
};

// If this script is run directly
if (require.main === module) {
    (async () => {
        try {
            // Connect to database
            const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/Auth-Project";
            await mongoose.connect(mongoUri, {
                maxPoolSize: 5,
                minPoolSize: 1,
            });
            console.log("✅ Connected to MongoDB");

            // Run cleanup
            await runTokenCleanup();

            // Close connection
            await mongoose.connection.close();
            process.exit(0);
        } catch (error) {
            console.error("Cleanup script failed:", error);
            await mongoose.connection.close();
            process.exit(1);
        }
    })();
}
