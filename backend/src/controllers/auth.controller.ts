import type { Request, Response, NextFunction } from "express";
import User from "@/models/user.model";
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/constants/enums";
import {
    sendVerificationToken,
    successfulVerificationEmail,
    resetPasswordEmail,
    passwordResetSuccessfulEmail,
} from "@/services/email.service";
import { sendSuccessResponse, sendErrorResponse } from "@/utils/response";
import { UserQueryOptimizer } from "@/utils/dbOptimizer";
import { getClientIP } from "@/utils/clientIP";
import { getEnv } from "@/configs/env";
import { hashPassword, comparePassword } from "@/utils/password";
import { TokenService } from "@/services/token.service";
import { storeVerifyToken, consumeVerifyToken, storeResetToken, consumeResetToken } from "@/services/authTokens.service";
import type { ObjectId } from "@/types/common.types";
import type { ClientInfo, MongoDuplicateKeyError } from "@/types/auth.types";

const SENSITIVE_FIELDS = [
    "password",
    "ipAddresses",
    "__v",
    "_id",
    "emailVerificationTokenHash",
    "emailVerificationTokenExpiresAt",
    "resetPasswordTokenHash",
    "resetPasswordTokenExpiresAt",
] as const;

const sanitizeUser = (user: object): Record<string, unknown> => {
    const sanitized = { ...(user as Record<string, unknown>) };
    for (const field of SENSITIVE_FIELDS) delete sanitized[field];
    return sanitized;
};

const getClientInfo = (req: Request): ClientInfo => {
    const clientIP = getClientIP(req);

    const ua = req.get("User-Agent") || "unknown";
    const userAgent = ua.length > 200 ? ua.slice(0, 200) + "..." : ua;

    return { clientIP, userAgent };
};

const isMongoDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError => {
    if (!error || typeof error !== "object") return false;
    return "code" in error && (error as { code?: unknown }).code === 11000;
};

export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedUsername = String(username).trim().toLowerCase();
        const { clientIP, userAgent } = getClientInfo(req);
        const deviceId = TokenService.getOrCreateDeviceId(req, res);

        const hashedPassword = await hashPassword(password);

        const newUser = new User({
            email: normalizedEmail,
            password: hashedPassword,
            username: normalizedUsername,
        });

        await newUser.save();
        const verifyToken = await storeVerifyToken(newUser._id.toString());

        await sendVerificationToken(newUser.username, newUser.email, verifyToken);
        await TokenService.generateTokensAndSetCookies(res, newUser._id as ObjectId, false, userAgent, clientIP, deviceId);

        sendSuccessResponse(res, SUCCESS_MESSAGES.USER_CREATED, {
            user: sanitizeUser(newUser.toObject()),
        });
    } catch (error) {
        if (isMongoDuplicateKeyError(error)) {
            const keyPattern = error.keyPattern || {};

            if ("email" in keyPattern) {
                sendErrorResponse(res, ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
                return;
            }

            if ("username" in keyPattern) {
                sendErrorResponse(res, ERROR_MESSAGES.USERNAME_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
                return;
            }

            sendErrorResponse(res, "Account already exists", HTTP_STATUS.CONFLICT);
            return;
        }

        req.log.error({ err: error }, "[SIGNUP] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { emailCode } = req.body;
        const user = await consumeVerifyToken(emailCode);
        if (!user) {
            sendErrorResponse(res, ERROR_MESSAGES.EXPIRED_VERIFICATION_CODE);
            return;
        }

        const existingRefreshToken = TokenService.extractRefreshToken(req);
        if (existingRefreshToken) {
            await TokenService.revokeRefreshToken(existingRefreshToken);
        }

        const { clientIP, userAgent } = getClientInfo(req);
        const deviceId = TokenService.getOrCreateDeviceId(req, res);
        await TokenService.generateTokensAndSetCookies(res, user._id as ObjectId, true, userAgent, clientIP, deviceId);

        await successfulVerificationEmail(user.username, user.email);

        sendSuccessResponse(res, SUCCESS_MESSAGES.EMAIL_VERIFIED, {
            user: sanitizeUser(user.toObject()),
        });
    } catch (error) {
        req.log.error({ err: error }, "[VERIFY_EMAIL] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

export const signin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;
        const { clientIP, userAgent } = getClientInfo(req);
        const deviceId = TokenService.getOrCreateDeviceId(req, res);

        res.locals.attemptEmail = email.toLowerCase();
        res.locals.clientIP = clientIP;

        const user = await UserQueryOptimizer.findByEmailForAuth(email);
        // Keep response timing close to the valid-user path to reduce username enumeration.
        const dummyPassword = "$2b$11$4p3K.aVOiYjP3HP6hBbrLulhwacAfdeHFZ0HLvbwwer7WhiHZ.X.S";

        if (!user) {
            await comparePassword(password, dummyPassword);
            res.locals.authenticationFailed = true;
            sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS);
            return next();
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            res.locals.authenticationFailed = true;
            sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS);
            return next();
        }

        if (!user.isVerified) {
            const newVerificationToken = await storeVerifyToken(user._id.toString());
            await sendVerificationToken(user.username, user.email, newVerificationToken);

            res.locals.authenticationFailed = false;
            sendErrorResponse(res, "Email not verified. A new verification code has been sent.", HTTP_STATUS.FORBIDDEN);
            return next();
        }

        res.locals.authenticationFailed = false;
        await UserQueryOptimizer.updateLoginInfo((user._id as ObjectId).toString(), clientIP, userAgent);
        await TokenService.generateTokensAndSetCookies(res, user._id as ObjectId, true, userAgent, clientIP, deviceId);

        sendSuccessResponse(res, SUCCESS_MESSAGES.SIGN_IN_SUCCESSFUL, {
            user: sanitizeUser(user.toObject() as Record<string, unknown>),
        });
        return next();
    } catch (error) {
        req.log.error({ err: error }, "[SIGNIN] Error");
        res.locals.authenticationFailed = true;
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        return next();
    }
};

export const signout = async (req: Request, res: Response): Promise<void> => {
    try {
        const refreshToken = TokenService.extractRefreshToken(req);
        if (refreshToken) await TokenService.revokeRefreshToken(refreshToken);

        if (req.tokenJti && req.tokenExp) {
            const remainingTtl = req.tokenExp - Date.now() / 1000;
            await TokenService.blockAccessToken(req.tokenJti, remainingTtl);
        }

        TokenService.clearTokenCookies(res);
        sendSuccessResponse(res, SUCCESS_MESSAGES.SIGN_OUT_SUCCESSFUL);
    } catch (error) {
        req.log.error({ err: error }, "[SIGNOUT] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_LINK_SENT);
            return;
        }

        const resetPasswordToken = await storeResetToken(user._id.toString());

        const { CLIENT_URL } = getEnv();
        const resetUrl = `${CLIENT_URL}/reset-password/${resetPasswordToken}`;
        await resetPasswordEmail(user.username, user.email, resetUrl);

        sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_LINK_SENT);
    } catch (error) {
        req.log.error({ err: error }, "[FORGOT_PASSWORD] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, password } = req.body;
        const userId = await consumeResetToken(token);
        if (!userId) {
            sendErrorResponse(res, ERROR_MESSAGES.EXPIRED_RESET_TOKEN);
            return;
        }

        const user = await User.findById(userId);

        if (!user) {
            sendErrorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            return;
        }

        user.password = await hashPassword(password);
        await user.save();
        await TokenService.revokeAllRefreshTokens(user._id as ObjectId);

        await passwordResetSuccessfulEmail(user.username, user.email);

        sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESSFUL);
    } catch (error) {
        req.log.error({ err: error }, "[RESET_PASSWORD] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

export const resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const normalizedEmail = String(email).trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user || user.isVerified) {
            sendSuccessResponse(res, SUCCESS_MESSAGES.OTP_RESENT);
            return;
        }

        const emailVerificationToken = await storeVerifyToken(user._id.toString());

        await sendVerificationToken(user.username, user.email, emailVerificationToken);

        sendSuccessResponse(res, SUCCESS_MESSAGES.OTP_RESENT);
    } catch (error) {
        req.log.error({ err: error }, "[RESEND_OTP] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

export const verifyAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.userId) {
            sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const refreshToken = TokenService.extractRefreshToken(req);

        if (!refreshToken) {
            TokenService.clearTokenCookies(res);
            sendErrorResponse(res, "No refresh token found", HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const { clientIP, userAgent } = getClientInfo(req);
        const deviceId = TokenService.getOrCreateDeviceId(req, res);
        const isRefreshTokenValid = await TokenService.isRefreshTokenValid(refreshToken, req.userId, userAgent, clientIP, deviceId);

        if (!isRefreshTokenValid) {
            TokenService.clearTokenCookies(res);
            sendErrorResponse(res, "Session has been revoked", HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            sendErrorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            return;
        }

        sendSuccessResponse(res, SUCCESS_MESSAGES.USER_FOUND, {
            user: sanitizeUser(user.toObject({ versionKey: false })),
        });
    } catch (error) {
        req.log.error({ err: error }, "[VERIFY_AUTH] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clientIP, userAgent } = getClientInfo(req);
        const deviceId = TokenService.getOrCreateDeviceId(req, res);
        const token = TokenService.extractRefreshToken(req);

        if (!token) {
            sendErrorResponse(res, "Refresh token not provided", HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const result = await TokenService.verifyAndConsumeRefreshToken(token, userAgent, clientIP, deviceId);

        if (!result) {
            TokenService.clearTokenCookies(res);
            sendErrorResponse(res, "Invalid or expired refresh token", HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        TokenService.setTokenCookies(res, result.newAccessToken, result.newRefreshToken, deviceId);

        sendSuccessResponse(res, "Tokens refreshed successfully", {
            accessToken: result.newAccessToken,
        });
    } catch (error) {
        req.log.error({ err: error }, "[REFRESH_TOKEN] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

export const revokeAllTokens = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.userId) {
            sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const success = await TokenService.revokeAllRefreshTokens(req.userId as unknown as ObjectId);

        if (!success) {
            sendErrorResponse(res, "Failed to revoke tokens", HTTP_STATUS.INTERNAL_SERVER_ERROR);
            return;
        }

        TokenService.clearTokenCookies(res);
        sendSuccessResponse(res, "All tokens revoked successfully");
    } catch (error) {
        req.log.error({ err: error }, "[REVOKE_ALL] Error");
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};
