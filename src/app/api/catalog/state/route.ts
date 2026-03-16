import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { handleApiRoute } from "@/server/apiRoute";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { getUserStoreContext } from "@/server/stores";
import { ensureWriteRequestAllowed } from "@/server/writeRateLimit";
import { parseInteger, parsePayloadWithSchema } from "@/server/requestSchema";
import {
    reconcileCatalogProductsAndCategories,
    sanitizeProductCategoryDefinitions,
    sanitizeProducts,
    sanitizeVariantDefinitions,
} from "@/lib/productCatalog";
import {
    buildInventoryBatchesFromPurchaseOrders,
    sanitizeInventoryBatches,
    sanitizeInventorySales,
    syncProductsWithInventory,
} from "@/lib/productInventory";
import {
    sanitizePurchaseOrders,
    sanitizeSupplierDirectory,
} from "@/lib/purchaseOrders";
import {
    buildDefaultCatalogState,
    normalizeCatalogState,
    parseCatalogExpectedVersion,
    type CatalogState,
    type CatalogStatePayload,
    type CatalogStateWithVersion,
} from "@/lib/catalogState";

const CONFLICT_MESSAGE = "Catalog data changed in another session. Reload and try again.";

type CatalogStateRow = CatalogStatePayload & {
    version?: unknown;
};

type CatalogStateWritePayload = CatalogStatePayload & {
    expectedVersion?: unknown;
};

function json(body: unknown, status = 200, headers?: HeadersInit) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
            ...(headers || {}),
        },
    });
}

function toInputJsonArray(value: unknown): Prisma.InputJsonValue {
    if (!Array.isArray(value)) return [];
    return value as Prisma.InputJsonValue;
}

async function getStoreIdForUser(userId: string) {
    const context = await getUserStoreContext(userId);
    return context.activeStoreId;
}

async function getOrCreateCatalogState(storeId: string): Promise<CatalogStateWithVersion> {
    const existing = await prisma.storeCatalogState.findUnique({
        where: { storeId },
        select: {
            variantDefinitions: true,
            categoryDefinitions: true,
            products: true,
            inventoryBatches: true,
            inventorySales: true,
            purchaseOrders: true,
            suppliers: true,
            version: true,
        },
    }) as CatalogStateRow | null;

    if (!existing) {
        const defaults = buildDefaultCatalogState();
        await prisma.storeCatalogState.create({
            data: {
                storeId,
                variantDefinitions: defaults.variantDefinitions as unknown as Prisma.InputJsonValue,
                categoryDefinitions: defaults.categoryDefinitions as unknown as Prisma.InputJsonValue,
                products: defaults.products as unknown as Prisma.InputJsonValue,
                inventoryBatches: defaults.inventoryBatches as unknown as Prisma.InputJsonValue,
                inventorySales: defaults.inventorySales as unknown as Prisma.InputJsonValue,
                purchaseOrders: defaults.purchaseOrders as unknown as Prisma.InputJsonValue,
                suppliers: defaults.suppliers as unknown as Prisma.InputJsonValue,
                version: 1,
            },
        });
        return { state: defaults, version: 1 };
    }

    const version = parseCatalogExpectedVersion(existing.version) ?? 1;
    return {
        state: normalizeCatalogState(existing),
        version,
    };
}

function buildConflictResponse(snapshot: CatalogStateWithVersion) {
    return json(
        {
            ok: false,
            message: CONFLICT_MESSAGE,
            state: snapshot.state,
            version: snapshot.version,
        },
        409
    );
}

export const GET = handleApiRoute("api/catalog/state.GET", async () => {
    const user = await getSessionUser({ allowCookieMutation: true });
    if (!user) {
        return json({ ok: false, message: "Unauthorized." }, 401);
    }

    const storeId = await getStoreIdForUser(user.id);
    const snapshot = await getOrCreateCatalogState(storeId);

    return json({ ok: true, state: snapshot.state, version: snapshot.version });
});

export const POST = handleApiRoute("api/catalog/state.POST", async (req: Request) => {
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

    const storeId = await getStoreIdForUser(user.id);
    const writeLimit = ensureWriteRequestAllowed({
        scope: "catalog",
        req,
        actorId: user.id,
        storeId,
    });
    if (!writeLimit.allowed) {
        return json(
            {
                ok: false,
                message: `Too many catalog write requests. Please wait ${writeLimit.retryAfterSeconds} seconds and try again.`,
            },
            429,
            { "Retry-After": String(writeLimit.retryAfterSeconds) }
        );
    }

    const rawPayload = await req.json().catch(() => null);
    const parsedPayload = parsePayloadWithSchema<{ expectedVersion: number }>(
        rawPayload,
        {
            expectedVersion: {
                parse: (value) => parseInteger(value, { min: 1 }),
            },
        },
        {
            invalidPayloadMessage: "Invalid payload.",
            invalidFieldMessages: {
                expectedVersion: "Missing or invalid catalog version.",
            },
        }
    );
    if (!parsedPayload.ok) {
        return json({ ok: false, message: parsedPayload.message }, 400);
    }
    const payload = rawPayload as CatalogStateWritePayload;
    const expectedVersion = parsedPayload.data.expectedVersion;

    const currentSnapshot = await getOrCreateCatalogState(storeId);
    const current = currentSnapshot.state;
    if (expectedVersion !== currentSnapshot.version) {
        return buildConflictResponse(currentSnapshot);
    }

    const nextVariantDefinitions = payload.variantDefinitions !== undefined
        ? sanitizeVariantDefinitions(payload.variantDefinitions)
        : current.variantDefinitions;

    const nextCategoryDefinitions = sanitizeProductCategoryDefinitions(
        payload.categoryDefinitions !== undefined ? payload.categoryDefinitions : current.categoryDefinitions,
        nextVariantDefinitions
    );

    const nextInventoryBatches = payload.inventoryBatches !== undefined
        ? sanitizeInventoryBatches(payload.inventoryBatches, current.inventoryBatches)
        : current.inventoryBatches;

    const nextInventorySales = payload.inventorySales !== undefined
        ? sanitizeInventorySales(payload.inventorySales, current.inventorySales)
        : current.inventorySales;

    const nextPurchaseOrders = payload.purchaseOrders !== undefined
        ? sanitizePurchaseOrders(payload.purchaseOrders, current.purchaseOrders)
        : current.purchaseOrders;
    const nextSuppliers = payload.suppliers !== undefined
        ? sanitizeSupplierDirectory(payload.suppliers, current.suppliers)
        : current.suppliers;

    const nextProductsRaw = payload.products !== undefined
        ? sanitizeProducts(payload.products, current.products, nextVariantDefinitions)
        : current.products;

    const syncedBatches = nextPurchaseOrders.length > 0
        ? buildInventoryBatchesFromPurchaseOrders(nextPurchaseOrders, nextInventorySales)
        : nextInventoryBatches;
    const syncedProducts = syncProductsWithInventory(nextProductsRaw, syncedBatches);
    const reconciled = reconcileCatalogProductsAndCategories({
        products: syncedProducts,
        categories: nextCategoryDefinitions,
        purchaseOrders: nextPurchaseOrders,
    });

    const updateResult = await prisma.storeCatalogState.updateMany({
        where: { storeId, version: expectedVersion },
        data: {
            variantDefinitions: toInputJsonArray(nextVariantDefinitions),
            categoryDefinitions: toInputJsonArray(reconciled.categories),
            products: toInputJsonArray(reconciled.products),
            inventoryBatches: toInputJsonArray(syncedBatches),
            inventorySales: toInputJsonArray(nextInventorySales),
            purchaseOrders: toInputJsonArray(nextPurchaseOrders),
            suppliers: toInputJsonArray(nextSuppliers),
            version: { increment: 1 },
        },
    });
    if (updateResult.count !== 1) {
        const latest = await getOrCreateCatalogState(storeId);
        return buildConflictResponse(latest);
    }

    const state: CatalogState = {
        variantDefinitions: nextVariantDefinitions,
        categoryDefinitions: reconciled.categories,
        products: reconciled.products,
        inventoryBatches: syncedBatches,
        inventorySales: nextInventorySales,
        purchaseOrders: nextPurchaseOrders,
        suppliers: nextSuppliers,
    };

    await prisma.auditLog.create({
        data: {
            actorId: user.id,
            action: "CATALOG_STATE_SAVE",
            entity: "StoreCatalogState",
            entityId: storeId,
            meta: {
                storeId,
                expectedVersion,
                nextVersion: expectedVersion + 1,
                counts: {
                    variants: state.variantDefinitions.length,
                    categories: state.categoryDefinitions.length,
                    products: state.products.length,
                    inventoryBatches: state.inventoryBatches.length,
                    inventorySales: state.inventorySales.length,
                    purchaseOrders: state.purchaseOrders.length,
                    suppliers: state.suppliers.length,
                },
            },
        },
    });

    return json({ ok: true, state, version: expectedVersion + 1 });
});
