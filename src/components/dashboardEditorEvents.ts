export const DASHBOARD_WIDGET_MENU_EVENT = "veloro:dashboard-widget-menu";
export const DASHBOARD_WIDGET_DRAG_MIME = "application/x-veloro-dashboard-widget";
export const DASHBOARD_WIDGET_DRAG_DATASET_KEY = "veloroDashboardDragWidget";

export type DashboardWidgetMenuItem = {
    id: string;
    title: string;
    category: string;
    visible: boolean;
};

export type DashboardWidgetMenuEventDetail = {
    open: boolean;
    items: DashboardWidgetMenuItem[];
};

export function isDashboardWidgetMenuEventDetail(value: unknown): value is DashboardWidgetMenuEventDetail {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Partial<DashboardWidgetMenuEventDetail>;
    if (typeof candidate.open !== "boolean" || !Array.isArray(candidate.items)) return false;

    return candidate.items.every(
        (item) => !!item
            && typeof item === "object"
            && typeof (item as { id?: unknown }).id === "string"
            && typeof (item as { title?: unknown }).title === "string"
            && typeof (item as { category?: unknown }).category === "string"
            && typeof (item as { visible?: unknown }).visible === "boolean"
    );
}
