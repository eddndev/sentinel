// @ts-check
import { defineConfig } from 'astro/config';
import alpine from '@astrojs/alpinejs';
import tailwind from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
    integrations: [alpine()],
    vite: {
        plugins: [tailwind()],
    },
});
