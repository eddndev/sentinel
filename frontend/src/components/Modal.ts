export class Modal {
    private overlay: HTMLDivElement;
    private container: HTMLDivElement;
    private onClose?: () => void;

    constructor(title: string, content: HTMLElement, onClose?: () => void) {
        this.onClose = onClose;

        // Overlay with Blur
        this.overlay = document.createElement("div");
        this.overlay.className = "fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center opacity-0 transition-opacity duration-200";

        // Modal Container
        this.container = document.createElement("div");
        this.container.className = "bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform scale-95 transition-transform duration-200";

        // Header
        const header = document.createElement("div");
        header.className = "flex justify-between items-center mb-4";

        const h2 = document.createElement("h2");
        h2.className = "text-xl font-bold text-gray-900";
        h2.textContent = title;

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "×";
        closeBtn.className = "text-gray-400 hover:text-gray-600 text-2xl font-light leading-none";
        closeBtn.onclick = () => this.close();

        header.appendChild(h2);
        header.appendChild(closeBtn);

        this.container.appendChild(header);
        this.container.appendChild(content);
        this.overlay.appendChild(this.container);

        // Click outside to close
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) this.close();
        };

        document.body.appendChild(this.overlay);

        // Animate In
        requestAnimationFrame(() => {
            this.overlay.classList.remove("opacity-0");
            this.container.classList.remove("scale-95");
            this.container.classList.add("scale-100");
        });
    }

    close() {
        this.overlay.classList.add("opacity-0");
        this.container.classList.remove("scale-100");
        this.container.classList.add("scale-95");

        setTimeout(() => {
            this.overlay.remove();
            if (this.onClose) this.onClose();
        }, 200);
    }
}
