import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response } from "express";
import { Types } from "mongoose";
import User from "@/models/UserModel";
import { TIMING_CONSTANTS } from "@/constants";

type ObjectId = Types.ObjectId;

interface TokenPayload {
    userId: ObjectId;
    type: "access";
}

/**
 * Token Service - Handles JWT access tokens and refresh tokens with rotation
 */
export class TokenService {
    private static readonly ACCESS_EXPIRY = "15m";
    private static readonly REFRESH_BYTES = 64;
    private static readonly MAX_REFRESH_TOKENS = 10;

    /* =========================
       ACCESS TOKEN
    ========================= */

    /**
     * Generate JWT access token
     */
    static generateAccessToken(userId: ObjectId): string {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables.");
        }

        return jwt.sign({ userId, type: "access" } as TokenPayload, process.env.JWT_SECRET, {
            expiresIn: this.ACCESS_EXPIRY,
        });
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): TokenPayload | null {
        try {
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is not defined in environment variables.");
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;

            if (decoded.type !== "access") {
                return null;
            }

            return decoded;
        } catch {
            return null;
        }
    }

    /* =========================
       REFRESH TOKEN
    ========================= */

    /**
     * Generate cryptographically secure refresh token
     */
    private static generateRefreshToken() {
        const raw = crypto.randomBytes(this.REFRESH_BYTES).toString("hex");
        const hash = crypto.createHash("sha256").update(raw).digest("hex");

        return {
            raw,
            hash,
            expiresAt: new Date(Date.now() + TIMING_CONSTANTS.SEVEN_DAYS),
        };
    }

    /* =========================
       ISSUE TOKENS
    ========================= */

    /**
     * Issue new access and refresh tokens for a user
     * Automatically manages token rotation and cleanup
     */
    static async generateTokensAndSetCookies(
        res: Response,
        userId: ObjectId,
        userAgent?: string,
        ipAddress?: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const user = await User.findById(userId).select("refreshTokens");
        if (!user) {
            throw new Error("User not found");
        }

        const now = new Date();

        // Remove expired tokens
        user.refreshTokens = user.refreshTokens.filter((t) => !t.isRevoked && t.expiresAt > now);

        // Enforce token limit
        if (user.refreshTokens.length >= this.MAX_REFRESH_TOKENS) {
            user.refreshTokens.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            user.refreshTokens.shift(); // Remove oldest
        }

        const refresh = this.generateRefreshToken();

        user.refreshTokens.push({
            token: refresh.hash,
            createdAt: now,
            expiresAt: refresh.expiresAt,
            userAgent,
            ipAddress,
            isRevoked: false,
        });

        await user.save();

        const accessToken = this.generateAccessToken(userId);
        this.setTokenCookies(res, accessToken, refresh.raw);

        return { accessToken, refreshToken: refresh.raw };
    }

    /**
     * Rotate refresh token (used during token refresh)
     */
    static async verifyAndConsumeRefreshToken(
        refreshToken: string,
        userAgent?: string,
        ipAddress?: string,
    ): Promise<{
        userId: ObjectId;
        newAccessToken: string;
        newRefreshToken: string;
    } | null> {
        try {
            const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");

            const user = await User.findOne({
                "refreshTokens.token": hash,
                "refreshTokens.isRevoked": false,
                "refreshTokens.expiresAt": { $gt: new Date() },
            });

            if (!user) return null;

            const token = user.refreshTokens.find((t) => t.token === hash && !t.isRevoked && t.expiresAt > new Date());

            if (!token) return null;

            // Revoke used token
            token.isRevoked = true;

            // Generate new tokens
            const fresh = this.generateRefreshToken();

            user.refreshTokens.push({
                token: fresh.hash,
                createdAt: new Date(),
                expiresAt: fresh.expiresAt,
                userAgent,
                ipAddress,
                isRevoked: false,
            });

            // Keep only recent active tokens (5) and recent revoked tokens (10) for audit
            const activeTokens = user.refreshTokens
                .filter((t) => !t.isRevoked && t.expiresAt > new Date())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 5);

            const revokedTokens = user.refreshTokens
                .filter((t) => t.isRevoked)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 10);

            user.refreshTokens = [...activeTokens, ...revokedTokens];

            await user.save();

            return {
                userId: user._id as ObjectId,
                newAccessToken: this.generateAccessToken(user._id as ObjectId),
                newRefreshToken: fresh.raw,
            };
        } catch (error) {
            console.error("Refresh token verification error:", error);
            return null;
        }
    }

    /* =========================
       TOKEN REVOCATION
    ========================= */

    /**
     * Revoke single refresh token (logout)
     */
    static async revokeRefreshToken(refreshToken: string): Promise<boolean> {
        try {
            const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
            const result = await User.updateOne({ "refreshTokens.token": hash }, { $set: { "refreshTokens.$.isRevoked": true } });
            return result.modifiedCount > 0;
        } catch (error) {
            console.error("Token revocation error:", error);
            return false;
        }
    }

    /**
     * Revoke all refresh tokens for a user (logout from all devices)
     */
    static async revokeAllRefreshTokens(userId: ObjectId): Promise<boolean> {
        try {
            const result = await User.updateOne({ _id: userId }, { $set: { "refreshTokens.$[].isRevoked": true } });
            return result.modifiedCount > 0;
        } catch (error) {
            console.error("All tokens revocation error:", error);
            return false;
        }
    }

    /* =========================
       COOKIES
    ========================= */

    /**
     * Set HTTP-only cookies for both tokens
     */
    static setTokenCookies(res: Response, access: string, refresh: string): void {
        const isProd = process.env.NODE_ENV === "production";
        const sameSite = isProd ? "none" : "lax";

        res.cookie("accessToken", access, {
            httpOnly: true,
            secure: isProd,
            sameSite,
            maxAge: TIMING_CONSTANTS.FIFTEEN_MINUTES,
        });

        res.cookie("refreshToken", refresh, {
            httpOnly: true,
            secure: isProd,
            sameSite,
            maxAge: TIMING_CONSTANTS.SEVEN_DAYS,
        });
    }

    /**
     * Clear both token cookies
     */
    static clearTokenCookies(res: Response): void {
        const isProd = process.env.NODE_ENV === "production";

        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
        });
    }

    /* =========================
       REQUEST HELPERS
    ========================= */

    /**
     * Extract access token from cookie or Authorization header
     */
    static extractAccessToken(req: Request): string | null {
        return req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "") || null;
    }

    /**
     * Extract refresh token from cookie
     */
    static extractRefreshToken(req: Request): string | null {
        return req.cookies?.refreshToken || null;
    }

    /**
     * Check if refresh token is still valid (not revoked, not expired)
     */
    static async isRefreshTokenValid(refreshToken: string, userId: ObjectId): Promise<boolean> {
        try {
            const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");

            const user = await User.findOne({
                _id: userId,
                "refreshTokens.token": hash,
                "refreshTokens.isRevoked": false,
                "refreshTokens.expiresAt": { $gt: new Date() },
            });

            return !!user;
        } catch (error) {
            console.error("❌ Error validating refresh token:", error);
            return false;
        }
    }

    /* =========================
       MAINTENANCE
    ========================= */

    /**
     * Cleanup expired and revoked refresh tokens from all users
     * CRITICAL: Prevents memory leaks in production
     * Called automatically on server startup and periodically
     */
    static async cleanupExpiredTokens(): Promise<{
        deletedCount: number;
        usersProcessed: number;
    }> {
        try {
            const now = new Date();
            let totalDeletedCount = 0;
            let usersProcessed = 0;
            const bulkOps: any[] = [];

            // Process in batches to avoid memory issues
            const BATCH_SIZE = 100;
            let skip = 0;

            while (true) {
                const users = await User.find({ "refreshTokens.0": { $exists: true } }, { refreshTokens: 1 })
                    .skip(skip)
                    .limit(BATCH_SIZE);

                if (users.length === 0) break;

                for (const user of users) {
                    const original = user.refreshTokens.length;

                    // Keep active tokens and recent revoked tokens (24h) for audit
                    const filtered = user.refreshTokens.filter((t) => {
                        if (!t.isRevoked && t.expiresAt > now) return true;

                        if (t.isRevoked) {
                            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                            return t.createdAt > oneDayAgo;
                        }

                        return false;
                    });

                    if (original > filtered.length) {
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: user._id },
                                update: { $set: { refreshTokens: filtered } },
                            },
                        });
                        totalDeletedCount += original - filtered.length;
                    }

                    usersProcessed++;
                }

                skip += BATCH_SIZE;
            }

            if (bulkOps.length > 0) {
                await User.bulkWrite(bulkOps);
            }

            console.log(`✅ Token cleanup completed: ${totalDeletedCount} expired tokens removed from ${usersProcessed} users`);

            return { deletedCount: totalDeletedCount, usersProcessed };
        } catch (error) {
            console.error("❌ Token cleanup failed:", error);
            throw error;
        }
    }
}
