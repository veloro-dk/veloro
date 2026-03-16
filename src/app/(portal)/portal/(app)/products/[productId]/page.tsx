import { redirect } from "next/navigation";
import { PortalProductEditView } from "@/components/PortalProductEditView";
import { normalizeCurrency } from "@/i18n/portal";
import { getSessionUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { getUserStoreContext } from "@/server/stores";

type ProductEditPageProps = {
    params: Promise<{
        productId: string;
    }>;
};

export default async function ProductEditPage({ params }: ProductEditPageProps) {
    const { productId } = await params;
    const user = await getSessionUser();
    if (!user) redirect("/portal/login");
    const storeContext = await getUserStoreContext(user.id);
    const activeStore = await prisma.store.findUnique({
        where: { id: storeContext.activeStoreId },
        select: { defaultCurrency: true, name: true },
    });
    const commenterName = user.name?.trim() || user.employeeId;
    const commenterStoreName = activeStore?.name?.trim() || "Store";
    const storeCurrency = normalizeCurrency(activeStore?.defaultCurrency);
    return (
        <PortalProductEditView
            productId={productId}
            storeCurrency={storeCurrency}
            commenterName={commenterName}
            commenterStoreName={commenterStoreName}
        />
    );
}
