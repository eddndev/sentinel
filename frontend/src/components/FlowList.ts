import { i18n } from "../core/i18n";
import { ApiClient } from "../core/api";
import { botStore } from "../core/bot.store";

export const FlowList = () => {
    const container = document.createElement("div");
    container.className = "bg-white rounded-xl shadow-sm border border-gray-100 p-6";

    const header = document.createElement("div");
    header.className = "flex justify-between items-center mb-6";

    const title = document.createElement("h2");
    title.className = "text-lg font-semibold text-gray-800";

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-2";

    const newBtn = document.createElement("button");
    newBtn.innerHTML = `+ New Flow`;
    newBtn.className = "text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium";

    const refreshBtn = document.createElement("button");
    refreshBtn.innerHTML = `↺`;
    refreshBtn.className = "p-2 hover:bg-gray-100 rounded-full text-gray-500";

    actions.appendChild(newBtn);
    actions.appendChild(refreshBtn);

    header.appendChild(title);
    header.appendChild(actions);

    const list = document.createElement("div");
    list.className = "space-y-4";

    const updateTexts = () => {
        title.textContent = i18n.t("flows");
    };
    i18n.subscribe(updateTexts);
    updateTexts();

    const loadFlows = async () => {
        const currentBot = botStore.getCurrentBot(); // Import botStore at top!
        if (!currentBot) {
            list.innerHTML = `<div class="text-center text-gray-400 py-4">Select a bot</div>`;
            return;
        }

        list.innerHTML = `<div class="text-center text-gray-400 py-4">Loading flows for ${currentBot.name}...</div>`;
        try {
            const flows = await ApiClient.get(`/flows?botId=${currentBot.id}`);
            list.innerHTML = "";

            if (flows.length === 0) {
                list.innerHTML = `<div class="text-center text-gray-400 py-4">No flows found</div>`;
                return;
            }

            flows.forEach((flow: any) => {
                const card = document.createElement("div");
                card.className = "border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow";

                // Steps Preview
                const stepsHtml = flow.steps.map((s: any) =>
                    `<span class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">${s.type}</span>`
                ).join(" <span class='text-gray-300'>→</span> ");

                card.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="font-medium text-gray-900">${flow.name}</h3>
                            <p class="text-xs text-gray-500">${flow.description || ''}</p>
                        </div>
                        <span class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">Active</span>
                    </div>
                    <div class="flex items-center gap-2 mt-3">
                        ${stepsHtml}
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-50 flex justify-end gap-2">
                        <button id="editBtn" class="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors">
                            Edit
                        </button>
                        <button id="triggerBtn" class="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors">
                            ${i18n.t("trigger_test")}
                        </button>
                    </div>
                `;

                // Bind actions
                const editBtn = card.querySelector("#editBtn") as HTMLButtonElement;
                const triggerBtn = card.querySelector("#triggerBtn") as HTMLButtonElement;

                editBtn.onclick = () => {
                    import("./FlowEditorModal").then(m => m.openFlowEditor(flow));
                };

                triggerBtn.onclick = () => {
                    alert(`Triggering test for ${flow.name}`);
                };

                list.appendChild(card);
            });
        } catch (e) {
            list.innerHTML = `<div class="text-red-500 text-center py-4">Failed to load flows</div>`;
        }
    };

    newBtn.onclick = () => {
        import("./FlowEditorModal").then(m => m.openFlowEditor(null));
    };

    refreshBtn.onclick = loadFlows;

    // Subscribe to Bot Changes!
    botStore.subscribe(loadFlows);
    // Initial loaded by subscription if Store is waiting for init? 
    // Or we manually call it if store is ready.
    if (botStore.getCurrentBot()) loadFlows();

    container.appendChild(header);
    container.appendChild(list);

    return container;
};
