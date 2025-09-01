export const SECURITY_CONSTANTS = {
    SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || "10", 10),
};

export const TIMING_CONSTANTS = {
    ONE_MINUTE: 1 * 60 * 1000, // 1 minute in milliseconds
    FIFTEEN_MINUTES: 15 * 60 * 1000, // 15 minutes in milliseconds
    ONE_HOUR: 1 * 60 * 60 * 1000, // 1 hour in milliseconds
    SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};
