import { prisma } from "@/server/db";

export async function hasCatalogProducts(storeId: string) {
    const catalogState = await prisma.storeCatalogState.findUnique({
        where: { storeId },
        select: { products: true },
    });

    return Array.isArray(catalogState?.products) && catalogState.products.length > 0;
}
