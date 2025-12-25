import { prisma } from "./postgres.service";
import { User, Role } from "@prisma/client";

export class AuthService {
    /**
     * Authenticate user with email and password
     */
    static async validateUser(email: string, passwordPlain: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user || !user.isActive) return null;

        const isValid = await Bun.password.verify(passwordPlain, user.passwordHash);
        if (!isValid) return null;

        return user;
    }

    /**
     * Create a new user (Internal/Seed use mostly)
     */
    static async createUser(email: string, passwordPlain: string, role: Role = Role.ADMIN, fullName?: string): Promise<User> {
        const passwordHash = await Bun.password.hash(passwordPlain, {
            algorithm: "argon2id", // Best security
            memoryCost: 4096,
            timeCost: 3
        });

        return prisma.user.create({
            data: {
                email,
                passwordHash,
                role,
                fullName,
                isActive: true
            }
        });
    }

    /**
     * Get user by ID (for generic lookups usually)
     */
    static async getUserById(id: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { id } });
    }
}
