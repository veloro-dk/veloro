"use client";

import { createContext, useContext } from "react";

export type PortalNavigateOptions = {
    replace?: boolean;
};

export type PortalNavigationContextValue = {
    navigateTo: (href: string, options?: PortalNavigateOptions) => Promise<void>;
};

const PortalNavigationContext = createContext<PortalNavigationContextValue | null>(null);

export function PortalNavigationProvider({
    value,
    children,
}: {
    value: PortalNavigationContextValue;
    children: React.ReactNode;
}) {
    return (
        <PortalNavigationContext.Provider value={value}>
            {children}
        </PortalNavigationContext.Provider>
    );
}

export function usePortalNavigation() {
    const context = useContext(PortalNavigationContext);
    if (!context) {
        throw new Error("usePortalNavigation must be used within PortalNavigationProvider.");
    }
    return context;
}
