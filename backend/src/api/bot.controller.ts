import { Elysia, t } from "elysia";
import { prisma } from "../services/postgres.service";
import { Platform } from "@prisma/client";
import { BaileysService } from "../services/baileys.service";

export const botController = new Elysia({ prefix: "/bots" })
    // List all bots
    .get("/", async () => {
        const bots = await prisma.bot.findMany({
            orderBy: { name: 'asc' }
        });
        return bots;
    })
    // Create bot
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
    })
    // Baileys Management - specific routes BEFORE generic /:id
    .post("/:id/connect", async ({ params: { id }, set }) => {
        try {
            await BaileysService.startSession(id);
            return { success: true, message: "Session initialization started" };
        } catch (e: any) {
            set.status = 500;
            return `Failed to start session: ${e.message}`;
        }
    })
    .get("/:id/qr", async ({ params: { id }, set }) => {
        const qr = BaileysService.getQR(id);
        if (!qr) {
            set.status = 404;
            return { message: "QR not generated or session already connected" };
        }
        return { qr };
    })
    .get("/:id/status", async ({ params: { id } }) => {
        const session = BaileysService.getSession(id);
        const qr = BaileysService.getQR(id);

        return {
            connected: !!session?.user,
            hasQr: !!qr,
            user: session?.user
        };
    })
    // Generic /:id routes AFTER specific ones
    .get("/:id", async ({ params: { id }, set }) => {
        const bot = await prisma.bot.findUnique({
            where: { id }
        });
        if (!bot) {
            set.status = 404;
            return { error: "Bot not found" };
        }
        return bot;
    })
    .put("/:id", async ({ params: { id }, body, set }) => {
        const { name, identifier, platform, credentials } = body as any;

        try {
            const bot = await prisma.bot.update({
                where: { id },
                data: {
                    name,
                    identifier,
                    platform: platform as Platform,
                    credentials: credentials || undefined
                }
            });
            return bot;
        } catch (e: any) {
            set.status = 500;
            return "Failed to update bot";
        }
    })
    .delete("/:id", async ({ params: { id }, set }) => {
        try {
            await prisma.bot.delete({
                where: { id }
            });
            return { success: true };
        } catch (e) {
            set.status = 500;
            return "Failed to delete bot";
        }
    });
