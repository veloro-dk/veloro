import type { CatalogProduct } from "@/lib/productCatalog";
import { parseCurrency } from "@/i18n/portal";
import type { PurchaseOrder } from "@/lib/purchaseOrders";

export type InventoryMaintenanceEntry = {
    id: string;
    description: string;
    currency: string;
    amount: number;
    createdAt: string;
};

export type InventoryBatch = {
    id: string;
    productId: string;
    purchaseOrderId?: string;
    variantValues: Record<string, string>;
    purchaseDate: string;
    quantity: number;
    remainingQuantity: number;
    purchaseCurrency: string;
    purchaseUnitPrice: number;
    saleCurrency: string;
    saleUnitPrice: number;
    maintenanceEntries?: InventoryMaintenanceEntry[];
    vendor?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
};

export type InventorySale = {
    id: string;
    productId: string;
    batchId: string;
    soldAt: string;
    quantity: number;
    currency: string;
    listedSaleUnitPrice: number;
    discountPerUnit: number;
    saleUnitPrice: number;
    totalAmount: number;
    notes?: string;
    createdAt: string;
};

function sanitizeIsoDateTime(value: unknown, fallback: string) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toISOString();
}

function sanitizeDateOnly(value: unknown, fallback: string) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toISOString().slice(0, 10);
}

function sanitizeNumber(value: unknown, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return fallback;
}

function sanitizePositiveInt(value: unknown, fallback = 0) {
    return Math.max(0, Math.round(sanitizeNumber(value, fallback)));
}

function sanitizeMoney(value: unknown, fallback = 0) {
    return Math.max(0, sanitizeNumber(value, fallback));
}

function sanitizeCurrencyCode(value: unknown, fallback = "") {
    const parsed = parseCurrency(typeof value === "string" ? value : null);
    return parsed ?? fallback;
}

function sanitizeOptionalText(value: unknown) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeVariantId(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sanitizeVariantValueMap(value: unknown) {
    if (!value || typeof value !== "object") return {} as Record<string, string>;

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key, raw]) => typeof key === "string" && typeof raw === "string")
            .map(([key, raw]) => [normalizeVariantId(key), raw.trim()])
            .filter(([key, raw]) => key.length > 0 && raw.length > 0)
    );
}

function sanitizeInventoryMaintenanceEntries(raw: unknown): InventoryMaintenanceEntry[] | undefined {
    if (!Array.isArray(raw)) return undefined;

    const seen = new Set<string>();
    const normalized: InventoryMaintenanceEntry[] = [];

    raw.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") return;
        const record = entry as Partial<InventoryMaintenanceEntry>;
        const description = typeof record.description === "string" ? record.description.trim() : "";
        if (!description) return;
        const amount = sanitizeMoney(record.amount, Number.NaN);
        if (!Number.isFinite(amount)) return;
        const currency = sanitizeCurrencyCode(record.currency, "");
        if (!currency) return;
        const id = typeof record.id === "string" && record.id.trim().length > 0
            ? record.id.trim()
            : `maint_${index}`;
        if (seen.has(id)) return;
        seen.add(id);
        normalized.push({
            id,
            description,
            currency,
            amount,
            createdAt: sanitizeIsoDateTime(record.createdAt, new Date().toISOString()),
        });
    });

    return normalized.length > 0 ? normalized : undefined;
}

function sanitizeInventoryBatchEntry(raw: unknown): InventoryBatch | null {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Partial<InventoryBatch>;

    const nowIso = new Date().toISOString();
    const id = typeof record.id === "string" && record.id.trim().length > 0 ? record.id.trim() : "";
    const productId = typeof record.productId === "string" && record.productId.trim().length > 0 ? record.productId.trim() : "";
    if (!id || !productId) return null;

    const quantity = sanitizePositiveInt(record.quantity, 0);
    if (quantity <= 0) return null;

    const remainingQuantity = Math.min(quantity, sanitizePositiveInt(record.remainingQuantity, quantity));
    const purchaseCurrency = sanitizeCurrencyCode((record as { purchaseCurrency?: unknown }).purchaseCurrency, "");
    const purchaseUnitPrice = sanitizeMoney(record.purchaseUnitPrice, 0);
    const saleCurrency = sanitizeCurrencyCode((record as { saleCurrency?: unknown }).saleCurrency, purchaseCurrency);
    const saleUnitPrice = sanitizeMoney(record.saleUnitPrice, purchaseUnitPrice);
    const purchaseDate = sanitizeDateOnly(record.purchaseDate, nowIso.slice(0, 10));
    const createdAt = sanitizeIsoDateTime(record.createdAt, nowIso);
    const updatedAt = sanitizeIsoDateTime(record.updatedAt, createdAt);

    return {
        id,
        productId,
        purchaseOrderId: sanitizeOptionalText((record as { purchaseOrderId?: unknown }).purchaseOrderId),
        variantValues: sanitizeVariantValueMap((record as { variantValues?: unknown }).variantValues),
        purchaseDate,
        quantity,
        remainingQuantity,
        purchaseCurrency,
        purchaseUnitPrice,
        saleCurrency,
        saleUnitPrice,
        maintenanceEntries: sanitizeInventoryMaintenanceEntries((record as { maintenanceEntries?: unknown }).maintenanceEntries),
        vendor: sanitizeOptionalText(record.vendor),
        notes: sanitizeOptionalText(record.notes),
        createdAt,
        updatedAt,
    };
}

function sanitizeInventorySaleEntry(raw: unknown): InventorySale | null {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Partial<InventorySale>;
    const nowIso = new Date().toISOString();

    const id = typeof record.id === "string" && record.id.trim().length > 0 ? record.id.trim() : "";
    const productId = typeof record.productId === "string" && record.productId.trim().length > 0 ? record.productId.trim() : "";
    const batchId = typeof record.batchId === "string" && record.batchId.trim().length > 0 ? record.batchId.trim() : "";
    if (!id || !productId || !batchId) return null;

    const quantity = sanitizePositiveInt(record.quantity, 0);
    if (quantity <= 0) return null;

    const currency = sanitizeCurrencyCode((record as { currency?: unknown }).currency, "");
    const listedSaleUnitPrice = sanitizeMoney((record as { listedSaleUnitPrice?: unknown }).listedSaleUnitPrice, sanitizeMoney(record.saleUnitPrice, 0));
    const discountPerUnitRaw = sanitizeMoney((record as { discountPerUnit?: unknown }).discountPerUnit, 0);
    const discountPerUnit = Math.min(listedSaleUnitPrice, discountPerUnitRaw);
    const saleUnitPrice = sanitizeMoney(record.saleUnitPrice, Math.max(0, listedSaleUnitPrice - discountPerUnit));
    const totalAmount = sanitizeMoney(record.totalAmount, saleUnitPrice * quantity);
    const soldAt = sanitizeIsoDateTime(record.soldAt, nowIso);
    const createdAt = sanitizeIsoDateTime(record.createdAt, soldAt);

    return {
        id,
        productId,
        batchId,
        soldAt,
        quantity,
        currency,
        listedSaleUnitPrice,
        discountPerUnit,
        saleUnitPrice,
        totalAmount,
        notes: sanitizeOptionalText(record.notes),
        createdAt,
    };
}

export function sanitizeInventoryBatches(raw: unknown, fallback: InventoryBatch[] = []) {
    if (!Array.isArray(raw)) return fallback;
    const seen = new Set<string>();
    const next: InventoryBatch[] = [];

    raw.forEach((entry) => {
        const normalized = sanitizeInventoryBatchEntry(entry);
        if (!normalized || seen.has(normalized.id)) return;
        seen.add(normalized.id);
        next.push(normalized);
    });

    return next;
}

export function sanitizeInventorySales(raw: unknown, fallback: InventorySale[] = []) {
    if (!Array.isArray(raw)) return fallback;
    const seen = new Set<string>();
    const next: InventorySale[] = [];

    raw.forEach((entry) => {
        const normalized = sanitizeInventorySaleEntry(entry);
        if (!normalized || seen.has(normalized.id)) return;
        seen.add(normalized.id);
        next.push(normalized);
    });

    return next;
}

export function createInventoryRecordId(prefix: "batch" | "sale") {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1000_000)}`;
}

export function getProductInventoryCountMap(batches: InventoryBatch[]) {
    const next = new Map<string, number>();

    batches.forEach((batch) => {
        const current = next.get(batch.productId) ?? 0;
        next.set(batch.productId, current + Math.max(0, batch.remainingQuantity));
    });

    return next;
}

export function getProductInventoryCount(productId: string, batches: InventoryBatch[]) {
    return batches
        .filter((batch) => batch.productId === productId)
        .reduce((total, batch) => total + Math.max(0, batch.remainingQuantity), 0);
}

export function syncProductsWithInventory(products: CatalogProduct[], batches: InventoryBatch[]) {
    const countByProductId = getProductInventoryCountMap(batches);
    return products.map((product) => ({
        ...product,
        inventory: countByProductId.get(product.id) ?? 0,
    }));
}

export function buildInventoryBatchesFromPurchaseOrders(
    purchaseOrders: PurchaseOrder[],
    sales: InventorySale[]
) {
    const soldByLineId = new Map<string, number>();
    sales.forEach((sale) => {
        soldByLineId.set(sale.batchId, (soldByLineId.get(sale.batchId) ?? 0) + sale.quantity);
    });

    const batches: InventoryBatch[] = [];
    purchaseOrders.forEach((order) => {
        if (order.status === "DRAFT" || order.status === "CANCELLED") return;
        order.lines.forEach((line) => {
            const soldQuantity = soldByLineId.get(line.id) ?? 0;
            const remainingQuantity = Math.max(0, line.quantity - soldQuantity);
            const unitSaleFallback = line.unitCost + (line.unitCost * (line.taxPercent / 100));
            batches.push({
                id: line.id,
                productId: line.productId,
                purchaseOrderId: order.id,
                variantValues: { ...line.variantValues },
                purchaseDate: order.purchaseDate,
                quantity: Math.max(0, line.quantity),
                remainingQuantity,
                purchaseCurrency: order.supplierCurrency,
                purchaseUnitPrice: Math.max(0, line.unitCost),
                saleCurrency: order.supplierCurrency,
                saleUnitPrice: Math.max(0, unitSaleFallback),
                maintenanceEntries: line.maintenanceEntries
                    ? line.maintenanceEntries.map((entry) => ({ ...entry }))
                    : undefined,
                vendor: order.supplierName || undefined,
                notes: order.notesToSupplier || undefined,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            });
        });
    });

    return batches;
}

export function removeInventoryForProductIds(
    productIds: string[],
    batches: InventoryBatch[],
    sales: InventorySale[]
) {
    if (productIds.length === 0) {
        return {
            batches,
            sales,
        };
    }

    const deleteSet = new Set(productIds);
    return {
        batches: batches.filter((batch) => !deleteSet.has(batch.productId)),
        sales: sales.filter((sale) => !deleteSet.has(sale.productId)),
    };
}

export function getSellableBatchesForProduct(productId: string, batches: InventoryBatch[]) {
    return batches
        .filter((batch) => batch.productId === productId && batch.remainingQuantity > 0)
        .sort((left, right) => new Date(left.purchaseDate).getTime() - new Date(right.purchaseDate).getTime());
}
