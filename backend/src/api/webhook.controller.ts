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
            // 1. Resolve Session
            let session = await prisma.session.findFirst({
                where: { platform: platformEnum, status: SessionStatus.CONNECTED }
            });

            if (!session) {
                // Auto-provision a "Demo Bot" session if none exists
                session = await prisma.session.create({
                    data: {
                        platform: platformEnum,
                        identifier: "DEMO_BOT_01",
                        name: "Sentinel Demo Bot",
                        status: SessionStatus.CONNECTED
                    }
                });
            }

            // 2. Persist Message
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

            // 3. Process with Flow Engine
            flowEngine.processIncomingMessage(session.id, message).catch(err => {
                console.error("[Webhook] Flow Engine Error:", err);
            });

            return { status: "received", messageId: message.id };

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
