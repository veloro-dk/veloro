"use client";

import { createContext, useContext } from "react";
import type { CurrencyCode, LanguageCode, PortalMessages } from "@/i18n/portal";

type PortalI18nContextValue = {
    language: LanguageCode;
    currency: CurrencyCode;
    storeCurrency: CurrencyCode;
    messages: PortalMessages;
    setLanguage: (language: LanguageCode) => void;
};

const PortalI18nContext = createContext<PortalI18nContextValue | null>(null);

export function PortalI18nProvider({
    value,
    children,
}: {
    value: PortalI18nContextValue;
    children: React.ReactNode;
}) {
    return <PortalI18nContext.Provider value={value}>{children}</PortalI18nContext.Provider>;
}

export function usePortalI18n() {
    const value = useContext(PortalI18nContext);
    if (!value) {
        throw new Error("usePortalI18n must be used within PortalI18nProvider");
    }
    return value;
}
