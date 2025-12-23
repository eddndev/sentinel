import { Elysia } from "elysia";
import { prisma } from "../services/postgres.service";

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
    });
