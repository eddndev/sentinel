import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@sentinel.com";
    const password = "password123";

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
