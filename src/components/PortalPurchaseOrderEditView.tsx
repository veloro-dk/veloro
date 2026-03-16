"use client";

import { PortalPurchaseOrderFormView } from "@/components/PortalPurchaseOrderFormView";

type StoreSummary = {
    id: string;
    name: string;
};

type PortalPurchaseOrderEditViewProps = {
    orderId: string;
    stores: StoreSummary[];
    activeStoreId: string;
    storeCurrency: string;
};

export function PortalPurchaseOrderEditView({ orderId, stores, activeStoreId, storeCurrency }: PortalPurchaseOrderEditViewProps) {
    return (
        <PortalPurchaseOrderFormView
            orderId={orderId}
            stores={stores}
            activeStoreId={activeStoreId}
            storeCurrency={storeCurrency}
        />
    );
}
