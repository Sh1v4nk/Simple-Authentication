import type { Request, Response, NextFunction } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { getClientIP } from "@/utils/getClientIP";
import redis from "@/utils/redis";
import { getEnv } from "@/utils/envValidation";
import { TIMING_CONSTANTS } from "@/constants/timings";
import { RATE_LIMIT_CONFIG } from "@/constants/rateLimits";

let healthLimiter: Ratelimit | null | undefined;

const createLimiter = (name: string, requests: number, windowMs: number) => {
    if (!redis) return null;

    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, `${windowMs} ms`),
        prefix: `ratelimit:${name}`,
        analytics: false,
    });
};

const applyRateLimit = async (
    req: Request,
    res: Response,
    next: NextFunction,
    limiter: Ratelimit | null,
    identifier: string,
    message: string,
) => {
    // If Redis is unavailable, fail open — don't block legitimate traffic
    if (!limiter) return next();

    try {
        const { success, limit, remaining, reset } = await limiter.limit(identifier);

        req.rateLimit = { limit, remaining, resetTime: new Date(reset) };

        res.setHeader("RateLimit-Limit", limit.toString());
        res.setHeader("RateLimit-Remaining", remaining.toString());
        res.setHeader("RateLimit-Reset", Math.ceil(reset / 1000).toString());

        if (!success) {
            return res.status(429).json({
                success: false,
                message,
                retryAfter: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
            });
        }

        next();
    } catch (error) {
        // Redis failure — log and fail open rather than taking down all traffic
        req.log.error({ err: error }, "[RATE_LIMIT] Redis error, failing open");
        next();
    }
};

// Limiters
const generalLimiter = createLimiter("general", RATE_LIMIT_CONFIG.GENERAL.requests, RATE_LIMIT_CONFIG.GENERAL.window);
const authLimiter = createLimiter("auth", RATE_LIMIT_CONFIG.AUTH.requests, RATE_LIMIT_CONFIG.AUTH.window);
const passwordResetLimiter = createLimiter(
    "password-reset",
    RATE_LIMIT_CONFIG.PASSWORD_RESET.requests,
    RATE_LIMIT_CONFIG.PASSWORD_RESET.window,
);
const emailVerificationLimiter = createLimiter(
    "email-verify",
    RATE_LIMIT_CONFIG.EMAIL_VERIFICATION.requests,
    RATE_LIMIT_CONFIG.EMAIL_VERIFICATION.window,
);
const refreshTokenLimiter = createLimiter(
    "refresh-token",
    RATE_LIMIT_CONFIG.REFRESH_TOKEN.requests,
    RATE_LIMIT_CONFIG.REFRESH_TOKEN.window,
);
const scanLimiter = createLimiter("scan", RATE_LIMIT_CONFIG.ROUTE_SCANNING.requests, RATE_LIMIT_CONFIG.ROUTE_SCANNING.window);

const getHealthLimiter = (): Ratelimit | null => {
    if (healthLimiter !== undefined) return healthLimiter;

    const { INFRA_TIER } = getEnv();
    healthLimiter =
        INFRA_TIER === "free"
            ? null
            : createLimiter("health", RATE_LIMIT_CONFIG.HEALTH_CHECK.requests, RATE_LIMIT_CONFIG.HEALTH_CHECK.window);
    return healthLimiter;
};

export const generalRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    req.clientIP = ip;
    await applyRateLimit(req, res, next, generalLimiter, ip, "Too many requests");
};

export const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const email = String(req.body?.email || "unknown").toLowerCase();
    req.clientIP = ip;
    await applyRateLimit(req, res, next, authLimiter, `auth:${ip}:${email}`, "Too many authentication attempts");
};

export const passwordResetRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const email = String(req.body?.email || "unknown").toLowerCase();
    await applyRateLimit(req, res, next, passwordResetLimiter, `reset:${ip}:${email}`, "Too many password reset attempts");
};

export const emailVerificationRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    await applyRateLimit(req, res, next, emailVerificationLimiter, ip, "Too many email verification attempts");
};

export const refreshTokenRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    await applyRateLimit(req, res, next, refreshTokenLimiter, ip, "Too many refresh token requests");
};

export const healthCheckRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    await applyRateLimit(req, res, next, getHealthLimiter(), ip, "Too many requests");
};

export const routeScanningProtection = async (req: Request, res: Response, next: NextFunction) => {
    if (!scanLimiter) return next();

    const ip = getClientIP(req);

    try {
        const { success, reset } = await scanLimiter.limit(ip);

        if (!success) {
            // Throttle log spam — only log first N hits per IP per hour
            if (redis) {
                const logKey = `scan-log:${ip}`;
                try {
                    const logCount = await redis.incr(logKey);
                    if (logCount === 1) await redis.expire(logKey, 3600);
                    if (logCount <= RATE_LIMIT_CONFIG.SCAN_LOG_LIMIT) {
                        req.log.warn({ ip, path: req.originalUrl }, "[SCAN] Route scan detected");
                    }
                } catch {
                    // Log Redis failure but still block the request
                    req.log.warn({ ip, path: req.originalUrl }, "[SCAN] Route scan detected");
                }
            }

            return res.status(429).json({
                success: false,
                message: "Too many invalid route requests",
                retryAfter: Math.ceil((reset - Date.now()) / 1000),
            });
        }

        next();
    } catch (error) {
        req.log.error({ err: error }, "[SCAN] Redis error, failing open");
        next();
    }
};

// Adds artificial delay for IPs with repeated failures — slows brute force
// without locking the account
export const progressiveDelay = async (req: Request, _res: Response, next: NextFunction) => {
    if (!redis) return next();

    const ip = getClientIP(req);
    const key = `delay:${ip}`;
    const windowSeconds = Math.floor(TIMING_CONSTANTS.FIFTEEN_MINUTES / 1000);

    try {
        const hits = await redis.incr(key);
        if (hits === 1) await redis.expire(key, windowSeconds);

        if (hits > RATE_LIMIT_CONFIG.PROGRESSIVE_DELAY.threshold) {
            const delay = Math.min(
                (hits - RATE_LIMIT_CONFIG.PROGRESSIVE_DELAY.threshold) * RATE_LIMIT_CONFIG.PROGRESSIVE_DELAY.delayMs,
                RATE_LIMIT_CONFIG.PROGRESSIVE_DELAY.maxDelayMs,
            );
            await new Promise((r) => setTimeout(r, delay));
        }
    } catch (error) {
        req.log.error({ err: error }, "[PROGRESSIVE_DELAY] Redis error");
    }

    next();
};

export const ipSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const ua = (req.get("user-agent") || "").toLowerCase();

    req.clientIP = ip;
    req.userAgent = ua;

    const maliciousTools = ["sqlmap", "nmap", "nikto", "masscan", "acunetix", "nessus", "dirbuster", "metasploit", "havij"];

    if (maliciousTools.some((p) => ua.includes(p))) {
        req.log.warn({ ip }, "[SECURITY] Malicious UA blocked");
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    next();
};

// content-length check is intentionally kept here as an early rejection
// before the body parser even reads the stream — cheaper than letting
// express.json parse then reject
export const requestValidation = (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "OPTIONS" && !req.get("user-agent")) {
        return res.status(400).json({ success: false, message: "Missing User-Agent" });
    }

    const size = Number(req.get("content-length") || 0);
    if (size > 1024 * 100) {
        // 100kb — matches express.json limit in server.ts
        return res.status(413).json({ success: false, message: "Request too large" });
    }

    next();
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    if (req.secure || req.get("x-forwarded-proto") === "https") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    next();
};

export const securityLogger = (req: Request, _res: Response, next: NextFunction) => {
    // req.rateLimit is only set if a rate limiter ran before this — guard defensively
    if (req.rateLimit && req.rateLimit.remaining <= 2) {
        req.log.warn({ ip: req.clientIP, remaining: req.rateLimit.remaining, path: req.originalUrl }, "[RATE_LIMIT] Near limit");
    }
    next();
};
