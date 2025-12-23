import { Elysia } from "elysia";
import { prisma } from "../services/postgres.service";

export const flowController = new Elysia({ prefix: "/flows" })
    .get("/", async () => {
        const flows = await prisma.flow.findMany({
            include: {
                steps: {
                    orderBy: { order: "asc" }
                },
                triggers: true
            }
        });
        return flows;
    });
