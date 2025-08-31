import { TokenService } from "@/utils/helpers";

/**
 * Token cleanup maintenance script
 * Should be run periodically (e.g., daily via cron job)
 */
export const runTokenCleanup = async (): Promise<void> => {
    console.log("Starting token cleanup...");

    try {
        await TokenService.cleanupExpiredTokens();
        console.log("✅ Token cleanup completed successfully");
    } catch (error) {
        console.error("❌ Token cleanup failed:", error);
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
