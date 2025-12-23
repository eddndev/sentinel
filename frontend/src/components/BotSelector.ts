import { botStore } from "../core/bot.store";
import { Modal } from "./Modal";
import { ApiClient } from "../core/api";
import { i18n } from "../core/i18n";

export const BotSelector = () => {
    const container = document.createElement("div");
    container.className = "relative group";

    const button = document.createElement("button");
    button.className = "flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors";

    const dropdown = document.createElement("div");
    dropdown.className = "absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 hidden p-1 z-50";

    const render = () => {
        const current = botStore.getCurrentBot();
        button.innerHTML = `
            <span class="${current ? 'text-gray-900' : 'text-red-500'}">
                ${current ? current.name : 'No Bot Selected'}
            </span>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        `;

        dropdown.innerHTML = "";
        botStore.getBots().forEach(bot => {
            const item = document.createElement("button");
            item.className = `w-full text-left px-3 py-2 rounded-lg text-sm ${bot.id === current?.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`;
            item.textContent = bot.name;
            item.onclick = () => {
                botStore.setBot(bot.id);
                dropdown.classList.add("hidden");
            };
            dropdown.appendChild(item);
        });

        // Separator
        const separator = document.createElement("div");
        separator.className = "h-px bg-gray-100 my-1";
        dropdown.appendChild(separator);

        // Create Bot Button
        const createBtn = document.createElement("button");
        createBtn.className = "w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-600 font-medium hover:bg-indigo-50 flex items-center gap-2";
        createBtn.innerHTML = `<span>+</span> ${i18n.t("create_bot") || 'Create Bot'}`;
        createBtn.onclick = () => {
            dropdown.classList.add("hidden");
            openCreateBotModal();
        };
        dropdown.appendChild(createBtn);
    };

    const openCreateBotModal = () => {
        const form = document.createElement("div");
        form.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${i18n.t("bot_name")}</label>
                    <input type="text" id="botName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="e.g. Sales Helper">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${i18n.t("bot_identifier")}</label>
                    <input type="text" id="botIdInput" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="e.g. 5215551234">
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button id="cancelBtn" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">${i18n.t("cancel")}</button>
                    <button id="saveBtn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-transform active:scale-95">${i18n.t("create")}</button>
                </div>
            </div>
        `;

        const modal = new Modal(i18n.t("create_bot_title"), form);

        const saveBtn = form.querySelector("#saveBtn") as HTMLButtonElement;
        const cancelBtn = form.querySelector("#cancelBtn") as HTMLButtonElement;
        const nameInput = form.querySelector("#botName") as HTMLInputElement;
        const idInput = form.querySelector("#botIdInput") as HTMLInputElement;

        cancelBtn.onclick = () => modal.close();
        saveBtn.onclick = async () => {
            const name = nameInput.value.trim();
            const identifier = idInput.value.trim();

            if (!name || !identifier) {
                alert(i18n.t("fill_all_fields"));
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = i18n.t("creating");

            try {
                const newBot = await ApiClient.post("/bots", { name, identifier, platform: "WHATSAPP" });
                await botStore.init(); // Reload bots
                botStore.setBot(newBot.id); // Select new bot
                modal.close();
            } catch (e) {
                alert(i18n.t("error"));
                saveBtn.disabled = false;
                saveBtn.textContent = i18n.t("create");
            }
        };
    };

    button.onclick = () => dropdown.classList.toggle("hidden");

    // Close on click outside
    document.addEventListener("click", (e) => {
        if (!container.contains(e.target as Node)) dropdown.classList.add("hidden");
    });

    botStore.subscribe(render);
    render(); // Initial render (might be empty until init finishes)

    container.appendChild(button);
    container.appendChild(dropdown);
    return container;
};
