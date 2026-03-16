import type { CurrencyCode } from "@/i18n/portal";

// Approximate FX rates anchored to USD for dashboard/statistical normalization.
const CURRENCY_TO_USD_RATE: Record<CurrencyCode, number> = {
    USD: 1,
    EUR: 1.09,
    DKK: 0.145,
    GBP: 1.27,
    CAD: 0.74,
    AUD: 0.66,
    SEK: 0.095,
    NOK: 0.094,
    CHF: 1.11,
    JPY: 0.0067,
};

function roundCurrency(value: number) {
    return Math.round(value * 100) / 100;
}

export function convertCurrencyAmount(amount: number, from: CurrencyCode, to: CurrencyCode) {
    const sourceRate = CURRENCY_TO_USD_RATE[from] ?? 1;
    const targetRate = CURRENCY_TO_USD_RATE[to] ?? 1;

    if (!Number.isFinite(amount)) return 0;
    if (sourceRate <= 0 || targetRate <= 0) return roundCurrency(amount);

    const amountInUsd = amount * sourceRate;
    return roundCurrency(amountInUsd / targetRate);
}
