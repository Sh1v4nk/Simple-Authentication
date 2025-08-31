import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Response } from "express";
import { ObjectId } from "mongoose";
import User from "@/models/UserModel";
import { TIMING_CONSTANTS } from "@/constants";

interface TokenPayload {
    userId: string;
    type: "access";
}

interface RefreshTokenData {
    token: string;
    hashedToken: string;
    expiresAt: Date;
}

/**
 * Secure Token Service - Proper dual-token implementation
 * - Access Token: Medium-lived (1 hour), sent as HTTP-only cookie
 * - Refresh Token: Long-lived (7 days), stored ONLY in database
 * - Frontend gets access token automatically via cookie
 * - Refresh token NEVER sent to frontend
 */
export class TokenService {
    private static readonly ACCESS_TOKEN_EXPIRY = "1h"; // 1 hour (reasonable balance)
    private static readonly REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
    private static readonly REFRESH_TOKEN_LENGTH = 64; // bytes

    /**
     * Generate access token (JWT) - sent to frontend
     */
    static generateAccessToken(userId: ObjectId): string {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables.");
        }

        return jwt.sign(
            {
                userId: userId.toString(),
                type: "access",
            },
            process.env.JWT_SECRET,
            {
                expiresIn: this.ACCESS_TOKEN_EXPIRY,
            }
        );
    }

    /**
     * Generate refresh token (random string) - stored server-side only
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
     * - Access token: HTTP-only cookie for frontend
     * - Refresh token: Stored in database only (never sent)
     */
    static async generateTokensAndSetCookies(
        res: Response,
        userId: ObjectId,
        userAgent?: string,
        ipAddress?: string
    ): Promise<{ accessToken: string }> {
        const accessToken = this.generateAccessToken(userId);
        const refreshTokenData = this.generateRefreshToken();

        // Store refresh token in database (hashed)
        await User.findByIdAndUpdate(userId, {
            $push: {
                refreshTokens: {
                    token: refreshTokenData.hashedToken,
                    createdAt: new Date(),
                    expiresAt: refreshTokenData.expiresAt,
                    userAgent: userAgent || "unknown",
                    ipAddress: ipAddress || "unknown",
                    isRevoked: false,
                },
            },
        });

        // Set access token cookie (frontend will receive this)
        this.setAccessTokenCookie(res, accessToken);

        // Also set a session identifier for refresh token lookup
        this.setRefreshTokenIdentifier(res, refreshTokenData.hashedToken);

        return { accessToken };
    }

    /**
     * Set access token cookie - this is what frontend receives
     */
    static setAccessTokenCookie(res: Response, accessToken: string): void {
        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "none",
            maxAge: 60 * 60 * 1000, // 1 hour
            path: "/",
        });
    }

    /**
     * Set refresh token identifier cookie (for lookup only)
     */
    static setRefreshTokenIdentifier(res: Response, hashedToken: string): void {
        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("refreshId", hashedToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "none",
            maxAge: TIMING_CONSTANTS.SEVEN_DAYS,
            path: "/",
        });
    }

    /**
     * Extract access token from request
     */
    static extractAccessToken(req: any): string | null {
        // Primary: accessToken cookie
        let token = req.cookies?.accessToken;

        // Fallback: Authorization header
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

            const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

            if (decoded.type !== "access") {
                return null;
            }

            return {
                userId: decoded.userId,
                type: "access",
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Refresh access token using stored refresh token
     */
    static async refreshAccessToken(
        userId: ObjectId,
        refreshId: string,
        userAgent?: string,
        ipAddress?: string
    ): Promise<{ newAccessToken: string } | null> {
        try {
            // Find user with valid refresh token matching the identifier
            const user = await User.findOne({
                _id: userId,
                refreshTokens: {
                    $elemMatch: {
                        token: refreshId,
                        isRevoked: false,
                        expiresAt: { $gt: new Date() },
                    },
                },
            });

            if (!user) {
                return null;
            }

            // Find the specific refresh token
            const validToken = user.refreshTokens.find((rt) => rt.token === refreshId && !rt.isRevoked && rt.expiresAt > new Date());

            if (!validToken) {
                return null;
            }

            // Generate new access token
            const newAccessToken = this.generateAccessToken(userId);

            // Optional: Update last used timestamp
            await User.updateOne(
                {
                    _id: userId,
                    "refreshTokens.token": refreshId,
                },
                {
                    $set: {
                        "refreshTokens.$.lastUsedAt": new Date(),
                    },
                }
            );

            return { newAccessToken };
        } catch (error) {
            console.error("Access token refresh error:", error);
            return null;
        }
    }

    /**
     * Revoke specific refresh token (logout current device)
     */
    static async revokeRefreshToken(userId: ObjectId, refreshId?: string): Promise<boolean> {
        try {
            let updateQuery;

            if (refreshId) {
                // Revoke specific token
                updateQuery = {
                    $set: {
                        "refreshTokens.$[elem].isRevoked": true,
                        "refreshTokens.$[elem].revokedAt": new Date(),
                    },
                };
            } else {
                // Revoke all tokens
                updateQuery = {
                    $set: {
                        "refreshTokens.$[].isRevoked": true,
                        "refreshTokens.$[].revokedAt": new Date(),
                    },
                };
            }

            const result = await User.updateOne(
                { _id: userId },
                updateQuery,
                refreshId
                    ? {
                          arrayFilters: [{ "elem.token": refreshId }],
                      }
                    : {}
            );

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
        return this.revokeRefreshToken(userId);
    }

    /**
     * Clear all auth cookies
     */
    static clearTokenCookies(res: Response): void {
        const isProduction = process.env.NODE_ENV === "production";

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: "none" as const,
            path: "/",
        };

        res.clearCookie("accessToken", cookieOptions);
        res.clearCookie("refreshId", cookieOptions);

        console.log("🗑️ All auth cookies cleared");
    }

    /**
     * Check if user has valid session (for middleware)
     */
    static async hasValidSession(userId: ObjectId, refreshId?: string): Promise<boolean> {
        try {
            if (!refreshId) return false;

            const user = await User.findOne({
                _id: userId,
                refreshTokens: {
                    $elemMatch: {
                        token: refreshId,
                        isRevoked: false,
                        expiresAt: { $gt: new Date() },
                    },
                },
            });

            return !!user;
        } catch (error) {
            return false;
        }
    }

    /**
     * Clean up expired and revoked tokens (maintenance function)
     */
    static async cleanupExpiredTokens(): Promise<void> {
        try {
            const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

            await User.updateMany(
                {},
                {
                    $pull: {
                        refreshTokens: {
                            $or: [
                                { expiresAt: { $lt: new Date() } },
                                {
                                    isRevoked: true,
                                    revokedAt: { $lt: cutoffDate },
                                },
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
