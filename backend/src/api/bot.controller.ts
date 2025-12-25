import { Elysia, t } from "elysia";
import { prisma } from "../services/postgres.service";
import { Platform, Role } from "@prisma/client";
import { BaileysService } from "../services/baileys.service";
import { authMiddleware } from "../middleware/auth.middleware";

export const botController = new Elysia({ prefix: "/bots" })
    .use(authMiddleware)
    .guard({ isSignIn: true })
    // List all bots
    .get("/", async ({ user }) => {
        if (user.role === Role.SUPER_ADMIN) {
            return prisma.bot.findMany({ orderBy: { name: 'asc' } });
        }

        return prisma.bot.findMany({
            where: { userId: user.id },
            orderBy: { name: 'asc' }
        });
    })
    // Create bot
    .post("/", async ({ body, set, user }) => {
        if (user.role === Role.VIEWER) {
            set.status = 403;
            return "Viewers cannot create bots";
        }

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
                    credentials: {}, // Empty for now
                    userId: user.id
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
    .post("/:id/disconnect", async ({ params: { id }, set }) => {
        try {
            await BaileysService.stopSession(id);
            return { success: true, message: "Session disconnected successfully" };
        } catch (e: any) {
            set.status = 500;
            return `Failed to disconnect session: ${e.message}`;
        }
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
    .put("/:id", async ({ params: { id }, body, set, user }) => {
        const { name, identifier, platform, credentials } = body as any;

        if (user.role === Role.VIEWER) {
            set.status = 403;
            return "Viewers cannot edit bots";
        }

        try {
            // Permission check can be done by query directly or separate fetch
            // Let's do a direct update with where clause for simplicity/safety
            const whereClause: any = { id };
            if (user.role !== Role.SUPER_ADMIN) {
                whereClause.userId = user.id;
            }

            // Using updateMany purely for safety permissions check implicitly? 
            // No, updateMany returns count. We want returned object.
            // So we must fetch first or assume.

            const botToCheck = await prisma.bot.findUnique({ where: { id } });
            if (!botToCheck) {
                set.status = 404;
                return { error: "Bot not found" };
            }

            if (user.role !== Role.SUPER_ADMIN && botToCheck.userId !== user.id) {
                set.status = 403;
                return "You do not own this bot";
            }

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
    .delete("/:id", async ({ params: { id }, set, user }) => {
        try {
            const bot = await prisma.bot.findUnique({ where: { id } });
            if (!bot) {
                set.status = 404;
                return "Bot not found";
            }

            if (user.role !== Role.SUPER_ADMIN && bot.userId !== user.id) {
                set.status = 403;
                return "You do not have permission to delete this bot";
            }

            if (user.role === Role.VIEWER) {
                set.status = 403;
                return "Viewers cannot delete bots";
            }

            await prisma.bot.delete({
                where: { id }
            });
            return { success: true };
        } catch (e) {
            set.status = 500;
            return "Failed to delete bot";
        }
    });
