import { Worker, Job } from "bullmq";
import { QUEUE_NAME } from "../services/queue.service";
import { StepProcessor } from "./processors/StepProcessor";

// Redis config is handled internally by QueueService/index usually, 
// but Workers need a connection definition.
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const startSentinelWorker = () => {
    console.log(`[Worker] Starting Sentinel Worker on queue: ${QUEUE_NAME}`);

    const worker = new Worker(
        QUEUE_NAME,
        async (job: Job) => {
            switch (job.name) {
                case "execute_step":
                    await StepProcessor.process(job);
                    break;
                case "incoming":
                    console.log("[Worker] Incoming message job (TODO)");
                    break;
                default:
                    console.warn(`[Worker] Unknown job name: ${job.name}`);
            }
            return { processed: true };
        },
        {
            connection: {
                url: REDIS_URL
            },
            concurrency: 50 // Parallel processing capacity
        }
    );

    worker.on("completed", (job) => {
        // console.log(`[Queue] Job ${job.id} (${job.name}) completed`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[Queue] Job ${job?.id} failed:`, err);
    });

    return worker;
};

