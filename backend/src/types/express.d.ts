import type { Logger } from "pino";

declare module "express-serve-static-core" {
    interface Request {
        userId?: string;
        tokenJti?: string;
        tokenExp?: number;
        tokenIsVerified?: boolean;
        rateLimit?: {
            limit: number;
            remaining: number;
            resetTime: Date;
        };
        clientIP?: string;
        userAgent?: string;
        requestId?: string;
        log: Logger;
    }
}

export {};
