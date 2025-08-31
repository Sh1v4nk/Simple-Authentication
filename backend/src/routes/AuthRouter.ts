import express from "express";
import {
    signup,
    signin,
    signout,
    verifyEmail,
    forgotPassword,
    resetPassword,
    verifyAuth,
    resendOTP,
    refreshToken,
    revokeAllTokens,
} from "@/controllers/Auth.controller";

import {
    checkExistingUser,
    verifyAuthToken,
    validateSignUp,
    validateSignIn,
    validateEmailCode,
    validateForgotPassword,
    validateResetPassword,
    authRateLimit,
    passwordResetRateLimit,
    emailVerificationRateLimit,
    authSecurity,
    progressiveDelay,
    honeypot,
    accountLockoutProtection,
    handleFailedLogin,
} from "@/middlewares";

const router = express.Router();

// Apply enhanced security to all auth routes
router.use(authSecurity);
router.use(progressiveDelay);
router.use(honeypot);

// Auth verification endpoint (no rate limiting for this)
router.get("/verify-auth", verifyAuthToken, verifyAuth);

// Authentication endpoints with strict rate limiting
router.post("/signup", authRateLimit, validateSignUp, checkExistingUser, signup);
router.post("/signin", authRateLimit, accountLockoutProtection, validateSignIn, signin, handleFailedLogin);
router.post("/signout", signout);

// Email verification endpoints with specific rate limiting
router.post("/verify-email", emailVerificationRateLimit, validateEmailCode, verifyEmail);
router.post("/resend-otp", emailVerificationRateLimit, verifyAuthToken, resendOTP);

// Password reset endpoints with strict rate limiting
router.post("/forgot-password", passwordResetRateLimit, validateForgotPassword, forgotPassword);
router.post("/reset-password/:token", passwordResetRateLimit, validateResetPassword, resetPassword);

// Token management endpoints
router.post("/refresh", refreshToken);
router.post("/revoke-all", verifyAuthToken, revokeAllTokens);

export default router;
