import mongoose from "mongoose";
import User from "@/models/UserModel";
import type { IUser } from "@/types/UserInterface";
import { logger } from "@/utils/logger";

export class UserQueryOptimizer {
    static async findByEmailForAuth(email: string): Promise<IUser | null> {
        return User.findOne({ email: email.toLowerCase() }).select("+password");
    }

    static async updateLoginInfo(userId: string, clientIP: string, userAgent: string): Promise<void> {
        const updateResult = await User.updateOne(
            { _id: userId, "ipAddresses.ip": clientIP },
            {
                $set: {
                    lastLogin: new Date(),
                    "ipAddresses.$.lastUsed": new Date(),
                    "ipAddresses.$.userAgent": userAgent,
                },
            },
        );

        if (updateResult.matchedCount === 0) {
            await User.updateOne(
                { _id: userId },
                {
                    $set: { lastLogin: new Date() },
                    $push: {
                        ipAddresses: {
                            $each: [{ ip: clientIP, lastUsed: new Date(), userAgent }],
                            $slice: -20,
                        },
                    },
                },
            );
        }
    }
}

export const ensureIndexes = async (): Promise<void> => {
    try {
        await User.createIndexes();
        logger.info("[DB] Indexes ensured");
    } catch (error) {
        logger.error({ err: error }, "[DB] Failed to ensure indexes");
        throw error;
    }
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
    try {
        if (mongoose.connection.readyState !== 1) return false;

        await mongoose.connection.db!.command({ ping: 1 });
        return true;
    } catch (error) {
        logger.error({ err: error }, "[DB] Health check failed");
        return false;
    }
};
