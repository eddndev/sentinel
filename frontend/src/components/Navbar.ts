import { i18n } from "../core/i18n";
import { BotSelector } from "./BotSelector";

export const Navbar = () => {
    const nav = document.createElement("nav");
    nav.className = "bg-white shadow-sm border-b border-gray-100 px-6 py-4 flex justify-between items-center";

    const brand = document.createElement("div");
    brand.className = "flex items-center gap-2";
    brand.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span class="text-white font-bold">S</span>
        </div>
        <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Sentinel</h1>
    `;

    const controls = document.createElement("div");
    controls.className = "flex items-center gap-4";

    // Bot Selector
    controls.appendChild(BotSelector());

    // Language Toggle
    const langBtn = document.createElement("button");
    langBtn.className = "text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors px-3 py-1 rounded-full bg-gray-50 border border-gray-200 hover:border-indigo-200";

    const updateLabel = () => {
        const current = i18n.getLocale();
        langBtn.textContent = current === "en" ? "🇺🇸 English" : "🇲🇽 Español";
    };

    langBtn.onclick = () => {
        const next = i18n.getLocale() === "en" ? "es" : "en";
        i18n.setLocale(next);
    };

    i18n.subscribe(updateLabel);
    updateLabel();

    controls.appendChild(langBtn);
    nav.appendChild(brand);
    nav.appendChild(controls);

    return nav;
};
