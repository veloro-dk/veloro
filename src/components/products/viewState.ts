import type { LanguageCode } from "@/i18n/portal";
import type { CatalogProduct } from "@/lib/productCatalog";

export type Product = CatalogProduct;
export type ProductStatus = Product["status"];

export type ProductFilters = {
    query: string;
    status: "ANY" | ProductStatus;
    category: string;
    tag: string;
    variantValues: Record<string, string>;
};

export type ProductView = {
    id: string;
    label: string;
    builtIn: boolean;
    builtInId?: "all" | "active" | "draft" | "archived";
    filters: ProductFilters;
};

export const DEFAULT_FILTERS: ProductFilters = {
    query: "",
    status: "ANY",
    category: "ALL",
    tag: "ALL",
    variantValues: {},
};

export const BUILT_IN_VIEWS: ProductView[] = [
    { id: "all", builtInId: "all", label: "all", builtIn: true, filters: { ...DEFAULT_FILTERS } },
    { id: "active", builtInId: "active", label: "active", builtIn: true, filters: { ...DEFAULT_FILTERS, status: "ACTIVE" } },
    { id: "draft", builtInId: "draft", label: "draft", builtIn: true, filters: { ...DEFAULT_FILTERS, status: "DRAFT" } },
    { id: "archived", builtInId: "archived", label: "archived", builtIn: true, filters: { ...DEFAULT_FILTERS, status: "ARCHIVED" } },
];

export const BUILT_IN_VIEW_IDS = new Set(BUILT_IN_VIEWS.map((view) => view.id));

export const SORT_KEYS = ["updated-desc", "updated-asc", "name-asc", "name-desc", "inventory-desc", "inventory-asc", "status"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const PRODUCT_CUSTOM_VIEWS_STORAGE_KEY = "veloro_products_custom_views_v1";
export const PRODUCT_VISIBLE_COLUMNS_STORAGE_KEY = "veloro_products_visible_columns_v1";
export const PRODUCT_SORT_STORAGE_KEY = "veloro_products_sort_v1";

export const STATUS_SORT_ORDER: Record<ProductStatus, number> = {
    ACTIVE: 1,
    DRAFT: 2,
    ARCHIVED: 3,
};

export const LANGUAGE_TO_LOCALE: Record<LanguageCode, string> = {
    en: "en-US",
    da: "da-DK",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    zh: "zh-CN",
};

export function cloneFilters(filters: ProductFilters): ProductFilters {
    return {
        ...filters,
        variantValues: { ...filters.variantValues },
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function parseProductFilters(value: unknown): ProductFilters {
    if (!isRecord(value)) return cloneFilters(DEFAULT_FILTERS);

    const status = value.status;
    const normalizedStatus: ProductFilters["status"] = status === "ACTIVE" || status === "DRAFT" || status === "ARCHIVED" || status === "ANY"
        ? status
        : "ANY";

    const variantValuesSource = isRecord(value.variantValues) ? value.variantValues : {};
    const variantValues = Object.entries(variantValuesSource).reduce<Record<string, string>>((result, [variantId, variantValue]) => {
        if (typeof variantValue !== "string" || !variantValue.trim()) return result;
        result[variantId] = variantValue;
        return result;
    }, {});

    return {
        query: typeof value.query === "string" ? value.query : "",
        status: normalizedStatus,
        category: typeof value.category === "string" && value.category.trim() ? value.category : "ALL",
        tag: typeof value.tag === "string" && value.tag.trim() ? value.tag : "ALL",
        variantValues,
    };
}

function parseStoredProductView(value: unknown): ProductView | null {
    if (!isRecord(value)) return null;
    if (value.builtIn === true) return null;

    const id = typeof value.id === "string" ? value.id.trim() : "";
    const label = typeof value.label === "string" ? value.label.trim() : "";
    if (!id || !label || BUILT_IN_VIEW_IDS.has(id)) return null;

    return {
        id,
        label,
        builtIn: false,
        filters: parseProductFilters(value.filters),
    };
}

export function loadProductCustomViewsFromStorage() {
    if (typeof window === "undefined") return [] as ProductView[];

    try {
        const raw = window.localStorage.getItem(PRODUCT_CUSTOM_VIEWS_STORAGE_KEY);
        if (!raw) return [] as ProductView[];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [] as ProductView[];

        const seen = new Set<string>();
        const customViews: ProductView[] = [];
        parsed.forEach((entry) => {
            const normalized = parseStoredProductView(entry);
            if (!normalized || seen.has(normalized.id)) return;
            seen.add(normalized.id);
            customViews.push(normalized);
        });
        return customViews;
    } catch {
        return [] as ProductView[];
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

export function formatInventory(count: number) {
    return String(Math.max(0, count));
}

export function fillTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce((result, [key, value]) => (
        result.replace(new RegExp(`\\{${key}\\}`, "g"), value)
    ), template);
}

export function getSortOptions(text: { sort: { options: Record<SortKey, string> } }) {
    return SORT_KEYS.map((value) => ({
        value,
        label: text.sort.options[value],
    }));
}

export function getViewLabel(
    view: ProductView,
    text: { views: Record<"all" | "active" | "draft" | "archived", string> }
) {
    if (!view.builtIn || !view.builtInId) return view.label;
    return text.views[view.builtInId];
}
