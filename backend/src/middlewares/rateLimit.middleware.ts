import type { Request, Response, NextFunction } from "express";
import { getClientIP } from "@/utils/clientIP";
import { TIMING_CONSTANTS } from "@/constants/timings";
import { RATE_LIMIT_CONFIG } from "@/constants/rateLimits";

interface SlidingWindowEntry {
    timestamps: number[];
    lastCleanup: number;
}

class InMemoryRateLimiter {
    private readonly windows = new Map<string, SlidingWindowEntry>();
    private readonly maxRequests: number;
    private readonly windowMs: number;
    private readonly prefix: string;
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(prefix: string, maxRequests: number, windowMs: number) {
        this.prefix = prefix;
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;

        // Periodic cleanup of expired entries to prevent memory leaks
        this.cleanupTimer = setInterval(() => this.cleanup(), Math.max(windowMs * 2, 60_000));
        this.cleanupTimer.unref();
    }

    limit(identifier: string): { success: boolean; limit: number; remaining: number; reset: number } {
        const key = `${this.prefix}:${identifier}`;
        const now = Date.now();
        const windowStart = now - this.windowMs;

        let entry = this.windows.get(key);
        if (!entry) {
            entry = { timestamps: [], lastCleanup: now };
            this.windows.set(key, entry);
        }

        // Remove expired timestamps
        entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
        entry.lastCleanup = now;

        const remaining = Math.max(0, this.maxRequests - entry.timestamps.length);
        const reset = entry.timestamps.length > 0 ? entry.timestamps[0]! + this.windowMs : now + this.windowMs;

        if (entry.timestamps.length >= this.maxRequests) {
            return { success: false, limit: this.maxRequests, remaining: 0, reset };
        }

        entry.timestamps.push(now);
        return { success: true, limit: this.maxRequests, remaining: remaining - 1, reset };
    }

    private cleanup(): void {
        const now = Date.now();
        const cutoff = now - this.windowMs * 2;

        for (const [key, entry] of this.windows) {
            if (entry.lastCleanup < cutoff) {
                this.windows.delete(key);
            }
        }
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.windows.clear();
    }
}

class InMemoryCounter {
    private readonly counters = new Map<string, { count: number; expiresAt: number }>();
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(cleanupIntervalMs = 60_000) {
        this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
        this.cleanupTimer.unref();
    }

    increment(key: string, windowMs: number): number {
        const now = Date.now();
        const existing = this.counters.get(key);

        if (existing && existing.expiresAt > now) {
            existing.count += 1;
            return existing.count;
        }

        this.counters.set(key, { count: 1, expiresAt: now + windowMs });
        return 1;
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.counters) {
            if (entry.expiresAt <= now) {
                this.counters.delete(key);
            }
        }
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.counters.clear();
    }
}

const generalLimiter = new InMemoryRateLimiter("general", RATE_LIMIT_CONFIG.GENERAL.requests, RATE_LIMIT_CONFIG.GENERAL.window);
const authLimiter = new InMemoryRateLimiter("auth", RATE_LIMIT_CONFIG.AUTH.requests, RATE_LIMIT_CONFIG.AUTH.window);
const passwordResetLimiter = new InMemoryRateLimiter(
    "password-reset",
    RATE_LIMIT_CONFIG.PASSWORD_RESET.requests,
    RATE_LIMIT_CONFIG.PASSWORD_RESET.window,
);
const verifyCodeLimiter = new InMemoryRateLimiter(
    "verify-code",
    RATE_LIMIT_CONFIG.VERIFY_CODE.requests,
    RATE_LIMIT_CONFIG.VERIFY_CODE.window,
);
const resendOtpLimiter = new InMemoryRateLimiter("resend-otp", RATE_LIMIT_CONFIG.RESEND_OTP.requests, RATE_LIMIT_CONFIG.RESEND_OTP.window);
const refreshTokenLimiter = new InMemoryRateLimiter(
    "refresh-token",
    RATE_LIMIT_CONFIG.REFRESH_TOKEN.requests,
    RATE_LIMIT_CONFIG.REFRESH_TOKEN.window,
);
const scanLimiter = new InMemoryRateLimiter("scan", RATE_LIMIT_CONFIG.ROUTE_SCANNING.requests, RATE_LIMIT_CONFIG.ROUTE_SCANNING.window);

const delayCounter = new InMemoryCounter();
const scanLogCounter = new InMemoryCounter();

const applyRateLimit = (
    req: Request,
    res: Response,
    next: NextFunction,
    limiter: InMemoryRateLimiter,
    identifier: string,
    message: string,
) => {
    const { success, limit, remaining, reset } = limiter.limit(identifier);

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
};

export const generalRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    req.clientIP = ip;
    applyRateLimit(req, res, next, generalLimiter, ip, "Too many requests");
};

export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const email = String(req.body?.email || "unknown").toLowerCase();
    req.clientIP = ip;
    applyRateLimit(req, res, next, authLimiter, `auth:${ip}:${email}`, "Too many authentication attempts");
};

export const passwordResetRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const email = String(req.body?.email || "unknown").toLowerCase();
    applyRateLimit(req, res, next, passwordResetLimiter, `reset:${ip}:${email}`, "Too many password reset attempts");
};

export const verifyCodeRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    applyRateLimit(req, res, next, verifyCodeLimiter, ip, "Too many verification attempts");
};

export const resendOtpRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    applyRateLimit(req, res, next, resendOtpLimiter, ip, "Too many OTP requests");
};

export const refreshTokenRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    applyRateLimit(req, res, next, refreshTokenLimiter, ip, "Too many refresh token requests");
};

export const routeScanningProtection = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const { success, reset } = scanLimiter.limit(ip);

    if (!success) {
        const logCount = scanLogCounter.increment(`scan-log:${ip}`, TIMING_CONSTANTS.ONE_HOUR);
        if (logCount <= RATE_LIMIT_CONFIG.SCAN_LOG_LIMIT) {
            req.log.warn({ ip, path: req.originalUrl }, "[SCAN] Route scan detected");
        }

        return res.status(429).json({
            success: false,
            message: "Too many invalid route requests",
            retryAfter: Math.ceil((reset - Date.now()) / 1000),
        });
    }

    next();
};

export const progressiveDelay = async (req: Request, _res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const hits = delayCounter.increment(`delay:${ip}`, TIMING_CONSTANTS.FIFTEEN_MINUTES);

    if (hits > RATE_LIMIT_CONFIG.PROGRESSIVE_DELAY.threshold) {
        const delay = Math.min(
            (hits - RATE_LIMIT_CONFIG.PROGRESSIVE_DELAY.threshold) * RATE_LIMIT_CONFIG.PROGRESSIVE_DELAY.delayMs,
            RATE_LIMIT_CONFIG.PROGRESSIVE_DELAY.maxDelayMs,
        );
        await new Promise((r) => setTimeout(r, delay));
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

export const requestValidation = (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "OPTIONS" && !req.get("user-agent")) {
        return res.status(400).json({ success: false, message: "Missing User-Agent" });
    }

    const size = Number(req.get("content-length") || 0);
    if (size > 1024 * 100) {
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
    if (req.rateLimit && req.rateLimit.remaining <= 2) {
        req.log.warn({ ip: req.clientIP, remaining: req.rateLimit.remaining, path: req.originalUrl }, "[RATE_LIMIT] Near limit");
    }
    next();
};
