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
            console.error(`[StepProcessor] Step ${stepId} not found, skipping`);
            return; // Don't throw - just skip this step
        }

        const execution = await prisma.execution.findUnique({
            where: { id: executionId },
            include: { session: true }
        });

        if (!execution) {
            // Execution might have been cancelled/deleted
            console.warn(`[StepProcessor] Execution ${executionId} not found, skipping step`);
            return;
        }

        // 2. Execute Logic (with error handling)
        try {
            await this.executeSending(step, execution);
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            console.error(`[StepProcessor] Step ${stepId} failed:`, errorMsg);

            // Log error to execution record for visibility
            await prisma.execution.update({
                where: { id: executionId },
                data: {
                    error: `Step ${step.order} (${step.type}) failed: ${errorMsg}`.substring(0, 500)
                }
            }).catch(e => console.error('[StepProcessor] Failed to update execution error:', e));

            // Continue to next step instead of retrying/crashing
        }

        // 3. Advance Flow (always advance, even on error, to prevent stuck executions)
        await flowEngine.completeStep(executionId, step.order);
    }

    private static async executeSending(step: Step, execution: Execution & { session: Session }) {
        const platform = execution.session.platform;
        const target = execution.session.identifier;
        const botId = execution.session.botId;

        console.log(`[StepProcessor] Executing step type ${step.type} for ${target} on ${platform}`);

        if (platform === Platform.WHATSAPP) {
            switch (step.type) {
                case 'TEXT':
                    await BaileysService.sendMessage(botId, target, { text: step.content || "" });
                    break;
                case 'IMAGE':
                    if (step.mediaUrl) {
                        await BaileysService.sendMessage(botId, target, { image: { url: step.mediaUrl }, caption: step.content || "" });
                    } else {
                        console.warn(`[StepProcessor] IMAGE step ${step.id} has no mediaUrl, skipping`);
                    }
                    break;
                case 'AUDIO':
                case 'PTT':
                    if (step.mediaUrl) {
                        await BaileysService.sendMessage(botId, target, { audio: { url: step.mediaUrl }, ptt: step.type === 'PTT' });
                    } else {
                        console.warn(`[StepProcessor] ${step.type} step ${step.id} has no mediaUrl, skipping`);
                    }
                    break;
                default:
                    console.warn(`[StepProcessor] Unsupported step type ${step.type} for WhatsApp`);
            }
        } else {
            // Fallback for other platforms (Telegram, etc.)
            console.log(`📡 [${platform}] Sending to ${target}: ${step.type}`);
        }
    }
}
