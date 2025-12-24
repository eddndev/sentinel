import { Modal } from "./Modal";
import { ApiClient } from "../core/api";
import { botStore } from "../core/bot.store";
import { i18n } from "../core/i18n";

export const openFlowEditor = (flow: any) => {
    const isNew = !flow;
    const flowId = flow?.id || null;
    let steps = flow?.steps ? [...flow.steps] : [];
    let triggers = flow?.triggers ? [...flow.triggers] : [];

    const form = document.createElement("div");
    form.className = "space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar";

    const render = () => {
        form.innerHTML = `
            <div class="space-y-4">
                <!-- Basic Info -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="block text-xs font-semibold text-gray-500 uppercase">${i18n.t("flow_name")}</label>
                        <input type="text" id="flowName" value="${flow?.name || ''}" placeholder="e.g. Welcome Message" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-xs font-semibold text-gray-500 uppercase">${i18n.t("description")}</label>
                        <input type="text" id="flowDesc" value="${flow?.description || ''}" placeholder="Optional info..." class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                </div>

                <!-- Triggers -->
                <div class="space-y-3 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                    <div class="flex justify-between items-center">
                        <label class="block text-xs font-bold text-indigo-600 uppercase tracking-widest">${i18n.t("triggers_keywords")}</label>
                        <button id="addTriggerBtn" class="text-[10px] bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">${i18n.t("new_trigger")}</button>
                    </div>
                    <div id="triggersList" class="space-y-2">
                        ${triggers.map((t, idx) => `
                            <div class="flex items-center gap-2 bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                                <input data-idx="${idx}" type="text" value="${t.keyword}" class="trigger-keyword flex-1 bg-transparent border-none text-xs outline-none font-medium" placeholder="${i18n.t("keyword_placeholder")}">
                                <select data-idx="${idx}" class="trigger-match text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded outline-none border-none font-bold">
                                    <option value="CONTAINS" ${t.matchType === 'CONTAINS' ? 'selected' : ''}>${i18n.t("contains")}</option>
                                    <option value="EXACT" ${t.matchType === 'EXACT' ? 'selected' : ''}>${i18n.t("exact")}</option>
                                </select>
                                <button data-idx="${idx}" class="remove-trigger text-gray-300 hover:text-red-400 p-1">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>
                        `).join('')}
                        ${triggers.length === 0 ? `<p class="text-[10px] text-gray-400 text-center py-2 italic font-medium">${i18n.t("no_triggers")}</p>` : ''}
                    </div>
                </div>
                
                <!-- Steps Sequence -->
                <div class="space-y-3">
                    <div class="flex justify-between items-center">
                        <label class="block text-xs font-semibold text-gray-500 uppercase">${i18n.t("steps_sequence")}</label>
                        <button id="addStepBtn" class="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">${i18n.t("add_step")}</button>
                    </div>
                    
                    <div id="stepsList" class="space-y-3 pb-4">
                        ${steps.map((step, idx) => `
                            <div class="group bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-indigo-200 transition-all relative">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="flex items-center gap-2">
                                        <span class="w-5 h-5 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-[10px] font-bold">${idx + 1}</span>
                                        <select data-idx="${idx}" class="step-type text-[10px] bg-transparent font-semibold uppercase tracking-wider text-indigo-600 outline-none cursor-pointer">
                                            <option value="TEXT" ${step.type === 'TEXT' ? 'selected' : ''}>${i18n.t("step_text")}</option>
                                            <option value="IMAGE" ${step.type === 'IMAGE' ? 'selected' : ''}>${i18n.t("step_image")}</option>
                                            <option value="AUDIO" ${step.type === 'AUDIO' ? 'selected' : ''}>${i18n.t("step_audio")}</option>
                                            <option value="PTT" ${step.type === 'PTT' ? 'selected' : ''}>${i18n.t("step_ptt")}</option>
                                        </select>
                                    </div>
                                    <button data-idx="${idx}" class="remove-step text-gray-300 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </button>
                                </div>
                                
                                <textarea data-idx="${idx}" placeholder="${i18n.t("content_placeholder")}" class="step-content w-full bg-gray-50/50 border-none rounded-lg p-2 text-sm outline-none resize-none focus:bg-gray-50">${step.content || ''}</textarea>
                                
                                ${['IMAGE', 'AUDIO', 'PTT'].includes(step.type) ? `
                                    <input data-idx="${idx}" type="text" placeholder="${i18n.t("media_url")}" value="${step.mediaUrl || ''}" class="step-url w-full mt-2 bg-gray-50/50 border-none rounded-lg px-2 py-1 text-[10px] font-mono outline-none">
                                ` : ''}

                                <div class="mt-3 flex items-center gap-4 border-t border-gray-50 pt-2">
                                    <div class="flex items-center gap-2">
                                        <span class="text-[9px] text-gray-400 uppercase">${i18n.t("wait")}</span>
                                        <input data-idx="${idx}" type="number" value="${step.delayMs || 1000}" class="step-delay w-14 bg-transparent text-[10px] font-bold outline-none">
                                        <span class="text-[9px] text-gray-400">${i18n.t("ms")}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-[9px] text-gray-400 uppercase">${i18n.t("jitter")}</span>
                                        <input data-idx="${idx}" type="number" value="${step.jitterPct || 10}" class="step-jitter w-10 bg-transparent text-[10px] font-bold outline-none">
                                        <span class="text-[9px] text-gray-400">%</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex justify-between pt-4 border-t border-gray-100">
                    <button id="deleteFlowBtn" class="${isNew ? 'hidden' : ''} text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1">${i18n.t("delete_flow")}</button>
                    <div class="flex gap-2">
                        <button id="cancelBtn" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">${i18n.t("cancel")}</button>
                        <button id="saveBtn" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all active:scale-95 shadow-sm">
                            ${isNew ? i18n.t("create_flow") : i18n.t("save_changes")}
                        </button>
                    </div>
                </div>
            </div>
        `;
        bindEvents();
    };

    const bindEvents = () => {
        // Steps
        const addBtn = form.querySelector("#addStepBtn") as HTMLElement;
        if (addBtn) addBtn.onclick = () => {
            syncState();
            steps.push({ type: 'TEXT', content: '', delayMs: 1000, jitterPct: 10 });
            render();
        };

        form.querySelectorAll(".remove-step").forEach((btn: any) => {
            (btn as HTMLElement).onclick = () => {
                syncState();
                const idx = parseInt(btn.dataset.idx);
                steps.splice(idx, 1);
                render();
            };
        });

        form.querySelectorAll(".step-type").forEach((sel: any) => {
            (sel as HTMLElement).onchange = () => {
                syncState();
                const idx = parseInt(sel.dataset.idx);
                steps[idx].type = sel.value;
                render();
            };
        });

        // Triggers
        const addTriggerBtn = form.querySelector("#addTriggerBtn") as HTMLElement;
        if (addTriggerBtn) addTriggerBtn.onclick = () => {
            syncState();
            triggers.push({ keyword: '', matchType: 'CONTAINS' });
            render();
        };

        form.querySelectorAll(".remove-trigger").forEach((btn: any) => {
            (btn as HTMLElement).onclick = () => {
                syncState();
                triggers.splice(parseInt(btn.dataset.idx), 1);
                render();
            };
        });

        // Global Actions
        (form.querySelector("#cancelBtn") as HTMLElement).onclick = () => modal.close();

        (form.querySelector("#saveBtn") as HTMLElement).onclick = async () => {
            syncState();
            const bot = botStore.getCurrentBot();
            if (!bot) return;

            const payload = {
                botId: bot.id,
                name: (form.querySelector("#flowName") as HTMLInputElement).value,
                description: (form.querySelector("#flowDesc") as HTMLInputElement).value,
                steps: steps,
                triggers: triggers
            };

            const btn = form.querySelector("#saveBtn") as HTMLButtonElement;
            btn.disabled = true;
            btn.textContent = i18n.t("saving");

            try {
                if (isNew) {
                    await ApiClient.post("/flows", payload);
                } else {
                    await ApiClient.put(`/flows/${flowId}`, payload);
                }
                botStore.refresh();
                modal.close();
            } catch (e) {
                alert(i18n.t("failed_save"));
                btn.disabled = false;
                btn.textContent = isNew ? i18n.t("create_flow") : i18n.t("save_changes");
            }
        };

        if (!isNew) {
            (form.querySelector("#deleteFlowBtn") as HTMLElement).onclick = async () => {
                if (confirm(i18n.t("delete_flow_confirm"))) {
                    await ApiClient.delete(`/flows/${flowId}`);
                    botStore.refresh();
                    modal.close();
                }
            };
        }
    };

    const syncState = () => {
        // Steps Sync
        form.querySelectorAll(".step-content").forEach((el: any) => {
            steps[parseInt(el.dataset.idx)].content = el.value;
        });
        form.querySelectorAll(".step-url").forEach((el: any) => {
            steps[parseInt(el.dataset.idx)].mediaUrl = el.value;
        });
        form.querySelectorAll(".step-delay").forEach((el: any) => {
            steps[parseInt(el.dataset.idx)].delayMs = parseInt(el.value);
        });
        form.querySelectorAll(".step-jitter").forEach((el: any) => {
            steps[parseInt(el.dataset.idx)].jitterPct = parseInt(el.value);
        });

        // Triggers Sync
        form.querySelectorAll(".trigger-keyword").forEach((el: any) => {
            triggers[parseInt(el.dataset.idx)].keyword = el.value;
        });
        form.querySelectorAll(".trigger-match").forEach((el: any) => {
            triggers[parseInt(el.dataset.idx)].matchType = el.value;
        });
    };

    const modal = new Modal(isNew ? i18n.t("create_flow") : i18n.t("edit"), form);
    render();
};
