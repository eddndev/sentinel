import { Elysia } from "elysia";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

// --- Configuration ---
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const PORT = process.env.PORT || 8080;

// --- Services ---
// Redis Connection
const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null // Required for BullMQ
});

redis.on("error", (err) => console.error("Redis Client Error", err));
redis.on("connect", () => console.log("Redis Connected"));

// --- Workers ---
// --- Workers ---
import { startSentinelWorker } from "./workers/message.worker";
const worker = startSentinelWorker();

// --- API ---
const app = new Elysia()
    .get("/", () => "Sentinel Orchestrator Active")
    .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
    .get("/info", () => ({
        service: "Sentinel",
        version: "1.0.0",
        redis: redis.status
    }))
    .listen(PORT);

console.log(
    `🦊 Sentinel is running at ${app.server?.hostname}:${app.server?.port}`
);
