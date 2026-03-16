import { redirect } from "next/navigation";
import { PortalPurchaseOrdersView } from "@/components/PortalPurchaseOrdersView";
import { getSessionUser } from "@/server/auth";
import { getUserStoreContext } from "@/server/stores";

export default async function PurchaseOrdersPage() {
    const user = await getSessionUser();
    if (!user) redirect("/portal/login");

    const storeContext = await getUserStoreContext(user.id);

    return (
        <PortalPurchaseOrdersView
            stores={storeContext.stores}
            activeStoreId={storeContext.activeStoreId}
        />
    );
}
