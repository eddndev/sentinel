const API_URL = import.meta.env.PUBLIC_API_URL || (import.meta.env.DEV ? "http://localhost:8080" : "https://api-sentinel.angelviajero.com.mx");

const getHeaders = () => {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    const token = localStorage.getItem('token');
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
};

export const ApiClient = {
    async get(endpoint: string) {
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: getHeaders(),
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
            headers: getHeaders(),
            body: JSON.stringify(body),
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
            headers: getHeaders(),
            body: JSON.stringify(body),
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
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    },

    async uploadFile(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        
        const headers: Record<string, string> = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/upload`, {
            method: "POST",
            headers: headers,
            body: formData,
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Upload Error: ${res.statusText}`);
        }
        return res.json();
    }
};
