"use client";

import type { ReactNode } from "react";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

type Props = {
    open: boolean;
    label: string;
    className?: string;
    children: ReactNode;
};

export function PortalHeaderPopover({ open, label, className, children }: Props) {
    if (!open) return null;

    return (
        <div className={cn("portalHeaderPopover__W6m2R9", className)} role="dialog" aria-label={label}>
            <div className="portalHeaderPopoverPanel__L3n8Q1 ui-surface-card ui-surface-card--raised">
                {children}
            </div>
        </div>
    );
}
