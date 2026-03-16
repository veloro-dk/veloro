import { SUPPORTED_CURRENCIES } from "@/i18n/portal";

const ISO_CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export function isIsoCurrencyCode(value: string | null | undefined): value is string {
    if (!value) return false;
    return ISO_CURRENCY_CODE_PATTERN.test(value);
}

export function getLocalIsoCurrencyCodes() {
    if (typeof Intl === "undefined") return [...SUPPORTED_CURRENCIES];

    const intlWithSupportedValues = Intl as typeof Intl & {
        supportedValuesOf?: (key: string) => string[];
    };

    if (typeof intlWithSupportedValues.supportedValuesOf !== "function") {
        return [...SUPPORTED_CURRENCIES];
    }

    try {
        return Array.from(new Set(
            intlWithSupportedValues
                .supportedValuesOf("currency")
                .map((code) => code.toUpperCase())
                .filter((code): code is string => isIsoCurrencyCode(code))
        )).sort((left, right) => left.localeCompare(right));
    } catch {
        return [...SUPPORTED_CURRENCIES];
    }
}

export function mergeCurrencyCodes(...groups: Array<ReadonlyArray<string>>) {
    return Array.from(new Set(groups.flatMap((group) => group)))
        .filter((code): code is string => isIsoCurrencyCode(code))
        .sort((left, right) => left.localeCompare(right));
}

export function getCurrencySymbol(code: string, locale: string) {
    try {
        const formatter = new Intl.NumberFormat(locale, { style: "currency", currency: code });
        const part = formatter.formatToParts(0).find((entry) => entry.type === "currency");
        return part?.value ?? "";
    } catch {
        return "";
    }
}

export function getCurrencyDisplayLabel(code: string, locale: string) {
    const normalizedCode = code.toUpperCase();
    let currencyName = normalizedCode;
    try {
        const displayNames = new Intl.DisplayNames([locale], { type: "currency" });
        currencyName = displayNames.of(normalizedCode) ?? normalizedCode;
    } catch {
        currencyName = normalizedCode;
    }

    const symbol = getCurrencySymbol(normalizedCode, locale);
    if (!symbol || symbol === normalizedCode) {
        return `${currencyName} (${normalizedCode})`;
    }
    return `${currencyName} (${normalizedCode} ${symbol})`;
}

export function getCurrencySelectorLabel(code: string, locale: string) {
    const normalizedCode = code.toUpperCase();
    const symbol = getCurrencySymbol(normalizedCode, locale);
    if (!symbol || symbol === normalizedCode) return normalizedCode;
    return `${normalizedCode} ${symbol}`;
}
