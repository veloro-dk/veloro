import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PortalNotFoundView } from "@/components/PortalNotFoundView";
import { PortalShell } from "@/components/PortalShell";
import { normalizeCurrency, normalizeLanguage } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { getRuntimeEnv } from "@/server/env";
import { getUserStoreContext } from "@/server/stores";
import { findUserSettingsSafe, PREFERRED_CURRENCY_COOKIE_NAME } from "@/server/userSettings";

export default async function PortalNotFoundPage() {
    const user = await getSessionUser();
    if (!user) redirect("/login");
    if (user.requiresPasswordReset) redirect("/password-reset");
    const runtimeEnv = getRuntimeEnv();

    const settings = await findUserSettingsSafe(prisma, user.id);
    const storeContext = await getUserStoreContext(user.id);
    const activeStore = await prisma.store.findUnique({
        where: { id: storeContext.activeStoreId },
        select: { defaultCurrency: true },
    });
    const cookieStore = await cookies();
    const currencyCookie = cookieStore.get(PREFERRED_CURRENCY_COOKIE_NAME)?.value ?? null;

    const language = normalizeLanguage(settings?.preferredLanguage);
    const currency = normalizeCurrency(currencyCookie ?? settings?.preferredCurrency);
    const storeCurrency = normalizeCurrency(activeStore?.defaultCurrency);

    return (
        <PortalShell
            user={{ employeeId: user.employeeId, name: user.name, role: user.role }}
            language={language}
            currency={currency}
            storeCurrency={storeCurrency}
            stores={storeContext.stores}
            activeStoreId={storeContext.activeStoreId}
            featureFlags={runtimeEnv.featureFlags}
        >
            <PortalNotFoundView />
        </PortalShell>
    );
}
