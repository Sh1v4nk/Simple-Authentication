import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import redis from "@/configs/redis";
import { getEnv } from "@/configs/env";
import { TIMING_CONSTANTS } from "@/constants/timings";
import { logger } from "@/configs/logger";
import { JWT_ALGORITHM } from "@/constants/security";
import type { ObjectId } from "@/types/common.types";
import type { TokenPayload } from "@/types/token.types";
import Session, { SESSION_TTL_MS, MAX_ACTIVE_SESSIONS } from "@/models/session.model";

export class TokenService {
    private static readonly ACCESS_EXPIRY_SECONDS = TIMING_CONSTANTS.FIFTEEN_MINUTES / 1000;
    private static readonly REFRESH_EXPIRY_SECONDS = SESSION_TTL_MS / 1000;
    private static readonly REFRESH_BYTES = 64;
    private static readonly RISK_THRESHOLD = 7;
    private static readonly SESSION_TOUCH_THRESHOLD_MS = TIMING_CONSTANTS.ONE_MINUTE;
    private static readonly DEVICE_COOKIE_NAME = "deviceId";

    private static get secret(): string {
        return getEnv().JWT_SECRET;
    }
    private static get issuer(): string {
        return getEnv().JWT_ISSUER;
    }
    private static get audience(): string {
        return getEnv().JWT_AUDIENCE;
    }

    private static getRedis(): NonNullable<typeof redis> {
        if (!redis) throw new Error("[TOKEN] Redis is required but not connected");
        return redis;
    }

    private static hashToken(raw: string): string {
        return crypto.createHash("sha256").update(raw).digest("hex");
    }

    private static generateRefreshToken(): { raw: string; hash: string } {
        const raw = crypto.randomBytes(this.REFRESH_BYTES).toString("hex");
        const hash = this.hashToken(raw);
        return { raw, hash };
    }

    private static createFamilyId(): string {
        return crypto.randomUUID();
    }

    private static expiresAt(): Date {
        return new Date(Date.now() + SESSION_TTL_MS);
    }

    private static now(): Date {
        return new Date();
    }

    private static getCookieSecurityOptions() {
        const isProd = getEnv().NODE_ENV === "production";
        const sameSite = isProd ? ("none" as const) : ("lax" as const);
        return { isProd, sameSite };
    }

    private static setDeviceCookie(res: Response, deviceId: string): void {
        const { isProd, sameSite } = this.getCookieSecurityOptions();
        res.cookie(this.DEVICE_COOKIE_NAME, deviceId, {
            httpOnly: true,
            secure: isProd,
            sameSite,
            path: "/",
            maxAge: this.REFRESH_EXPIRY_SECONDS * 1000,
        });
    }

    static getOrCreateDeviceId(req: Request, res: Response): string {
        const cookieValue = req.cookies?.[this.DEVICE_COOKIE_NAME];
        const existing = typeof cookieValue === "string" && cookieValue.length > 0 ? cookieValue : null;
        const deviceId = existing || crypto.randomUUID();
        this.setDeviceCookie(res, deviceId);
        return deviceId;
    }

    private static scoreRisk(
        session: { ip: string; userAgent: string; deviceId: string },
        reqIp?: string,
        reqUA?: string,
        reqDeviceId?: string,
    ): number {
        let risk = 0;
        if (session.ip && reqIp && session.ip !== reqIp) risk += 2;
        if (session.userAgent && reqUA && session.userAgent !== reqUA) risk += 3;
        if (session.deviceId && reqDeviceId && session.deviceId !== reqDeviceId) risk += 5;
        return risk;
    }

    private static async enforceSessionLimit(userId: string): Promise<void> {
        const sessions = await Session.find({ userId, usedTokenHash: null, expiresAt: { $gt: this.now() } }, { _id: 1, lastUsedAt: 1 })
            .sort({ lastUsedAt: 1 })
            .lean();

        if (sessions.length <= MAX_ACTIVE_SESSIONS) return;

        const pruneCount = sessions.length - MAX_ACTIVE_SESSIONS;
        const ids = sessions.slice(0, pruneCount).map((s) => s._id);

        await Session.deleteMany({ _id: { $in: ids } });

        logger.warn({ userId, pruned: pruneCount }, "[TOKEN] Session limit exceeded; oldest sessions pruned");
    }

    private static async handleReuseSignal(tokenHash: string): Promise<void> {
        const usedReceipt = await Session.findOne(
            { usedTokenHash: tokenHash, expiresAt: { $gt: this.now() } },
            { userId: 1, familyId: 1 },
        ).lean();

        if (!usedReceipt) return;

        logger.error({ userId: usedReceipt.userId, familyId: usedReceipt.familyId }, "[TOKEN] Refresh token reuse detected");
        await this.revokeSessionFamily(usedReceipt.userId, usedReceipt.familyId, "reuse-detected");
    }

    private static async revokeSessionFamily(userId: string, familyId: string, reason: string): Promise<void> {
        const result = await Session.deleteMany({ familyId });
        logger.warn({ userId, familyId, reason, revoked: result.deletedCount }, "[TOKEN] Session family revoked");
    }

    static generateAccessToken(userId: ObjectId, isVerified: boolean): string {
        const jti = crypto.randomBytes(16).toString("hex");
        return jwt.sign({ userId: userId.toString(), type: "access", jti, isVerified } as TokenPayload, this.secret, {
            algorithm: JWT_ALGORITHM,
            expiresIn: this.ACCESS_EXPIRY_SECONDS,
            audience: this.audience,
            issuer: this.issuer,
            subject: userId.toString(),
        });
    }

    static async blockAccessToken(jti: string, remainingTtlSeconds: number): Promise<void> {
        const ttl = Math.ceil(remainingTtlSeconds);
        if (ttl <= 0) {
            logger.debug({ jti }, "[TOKEN] Skipping access blocklist write: token already expired");
            return;
        }
        await this.getRedis().set(`access-block:${jti}`, 1, { ex: ttl });
    }

    static async isAccessTokenBlocked(jti: string): Promise<boolean> {
        return (await this.getRedis().get(`access-block:${jti}`)) !== null;
    }

    static async generateTokensAndSetCookies(
        res: Response,
        userId: ObjectId,
        isVerified: boolean,
        userAgent?: string,
        ip?: string,
        deviceId?: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const userIdStr = userId.toString();
        const refresh = this.generateRefreshToken();
        const familyId = this.createFamilyId();
        const resolvedDeviceId = deviceId || crypto.randomUUID();
        const now = new Date();

        await Session.create({
            tokenHash: refresh.hash,
            usedTokenHash: null,
            userId: userIdStr,
            familyId,
            isVerified,
            deviceId: resolvedDeviceId,
            userAgent: userAgent ?? "",
            ip: ip ?? "",
            lastUsedAt: now,
            expiresAt: this.expiresAt(),
        });

        await this.enforceSessionLimit(userIdStr);

        const accessToken = this.generateAccessToken(userId, isVerified);
        this.setTokenCookies(res, accessToken, refresh.raw, resolvedDeviceId);

        return { accessToken, refreshToken: refresh.raw };
    }

    static async verifyAndConsumeRefreshToken(
        refreshToken: string,
        userAgent?: string,
        ip?: string,
        deviceId?: string,
    ): Promise<{ userId: ObjectId; newAccessToken: string; newRefreshToken: string } | null> {
        const hash = this.hashToken(refreshToken);
        const now = this.now();

        // `findOneAndDelete` makes refresh rotation single-use without an extra lock in Redis.
        const session = await Session.findOneAndDelete({ tokenHash: hash, usedTokenHash: null, expiresAt: { $gt: now } });

        if (!session) {
            await this.handleReuseSignal(hash);
            return null;
        }

        const riskScore = this.scoreRisk(session, ip, userAgent, deviceId);
        if (riskScore >= this.RISK_THRESHOLD) {
            logger.warn(
                { userId: session.userId, familyId: session.familyId, riskScore, oldIp: session.ip, newIp: ip },
                "[TOKEN] High-risk refresh denied",
            );
            await this.revokeSessionFamily(session.userId, session.familyId, "high-risk-refresh");
            return null;
        }

        const fresh = this.generateRefreshToken();
        const exp = this.expiresAt();

        await Session.insertMany([
            {
                tokenHash: fresh.hash,
                usedTokenHash: null,
                userId: session.userId,
                familyId: session.familyId,
                isVerified: session.isVerified,
                deviceId: deviceId ?? session.deviceId,
                userAgent: userAgent ?? session.userAgent,
                ip: ip ?? session.ip,
                lastUsedAt: now,
                expiresAt: exp,
            },
            {
                // A separate receipt document lets replay detection revoke the whole family later.
                tokenHash: crypto.randomBytes(8).toString("hex"),
                usedTokenHash: hash,
                userId: session.userId,
                familyId: session.familyId,
                isVerified: session.isVerified,
                deviceId: session.deviceId,
                userAgent: session.userAgent,
                ip: session.ip,
                lastUsedAt: now,
                expiresAt: exp,
            },
        ]);

        const userId = new Types.ObjectId(session.userId);
        return {
            userId,
            newAccessToken: this.generateAccessToken(userId, session.isVerified),
            newRefreshToken: fresh.raw,
        };
    }

    static async revokeRefreshToken(refreshToken: string): Promise<boolean> {
        const hash = this.hashToken(refreshToken);
        const result = await Session.deleteOne({ tokenHash: hash, usedTokenHash: null });
        return result.deletedCount === 1;
    }

    static async revokeAllRefreshTokens(userId: ObjectId): Promise<boolean> {
        await Session.deleteMany({ userId: userId.toString() });
        return true;
    }

    static async isRefreshTokenValid(
        refreshToken: string,
        userId: string,
        userAgent?: string,
        ip?: string,
        deviceId?: string,
    ): Promise<boolean> {
        const hash = this.hashToken(refreshToken);
        const session = await Session.findOne({ tokenHash: hash, usedTokenHash: null, expiresAt: { $gt: this.now() } }).lean();

        if (!session) return false;
        if (session.userId !== userId) return false;
        const riskScore = this.scoreRisk(session, ip, userAgent, deviceId);
        if (riskScore >= this.RISK_THRESHOLD) {
            logger.warn({ userId, familyId: session.familyId, riskScore }, "[TOKEN] High-risk session check failed");
            await this.revokeSessionFamily(userId, session.familyId, "high-risk-verify-auth");
            return false;
        }

        const now = Date.now();
        const lastUsedMs = session.lastUsedAt instanceof Date ? session.lastUsedAt.getTime() : new Date(session.lastUsedAt).getTime();

        const nextDeviceId = deviceId || session.deviceId;
        const nextUA = userAgent || session.userAgent;
        const nextIp = ip || session.ip;

        const hasContextChange = nextDeviceId !== session.deviceId || nextUA !== session.userAgent || nextIp !== session.ip;
        const shouldTouch = hasContextChange || now - lastUsedMs >= this.SESSION_TOUCH_THRESHOLD_MS;

        if (shouldTouch) {
            // Sliding the session at most once per minute avoids a write on every authenticated request.
            await Session.updateOne(
                { tokenHash: hash },
                {
                    $set: {
                        lastUsedAt: new Date(now),
                        deviceId: nextDeviceId,
                        userAgent: nextUA,
                        ip: nextIp,
                        expiresAt: this.expiresAt(),
                    },
                },
            );
        }

        return true;
    }

    static setTokenCookies(res: Response, access: string, refresh: string, deviceId?: string): void {
        const { isProd, sameSite } = this.getCookieSecurityOptions();
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite,
            path: "/",
        } as const;

        res.cookie("accessToken", access, {
            ...cookieOptions,
            maxAge: this.ACCESS_EXPIRY_SECONDS * 1000,
        });

        res.cookie("refreshToken", refresh, {
            ...cookieOptions,
            maxAge: this.REFRESH_EXPIRY_SECONDS * 1000,
        });

        if (deviceId) this.setDeviceCookie(res, deviceId);
    }

    static clearTokenCookies(res: Response): void {
        const { isProd, sameSite } = this.getCookieSecurityOptions();
        const opts = { httpOnly: true, secure: isProd, sameSite, path: "/" };
        res.clearCookie("accessToken", opts);
        res.clearCookie("refreshToken", opts);
    }

    static extractAccessToken(req: Request): string | null {
        return req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "") || null;
    }

    static extractRefreshToken(req: Request): string | null {
        return req.cookies?.refreshToken || null;
    }
}
