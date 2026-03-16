import { redirect } from "next/navigation";
import { PortalPurchaseOrderCreateView } from "@/components/PortalPurchaseOrderCreateView";
import { normalizeCurrency } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { hasCatalogProducts } from "@/server/catalogState";
import { prisma } from "@/server/db";
import { getUserStoreContext } from "@/server/stores";

export default async function PurchaseOrderCreatePage() {
    const user = await getSessionUser();
    if (!user) redirect("/portal/login");

    const storeContext = await getUserStoreContext(user.id);
    const hasProducts = await hasCatalogProducts(storeContext.activeStoreId);
    if (!hasProducts) redirect("/portal/products");

    const activeStore = await prisma.store.findUnique({
        where: { id: storeContext.activeStoreId },
        select: { defaultCurrency: true },
    });

    const storeCurrency = normalizeCurrency(activeStore?.defaultCurrency);
    return (
        <PortalPurchaseOrderCreateView
            stores={storeContext.stores}
            activeStoreId={storeContext.activeStoreId}
            storeCurrency={storeCurrency}
        />
    );
}
