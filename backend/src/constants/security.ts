import { getEnv } from "@/configs/env";

export const SECURITY_CONSTANTS = {
    get SALT_ROUNDS() {
        return getEnv().SALT_ROUNDS;
    },
};

export const JWT_ALGORITHM = "HS256" as const;
export const RESET_TOKEN_BYTES = 32;
export const RESET_TOKEN_HEX_LENGTH = RESET_TOKEN_BYTES * 2;
