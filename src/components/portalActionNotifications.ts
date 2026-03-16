export type PortalActionNotificationTone = "info" | "success" | "warning" | "error";

export type PortalActionNotificationDetail = {
    message: string;
    tone?: PortalActionNotificationTone;
    durationMs?: number;
};

export const PORTAL_ACTION_NOTIFY_EVENT = "veloro:action-notify";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function isPortalActionNotificationDetail(value: unknown): value is PortalActionNotificationDetail {
    if (!isRecord(value)) return false;
    if (typeof value.message !== "string" || value.message.trim().length === 0) return false;

    if (
        value.tone !== undefined
        && value.tone !== "info"
        && value.tone !== "success"
        && value.tone !== "warning"
        && value.tone !== "error"
    ) {
        return false;
    }

    if (value.durationMs !== undefined) {
        if (typeof value.durationMs !== "number" || !Number.isFinite(value.durationMs) || value.durationMs <= 0) {
            return false;
        }
    }

    return true;
}

export function notifyPortalAction(detail: PortalActionNotificationDetail | string) {
    if (typeof window === "undefined") return;

    const normalized: PortalActionNotificationDetail = typeof detail === "string"
        ? { message: detail }
        : detail;
    if (!isPortalActionNotificationDetail(normalized)) return;

    window.dispatchEvent(new CustomEvent(PORTAL_ACTION_NOTIFY_EVENT, { detail: normalized }));
}
