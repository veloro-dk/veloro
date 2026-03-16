const ALPHABETICAL_COLLATOR = new Intl.Collator("en", {
    sensitivity: "base",
    numeric: true,
});

function compareAlphabetical(left: string, right: string) {
    const baseComparison = ALPHABETICAL_COLLATOR.compare(left, right);
    if (baseComparison !== 0) return baseComparison;
    return left.localeCompare(right, "en", { sensitivity: "variant", numeric: true });
}

export function tokenizeMultiValueInput(rawValue: string) {
    return rawValue
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

export function normalizeMultiValueList(values: readonly string[]) {
    const seen = new Set<string>();
    const normalized: string[] = [];

    values.forEach((entry) => {
        const trimmed = entry.trim();
        if (!trimmed || seen.has(trimmed)) return;
        seen.add(trimmed);
        normalized.push(trimmed);
    });

    return normalized.sort(compareAlphabetical);
}

export type AppendMultiValueResult = {
    nextValues: string[];
    addedValues: string[];
    duplicateValues: string[];
};

export function appendMultiValueInput(
    current: readonly string[],
    rawInput: string
): AppendMultiValueResult {
    const startingValues = normalizeMultiValueList(current);
    const seen = new Set(startingValues);
    const addedValues: string[] = [];
    const duplicateValues: string[] = [];

    tokenizeMultiValueInput(rawInput).forEach((token) => {
        if (seen.has(token)) {
            duplicateValues.push(token);
            return;
        }
        seen.add(token);
        addedValues.push(token);
    });

    return {
        nextValues: normalizeMultiValueList([...startingValues, ...addedValues]),
        addedValues,
        duplicateValues,
    };
}

export function removeMultiValue(values: readonly string[], valueToRemove: string) {
    if (!valueToRemove) return normalizeMultiValueList(values);
    return normalizeMultiValueList(values.filter((value) => value !== valueToRemove));
}
