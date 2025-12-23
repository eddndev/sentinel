import { Elysia, t } from "elysia";
import { prisma } from "../services/postgres.service";
import { Platform } from "@prisma/client";

export const botController = new Elysia({ prefix: "/bots" })
    .get("/", async () => {
        const bots = await prisma.bot.findMany({
            orderBy: { name: 'asc' }
        });
        return bots;
    })
    .post("/", async ({ body, set }) => {
        const { name, platform, identifier } = body as any;

        if (!name || !identifier) {
            set.status = 400;
            return "Name and Identifier are required";
        }

        try {
            const bot = await prisma.bot.create({
                data: {
                    name,
                    platform: (platform as Platform) || Platform.WHATSAPP,
                    identifier,
                    credentials: {} // Empty for now
                }
            });
            return bot;
        } catch (e: any) {
            if (e.code === 'P2002') { // Unique constraint
                set.status = 409;
                return "Bot Identifier already exists";
            }
            throw e;
        }
    }, {
        body: t.Object({
            name: t.String(),
            identifier: t.String(),
            platform: t.Optional(t.String())
        })
    });
