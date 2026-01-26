import { Request, Response, NextFunction } from "express";
import { TIMING_CONSTANTS } from "@/constants";
import redis from "@/utils/redis";

interface LockoutData {
    count: number;
    lockedUntil?: number;
    createdAt: number;
}

// Require Redis - no fallback
if (!redis) {
    throw new Error("❌ Redis is required for security features (lockout tracking)");
}

/**  Store helpers - Redis only **/
const getLockout = async (key: string): Promise<LockoutData | null> => {
    const data = await redis!.get<LockoutData>(`lockout:${key}`);
    if (!data) return null;

    if (data.lockedUntil && Date.now() > data.lockedUntil) {
        await redis!.del(`lockout:${key}`);
        return null;
    }

    return data;
};

const setLockout = async (key: string, data: Omit<LockoutData, "createdAt">, ttlMs: number) => {
    await redis!.set(`lockout:${key}`, { ...data, createdAt: Date.now() }, { px: ttlMs });
};

const clearLockout = async (key: string) => {
    await redis!.del(`lockout:${key}`);
};

const incrementFailure = async (key: string) => {
    const count = await redis!.incr(`fail:${key}`);
    if (count === 1) {
        await redis!.expire(`fail:${key}`, Math.floor(TIMING_CONSTANTS.FIFTEEN_MINUTES / 1000));
    }
    return count;
};

const clearFailures = async (key: string) => {
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
