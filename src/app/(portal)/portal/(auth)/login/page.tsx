import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/PortalLoginForm";
import { getSessionUser } from "@/server/auth";

export default async function PortalLoginPage() {
    const user = await getSessionUser();
    if (user) {
        if (user.requiresPasswordReset) redirect("/portal/password-reset");
        redirect("/portal");
    }

    return <PortalLoginForm />;
}
