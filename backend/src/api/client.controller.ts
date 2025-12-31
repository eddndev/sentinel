import type { Context } from "elysia";
import { prisma } from "../services/postgres.service";
import { EncryptionService } from "../services/encryption.service";

/**
 * Controller for Client management
 */
export const ClientController = {
    /**
     * Get all clients
     */
    getAll: async ({ query }: Context) => {
        const filters: any = {};
        const q = query as any;

        if (q && q.botId) {
            filters.botId = q.botId;
        }

        // Pagination could be added here
        const clients = await prisma.client.findMany({
            where: filters,
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit for safety
        });

        // Remove sensitive data from list view
        return clients.map(c => {
            const { encryptedPassword, ...rest } = c;
            return rest;
        });
    },

    /**
     * Get single client by ID
     * Query param ?reveal=true to get decrypted password
     */
    getOne: async ({ params: { id }, query }: Context) => {
        const client = await prisma.client.findUnique({
            where: { id: id as string }
        });

        if (!client) {
            return new Response("Client not found", { status: 404 });
        }

        const { encryptedPassword, ...rest } = client;

        // Only return password if explicitly requested
        if (query && (query as any).reveal === 'true') {
            try {
                return {
                    ...rest,
                    plainTextPassword: EncryptionService.decrypt(encryptedPassword)
                };
            } catch (error) {
                console.error("Decryption failed for client", id, error);
                return { ...rest, plainTextPassword: "ERROR_DECRYPTING" };
            }
        }

        return rest;
    },

    /**
     * Create new client
     */
    create: async ({ body }: Context) => {
        const data = body as any;

        // Validate required fields
        if (!data.email || !data.phoneNumber || !data.name || !data.plainTextPassword || !data.botId) {
            return new Response("Missing required fields: email, phoneNumber, name, plainTextPassword, botId", { status: 400 });
        }

        try {
            // Validate Bot existence
            const bot = await prisma.bot.findUnique({ where: { id: data.botId } });
            if (!bot) {
                return new Response("Bot not found", { status: 404 });
            }

            // Encrypt password
            const encryptedPassword = EncryptionService.encrypt(data.plainTextPassword);

            const newClient = await prisma.client.create({
                data: {
                    email: data.email,
                    phoneNumber: data.phoneNumber,
                    name: data.name,
                    appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : null,
                    captureLine: data.captureLine,
                    contactNumber: data.contactNumber,
                    // PDFs
                    captureLinePdfPath: data.captureLinePdfPath,
                    accreditationPdfPath: data.accreditationPdfPath,
                    appointmentPdfPath: data.appointmentPdfPath,

                    encryptedPassword,
                    botId: data.botId
                }
            });

            const { encryptedPassword: _, ...rest } = newClient;
            return rest;

        } catch (error: any) {
            // Handle unique constraint violations
            if (error.code === 'P2002') {
                return new Response("Client with this email already exists", { status: 409 });
            }
            console.error("Error creating client:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    },

    /**
     * Update client
     */
    update: async ({ params: { id }, body }: Context) => {
        const data = body as any;

        try {
            const updateData: any = { ...data };

            // Handle password update specially
            if (updateData.plainTextPassword) {
                updateData.encryptedPassword = EncryptionService.encrypt(updateData.plainTextPassword);
                delete updateData.plainTextPassword;
            }

            if (updateData.appointmentDate) {
                updateData.appointmentDate = new Date(updateData.appointmentDate);
            }

            const updated = await prisma.client.update({
                where: { id: id as string },
                data: updateData
            });

            const { encryptedPassword, ...rest } = updated;
            return rest;
        } catch (error) {
            console.error("Error updating client:", error);
            return new Response("Error updating client", { status: 500 });
        }
    },

    /**
     * Delete client
     */
    delete: async ({ params: { id } }: Context) => {
        await prisma.client.delete({
            where: { id: id as string }
        });
        return { success: true };
    }
};
