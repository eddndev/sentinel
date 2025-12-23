import { i18n } from "../core/i18n";
import { ApiClient } from "../core/api";

export const UploadManager = () => {
    const container = document.createElement("div");
    container.className = "bg-white rounded-xl shadow-sm border border-gray-100 p-6";

    const header = document.createElement("h2");
    header.className = "text-lg font-semibold text-gray-800 mb-4";

    // Dropzone
    const dropzone = document.createElement("div");
    dropzone.className = "border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-indigo-400 hover:bg-gray-50 transition-all cursor-pointer group";

    const icon = document.createElement("div");
    icon.innerHTML = `<svg class="w-10 h-10 mx-auto text-gray-400 group-hover:text-indigo-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>`;

    const label = document.createElement("p");
    label.className = "text-gray-500 group-hover:text-gray-700";

    const input = document.createElement("input");
    input.type = "file";
    input.className = "hidden";

    dropzone.appendChild(icon);
    dropzone.appendChild(label);
    dropzone.appendChild(input);

    const fileList = document.createElement("div");
    fileList.className = "mt-4 space-y-2";

    const updateTexts = () => {
        header.textContent = i18n.t("uploads");
        label.textContent = i18n.t("drop_file");
    };

    i18n.subscribe(updateTexts);
    updateTexts();

    // Logic
    const handleUpload = async (file: File) => {
        try {
            label.textContent = "Uploading...";
            const res = await ApiClient.upload(file);
            console.log(res);

            // Add to list
            const item = document.createElement("div");
            item.className = "flex items-center justify-between text-sm p-2 bg-gray-50 rounded border";
            item.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden">
                    <span class="font-medium truncate max-w-[150px]">${res.filename}</span>
                    <a href="${res.url}" target="_blank" class="text-xs text-blue-500 hover:underline">View</a>
                </div>
                <button class="text-xs text-gray-400 hover:text-green-600" onclick="navigator.clipboard.writeText('${res.url}')">Copy</button>
            `;
            fileList.prepend(item);

            label.textContent = i18n.t("drop_file");
        } catch (e) {
            console.error(e);
            label.textContent = "Error!";
            setTimeout(() => label.textContent = i18n.t("drop_file"), 2000);
        }
    };

    dropzone.onclick = () => input.click();
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleUpload(file);
    };

    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add("border-indigo-400"); };
    dropzone.ondragleave = () => dropzone.classList.remove("border-indigo-400");
    dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove("border-indigo-400");
        const file = e.dataTransfer?.files[0];
        if (file) handleUpload(file);
    };

    container.appendChild(header);
    container.appendChild(dropzone);
    container.appendChild(fileList);

    return container;
};
