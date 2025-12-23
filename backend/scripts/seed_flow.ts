import { PrismaClient, Platform, SessionStatus, MatchType, StepType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding Test Data...");

    // 1. Ensure Bot Exists
    const bot = await prisma.bot.upsert({
        where: { identifier: "SENTINEL_DEMO_BOT" },
        update: {},
        create: {
            name: "Sentinel Demo",
            platform: Platform.WHATSAPP,
            identifier: "SENTINEL_DEMO_BOT",
            credentials: { token: "demo_token" }
        }
    });

    console.log(`✅ Bot: ${bot.name} (${bot.id})`);

    // 2. Ensure User Session Exists (Linked to Bot)
    const session = await prisma.session.upsert({
        where: {
            botId_identifier: {
                botId: bot.id,
                identifier: "5215551234567" // Real phone format example
            }
        },
        update: {},
        create: {
            botId: bot.id,
            platform: Platform.WHATSAPP,
            identifier: "5215551234567",
            name: "Test User",
            status: SessionStatus.CONNECTED
        }
    });

    console.log(`✅ Session: ${session.name} (${session.id})`);

    // 3. Create the Flow (Linked to Bot)
    const flow = await prisma.flow.create({
        data: {
            botId: bot.id,
            name: "Welcome Flow",
            description: "Triggered by greeting"
        }
    });

    console.log(`✅ Flow: ${flow.name} (${flow.id})`);

    // 4. Create GLOBAL Trigger (Linked to Bot, No Session)
    await prisma.trigger.create({
        data: {
            botId: bot.id,
            sessionId: null, // Global!
            flowId: flow.id,
            keyword: "hola",
            matchType: MatchType.CONTAINS,
            isActive: true
        }
    });

    console.log(`✅ Global Trigger: 'hola' -> Flow`);

    // 5. Create Steps
    // Step 1: Text Greeting
    await prisma.step.create({
        data: {
            flowId: flow.id,
            type: StepType.TEXT,
            content: "¡Hola! Soy Sentinel, tu asistente virtual. 🤖",
            order: 0,
            delayMs: 1000,
            jitterPct: 10
        }
    });

    // Step 2: Simulated Typing/Voice Note
    await prisma.step.create({
        data: {
            flowId: flow.id,
            type: StepType.PTT,
            metadata: { duration: 5 }, // 5 seconds audio
            order: 1,
            delayMs: 2500, // Wait 2.5s before sending audio
            jitterPct: 20
        }
    });

    // Step 3: Image
    await prisma.step.create({
        data: {
            flowId: flow.id,
            type: StepType.IMAGE,
            mediaUrl: "https://via.placeholder.com/300.png?text=Sentinel+Demo",
            order: 2,
            delayMs: 1500,
            jitterPct: 10
        }
    });

    console.log(`✅ Steps Created (Text -> PTT -> Image)`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
