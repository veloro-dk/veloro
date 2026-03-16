import { notFound } from "next/navigation";
import { PortalComingSoonView } from "@/components/PortalComingSoonView";
import { getRuntimeEnv } from "@/server/env";

export default function AnalyticsPage() {
    if (!getRuntimeEnv().featureFlags.analytics) {
        notFound();
    }

    return (
        <PortalComingSoonView
            page="analytics"
            feature="Analytics dashboard is coming soon"
            details="We are preparing deeper performance insights, trend breakdowns, and conversion tracking."
        />
    );
}
