import { Elysia, t } from "elysia";
import { prisma } from "../services/postgres.service";

export const executionController = new Elysia({ prefix: "/executions" })
    .get("/", async ({ query, set }) => {
        const {
            botId,
            status,
            search,
            startDate,
            endDate,
            limit,
            offset
        } = query as {
            botId?: string;
            status?: string;
            search?: string;
            startDate?: string;
            endDate?: string;
            limit?: string;
            offset?: string;
        };

        if (!botId) {
            set.status = 400;
            return { error: "botId is required" };
        }

        const where: any = {
            botId: botId // Indirectly filter via Flow or ensure Session belongs to Bot? 
            // Execution has flowId, Flow has botId. 
            // Also Execution has sessionId, Session has botId.
            // Let's filter via flow->botId for now as it's cleaner.
        };

        // Actually, schema says Execution -> Flow. Flow -> Bot.
        // So where: { flow: { botId } }
        where.flow = { botId };

        if (status && status !== 'ALL') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { platformUserId: { contains: search, mode: 'insensitive' } },
                { trigger: { contains: search, mode: 'insensitive' } },
                { flow: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        if (startDate || endDate) {
            where.startedAt = {};
            if (startDate) where.startedAt.gte = new Date(startDate);
            if (endDate) where.startedAt.lte = new Date(endDate);
        }

        try {
            const take = parseInt(limit || "50");
            const skip = parseInt(offset || "0");

            const [total, executions] = await prisma.$transaction([
                prisma.execution.count({ where }),
                prisma.execution.findMany({
                    where,
                    take,
                    skip,
                    orderBy: { startedAt: 'desc' },
                    include: {
                        flow: {
                            select: { name: true }
                        }
                    }
                })
            ]);

            return {
                data: executions,
                pagination: {
                    total,
                    limit: take,
                    offset: skip
                }
            };
        } catch (e: any) {
            set.status = 500;
            return { error: `Failed to fetch executions: ${e.message}` };
        }
    });
