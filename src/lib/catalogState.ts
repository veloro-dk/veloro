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

export type CatalogState = {
    variantDefinitions: VariantDefinition[];
    categoryDefinitions: ProductCategoryDefinition[];
    products: CatalogProduct[];
    inventoryBatches: InventoryBatch[];
    inventorySales: InventorySale[];
    purchaseOrders: PurchaseOrder[];
    suppliers: SupplierDirectoryEntry[];
};

export type CatalogStateWithVersion = {
    state: CatalogState;
    version: number;
};

export type CatalogStatePayload = {
    variantDefinitions?: unknown;
    categoryDefinitions?: unknown;
    products?: unknown;
    inventoryBatches?: unknown;
    inventorySales?: unknown;
    purchaseOrders?: unknown;
    suppliers?: unknown;
};

export function parseCatalogExpectedVersion(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isInteger(value)) return null;
    if (value < 1) return null;
    return value;
}

export function buildDefaultCatalogState(): CatalogState {
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

export function normalizeCatalogState(input: CatalogStatePayload | null | undefined): CatalogState {
    const fallback = buildDefaultCatalogState();
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
    const nextProducts = syncProductsWithInventory(
        sanitizeProducts(input?.products ?? fallback.products, fallback.products, variantDefinitions),
        inventoryBatches
    );
    const reconciled = reconcileCatalogProductsAndCategories({
        products: nextProducts,
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
