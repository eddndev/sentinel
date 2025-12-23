import { Queue } from "bullmq";
import { redis } from "./redis.service";

export const QUEUE_NAME = "sentinel-message-queue";

class QueueService {
    private queue: Queue;

    constructor() {
        // Reuse the internal IORedis connection if possible, or let BullMQ handle it
        this.queue = new Queue(QUEUE_NAME, {
            connection: {
                url: process.env['REDIS_URL'] || "redis://localhost:6379"
            }
        });
    }

    async addIncomingMessage(messageId: string) {
        return this.queue.add("incoming", { messageId });
    }

    async scheduleStepExecution(executionId: string, stepId: string, delayMs: number) {
        return this.queue.add("execute_step", { executionId, stepId }, { delay: delayMs });
    }

    async close() {
        await this.queue.close();
    }
}

export const queueService = new QueueService();
