import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL || "admin@sentinel.com";
    const password = process.env.SUPER_ADMIN_PASSWORD || "password123";

    if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
        console.warn("⚠️  Using default credentials for Super Admin. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env for production.");
    }

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log(`User ${email} already exists.`);
        return;
    }

    const passwordHash = await Bun.password.hash(password, {
        algorithm: "argon2id",
        memoryCost: 4096,
        timeCost: 3
    });

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            role: Role.SUPER_ADMIN,
            fullName: "Super Admin",
            isActive: true
        }
    });

    console.log(`Created Super Admin: ${user.email} / ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
