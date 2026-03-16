export const SETTINGS_PENDING_CHANGES_DATASET_KEY = "veloroSettingsPending";
export const DASHBOARD_PENDING_CHANGES_DATASET_KEY = "veloroDashboardPending";
export const PRODUCT_CREATE_PENDING_CHANGES_DATASET_KEY = "veloroProductCreatePending";
export const PENDING_DISCARD_LABEL_DATASET_KEY = "veloroPendingDiscardLabel";
export const PENDING_SAVE_DISABLED_DATASET_KEY = "veloroPendingSaveDisabled";

export const PENDING_CHANGES_ATTENTION_EVENT = "veloro:pending-changes-attention";
export const PENDING_CHANGES_ACTION_EVENT = "veloro:pending-changes-action";

export type PendingChangesScope = "settings" | "dashboard" | "productCreate";
export type PendingChangesAction = "save" | "discard";
export type PendingDiscardLabelVariant = "cancel" | "discard";

export type PendingChangesActionEventDetail = {
    scope: PendingChangesScope;
    action: PendingChangesAction;
};

export function isPendingChangesActionEventDetail(value: unknown): value is PendingChangesActionEventDetail {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Partial<PendingChangesActionEventDetail>;
    return (
        (candidate.scope === "settings" || candidate.scope === "dashboard" || candidate.scope === "productCreate")
        && (candidate.action === "save" || candidate.action === "discard")
    );
}
