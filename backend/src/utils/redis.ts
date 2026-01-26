import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

try {
    redis = Redis.fromEnv();
    console.log("✅ Redis client initialized");
} catch (error) {
    console.error("❌ Failed to initialize Redis:", error);
    throw new Error("❌ Redis is REQUIRED - please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
}

export default redis;
