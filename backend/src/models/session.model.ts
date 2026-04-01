import mongoose, { Schema, type Model } from "mongoose";
import { TIMING_CONSTANTS } from "@/constants/timings";
import type { ISession } from "@/types/models.types";

const SessionSchema = new Schema<ISession>(
    {
        tokenHash: {
            type: String,
            required: true,
        },

        usedTokenHash: {
            type: String,
            default: null,
        },

        userId: {
            type: String,
            required: true,
        },

        familyId: {
            type: String,
            required: true,
        },

        isVerified: {
            type: Boolean,
            required: true,
        },

        deviceId: {
            type: String,
            required: true,
        },

        userAgent: {
            type: String,
            default: "",
        },

        ip: {
            type: String,
            default: "",
        },

        lastUsedAt: {
            type: Date,
            default: Date.now,
        },

        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    },
);

SessionSchema.index({ tokenHash: 1 }, { name: "session_token_hash_idx", unique: true });

SessionSchema.index(
    { usedTokenHash: 1 },
    {
        name: "session_used_token_hash_idx",
        partialFilterExpression: { usedTokenHash: { $type: "string" } },
    },
);

SessionSchema.index({ familyId: 1 }, { name: "session_family_id_idx" });
SessionSchema.index({ userId: 1 }, { name: "session_user_id_idx" });

// `expiresAt` is the sliding refresh expiry, so the TTL index must target it directly.
SessionSchema.index(
    { expiresAt: 1 },
    {
        name: "session_ttl_idx",
        expireAfterSeconds: 0,
    },
);

export const SESSION_TTL_MS = TIMING_CONSTANTS.SEVEN_DAYS;
export const MAX_ACTIVE_SESSIONS = 5;

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);

export default Session;
