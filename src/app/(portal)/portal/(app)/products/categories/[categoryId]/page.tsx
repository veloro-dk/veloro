import { redirect } from "next/navigation";
import { PortalCategoryEditView } from "@/components/PortalCategoryEditView";
import { getSessionUser } from "@/server/auth";
import { getUserStoreContext } from "@/server/stores";

type CategoryEditPageProps = {
    params: Promise<{
        categoryId: string;
    }>;
};

export default async function CategoryEditPage({ params }: CategoryEditPageProps) {
    const { categoryId } = await params;
    const user = await getSessionUser();
    if (!user) redirect("/portal/login");

    const storeContext = await getUserStoreContext(user.id);
    return (
        <PortalCategoryEditView
            categoryId={categoryId}
            stores={storeContext.stores}
            activeStoreId={storeContext.activeStoreId}
        />
    );
}
