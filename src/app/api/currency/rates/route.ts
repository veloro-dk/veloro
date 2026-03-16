import { NextResponse } from "next/server";
import { handleApiRoute } from "@/server/apiRoute";

const OPEN_ER_API_BASE_URL = "https://open.er-api.com/v6/latest/";
const CODE_PATTERN = /^[A-Z]{3}$/;
const FALLBACK_USD_RATES: Record<string, number> = {
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

type OpenErApiResponse = {
    result?: string;
    time_last_update_unix?: number;
    rates?: Record<string, number>;
};

function isCurrencyCode(value: string | null | undefined): value is string {
    return Boolean(value && CODE_PATTERN.test(value));
}

function normalizeBaseCurrency(value: string | null) {
    const normalized = (value ?? "USD").trim().toUpperCase();
    return isCurrencyCode(normalized) ? normalized : "USD";
}

function fallbackRatesForBase(base: string) {
    const baseRate = FALLBACK_USD_RATES[base] ?? FALLBACK_USD_RATES.USD;
    const rates: Record<string, number> = {};

    Object.entries(FALLBACK_USD_RATES).forEach(([code, usdRate]) => {
        if (!Number.isFinite(usdRate) || usdRate <= 0) return;
        rates[code] = usdRate / baseRate;
    });
    rates[base] = 1;
    return rates;
}

function json(
    body: {
        ok: boolean;
        base: string;
        rates: Record<string, number>;
        codes: string[];
        source: "open-er-api" | "fallback";
        updatedAt: number;
    },
    status = 200
) {
    return NextResponse.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

export const GET = handleApiRoute("api/currency/rates.GET", async (req: Request) => {
    const url = new URL(req.url);
    const base = normalizeBaseCurrency(url.searchParams.get("base"));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(`${OPEN_ER_API_BASE_URL}${base}`, {
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Currency API request failed.");
        const payload = (await response.json()) as OpenErApiResponse;
        if (payload.result !== "success" || !payload.rates || typeof payload.rates !== "object") {
            throw new Error("Currency API response was not valid.");
        }

        const rates: Record<string, number> = {};
        Object.entries(payload.rates).forEach(([code, value]) => {
            if (!isCurrencyCode(code) || typeof value !== "number" || !Number.isFinite(value) || value <= 0) return;
            rates[code] = value;
        });
        rates[base] = 1;

        const codes = Object.keys(rates).sort((left, right) => left.localeCompare(right));
        return json({
            ok: true,
            base,
            rates,
            codes,
            source: "open-er-api",
            updatedAt: typeof payload.time_last_update_unix === "number"
                ? payload.time_last_update_unix * 1000
                : Date.now(),
        });
    } catch {
        const rates = fallbackRatesForBase(base);
        return json({
            ok: true,
            base,
            rates,
            codes: Object.keys(rates).sort((left, right) => left.localeCompare(right)),
            source: "fallback",
            updatedAt: Date.now(),
        });
    }
});
