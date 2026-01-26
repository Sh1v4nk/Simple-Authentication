import mongoose from "mongoose";
import User from "@/models/UserModel";
import type { IUser } from "@/types/UserInterface";
import { TIMING_CONSTANTS } from "@/constants";

/**
 * Database optimization utilities for efficient querying and indexing
 */
export class UserQueryOptimizer {
    /**
     * Find user by email with password included (for authentication)
     */
    static async findByEmailForAuth(email: string): Promise<IUser | null> {
        return User.findOne({ email: email.toLowerCase() }).select("+password");
    }

    /**
     * Update login information after successful authentication
     */
    static async updateLoginInfo(userId: string, clientIP: string, userAgent: string): Promise<void> {
        // First, try to update existing IP
        const updateResult = await User.updateOne(
            {
                _id: userId,
                "ipAddresses.ip": clientIP, // IP exists
            },
            {
                $set: {
                    lastLogin: new Date(),
                    "ipAddresses.$.lastUsed": new Date(), // Update matched IP
                    "ipAddresses.$.userAgent": userAgent,
                },
            },
        );

        // If IP doesn't exist, add it
        if (updateResult.matchedCount === 0) {
            await User.updateOne(
                { _id: userId },
                {
                    $set: { lastLogin: new Date() },
                    $push: {
                        ipAddresses: {
                            $each: [{ ip: clientIP, lastUsed: new Date(), userAgent }],
                            $slice: -20, // Keep last 20 (matches MAX_IPS in pre-save)
                        },
                    },
                },
            );
        }
    }
}

/**
 * Ensure all database indexes are created
 */
export const ensureIndexes = async (): Promise<void> => {
    try {
        await User.createIndexes();
        console.log("✅ Database indexes ensured successfully");
    } catch (error) {
        console.error("❌ Failed to ensure database indexes:", error);
        throw error;
    }
};

/**
 * Check database health and connection status
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
    try {
        const state = mongoose.connection.readyState;

        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        if (state !== 1) {
            return false;
        }

        // Additional health check - try a simple query
        await User.findOne({}).limit(1).lean();
        return true;
    } catch (error) {
        console.error("Database health check failed:", error);
        return false;
    }
};
