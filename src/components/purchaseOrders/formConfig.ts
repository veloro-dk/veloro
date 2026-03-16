import type { PurchaseOrderAdjustmentType } from "@/lib/purchaseOrders";

export type StoreSummary = {
    id: string;
    name: string;
};

export type PortalPurchaseOrderFormViewProps = {
    stores: StoreSummary[];
    activeStoreId: string;
    storeCurrency: string;
    orderId?: string;
};

export type LineValidationError = Partial<Record<"quantity" | "unitCost" | "taxPercent" | "variantValues", string>>;

export type AdjustmentEditorState = {
    type: PurchaseOrderAdjustmentType;
    label: string;
    amount: string;
    currency: string;
};

export type VariantLibrarySearchBy = "LABEL" | "TYPE" | "ID";
export type NewVariantErrorKey = "name" | "conflict" | "selectValues";

export const ADJUSTMENT_TYPES: Array<{ value: PurchaseOrderAdjustmentType; label: string }> = [
    { value: "DISCOUNT", label: "Discount" },
    { value: "SHIPPING", label: "Shipping" },
    { value: "INSURANCE", label: "Insurance" },
    { value: "FOREIGN_TRANSACTION_FEE", label: "Foreign transaction fee" },
    { value: "RUSH_FEE", label: "Rush fee" },
    { value: "OTHER", label: "Other" },
];

export const SUPPLIER_REGION_CONTINENTS = [
    "Africa",
    "Antarctica",
    "Asia",
    "Europe",
    "North America",
    "Oceania",
    "South America",
] as const;
