import { Elysia, t } from "elysia";
import { prisma } from "../services/postgres.service";
import { Platform } from "@prisma/client";
import { BaileysService } from "../services/baileys.service";
import { authMiddleware } from "../middleware/auth.middleware";

export const botController = new Elysia({ prefix: "/bots" })
    .use(authMiddleware)
    .guard({ isSignIn: true })
    // List all bots
    .get("/", async () => {
        return prisma.bot.findMany({ orderBy: { name: 'asc' } });
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
                    credentials: {}
                }
            });
            return bot;
        } catch (e: any) {
            if (e.code === 'P2002') {
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
    // Baileys Management
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
    .post("/:id/disconnect", async ({ params: { id }, set }) => {
        try {
            await BaileysService.stopSession(id);
            return { success: true, message: "Session disconnected successfully" };
        } catch (e: any) {
            set.status = 500;
            return `Failed to disconnect session: ${e.message}`;
        }
    })
    // Generic /:id routes
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
        } catch (e: any) {
            console.error("[DELETE /bots/:id] Error:", e?.message || e);
            console.error("[DELETE /bots/:id] Full error:", JSON.stringify(e, null, 2));
            set.status = 500;
            return { error: "Failed to delete bot", details: e?.message };
        }
    });
