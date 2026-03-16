export const COLUMN_DRAGGING_BODY_CLASS = "portalProductsGlobalDragActive__F4m2Q8";

export type InventoryTableColumnId = "product" | "inventory" | "category" | "updated" | `variant:${string}`;

export type InventoryTableColumn = {
    id: InventoryTableColumnId;
    label: string;
    variantId?: string;
    locked?: boolean;
};

export type ColumnSection = "standard" | "variant";

export const INVENTORY_DEFAULT_VISIBLE_COLUMNS: InventoryTableColumnId[] = ["product", "inventory", "category", "updated"];

export type InventoryColumnDropTarget = { columnId: InventoryTableColumnId; position: "before" | "after" };
export type InventoryColumnDragPreview = { label: string; x: number; y: number };

export function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function getColumnSection(columnId: InventoryTableColumnId): ColumnSection {
    return columnId.startsWith("variant:") ? "variant" : "standard";
}

export function normalizeVisibleColumnIds(
    columnIds: InventoryTableColumnId[],
    allColumns: InventoryTableColumn[]
) {
    const knownIds = new Set(allColumns.map((column) => column.id));
    const next: InventoryTableColumnId[] = [];
    const seen = new Set<InventoryTableColumnId>();

    columnIds.forEach((columnId) => {
        if (!knownIds.has(columnId) || seen.has(columnId)) return;
        next.push(columnId);
        seen.add(columnId);
    });

    allColumns.forEach((column) => {
        if (!column.locked || seen.has(column.id)) return;
        if (column.variantId) {
            next.push(column.id);
        } else {
            const firstVariantIndex = next.findIndex((entry) => getColumnSection(entry) === "variant");
            if (firstVariantIndex < 0) next.unshift(column.id);
            else next.splice(firstVariantIndex, 0, column.id);
        }
        seen.add(column.id);
    });

    return next.length > 0 ? next : INVENTORY_DEFAULT_VISIBLE_COLUMNS;
}

export function toggleVisibleColumnIds(
    current: InventoryTableColumnId[],
    allColumns: InventoryTableColumn[],
    columnId: InventoryTableColumnId,
    checked: boolean
) {
    const next = normalizeVisibleColumnIds(current, allColumns);
    const section = getColumnSection(columnId);
    const nextSet = new Set(next);
    if (checked) {
        if (!nextSet.has(columnId)) {
            if (section === "variant") {
                next.push(columnId);
            } else {
                const firstVariantIndex = next.findIndex((entry) => getColumnSection(entry) === "variant");
                if (firstVariantIndex < 0) {
                    next.push(columnId);
                } else {
                    next.splice(firstVariantIndex, 0, columnId);
                }
            }
        }
    } else if (nextSet.has(columnId)) {
        const index = next.indexOf(columnId);
        if (index >= 0) next.splice(index, 1);
    }

    return normalizeVisibleColumnIds(next, allColumns);
}

export function reorderVisibleColumnIds(
    current: InventoryTableColumnId[],
    allColumns: InventoryTableColumn[],
    draggedId: InventoryTableColumnId,
    targetId: InventoryTableColumnId,
    position: "before" | "after"
) {
    const next = normalizeVisibleColumnIds(current, allColumns);
    const draggedIndex = next.indexOf(draggedId);
    const targetIndex = next.indexOf(targetId);
    if (draggedIndex < 0 || targetIndex < 0) return current;

    let insertionIndex = targetIndex + (position === "after" ? 1 : 0);
    if (draggedIndex < insertionIndex) insertionIndex -= 1;
    if (insertionIndex === draggedIndex) return current;

    const [entry] = next.splice(draggedIndex, 1);
    next.splice(insertionIndex, 0, entry);
    return next;
}
