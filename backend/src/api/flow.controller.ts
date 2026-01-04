import { Elysia, t } from "elysia";
import { prisma } from "../services/postgres.service";
import { StepType } from "@prisma/client";

export const flowController = new Elysia({ prefix: "/flows" })
    .get("/", async ({ query }) => {
        const { botId } = query as { botId?: string };

        const flows = await prisma.flow.findMany({
            where: botId ? { botId } : undefined,
            include: {
                steps: {
                    orderBy: { order: "asc" }
                },
                triggers: true
            }
        });
        return flows;
    })
    .get("/:id", async ({ params: { id }, set }) => {
        const flow = await prisma.flow.findUnique({
            where: { id },
            include: {
                steps: { orderBy: { order: "asc" } },
                triggers: true
            }
        });
        if (!flow) {
            set.status = 404;
            return "Flow not found";
        }
        return flow;
    })
    .post("/", async ({ body, set }) => {
        const { botId, name, description, steps, triggers } = body as any;

        try {
            const flow = await prisma.flow.create({
                data: {
                    botId,
                    name,
                    description,
                    usageLimit: parseInt(body.usageLimit || 0),
                    cooldownMs: parseInt(body.cooldownMs || 0),
                    steps: {
                        create: (steps || []).map((s: any, index: number) => ({
                            type: (s.type as StepType),
                            content: s.content,
                            mediaUrl: s.mediaUrl,
                            delayMs: s.delayMs || 1000,
                            jitterPct: s.jitterPct ?? 10,
                            order: index
                        }))
                    },
                    triggers: {
                        create: (triggers || []).map((t: any) => ({
                            keyword: t.keyword,
                            matchType: t.matchType || 'CONTAINS',
                            scope: t.scope || 'INCOMING',
                            botId
                        }))
                    }
                },
                include: { steps: true, triggers: true }
            });
            return flow;
        } catch (e: any) {
            set.status = 500;
            return { error: `Failed to create flow: ${e.message}` };
        }
    })
    .put("/:id", async ({ params: { id }, body, set }) => {
        const { botId, name, description, steps, triggers } = body as any;

        try {
            // Atomic update: Delete old steps/triggers and create new ones
            const flow = await prisma.$transaction(async (tx) => {
                await tx.step.deleteMany({ where: { flowId: id } });
                await tx.trigger.deleteMany({ where: { flowId: id } });

                return tx.flow.update({
                    where: { id },
                    data: {
                        name,
                        description,
                        usageLimit: parseInt(body.usageLimit || 0),
                        cooldownMs: parseInt(body.cooldownMs || 0),
                        steps: {
                            create: (steps || []).map((s: any, index: number) => ({
                                type: (s.type as StepType),
                                content: s.content,
                                mediaUrl: s.mediaUrl,
                                delayMs: s.delayMs || 1000,
                                jitterPct: s.jitterPct ?? 10,
                                order: index
                            }))
                        },
                        triggers: {
                            create: (triggers || []).map((t: any) => ({
                                keyword: t.keyword,
                                matchType: t.matchType || 'CONTAINS',
                                scope: t.scope || 'INCOMING',
                                botId
                            }))
                        }
                    },
                    include: { steps: true, triggers: true }
                });
            });
            return flow;
        } catch (e: any) {
            set.status = 500;
            return { error: `Failed to update flow: ${e.message}` };
        }
    })
    .delete("/:id", async ({ params: { id }, set }) => {
        try {
            await prisma.flow.delete({ where: { id } });
            return { success: true };
        } catch (e) {
            set.status = 500;
            return { error: "Failed to delete flow" };
        }
    })
    .post("/import", async ({ body, set }) => {
        const { sourceFlowId, targetBotId } = body as { sourceFlowId: string, targetBotId: string };

        if (!sourceFlowId || !targetBotId) {
            set.status = 400;
            return { error: "Missing sourceFlowId or targetBotId" };
        }

        try {
            const sourceFlow = await prisma.flow.findUnique({
                where: { id: sourceFlowId },
                include: { steps: true, triggers: true }
            });

            if (!sourceFlow) {
                set.status = 404;
                return { error: "Source flow not found" };
            }

            const newFlow = await prisma.flow.create({
                data: {
                    botId: targetBotId,
                    name: `${sourceFlow.name} (Copy)`,
                    description: sourceFlow.description,
                    usageLimit: sourceFlow.usageLimit,
                    cooldownMs: sourceFlow.cooldownMs,
                    steps: {
                        create: sourceFlow.steps.map(s => ({
                            type: s.type,
                            content: s.content,
                            mediaUrl: s.mediaUrl,
                            delayMs: s.delayMs,
                            jitterPct: s.jitterPct,
                            order: s.order
                        }))
                    },
                    triggers: {
                        create: sourceFlow.triggers.map(t => ({
                            keyword: t.keyword,
                            matchType: t.matchType,
                            scope: t.scope,
                            botId: targetBotId
                        }))
                    }
                },
                include: { steps: true, triggers: true }
            });

            return newFlow;
        } catch (e: any) {
            set.status = 500;
            return { error: `Import failed: ${e.message}` };
        }
    });

