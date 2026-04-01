import type { Document } from "mongoose";

export interface IpAddressEntry {
    ip: string;
    lastUsed: Date;
    userAgent: string;
}

export interface IUser extends Document {
    email: string;
    password: string;
    username: string;
    lastLogin: Date;
    isVerified: boolean;
    ipAddresses: IpAddressEntry[];
    emailVerificationTokenHash?: string;
    emailVerificationTokenExpiresAt?: Date;
    resetPasswordTokenHash?: string;
    resetPasswordTokenExpiresAt?: Date;
    isLocked?: boolean;
}

export interface ISession extends Document {
    tokenHash: string;
    usedTokenHash: string | null;
    userId: string;
    familyId: string;
    isVerified: boolean;
    deviceId: string;
    userAgent: string;
    ip: string;
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
}
