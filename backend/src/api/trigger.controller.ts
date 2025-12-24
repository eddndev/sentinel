import { Elysia, t } from "elysia";
import { prisma } from "../services/postgres.service";
import { MatchType } from "@prisma/client";

export const triggerController = new Elysia({ prefix: "/triggers" })
    .get("/", async ({ query }) => {
        const { botId, flowId } = query as { botId?: string, flowId?: string };

        return prisma.trigger.findMany({
            where: {
                botId: botId || undefined,
                flowId: flowId || undefined
            },
            include: { flow: true }
        });
    })
    .get("/:id", async ({ params: { id }, set }) => {
        const trigger = await prisma.trigger.findUnique({
            where: { id }
        });
        if (!trigger) {
            set.status = 404;
            return "Trigger not found";
        }
        return trigger;
    })
    .post("/", async ({ body, set }) => {
        const { botId, flowId, keyword, matchType, isActive, usageLimit, cooldownMs } = body as any;

        try {
            const trigger = await prisma.trigger.create({
                data: {
                    botId,
                    flowId,
                    keyword,
                    matchType: (matchType as MatchType) || MatchType.CONTAINS,
                    isActive: isActive ?? true,
                    usageLimit: usageLimit || 0,
                    cooldownMs: cooldownMs || 0
                }
            });
            return trigger;
        } catch (e: any) {
            set.status = 500;
            return `Failed to create trigger: ${e.message}`;
        }
    }, {
        body: t.Object({
            botId: t.String(),
            flowId: t.String(),
            keyword: t.String(),
            matchType: t.Optional(t.String()),
            isActive: t.Optional(t.Boolean()),
            usageLimit: t.Optional(t.Number()),
            cooldownMs: t.Optional(t.Number())
        })
    })
    .put("/:id", async ({ params: { id }, body, set }) => {
        const { keyword, matchType, isActive, usageLimit, cooldownMs, flowId } = body as any;

        try {
            const trigger = await prisma.trigger.update({
                where: { id },
                data: {
                    keyword,
                    matchType: matchType as MatchType,
                    isActive,
                    usageLimit,
                    cooldownMs,
                    flowId
                }
            });
            return trigger;
        } catch (e: any) {
            set.status = 500;
            return "Failed to update trigger";
        }
    })
    .delete("/:id", async ({ params: { id }, set }) => {
        try {
            await prisma.trigger.delete({
                where: { id }
            });
            return { success: true };
        } catch (e) {
            set.status = 500;
            return "Failed to delete trigger";
        }
    });
