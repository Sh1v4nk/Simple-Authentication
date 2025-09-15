import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Response } from "express";
import mongoose, { ObjectId } from "mongoose";
import User from "@/models/UserModel";
import { TIMING_CONSTANTS } from "@/constants";

interface TokenPayload {
    userId: ObjectId;
    type: "access" | "refresh";
}

interface RefreshTokenData {
    token: string;
    hashedToken: string;
    expiresAt: Date;
}

/**
 * Token Service - Handles both access and refresh tokens
 */
export class TokenService {
    private static readonly ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
    private static readonly REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
    private static readonly REFRESH_TOKEN_LENGTH = 64; // bytes

    /**
     * Generate access token
     */
    static generateAccessToken(userId: ObjectId): string {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables.");
        }

        return jwt.sign({ userId, type: "access" } as TokenPayload, process.env.JWT_SECRET, { expiresIn: this.ACCESS_TOKEN_EXPIRY });
    }

    /**
     * Generate refresh token
     */
    static generateRefreshToken(): RefreshTokenData {
        const token = crypto.randomBytes(this.REFRESH_TOKEN_LENGTH).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + TIMING_CONSTANTS.SEVEN_DAYS);

        return {
            token,
            hashedToken,
            expiresAt,
        };
    }

    /**
     * Generate both tokens and set cookies
     */
    static async generateTokensAndSetCookies(
        res: Response,
        userId: ObjectId,
        userAgent?: string,
        ipAddress?: string
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const accessToken = this.generateAccessToken(userId);
        const refreshTokenData = this.generateRefreshToken();

        // Store refresh token in database
        await User.findByIdAndUpdate(userId, {
            $push: {
                refreshTokens: {
                    token: refreshTokenData.hashedToken,
                    createdAt: new Date(),
                    expiresAt: refreshTokenData.expiresAt,
                    userAgent,
                    ipAddress,
                    isRevoked: false,
                },
            },
        });

        // Set cookies
        this.setTokenCookies(res, accessToken, refreshTokenData.token);

        return {
            accessToken,
            refreshToken: refreshTokenData.token,
        };
    }

    /**
     * Set token cookies with appropriate security settings
     * FIXED: Access token is NOT httpOnly so frontend can read it
     */
    static setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
        const isProduction = process.env.NODE_ENV === "production";

        // Access token cookie - FRONTEND CAN READ THIS
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "none",
            maxAge: TIMING_CONSTANTS.FIFTEEN_MINUTES,
        });

        // Refresh token cookie - BACKEND ONLY (httpOnly: true)
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "none",
            maxAge: TIMING_CONSTANTS.SEVEN_DAYS,
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
        } catch (error) {
            return null;
        }
    }

    /**
     * Verify and use refresh token
     */
    static async verifyAndConsumeRefreshToken(
        refreshToken: string,
        userAgent?: string,
        ipAddress?: string
    ): Promise<{ userId: ObjectId; newAccessToken: string; newRefreshToken: string } | null> {
        try {
            const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex");

            // Find user with this refresh token
            const user = await User.findOne({
                "refreshTokens.token": hashedToken,
                "refreshTokens.isRevoked": false,
                "refreshTokens.expiresAt": { $gt: new Date() },
            });

            if (!user) {
                return null;
            }

            // Find the specific token
            const tokenIndex = user.refreshTokens.findIndex((rt) => rt.token === hashedToken && !rt.isRevoked && rt.expiresAt > new Date());

            if (tokenIndex === -1) {
                return null;
            }

            // Revoke the used refresh token
            user.refreshTokens[tokenIndex].isRevoked = true;

            // Generate new tokens
            const newAccessToken = this.generateAccessToken(user._id as ObjectId);
            const newRefreshTokenData = this.generateRefreshToken();

            // Add new refresh token
            user.refreshTokens.push({
                token: newRefreshTokenData.hashedToken,
                createdAt: new Date(),
                expiresAt: newRefreshTokenData.expiresAt,
                userAgent,
                ipAddress,
                isRevoked: false,
            });

            // Clean up expired and revoked tokens (keep last 5 active tokens)
            const activeTokens = user.refreshTokens
                .filter((rt) => !rt.isRevoked && rt.expiresAt > new Date())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 5);

            user.refreshTokens = [
                ...activeTokens,
                // Keep revoked tokens for audit trail but limit them
                ...user.refreshTokens
                    .filter((rt) => rt.isRevoked)
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .slice(0, 10),
            ];

            await user.save();

            return {
                userId: user._id as ObjectId,
                newAccessToken,
                newRefreshToken: newRefreshTokenData.token,
            };
        } catch (error) {
            console.error("Refresh token verification error:", error);
            return null;
        }
    }

    /**
     * Revoke refresh token (logout)
     */
    static async revokeRefreshToken(refreshToken: string): Promise<boolean> {
        try {
            const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
            const result = await User.updateOne({ "refreshTokens.token": hashedToken }, { $set: { "refreshTokens.$.isRevoked": true } });
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

    /**
     * Clear cookies
     */
    static clearTokenCookies(res: Response): void {
        const isProduction = process.env.NODE_ENV === "production";

        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: isProduction,
            sameSite: "none",
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: isProduction,
            sameSite: "none",
        });
    }

    /**
     * Extract token from request (cookie or header)
     */
    static extractAccessToken(req: any): string | null {
        // Try cookie first
        let token = req.cookies?.accessToken;

        // Fallback to Authorization header
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
        }

        return token || null;
    }

    /**
     * Check if refresh token is still valid (not revoked)
     */
    static async isRefreshTokenValid(refreshToken: string, userId: ObjectId): Promise<boolean> {
        try {
            // Hash the token to match stored format
            const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex");

            // Find user with this refresh token that is not revoked and not expired
            const user = await User.findOne({
                _id: userId,
                "refreshTokens.token": hashedToken,
                "refreshTokens.isRevoked": false,
                "refreshTokens.expiresAt": { $gt: new Date() },
            });

            return !!user;
        } catch (error) {
            console.error("❌ Error validating refresh token:", error);
            return false;
        }
    }

    /**
     * Extract refresh token from request
     */
    static extractRefreshToken(req: any): string | null {
        return req.cookies?.refreshToken || null;
    }

    /**
     * Cleanup expired and revoked refresh tokens from all users
     * This method should be called periodically to maintain database performance
     */
    static async cleanupExpiredTokens(): Promise<{ deletedCount: number; usersProcessed: number }> {
        try {
            const now = new Date();
            let totalDeletedCount = 0;
            let usersProcessed = 0;

            // Find all users with refresh tokens
            const users = await User.find({ "refreshTokens.0": { $exists: true } }, { refreshTokens: 1 });

            for (const user of users) {
                const originalTokenCount = user.refreshTokens.length;

                // Keep only non-expired, non-revoked tokens and recent revoked tokens (for audit)
                user.refreshTokens = user.refreshTokens.filter((token) => {
                    // Keep active tokens that haven't expired
                    if (!token.isRevoked && token.expiresAt > now) {
                        return true;
                    }

                    // Keep recently revoked tokens (last 7 days) for audit purposes
                    if (token.isRevoked) {
                        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return token.createdAt > sevenDaysAgo;
                    }

                    // Remove expired tokens
                    return false;
                });

                const deletedTokensForUser = originalTokenCount - user.refreshTokens.length;

                if (deletedTokensForUser > 0) {
                    await user.save();
                    totalDeletedCount += deletedTokensForUser;
                }

                usersProcessed++;
            }

            console.log(`✅ Token cleanup completed: ${totalDeletedCount} expired tokens removed from ${usersProcessed} users`);

            return {
                deletedCount: totalDeletedCount,
                usersProcessed,
            };
        } catch (error) {
            console.error("❌ Token cleanup failed:", error);
            throw error;
        }
    }
}
