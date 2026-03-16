import "server-only";

export const PRODUCT_CODE_CORE_LENGTH = 8;
export const PRODUCT_CODE_MAX_LENGTH = 32;
export const PRODUCT_CODE_MAX_AFFIX_LENGTH = 12;
export const PRODUCT_CODE_AFFIX_RE = /^[A-Z0-9_-]{0,12}$/;
const PRODUCT_CODE_DIGITS = "0123456789";

function randomInt(maxExclusive: number) {
    return Math.floor(Math.random() * maxExclusive);
}

export function randomProductCodeCore(length = PRODUCT_CODE_CORE_LENGTH) {
    let output = "";
    for (let i = 0; i < length; i += 1) {
        output += PRODUCT_CODE_DIGITS[randomInt(PRODUCT_CODE_DIGITS.length)];
    }
    return output;
}

export function normalizeProductCodeAffix(input: unknown) {
    return typeof input === "string" ? input.trim().toUpperCase() : "";
}

export function isValidProductCodeAffix(affix: string) {
    return PRODUCT_CODE_AFFIX_RE.test(affix);
}

export function sanitizeProductCodeCore(input: string, maxLength: number) {
    const digitsOnly = input.replace(/[^0-9]/g, "");
    if (!digitsOnly) return randomProductCodeCore(PRODUCT_CODE_CORE_LENGTH);

    let core = digitsOnly;
    if (core.length < PRODUCT_CODE_CORE_LENGTH) {
        core = `${core}${randomProductCodeCore(PRODUCT_CODE_CORE_LENGTH - core.length)}`;
    }
    if (core.length > maxLength) {
        core = core.slice(0, maxLength);
    }
    return core;
}

export function stripAffixesFromProductCode(code: string, prefix: string, suffix: string) {
    let core = code.trim();
    if (prefix && core.startsWith(prefix)) {
        core = core.slice(prefix.length);
    }
    if (suffix && core.endsWith(suffix)) {
        core = core.slice(0, Math.max(0, core.length - suffix.length));
    }
    return core;
}

export function buildProductCode(prefix: string, core: string, suffix: string) {
    return `${prefix}${core}${suffix}`;
}

export function previewProductCode(prefix: string, suffix: string) {
    return buildProductCode(prefix, randomProductCodeCore(PRODUCT_CODE_CORE_LENGTH), suffix);
}
