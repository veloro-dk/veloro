import Image from "next/image";
import { Info } from "lucide-react";
import type { LanguageCode } from "@/i18n/portal";
import {
    COUNTRY_OPTIONS,
    DEFAULT_COUNTRY_CODE,
    getCountryFlagUrl,
    sanitizePhoneNationalNumberInput,
} from "@/i18n/countries";
import { normalizePortalPublicPathname } from "@/lib/portalRoutes";

export const LAST_NON_SETTINGS_PATH_STORAGE_KEY = "veloro_last_non_settings_path";
export const SETTINGS_CLOSE_ANIMATION_MS = 170;
export const SEARCH_RESULTS_DELAY_MS = 140;
export const LOGIN_LOGS_PAGE_SIZE = 50;
export const FEEDBACK_INBOX_PAGE_SIZE = 50;
export const UNIT_SYSTEM_CODES = ["METRIC", "IMPERIAL"] as const;
export const DEFAULT_PRODUCT_CODE_PREFIX = "VLR";
export const LANGUAGE_TO_LOCALE: Record<LanguageCode, string> = {
    en: "en-US",
    da: "da-DK",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    zh: "zh-CN",
};

export const COUNTRY_CODE_SET = new Set(COUNTRY_OPTIONS.map((entry) => entry.code));

export function normalizeProductCodePrefixInput(input: string) {
    const normalized = input.trim().toUpperCase();
    return normalized || DEFAULT_PRODUCT_CODE_PREFIX;
}

export function getProductCodePrefixInputValue(prefix: string) {
    const normalized = prefix.trim().toUpperCase();
    return normalized === DEFAULT_PRODUCT_CODE_PREFIX ? "" : normalized;
}

export function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function normalizeSearchText(value: string) {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function resolveCloseTarget() {
    if (typeof window === "undefined") return "/";

    const stored = window.sessionStorage.getItem(LAST_NON_SETTINGS_PATH_STORAGE_KEY);
    if (stored) {
        const normalized = normalizePortalPublicPathname(stored);
        if (normalized !== "/settings") {
            return normalized;
        }
    }

    return "/";
}

export function joinStreetAndHouseNumber(street: string, houseNumber: string) {
    return `${street} ${houseNumber}`.trim();
}

export function splitStreetAndHouseNumber(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) {
        return { street: "", houseNumber: "" };
    }

    const match = normalized.match(/^(.*?)(?:\s+|,\s*)(\S+)$/);
    if (!match) {
        return { street: normalized, houseNumber: "" };
    }

    const street = match[1]?.trim() ?? "";
    const houseNumber = match[2]?.trim() ?? "";
    if (!street) {
        return { street: normalized, houseNumber: "" };
    }

    return { street, houseNumber };
}

export function formatOptionalValue(value: string | null | undefined, fallback = "Not set") {
    const normalized = typeof value === "string" ? value.trim() : "";
    return normalized || fallback;
}

export function SettingsErrorNotice({ message }: { message: string }) {
    return (
        <div className="portalSettingsFeedbackError__X4v7P9" role="alert">
            <Info aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}

export function SettingsPhoneField({
    className,
    label,
    countryCode,
    number,
    onCountryCodeChange,
    onNumberChange,
    numberPlaceholder,
}: {
    className?: string;
    label: string;
    countryCode: string;
    number: string;
    onCountryCodeChange: (next: string) => void;
    onNumberChange: (next: string) => void;
    numberPlaceholder?: string;
}) {
    const normalizedCountryCode = COUNTRY_CODE_SET.has(countryCode) ? countryCode : DEFAULT_COUNTRY_CODE;
    const flagUrl = getCountryFlagUrl(normalizedCountryCode);

    return (
        <label className={cn("portalSettingsField__D2n7V1", className)}>
            <span className="form__label__B9f4k0">{label}</span>
            <div className="form__inputPhoneNR__H5k8q0">
                <div className="form__inputPhoneNRFlag__H5k8q0">
                    <select
                        className="form__inputPhoneNR__select__H5k8q0"
                        value={normalizedCountryCode}
                        onChange={(event) => onCountryCodeChange(event.target.value)}
                        title="Select country code"
                    >
                        {COUNTRY_OPTIONS.map((option) => (
                            <option key={option.code} value={option.code}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                    <span className="form__inputPhoneNR__img--wrapper__H5k8q0" aria-hidden="true">
                        <Image
                            className="form__inputPhoneNR__img__H5k8q0"
                            src={flagUrl}
                            alt=""
                            width={24}
                            height={18}
                            unoptimized
                        />
                    </span>
                </div>
                <input
                    className="form__inputPhoneNRNumber__H5k8q0"
                    value={number}
                    onChange={(event) => onNumberChange(sanitizePhoneNationalNumberInput(event.target.value))}
                    placeholder={numberPlaceholder}
                />
            </div>
        </label>
    );
}
