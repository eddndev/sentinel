import { en } from "../locales/en";
import { es } from "../locales/es";

type Locale = "en" | "es";
type Dictionary = typeof en;

export class I18n {
    private static instance: I18n;
    private currentLocale: Locale = "en";
    private dictionary: Dictionary = en;
    private listeners: Function[] = [];

    private constructor() {
        const saved = localStorage.getItem("sentinel_lang") as Locale;
        if (saved && (saved === "en" || saved === "es")) {
            this.setLocale(saved);
        }
    }

    static getInstance(): I18n {
        if (!I18n.instance) {
            I18n.instance = new I18n();
        }
        return I18n.instance;
    }

    setLocale(locale: Locale) {
        this.currentLocale = locale;
        this.dictionary = locale === "es" ? es : en;
        localStorage.setItem("sentinel_lang", locale);
        this.notify();
    }

    getLocale(): Locale {
        return this.currentLocale;
    }

    t(key: keyof Dictionary): string {
        return this.dictionary[key] || key;
    }

    subscribe(listener: Function) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(fn => fn());
    }
}

export const i18n = I18n.getInstance();
