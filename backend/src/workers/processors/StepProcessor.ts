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
                
                case 'CONDITIONAL_TIME':
                    await this.executeConditionalTime(botId, target, step);
                    break;

                default:
                    console.warn(`[StepProcessor] Unsupported step type ${step.type} for WhatsApp`);
            }
        } else {
            // Fallback for other platforms (Telegram, etc.)
            console.log(`📡 [${platform}] Sending to ${target}: ${step.type}`);
        }
    }

    private static async executeConditionalTime(botId: string, target: string, step: Step) {
        const metadata = step.metadata as any;
        if (!metadata || !Array.isArray(metadata.branches)) {
            console.warn(`[StepProcessor] CONDITIONAL_TIME step ${step.id} missing branches in metadata`);
            return;
        }

        // Get current time in Mexico City (or make configurable later)
        const now = new Date();
        const timeString = now.toLocaleTimeString("en-US", { 
            hour12: false, 
            hour: "2-digit", 
            minute: "2-digit",
            timeZone: "America/Mexico_City" 
        }); // Format "HH:mm" e.g., "09:30" or "14:05"

        // Helper to convert HH:mm to minutes for comparison
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const currentMinutes = toMinutes(timeString);
        let matchFound = false;

        console.log(`[StepProcessor] Conditional Time Check: Current ${timeString} (${currentMinutes}m)`);

        for (const branch of metadata.branches) {
            const start = toMinutes(branch.startTime);
            const end = toMinutes(branch.endTime);
            let isMatch = false;

            if (start < end) {
                // Standard range (e.g., 09:00 to 17:00)
                if (currentMinutes >= start && currentMinutes < end) {
                    isMatch = true;
                }
            } else {
                // Midnight crossing range (e.g., 22:00 to 06:00)
                // Match if we are AFTER start (22:00...23:59) OR BEFORE end (00:00...06:00)
                if (currentMinutes >= start || currentMinutes < end) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                console.log(`[StepProcessor] Matched Branch: ${branch.startTime} - ${branch.endTime}`);
                matchFound = true;
                
                // Execute the content of the branch
                const payload: any = {};
                if (branch.type === 'TEXT') {
                    payload.text = branch.content || "";
                } else if (branch.type === 'IMAGE' && branch.mediaUrl) {
                    payload.image = { url: branch.mediaUrl };
                    payload.caption = branch.content || "";
                } else if (branch.type === 'AUDIO' && branch.mediaUrl) {
                    payload.audio = { url: branch.mediaUrl };
                    payload.ptt = true; // Default to PTT for audio in conditional for now
                }

                if (Object.keys(payload).length > 0) {
                    await BaileysService.sendMessage(botId, target, payload);
                }
                break; // Stop after first match
            }
        }

        if (!matchFound && metadata.fallback) {
            console.log(`[StepProcessor] No time match found, executing fallback`);
            const fb = metadata.fallback;
            const payload: any = {};
            
            if (fb.type === 'TEXT') {
                payload.text = fb.content || "";
            } else if (fb.type === 'IMAGE' && fb.mediaUrl) {
                payload.image = { url: fb.mediaUrl };
                payload.caption = fb.content || "";
            } else if (fb.type === 'AUDIO' && fb.mediaUrl) {
                payload.audio = { url: fb.mediaUrl };
                payload.ptt = true;
            }

            if (Object.keys(payload).length > 0) {
                await BaileysService.sendMessage(botId, target, payload);
            }
        }
    }
}
