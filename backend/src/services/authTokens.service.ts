import crypto from "crypto";
import User from "@/models/user.model";
import { TIMING_CONSTANTS } from "@/constants/timings";
import { RESET_TOKEN_BYTES } from "@/constants/security";
import type { IUser } from "@/types/models.types";

const VERIFY_TTL_MS = TIMING_CONSTANTS.FIFTEEN_MINUTES;
const RESET_TTL_MS = TIMING_CONSTANTS.ONE_HOUR;
const MAX_VERIFY_TOKEN_GENERATION_ATTEMPTS = 5;

const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");
const expiresAt = (ttlMs: number): Date => new Date(Date.now() + ttlMs);

const generateUniqueVerifyToken = async (): Promise<{ raw: string; hash: string }> => {
    for (let attempt = 0; attempt < MAX_VERIFY_TOKEN_GENERATION_ATTEMPTS; attempt += 1) {
        const raw = crypto.randomInt(100000, 1000000).toString();
        const hash = hashToken(raw);
        const existing = await User.exists({
            emailVerificationTokenHash: hash,
            emailVerificationTokenExpiresAt: { $gt: new Date() },
        });

        if (!existing) {
            return { raw, hash };
        }
    }

    throw new Error("[AUTH_TOKENS] Failed to generate a unique verification code");
};

export const storeVerifyToken = async (userId: string): Promise<string> => {
    const verifyToken = await generateUniqueVerifyToken();

    await User.updateOne(
        { _id: userId },
        {
            $set: {
                emailVerificationTokenHash: verifyToken.hash,
                emailVerificationTokenExpiresAt: expiresAt(VERIFY_TTL_MS),
            },
        },
    );

    return verifyToken.raw;
};

export const consumeVerifyToken = async (token: string): Promise<IUser | null> => {
    const hash = hashToken(token);

    return User.findOneAndUpdate(
        {
            emailVerificationTokenHash: hash,
            emailVerificationTokenExpiresAt: { $gt: new Date() },
            isVerified: false,
        },
        {
            $set: { isVerified: true },
            $unset: {
                emailVerificationTokenHash: 1,
                emailVerificationTokenExpiresAt: 1,
            },
        },
        { new: true },
    );
};

export const storeResetToken = async (userId: string): Promise<string> => {
    const raw = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
    const hash = hashToken(raw);

    await User.updateOne(
        { _id: userId },
        {
            $set: {
                resetPasswordTokenHash: hash,
                resetPasswordTokenExpiresAt: expiresAt(RESET_TTL_MS),
            },
        },
    );

    return raw;
};

export const consumeResetToken = async (rawToken: string): Promise<string | null> => {
    const hash = hashToken(rawToken);
    const user = await User.findOneAndUpdate(
        {
            resetPasswordTokenHash: hash,
            resetPasswordTokenExpiresAt: { $gt: new Date() },
        },
        {
            $unset: {
                resetPasswordTokenHash: 1,
                resetPasswordTokenExpiresAt: 1,
            },
        },
        { new: true },
    )
        .select("_id")
        .lean();

    return user?._id.toString() ?? null;
};
