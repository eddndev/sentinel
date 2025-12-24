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

// --- Baileys Init ---
import { prisma } from "./services/postgres.service";
import { BaileysService } from "./services/baileys.service";
import { Platform } from "@prisma/client";

// Reconnect WhatsApp Sessions
prisma.bot.findMany({ where: { platform: Platform.WHATSAPP } }).then(bots => {
    console.log(`[Init] Found ${bots.length} WhatsApp bots to reconnect...`);
    for (const bot of bots) {
        BaileysService.startSession(bot.id).catch(err => {
            console.error(`[Init] Failed to start session for ${bot.name}:`, err);
        });
    }
});

// --- API ---
import { webhookController } from "./api/webhook.controller";
import { uploadController } from "./api/upload.controller";
import { flowController } from "./api/flow.controller";
import { botController } from "./api/bot.controller";
import { triggerController } from "./api/trigger.controller";

import { cors } from "@elysiajs/cors";

const app = new Elysia()
    .use(cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: true
    }))
    .use(webhookController)
    .use(uploadController)
    .use(flowController)
    .use(botController)
    .use(triggerController)
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
