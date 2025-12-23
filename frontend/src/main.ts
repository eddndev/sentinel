import "./style.css";
import { Navbar } from "./components/Navbar";
import { UploadManager } from "./components/UploadManager";
import { FlowList } from "./components/FlowList";
import { botStore } from "./core/bot.store";

const app = document.querySelector<HTMLDivElement>("#app")!;

// Init Store
botStore.init();

const layout = () => {
    app.innerHTML = "";
    app.className = "min-h-screen bg-gray-50 font-sans text-gray-900";

    const nav = Navbar();
    const main = document.createElement("main");
    main.className = "max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8";

    // Left Col: Flows (2 cols wide)
    const leftCol = document.createElement("div");
    leftCol.className = "lg:col-span-2 space-y-6";
    leftCol.appendChild(FlowList());

    // Right Col: Utilities
    const rightCol = document.createElement("div");
    rightCol.className = "space-y-6";
    rightCol.appendChild(UploadManager());

    main.appendChild(leftCol);
    main.appendChild(rightCol);

    app.appendChild(nav);
    app.appendChild(main);
};

layout();
