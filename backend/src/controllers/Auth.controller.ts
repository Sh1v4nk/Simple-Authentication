import type { Request, Response } from "express";
import type { ObjectId } from "mongoose";
import User from "@/models/UserModel";
import { sendSuccessResponse, sendErrorResponse } from "@/utils";
import { UserQueryOptimizer } from "@/utils/databaseOptimization";
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES, TIMING_CONSTANTS } from "@/constants";
import { hashPassword, comparePassword, generateEmailVerificationToken, generateResetPasswordToken, TokenService } from "@/utils/helpers";
import {
    sendVerificationToken,
    successfulVerificationEmail,
    resetPasswordEmail,
    passwordResetSuccessfulEmail,
} from "@/configs/NodeMailer/SendEmail";

/**
 * Extract client information from request with enhanced IP detection
 */
const getClientInfo = (req: Request) => {
    let clientIP = req.ip || req.socket?.remoteAddress || "unknown";
    // Clean up IPv6-mapped IPv4 addresses
    if (clientIP.startsWith("::ffff:")) {
        clientIP = clientIP.substring(7);
    }

    // Get User-Agent with reasonable length limit
    let userAgent = req.get("User-Agent") || "unknown";
    if (userAgent.length > 200) {
        userAgent = userAgent.substring(0, 200) + "...";
    }

    return { clientIP, userAgent };
};

/**
 * Sanitize user object for response (remove sensitive fields)
 */
const sanitizeUserForResponse = (user: any) => ({
    ...user,
    password: undefined,
    loginAttempts: undefined,
    lockUntil: undefined,
    ipAddresses: undefined,
    resetPasswordToken: undefined,
    resetPasswordTokenExpiresAt: undefined,
    emailVerificationToken: undefined,
    emailVerificationTokenExpiresAt: undefined,
});

/**
 * User Registration
 * Creates a new user account and sends email verification
 * @route POST /api/auth/signup
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;
        const { clientIP, userAgent } = getClientInfo(req);

        // Hash password and generate verification token
        const hashedPassword = await hashPassword(password);
        const emailVerificationToken = generateEmailVerificationToken();

        // Create new user
        const newUser = new User({
            email,
            password: hashedPassword,
            username,
            emailVerificationToken,
            emailVerificationTokenExpiresAt: new Date(Date.now() + TIMING_CONSTANTS.FIFTEEN_MINUTES),
        });

        // Generate authentication tokens
        await TokenService.generateTokensAndSetCookies(res, newUser._id as ObjectId, userAgent, clientIP);

        // Save user to database
        await newUser.save();

        // Send verification email
        await sendVerificationToken(newUser.username, newUser.email, emailVerificationToken);

        // Send success response
        sendSuccessResponse(res, SUCCESS_MESSAGES.USER_CREATED, {
            user: sanitizeUserForResponse(newUser.toObject()),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Signup error:", error);
    }
};

/**
 * Email Verification
 * Verifies user email using the verification token
 * @route POST /api/auth/verify-email
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { emailCode } = req.body;

        // Find user with valid verification token
        const user = await User.findOne({
            emailVerificationToken: emailCode,
            emailVerificationTokenExpiresAt: { $gt: Date.now() },
        });

        if (!user) {
            sendErrorResponse(res, ERROR_MESSAGES.EXPIRED_VERIFICATION_CODE);
            return;
        }

        // Mark user as verified and clear verification token
        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationTokenExpiresAt = undefined;
        await user.save();

        // Send success email notification
        await successfulVerificationEmail(user.username, user.email);

        // Send success response
        sendSuccessResponse(res, SUCCESS_MESSAGES.EMAIL_VERIFIED, {
            user: sanitizeUserForResponse(user.toObject()),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Email verification error:", error);
    }
};

/**
 * User Sign In
 * Authenticates user with email and password
 * @route POST /api/auth/signin
 */
export const signin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const { clientIP, userAgent } = getClientInfo(req);

        // Find user with optimized query (includes password)
        const user = await UserQueryOptimizer.findByEmailForAuth(email);
        const dummyPassword = "dummyPasswordForComparison"; // Timing attack protection

        // Handle user not found (with timing attack protection)
        if (!user) {
            await comparePassword(password, dummyPassword); // Prevent timing attacks
            res.locals.authenticationFailed = true; // Flag for middleware
            sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS);
            return;
        }

        // Check if account is locked (database-level check)
        if (user.lockUntil && user.lockUntil > new Date()) {
            const lockDuration = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000 / 60);
            res.locals.authenticationFailed = true; // Flag for middleware
            sendErrorResponse(res, `Account temporarily locked. Try again in ${lockDuration} minutes.`, HTTP_STATUS.LOCKED);
            return;
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            // Flag for middleware
            res.locals.authenticationFailed = true;

            // Handle failed login attempt (database-level)
            const allowMoreAttempts = await UserQueryOptimizer.incrementLoginAttempts(email);

            if (!allowMoreAttempts) {
                sendErrorResponse(res, ERROR_MESSAGES.ACCOUNT_LOCKED, HTTP_STATUS.LOCKED);
            } else {
                sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS);
            }
            return;
        }

        // Successful login - clear failure flag and update user info
        res.locals.authenticationFailed = false;
        await UserQueryOptimizer.updateLoginInfo((user._id as ObjectId).toString(), clientIP, userAgent);
        await TokenService.generateTokensAndSetCookies(res, user._id as ObjectId, userAgent, clientIP);

        // Send success response
        sendSuccessResponse(res, SUCCESS_MESSAGES.SIGN_IN_SUCCESSFUL, {
            user: sanitizeUserForResponse(user),
        });
    } catch (error: unknown) {
        res.locals.authenticationFailed = true; // Flag for middleware on errors
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Sign in error:", error);
    }
};

/**
 * User Sign Out
 * Revokes refresh token and clears cookies
 * @route POST /api/auth/signout
 */
export const signout = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract and revoke refresh token
        const refreshToken = TokenService.extractRefreshToken(req);

        if (refreshToken) {
            await TokenService.revokeRefreshToken(refreshToken);
        }

        // Clear authentication cookies
        TokenService.clearTokenCookies(res);

        sendSuccessResponse(res, SUCCESS_MESSAGES.SIGN_OUT_SUCCESSFUL);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Sign out error:", error);
    }
};

/**
 * Forgot Password
 * Generates and sends password reset link to user's email
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        // Prevent revealing whether the email exists
        if (!user) {
            sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_LINK_SENT);
            return;
        }

        // Generate reset token and set expiration
        user.resetPasswordToken = generateResetPasswordToken();
        user.resetPasswordTokenExpiresAt = new Date(Date.now() + TIMING_CONSTANTS.ONE_HOUR);

        await user.save();

        // Send password reset email
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${user.resetPasswordToken}`;
        await resetPasswordEmail(user.username, user.email, resetUrl);

        sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_LINK_SENT);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Forgot password error:", error);
    }
};

/**
 * Reset Password
 * Resets user password using the reset token
 * @route POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordTokenExpiresAt: { $gt: Date.now() },
        });

        if (!user) {
            sendErrorResponse(res, ERROR_MESSAGES.EXPIRED_RESET_TOKEN);
            return;
        }

        // Update password and clear reset token
        const hashedPassword = await hashPassword(password);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpiresAt = undefined;

        await user.save();

        // Send confirmation email
        await passwordResetSuccessfulEmail(user.username, user.email);

        sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESSFUL);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Reset password error:", error);
    }
};

/**
 * Verify Authentication Status
 * Verifies if user is authenticated and returns user info
 * @route GET /api/auth/verify
 */
export const verifyAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.userId) {
            sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const user = await User.findById(req.userId);

        if (!user) {
            sendErrorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            return;
        }

        // Send user data (without sensitive information)
        sendSuccessResponse(res, SUCCESS_MESSAGES.USER_FOUND, {
            user: sanitizeUserForResponse(user.toObject({ versionKey: false })),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Verify auth error:", error);
    }
};

/**
 * Resend OTP
 * Generates and sends a new email verification token
 * @route POST /api/auth/resend-otp
 */
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if user exists in request
        if (!req.userId) {
            sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        // Find user by ID
        const user = await User.findById(req.userId);

        if (!user) {
            sendErrorResponse(res, ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
            return;
        }

        // Generate new verification token
        const emailVerificationToken = generateEmailVerificationToken();
        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationTokenExpiresAt = new Date(Date.now() + TIMING_CONSTANTS.FIFTEEN_MINUTES);

        await user.save();

        // Send new verification email
        await sendVerificationToken(user.username, user.email, emailVerificationToken);

        sendSuccessResponse(res, SUCCESS_MESSAGES.OTP_RESENT);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Resend OTP error:", error);
    }
};

/**
 * Refresh Token
 * Generates new access token using refresh token
 * @route POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clientIP, userAgent } = getClientInfo(req);

        // Extract refresh token from request
        const refreshToken = TokenService.extractRefreshToken(req);

        if (!refreshToken) {
            sendErrorResponse(res, "Refresh token not provided", HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        // Verify and consume refresh token
        const result = await TokenService.verifyAndConsumeRefreshToken(refreshToken, userAgent, clientIP);

        if (!result) {
            sendErrorResponse(res, "Invalid or expired refresh token", HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        // Set new tokens in cookies
        TokenService.setTokenCookies(res, result.newAccessToken, result.newRefreshToken);

        sendSuccessResponse(res, "Tokens refreshed successfully", {
            accessToken: result.newAccessToken,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Token refresh error:", error);
    }
};

/**
 * Revoke All Tokens
 * Revokes all refresh tokens for the authenticated user
 * @route POST /api/auth/revoke-all
 */
export const revokeAllTokens = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if user is authenticated
        if (!req.userId) {
            sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_USER_ID, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const userId = req.userId as unknown as ObjectId;

        // Revoke all refresh tokens for the user
        const success = await TokenService.revokeAllRefreshTokens(userId);

        if (!success) {
            sendErrorResponse(res, "Failed to revoke tokens", HTTP_STATUS.INTERNAL_SERVER_ERROR);
            return;
        }

        // Clear cookies for current session
        TokenService.clearTokenCookies(res);

        sendSuccessResponse(res, "All tokens revoked successfully");
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
        sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        console.error("❌ Token revocation error:", error);
    }
};
