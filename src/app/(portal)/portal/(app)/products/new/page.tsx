import { redirect } from "next/navigation";
import { PortalProductCreateView } from "@/components/PortalProductCreateView";
import { normalizeCurrency } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { getUserStoreContext } from "@/server/stores";

export default async function ProductCreatePage() {
    const user = await getSessionUser();
    if (!user) redirect("/portal/login");

    const storeContext = await getUserStoreContext(user.id);
    const activeStore = await prisma.store.findUnique({
        where: { id: storeContext.activeStoreId },
        select: { defaultCurrency: true, name: true },
    });

    const storeCurrency = normalizeCurrency(activeStore?.defaultCurrency);
    const commenterName = user.name?.trim() || user.employeeId;
    const commenterStoreName = activeStore?.name?.trim() || "Store";
    return (
        <PortalProductCreateView
            storeCurrency={storeCurrency}
            commenterName={commenterName}
            commenterStoreName={commenterStoreName}
        />
    );
}
