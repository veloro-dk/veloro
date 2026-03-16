import {
    DASHBOARD_DEFAULT_LAYOUT_PRESET,
    DASHBOARD_DEFAULT_SECTION_ID,
    DASHBOARD_DEFAULT_SECTION_NAME,
    DASHBOARD_GRID_COLUMNS,
    DASHBOARD_GRID_MIN_COLS,
    DASHBOARD_GRID_MIN_ROWS,
    DASHBOARD_MAX_SEARCH_ROWS,
    DASHBOARD_SECTION_MIN_ROWS,
    DASHBOARD_UNNAMED_SECTION_NAME,
    DASHBOARD_WIDGETS,
    DASHBOARD_WIDGETS_BY_ID,
    type DashboardLayoutState,
    type DashboardSectionLayout,
    type DashboardWidgetDefinition,
    type DashboardWidgetLayout,
    type WidgetSize,
} from "@/components/dashboard/viewConfig";
import { clamp } from "@/components/dashboard/viewHelpers";
import {
    DASHBOARD_WIDGET_DRAG_DATASET_KEY,
    DASHBOARD_WIDGET_DRAG_MIME,
} from "@/components/dashboardEditorEvents";

export type DashboardPlacedWidget = {
    layout: DashboardWidgetLayout;
    definition: DashboardWidgetDefinition;
    renderSize: WidgetSize;
    colStart: number;
    rowStart: number;
    colSpan: number;
    rowSpan: number;
};

export type DashboardRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export type DashboardInteractionState = {
    type: "drag" | "resize";
    sectionId: string;
    widgetId: string;
    pointerId: number;
    originRect: DashboardRect;
    latestRect: DashboardRect;
    startPointer: { x: number; y: number };
    cardRect: { width: number; height: number };
    unitSize: { width: number; height: number };
    maxRect: { w: number; h: number };
    pointerOffset: { x: number; y: number };
    pointerPosition: { x: number; y: number };
};

export function getDraggedWidgetIdFromDataTransfer(dataTransfer: DataTransfer | null): string | null {
    const resolveCandidate = (value: string | null | undefined) => {
        const candidate = (value ?? "").trim();
        if (!candidate || !DASHBOARD_WIDGETS_BY_ID.has(candidate)) return null;
        return candidate;
    };

    const fromTransfer = resolveCandidate(
        (dataTransfer?.getData(DASHBOARD_WIDGET_DRAG_MIME) || dataTransfer?.getData("text/plain") || null)
    );
    if (fromTransfer) return fromTransfer;

    if (typeof document !== "undefined") {
        const fromDataset = resolveCandidate(document.body.dataset[DASHBOARD_WIDGET_DRAG_DATASET_KEY]);
        if (fromDataset) return fromDataset;
    }

    return null;
}

function rectsOverlap(left: DashboardRect, right: DashboardRect) {
    return left.x < right.x + right.w
        && left.x + left.w > right.x
        && left.y < right.y + right.h
        && left.y + left.h > right.y;
}

export function areRectsEqual(left: DashboardRect, right: DashboardRect) {
    return left.x === right.x
        && left.y === right.y
        && left.w === right.w
        && left.h === right.h;
}

export function getWidgetMaxRect(definition: DashboardWidgetDefinition) {
    const maxSpan = definition.spans.xl;
    return {
        maxW: clamp(maxSpan.cols, DASHBOARD_GRID_MIN_COLS, DASHBOARD_GRID_COLUMNS),
        maxH: Math.max(DASHBOARD_GRID_MIN_ROWS, maxSpan.rows),
    };
}

export function normalizeWidgetRect(entry: DashboardWidgetLayout) {
    const definition = DASHBOARD_WIDGETS_BY_ID.get(entry.id);
    if (!definition) return entry;
    const { maxW, maxH } = getWidgetMaxRect(definition);
    const w = clamp(Math.round(entry.w), DASHBOARD_GRID_MIN_COLS, maxW);
    const h = clamp(Math.round(entry.h), DASHBOARD_GRID_MIN_ROWS, maxH);
    const x = clamp(Math.round(entry.x), 0, DASHBOARD_GRID_COLUMNS - w);
    const y = Math.max(0, Math.round(entry.y));
    return { ...entry, x, y, w, h };
}

function toVisualOrder(entries: DashboardWidgetLayout[]) {
    return [...entries]
        .sort((left, right) => {
            if (left.visible !== right.visible) return left.visible ? -1 : 1;
            if (!left.visible && !right.visible) return left.order - right.order;
            if (left.y !== right.y) return left.y - right.y;
            if (left.x !== right.x) return left.x - right.x;
            return left.order - right.order;
        })
        .map((entry, index) => ({ ...entry, order: index }));
}

function canPlaceRect(
    candidate: DashboardRect,
    placed: Map<string, DashboardRect>,
    ignoreWidgetIds: Set<string>
) {
    if (candidate.x < 0 || candidate.y < 0 || candidate.x + candidate.w > DASHBOARD_GRID_COLUMNS) return false;
    for (const [widgetId, rect] of placed.entries()) {
        if (ignoreWidgetIds.has(widgetId)) continue;
        if (rectsOverlap(candidate, rect)) return false;
    }
    return true;
}

function findPlacementByRightThenDown(
    preferred: DashboardRect,
    placed: Map<string, DashboardRect>,
    ignoreWidgetIds: Set<string>,
    preferRightShift: boolean
) {
    const maxX = DASHBOARD_GRID_COLUMNS - preferred.w;
    let y = preferred.y;
    let guard = 0;

    while (guard < DASHBOARD_MAX_SEARCH_ROWS) {
        const sameColumnCandidate = { ...preferred, y };
        if (canPlaceRect(sameColumnCandidate, placed, ignoreWidgetIds)) return sameColumnCandidate;

        if (preferRightShift) {
            for (let x = preferred.x + 1; x <= maxX; x += 1) {
                const rightCandidate = { ...preferred, x, y };
                if (canPlaceRect(rightCandidate, placed, ignoreWidgetIds)) return rightCandidate;
            }
        }

        y += 1;
        guard += 1;
    }

    return { ...preferred, y };
}

function resolveByVerticalPushDown(
    preferredEntries: Array<{ id: string; rect: DashboardRect; order: number }>,
    options?: { preferRightShift?: boolean; prioritizedWidgetId?: string | null }
) {
    const placed = new Map<string, DashboardRect>();
    const preferRightShift = options?.preferRightShift === true;
    const prioritizedWidgetId = options?.prioritizedWidgetId ?? null;
    const sorted = [...preferredEntries].sort((left, right) => {
        const leftPriority = prioritizedWidgetId !== null && left.id === prioritizedWidgetId;
        const rightPriority = prioritizedWidgetId !== null && right.id === prioritizedWidgetId;
        if (leftPriority !== rightPriority) return leftPriority ? -1 : 1;
        if (left.rect.y !== right.rect.y) return left.rect.y - right.rect.y;
        if (left.rect.x !== right.rect.x) return left.rect.x - right.rect.x;
        return left.order - right.order;
    });

    sorted.forEach((entry) => {
        const candidate = findPlacementByRightThenDown(
            entry.rect,
            placed,
            new Set([entry.id]),
            preferRightShift
        );
        placed.set(entry.id, candidate);
    });

    return placed;
}

function compactPlacedWidgetsUp(
    placed: Map<string, DashboardRect>,
    entries: Array<{ id: string; order: number }>,
    lockedWidgetIds: Set<string>,
    options?: { jumpAcrossLocked?: boolean }
) {
    const compacted = new Map(placed);
    const jumpAcrossLocked = options?.jumpAcrossLocked === true;
    const sorted = [...entries].sort((left, right) => {
        const leftRect = compacted.get(left.id);
        const rightRect = compacted.get(right.id);
        if (!leftRect || !rightRect) return left.order - right.order;
        if (leftRect.y !== rightRect.y) return leftRect.y - rightRect.y;
        if (leftRect.x !== rightRect.x) return leftRect.x - rightRect.x;
        return left.order - right.order;
    });

    sorted.forEach((entry) => {
        if (lockedWidgetIds.has(entry.id)) return;
        const currentRect = compacted.get(entry.id);
        if (!currentRect) return;

        if (jumpAcrossLocked) {
            let nextY = 0;
            let placedRect: DashboardRect | null = null;
            while (nextY <= currentRect.y && nextY < DASHBOARD_MAX_SEARCH_ROWS) {
                const candidate = { ...currentRect, y: nextY };
                if (canPlaceRect(candidate, compacted, new Set([entry.id]))) {
                    placedRect = candidate;
                    break;
                }
                nextY += 1;
            }

            compacted.set(entry.id, placedRect ?? currentRect);
            return;
        }

        let candidate = { ...currentRect };
        while (candidate.y > 0) {
            const nextCandidate = { ...candidate, y: candidate.y - 1 };
            if (!canPlaceRect(nextCandidate, compacted, new Set([entry.id]))) break;
            candidate = nextCandidate;
        }
        compacted.set(entry.id, candidate);
    });

    return compacted;
}

function compactVisibleWidgetLayout(widgets: DashboardWidgetLayout[]) {
    const normalizedWidgets = widgets.map((entry) => normalizeWidgetRect(entry));
    const visibleWidgets = normalizedWidgets
        .filter((entry) => entry.visible)
        .sort((left, right) => left.order - right.order);

    const placed = resolveByVerticalPushDown(
        visibleWidgets.map((entry) => ({
            id: entry.id,
            order: entry.order,
            rect: { x: entry.x, y: entry.y, w: entry.w, h: entry.h },
        }))
    );
    const compacted = compactPlacedWidgetsUp(
        placed,
        visibleWidgets.map((entry) => ({ id: entry.id, order: entry.order })),
        new Set()
    );

    const positioned = normalizedWidgets.map((entry) => {
        const rect = compacted.get(entry.id);
        if (!entry.visible || !rect) return entry;
        return {
            ...entry,
            x: rect.x,
            y: rect.y,
            w: rect.w,
            h: rect.h,
        };
    });

    return toVisualOrder(positioned);
}

export function compactVisibleWidgetLayoutForSection(widgets: DashboardWidgetLayout[], sectionId: string) {
    const sectionWidgets = widgets.filter((entry) => entry.sectionId === sectionId);
    const compactedSection = compactVisibleWidgetLayout(sectionWidgets);
    const sectionById = new Map(compactedSection.map((entry) => [entry.id, entry]));
    return widgets.map((entry) => sectionById.get(entry.id) ?? entry);
}

function applyWidgetRectChange(
    widgets: DashboardWidgetLayout[],
    widgetId: string,
    nextRect: DashboardRect,
    options: {
        swapAnchorRect: DashboardRect;
        allowSwap: boolean;
        lockTarget?: boolean;
        preferRightShift?: boolean;
        jumpAboveLocked?: boolean;
    }
) {
    const normalizedWidgets = widgets.map((entry) => normalizeWidgetRect(entry));
    const targetWidget = normalizedWidgets.find((entry) => entry.id === widgetId);
    if (!targetWidget) return normalizedWidgets;

    const visibleWidgets = normalizedWidgets
        .filter((entry) => entry.visible)
        .sort((left, right) => left.order - right.order);
    const staticWidgets = visibleWidgets.filter((entry) => entry.id !== widgetId);
    const nextTargetRect = normalizeWidgetRect({ ...targetWidget, ...nextRect });
    const collidingWidgets = staticWidgets.filter((entry) => rectsOverlap(entry, nextTargetRect));
    const toPositionedLayout = (rectMap: Map<string, DashboardRect>) => {
        const positioned = normalizedWidgets.map((entry) => {
            const rect = rectMap.get(entry.id);
            if (!entry.visible || !rect) return entry;
            return {
                ...entry,
                x: rect.x,
                y: rect.y,
                w: rect.w,
                h: rect.h,
            };
        });
        return toVisualOrder(positioned);
    };
    const reflowQueue = [...collidingWidgets];
    const preferredRects = new Map<string, DashboardRect>();
    visibleWidgets.forEach((entry) => {
        preferredRects.set(entry.id, { x: entry.x, y: entry.y, w: entry.w, h: entry.h });
    });
    preferredRects.set(widgetId, nextTargetRect);
    const lockedWidgetIds = new Set<string>(options.lockTarget === false ? [] : [widgetId]);

    if (options.allowSwap && collidingWidgets.length === 1) {
        const swapCandidate = collidingWidgets[0];
        const swapRect = {
            x: clamp(options.swapAnchorRect.x, 0, DASHBOARD_GRID_COLUMNS - swapCandidate.w),
            y: Math.max(0, options.swapAnchorRect.y),
            w: swapCandidate.w,
            h: swapCandidate.h,
        };

        const provisionalPlaced = new Map<string, DashboardRect>();
        visibleWidgets.forEach((entry) => {
            if (entry.id === widgetId || entry.id === swapCandidate.id) return;
            provisionalPlaced.set(entry.id, { x: entry.x, y: entry.y, w: entry.w, h: entry.h });
        });
        provisionalPlaced.set(widgetId, nextTargetRect);
        if (canPlaceRect(swapRect, provisionalPlaced, new Set([swapCandidate.id]))) {
            // Strict swap rule: only swap when target + one collided widget can exchange
            // positions while every other widget remains exactly where it is.
            provisionalPlaced.set(swapCandidate.id, swapRect);
            return toPositionedLayout(provisionalPlaced);
        }
    }

    if (options.allowSwap && collidingWidgets.length > 0) {
        // Fallback rule for drag-mode when swap is not possible:
        // keep all other widgets fixed and move the dragged widget down to fit.
        const staticPlaced = new Map<string, DashboardRect>();
        staticWidgets.forEach((entry) => {
            staticPlaced.set(entry.id, { x: entry.x, y: entry.y, w: entry.w, h: entry.h });
        });
        const targetPlacement = findPlacementByRightThenDown(
            nextTargetRect,
            staticPlaced,
            new Set([widgetId]),
            false
        );
        staticPlaced.set(widgetId, targetPlacement);
        return toPositionedLayout(staticPlaced);
    }

    if (reflowQueue.length > 0) {
        reflowQueue.forEach((entry) => {
            if (!preferredRects.has(entry.id)) {
                preferredRects.set(entry.id, { x: entry.x, y: entry.y, w: entry.w, h: entry.h });
            }
        });
    }

    const placed = resolveByVerticalPushDown(
        visibleWidgets.map((entry) => ({
            id: entry.id,
            order: entry.order,
            rect: preferredRects.get(entry.id) ?? { x: entry.x, y: entry.y, w: entry.w, h: entry.h },
        })),
        {
            preferRightShift: options.preferRightShift === true,
            prioritizedWidgetId: widgetId,
        }
    );
    const compacted = compactPlacedWidgetsUp(
        placed,
        visibleWidgets.map((entry) => ({ id: entry.id, order: entry.order })),
        lockedWidgetIds,
        { jumpAcrossLocked: options.jumpAboveLocked === true }
    );

    return toPositionedLayout(compacted);
}

export function applyWidgetRectChangeForSection(
    widgets: DashboardWidgetLayout[],
    sectionId: string,
    widgetId: string,
    nextRect: DashboardRect,
    options: {
        swapAnchorRect: DashboardRect;
        allowSwap: boolean;
        lockTarget?: boolean;
        preferRightShift?: boolean;
        jumpAboveLocked?: boolean;
    }
) {
    const sectionWidgets = widgets.filter((entry) => entry.sectionId === sectionId);
    const sectionProjected = applyWidgetRectChange(sectionWidgets, widgetId, nextRect, options);
    const byId = new Map(sectionProjected.map((entry) => [entry.id, entry]));
    return widgets.map((entry) => byId.get(entry.id) ?? entry);
}

export function buildDefaultDashboardLayoutState(): DashboardLayoutState {
    const sections: DashboardSectionLayout[] = [
        {
            id: DASHBOARD_DEFAULT_SECTION_ID,
            name: DASHBOARD_DEFAULT_SECTION_NAME,
            collapsed: false,
            minRows: DASHBOARD_SECTION_MIN_ROWS,
            order: 0,
        },
    ];
    const presetById = new Map(DASHBOARD_DEFAULT_LAYOUT_PRESET.map((entry) => [entry.id, entry]));
    const widgets = DASHBOARD_WIDGETS.map((widget, index) => {
        const preset = presetById.get(widget.id);
        if (preset) {
            return normalizeWidgetRect({
                ...preset,
                id: widget.id,
                visible: preset.visible !== false,
                order: preset.order,
            });
        }

        const defaultSpan = widget.spans[widget.defaultSize];
        const { maxW, maxH } = getWidgetMaxRect(widget);
        return normalizeWidgetRect({
            id: widget.id,
            sectionId: DASHBOARD_DEFAULT_SECTION_ID,
            visible: true,
            x: 0,
            y: index * 2,
            w: clamp(defaultSpan.cols, DASHBOARD_GRID_MIN_COLS, maxW),
            h: clamp(defaultSpan.rows, DASHBOARD_GRID_MIN_ROWS, maxH),
            order: index,
        });
    });

    return {
        sections,
        widgets: toVisualOrder(widgets),
        lastEditedAt: null,
    };
}

export function cloneLayoutSections(entries: DashboardSectionLayout[]) {
    return entries.map((entry) => ({ ...entry }));
}

export function cloneLayoutWidgets(entries: DashboardWidgetLayout[]) {
    return entries.map((entry) => ({ ...entry }));
}

export function normalizeLayoutSections(entries: DashboardSectionLayout[]) {
    const byId = new Map<string, DashboardSectionLayout>();
    entries.forEach((entry) => {
        if (!entry?.id || typeof entry.id !== "string" || byId.has(entry.id)) return;
        const normalizedName = (entry.name ?? "").trim();
        byId.set(entry.id, {
            id: entry.id,
            name: normalizedName || DASHBOARD_UNNAMED_SECTION_NAME,
            collapsed: entry.collapsed === true,
            minRows: Math.max(1, Math.round(entry.minRows || DASHBOARD_SECTION_MIN_ROWS)),
            order: Number.isFinite(entry.order) ? entry.order : 0,
        });
    });

    if (!byId.has(DASHBOARD_DEFAULT_SECTION_ID)) {
        byId.set(DASHBOARD_DEFAULT_SECTION_ID, {
            id: DASHBOARD_DEFAULT_SECTION_ID,
            name: DASHBOARD_DEFAULT_SECTION_NAME,
            collapsed: false,
            minRows: DASHBOARD_SECTION_MIN_ROWS,
            order: byId.size,
        });
    }

    return [...byId.values()]
        .sort((left, right) => left.order - right.order)
        .map((entry, index) => ({ ...entry, order: index }));
}

export function normalizeLayoutWidgets(entries: DashboardWidgetLayout[], sections: DashboardSectionLayout[]) {
    const validSectionIds = new Set(sections.map((section) => section.id));
    const fallbackSectionId = sections[0]?.id ?? DASHBOARD_DEFAULT_SECTION_ID;
    const byId = new Map<string, DashboardWidgetLayout>();
    entries.forEach((entry) => {
        const definition = DASHBOARD_WIDGETS_BY_ID.get(entry.id);
        if (!definition || byId.has(entry.id)) return;
        const { maxW, maxH } = getWidgetMaxRect(definition);
        const normalizedW = clamp(Math.round(entry.w), DASHBOARD_GRID_MIN_COLS, maxW);
        const normalizedH = clamp(Math.round(entry.h), DASHBOARD_GRID_MIN_ROWS, maxH);
        const normalizedX = clamp(Math.round(entry.x), 0, DASHBOARD_GRID_COLUMNS - normalizedW);
        const normalizedY = Math.max(0, Math.round(entry.y));
        const normalizedSectionId = validSectionIds.has(entry.sectionId) ? entry.sectionId : fallbackSectionId;
        byId.set(entry.id, {
            id: entry.id,
            sectionId: normalizedSectionId,
            visible: entry.visible !== false,
            x: normalizedX,
            y: normalizedY,
            w: normalizedW,
            h: normalizedH,
            order: Number.isFinite(entry.order) ? entry.order : 0,
        });
    });

    const fallbackDefaults = buildDefaultDashboardLayoutState().widgets;
    const next = DASHBOARD_WIDGETS.map((definition, index) => {
        const entry = byId.get(definition.id);
        const fallback = fallbackDefaults.find((widget) => widget.id === definition.id);
        return {
            id: definition.id,
            sectionId: entry?.sectionId ?? fallback?.sectionId ?? fallbackSectionId,
            visible: entry?.visible ?? fallback?.visible ?? true,
            x: entry?.x ?? fallback?.x ?? 0,
            y: entry?.y ?? fallback?.y ?? index * 2,
            w: entry?.w ?? fallback?.w ?? clamp(definition.spans[definition.defaultSize].cols, DASHBOARD_GRID_MIN_COLS, DASHBOARD_GRID_COLUMNS),
            h: entry?.h ?? fallback?.h ?? Math.max(DASHBOARD_GRID_MIN_ROWS, definition.spans[definition.defaultSize].rows),
            order: entry?.order ?? index,
        };
    });

    return toVisualOrder(next);
}

export function ensureDashboardLayoutWidget(entries: DashboardWidgetLayout[], widgetId: string, sectionId: string) {
    if (entries.some((entry) => entry.id === widgetId)) return entries;
    const definition = DASHBOARD_WIDGETS_BY_ID.get(widgetId);
    if (!definition) return entries;

    const defaultSpan = definition.spans[definition.defaultSize];
    const { maxW, maxH } = getWidgetMaxRect(definition);
    const nextOrder = entries.reduce((max, entry) => Math.max(max, entry.order), -1) + 1;

    return [
        ...entries,
        {
            id: widgetId,
            sectionId,
            visible: false,
            x: 0,
            y: 0,
            w: clamp(defaultSpan.cols, DASHBOARD_GRID_MIN_COLS, maxW),
            h: clamp(defaultSpan.rows, DASHBOARD_GRID_MIN_ROWS, maxH),
            order: nextOrder,
        },
    ];
}

export function areLayoutsEqual(left: DashboardWidgetLayout[], right: DashboardWidgetLayout[]) {
    if (left.length !== right.length) return false;
    return left.every((entry, index) => {
        const other = right[index];
        return entry.id === other.id
            && entry.sectionId === other.sectionId
            && entry.visible === other.visible
            && entry.x === other.x
            && entry.y === other.y
            && entry.w === other.w
            && entry.h === other.h
            && entry.order === other.order;
    });
}

export function areSectionsEqual(left: DashboardSectionLayout[], right: DashboardSectionLayout[]) {
    if (left.length !== right.length) return false;
    return left.every((entry, index) => {
        const other = right[index];
        return entry.id === other.id
            && entry.name === other.name
            && entry.collapsed === other.collapsed
            && entry.minRows === other.minRows
            && entry.order === other.order;
    });
}

function resolveWidgetRenderSize(definition: DashboardWidgetDefinition, width: number, height: number): WidgetSize {
    const orderedSizes: WidgetSize[] = ["sm", "md", "lg", "xl"];
    let resolved: WidgetSize = "sm";
    orderedSizes.forEach((size) => {
        const span = definition.spans[size];
        if (width >= span.cols && height >= span.rows) {
            resolved = size;
        }
    });
    return resolved;
}

export function buildPlacedWidgetLayout(layout: DashboardWidgetLayout[], isMobileViewport: boolean) {
    const ordered = [...layout]
        .filter((entry) => entry.visible)
        .sort((left, right) => left.order - right.order);
    const items: DashboardPlacedWidget[] = [];

    if (isMobileViewport) {
        let rowCursor = 1;
        ordered.forEach((entry) => {
            const definition = DASHBOARD_WIDGETS_BY_ID.get(entry.id);
            if (!definition) return;
            const rowSpan = Math.max(DASHBOARD_GRID_MIN_ROWS, entry.h);
            items.push({
                layout: entry,
                definition,
                renderSize: resolveWidgetRenderSize(definition, DASHBOARD_GRID_COLUMNS, rowSpan),
                colStart: 1,
                rowStart: rowCursor,
                colSpan: DASHBOARD_GRID_COLUMNS,
                rowSpan,
            });
            rowCursor += rowSpan;
        });

        return {
            items,
            rows: Math.max(1, rowCursor - 1),
        };
    }

    ordered.forEach((entry) => {
        const definition = DASHBOARD_WIDGETS_BY_ID.get(entry.id);
        if (!definition) return;
        const normalized = normalizeWidgetRect(entry);
        items.push({
            layout: normalized,
            definition,
            renderSize: resolveWidgetRenderSize(definition, normalized.w, normalized.h),
            colStart: normalized.x + 1,
            rowStart: normalized.y + 1,
            colSpan: normalized.w,
            rowSpan: normalized.h,
        });
    });

    const rows = items.reduce((max, item) => Math.max(max, item.rowStart - 1 + item.rowSpan), 0);
    return {
        items,
        rows: Math.max(1, rows),
    };
}
