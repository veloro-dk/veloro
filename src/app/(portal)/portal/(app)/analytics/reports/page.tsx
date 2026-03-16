import { notFound } from "next/navigation";
import { PortalComingSoonView } from "@/components/PortalComingSoonView";
import { getRuntimeEnv } from "@/server/env";

export default function ReportsPage() {
    const flags = getRuntimeEnv().featureFlags;
    if (!flags.analytics || !flags.analyticsReports) {
        notFound();
    }

    return (
        <PortalComingSoonView
            page="reports"
            feature="Reports center is coming soon"
            details="Scheduled exports, saved reports, and custom report templates are being built here."
        />
    );
}
