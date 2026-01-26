export const SECURITY_CONSTANTS = {
    SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || "10", 10),
};

export const TIMING_CONSTANTS = {
    ONE_MINUTE: 1 * 60 * 1000, // 1 minute in milliseconds
    FIVE_MINUTES: 5 * 60 * 1000, // 5 minutes in milliseconds
    FIFTEEN_MINUTES: 15 * 60 * 1000, // 15 minutes in milliseconds
    ONE_HOUR: 1 * 60 * 60 * 1000, // 1 hour in milliseconds
    SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export const RATE_LIMIT_CONFIG = {
    GENERAL: { requests: 100, window: TIMING_CONSTANTS.FIFTEEN_MINUTES },
    AUTH: { requests: 5, window: TIMING_CONSTANTS.FIFTEEN_MINUTES },
    PASSWORD_RESET: { requests: 3, window: TIMING_CONSTANTS.ONE_HOUR },
    EMAIL_VERIFICATION: { requests: 3, window: TIMING_CONSTANTS.FIVE_MINUTES },
    REFRESH_TOKEN: { requests: 20, window: TIMING_CONSTANTS.FIFTEEN_MINUTES },
    ROOT: { requests: 3, window: TIMING_CONSTANTS.ONE_HOUR },
    HEALTH_CHECK: { requests: 60, window: TIMING_CONSTANTS.FIFTEEN_MINUTES },
    ROUTE_SCANNING: { requests: 5, window: TIMING_CONSTANTS.ONE_HOUR },
    PROGRESSIVE_DELAY: { threshold: 5, delayMs: 500, maxDelayMs: 5000 },
    SCAN_LOG_LIMIT: 3, // Max log entries per IP per hour
};
