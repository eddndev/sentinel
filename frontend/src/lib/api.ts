const API_URL = import.meta.env.PUBLIC_API_URL || (import.meta.env.DEV ? "http://localhost:8081" : "https://api-sentinel.angelviajero.com.mx");

export const ApiClient = {
    async get(endpoint: string) {
        const res = await fetch(`${API_URL}${endpoint}`, {
            credentials: "include"
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `API Error: ${res.statusText}`);
        }
        return res.json();
    },

    async post(endpoint: string, body: any) {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include"
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `API Error: ${res.statusText}`);
        }
        return res.json();
    },

    async put(endpoint: string, body: any) {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include"
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `API Error: ${res.statusText}`);
        }
        return res.json();
    },

    async delete(endpoint: string) {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: "DELETE",
            credentials: "include"
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    },

    async uploadFile(file: File) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_URL}/upload`, {
            method: "POST",
            body: formData,
            credentials: "include"
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Upload Error: ${res.statusText}`);
        }
        return res.json();
    }
};
