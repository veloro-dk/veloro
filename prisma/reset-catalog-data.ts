import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("Missing DIRECT_URL or DATABASE_URL");
    }

    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
}

const prisma = makeClient();

async function safeDeleteMany(label: string, action: () => Promise<{ count: number }>) {
    try {
        const result = await action();
        return { label, count: result.count, skipped: false };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
            return { label, count: 0, skipped: true };
        }
        throw error;
    }
}

async function main() {
    const summary = {
        serviceEvents: await safeDeleteMany("serviceEvents", () => prisma.serviceEvent.deleteMany()),
        purchaseLines: await safeDeleteMany("purchaseLines", () => prisma.purchaseLine.deleteMany()),
        saleLines: await safeDeleteMany("saleLines", () => prisma.saleLine.deleteMany()),
        purchases: await safeDeleteMany("purchases", () => prisma.purchase.deleteMany()),
        sales: await safeDeleteMany("sales", () => prisma.sale.deleteMany()),
        inventoryItems: await safeDeleteMany("inventoryItems", () => prisma.inventoryItem.deleteMany()),
        categoryAttributes: await safeDeleteMany("categoryAttributes", () => prisma.categoryAttribute.deleteMany()),
        categories: await safeDeleteMany("categories", () => prisma.category.deleteMany()),
        storeCatalogStates: await safeDeleteMany("storeCatalogStates", () => prisma.storeCatalogState.deleteMany()),
    };

    console.log("Catalog and inventory data cleared for all stores:");
    console.log(JSON.stringify(summary, null, 2));
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        await prisma.$disconnect();
        throw error;
    });
