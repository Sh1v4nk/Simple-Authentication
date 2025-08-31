export { verifyAuthToken } from "./verifyToken";
export { checkExistingUser } from "./checkExistingUser";

// Validation middleware (consolidated)
export { validateSignUp, validateSignIn, validateEmailCode, validateForgotPassword, validateResetPassword } from "./validationMiddleware";

// Rate limiting middleware
export {
    generalRateLimit,
    authRateLimit,
    passwordResetRateLimit,
    emailVerificationRateLimit,
    progressiveDelay,
    routeScanningProtection,
    rootRouteRateLimit,
    healthCheckRateLimit,
    adaptiveRateLimit,
    ipSecurityCheck,
    requestValidation,
    securityHeaders,
    securityLogger,
} from "./rateLimiting";

// Security middleware
export { authSecurity, honeypot, accountLockoutProtection, handleFailedLogin } from "./security";
