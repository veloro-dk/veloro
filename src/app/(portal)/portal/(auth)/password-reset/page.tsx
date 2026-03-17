import { redirect } from "next/navigation";
import { PortalSetPasswordForm } from "@/components/PortalSetPasswordForm";
import { getSessionUser } from "@/server/auth";

export default async function PortalPasswordResetPage() {
    const user = await getSessionUser();
    if (!user) redirect("/login");
    if (!user.requiresPasswordReset) redirect("/");

    return <PortalSetPasswordForm />;
}
