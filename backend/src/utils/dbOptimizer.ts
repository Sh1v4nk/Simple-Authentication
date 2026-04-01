import mongoose from "mongoose";
import User from "@/models/user.model";
import Session from "@/models/session.model";
import type { IUser } from "@/types/models.types";
import { logger } from "@/configs/logger";
import { TIMING_CONSTANTS } from "@/constants/timings";
import type { MongoIndexInfo } from "@/types/dbOptmizer.types";

const UNVERIFIED_USER_TTL_INDEX = "unverified_user_ttl_idx";
const UNVERIFIED_USER_TTL_SECONDS = Math.floor(TIMING_CONSTANTS.SEVEN_DAYS / 1000);

const REQUIRED_SESSION_INDEXES = [
    "session_token_hash_idx",
    "session_used_token_hash_idx",
    "session_family_id_idx",
    "session_user_id_idx",
    "session_ttl_idx",
] as const;

export class UserQueryOptimizer {
    static async findByEmailForAuth(email: string): Promise<IUser | null> {
        return User.findOne({ email: email.toLowerCase() }).select("+password");
    }

    static async updateLoginInfo(userId: string, clientIP: string, userAgent: string): Promise<void> {
        const now = new Date();

        await User.updateOne({ _id: userId }, [
            {
                $set: {
                    lastLogin: now,
                    ipAddresses: {
                        $slice: [
                            {
                                $concatArrays: [
                                    [{ ip: clientIP, lastUsed: now, userAgent }],
                                    {
                                        $filter: {
                                            input: { $ifNull: ["$ipAddresses", []] },
                                            as: "entry",
                                            cond: { $ne: ["$$entry.ip", clientIP] },
                                        },
                                    },
                                ],
                            },
                            20,
                        ],
                    },
                },
            },
        ]);
    }
}

export const ensureIndexes = async (): Promise<void> => {
    try {
        await Promise.all([User.createIndexes(), Session.createIndexes()]);

        const userIndexes = (await User.collection.indexes()) as MongoIndexInfo[];
        const ttlIndex = userIndexes.find((i) => i.name === UNVERIFIED_USER_TTL_INDEX);

        if (!ttlIndex) {
            throw new Error(`[DB] Required TTL index missing: ${UNVERIFIED_USER_TTL_INDEX}`);
        }
        if (ttlIndex.expireAfterSeconds !== UNVERIFIED_USER_TTL_SECONDS) {
            throw new Error(
                `[DB] TTL mismatch for ${UNVERIFIED_USER_TTL_INDEX}: ` +
                    `expected=${UNVERIFIED_USER_TTL_SECONDS}, actual=${String(ttlIndex.expireAfterSeconds)}`,
            );
        }
        if (ttlIndex.partialFilterExpression?.isVerified !== false) {
            throw new Error(`[DB] Partial filter mismatch for ${UNVERIFIED_USER_TTL_INDEX}`);
        }

        const sessionIndexes = (await Session.collection.indexes()) as MongoIndexInfo[];
        const sessionIndexNames = sessionIndexes.map((i) => i.name);

        for (const required of REQUIRED_SESSION_INDEXES) {
            if (!sessionIndexNames.includes(required)) {
                throw new Error(`[DB] Required Session index missing: ${required}`);
            }
        }

        const sessionTtlIndex = sessionIndexes.find((i) => i.name === "session_ttl_idx");
        if (sessionTtlIndex?.expireAfterSeconds !== 0) {
            throw new Error(
                `[DB] Session TTL index misconfigured: expected expireAfterSeconds=0, ` +
                    `got=${String(sessionTtlIndex?.expireAfterSeconds)}`,
            );
        }

        logger.info(
            {
                userTtlIndex: UNVERIFIED_USER_TTL_INDEX,
                sessionIndexes: REQUIRED_SESSION_INDEXES,
            },
            "[DB] All indexes ensured",
        );
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
