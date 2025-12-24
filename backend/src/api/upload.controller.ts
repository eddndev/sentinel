import { Elysia, t } from "elysia";
import { join } from "path";
import { mkdir } from "fs/promises";

const UPLOAD_DIR = "./uploads";

// Ensure upload dir exists (backend might start before volume mount or just to be safe)
await mkdir(UPLOAD_DIR, { recursive: true });

export const uploadController = new Elysia({ prefix: "/upload" })
    .post("/", async ({ body, request, set }) => {
        const file = body.file;

        if (!file) {
            set.status = 400;
            return "No file uploaded";
        }

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const extension = file.name.split('.').pop() || "bin";
        const filename = `${uniqueSuffix}.${extension}`;
        const filePath = join(UPLOAD_DIR, filename);

        // Write file
        await Bun.write(filePath, file);

        console.log(`[Upload] File saved: ${filename} (${file.size} bytes)`);

        // Construct Public URL
        // TODO: Use env var for BASE_URL if needed
        // For now, assume relative or absolute path from the client perspective
        const url = `/upload/files/${filename}`;

        return {
            status: "success",
            filename,
            url
        };
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
