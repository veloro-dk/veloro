import { getCurrencySymbol } from "@/lib/currencies";
import {
    getProductCategoryTitles,
    type CategoryVariantRule,
    type CatalogProduct,
    type ProductCategoryDefinition,
    type VariantDefinition,
} from "@/lib/productCatalog";
import {
    DEFAULT_PO_PAYMENT_TERMS,
    buildNextPurchaseOrderNumber,
    createPurchaseOrderId,
    type PurchaseOrder,
    type PurchaseOrderAdjustmentType,
} from "@/lib/purchaseOrders";

export type ProductPickerSort = "TITLE_ASC" | "TITLE_DESC" | "PRICE_HIGH" | "PRICE_LOW" | "NEWEST" | "OLDEST";
export type ProductSearchBy = "TITLE" | "ID" | "SKU";

export const DUPLICATE_VALUE_MESSAGE = "Duplicate value is not allowed.";

export function formatDateInputValue(value: Date) {
    return value.toISOString().slice(0, 10);
}

export function normalizeString(value: string) {
    return value.trim();
}

export function buildVariantOptionInUseMessage(value: string, usageCount: number) {
    return `"${value}" is tied to ${usageCount} product record${usageCount === 1 ? "" : "s"}. Untie it before deleting.`;
}

export function ensureLeadingCapital(value: string, locale: string) {
    if (!value) return value;
    return `${value.charAt(0).toLocaleUpperCase(locale)}${value.slice(1)}`;
}

export function formatCurrencyInputSuffix(currencyCode: string, locale: string) {
    const normalizedCode = currencyCode.toUpperCase();
    const symbol = getCurrencySymbol(normalizedCode, locale);
    if (!symbol || symbol.toUpperCase() === normalizedCode) return normalizedCode;
    if (/[A-Za-z]/.test(symbol)) return symbol.replace(/\./g, "").trim().toUpperCase();
    return symbol;
}

export function normalizeAmountByAdjustmentType(type: PurchaseOrderAdjustmentType, amount: number) {
    if (type === "DISCOUNT") return amount > 0 ? -amount : amount;
    return amount < 0 ? Math.abs(amount) : amount;
}

export function sortProductsForPicker(products: CatalogProduct[], sort: ProductPickerSort) {
    const sorted = [...products];
    sorted.sort((left, right) => {
        if (sort === "TITLE_ASC") return left.name.localeCompare(right.name);
        if (sort === "TITLE_DESC") return right.name.localeCompare(left.name);
        if (sort === "PRICE_HIGH" || sort === "PRICE_LOW") {
            const leftPrice = Number.isFinite(left.listedSalePrice) ? (left.listedSalePrice as number) : 0;
            const rightPrice = Number.isFinite(right.listedSalePrice) ? (right.listedSalePrice as number) : 0;
            if (leftPrice === rightPrice) return left.name.localeCompare(right.name);
            return sort === "PRICE_HIGH" ? rightPrice - leftPrice : leftPrice - rightPrice;
        }
        const leftTime = Date.parse(left.updatedAt);
        const rightTime = Date.parse(right.updatedAt);
        const leftSafe = Number.isNaN(leftTime) ? 0 : leftTime;
        const rightSafe = Number.isNaN(rightTime) ? 0 : rightTime;
        if (leftSafe === rightSafe) return left.name.localeCompare(right.name);
        return sort === "NEWEST" ? rightSafe - leftSafe : leftSafe - rightSafe;
    });
    return sorted;
}

export function matchesProductPickerQuery(
    product: CatalogProduct,
    categories: ProductCategoryDefinition[],
    query: string,
    searchBy: ProductSearchBy
) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    if (searchBy === "ID") return product.id.toLowerCase().includes(normalizedQuery);
    if (searchBy === "SKU") return product.sku.toLowerCase().includes(normalizedQuery);
    return (
        product.name.toLowerCase().includes(normalizedQuery)
        || product.sku.toLowerCase().includes(normalizedQuery)
        || getProductCategoryTitles(product, categories).some((title) => title.toLowerCase().includes(normalizedQuery))
    );
}

export function buildDefaultDraft(activeStoreId: string, storeCurrency: string, existingOrders: PurchaseOrder[]): PurchaseOrder {
    const now = new Date().toISOString();
    return {
        id: createPurchaseOrderId(),
        poNumber: buildNextPurchaseOrderNumber(existingOrders),
        supplierName: "",
        destinationStoreId: activeStoreId,
        paymentTerms: DEFAULT_PO_PAYMENT_TERMS[0],
        supplierCurrency: storeCurrency,
        purchaseDate: formatDateInputValue(new Date()),
        shippingCarrier: "",
        trackingNumber: "",
        status: "DRAFT",
        expectedPackages: 0,
        receivedPackages: 0,
        referenceNumber: "",
        notesToSupplier: "",
        lines: [],
        adjustments: [],
        createdAt: now,
        updatedAt: now,
    };
}

export function formatMoney(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

export function cloneDraft(draft: PurchaseOrder): PurchaseOrder {
    return {
        ...draft,
        lines: draft.lines.map((line) => ({
            ...line,
            variantValues: { ...line.variantValues },
            maintenanceEntries: line.maintenanceEntries?.map((entry) => ({ ...entry })),
        })),
        adjustments: draft.adjustments.map((adjustment) => ({ ...adjustment })),
    };
}

export function serializeDraft(draft: PurchaseOrder) {
    return JSON.stringify({
        ...draft,
        lines: draft.lines.map((line) => ({
            ...line,
            variantValues: Object.fromEntries(Object.entries(line.variantValues).sort(([a], [b]) => a.localeCompare(b))),
        })),
    });
}

export function getOrderSummary(draft: PurchaseOrder) {
    const itemCount = draft.lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = draft.lines.reduce((sum, line) => sum + (line.quantity * line.unitCost), 0);
    const taxTotal = draft.lines.reduce((sum, line) => sum + ((line.quantity * line.unitCost) * (line.taxPercent / 100)), 0);
    const adjustmentTotal = draft.adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
    const total = subtotal + taxTotal + adjustmentTotal;
    return { itemCount, subtotal, taxTotal, adjustmentTotal, total };
}

export function getProductById(products: CatalogProduct[]) {
    const map = new Map<string, CatalogProduct>();
    products.forEach((product) => map.set(product.id, product));
    return map;
}

export function getCategoryById(categories: ProductCategoryDefinition[]) {
    const map = new Map<string, ProductCategoryDefinition>();
    categories.forEach((category) => map.set(category.id, category));
    return map;
}

export function getProductCategoryRules(product: CatalogProduct, categoryById: Map<string, ProductCategoryDefinition>) {
    const rules: CategoryVariantRule[] = [];
    const seen = new Set<string>();
    product.categoryIds.forEach((categoryId) => {
        const category = categoryById.get(categoryId);
        if (!category) return;
        category.variantRules.forEach((rule) => {
            if (seen.has(rule.variantId)) return;
            seen.add(rule.variantId);
            rules.push(rule);
        });
    });
    return rules;
}

export function getVariantDefinitionById(variantDefinitions: VariantDefinition[]) {
    const map = new Map<string, VariantDefinition>();
    variantDefinitions.forEach((variant) => map.set(variant.id, variant));
    return map;
}

export function mergeVariantRules(
    categoryRules: CategoryVariantRule[],
    productRules: CategoryVariantRule[]
) {
    const seen = new Set<string>();
    const merged: Array<{ variantId: string; required: boolean; source: "category" | "product" }> = [];

    categoryRules.forEach((rule) => {
        if (seen.has(rule.variantId)) return;
        seen.add(rule.variantId);
        merged.push({ variantId: rule.variantId, required: rule.required, source: "category" });
    });
    productRules.forEach((rule) => {
        const existing = merged.find((entry) => entry.variantId === rule.variantId);
        if (existing) {
            existing.required = existing.required || rule.required;
            if (existing.source !== "product") existing.source = "product";
            return;
        }
        merged.push({ variantId: rule.variantId, required: rule.required, source: "product" });
    });

    return merged;
}

export function getProductDisplayLabel(product: CatalogProduct) {
    return `${product.name} (${product.sku})`;
}
