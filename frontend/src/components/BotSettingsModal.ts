import { Modal } from "./Modal";
import { ApiClient } from "../core/api";
import { botStore } from "../core/bot.store";

export const openBotSettings = (bot: any) => {
    const creds = bot.credentials || {};

    const form = document.createElement("div");
    form.innerHTML = `
        <div class="space-y-6">
            <!-- Basic Info -->
            <div class="space-y-4 border-b border-gray-100 pb-4">
                <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Basic Info</h3>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Bot Name</label>
                    <input type="text" id="editName" value="${bot.name}" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Identifier</label>
                    <input type="text" id="editId" value="${bot.identifier}" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>
            </div>

            <!-- WhatsApp Credentials -->
            <div class="space-y-4">
                <h3 class="text-sm font-semibold text-green-600 uppercase tracking-wider flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp Cloud API
                </h3>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Phone Number ID</label>
                    <input type="text" id="waPhoneId" value="${creds.phoneNumberId || ''}" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 focus:ring-2 focus:ring-green-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Access Token (User/System)</label>
                    <input type="password" id="waToken" value="${creds.accessToken || ''}" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 focus:ring-2 focus:ring-green-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Verify Token (Webhook)</label>
                    <input type="text" id="waVerify" value="${creds.verifyToken || ''}" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 focus:ring-2 focus:ring-green-500 outline-none">
                </div>
            </div>

            <div class="flex justify-between pt-4 border-t border-gray-100">
                <button id="deleteBtn" class="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1">Delete Bot</button>
                <div class="flex gap-2">
                    <button id="cancelBtn" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">Cancel</button>
                    <button id="saveBtn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-transform active:scale-95">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    const modal = new Modal(`Settings: ${bot.name}`, form);

    const saveBtn = form.querySelector("#saveBtn") as HTMLButtonElement;
    const deleteBtn = form.querySelector("#deleteBtn") as HTMLButtonElement;
    const cancelBtn = form.querySelector("#cancelBtn") as HTMLButtonElement;

    // Inputs
    const nameIn = form.querySelector("#editName") as HTMLInputElement;
    const idIn = form.querySelector("#editId") as HTMLInputElement;
    const waPhoneId = form.querySelector("#waPhoneId") as HTMLInputElement;
    const waToken = form.querySelector("#waToken") as HTMLInputElement;
    const waVerify = form.querySelector("#waVerify") as HTMLInputElement;

    cancelBtn.onclick = () => modal.close();

    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {
            const payload = {
                name: nameIn.value,
                identifier: idIn.value,
                platform: bot.platform,
                credentials: {
                    phoneNumberId: waPhoneId.value,
                    accessToken: waToken.value,
                    verifyToken: waVerify.value
                }
            };

            await ApiClient.put(`/bots/${bot.id}`, payload);
            await botStore.init(); // Reload
            modal.close();
        } catch (e) {
            alert("Failed to save settings");
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
        }
    };

    deleteBtn.onclick = async () => {
        if (confirm("Are you sure? This will delete all flows and history for this bot.")) {
            try {
                await ApiClient.delete(`/bots/${bot.id}`);
                await botStore.init();
                // Select first available or null
                const list = botStore.getBots();
                if (list.length > 0) botStore.setBot(list[0].id);
                else location.reload();

                modal.close();
            } catch (e) {
                alert("Failed to delete bot");
            }
        }
    };
};
