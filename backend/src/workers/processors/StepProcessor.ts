import { Job } from "bullmq";
import { prisma } from "../../services/postgres.service";
import { flowEngine } from "../../core/flow";
import { Step, Execution, Session, Platform } from "@prisma/client";
import { BaileysService } from "../../services/baileys.service";

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
        const target = execution.session.identifier; // Use session identifier (remoteJid)
        const botId = execution.session.botId;

        console.log(`[StepProcessor] Executing step type ${step.type} for ${target} on ${platform}`);

        if (platform === Platform.WHATSAPP) {
            try {
                switch (step.type) {
                    case 'TEXT':
                        await BaileysService.sendMessage(botId, target, { text: step.content || "" });
                        break;
                    case 'IMAGE':
                        if (step.mediaUrl) {
                            await BaileysService.sendMessage(botId, target, { image: { url: step.mediaUrl }, caption: step.content || "" });
                        }
                        break;
                    case 'AUDIO':
                    case 'PTT':
                        if (step.mediaUrl) {
                            await BaileysService.sendMessage(botId, target, { audio: { url: step.mediaUrl }, ptt: step.type === 'PTT' });
                        }
                        break;
                    default:
                        console.warn(`[StepProcessor] Unsupported step type ${step.type} for WhatsApp`);
                }
            } catch (err) {
                console.error(`[StepProcessor] Failed to send WhatsApp message:`, err);
                throw err; // Retry job
            }
        } else {
            // Fallback for other platforms (Telegram, etc.)
            console.log(`📡 [${platform}] Simulation Sending to ${target}: ${step.type}`);
        }
    }
}
