import {
    BUILT_IN_VIEW_IDS,
    CATEGORY_CUSTOM_VIEWS_STORAGE_KEY,
    SORT_KEYS,
    DEFAULT_FILTERS,
    type CategoriesTranslations,
    type CategoryFilters,
    type CategoryView,
} from "@/components/categories/viewConfig";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function parseCategoryFilters(value: unknown): CategoryFilters {
    if (!isRecord(value)) return { ...DEFAULT_FILTERS };
    return {
        query: typeof value.query === "string" ? value.query : "",
        condition: typeof value.condition === "string" && value.condition.trim() ? value.condition : "ALL",
    };
}

function parseStoredCategoryView(value: unknown): CategoryView | null {
    if (!isRecord(value)) return null;
    if (value.builtIn === true) return null;

    const id = typeof value.id === "string" ? value.id.trim() : "";
    const label = typeof value.label === "string" ? value.label.trim() : "";
    if (!id || !label || BUILT_IN_VIEW_IDS.has(id)) return null;

    return {
        id,
        label,
        builtIn: false,
        filters: parseCategoryFilters(value.filters),
    };
}

function parseStoredColumnIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

export function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function parseVariantValues(value: string) {
    return Array.from(
        new Set(
            value
                .split(",")
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0)
        )
    );
}

export function fillTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce((result, [key, value]) => (
        result.replace(new RegExp(`\\{${key}\\}`, "g"), value)
    ), template);
}

export function getSortOptions(text: CategoriesTranslations) {
    return SORT_KEYS.map((value) => ({
        value,
        label: text.sort.options[value],
    }));
}

export function getViewLabel(view: CategoryView, text: CategoriesTranslations) {
    if (!view.builtIn || !view.builtInId) return view.label;
    return text.views[view.builtInId];
}

export function loadCategoryCustomViewsFromStorage() {
    if (typeof window === "undefined") return [] as CategoryView[];

    try {
        const raw = window.localStorage.getItem(CATEGORY_CUSTOM_VIEWS_STORAGE_KEY);
        if (!raw) return [] as CategoryView[];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [] as CategoryView[];

        const seen = new Set<string>();
        const customViews: CategoryView[] = [];
        parsed.forEach((entry) => {
            const normalized = parseStoredCategoryView(entry);
            if (!normalized || seen.has(normalized.id)) return;
            seen.add(normalized.id);
            customViews.push(normalized);
        });
        return customViews;
    } catch {
        return [] as CategoryView[];
    }
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
