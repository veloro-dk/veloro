import type { LanguageCode } from "@/i18n/portal";
import type { CatalogProduct } from "@/lib/productCatalog";

export type Product = CatalogProduct;

export const INVENTORY_SORT_KEYS = ["updated-desc", "updated-asc", "name-asc", "name-desc", "inventory-desc", "inventory-asc"] as const;
export type SortKey = (typeof INVENTORY_SORT_KEYS)[number];

export type InventoryFilters = {
    query: string;
    condition: "ALL" | Product["status"];
};

export type InventoryView = {
    id: string;
    label: string;
    builtIn: boolean;
    builtInId?: "all";
    filters: InventoryFilters;
};

const DEFAULT_FILTERS: InventoryFilters = {
    query: "",
    condition: "ACTIVE",
};

export const BUILT_IN_VIEWS: InventoryView[] = [
    { id: "all", builtInId: "all", label: "all", builtIn: true, filters: { ...DEFAULT_FILTERS } },
];

const BUILT_IN_VIEW_IDS = new Set(BUILT_IN_VIEWS.map((view) => view.id));

export const INVENTORY_CUSTOM_VIEWS_STORAGE_KEY = "veloro_inventory_custom_views_v1";
export const INVENTORY_VISIBLE_COLUMNS_STORAGE_KEY = "veloro_inventory_visible_columns_v1";
export const INVENTORY_SORT_STORAGE_KEY = "veloro_inventory_sort_v1";

export const LANGUAGE_TO_LOCALE: Record<LanguageCode, string> = {
    en: "en-US",
    da: "da-DK",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    zh: "zh-CN",
};

export const INVENTORY_FALLBACK_USD_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    DKK: 6.89,
    GBP: 0.78,
    CAD: 1.35,
    AUD: 1.51,
    SEK: 10.38,
    NOK: 10.62,
    CHF: 0.88,
    JPY: 148.2,
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function cloneFilters(filters: InventoryFilters): InventoryFilters {
    return {
        query: filters.query,
        condition: filters.condition,
    };
}

function parseInventoryFilters(value: unknown): InventoryFilters {
    if (!isRecord(value)) return { ...DEFAULT_FILTERS };

    const rawCondition = value.condition;
    const condition = rawCondition === "ALL"
        || rawCondition === "ACTIVE"
        || rawCondition === "DRAFT"
        || rawCondition === "ARCHIVED"
        ? rawCondition
        : "ACTIVE";

    return {
        query: typeof value.query === "string" ? value.query : "",
        condition,
    };
}

function parseStoredInventoryView(value: unknown): InventoryView | null {
    if (!isRecord(value)) return null;
    if (value.builtIn === true) return null;

    const id = typeof value.id === "string" ? value.id.trim() : "";
    const label = typeof value.label === "string" ? value.label.trim() : "";
    if (!id || !label || BUILT_IN_VIEW_IDS.has(id)) return null;

    return {
        id,
        label,
        builtIn: false,
        filters: parseInventoryFilters(value.filters),
    };
}

export function loadInventoryCustomViewsFromStorage() {
    if (typeof window === "undefined") return [] as InventoryView[];

    try {
        const raw = window.localStorage.getItem(INVENTORY_CUSTOM_VIEWS_STORAGE_KEY);
        if (!raw) return [] as InventoryView[];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [] as InventoryView[];

        const seen = new Set<string>();
        const customViews: InventoryView[] = [];
        parsed.forEach((entry) => {
            const normalized = parseStoredInventoryView(entry);
            if (!normalized || seen.has(normalized.id)) return;
            seen.add(normalized.id);
            customViews.push(normalized);
        });
        return customViews;
    } catch {
        return [] as InventoryView[];
    }
}

function parseStoredColumnIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

export function loadStoredColumnIds(storageKey: string) {
    if (typeof window === "undefined") return [] as string[];

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return [] as string[];
        return parseStoredColumnIds(JSON.parse(raw));
    } catch {
        return [] as string[];
    }
}

export function createCustomViewId() {
    return `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getViewLabel(view: InventoryView) {
    if (!view.builtIn || !view.builtInId) return view.label;
    return "All";
}

export function fillTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce((result, [key, value]) => (
        result.replace(new RegExp(`\\{${key}\\}`, "g"), value)
    ), template);
}

export function formatInventory(count: number) {
    return String(Math.max(0, count));
}

export function formatStatus(status: Product["status"], labels: { active: string; draft: string; archived: string }) {
    if (status === "DRAFT") return labels.draft;
    if (status === "ARCHIVED") return labels.archived;
    return labels.active;
}

export function formatDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
}

export function convertWithUsdRates(amount: number, from: string, to: string, usdRates: Record<string, number>) {
    if (!Number.isFinite(amount)) return 0;
    if (from === to) return amount;
    const fromRate = usdRates[from];
    const toRate = usdRates[to];
    if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
        return amount;
    }

    const amountInUsd = amount / fromRate;
    return amountInUsd * toRate;
}
