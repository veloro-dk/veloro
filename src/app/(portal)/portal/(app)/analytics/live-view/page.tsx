import { notFound } from "next/navigation";
import { PortalComingSoonView } from "@/components/PortalComingSoonView";
import { getRuntimeEnv } from "@/server/env";

export default function LiveViewPage() {
    const flags = getRuntimeEnv().featureFlags;
    if (!flags.analytics || !flags.analyticsLiveView) {
        notFound();
    }

    return (
        <PortalComingSoonView
            page="liveView"
            feature="Live view is coming soon"
            details="Real-time traffic, live order flow, and instant activity streams will land in this section."
        />
    );
}
