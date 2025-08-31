import { Request, Response, NextFunction } from "express";
import { ObjectId, Types } from "mongoose";
import { TokenService } from "@/utils/helpers";
import { sendErrorResponse } from "@/utils";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";

// Extend Request interface to include user info
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            user?: any;
        }
    }
}

/**
 * Authentication middleware with automatic token refresh
 * Handles both access token verification and refresh token logic
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log(`🔐 Auth middleware triggered for: ${req.method} ${req.path}`);
        console.log(`🔐 Cookies received:`, Object.keys(req.cookies || {}));
        
        // Extract access token
        const accessToken = TokenService.extractAccessToken(req);
        console.log(`🔐 Access token extracted:`, accessToken ? 'Found' : 'Not found');

        if (accessToken) {
            // Verify access token
            const payload = TokenService.verifyAccessToken(accessToken);
            console.log(`🔐 Access token verification:`, payload ? 'Valid' : 'Invalid/Expired');

            if (payload) {
                // Valid access token
                req.userId = payload.userId.toString();
                console.log(`✅ Valid access token for user: ${req.userId}`);
                return next();
            }
        }

        // Access token invalid/expired - try refresh
        const refreshId = req.cookies?.refreshId;
        console.log(`🔄 Refresh attempt - refreshId:`, refreshId ? 'Found' : 'Not found');

        if (!refreshId) {
            console.log(`❌ No refresh token available - requiring login`);
            sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        // Try to extract userId from expired access token (if available) - more robust approach
        let userId: string | null = null;

        if (accessToken) {
            try {
                // Decode without verification to get userId (handle expired tokens)
                const parts = accessToken.split(".");
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
                    userId = payload.userId;
                }
            } catch {
                // Ignore decode errors - continue with refresh attempt
            }
        }

        // If we have refreshId but no userId from token, try to find user by refreshId
        if (!userId) {
            try {
                const User = (await import("@/models/UserModel")).default;
                const user = await User.findOne({
                    refreshTokens: {
                        $elemMatch: {
                            token: refreshId,
                            isRevoked: false,
                            expiresAt: { $gt: new Date() },
                        },
                    },
                });

                if (user) {
                    userId = (user._id as ObjectId).toString();
                }
            } catch (error) {
                console.error("Error finding user by refresh token:", error);
            }
        }

        // If still no userId, clear cookies and require login
        if (!userId) {
            TokenService.clearTokenCookies(res);
            sendErrorResponse(res, "Session expired. Please sign in again.", HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        // Attempt to refresh the access token
        const refreshResult = await TokenService.refreshAccessToken(userId as any, refreshId, req.get("User-Agent"), req.ip);

        if (!refreshResult) {
            // Refresh failed - clear cookies and require login
            TokenService.clearTokenCookies(res);
            sendErrorResponse(res, "Session expired. Please sign in again.", HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        // Successful refresh - set new access token
        TokenService.setAccessTokenCookie(res, refreshResult.newAccessToken);
        req.userId = userId;

        console.log(`🔄 Access token refreshed for user: ${userId}`);
        next();
    } catch (error) {
        console.error("🚫 Authentication error:", error);
        TokenService.clearTokenCookies(res);
        sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
    }
};

/**
 * Optional authentication middleware
 * Sets userId if valid token exists, but doesn't block request
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const accessToken = TokenService.extractAccessToken(req);

        if (accessToken) {
            const payload = TokenService.verifyAccessToken(accessToken);
            if (payload) {
                req.userId = payload.userId.toString();
            }
        }

        next();
    } catch (error) {
        // Ignore errors in optional auth
        next();
    }
};

/**
 * Middleware to check if user is verified
 */
export const requireVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
        sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
        return;
    }

    try {
        const User = (await import("@/models/UserModel")).default;
        const user = await User.findById(req.userId);

        if (!user) {
            sendErrorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            return;
        }

        if (!user.isVerified) {
            sendErrorResponse(res, "Please verify your email before proceeding.", HTTP_STATUS.FORBIDDEN);
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Verification check error:", error);
        sendErrorResponse(res, ERROR_MESSAGES.UNEXPECTED_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

/**
 * Admin-only middleware
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
        sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
        return;
    }

    if (req.user.role !== "admin") {
        sendErrorResponse(res, "Admin access required.", HTTP_STATUS.FORBIDDEN);
        return;
    }

    next();
};

// For backward compatibility
export const verifyAuthToken = authenticateToken;
