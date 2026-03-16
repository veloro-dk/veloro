"use client";

import { PortalPurchaseOrderFormView } from "@/components/PortalPurchaseOrderFormView";

type StoreSummary = {
    id: string;
    name: string;
};

type PortalPurchaseOrderCreateViewProps = {
    stores: StoreSummary[];
    activeStoreId: string;
    storeCurrency: string;
};

export function PortalPurchaseOrderCreateView({ stores, activeStoreId, storeCurrency }: PortalPurchaseOrderCreateViewProps) {
    return (
        <PortalPurchaseOrderFormView
            stores={stores}
            activeStoreId={activeStoreId}
            storeCurrency={storeCurrency}
        />
    );
}
