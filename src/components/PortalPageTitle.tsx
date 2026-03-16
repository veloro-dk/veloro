"use client";

import type { ReactNode } from "react";
import { renderPortalPageIcon } from "@/components/portalPageIcons";
import type { PortalPageKey } from "@/i18n/portal";
import { usePortalI18n } from "@/i18n/PortalI18nContext";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

type Props = {
    page: PortalPageKey;
    title?: string;
    icon?: ReactNode;
    meta?: string | null;
    metaInline?: boolean;
    actions?: ReactNode;
};

export function PortalPageTitle({ page, title, icon, meta, metaInline = false, actions }: Props) {
    const { messages } = usePortalI18n();

    return (
        <header className="portalPageHeader__Q8m3V1">
            <div className="portalPageHeadingWrap__B6k1Q9">
                {icon ?? renderPortalPageIcon(page, { className: "portalPageHeadingIcon__Q8m2D5", "aria-hidden": "true" })}
                <div className={cn("portalPageHeadingText__A6m2P4", metaInline && "portalPageHeadingTextInline__M9k2V4")}>
                    <h1 className="portalPageHeading__L2m8T6">{title ?? messages.pages[page]}</h1>
                    {meta ? <p className="portalPageMeta__N9r2D7">{meta}</p> : null}
                </div>
            </div>

            {actions ? <div className="portalPageHeaderActions__J9r2V3">{actions}</div> : null}
        </header>
    );
}
