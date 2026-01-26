import { Request, Response, NextFunction } from "express";
import { TIMING_CONSTANTS } from "@/constants";
import redis from "@/utils/redis";

interface LockoutData {
    count: number;
    lockedUntil?: number;
    createdAt: number;
}

/**  Safe in-memory fallback store **/
class SafeMemoryStore {
    private store = new Map<string, LockoutData>();
    private readonly maxSize: number;
    private readonly defaultTTL: number;

    constructor(maxSize = 10000, defaultTTL = 24 * 60 * 60 * 1000) {
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
    }

    get(key: string): LockoutData | null {
        const data = this.store.get(key);
        if (!data) return null;

        if (Date.now() - data.createdAt > this.defaultTTL) {
            this.store.delete(key);
            return null;
        }

        if (data.lockedUntil && Date.now() > data.lockedUntil) {
            this.store.delete(key);
            return null;
        }

        return data;
    }

    set(key: string, value: Omit<LockoutData, "createdAt">) {
        if (this.store.size >= this.maxSize) {
            const iterator = this.store.keys().next();
            if (!iterator.done) {
                this.store.delete(iterator.value);
            }
        }

        this.store.set(key, { ...value, createdAt: Date.now() });
    }

    delete(key: string) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}

/**  Safe in-memory stores **/
const memoryFailedAttempts = new SafeMemoryStore(5000, 60 * 60 * 1000);
const memoryAccountLockouts = new SafeMemoryStore(10000, 24 * 60 * 60 * 1000);

const useRedis = Boolean(redis);

/**  Store helpers **/
const getLockout = async (key: string): Promise<LockoutData | null> => {
    if (!useRedis) return memoryAccountLockouts.get(key);

    const data = await redis!.get<LockoutData>(`lockout:${key}`);
    if (!data) return null;

    if (data.lockedUntil && Date.now() > data.lockedUntil) {
        await redis!.del(`lockout:${key}`);
        return null;
    }

    return data;
};

const setLockout = async (key: string, data: Omit<LockoutData, "createdAt">, ttlMs: number) => {
    if (!useRedis) {
        memoryAccountLockouts.set(key, data);
        return;
    }

    await redis!.set(`lockout:${key}`, { ...data, createdAt: Date.now() }, { px: ttlMs });
};

const clearLockout = async (key: string) => {
    if (!useRedis) {
        memoryAccountLockouts.delete(key);
        return;
    }
    await redis!.del(`lockout:${key}`);
};

const incrementFailure = async (key: string) => {
    if (!useRedis) {
        const data = memoryFailedAttempts.get(key) || { count: 0, createdAt: Date.now() };
        memoryFailedAttempts.set(key, { count: data.count + 1 });
        return data.count + 1;
    }

    const count = await redis!.incr(`fail:${key}`);
    if (count === 1) {
        await redis!.expire(`fail:${key}`, Math.floor(TIMING_CONSTANTS.FIFTEEN_MINUTES / 1000));
    }
    return count;
};

const clearFailures = async (key: string) => {
    if (!useRedis) {
        memoryFailedAttempts.delete(key);
        return;
    }
    await redis!.del(`fail:${key}`);
};

/** Middlewares **/
export const honeypot = (req: Request, res: Response, next: NextFunction) => {
    if (req.body?.website) {
        console.warn(`🍯 Honeypot triggered by IP=${req.ip}`);
        return res.status(200).json({ success: true });
    }
    delete req.body?.website;
    next();
};

export const accountLockoutProtection = async (req: Request, res: Response, next: NextFunction) => {
    const email = req.body?.email?.toLowerCase();
    if (!email || !req.path.includes("signin")) return next();

    const lockout = await getLockout(email);
    if (lockout?.lockedUntil && Date.now() < lockout.lockedUntil) {
        return res.status(423).json({
            success: false,
            message: "Account temporarily locked due to multiple failed login attempts.",
            lockedUntil: new Date(lockout.lockedUntil).toISOString(),
        });
    }

    next();
};

export const handleFailedLogin = async (req: Request, res: Response, next: NextFunction) => {
    const email = res.locals.attemptEmail?.toLowerCase();
    const authFailed = res.locals.authenticationFailed;

    if (!email) return next();

    const ip = req.ip || "unknown";

    if (authFailed) {
        const failures = await incrementFailure(`${ip}:${email}`);

        let lockMinutes = 5;
        if (failures >= 10) lockMinutes = 60;
        else if (failures >= 5) lockMinutes = 30;
        else if (failures >= 3) lockMinutes = 15;

        await setLockout(email, { count: failures, lockedUntil: Date.now() + lockMinutes * 60 * 1000 }, 24 * 60 * 60 * 1000);

        console.warn(`🚨 Failed login ${failures}x | ${email} | IP=${ip}`);
    } else {
        await clearFailures(`${ip}:${email}`);
        await clearLockout(email);
        console.log(`✅ Successful login | ${email}`);
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

/**
 * Cleanup security stores on shutdown
 * (Memory only, Redis is TTL-based)
 */
export const cleanupSecurityStores = () => {
    if (!useRedis) {
        memoryFailedAttempts.clear();
        memoryAccountLockouts.clear();
    }
    console.log("✅ Security stores cleaned up");
};
