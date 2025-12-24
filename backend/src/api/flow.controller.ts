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
                            matchType: t.matchType || 'CONTAINS'
                        }))
                    }
                },
                include: { steps: true, triggers: true }
            });
            return flow;
        } catch (e: any) {
            set.status = 500;
            return `Failed to create flow: ${e.message}`;
        }
    })
    .put("/:id", async ({ params: { id }, body, set }) => {
        const { name, description, steps, triggers } = body as any;

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
                                matchType: t.matchType || 'CONTAINS'
                            }))
                        }
                    },
                    include: { steps: true, triggers: true }
                });
            });
            return flow;
        } catch (e: any) {
            set.status = 500;
            return `Failed to update flow: ${e.message}`;
        }
    })
    .delete("/:id", async ({ params: { id }, set }) => {
        try {
            await prisma.flow.delete({ where: { id } });
            return { success: true };
        } catch (e) {
            set.status = 500;
            return "Failed to delete flow";
        }
    });

