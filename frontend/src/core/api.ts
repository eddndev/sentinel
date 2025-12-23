export class ApiClient {
    // Assuming backend is on localhost:8080. In production this should be configured.
    // For local dev, Vite proxy might be needed or hardcoded.
    private static BASE_URL = "http://localhost:8080";

    static async get(path: string) {
        const res = await fetch(`${this.BASE_URL}${path}`);
        return res.json();
    }

    static async post(path: string, body: any) {
        const res = await fetch(`${this.BASE_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return res.json();
    }

    static async upload(file: File) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${this.BASE_URL}/upload`, {
            method: "POST",
            body: formData
        });
        return res.json();
    }

    static async put(path: string, body: any) {
        const res = await fetch(`${this.BASE_URL}${path}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return res.json();
    }

    static async delete(path: string) {
        const res = await fetch(`${this.BASE_URL}${path}`, {
            method: "DELETE"
        });
        return res.json();
    }
}
