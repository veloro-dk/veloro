import "@/styles/pages/portal/status.css";
import { redirect } from "next/navigation";
import { PortalSystemStatusView } from "@/components/PortalSystemStatusView";
import { PORTAL_MESSAGES, normalizeLanguage } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function PortalSystemStatusStandalonePage() {
    const user = await getSessionUser();
    if (!user) redirect("/portal/login");
    if (user.requiresPasswordReset) redirect("/portal/password-reset");

    const settings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { preferredLanguage: true },
    });

    const language = normalizeLanguage(settings?.preferredLanguage);
    const messages = PORTAL_MESSAGES[language];

    return (
        <PortalSystemStatusView
            labels={{
                systemsOperational: messages.menu.systemsOperational,
                systemError: messages.menu.systemError,
                systemLoading: messages.menu.systemLoading,
            }}
            canRunMaintenance={user.role === "ADMIN"}
        />
    );
}
