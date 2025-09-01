import { Request, Response, NextFunction } from "express";
import { TIMING_CONSTANTS } from "@/constants";

// Memory-safe in-memory storage with size limits and TTL
interface LockoutData {
    count: number;
    lockedUntil?: number;
    createdAt: number;
}

class SafeMemoryStore {
    private store = new Map<string, LockoutData>();
    private readonly maxSize: number;
    private readonly defaultTTL: number;

    constructor(maxSize = 10000, defaultTTL = 24 * 60 * 60 * 1000) {
        // 24 hours TTL
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;

        // Cleanup every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    set(key: string, value: Omit<LockoutData, "createdAt">): void {
        // Prevent memory bloat
        if (this.store.size >= this.maxSize) {
            this.evictOldest();
        }

        this.store.set(key, {
            ...value,
            createdAt: Date.now(),
        });
    }

    get(key: string): LockoutData | undefined {
        const data = this.store.get(key);

        // Check if expired
        if (data && this.isExpired(data)) {
            this.store.delete(key);
            return undefined;
        }

        return data;
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    private isExpired(data: LockoutData): boolean {
        const now = Date.now();

        // Check TTL expiration
        if (now - data.createdAt > this.defaultTTL) {
            return true;
        }

        // Check lockout expiration
        if (data.lockedUntil && now > data.lockedUntil) {
            return true;
        }

        return false;
    }

    private evictOldest(): void {
        // Remove 10% of oldest entries when at capacity
        const entries = Array.from(this.store.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);

        const toRemove = Math.floor(entries.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
            this.store.delete(entries[i][0]);
        }
    }

    private cleanup(): void {
        let cleanedCount = 0;

        for (const [key, data] of this.store.entries()) {
            if (this.isExpired(data)) {
                this.store.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired lockout entries. Store size: ${this.store.size}`);
        }
    }

    getStats() {
        return {
            size: this.store.size,
            maxSize: this.maxSize,
            memoryUsage: `${Math.round((this.store.size / this.maxSize) * 100)}%`,
        };
    }
}

const failedAttempts = new SafeMemoryStore(5000, 60 * 60 * 1000); // 5K entries, 1 hour TTL
const accountLockouts = new SafeMemoryStore(10000, 24 * 60 * 60 * 1000); // 10K entries, 24 hour TTL

/**
 * Basic honeypot middleware to catch bots
 */
export const honeypot = (req: Request, res: Response, next: NextFunction) => {
    // Check if honeypot field exists and has content
    if (req.body && req.body.website && req.body.website.trim() !== "") {
        console.warn(`🍯 Bot detected - Honeypot filled by IP: ${req.ip}`);

        // Don't reveal it's a honeypot - just return success
        return res.status(200).json({
            success: true,
            message: "Registration successful",
        });
    }

    // Remove honeypot field before processing
    if (req.body && req.body.website) {
        delete req.body.website;
    }

    next();
};

/**
 * Account lockout protection - prevents brute force on specific accounts
 */
export const accountLockoutProtection = (req: Request, res: Response, next: NextFunction) => {
    const email = req.body.email?.toLowerCase();

    // Only apply to login attempts
    if (!email || !req.path.includes("signin")) {
        return next();
    }

    const lockoutData = accountLockouts.get(email);
    const now = Date.now();

    // Check if account is currently locked
    if (lockoutData && lockoutData.lockedUntil && now < lockoutData.lockedUntil) {
        const remainingTime = Math.ceil((lockoutData.lockedUntil - now) / 1000 / 60); // minutes

        return res.status(423).json({
            success: false,
            message: `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingTime} minutes.`,
            lockedUntil: new Date(lockoutData.lockedUntil).toISOString(),
        });
    }

    next();
};

/**
 * Handle failed login attempts
 * Express middleware to track failed login attempts after authentication
 */
export const handleFailedLogin = (req: Request, res: Response, next: NextFunction) => {
    const email = res.locals.attemptEmail;
    const authFailed = res.locals.authenticationFailed;

    if (email && authFailed) {
        const ip = req.ip || req.socket?.remoteAddress || "unknown";
        const normalizedEmail = email.toLowerCase();
        const now = Date.now();

        // Track IP-based failures
        const ipFailures = failedAttempts.get(ip) || { count: 0 };
        const updatedIpFailures = {
            count: ipFailures.count + 1,
            lockedUntil: now + TIMING_CONSTANTS.FIFTEEN_MINUTES, // 15 minutes
        };
        failedAttempts.set(ip, updatedIpFailures);

        // Track account-based failures
        const accountFailures = accountLockouts.get(normalizedEmail) || { count: 0 };

        // Progressive lockout times
        let lockoutMinutes = 5; // Start with 5 minutes
        if (accountFailures.count >= 10) {
            lockoutMinutes = 60; // 1 hour after 10 attempts
        } else if (accountFailures.count >= 5) {
            lockoutMinutes = 30; // 30 minutes after 5 attempts
        } else if (accountFailures.count >= 3) {
            lockoutMinutes = 15; // 15 minutes after 3 attempts
        }

        const updatedAccountFailures = {
            count: accountFailures.count + 1,
            lockedUntil: now + lockoutMinutes * 60 * 1000,
        };
        accountLockouts.set(normalizedEmail, updatedAccountFailures);

        console.warn(`🚨 Failed login attempt #${accountFailures.count} for ${normalizedEmail} from IP: ${ip}`);
    } else if (email && !authFailed) {
        // Success - clear any existing records
        const ip = req.ip || req.socket?.remoteAddress || "unknown";
        handleSuccessfulLogin(email, ip);
    }

    next();
};

/**
 * Handle successful login - reset failed attempts
 */
export const handleSuccessfulLogin = (email: string, ip: string) => {
    const normalizedEmail = email.toLowerCase();

    // Clear failed attempts on successful login
    accountLockouts.delete(normalizedEmail);
    failedAttempts.delete(ip);

    console.log(`✅ Successful login for ${normalizedEmail} from IP: ${ip}`);
};

/**
 * Enhanced security headers for authentication endpoints
 */
export const authSecurity = (req: Request, res: Response, next: NextFunction) => {
    // Prevent caching of authentication responses
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Additional security headers for auth
    res.setHeader("X-Auth-Security", "enabled");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Stricter CSP for auth endpoints
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self';"
    );

    next();
};
