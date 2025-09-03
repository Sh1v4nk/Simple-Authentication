import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendErrorResponse, TokenService } from "@/utils";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";

export const verifyAuthToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract access token from cookies or Authorization header
        const accessToken = TokenService.extractAccessToken(req);

        if (!accessToken) {
            return sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_TOKEN, HTTP_STATUS.UNAUTHORIZED);
        }

        // Check if JWT_SECRET is defined
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return sendErrorResponse(res, ERROR_MESSAGES.JWT_SECRET_NOT_DEFINED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }

        // Verify the access token
        const decoded = jwt.verify(accessToken, secret);

        // Type check and validate token structure
        if (!decoded || typeof decoded === "string") {
            return sendErrorResponse(res, ERROR_MESSAGES.TOKEN_DECODING_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }

        // Validate token type (ensure it's an access token)
        if (decoded.type !== "access") {
            return sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN_TYPE, HTTP_STATUS.UNAUTHORIZED);
        }

        // Validate userId exists in token
        if (!decoded.userId) {
            return sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN_PAYLOAD, HTTP_STATUS.UNAUTHORIZED);
        }

        // Attach userId to request object
        req.userId = decoded.userId.toString();
        next();
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Token verification failed:", error.message);

            // Handle specific JWT errors
            if (error.name === "TokenExpiredError") {
                return sendErrorResponse(res, ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED);
            } else if (error.name === "JsonWebTokenError") {
                return sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
            } else if (error.name === "NotBeforeError") {
                return sendErrorResponse(res, ERROR_MESSAGES.TOKEN_NOT_ACTIVE, HTTP_STATUS.UNAUTHORIZED);
            } else {
                return sendErrorResponse(res, ERROR_MESSAGES.TOKEN_VERIFICATION_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }
        } else {
            // Fallback for non-Error objects
            console.error("An unknown error occurred during token verification");
            return sendErrorResponse(res, ERROR_MESSAGES.UNKNOWN_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
};

/**
 * Middleware that attempts token refresh on expired access token
 */
export const verifyAuthTokenWithRefresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accessToken = TokenService.extractAccessToken(req);

        if (!accessToken) {
            return sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_TOKEN, HTTP_STATUS.UNAUTHORIZED);
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return sendErrorResponse(res, ERROR_MESSAGES.JWT_SECRET_NOT_DEFINED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }

        try {
            // Try to verify the access token
            const decoded = jwt.verify(accessToken, secret);

            if (!decoded || typeof decoded === "string" || decoded.type !== "access" || !decoded.userId) {
                return sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
            }

            req.userId = decoded.userId.toString();
            next();
        } catch (jwtError: unknown) {
            // If access token is expired, try to refresh
            if (jwtError instanceof Error && jwtError.name === "TokenExpiredError") {
                const refreshToken = TokenService.extractRefreshToken(req);

                if (!refreshToken) {
                    return sendErrorResponse(res, ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED);
                }

                // Attempt token refresh
                const refreshResult = await TokenService.verifyAndConsumeRefreshToken(refreshToken, req.get("User-Agent"), req.ip);

                if (!refreshResult) {
                    return sendErrorResponse(res, ERROR_MESSAGES.INVALID_REFRESH_TOKEN, HTTP_STATUS.UNAUTHORIZED);
                }

                // Set new tokens in cookies
                TokenService.setTokenCookies(res, refreshResult.newAccessToken, refreshResult.newRefreshToken);

                // Attach userId and continue
                req.userId = refreshResult.userId.toString();
                next();
            } else {
                // Handle other JWT errors
                throw jwtError;
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Token verification with refresh failed:", error.message);

            if (error.name === "JsonWebTokenError") {
                return sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
            } else if (error.name === "NotBeforeError") {
                return sendErrorResponse(res, ERROR_MESSAGES.TOKEN_NOT_ACTIVE, HTTP_STATUS.UNAUTHORIZED);
            } else {
                return sendErrorResponse(res, ERROR_MESSAGES.TOKEN_VERIFICATION_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
            }
        } else {
            console.error("An unknown error occurred during token verification with refresh");
            return sendErrorResponse(res, ERROR_MESSAGES.UNKNOWN_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
};
