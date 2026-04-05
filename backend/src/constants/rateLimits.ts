import { TIMING_CONSTANTS } from "./timings";

export const RATE_LIMIT_CONFIG = {
    GENERAL: { requests: 100, window: TIMING_CONSTANTS.FIFTEEN_MINUTES },
    AUTH: { requests: 5, window: TIMING_CONSTANTS.FIFTEEN_MINUTES },
    PASSWORD_RESET: { requests: 3, window: TIMING_CONSTANTS.ONE_HOUR },
    VERIFY_CODE: { requests: 6, window: TIMING_CONSTANTS.FIVE_MINUTES },
    RESEND_OTP: { requests: 3, window: TIMING_CONSTANTS.FIFTEEN_MINUTES },

    REFRESH_TOKEN: { requests: 20, window: TIMING_CONSTANTS.FIFTEEN_MINUTES },
    ROUTE_SCANNING: { requests: 5, window: TIMING_CONSTANTS.ONE_HOUR },
    PROGRESSIVE_DELAY: { threshold: 3, delayMs: 500, maxDelayMs: 5000 },

    SCAN_LOG_LIMIT: 3,
    GLOBAL_LOGIN_ALERT_THRESHOLD: 20,
    GLOBAL_LOGIN_ALERT_WINDOW_SECONDS: 24 * 60 * 60,
};

export const LOCKOUT_CONFIG = {
    MIN_FAILURES_FOR_LOCKOUT: 3,
    TIERS: [
        { minFailures: 10, lockoutMinutes: 60 },
        { minFailures: 7, lockoutMinutes: 30 },
        { minFailures: 5, lockoutMinutes: 15 },
        { minFailures: 3, lockoutMinutes: 5 },
    ] as const,
};
