"use client";

import { Clock3 } from "lucide-react";
import { PortalPageTitle } from "@/components/PortalPageTitle";
import { usePortalI18n } from "@/i18n/PortalI18nContext";
import type { LanguageCode, PortalPageKey } from "@/i18n/portal";

type PortalComingSoonViewProps = {
    page: PortalPageKey;
    feature: string;
    details: string;
};

type ComingSoonCopy = {
    badge: string;
    title: string;
};

const COMING_SOON_COPY: Record<LanguageCode, ComingSoonCopy> = {
    en: { badge: "Coming soon", title: "This area is under active development." },
    da: { badge: "Kommer snart", title: "Dette område er under aktiv udvikling." },
    de: { badge: "Demnächst", title: "Dieser Bereich wird aktiv entwickelt." },
    fr: { badge: "Bientot disponible", title: "Cette section est en cours de developpement." },
    es: { badge: "Proximamente", title: "Esta seccion esta en desarrollo activo." },
    zh: { badge: "即将推出", title: "该区域正在积极开发中。" },
};

export function PortalComingSoonView({ page, feature, details }: PortalComingSoonViewProps) {
    const { language } = usePortalI18n();
    const copy = COMING_SOON_COPY[language] ?? COMING_SOON_COPY.en;

    return (
        <section className="portalComingSoonPage__V8m2Q1">
            <PortalPageTitle page={page} />

            <section className="portalComingSoonCard__S3m2Q5 ui-surface-card" aria-live="polite">
                <span className="portalComingSoonBadge__L5m2Q8">
                    <Clock3 aria-hidden="true" />
                    {copy.badge}
                </span>
                <h2 className="portalComingSoonHeading__N7m2Q4">{feature}</h2>
                <p className="portalComingSoonTitle__H4m9Q2">{copy.title}</p>
                <p className="portalComingSoonDetails__C2m8Q6">{details}</p>
            </section>
        </section>
    );
}
