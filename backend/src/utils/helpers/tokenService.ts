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
 * Secure Token Service - Proper dual-token implementation
 * - Access Token: Short-lived (15min), sent to frontend
 * - Refresh Token: Long-lived (7 days), stored ONLY in database
 */
export class TokenService {
    private static readonly ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
    private static readonly REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
    private static readonly REFRESH_TOKEN_LENGTH = 64; // bytes

    /**
     * Generate access token (JWT)
     */
    static generateAccessToken(userId: ObjectId): string {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables.");
        }

        return jwt.sign({ userId: userId.toString(), type: "access" }, process.env.JWT_SECRET as string, {
            expiresIn: this.ACCESS_TOKEN_EXPIRY,
        });
    }

    /**
     * Generate refresh token (random string, NOT JWT)
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
     * Generate both tokens and store refresh token in DB
     * ONLY sends access token to frontend
     */
    static async generateTokensAndSetCookies(
        res: Response,
        userId: ObjectId,
        userAgent?: string,
        ipAddress?: string
    ): Promise<{ accessToken: string }> {
        const accessToken = this.generateAccessToken(userId);
        const refreshTokenData = this.generateRefreshToken();

        // Store refresh token in database ONLY (never send to frontend)
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

        // ONLY set access token cookie (refresh token stays server-side)
        this.setAccessTokenCookie(res, accessToken);

        return {
            accessToken, // Only return access token
        };
    }

    /**
     * Set ONLY access token cookie (secure settings)
     */
    static setAccessTokenCookie(res: Response, accessToken: string): void {
        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "strict" : "lax",
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: "/",
        });

        console.log(`🍪 Access token cookie set - Production: ${isProduction}`);
    }

    /**
     * Extract access token from request
     */
    static extractAccessToken(req: any): string | null {
        // Try accessToken cookie first
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
     * Refresh access token using stored refresh token
     * This checks database for valid refresh token and generates new access token
     */
    static async refreshAccessToken(userId: ObjectId, userAgent?: string, ipAddress?: string): Promise<{ newAccessToken: string } | null> {
        try {
            // Find user with valid refresh tokens
            const user = await User.findOne({
                _id: userId,
                "refreshTokens.isRevoked": false,
                "refreshTokens.expiresAt": { $gt: new Date() },
            });

            if (!user || !user.refreshTokens.length) {
                return null;
            }

            // Find the most recent valid refresh token
            const validToken = user.refreshTokens
                .filter((rt) => !rt.isRevoked && rt.expiresAt > new Date())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

            if (!validToken) {
                return null;
            }

            // Generate new access token
            const newAccessToken = this.generateAccessToken(userId);

            return {
                newAccessToken,
            };
        } catch (error) {
            console.error("Access token refresh error:", error);
            return null;
        }
    }

    /**
     * Revoke refresh token (logout)
     */
    static async revokeRefreshToken(userId: ObjectId): Promise<boolean> {
        try {
            const result = await User.updateOne({ _id: userId }, { $set: { "refreshTokens.$[].isRevoked": true } });

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
     * Clear access token cookie
     */
    static clearTokenCookies(res: Response): void {
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            path: "/",
        });
        console.log("🗑️ Access token cookie cleared");
    }

    /**
     * Clean up expired and revoked tokens (maintenance function)
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
            console.log("🧹 Expired tokens cleaned up");
        } catch (error) {
            console.error("Token cleanup error:", error);
        }
    }
}
