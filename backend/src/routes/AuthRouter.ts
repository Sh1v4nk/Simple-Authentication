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
    securityHeaders,
    requestValidation,
    securityLogger,
    ipSecurityCheck,
    refreshTokenRateLimit,
} from "@/middlewares";

const router = express.Router();

// Apply base security to all auth routes (order matters)
router.use(securityHeaders); // Security headers first
router.use(securityLogger); // Request logging
router.use(requestValidation); // Basic request validation
router.use(ipSecurityCheck); // IP and user-agent validation
router.use(authSecurity); // Auth-specific security
router.use(progressiveDelay); // Progressive delays
router.use(honeypot); // Bot detection

// Auth verification endpoint (minimal rate limiting for UX)
router.get("/verify-auth", verifyAuthToken, verifyAuth);

// Authentication endpoints with strict rate limiting
router.post("/signup", authRateLimit, validateSignUp, checkExistingUser, signup);

// Signin - remove handleFailedLogin since controller handles it internally
router.post("/signin", authRateLimit, accountLockoutProtection, validateSignIn, signin);

// Signout - requires authentication
router.post("/signout", verifyAuthToken, signout);

// Email verification endpoints
router.post("/verify-email", emailVerificationRateLimit, validateEmailCode, verifyEmail);
router.post("/resend-otp", emailVerificationRateLimit, verifyAuthToken, resendOTP);

// Password reset endpoints
router.post("/forgot-password", passwordResetRateLimit, validateForgotPassword, forgotPassword);
router.post("/reset-password/:token", passwordResetRateLimit, validateResetPassword, resetPassword);

// Token management endpoints - refresh needs different rate limiting
router.post("/refresh", refreshTokenRateLimit, refreshToken);
router.post("/revoke-all", verifyAuthToken, revokeAllTokens);

export default router;
