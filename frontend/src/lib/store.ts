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

export const sidebarStore = {
    expanded: true,
    mobileOpen: false,

    init() {
        const persisted = localStorage.getItem('sidebar_expanded');
        this.expanded = persisted === null ? true : persisted === 'true';
    },

    toggle() {
        this.expanded = !this.expanded;
        localStorage.setItem('sidebar_expanded', String(this.expanded));
    },

    toggleMobile() {
        this.mobileOpen = !this.mobileOpen;
    },

    closeMobile() {
        this.mobileOpen = false;
    }
};

export default (Alpine: any) => {
    Alpine.store('bot', botStore);
    Alpine.store('sidebar', sidebarStore);
};
