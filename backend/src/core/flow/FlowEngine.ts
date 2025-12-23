import { prisma } from "../../services/postgres.service";
import { Message, Trigger } from "@prisma/client";
import { TriggerMatcher } from "../matcher/TriggerMatcher";
import { redis } from "../../services/redis.service";
import { queueService } from "../../services/queue.service";

/**
 * Orchestrates the lifecycle of Flow Executions.
 */
export class FlowEngine {

    /**
     * Analyzes an incoming message to see if it triggers any flow.
     * If user is already in a session, logic might differ (not implemented yet).
     */
    async processIncomingMessage(sessionId: string, message: Message) {
        if (!message.content) return;

        // 1. Fetch Session to get Bot Context
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { botId: true }
        });

        if (!session) {
            console.error(`[FlowEngine] Session ${sessionId} not found`);
            return;
        }

        // 2. Check Triggers (Session-Specific OR Global Bot Triggers)
        const activeTriggers = await prisma.trigger.findMany({
            where: {
                isActive: true,
                OR: [
                    { sessionId: sessionId },                   // Specific to this user session
                    { botId: session.botId, sessionId: null }   // Global for the bot
                ]
            },
            include: { flow: true } // Include flow to log name if matched
        });

        const match = TriggerMatcher.findMatch(message.content, activeTriggers);

        if (match) {
            console.log(`[FlowEngine] Matched Trigger '${match.trigger.keyword}' -> Flow ${match.trigger.flowId}`);
            await this.startFlow(match.trigger, message.sender, sessionId);
        }
    }

    /**
     * Initializes a new Flow Execution and schedules Step 0.
     */
    private async startFlow(trigger: Trigger, userId: string, sessionId: string) {
        console.log(`[FlowEngine] Starting flow ${trigger.flowId} for user ${userId}`);

        // Create tracking record
        const execution = await prisma.execution.create({
            data: {
                sessionId,
                flowId: trigger.flowId,
                platformUserId: userId,
                status: "RUNNING",
                currentStep: 0,
                variableContext: {} // Could inject captured regex groups here
            }
        });

        // Schedule the first step
        await this.scheduleStep(execution.id, 0);
    }

    /**
     * Pushes a job to the BullMQ queue to execute a specific step.
     * Calculates delay with Jitter.
     */
    async scheduleStep(executionId: string, stepOrder: number) {
        const execution = await prisma.execution.findUnique({
            where: { id: executionId },
            include: { flow: { include: { steps: true } } }
        });

        if (!execution || execution.status !== 'RUNNING') return;

        const step = execution.flow.steps.find(s => s.order === stepOrder);

        if (!step) {
            console.log(`[FlowEngine] Flow ${execution.flowId} finished.`);
            await prisma.execution.update({
                where: { id: executionId },
                data: { status: "COMPLETED", completedAt: new Date() }
            });
            return;
        }

        // Calculate Delay + Jitter
        const base = step.delayMs;
        const variance = (base * step.jitterPct) / 100;
        const jitter = Math.floor(Math.random() * (variance * 2 + 1)) - variance; // +/- variance
        const finalDelay = Math.max(0, base + jitter);

        console.log(`[FlowEngine] Scheduling Step ${step.order} in ${finalDelay}ms`);

        await queueService.scheduleStepExecution(executionId, step.id, finalDelay);
    }

    /**
     * Called by the Worker when a step is successfully processed.
     * Advances to the next step in the sequence.
     */
    async completeStep(executionId: string, currentStepOrder: number) {
        console.log(`[FlowEngine] Completing Step ${currentStepOrder} for Execution ${executionId}`);

        // Update DB (Optional: track per-step completion time or logs)
        // await prisma.executionStepLog.create(...) 

        // Schedule next
        await this.scheduleStep(executionId, currentStepOrder + 1);
    }
}
