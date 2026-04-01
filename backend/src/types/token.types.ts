import type { JwtPayload } from "jsonwebtoken";

export interface TokenPayload {
    userId: string;
    type: "access";
    jti: string;
    isVerified: boolean;
}

export type AccessTokenClaims = Omit<JwtPayload, "jti" | "sub" | "exp"> &
    TokenPayload & {
        exp: number;
    };
