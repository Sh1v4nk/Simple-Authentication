import { Document } from "mongoose";

export interface IUser extends Document {
    email: string;
    password: string;
    username: string;
    lastLogin: Date;
    isVerified: boolean;
    resetPasswordToken?: string;
    resetPasswordTokenExpiresAt?: Date;
    emailVerificationToken?: string;
    emailVerificationTokenExpiresAt?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    ipAddresses: Array<{
        ip: string;
        lastUsed: Date;
        userAgent: string;
    }>;
    refreshTokens: Array<{
        token: string;
        createdAt: Date;
        expiresAt: Date;
        userAgent?: string;
        ipAddress?: string;
        isRevoked: boolean;
    }>;
    // Virtual properties
    isLocked?: boolean;
}

// Extend the Request interface
declare module "express-serve-static-core" {
    interface Request {
        userId?: string;
        rateLimitInfo?: {
            limit: number;
            remaining: number;
            reset: Date;
        };
        rateLimit?: {
            limit: number;
            remaining: number;
            resetTime: Date;
        };
    }
}
