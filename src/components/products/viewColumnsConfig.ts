export const COLUMN_DRAGGING_BODY_CLASS = "portalProductsGlobalDragActive__F4m2Q8";

export type ProductTableColumnId = "product" | "status" | "inventory" | "category" | "updated" | `variant:${string}`;

export type ProductTableColumn = {
    id: ProductTableColumnId;
    label: string;
    variantId?: string;
    locked?: boolean;
};

export type ColumnSection = "standard" | "variant";

export const PRODUCT_DEFAULT_VISIBLE_COLUMNS: ProductTableColumnId[] = ["product", "status", "inventory", "category", "updated"];

export type ProductColumnDropTarget = { columnId: ProductTableColumnId; position: "before" | "after" };
export type ProductColumnDragPreview = { label: string; x: number; y: number };
