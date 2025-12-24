export class ApiClient {
    private static BASE_URL = (import.meta as any).env?.VITE_API_URL || "";

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
