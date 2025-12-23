import { Elysia, t } from "elysia";
import { prisma } from "../services/postgres.service";
import { flowEngine } from "../core/flow";
import { Platform, SessionStatus } from "@prisma/client";

export const webhookController = new Elysia({ prefix: "/webhook" })
    .post("/:platform", async ({ params, body, set }) => {
        const { platform } = params;
        const { from, content, type = "text" } = body as any;

        if (!['whatsapp', 'telegram'].includes(platform.toLowerCase())) {
            set.status = 400;
            return "Invalid platform";
        }

        const platformEnum = platform.toUpperCase() as Platform;

        console.log(`[Webhook] Received ${type} from ${from} on ${platformEnum}`);

        try {
            // 1. Resolve Bot (Target System)
            // For now, accept 'botId' in body, or default to the Seed Bot
            const botIdentifier = (body as any).botId || "SENTINEL_DEMO_BOT";

            const bot = await prisma.bot.findUnique({
                where: { identifier: botIdentifier }
            });

            if (!bot) {
                set.status = 404;
                return `Bot '${botIdentifier}' not found`;
            }

            // 2. Resolve Session (User Connection)
            // Session is now the USER's session with the specific BOT
            let session = await prisma.session.findUnique({
                where: {
                    botId_identifier: {
                        botId: bot.id,
                        identifier: from // User's ID (Phone)
                    }
                }
            });

            if (!session) {
                console.log(`[Webhook] New Session for user ${from} on bot ${bot.name}`);
                session = await prisma.session.create({
                    data: {
                        botId: bot.id,
                        platform: platformEnum,
                        identifier: from,
                        name: `User ${from}`, // We don't know name yet
                        status: SessionStatus.CONNECTED
                    }
                });
            }

            // 3. Persist Message
            const message = await prisma.message.create({
                data: {
                    externalId: `msg_${Date.now()}_${Math.random()}`,
                    sessionId: session.id,
                    sender: from,
                    content,
                    type: type.toUpperCase(),
                    isProcessed: false
                }
            });

            // 4. Process with Flow Engine
            flowEngine.processIncomingMessage(session.id, message).catch(err => {
                console.error("[Webhook] Flow Engine Error:", err);
            });

            return { status: "received", messageId: message.id, bot: bot.name };

        } catch (err: any) {
            console.error("[Webhook] Error:", err);
            set.status = 500;
            return err.message;
        }
    }, {
        body: t.Object({
            from: t.String(),
            content: t.String(),
            type: t.Optional(t.String()),
            botId: t.Optional(t.String())
        })
    });
