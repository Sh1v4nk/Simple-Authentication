export const SECURITY_CONSTANTS = {
    SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || "10", 10),
};

export const RESET_TOKEN_BYTES = 32;
export const RESET_TOKEN_HEX_LENGTH = RESET_TOKEN_BYTES * 2; // 64
