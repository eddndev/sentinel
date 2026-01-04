
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const triggers = await prisma.trigger.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { flow: true }
    });

    console.log('--- Latest Triggers ---');
    triggers.forEach(t => {
        console.log(`Trigger: "${t.keyword}" | Scope: ${t.scope} | Match: ${t.matchType} | Flow: ${t.flow.name}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
