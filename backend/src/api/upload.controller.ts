import { Elysia, t } from "elysia";
import { join } from "path";
import { mkdir } from "fs/promises";

const UPLOAD_DIR = "./uploads";

// Ensure upload dir exists (backend might start before volume mount or just to be safe)
await mkdir(UPLOAD_DIR, { recursive: true });

export const uploadController = new Elysia({ prefix: "/upload" })
    .post("/", async ({ body, request, set }) => {
        console.log("[Upload] Incoming upload request...");

        try {
            const file = body.file;

            if (!file) {
                console.log("[Upload] No file in request body");
                set.status = 400;
                return { status: "error", message: "No file uploaded" };
            }

            console.log(`[Upload] Received file: ${file.name}, size: ${file.size}, type: ${file.type}`);

            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            const extension = file.name.split('.').pop() || "bin";
            const filename = `${uniqueSuffix}.${extension}`;
            const filePath = join(UPLOAD_DIR, filename);

            console.log(`[Upload] Writing to: ${filePath}`);

            // Write file
            await Bun.write(filePath, file);

            console.log(`[Upload] File saved: ${filename} (${file.size} bytes)`);

            const url = `/upload/files/${filename}`;

            return {
                status: "success",
                filename,
                url
            };
        } catch (error: any) {
            console.error("[Upload] ERROR:", error);
            console.error("[Upload] Stack:", error.stack);
            set.status = 500;
            return { status: "error", message: error.message || "Upload failed" };
        }
    }, {
        body: t.Object({
            file: t.File()
        })
    })
    .get("/list", async () => {
        try {
            const { readdir, stat } = await import("fs/promises");
            const files = await readdir(UPLOAD_DIR);

            // Get stats for sorting/details (optional but good)
            const fileList = await Promise.all(files.map(async (f) => {
                const stats = await stat(join(UPLOAD_DIR, f));
                return {
                    name: f,
                    url: `/upload/files/${f}`,
                    size: stats.size,
                    createdAt: stats.birthtime
                };
            }));

            // Sort by newest first
            return {
                files: fileList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            };
        } catch (e: any) {
            console.error("List files error", e);
            return { files: [] };
        }
    })
    .get("/files/:name", ({ params: { name }, set }) => {
        const filePath = join(UPLOAD_DIR, name);
        const file = Bun.file(filePath);

        if (file.size === 0) {
            set.status = 404;
            return "File not found";
        }

        return file;
    });
