import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { userCanAccessStore } from "@/server/stores";
import { parseSupportedCurrency } from "@/i18n/portal";
import { handleApiRoute } from "@/server/apiRoute";
import { parseRequestJsonWithSchema, parseString } from "@/server/requestSchema";
import {
    buildProductCode,
    isValidProductCodeAffix,
    normalizeProductCodeAffix,
    PRODUCT_CODE_CORE_LENGTH,
    PRODUCT_CODE_MAX_AFFIX_LENGTH,
    PRODUCT_CODE_MAX_LENGTH,
    randomProductCodeCore,
    sanitizeProductCodeCore,
    stripAffixesFromProductCode,
} from "@/server/productCodes";

const UNIT_SYSTEM_CODES = ["METRIC", "IMPERIAL"] as const;
const DEFAULT_PRODUCT_CODE_PREFIX = "VLR";
type UnitSystemCode = (typeof UNIT_SYSTEM_CODES)[number];

function json(body: { ok: boolean; message?: string }, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function parseTimeZone(input: unknown): string | null {
    const raw = typeof input === "string" ? input.trim() : "";
    if (!raw) return null;

    try {
        const maybeSupportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf;
        if (typeof maybeSupportedValuesOf === "function") {
            const all = maybeSupportedValuesOf("timeZone");
            return all.includes(raw) ? raw : null;
        }

        new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(new Date());
        return raw;
    } catch {
        return null;
    }
}

function parseUnitSystem(input: unknown): UnitSystemCode | null {
    const raw = typeof input === "string" ? input.trim().toUpperCase() : "";
    if (!raw) return null;
    return UNIT_SYSTEM_CODES.includes(raw as UnitSystemCode) ? (raw as UnitSystemCode) : null;
}

function normalizeOptional(input: unknown, max: number) {
    const value = typeof input === "string" ? input.trim() : "";
    if (!value) return null;
    return value.slice(0, max);
}

export const POST = handleApiRoute("api/user/stores/general-settings.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) {
        return json({ ok: false, message: "Invalid request origin." }, 403);
    }

    if (!isJsonRequest(req)) {
        return json({ ok: false, message: "Unsupported content type." }, 415);
    }

    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) {
        return json({ ok: false, message: "Unauthorized." }, 401);
    }

    const payload = await parseRequestJsonWithSchema(
        req,
        {
            defaultCurrency: { parse: (value) => parseString(value) },
            backupRegionCountry: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            unitSystem: { parse: (value) => parseString(value) },
            timeZone: { parse: (value) => parseString(value) },
            productCodePrefix: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
            productCodeSuffix: { parse: (value) => parseString(value, { allowEmpty: true }) ?? "", required: false },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
            invalidFieldMessages: {
                defaultCurrency: "Invalid store currency value.",
                unitSystem: "Invalid unit system value.",
                timeZone: "Invalid store time zone value.",
            },
        }
    );
    if (!payload.ok) return json({ ok: false, message: payload.message }, 400);

    const defaultCurrency = parseSupportedCurrency(payload.data.defaultCurrency);
    if (!defaultCurrency) {
        return json({ ok: false, message: "Invalid store currency value." }, 400);
    }

    const unitSystem = parseUnitSystem(payload.data.unitSystem);
    if (!unitSystem) {
        return json({ ok: false, message: "Invalid unit system value." }, 400);
    }

    const timeZone = parseTimeZone(payload.data.timeZone);
    if (!timeZone) {
        return json({ ok: false, message: "Invalid store time zone value." }, 400);
    }

    const productCodePrefix = normalizeProductCodeAffix(payload.data.productCodePrefix);
    const productCodeSuffix = normalizeProductCodeAffix(payload.data.productCodeSuffix);
    const effectiveProductCodePrefix = productCodePrefix || DEFAULT_PRODUCT_CODE_PREFIX;

    if (!isValidProductCodeAffix(effectiveProductCodePrefix) || !isValidProductCodeAffix(productCodeSuffix)) {
        return json({ ok: false, message: "Order ID prefix/suffix can only use letters, numbers, underscore, and hyphen." }, 400);
    }

    if (
        effectiveProductCodePrefix.length > PRODUCT_CODE_MAX_AFFIX_LENGTH
        || productCodeSuffix.length > PRODUCT_CODE_MAX_AFFIX_LENGTH
    ) {
        return json({ ok: false, message: "Order ID prefix/suffix is too long." }, 400);
    }

    if (effectiveProductCodePrefix.length + productCodeSuffix.length + PRODUCT_CODE_CORE_LENGTH > PRODUCT_CODE_MAX_LENGTH) {
        return json({ ok: false, message: "Order ID format exceeds maximum code length." }, 400);
    }

    const backupRegionCountry = normalizeOptional(payload.data.backupRegionCountry, 120);

    const settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { activeStoreId: true },
    });

    const activeStoreId = settings?.activeStoreId?.trim() ?? "";
    if (!activeStoreId) {
        return json({ ok: false, message: "No active store selected." }, 400);
    }

    const canAccessStore = await userCanAccessStore(user.id, activeStoreId);
    if (!canAccessStore) {
        return json({ ok: false, message: "You do not have access to that store." }, 403);
    }

    await prisma.$transaction(async (tx) => {
        const currentStore = await tx.store.findUnique({
            where: { id: activeStoreId },
            select: {
                productCodePrefix: true,
                productCodeSuffix: true,
            },
        });

        if (!currentStore) {
            throw new Error("Store not found.");
        }

        const previousPrefix = normalizeProductCodeAffix(currentStore.productCodePrefix ?? "");
        const previousSuffix = normalizeProductCodeAffix(currentStore.productCodeSuffix ?? "");
        const formatChanged = previousPrefix !== effectiveProductCodePrefix || previousSuffix !== productCodeSuffix;

        await tx.store.update({
            where: { id: activeStoreId },
            data: {
                defaultCurrency,
                backupRegionCountry,
                unitSystem,
                timeZone,
                productCodePrefix: effectiveProductCodePrefix,
                productCodeSuffix: productCodeSuffix || null,
            },
        });

        if (formatChanged) {
            const maxCoreLength = PRODUCT_CODE_MAX_LENGTH - effectiveProductCodePrefix.length - productCodeSuffix.length;

            const [storeItems, externalCodes] = await Promise.all([
                tx.inventoryItem.findMany({
                    where: { storeId: activeStoreId },
                    select: {
                        id: true,
                        inventoryCode: true,
                    },
                    orderBy: { id: "asc" },
                }),
                tx.inventoryItem.findMany({
                    where: {
                        storeId: { not: activeStoreId },
                        inventoryCode: { not: null },
                    },
                    select: { inventoryCode: true },
                }),
            ]);

            const usedCodes = new Set(
                externalCodes
                    .map((entry) => entry.inventoryCode?.trim())
                    .filter((entry): entry is string => !!entry)
            );

            const updates: Array<{ id: string; inventoryCode: string }> = [];

            for (const item of storeItems) {
                const currentCode = (item.inventoryCode ?? "").trim();
                const rawCore = currentCode
                    ? stripAffixesFromProductCode(currentCode, previousPrefix, previousSuffix)
                    : "";
                let core = sanitizeProductCodeCore(rawCore, maxCoreLength);
                let candidate = buildProductCode(effectiveProductCodePrefix, core, productCodeSuffix);

                while (!candidate || usedCodes.has(candidate) || candidate.length > PRODUCT_CODE_MAX_LENGTH) {
                    core = sanitizeProductCodeCore(randomProductCodeCore(PRODUCT_CODE_CORE_LENGTH), maxCoreLength);
                    candidate = buildProductCode(effectiveProductCodePrefix, core, productCodeSuffix);
                }

                usedCodes.add(candidate);
                if (currentCode !== candidate) {
                    updates.push({ id: item.id, inventoryCode: candidate });
                }
            }

            for (const update of updates) {
                await tx.inventoryItem.update({
                    where: { id: update.id },
                    data: { inventoryCode: update.inventoryCode },
                });
            }
        }

        await tx.auditLog.create({
            data: {
                actorId: user.id,
                action: "STORE_GENERAL_DEFAULTS_UPDATE",
                entity: "Store",
                entityId: activeStoreId,
                meta: {
                    defaultCurrency,
                    backupRegionCountry,
                    unitSystem,
                    timeZone,
                    productCodePrefix: effectiveProductCodePrefix,
                    productCodeSuffix: productCodeSuffix || null,
                    regeneratedProductCodes: formatChanged,
                },
            },
        });
    });

    return json({ ok: true });
});
