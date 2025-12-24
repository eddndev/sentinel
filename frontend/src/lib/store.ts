import { ApiClient } from './api';

export const botStore = {
    bots: [],
    currentBot: null,
    loading: false,

    async init() {
        await this.refresh();
        if (this.bots.length > 0 && !this.currentBot) {
            this.currentBot = this.bots[0];
        }
    },

    async refresh() {
        this.loading = true;
        try {
            this.bots = await ApiClient.get('/bots');
        } catch (e) {
            console.error(e);
        } finally {
            this.loading = false;
        }
    },

    setBot(botId: string) {
        this.currentBot = this.bots.find((b: any) => b.id === botId) || null;
    }
};

export default (Alpine: any) => {
    Alpine.store('bot', botStore);
};
