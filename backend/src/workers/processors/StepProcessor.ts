import { Job } from "bullmq";
import { prisma } from "../../services/postgres.service";
import { flowEngine } from "../../core/flow";
import { Step, Execution, Session } from "@prisma/client";

interface StepJobData {
    executionId: string;
    stepId: string;
}

export class StepProcessor {
    /**
     * Main entry point for processing the "execute_step" job.
     */
    static async process(job: Job<StepJobData>) {
        const { executionId, stepId } = job.data;

        console.log(`[StepProcessor] Processing Step ${stepId} for Execution ${executionId}`);

        // 1. Fetch Step Data
        const step = await prisma.step.findUnique({ where: { id: stepId } });
        if (!step) {
            throw new Error(`Step ${stepId} not found`);
        }

        const execution = await prisma.execution.findUnique({
            where: { id: executionId },
            include: { session: true }
        });

        if (!execution) {
            // Execution might have been cancelled/deleted
            return;
        }

        // 2. Execute Logic (Simulate Sending)
        await this.simulateSending(step, execution);

        // 3. Advance Flow
        await flowEngine.completeStep(executionId, step.order);
    }

    private static async simulateSending(step: Step, execution: Execution & { session: Session }) {
        const platform = execution.session.platform;
        const target = execution.platformUserId;

        switch (step.type) {
            case 'TEXT':
                console.log(`📡 [${platform}] Sending TEXT to ${target}: "${step.content}"`);
                break;
            case 'IMAGE':
                console.log(`📡 [${platform}] Sending IMAGE to ${target}: ${step.mediaUrl}`);
                break;
            case 'PTT':
                console.log(`🎙️ [${platform}] Sending VOICE NOTE to ${target} (Duration: 5s)`);
                break;
            default:
                console.log(`📡 [${platform}] Sending ${step.type} to ${target}`);
        }

        // Simulate network latency
        // await new Promise(r => setTimeout(r, 500));
    }
}
