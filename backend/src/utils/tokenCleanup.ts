import { TokenService } from "@/utils/helpers/tokenService";

/**
 * Token cleanup maintenance script
 * Should be run periodically (e.g., daily via cron job)
 */
export const runTokenCleanup = async (): Promise<{ deletedCount: number; usersProcessed: number }> => {
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
    runTokenCleanup()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error("Cleanup script failed:", error);
            process.exit(1);
        });
}
