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
const messageWorker = new Worker("messages", async (job) => {
    console.log(`Processing message job ${job.id}`, job.data);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    return { status: "sent", timestamp: Date.now() };
}, { connection: redis });

messageWorker.on("completed", (job) => {
    console.log(`Job ${job.id} has completed!`);
});

messageWorker.on("failed", (job, err) => {
    console.log(`Job ${job.id} has failed with ${err.message}`);
});

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
