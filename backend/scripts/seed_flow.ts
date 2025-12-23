import { PrismaClient, Platform, SessionStatus, MatchType, StepType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding Test Data...");

    // 1. Ensure Session Exists
    const session = await prisma.session.upsert({
        where: { identifier: "DEMO_BOT_01" },
        update: {},
        create: {
            platform: Platform.WHATSAPP,
            identifier: "DEMO_BOT_01",
            name: "Sentinel Demo Bot",
            status: SessionStatus.CONNECTED
        }
    });

    console.log(`✅ Session: ${session.name} (${session.id})`);

    // 2. Create the Flow
    const flow = await prisma.flow.create({
        data: {
            name: "Welcome Flow",
            description: "Triggered by greeting"
        }
    });

    console.log(`✅ Flow: ${flow.name} (${flow.id})`);

    // 3. Create Trigger
    await prisma.trigger.create({
        data: {
            sessionId: session.id,
            flowId: flow.id,
            keyword: "hola",
            matchType: MatchType.CONTAINS,
            isActive: true
        }
    });

    console.log(`✅ Trigger: 'hola' -> Flow`);

    // 4. Create Steps
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
