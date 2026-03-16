import { notFound } from "next/navigation";
import { PortalComingSoonView } from "@/components/PortalComingSoonView";
import { getRuntimeEnv } from "@/server/env";

export default function FinancePage() {
    if (!getRuntimeEnv().featureFlags.finance) {
        notFound();
    }

    return (
        <PortalComingSoonView
            page="finance"
            feature="Finance workspace is coming soon"
            details="We are building your payouts, cost tracking, and margin tools in this section."
        />
    );
}
