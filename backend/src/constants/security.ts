import { getEnv } from "@/utils/envValidation";

export const SECURITY_CONSTANTS = {
    get SALT_ROUNDS() {
        return getEnv().SALT_ROUNDS;
    },
};

export const RESET_TOKEN_BYTES = 32;
export const RESET_TOKEN_HEX_LENGTH = RESET_TOKEN_BYTES * 2; // 64
