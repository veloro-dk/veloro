"use client";

import { useEffect } from "react";
import {
    DASHBOARD_PENDING_CHANGES_DATASET_KEY,
    PENDING_CHANGES_ACTION_EVENT,
    PENDING_DISCARD_LABEL_DATASET_KEY,
    PENDING_SAVE_DISABLED_DATASET_KEY,
    PRODUCT_CREATE_PENDING_CHANGES_DATASET_KEY,
    SETTINGS_PENDING_CHANGES_DATASET_KEY,
    type PendingChangesScope,
    type PendingDiscardLabelVariant,
    isPendingChangesActionEventDetail,
} from "@/components/pendingChangesEvents";

type UsePendingChangesHeaderOptions = {
    active: boolean;
    scope: PendingChangesScope;
    onSave: () => void | Promise<void> | boolean | Promise<boolean>;
    onDiscard: () => void;
    discardLabelVariant?: PendingDiscardLabelVariant;
    saveDisabled?: boolean;
};

const DATASET_KEY_BY_SCOPE: Record<PendingChangesScope, string> = {
    settings: SETTINGS_PENDING_CHANGES_DATASET_KEY,
    dashboard: DASHBOARD_PENDING_CHANGES_DATASET_KEY,
    productCreate: PRODUCT_CREATE_PENDING_CHANGES_DATASET_KEY,
};

export function usePendingChangesHeader({
    active,
    scope,
    onSave,
    onDiscard,
    discardLabelVariant,
    saveDisabled,
}: UsePendingChangesHeaderOptions) {
    useEffect(() => {
        if (typeof document === "undefined") return;

        const key = DATASET_KEY_BY_SCOPE[scope];
        if (!active) {
            delete document.body.dataset[key];
            delete document.body.dataset[PENDING_DISCARD_LABEL_DATASET_KEY];
            delete document.body.dataset[PENDING_SAVE_DISABLED_DATASET_KEY];
            return;
        }

        document.body.dataset[key] = "1";
        if (discardLabelVariant) {
            document.body.dataset[PENDING_DISCARD_LABEL_DATASET_KEY] = discardLabelVariant;
        } else {
            delete document.body.dataset[PENDING_DISCARD_LABEL_DATASET_KEY];
        }

        if (typeof saveDisabled === "boolean") {
            document.body.dataset[PENDING_SAVE_DISABLED_DATASET_KEY] = saveDisabled ? "1" : "0";
        } else {
            delete document.body.dataset[PENDING_SAVE_DISABLED_DATASET_KEY];
        }

        return () => {
            delete document.body.dataset[key];
            delete document.body.dataset[PENDING_DISCARD_LABEL_DATASET_KEY];
            delete document.body.dataset[PENDING_SAVE_DISABLED_DATASET_KEY];
        };
    }, [active, discardLabelVariant, saveDisabled, scope]);

    useEffect(() => {
        if (!active) return;
        if (typeof window === "undefined") return;

        const onPendingAction = (event: Event) => {
            const detail = (event as CustomEvent<unknown>).detail;
            if (!isPendingChangesActionEventDetail(detail) || detail.scope !== scope) return;

            if (detail.action === "save") {
                void Promise.resolve(onSave());
                return;
            }

            onDiscard();
        };

        window.addEventListener(PENDING_CHANGES_ACTION_EVENT, onPendingAction as EventListener);
        return () => window.removeEventListener(PENDING_CHANGES_ACTION_EVENT, onPendingAction as EventListener);
    }, [active, onDiscard, onSave, scope]);
}
