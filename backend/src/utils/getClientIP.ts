import type { Request } from "express";

export const getClientIP = (req: Request): string => {
    const cfIP = req.headers["cf-connecting-ip"] as string | undefined;
    if (cfIP) return cfIP.trim();

    const raw = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
};
