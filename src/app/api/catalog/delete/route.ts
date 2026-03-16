import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { isJsonRequest, isSameOriginRequest } from "@/server/requestSecurity";
import { getUserStoreContext } from "@/server/stores";
import { ensureWriteRequestAllowed } from "@/server/writeRateLimit";
import { handleApiRoute } from "@/server/apiRoute";
import { parseEnum, parseInteger, parsePayloadWithSchema } from "@/server/requestSchema";
import {
    getDefaultProductCategoryDefinitions,
    getDefaultProducts,
    getDefaultVariantDefinitions,
    reconcileCatalogProductsAndCategories,
    sanitizeProductCategoryDefinitions,
    sanitizeProducts,
    sanitizeVariantDefinitions,
    type CatalogProduct,
    type ProductCategoryDefinition,
    type VariantDefinition,
} from "@/lib/productCatalog";
import {
    buildInventoryBatchesFromPurchaseOrders,
    sanitizeInventoryBatches,
    sanitizeInventorySales,
    syncProductsWithInventory,
    type InventoryBatch,
    type InventorySale,
} from "@/lib/productInventory";
import {
    sanitizePurchaseOrders,
    sanitizeSupplierDirectory,
    type PurchaseOrder,
    type SupplierDirectoryEntry,
} from "@/lib/purchaseOrders";
import { parseCatalogExpectedVersion } from "@/lib/catalogState";

const CONFLICT_MESSAGE = "Catalog data changed in another session. Reload and try again.";
const DELETE_ENTITY_VALUES = ["products", "categories", "variables"] as const;

type DeleteEntity = "products" | "categories" | "variables";

type DeletePayload = {
    entity?: DeleteEntity;
    ids?: unknown;
    skus?: unknown;
    names?: unknown;
    keys?: unknown;
    expectedVersion?: unknown;
};

type CatalogState = {
    variantDefinitions: VariantDefinition[];
    categoryDefinitions: ProductCategoryDefinition[];
    products: CatalogProduct[];
    inventoryBatches: InventoryBatch[];
    inventorySales: InventorySale[];
    purchaseOrders: PurchaseOrder[];
    suppliers: SupplierDirectoryEntry[];
};

type CatalogStateWithVersion = {
    state: CatalogState;
    version: number;
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

function parseStringArray(value: unknown) {
    if (!Array.isArray(value)) return [] as string[];
    return Array.from(new Set(
        value
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
    ));
}

function toInputJsonArray(value: unknown): Prisma.InputJsonValue {
    if (!Array.isArray(value)) return [];
    return value as Prisma.InputJsonValue;
}

function buildDefaultState(): CatalogState {
    const variantDefinitions = getDefaultVariantDefinitions();
    const categoryDefinitions = getDefaultProductCategoryDefinitions();
    const products = getDefaultProducts();

    return {
        variantDefinitions,
        categoryDefinitions,
        products,
        inventoryBatches: [],
        inventorySales: [],
        purchaseOrders: [],
        suppliers: [],
    };
}

function normalizeState(input: {
    variantDefinitions?: unknown;
    categoryDefinitions?: unknown;
    products?: unknown;
    inventoryBatches?: unknown;
    inventorySales?: unknown;
    purchaseOrders?: unknown;
    suppliers?: unknown;
} | null | undefined): CatalogState {
    const fallback = buildDefaultState();
    const variantDefinitions = sanitizeVariantDefinitions(input?.variantDefinitions ?? fallback.variantDefinitions);
    const categoryDefinitions = sanitizeProductCategoryDefinitions(
        input?.categoryDefinitions ?? fallback.categoryDefinitions,
        variantDefinitions
    );
    const inventorySales = sanitizeInventorySales(input?.inventorySales ?? [], []);
    const purchaseOrders = sanitizePurchaseOrders(input?.purchaseOrders ?? [], []);
    const suppliers = sanitizeSupplierDirectory(input?.suppliers ?? [], []);
    const inventoryBatches = purchaseOrders.length > 0
        ? buildInventoryBatchesFromPurchaseOrders(purchaseOrders, inventorySales)
        : sanitizeInventoryBatches(input?.inventoryBatches ?? [], []);
    const syncedProducts = syncProductsWithInventory(
        sanitizeProducts(input?.products ?? fallback.products, fallback.products, variantDefinitions),
        inventoryBatches
    );
    const reconciled = reconcileCatalogProductsAndCategories({
        products: syncedProducts,
        categories: categoryDefinitions,
        purchaseOrders,
    });

    return {
        variantDefinitions,
        categoryDefinitions: reconciled.categories,
        products: reconciled.products,
        inventoryBatches,
        inventorySales,
        purchaseOrders,
        suppliers,
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

async function getOrCreateState(storeId: string): Promise<CatalogStateWithVersion> {
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
    });

    if (!existing) {
        const defaults = buildDefaultState();
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

    return {
        state: normalizeState(existing),
        version: parseCatalogExpectedVersion(existing.version) ?? 1,
    };
}

async function persistState(storeId: string, expectedVersion: number, state: CatalogState) {
    const result = await prisma.storeCatalogState.updateMany({
        where: { storeId, version: expectedVersion },
        data: {
            variantDefinitions: toInputJsonArray(state.variantDefinitions),
            categoryDefinitions: toInputJsonArray(state.categoryDefinitions),
            products: toInputJsonArray(state.products),
            inventoryBatches: toInputJsonArray(state.inventoryBatches),
            inventorySales: toInputJsonArray(state.inventorySales),
            purchaseOrders: toInputJsonArray(state.purchaseOrders),
            suppliers: toInputJsonArray(state.suppliers),
            version: { increment: 1 },
        },
    });
    return result.count === 1;
}

export const POST = handleApiRoute("api/catalog/delete.POST", async (req: Request) => {
    if (!isSameOriginRequest(req)) return json({ ok: false, message: "Invalid request origin." }, 403);
    if (!isJsonRequest(req)) return json({ ok: false, message: "Unsupported content type." }, 415);

    const actor = await getSessionUser({ allowCookieMutation: true });
    if (!actor) return json({ ok: false, message: "Unauthorized." }, 401);

    const rawPayload = await req.json().catch(() => null);
    const parsedPayload = parsePayloadWithSchema<{ entity: DeleteEntity; expectedVersion: number }>(
        rawPayload,
        {
            entity: {
                parse: (value) => parseEnum(value, DELETE_ENTITY_VALUES, { caseInsensitive: false }),
            },
            expectedVersion: {
                parse: (value) => parseInteger(value, { min: 1 }),
            },
        },
        {
            invalidPayloadMessage: "Invalid delete request.",
            invalidFieldMessages: {
                entity: "Invalid delete request.",
                expectedVersion: "Missing or invalid catalog version.",
            },
        }
    );
    if (!parsedPayload.ok) return json({ ok: false, message: parsedPayload.message }, 400);

    const payload = rawPayload as DeletePayload;
    const expectedVersion = parseCatalogExpectedVersion(parsedPayload.data.expectedVersion);
    if (expectedVersion === null) return json({ ok: false, message: "Missing or invalid catalog version." }, 400);

    const storeContext = await getUserStoreContext(actor.id);
    const storeId = storeContext.activeStoreId;
    const writeLimit = ensureWriteRequestAllowed({
        scope: "catalog",
        req,
        actorId: actor.id,
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

    const currentSnapshot = await getOrCreateState(storeId);
    if (expectedVersion !== currentSnapshot.version) {
        return buildConflictResponse(currentSnapshot);
    }
    const state = currentSnapshot.state;

    if (payload.entity === "products") {
        const ids = parseStringArray(payload.ids);
        const skus = parseStringArray(payload.skus);
        if (ids.length === 0 && skus.length === 0) {
            return json({ ok: false, message: "No products selected." }, 400);
        }

        const idSet = new Set(ids);
        const skuSet = new Set(skus);
        const productsToDelete = state.products.filter((product) => idSet.has(product.id) || skuSet.has(product.sku));
        const deleteIds = productsToDelete.map((product) => product.id);
        const nextProducts = state.products.filter((product) => !deleteIds.includes(product.id));
        const nextPurchaseOrders = state.purchaseOrders
            .map((order) => ({
                ...order,
                lines: order.lines.filter((line) => !deleteIds.includes(line.productId)),
            }))
            .filter((order) => order.lines.length > 0);
        const nextInventorySales = state.inventorySales.filter((sale) => {
            const batch = state.inventoryBatches.find((entry) => entry.id === sale.batchId);
            if (!batch) return false;
            return !deleteIds.includes(batch.productId);
        });
        const nextInventory = buildInventoryBatchesFromPurchaseOrders(nextPurchaseOrders, nextInventorySales);

        const reconciled = reconcileCatalogProductsAndCategories({
            products: syncProductsWithInventory(nextProducts, nextInventory),
            categories: state.categoryDefinitions,
            purchaseOrders: nextPurchaseOrders,
        });

        const nextState: CatalogState = {
            ...state,
            categoryDefinitions: reconciled.categories,
            products: reconciled.products,
            inventoryBatches: nextInventory,
            inventorySales: nextInventorySales,
            purchaseOrders: nextPurchaseOrders,
        };

        const saved = await persistState(storeId, expectedVersion, nextState);
        if (!saved) {
            const latest = await getOrCreateState(storeId);
            return buildConflictResponse(latest);
        }

        await prisma.auditLog.create({
            data: {
                actorId: actor.id,
                action: "CATALOG_PRODUCTS_DELETE",
                entity: "StoreCatalogState",
                entityId: storeId,
                meta: {
                    storeId,
                    expectedVersion,
                    nextVersion: expectedVersion + 1,
                    requested: {
                        ids: ids.length,
                        skus: skus.length,
                    },
                    deleted: {
                        products: deleteIds.length,
                        inventoryBatches: state.inventoryBatches.length - nextInventory.length,
                        inventorySales: state.inventorySales.length - nextInventorySales.length,
                    },
                },
            },
        });

        return json({
            ok: true,
            state: nextState,
            version: expectedVersion + 1,
            deletedCount: deleteIds.length,
            deletedInventoryBatchCount: state.inventoryBatches.length - nextInventory.length,
            deletedInventorySaleCount: state.inventorySales.length - nextInventorySales.length,
        });
    }

    if (payload.entity === "categories") {
        const ids = parseStringArray(payload.ids);
        const names = ids.length > 0 ? [] : parseStringArray(payload.names);
        if (ids.length === 0 && names.length === 0) {
            return json({ ok: false, message: "No categories selected." }, 400);
        }

        const idSet = new Set(ids);
        const nameSet = new Set(names);

        const deletedCategories = ids.length > 0
            ? state.categoryDefinitions.filter((category) => idSet.has(category.id))
            : state.categoryDefinitions.filter((category) => nameSet.has(category.title));
        const deletedCategoryIds = new Set(deletedCategories.map((category) => category.id));
        const deletedCategoryTitles = new Set(deletedCategories.map((category) => category.title));

        const nextCategories = state.categoryDefinitions.filter((category) => !deletedCategoryIds.has(category.id));
        const nextProductsRaw = state.products.map((product) => {
            const nextCategoryIds = product.categoryIds.filter((entry) => !deletedCategoryIds.has(entry));
            const primaryDeleted = deletedCategoryTitles.has(product.category);
            return {
                ...product,
                categoryIds: nextCategoryIds,
                category: primaryDeleted ? "" : product.category,
            };
        });
        const nextPurchaseOrders = state.purchaseOrders;
        const nextInventorySales = state.inventorySales;
        const nextInventoryBatches = buildInventoryBatchesFromPurchaseOrders(nextPurchaseOrders, nextInventorySales);

        const reconciled = reconcileCatalogProductsAndCategories({
            products: syncProductsWithInventory(nextProductsRaw, nextInventoryBatches),
            categories: nextCategories,
            purchaseOrders: nextPurchaseOrders,
        });

        const nextState: CatalogState = {
            ...state,
            categoryDefinitions: reconciled.categories,
            products: reconciled.products,
            inventoryBatches: nextInventoryBatches,
            inventorySales: nextInventorySales,
            purchaseOrders: nextPurchaseOrders,
        };

        const saved = await persistState(storeId, expectedVersion, nextState);
        if (!saved) {
            const latest = await getOrCreateState(storeId);
            return buildConflictResponse(latest);
        }

        await prisma.auditLog.create({
            data: {
                actorId: actor.id,
                action: "CATALOG_CATEGORIES_DELETE",
                entity: "StoreCatalogState",
                entityId: storeId,
                meta: {
                    storeId,
                    expectedVersion,
                    nextVersion: expectedVersion + 1,
                    requested: {
                        ids: ids.length,
                        names: names.length,
                    },
                    deleted: {
                        categories: deletedCategories.length,
                    },
                },
            },
        });

        return json({
            ok: true,
            state: nextState,
            version: expectedVersion + 1,
            deletedCategoryCount: deletedCategories.length,
            deletedProductCount: 0,
            deletedVariableCount: 0,
        });
    }

    const keys = parseStringArray(payload.keys);
    if (keys.length === 0) {
        return json({ ok: false, message: "No variables selected." }, 400);
    }

    const keySet = new Set(keys);
    const nextVariantDefinitions = state.variantDefinitions.filter((variant) => !keySet.has(variant.id));
    const nextCategories = state.categoryDefinitions.map((category) => ({
        ...category,
        variantRules: category.variantRules.filter((rule) => !keySet.has(rule.variantId)),
    }));
    const nextProducts = state.products.map((product) => ({
        ...product,
        variants: Object.fromEntries(
            Object.entries(product.variants).filter(([key]) => !keySet.has(key))
        ),
        productVariantRules: product.productVariantRules.filter((rule) => !keySet.has(rule.variantId)),
    }));
    const nextPurchaseOrders = state.purchaseOrders.map((order) => ({
        ...order,
        lines: order.lines.map((line) => ({
            ...line,
            variantValues: Object.fromEntries(
                Object.entries(line.variantValues).filter(([key]) => !keySet.has(key))
            ),
        })),
    }));
    const nextInventoryBatches = buildInventoryBatchesFromPurchaseOrders(nextPurchaseOrders, state.inventorySales);

    const reconciled = reconcileCatalogProductsAndCategories({
        products: nextProducts,
        categories: nextCategories,
        purchaseOrders: nextPurchaseOrders,
    });

    const nextState: CatalogState = {
        ...state,
        variantDefinitions: nextVariantDefinitions,
        categoryDefinitions: reconciled.categories,
        products: reconciled.products,
        inventoryBatches: nextInventoryBatches,
        purchaseOrders: nextPurchaseOrders,
    };

    const saved = await persistState(storeId, expectedVersion, nextState);
    if (!saved) {
        const latest = await getOrCreateState(storeId);
        return buildConflictResponse(latest);
    }

    await prisma.auditLog.create({
        data: {
            actorId: actor.id,
            action: "CATALOG_VARIANTS_DELETE",
            entity: "StoreCatalogState",
            entityId: storeId,
            meta: {
                storeId,
                expectedVersion,
                nextVersion: expectedVersion + 1,
                requested: {
                    keys: keys.length,
                },
                deleted: {
                    variants: state.variantDefinitions.length - nextVariantDefinitions.length,
                },
            },
        },
    });

    return json({
        ok: true,
        state: nextState,
        version: expectedVersion + 1,
        deletedCount: state.variantDefinitions.length - nextVariantDefinitions.length,
    });
});
