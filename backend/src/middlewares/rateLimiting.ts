import { Request, Response, NextFunction } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import redis from "@/utils/redis";
import { TIMING_CONSTANTS, RATE_LIMIT_CONFIG } from "@/constants";


declare global {
    namespace Express {
        interface Request {
            rateLimit?: {
                limit: number;
                remaining: number;
                resetTime: Date;
            };
            clientIP?: string;
            userAgent?: string;
        }
    }
}

// Helper functions
const getClientIP = (req: Request): string => {
    return (
        (req.headers["cf-connecting-ip"] as string) ||
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        "unknown"
    );
};

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
    if (!limiter) return next();

    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    req.rateLimit = {
        limit,
        remaining,
        resetTime: new Date(reset),
    };

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
};

// Limiters definition
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
const rootLimiter = createLimiter("root", RATE_LIMIT_CONFIG.ROOT.requests, RATE_LIMIT_CONFIG.ROOT.window);
const healthLimiter = createLimiter("health", RATE_LIMIT_CONFIG.HEALTH_CHECK.requests, RATE_LIMIT_CONFIG.HEALTH_CHECK.window);
const scanLimiter = createLimiter("scan", RATE_LIMIT_CONFIG.ROUTE_SCANNING.requests, RATE_LIMIT_CONFIG.ROUTE_SCANNING.window);

// Rate limiting middleware
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
    const email = req.body?.email ?? "unknown";

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

export const rootRouteRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);

    await applyRateLimit(req, res, next, rootLimiter, ip, "Root route rate limit exceeded");
};

export const healthCheckRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);

    await applyRateLimit(req, res, next, healthLimiter, ip, "Health check rate limit exceeded");
};

export const routeScanningProtection = async (req: Request, res: Response, next: NextFunction) => {
    if (!scanLimiter) return next();

    const ip = getClientIP(req);
    const { success, reset } = await scanLimiter.limit(ip);

    if (!success) {
        // Throttle logs: only first N warnings per IP per hour
        if (redis) {
            const logKey = `scan-log:${ip}`;
            const logCount = await redis.incr(logKey);
            if (logCount === 1) await redis.expire(logKey, 3600); // 1 hour

            if (logCount <= RATE_LIMIT_CONFIG.SCAN_LOG_LIMIT) {
                console.warn(`🚨 Route scan detected | IP=${ip} | PATH=${req.originalUrl}`);
            }
        }

        return res.status(429).json({
            success: false,
            message: "Too many invalid route requests",
            retryAfter: Math.ceil((reset - Date.now()) / 1000),
        });
    }

    next();
};

// Progressively delays
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
        console.error("Progressive delay error:", error);
    }

    next();
};

// IP and User-Agent extraction and bot detection
export const ipSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const ua = (req.get("user-agent") || "").toLowerCase();

    req.clientIP = ip;
    req.userAgent = ua;

    const malicious = ["sqlmap", "nmap", "nikto", "masscan", "acunetix", "nessus", "dirbuster", "metasploit", "havij"];

    if (malicious.some((p) => ua.includes(p))) {
        console.warn(`🤖 Malicious UA blocked | IP=${ip} | UA=${ua}`);
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    next();
};

// Validate essential headers and size limits
export const requestValidation = (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "OPTIONS" && !req.get("user-agent")) {
        return res.status(400).json({ success: false, message: "Missing User-Agent" });
    }

    const size = Number(req.get("content-length") || 0);
    if (size > 1024 * 1024) {
        return res.status(413).json({ success: false, message: "Request too large" });
    }

    next();
};

// Set secure HTTP headers
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // HSTS header for HTTPS connections
    if (req.secure || req.get("x-forwarded-proto") === "https") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    next();
};

// Security related logging
export const securityLogger = (req: Request, _res: Response, next: NextFunction) => {
    if (req.rateLimit && req.rateLimit.remaining <= 2) {
        console.warn(`⚠️ High traffic | IP=${req.clientIP} | Path=${req.originalUrl} | Remaining=${req.rateLimit.remaining}`);
    }
    next();
};
