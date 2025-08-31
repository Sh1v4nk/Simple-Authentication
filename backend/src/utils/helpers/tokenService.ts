import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Response } from "express";
import { ObjectId } from "mongoose";
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
     */
    static setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
        const isProduction = process.env.NODE_ENV === "production";

        // Access token cookie (shorter expiry)
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "strict" : "lax",
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: "/",
        });

        // Refresh token cookie (longer expiry)
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "strict" : "lax",
            maxAge: TIMING_CONSTANTS.SEVEN_DAYS,
            path: "/", // Allow refresh token to be sent to all auth endpoints
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
     * Clear expired and revoked tokens (maintenance function)
     */
    static async cleanupExpiredTokens(): Promise<void> {
        try {
            await User.updateMany(
                {},
                {
                    $pull: {
                        refreshTokens: {
                            $or: [
                                { expiresAt: { $lt: new Date() } },
                                { isRevoked: true, createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
                            ],
                        },
                    },
                }
            );
        } catch (error) {
            console.error("Token cleanup error:", error);
        }
    }

    /**
     * Clear cookies
     */
    static clearTokenCookies(res: Response): void {
        res.clearCookie("accessToken", { path: "/" });
        res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
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
     * Extract refresh token from request
     */
    static extractRefreshToken(req: any): string | null {
        return req.cookies?.refreshToken || null;
    }
}

// Legacy function for backward compatibility
export const generateTokenAndSetCookie = async (
    res: Response,
    userId: ObjectId,
    tokenExpiryTime?: string,
    userAgent?: string,
    ipAddress?: string
): Promise<string> => {
    const { accessToken } = await TokenService.generateTokensAndSetCookies(res, userId, userAgent, ipAddress);
    return accessToken;
};
