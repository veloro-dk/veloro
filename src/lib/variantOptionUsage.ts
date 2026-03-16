import type { CatalogProduct } from "@/lib/productCatalog";
import type { PurchaseOrder } from "@/lib/purchaseOrders";

function normalizeComparableValue(value: string) {
    return value.trim();
}

export function countVariantOptionUsageInProducts(
    products: CatalogProduct[],
    variantId: string,
    optionValue: string
) {
    if (!variantId || !optionValue) return 0;
    const target = normalizeComparableValue(optionValue);
    return products.reduce((count, product) => (
        normalizeComparableValue(product.variants?.[variantId] ?? "") === target ? count + 1 : count
    ), 0);
}

export function countVariantOptionUsageInPurchaseOrders(
    purchaseOrders: PurchaseOrder[],
    variantId: string,
    optionValue: string
) {
    if (!variantId || !optionValue) return 0;
    const target = normalizeComparableValue(optionValue);
    return purchaseOrders.reduce((orderCount, order) => (
        orderCount + order.lines.reduce((lineCount, line) => (
            normalizeComparableValue(line.variantValues?.[variantId] ?? "") === target ? lineCount + 1 : lineCount
        ), 0)
    ), 0);
}

export function countVariantOptionUsage(
    products: CatalogProduct[],
    variantId: string,
    optionValue: string,
    purchaseOrders: PurchaseOrder[] = []
) {
    return countVariantOptionUsageInProducts(products, variantId, optionValue)
        + countVariantOptionUsageInPurchaseOrders(purchaseOrders, variantId, optionValue);
}
