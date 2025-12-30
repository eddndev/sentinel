
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    type WASocket,
    type WAMessage,
    jidNormalizedUser
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { prisma } from './postgres.service';
import { flowEngine } from '../core/flow';
import { SessionStatus, Platform } from '@prisma/client';
import pino from 'pino';

const logger = pino({ level: 'silent' });

// Map to store active sockets: botId -> socket
const sessions = new Map<string, WASocket>();
// Map to store current QR codes: botId -> qrDataURL
const qrCodes = new Map<string, string>();

const AUTH_DIR = 'auth_info_baileys';

export class BaileysService {

    static async startSession(botId: string) {
        if (sessions.has(botId)) {
            return sessions.get(botId);
        }

        console.log(`[${new Date().toISOString()}] [Baileys] Starting session for Bot ${botId}`);

        const sessionDir = path.join(AUTH_DIR, botId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        console.log(`[${new Date().toISOString()}] [Baileys] Using WA v${version.join('.')}, isLatest: ${isLatest}`);

        try {
            // @ts-ignore
            const sock = makeWASocket({
                version,
                logger,
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                generateHighQualityLinkPreview: true,
                // Increase timeout for QR generation if possible, or handle via connection update
                qrTimeout: 60000,
            });

            sessions.set(botId, sock);

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log(`[${new Date().toISOString()}] [Baileys] QR Received for Bot ${botId}`);
                    try {
                        const url = await QRCode.toDataURL(qr);
                        qrCodes.set(botId, url);
                    } catch (err) {
                        console.error(`[${new Date().toISOString()}] QR Generation Error`, err);
                    }
                }

                if (connection === 'close') {
                    const error = lastDisconnect?.error as Boom;
                    const statusCode = error?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 408; // 408 is Request Timeout (QR ended)

                    console.log(`[Baileys] Connection closed for Bot ${botId}. Code: ${statusCode}, Reconnecting: ${shouldReconnect}`, error);

                    sessions.delete(botId);
                    qrCodes.delete(botId);

                    if (shouldReconnect) {
                        // Backoff delay before reconnect
                        setTimeout(() => this.startSession(botId), 5000);
                    } else {
                        console.log(`[Baileys] Bot ${botId} stopped (Logged out or QR timeout).`);
                        // Optionally clean up session dir if it was a QR timeout to force fresh start
                        if (statusCode === 408) {
                            // this.stopSession(botId); // Clean up
                        }
                    }
                } else if (connection === 'open') {
                    console.log(`[Baileys] Connection opened for Bot ${botId}`);
                    qrCodes.delete(botId);
                }
            });

            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify') return;

                for (const msg of messages) {
                    if (!msg.message) continue;
                    // Avoid processing status updates or broadcast messages if needed
                    if (msg.key.remoteJid === 'status@broadcast') continue;

                    // @ts-ignore
                    await this.handleIncomingMessage(botId, msg);
                }
            });

            return sock;

        } catch (error: any) {
            console.error(`[${new Date().toISOString()}] [Baileys] Failed to start session for bot ${botId}:`, error);
            if (error.message?.includes('QR refs attempts ended')) {
                console.log(`[${new Date().toISOString()}] [Baileys] QR timeout for bot ${botId}. Removing session to allow fresh retry.`);
                this.stopSession(botId);
            }
            return null;
        }
    }

    private static async handleIncomingMessage(botId: string, msg: WAMessage & { message: any }) { // Type intersection specific to local context
        const rawFrom = msg.key.remoteJid;
        if (!rawFrom || msg.key.fromMe) return;

        // CRITICAL: Normalize JID (convert @lid to @s.whatsapp.net) to identify user consistently
        let from = jidNormalizedUser(rawFrom);

        // Fix: If it's an LID, try to find the phone number in the undocumented 'remoteJidAlt' field
        if (from.includes('@lid') && (msg.key as any).remoteJidAlt) {
            from = jidNormalizedUser((msg.key as any).remoteJidAlt);
        }

        // Extract content
        const content = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            "";

        const msgType = msg.message.imageMessage ? 'IMAGE' :
            msg.message.audioMessage ? 'AUDIO' : 'TEXT';

        console.log(`[${new Date().toISOString()}] [Baileys] Received ${msgType} from ${from} (${msg.pushName}) [MsgID: ${msg.key.id}] on Bot ${botId}: ${content.substring(0, 50)}...`);

        try {
            // 1. Resolve Bot
            const bot = await prisma.bot.findUnique({ where: { id: botId } });
            if (!bot) return;

            // 2. Resolve Session (User Connection)
            let session = await prisma.session.findUnique({
                where: {
                    botId_identifier: {
                        botId: bot.id,
                        identifier: from
                    }
                }
            });

            if (!session) {
                console.log(`[Baileys] New Session for user ${from} on bot ${bot.name}`);
                try {
                    session = await prisma.session.create({
                        data: {
                            botId: bot.id,
                            platform: Platform.WHATSAPP,
                            identifier: from,
                            name: msg.pushName || `User ${from.slice(0, 6)}`,
                            status: SessionStatus.CONNECTED
                        }
                    });
                } catch (e: any) {
                    // Handle Race Condition: Another request created the session ms ago
                    if (e.code === 'P2002') {
                        console.log(`[Baileys] Session race condition detected for ${from}, fetching existing...`);
                        const existing = await prisma.session.findUnique({
                            where: {
                                botId_identifier: { botId: bot.id, identifier: from }
                            }
                        });
                        if (!existing) throw e; // Should not happen if P2002 occurred
                        session = existing;
                    } else {
                        throw e;
                    }
                }
            }

            // 3. Persist Message
            let message;
            try {
                // Check if message already exists (Idempotency)
                const messageExternalId = msg.key.id || `msg_${Date.now()}`;
                const existingMessage = await prisma.message.findUnique({
                    where: { externalId: messageExternalId }
                });

                if (existingMessage) {
                    console.log(`[Baileys] Message ${messageExternalId} already exists, skipping creation.`);
                    message = existingMessage;
                } else {
                    message = await prisma.message.create({
                        data: {
                            externalId: messageExternalId,
                            sessionId: session.id,
                            sender: from,
                            content,
                            type: msgType,
                            isProcessed: false
                        }
                    });
                }
            } catch (e: any) {
                if (e.code === 'P2002') {
                    console.warn(`[Baileys] Message creation collision for ${msg.key.id}, fetching existing...`);
                    message = await prisma.message.findUnique({
                        where: { externalId: msg.key.id! }
                    });
                } else {
                    throw e;
                }
            }

            if (!message) return; // Should not happen unless catostrophic DB failure

            // 4. Process with Flow Engine
            flowEngine.processIncomingMessage(session.id, message).catch(err => {
                console.error(`[${new Date().toISOString()}] [Baileys] Flow Engine Error:`, err);
            });

        } catch (e) {
            console.error(`[${new Date().toISOString()}] [Baileys] Error processing message:`, e);
        }
    }

    static getQR(botId: string) {
        return qrCodes.get(botId);
    }

    static getSession(botId: string) {
        return sessions.get(botId);
    }

    static async stopSession(botId: string) {
        const sock = sessions.get(botId);
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {
                console.log(`[${new Date().toISOString()}] [Baileys] Error during logout for bot ${botId}:`, e);
            }
            sessions.delete(botId);
        }
        qrCodes.delete(botId);

        // Optionally clear auth data to require new QR scan
        const sessionDir = path.join(AUTH_DIR, botId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log(`[${new Date().toISOString()}] [Baileys] Cleared auth data for bot ${botId}`);
        }

        console.log(`[${new Date().toISOString()}] [Baileys] Session stopped for bot ${botId}`);
    }

    static async sendMessage(botId: string, to: string, content: any): Promise<boolean> {
        const sock = sessions.get(botId);
        if (!sock) {
            console.warn(`[${new Date().toISOString()}] [Baileys] sendMessage failed: Bot ${botId} not connected`);
            return false;
        }

        try {
            await sock.sendMessage(to, content);
            return true;
        } catch (error: any) {
            // Log the error with details but don't crash
            const errorCode = error?.code || 'UNKNOWN';
            const errorMsg = error?.message || String(error);
            console.error(`[${new Date().toISOString()}] [Baileys] sendMessage failed for Bot ${botId} to ${to}:`, {
                code: errorCode,
                message: errorMsg,
                contentType: content?.text ? 'TEXT' : content?.image ? 'IMAGE' : content?.audio ? 'AUDIO' : 'OTHER'
            });

            // Rethrow so caller can handle/log, but with more context
            throw new Error(`Baileys send failed (${errorCode}): ${errorMsg}`);
        }
    }
}
