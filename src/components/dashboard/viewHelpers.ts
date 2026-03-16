import type { DashboardMessages } from "@/i18n/dashboard";
import { SUPPORTED_CURRENCIES } from "@/i18n/portal";
import {
    DASHBOARD_DATE_INPUT_PATTERN,
    DASHBOARD_FALLBACK_USD_RATES,
    DAY_MS,
    type DashboardDatePreset,
    type DashboardDateRange,
    type DashboardMetrics,
} from "@/components/dashboard/viewConfig";

export function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export function parseTimestamp(value: string | null | undefined) {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
}

export function toStartOfDay(timestamp: number) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

export function toEndOfDay(timestamp: number) {
    const date = new Date(timestamp);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
}

export function formatDateInputValue(timestamp: number) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function parseDateInputToStart(value: string | null | undefined) {
    if (!value || !DASHBOARD_DATE_INPUT_PATTERN.test(value)) return null;
    const timestamp = Date.parse(`${value}T00:00:00`);
    return Number.isNaN(timestamp) ? null : toStartOfDay(timestamp);
}

export function parseDateInputToEnd(value: string | null | undefined) {
    if (!value || !DASHBOARD_DATE_INPUT_PATTERN.test(value)) return null;
    const timestamp = Date.parse(`${value}T00:00:00`);
    return Number.isNaN(timestamp) ? null : toEndOfDay(timestamp);
}

export function buildPresetDateRange(preset: DashboardDatePreset, nowTimestamp: number): DashboardDateRange {
    const end = toEndOfDay(nowTimestamp);
    const startToday = toStartOfDay(nowTimestamp);
    const todayDate = new Date(startToday);
    const yesterdayStart = startToday - DAY_MS;

    switch (preset) {
        case "yesterday":
            return {
                preset,
                startDate: formatDateInputValue(yesterdayStart),
                endDate: formatDateInputValue(yesterdayStart),
            };
        case "last-week":
            return {
                preset,
                startDate: formatDateInputValue(startToday - (6 * DAY_MS)),
                endDate: formatDateInputValue(end),
            };
        case "last-month": {
            const next = new Date(todayDate);
            next.setMonth(next.getMonth() - 1);
            return {
                preset,
                startDate: formatDateInputValue(next.getTime()),
                endDate: formatDateInputValue(end),
            };
        }
        case "last-quarter": {
            const next = new Date(todayDate);
            next.setMonth(next.getMonth() - 3);
            return {
                preset,
                startDate: formatDateInputValue(next.getTime()),
                endDate: formatDateInputValue(end),
            };
        }
        case "last-year": {
            const next = new Date(todayDate);
            next.setFullYear(next.getFullYear() - 1);
            return {
                preset,
                startDate: formatDateInputValue(next.getTime()),
                endDate: formatDateInputValue(end),
            };
        }
        case "none":
        default:
            return { preset: "none", startDate: null, endDate: null };
    }
}

export function normalizeDateRange(range: DashboardDateRange) {
    const start = parseDateInputToStart(range.startDate);
    const end = parseDateInputToEnd(range.endDate);

    if (start === null && end === null) {
        return { preset: range.preset, startDate: null, endDate: null };
    }
    if (start === null || end === null) {
        return {
            preset: range.preset,
            startDate: start !== null ? formatDateInputValue(start) : null,
            endDate: end !== null ? formatDateInputValue(end) : null,
        };
    }

    if (start <= end) {
        return {
            preset: range.preset,
            startDate: formatDateInputValue(start),
            endDate: formatDateInputValue(end),
        };
    }

    return {
        preset: range.preset,
        startDate: formatDateInputValue(end),
        endDate: formatDateInputValue(start),
    };
}

export function resolveDateRangeTimestamps(range: DashboardDateRange) {
    const start = parseDateInputToStart(range.startDate);
    const end = parseDateInputToEnd(range.endDate);
    if (start === null || end === null) return { startAt: null, endAt: null };
    return start <= end
        ? { startAt: start, endAt: end }
        : { startAt: end, endAt: start };
}

export function buildCalendarMonthGrid(monthTimestamp: number) {
    const monthStart = new Date(monthTimestamp);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const firstWeekday = monthStart.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const timestamp = new Date(year, month, day).getTime();
        return {
            day,
            timestamp,
            value: formatDateInputValue(timestamp),
        };
    });

    return { monthStart: monthStart.getTime(), firstWeekday, days };
}

export function toDayKey(timestamp: number) {
    return new Date(timestamp).toISOString().slice(0, 10);
}

export function toPercentage(part: number, total: number) {
    if (total <= 0) return 0;
    return clamp(Math.round((part / total) * 100), 0, 100);
}

export function normalizeSparkline(values: number[]) {
    if (values.length === 0) return [20, 20, 20, 20, 20, 20];
    const maxValue = Math.max(...values);
    if (maxValue <= 0) return values.map(() => 20);
    return values.map((value) => clamp(Math.round((value / maxValue) * 70) + 18, 12, 94));
}

export function normalizeLineSeries(values: number[]) {
    if (values.length === 0) return [];
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    if (Math.abs(maxValue - minValue) < 0.0001) return values.map(() => 50);
    return values.map((value) => clamp(Math.round(((value - minValue) / (maxValue - minValue)) * 100), 0, 100));
}

export function sampleSeries<T>(values: T[], maxPoints: number) {
    if (values.length <= maxPoints) return [...values];
    const sampled: T[] = [];
    const step = (values.length - 1) / (maxPoints - 1);
    for (let index = 0; index < maxPoints; index += 1) {
        sampled.push(values[Math.round(index * step)]);
    }
    return sampled;
}

export function toScatterChartPoints(
    values: Array<{ x: number; y: number }>,
    maxPoints: number
) {
    const sampled = sampleSeries(values, maxPoints).filter(
        (entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y)
    );
    if (sampled.length === 0) return [];
    const xValues = sampled.map((entry) => entry.x);
    const yValues = sampled.map((entry) => entry.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    return sampled.map((entry) => ({
        x: xRange > 0 ? ((entry.x - minX) / xRange) * 100 : 50,
        y: yRange > 0 ? ((entry.y - minY) / yRange) * 100 : 50,
    }));
}

export function isIsoCurrencyCode(value: string | null | undefined): value is string {
    if (!value) return false;
    return /^[A-Z]{3}$/.test(value);
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

export function convertCurrencyAmount(value: number, from: string, to: string, usdRates: Record<string, number>) {
    if (!Number.isFinite(value) || from === to) return value;
    const fromRate = usdRates[from] ?? DASHBOARD_FALLBACK_USD_RATES[from] ?? 0;
    const toRate = usdRates[to] ?? DASHBOARD_FALLBACK_USD_RATES[to] ?? 0;
    if (fromRate <= 0 || toRate <= 0) return value;
    const valueInUsd = value / fromRate;
    return valueInUsd * toRate;
}

export function convertMetricsCurrency(
    metrics: DashboardMetrics,
    from: string,
    to: string,
    usdRates: Record<string, number>
): DashboardMetrics {
    if (from === to) return metrics;
    return {
        ...metrics,
        inventoryCostValue: convertCurrencyAmount(metrics.inventoryCostValue, from, to, usdRates),
        inventoryRetailValue: convertCurrencyAmount(metrics.inventoryRetailValue, from, to, usdRates),
        inventoryMarginPotential: convertCurrencyAmount(metrics.inventoryMarginPotential, from, to, usdRates),
        salesLast30Revenue: convertCurrencyAmount(metrics.salesLast30Revenue, from, to, usdRates),
        marginLast30Amount: convertCurrencyAmount(metrics.marginLast30Amount, from, to, usdRates),
        costOfGoodsSold: convertCurrencyAmount(metrics.costOfGoodsSold, from, to, usdRates),
        profitTotal: convertCurrencyAmount(metrics.profitTotal, from, to, usdRates),
        averageProfitPerOrder: convertCurrencyAmount(metrics.averageProfitPerOrder, from, to, usdRates),
        averageProfitPerUnit: convertCurrencyAmount(metrics.averageProfitPerUnit, from, to, usdRates),
        averageProfitPerProduct: convertCurrencyAmount(metrics.averageProfitPerProduct, from, to, usdRates),
        categoryProfitRows: metrics.categoryProfitRows.map((row) => ({
            ...row,
            revenue: convertCurrencyAmount(row.revenue, from, to, usdRates),
            cost: convertCurrencyAmount(row.cost, from, to, usdRates),
            profit: convertCurrencyAmount(row.profit, from, to, usdRates),
        })),
        priceProfitPoints: metrics.priceProfitPoints.map((point) => ({
            price: convertCurrencyAmount(point.price, from, to, usdRates),
            profitPerUnit: convertCurrencyAmount(point.profitPerUnit, from, to, usdRates),
        })),
        holdingProfitPoints: metrics.holdingProfitPoints.map((point) => ({
            ...point,
            profitPerUnit: convertCurrencyAmount(point.profitPerUnit, from, to, usdRates),
        })),
        variantPerformanceRows: metrics.variantPerformanceRows.map((row) => ({
            ...row,
            profit: convertCurrencyAmount(row.profit, from, to, usdRates),
        })),
        topStockRows: metrics.topStockRows.map((row) => ({
            ...row,
            value: convertCurrencyAmount(row.value, from, to, usdRates),
        })),
        movementRows: metrics.movementRows.map((row) => ({
            ...row,
            amount: convertCurrencyAmount(row.amount, from, to, usdRates),
        })),
    };
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

export function getCurrencySymbol(code: string, locale: string) {
    try {
        const formatter = new Intl.NumberFormat(locale, { style: "currency", currency: code });
        const part = formatter.formatToParts(0).find((entry) => entry.type === "currency");
        return part?.value ?? "";
    } catch {
        return "";
    }
}

export function getCurrencySelectorLabel(code: string, locale: string) {
    const normalizedCode = code.toUpperCase();
    const symbol = getCurrencySymbol(normalizedCode, locale);
    if (!symbol || symbol === normalizedCode) return normalizedCode;
    return `${normalizedCode} ${symbol}`;
}

function formatExactClockTime(timestamp: number, locale: string) {
    const parts = new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(timestamp);

    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
    return `${hour}.${minute}`;
}

export function formatLastUpdatedTime(
    lastEditedAt: number | null,
    nowTimestamp: number,
    locale: string,
    messages: DashboardMessages
) {
    const source = (lastEditedAt && Number.isFinite(lastEditedAt)) ? lastEditedAt : nowTimestamp;
    const formattedTime = formatExactClockTime(source, locale);
    return messages.lastUpdatedAt.replace("{time}", formattedTime);
}
