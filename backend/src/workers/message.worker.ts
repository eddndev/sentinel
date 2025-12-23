import { Worker, Job } from "bullmq";
import { redis } from "../services/redis.service";

// Note: BullMQ workers require a separate Redis connection or specific config.
// For simplicity in this scaffold we reuse connection config but create new instance internally by BullMQ if IO options not passed.

const QUEUE_NAME = "messages";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const startMessageWorker = () => {
    const worker = new Worker(
        QUEUE_NAME,
        async (job: Job) => {
            console.log(`[Worker] Processing job ${job.id}:`, job.data);

            // Simulate heavy processing
            await new Promise(resolve => setTimeout(resolve, 100));

            return { processed: true };
        },
        {
            connection: {
                url: REDIS_URL
            }
        }
    );

    worker.on("completed", (job) => {
        console.log(`[Worker] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[Worker] Job ${job.id} failed:`, err);
    });

    return worker;
};
