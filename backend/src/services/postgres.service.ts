import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// Connect immediately
prisma.$connect()
    .then(() => console.log("Postgres Connected (Prisma)"))
    .catch((err) => console.error("Postgres Connection Error", err));
