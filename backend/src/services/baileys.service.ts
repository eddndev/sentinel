
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    type WASocket,
    type WAMessage
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

        console.log(`[Baileys] Starting session for Bot ${botId}`);

        const sessionDir = path.join(AUTH_DIR, botId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        console.log(`[Baileys] Using WA v${version.join('.')}, isLatest: ${isLatest}`);

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
        });

        sessions.set(botId, sock);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(`[Baileys] QR Received for Bot ${botId}`);
                try {
                    const url = await QRCode.toDataURL(qr);
                    qrCodes.set(botId, url);
                } catch (err) {
                    console.error("QR Generation Error", err);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(`[Baileys] Connection closed for Bot ${botId}. Reconnecting: ${shouldReconnect}`, lastDisconnect?.error);

                sessions.delete(botId);
                qrCodes.delete(botId);

                if (shouldReconnect) {
                    // Backoff delay before reconnect
                    setTimeout(() => this.startSession(botId), 5000);
                } else {
                    console.log(`[Baileys] Bot ${botId} logged out.`);
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
    }

    private static async handleIncomingMessage(botId: string, msg: WAMessage & { message: any }) { // Type intersection specific to local context
        const from = msg.key.remoteJid;
        if (!from || msg.key.fromMe) return;

        // Extract content
        const content = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            "";

        const msgType = msg.message.imageMessage ? 'IMAGE' :
            msg.message.audioMessage ? 'AUDIO' : 'TEXT';

        console.log(`[Baileys] Received ${msgType} from ${from} on Bot ${botId}: ${content.substring(0, 50)}...`);

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
                session = await prisma.session.create({
                    data: {
                        botId: bot.id,
                        platform: Platform.WHATSAPP,
                        identifier: from,
                        name: msg.pushName || `User ${from.slice(0, 6)}`,
                        status: SessionStatus.CONNECTED
                    }
                });
            }

            // 3. Persist Message
            const message = await prisma.message.create({
                data: {
                    externalId: msg.key.id || `msg_${Date.now()}`,
                    sessionId: session.id,
                    sender: from,
                    content,
                    type: msgType,
                    isProcessed: false
                }
            });

            // 4. Process with Flow Engine
            flowEngine.processIncomingMessage(session.id, message).catch(err => {
                console.error("[Baileys] Flow Engine Error:", err);
            });

        } catch (e) {
            console.error("[Baileys] Error processing message:", e);
        }
    }

    static getQR(botId: string) {
        return qrCodes.get(botId);
    }

    static getSession(botId: string) {
        return sessions.get(botId);
    }

    static async sendMessage(botId: string, to: string, content: any) {
        const sock = sessions.get(botId);
        if (!sock) {
            console.warn(`[Baileys] sendMessage failed: Bot ${botId} not connected`);
            // Attempt auto-reconnect?
            return;
        }
        await sock.sendMessage(to, content);
    }
}
