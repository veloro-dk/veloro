import type { ReactNode } from "react";
import type { CurrencyCode, LanguageCode } from "@/i18n/portal";
import type { PortalFeatureFlags } from "@/lib/portalFeatureFlags";

export type PortalShellProps = {
    children: ReactNode;
    language: LanguageCode;
    currency: CurrencyCode;
    storeCurrency: CurrencyCode;
    user: { employeeId: string; name?: string | null; role: "ADMIN" | "MANAGER" | "EMPLOYEE" };
    stores: Array<{ id: string; name: string; slug: string }>;
    activeStoreId: string;
    featureFlags: PortalFeatureFlags;
};
