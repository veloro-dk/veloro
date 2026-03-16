import { redirect } from "next/navigation";
import { PortalCategoryCreateView } from "@/components/PortalCategoryCreateView";
import { getSessionUser } from "@/server/auth";
import { getUserStoreContext } from "@/server/stores";

export default async function CategoryCreatePage() {
    const user = await getSessionUser();
    if (!user) redirect("/portal/login");

    const storeContext = await getUserStoreContext(user.id);
    return (
        <PortalCategoryCreateView
            stores={storeContext.stores}
            activeStoreId={storeContext.activeStoreId}
        />
    );
}
