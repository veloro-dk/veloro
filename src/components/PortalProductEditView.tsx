"use client";

import { PortalProductCreateView } from "@/components/PortalProductCreateView";
import type { CurrencyCode } from "@/i18n/portal";

type PortalProductEditViewProps = {
    productId: string;
    storeCurrency?: CurrencyCode;
    commenterName?: string;
    commenterStoreName?: string;
};

export function PortalProductEditView({ productId, storeCurrency, commenterName, commenterStoreName }: PortalProductEditViewProps) {
    return (
        <PortalProductCreateView
            productId={productId}
            storeCurrency={storeCurrency}
            commenterName={commenterName}
            commenterStoreName={commenterStoreName}
        />
    );
}
