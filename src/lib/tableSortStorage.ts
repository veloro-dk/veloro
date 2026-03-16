export function loadStoredSortKey<T extends string>(
    storageKey: string,
    allowedValues: readonly T[],
    fallback: T
) {
    if (typeof window === "undefined") return fallback;
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return fallback;
        return allowedValues.includes(raw as T) ? (raw as T) : fallback;
    } catch {
        return fallback;
    }
}

export function saveStoredSortKey(storageKey: string, value: string) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(storageKey, value);
    } catch {
        // Ignore storage quota errors.
    }
}
