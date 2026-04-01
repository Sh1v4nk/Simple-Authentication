import type { Redis } from "@upstash/redis";

const INCR_WITH_TTL_SCRIPT = `
local key = KEYS[1]
local ttlSeconds = tonumber(ARGV[1])
local count = redis.call("INCR", key)

if count == 1 then
    redis.call("EXPIRE", key, ttlSeconds)
end

return count
`;

const parseInteger = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
};

export const incrWithTtl = async (r: Redis, key: string, ttlSeconds: number): Promise<number> => {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    const result = await r.eval(INCR_WITH_TTL_SCRIPT, [key], [String(ttl)]);
    return parseInteger(result);
};
