import { Redis } from "ioredis";

// Singleton Redis client for general usage (caching, state)
// Note: BullMQ requires its own dedicated connections, do not reuse this for Workers
const REDIS_URL = process.env['REDIS_URL'] || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL);

redis.on("error", (err) => {
    console.error("Global Redis Client Error", err);
});

redis.on("connect", () => {
    console.log("Global Redis Connected");
});
