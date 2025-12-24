import { Modal } from "./Modal";
import { ApiClient } from "../core/api";
import { botStore } from "../core/bot.store";
import { i18n } from "../core/i18n";

export const openBotSettings = (bot: any) => {

    const form = document.createElement("div");
    form.innerHTML = `
        <div class="space-y-6">
            <!-- Basic Info -->
            <div class="space-y-4 border-b border-gray-100 pb-4">
                <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">${i18n.t("basic_info")}</h3>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">${i18n.t("bot_name")}</label>
                    <input type="text" id="editName" value="${bot.name}" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">${i18n.t("bot_identifier")}</label>
                    <input type="text" id="editId" value="${bot.identifier}" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
            </div>

            <!-- Device Connection -->
            <div class="space-y-4">
                <h3 class="text-sm font-semibold text-green-600 uppercase tracking-wider flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp Baileys
                </h3>
                
                <div id="connectionPanel" class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                    <div id="qrContainer" class="hidden mb-4">
                        <img id="qrImage" class="mx-auto w-48 h-48 border-4 border-white shadow-sm rounded-lg" alt="${i18n.t("scan_qr")}" />
                        <p class="text-xs text-gray-500 mt-2 font-medium">${i18n.t("scan_whatsapp")}</p>
                    </div>

                    <div id="statusContainer" class="mb-4">
                        <span id="statusText" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                            ${i18n.t("checking_status")}
                        </span>
                    </div>

                    <button id="connectBtn" class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm">
                        ${i18n.t("start_connection")}
                    </button>
                </div>
            </div>

            <div class="flex justify-between pt-4 border-t border-gray-100">
                <button id="deleteBtn" class="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1">${i18n.t("delete_bot")}</button>
                <div class="flex gap-2">
                    <button id="cancelBtn" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">${i18n.t("cancel")}</button>
                    <button id="saveBtn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-transform active:scale-95">${i18n.t("save_changes")}</button>
                </div>
            </div>
        </div>
    `;

    const modal = new Modal(`${i18n.t("settings")}: ${bot.name}`, form);

    const saveBtn = form.querySelector("#saveBtn") as HTMLButtonElement;
    const deleteBtn = form.querySelector("#deleteBtn") as HTMLButtonElement;
    const cancelBtn = form.querySelector("#cancelBtn") as HTMLButtonElement;

    // Connection Elements
    const connectBtn = form.querySelector("#connectBtn") as HTMLButtonElement;
    const qrContainer = form.querySelector("#qrContainer") as HTMLDivElement;
    const qrImage = form.querySelector("#qrImage") as HTMLImageElement;
    const statusText = form.querySelector("#statusText") as HTMLSpanElement;

    // Inputs
    const nameIn = form.querySelector("#editName") as HTMLInputElement;
    const idIn = form.querySelector("#editId") as HTMLInputElement;

    let pollInterval: any = null;

    const updateStatusUI = (status: { connected: boolean, hasQr: boolean, user?: any }) => {
        if (status.connected) {
            statusText.textContent = i18n.t("active");
            statusText.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800";
            qrContainer.classList.add("hidden");
            connectBtn.classList.add("hidden");
        } else if (status.hasQr) {
            statusText.textContent = i18n.t("scan_qr");
            statusText.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800";

            connectBtn.classList.add("hidden");

            // Fetch QR
            ApiClient.get(`/bots/${bot.id}/qr`).then((res: any) => {
                if (res.qr) {
                    qrImage.src = res.qr;
                    qrContainer.classList.remove("hidden");
                }
            });

        } else {
            statusText.textContent = i18n.t("disconnected");
            statusText.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800";
            qrContainer.classList.add("hidden");
            connectBtn.classList.remove("hidden");
            connectBtn.disabled = false;
            connectBtn.textContent = i18n.t("start_connection");
        }
    };

    const checkStatus = async () => {
        try {
            const status = await ApiClient.get(`/bots/${bot.id}/status`);
            updateStatusUI(status as any);
        } catch (e) {
            console.error("Status check failed", e);
        }
    };

    // Initial check & Poll
    checkStatus();
    pollInterval = setInterval(checkStatus, 2000);

    cancelBtn.onclick = () => {
        clearInterval(pollInterval);
        modal.close();
    }

    if (connectBtn) {
        connectBtn.onclick = async () => {
            connectBtn.disabled = true;
            connectBtn.textContent = i18n.t("initializing");
            try {
                await ApiClient.post(`/bots/${bot.id}/connect`, {});
                setTimeout(checkStatus, 1000);
            } catch (e) {
                alert(i18n.t("failed_session"));
                connectBtn.disabled = false;
                connectBtn.textContent = i18n.t("start_connection");
            }
        };
    }

    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = i18n.t("saving");

        try {
            const payload = {
                name: nameIn.value,
                identifier: idIn.value,
                platform: bot.platform,
                credentials: {} // Cleared or kept existing if needed, but for Baileys we don't need manual input
            };

            await ApiClient.put(`/bots/${bot.id}`, payload);
            await botStore.init(); // Reload
            clearInterval(pollInterval);
            modal.close();
        } catch (e) {
            alert(i18n.t("failed_save"));
            saveBtn.disabled = false;
            saveBtn.textContent = i18n.t("save_changes");
        }
    };

    deleteBtn.onclick = async () => {
        if (confirm(i18n.t("delete_bot_confirm"))) {
            try {
                await ApiClient.delete(`/bots/${bot.id}`);
                await botStore.init();
                const list = botStore.getBots();
                if (list.length > 0) botStore.setBot(list[0].id);
                else location.reload();

                clearInterval(pollInterval);
                modal.close();
            } catch (e) {
                alert("Failed to delete bot");
            }
        }
    };
};
