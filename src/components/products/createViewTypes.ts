import type { CurrencyCode } from "@/i18n/portal";

export type PortalProductCreateViewProps = {
    storeCurrency?: CurrencyCode;
    productId?: string;
    commenterName?: string;
    commenterStoreName?: string;
};

export type ProductCategorySort = "TITLE_ASC" | "TITLE_DESC" | "NEWEST" | "OLDEST";
export type ProductCategorySearchBy = "TITLE" | "ID";
export type VariantSort = "CUSTOM" | "LABEL_ASC" | "LABEL_DESC" | "TYPE_ASC" | "TYPE_DESC";
export type VariantSearchBy = "LABEL" | "TYPE" | "ID";

export type NewVariantErrorKey = "name" | "conflict" | "selectValues";
export type ProductTimelineEventType = "purchase-order" | "maintenance" | "sale" | "comment";

export type ProductTimelineEvent = {
    id: string;
    type: ProductTimelineEventType;
    timestamp: number;
    title: string;
    details: string;
    meta?: string;
    editable?: boolean;
    deletable?: boolean;
    purchaseOrderId?: string;
    lineId?: string;
    maintenanceEntryId?: string;
    saleId?: string;
    commentId?: string;
    amount?: number;
    currency?: string;
    authorName?: string;
    storeName?: string;
};
