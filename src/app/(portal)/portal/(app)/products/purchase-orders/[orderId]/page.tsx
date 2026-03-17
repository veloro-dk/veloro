import { redirect } from "next/navigation";
import { PortalPurchaseOrderEditView } from "@/components/PortalPurchaseOrderEditView";
import { normalizeCurrency } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { hasCatalogProducts } from "@/server/catalogState";
import { prisma } from "@/server/db";
import { getUserStoreContext } from "@/server/stores";

type PurchaseOrderEditPageProps = {
    params: Promise<{
        orderId: string;
    }>;
};

export default async function PurchaseOrderEditPage({ params }: PurchaseOrderEditPageProps) {
    const { orderId } = await params;
    const user = await getSessionUser();
    if (!user) redirect("/login");

    const storeContext = await getUserStoreContext(user.id);
    const hasProducts = await hasCatalogProducts(storeContext.activeStoreId);
    if (!hasProducts) redirect("/products");

    const activeStore = await prisma.store.findUnique({
        where: { id: storeContext.activeStoreId },
        select: { defaultCurrency: true },
    });

    const storeCurrency = normalizeCurrency(activeStore?.defaultCurrency);
    return (
        <PortalPurchaseOrderEditView
            orderId={orderId}
            stores={storeContext.stores}
            activeStoreId={storeContext.activeStoreId}
            storeCurrency={storeCurrency}
        />
    );
}
