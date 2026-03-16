import type {
    CatalogProduct,
    ProductCategoryDefinition,
    VariantDefinition,
} from "@/lib/productCatalog";
import type { InventoryBatch, InventorySale } from "@/lib/productInventory";
import type { PurchaseOrder, SupplierDirectoryEntry } from "@/lib/purchaseOrders";

export type CatalogStateSnapshot = {
    variantDefinitions: VariantDefinition[];
    categoryDefinitions: ProductCategoryDefinition[];
    products: CatalogProduct[];
    inventoryBatches: InventoryBatch[];
    inventorySales: InventorySale[];
    purchaseOrders: PurchaseOrder[];
    suppliers: SupplierDirectoryEntry[];
};

type CatalogStateResponse = {
    ok?: boolean;
    message?: string;
    state?: CatalogStateSnapshot;
    version?: number;
};

export type CatalogDeleteEntity = "products" | "categories" | "variables";

export type CatalogDeleteRequest = {
    entity: CatalogDeleteEntity;
    ids?: string[];
    skus?: string[];
    names?: string[];
    keys?: string[];
};

export type CatalogDeleteResponse = CatalogStateResponse & {
    deletedCount?: number;
    deletedCategoryCount?: number;
    deletedProductCount?: number;
    deletedVariableCount?: number;
    deletedInventoryBatchCount?: number;
    deletedInventorySaleCount?: number;
};

let catalogStateCache: CatalogStateSnapshot | null = null;
let catalogStateVersion: number | null = null;

function isPositiveInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function syncCatalogStateCacheFromPayload(payload: CatalogStateResponse | null) {
    if (!payload?.state || !isPositiveInteger(payload.version)) return;
    catalogStateCache = payload.state;
    catalogStateVersion = payload.version;
}

async function parseCatalogStateResponse(response: Response) {
    const payload = (await response.json().catch(() => null)) as CatalogStateResponse | null;
    if (!response.ok || !payload?.ok || !payload.state || !isPositiveInteger(payload.version)) {
        syncCatalogStateCacheFromPayload(payload);
        throw new Error(payload?.message || "Catalog request failed.");
    }

    syncCatalogStateCacheFromPayload(payload);
    return payload.state;
}

async function ensureCatalogVersionForWrite() {
    if (isPositiveInteger(catalogStateVersion)) return catalogStateVersion;
    await fetchCatalogStateFromApi();
    if (isPositiveInteger(catalogStateVersion)) return catalogStateVersion;
    throw new Error("Unable to determine catalog version.");
}

export function getCachedCatalogStateSnapshot() {
    return catalogStateCache;
}

export function getCachedCatalogStateVersion() {
    return catalogStateVersion;
}

export function resetCatalogStateClientCache() {
    catalogStateCache = null;
    catalogStateVersion = null;
}

export async function primeCatalogStateCache() {
    if (catalogStateCache) return catalogStateCache;
    return fetchCatalogStateFromApi();
}

export async function fetchCatalogStateFromApi() {
    const response = await fetch("/api/catalog/state", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
    });

    return parseCatalogStateResponse(response);
}

export async function saveCatalogStateToApi(partial: Partial<CatalogStateSnapshot>) {
    const expectedVersion = await ensureCatalogVersionForWrite();
    const response = await fetch("/api/catalog/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            ...partial,
            expectedVersion,
        }),
    });

    return parseCatalogStateResponse(response);
}

export async function deleteCatalogEntriesFromApi(payload: CatalogDeleteRequest): Promise<CatalogDeleteResponse> {
    const expectedVersion = await ensureCatalogVersionForWrite();
    const response = await fetch("/api/catalog/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            ...payload,
            expectedVersion,
        }),
    });

    const parsed = (await response.json().catch(() => null)) as CatalogDeleteResponse | null;
    syncCatalogStateCacheFromPayload(parsed);
    if (!response.ok || !parsed?.ok) {
        throw new Error(parsed?.message || "Catalog delete request failed.");
    }
    return parsed;
}
