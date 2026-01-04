
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const triggerCount = await prisma.trigger.count();
    const flowCount = await prisma.flow.count();
    const botCount = await prisma.bot.count();

    console.log(`Counts: Bots=${botCount}, Flows=${flowCount}, Triggers=${triggerCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
