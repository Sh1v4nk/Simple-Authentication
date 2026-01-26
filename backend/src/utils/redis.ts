import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

try {
    redis = Redis.fromEnv();
    console.log("✅ Redis client initialized");
} catch {
    if (process.env.NODE_ENV === "production") {
        throw new Error("❌ Redis is required for rate limiting in production");
    }
    console.warn("⚠️ Redis not configured, rate limiting disabled (dev only)");
}

export default redis;
