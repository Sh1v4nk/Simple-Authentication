import type { Request, Response, NextFunction } from "express";
import { TIMING_CONSTANTS } from "@/constants/timings";
import { RATE_LIMIT_CONFIG } from "@/constants/rateLimits";
import { getClientIP } from "@/utils/clientIP";
import redis from "@/configs/redis";
import type { LockoutData } from "@/types/security.types";
import { extractRequestOrigin, isTrustedOrigin } from "@/utils/origin";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const buildAttemptKey = (email: string, ip: string): string => `${ip}:${normalizeEmail(email)}`;

const requireRedis = (): NonNullable<typeof redis> => {
    if (!redis) throw new Error("[SECURITY] Redis is required but not connected");
    return redis;
};

const ATOMIC_RECORD_FAILED_LOGIN_SCRIPT = `
local failures = redis.call("INCR", KEYS[1])
if failures == 1 then
    redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
end

local globalAttempts = redis.call("INCR", KEYS[2])
if globalAttempts == 1 then
    redis.call("EXPIRE", KEYS[2], tonumber(ARGV[2]))
end

local lockMinutes = 0
if failures >= 10 then
    lockMinutes = 60
elseif failures >= 7 then
    lockMinutes = 30
elseif failures >= 5 then
    lockMinutes = 15
elseif failures >= 3 then
    lockMinutes = 5
end

if lockMinutes > 0 then
    local nowMs = tonumber(ARGV[3])
    local lockDurationMs = lockMinutes * 60 * 1000
    local lockoutPayload = cjson.encode({
        count = failures,
        lockedUntil = nowMs + lockDurationMs,
        createdAt = nowMs,
    })

    redis.call("SET", KEYS[3], lockoutPayload, "PX", lockDurationMs)
end

return { failures, globalAttempts, lockMinutes }
`;

const ATOMIC_CLEAR_LOGIN_STATE_SCRIPT = `
return redis.call("DEL", KEYS[1], KEYS[2])
`;

const toNumber = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
};

const parseLockoutData = (raw: unknown): LockoutData | null => {
    if (!raw) return null;

    try {
        const value = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!value || typeof value !== "object") return null;

        const data = value as Partial<LockoutData>;
        const count = toNumber(data.count);
        const createdAt = toNumber(data.createdAt || Date.now());

        const parsed: LockoutData = {
            count,
            createdAt,
        };

        if (data.lockedUntil !== undefined) {
            const lockedUntil = toNumber(data.lockedUntil);
            if (lockedUntil > 0) parsed.lockedUntil = lockedUntil;
        }

        return parsed;
    } catch {
        return null;
    }
};

const getLockout = async (key: string): Promise<LockoutData | null> => {
    const r = requireRedis();
    const raw = await r.get(`lockout:${key}`);
    return parseLockoutData(raw);
};

const recordFailedLogin = async (email: string, ip: string, reqLog: Request["log"]): Promise<void> => {
    const attemptKey = buildAttemptKey(email, ip);
    const r = requireRedis();
    const failKey = `fail:${attemptKey}`;
    const globalKey = `global-attempts:${normalizeEmail(email)}`;
    const lockoutKey = `lockout:${attemptKey}`;
    const rawResult = await r.eval(
        ATOMIC_RECORD_FAILED_LOGIN_SCRIPT,
        [failKey, globalKey, lockoutKey],
        [
            String(Math.floor(TIMING_CONSTANTS.FIFTEEN_MINUTES / 1000)),
            String(RATE_LIMIT_CONFIG.GLOBAL_LOGIN_ALERT_WINDOW_SECONDS),
            String(Date.now()),
        ],
    );

    const result = Array.isArray(rawResult) ? rawResult : [rawResult];
    const failures = toNumber(result[0]);
    const globalAttempts = toNumber(result[1]);

    if (globalAttempts === RATE_LIMIT_CONFIG.GLOBAL_LOGIN_ALERT_THRESHOLD) {
        reqLog.warn({ email: normalizeEmail(email), ip }, "[AUTH] Distributed attack suspected");
    }

    reqLog.warn({ failures, email: normalizeEmail(email), ip }, "[AUTH] Failed login attempt");
};

const clearLoginFailures = async (email: string, ip: string): Promise<void> => {
    const attemptKey = buildAttemptKey(email, ip);
    const r = requireRedis();

    await r.eval(ATOMIC_CLEAR_LOGIN_STATE_SCRIPT, [`fail:${attemptKey}`, `lockout:${attemptKey}`], []);
};

export const honeypot = (req: Request, res: Response, next: NextFunction) => {
    if (req.body?.website) {
        req.log.warn({ ip: getClientIP(req) }, "[HONEYPOT] Triggered");
        return res.status(200).json({ success: true });
    }
    delete req.body?.website;
    next();
};

export const enforceTrustedOriginForCookieAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
        next();
        return;
    }

    const origin = extractRequestOrigin(req);
    if (!isTrustedOrigin(origin)) {
        req.log.warn({ origin, ip: getClientIP(req), path: req.originalUrl }, "[CSRF] Untrusted origin blocked");
        res.status(403).json({ success: false, message: "Untrusted origin" });
        return;
    }

    next();
};

export const accountLockoutProtection = async (req: Request, res: Response, next: NextFunction) => {
    const email = req.body?.email ? normalizeEmail(String(req.body.email)) : "";
    if (!email || !req.path.includes("signin")) return next();

    const ip = getClientIP(req);

    try {
        const lockout = await getLockout(buildAttemptKey(email, ip));

        if (lockout?.lockedUntil && Date.now() < lockout.lockedUntil) {
            return res.status(423).json({
                success: false,
                message: "Account temporarily locked due to multiple failed login attempts.",
                lockedUntil: new Date(lockout.lockedUntil).toISOString(),
            });
        }

        next();
    } catch (error) {
        req.log.error({ err: error }, "[LOCKOUT] Redis error");
        next();
    }
};

export const handleFailedLogin = async (req: Request, res: Response, next: NextFunction) => {
    const email = res.locals.attemptEmail ? normalizeEmail(String(res.locals.attemptEmail)) : "";
    const authFailed = res.locals.authenticationFailed;

    if (!email) return next();

    const ip = typeof res.locals.clientIP === "string" ? res.locals.clientIP : getClientIP(req);

    try {
        if (authFailed) {
            await recordFailedLogin(email, ip, req.log);
        } else {
            await clearLoginFailures(email, ip);
        }
    } catch (error) {
        req.log.error({ err: error }, "[AUTH] Redis error in handleFailedLogin");
    }

    next();
};

export const authSecurity = (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Auth-Security", "enabled");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self';",
    );
    next();
};
