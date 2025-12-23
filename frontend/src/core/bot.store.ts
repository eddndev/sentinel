import { ApiClient } from "./api";

type Bot = {
    id: string;
    name: string;
    platform: string;
    identifier: string;
};

class BotStore {
    private bots: Bot[] = [];
    private currentBotId: string | null = null;
    private listeners: (() => void)[] = [];

    async init() {
        try {
            this.bots = await ApiClient.get("/bots");
            const stored = localStorage.getItem("sentinel_bot_id");

            if (stored && this.bots.find(b => b.id === stored)) {
                this.currentBotId = stored;
            } else if (this.bots.length > 0) {
                this.currentBotId = this.bots[0].id; // Default to first
            }
            this.notify();
        } catch (e) {
            console.error("Failed to load bots", e);
        }
    }

    getBots() { return this.bots; }

    getCurrentBot() {
        return this.bots.find(b => b.id === this.currentBotId);
    }

    setBot(id: string) {
        if (this.bots.find(b => b.id === id)) {
            this.currentBotId = id;
            localStorage.setItem("sentinel_bot_id", id);
            this.notify();
        }
    }

    subscribe(cb: () => void) {
        this.listeners.push(cb);
        return () => this.listeners = this.listeners.filter(l => l !== cb);
    }

    private notify() {
        this.listeners.forEach(cb => cb());
    }
}

export const botStore = new BotStore();
