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
} from "@/controllers/auth.controller";
import { verifyAuthToken, requireVerified, attachAuthContextIfPresent, verifyAccessTokenSignature } from "@/middlewares/auth.middleware";
import { checkExistingUser } from "@/middlewares/existingUser.middleware";
import {
    validateSignUp,
    validateSignIn,
    validateEmailCode,
    validateForgotPassword,
    validateResetPassword,
} from "@/middlewares/validation.middleware";
import {
    authRateLimit,
    passwordResetRateLimit,
    emailVerificationRateLimit,
    progressiveDelay,
    securityHeaders,
    requestValidation,
    securityLogger,
    ipSecurityCheck,
    refreshTokenRateLimit,
} from "@/middlewares/rateLimit.middleware";
import {
    authSecurity,
    honeypot,
    accountLockoutProtection,
    handleFailedLogin,
    enforceTrustedOriginForCookieAuth,
} from "@/middlewares/security.middleware";

const router = express.Router();

router.use(securityHeaders);
router.use(requestValidation);
router.use(ipSecurityCheck);
router.use(authSecurity);
router.use(securityLogger);
router.use(enforceTrustedOriginForCookieAuth);

router.get("/verify-auth", verifyAccessTokenSignature, verifyAuth);

router.post("/signup", authRateLimit, progressiveDelay, honeypot, validateSignUp, checkExistingUser, signup);
router.post("/signin", authRateLimit, progressiveDelay, accountLockoutProtection, validateSignIn, signin, handleFailedLogin);
router.post("/signout", attachAuthContextIfPresent, signout);

router.post("/verify-email", emailVerificationRateLimit, validateEmailCode, verifyEmail);
router.post("/resend-otp", emailVerificationRateLimit, validateForgotPassword, resendOTP);

router.post("/forgot-password", passwordResetRateLimit, progressiveDelay, validateForgotPassword, forgotPassword);
router.post("/reset-password/:token", passwordResetRateLimit, progressiveDelay, validateResetPassword, resetPassword);

router.post("/refresh", refreshTokenRateLimit, refreshToken);
router.post("/revoke-all", verifyAuthToken, requireVerified, revokeAllTokens);

export default router;
