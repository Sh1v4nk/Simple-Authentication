import { Redis } from "@upstash/redis";
import { logger } from "@/configs/logger";

let redis: Redis | null = null;

try {
    redis = Redis.fromEnv();
    logger.info("[REDIS] Client initialized");
} catch (_error) {
    logger.error("[REDIS] Failed to initialize — missing env vars");
}

const timeout = (ms: number): Promise<never> =>
    new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Redis ping timed out after ${ms}ms`)), ms);
    });

export const checkRedisHealth = async (timeoutMs = 1500): Promise<boolean> => {
    if (!redis) return false;

    try {
        await Promise.race([redis.ping(), timeout(timeoutMs)]);
        return true;
    } catch (error) {
        logger.error({ err: error }, "[REDIS] Health check failed");
        return false;
    }
};

export default redis;
