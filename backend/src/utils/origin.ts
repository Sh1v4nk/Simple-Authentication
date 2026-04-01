import type { Request } from "express";
import { getEnv } from "@/configs/env";

const PREVIEW_ORIGIN_PATTERN = /^https:\/\/authhub[a-z0-9-]*\.vercel\.app$/i;

export const getAllowedOrigins = (): string[] => {
    const env = getEnv();

    return [env.CLIENT_URL, ...(env.NODE_ENV !== "production" ? ["http://localhost:5173", "http://localhost:3000"] : [])].filter(
        Boolean,
    ) as string[];
};

export const isTrustedOrigin = (origin?: string | null): boolean => {
    if (!origin) return false;
    return getAllowedOrigins().includes(origin) || PREVIEW_ORIGIN_PATTERN.test(origin);
};

export const extractRequestOrigin = (req: Request): string | null => {
    const origin = req.get("Origin");
    if (origin) return origin;

    const referer = req.get("Referer");
    if (!referer) return null;

    try {
        return new URL(referer).origin;
    } catch {
        return null;
    }
};
