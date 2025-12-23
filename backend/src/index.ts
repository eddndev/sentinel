import { Elysia } from "elysia";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

// --- Configuration ---
const REDIS_URL = process.env['REDIS_URL'] || "redis://localhost:6379";
const PORT = process.env.PORT || 8080;

// --- Services ---
// Redis Connection
const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null // Required for BullMQ
});

redis.on("error", (err) => console.error("Redis Client Error", err));
redis.on("connect", () => console.log("Redis Connected"));

// --- Workers ---
import { startSentinelWorker } from "./workers/message.worker";
const worker = startSentinelWorker();

// --- API ---
import { webhookController } from "./api/webhook.controller";
import { uploadController } from "./api/upload.controller";
import { flowController } from "./api/flow.controller";
import { botController } from "./api/bot.controller";

import { cors } from "@elysiajs/cors";

const app = new Elysia()
    .use(cors())
    .use(webhookController)
    .use(uploadController)
    .use(flowController)
    .use(botController)
    .get("/", () => "Sentinel Orchestrator Active")
    .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
    .get("/info", () => ({
        service: "Sentinel",
        version: "1.0.0",
        redis: redis.status
    }))
    .listen({
        port: Number(PORT),
        hostname: '0.0.0.0'
    });

console.log(
    `🦊 Sentinel is running at ${app.server?.hostname}:${app.server?.port}`
);
