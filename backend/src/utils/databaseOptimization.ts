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
        return User.findOne({ email }).select("+password").lean();
    }

    /**
     * Increment login attempts for a user
     * Returns false if account should be locked
     */
    static async incrementLoginAttempts(email: string): Promise<boolean> {
        const user = await User.findOne({ email });
        if (!user) return false;

        user.loginAttempts = (user.loginAttempts || 0) + 1;

        // Lock account after 5 failed attempts for 15 minutes
        if (user.loginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + TIMING_CONSTANTS.FIFTEEN_MINUTES); // 15 minutes
            await user.save();
            return false; // Account locked
        }

        await user.save();
        return true; // Allow more attempts
    }

    /**
     * Update login information after successful authentication
     */
    static async updateLoginInfo(userId: string, clientIP: string, userAgent: string): Promise<void> {
        const user = await User.findById(userId);
        if (!user) return;

        // Reset failed login attempts
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.lastLogin = new Date();

        // Update IP address history (keep last 5)
        if (!user.ipAddresses) user.ipAddresses = [];
        const existingIPIndex = user.ipAddresses.findIndex((ip) => ip.ip === clientIP);

        if (existingIPIndex >= 0) {
            // Update existing IP entry
            user.ipAddresses[existingIPIndex].lastUsed = new Date();
            user.ipAddresses[existingIPIndex].userAgent = userAgent;
        } else {
            // Add new IP entry
            user.ipAddresses.push({
                ip: clientIP,
                lastUsed: new Date(),
                userAgent: userAgent,
            });
            // Keep only last 5 IP addresses
            if (user.ipAddresses.length > 5) {
                user.ipAddresses = user.ipAddresses.slice(-5);
            }
        }

        await user.save();
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
